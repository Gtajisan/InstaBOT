const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

async function generatePinterestCanvas(imageObjects, query, page, totalPages) {
  const canvasWidth = 800;
  const canvasHeight = 1200;
  const canvas = createCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  ctx.fillStyle = '#ffffff';
  ctx.font = '24px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('🔍 Pinterest Searcher', 20, 45);

  ctx.font = '16px Arial';
  ctx.fillStyle = '#b0b0b0';
  ctx.fillText(`Search results of "${query}", Showing up to ${imageObjects.length} images.`, 20, 75);

  const numColumns = 3;
  const padding = 15;
  const columnWidth = (canvasWidth - (padding * (numColumns + 1))) / numColumns;
  const columnHeights = Array(numColumns).fill(100);

  const loadedPairs = await Promise.all(
    imageObjects.map(obj =>
      loadImage(obj.url)
        .then(img => ({ img, originalIndex: obj.originalIndex, url: obj.url }))
        .catch(e => {
          console.error(`Failed to load image: ${obj.url}`, e && e.message);
          return null;
        })
    )
  );

  const successful = loadedPairs.filter(x => x !== null);

  if (successful.length === 0) {
    ctx.fillStyle = '#ff6666';
    ctx.font = '16px Arial';
    ctx.fillText(`No images could be loaded for this page.`, 20, 110);
    const outputPath = path.join(__dirname, 'cache', `pinterest_page_${Date.now()}.png`);
    await fs.ensureDir(path.dirname(outputPath));
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(outputPath, buffer);
    return { outputPath, displayedMap: [] };
  }

  let displayNumber = 0;
  const displayedMap = [];

  for (let i = 0; i < successful.length; i++) {
    const { img, originalIndex } = successful[i];

    const minHeight = Math.min(...columnHeights);
    const columnIndex = columnHeights.indexOf(minHeight);

    const x = padding + columnIndex * (columnWidth + padding);
    const y = minHeight + padding;

    const scale = columnWidth / img.width;
    const scaledHeight = img.height * scale;

    ctx.drawImage(img, x, y, columnWidth, scaledHeight);

    displayNumber += 1;
    displayedMap.push(originalIndex);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(x, y, 50, 24);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`#${displayNumber}`, x + 25, y + 12);

    ctx.fillStyle = '#b0b0b0';
    ctx.font = '10px Arial';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(`${img.width} x ${img.height}`, x + columnWidth - 6, y + scaledHeight - 6);

    columnHeights[columnIndex] += scaledHeight + padding;
  }

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'center';
  const footerY = Math.max(...columnHeights) + 40;
  ctx.fillText(`Page ${page}/${totalPages}`, canvasWidth / 2, footerY);

  const outputPath = path.join(__dirname, 'cache', `pinterest_page_${Date.now()}.png`);
  await fs.ensureDir(path.dirname(outputPath));
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);

  return { outputPath, displayedMap };
}

module.exports = {
  config: {
    name: "pinterest",
    aliases: ["pin", "pins"],
    version: "2.2",
    author: "Mahi--",
    cooldown: 10,
    role: 0,
    description: "Search Pinterest for images",
    category: "media",
    usage: "pinterest <query> [-count]"
  },

  async run({ api, event, args, logger, commandName }) {
    try {
      let count = null;
      const countArg = args.find(arg => /^-\d+$/.test(arg));
      if (countArg) {
        count = parseInt(countArg.slice(1), 10);
        args = args.filter(arg => arg !== countArg);
      }
      const query = args.join(" ").trim();
      if (!query) {
        return api.sendMessage("❌ Please provide a search query.", event.threadId);
      }

      await api.sendReaction("⏳", event.messageId);

      const res = await axios.get(`https://egret-driving-cattle.ngrok-free.app/api/pin?query=${encodeURIComponent(query)}&num=90`);
      const allImageUrls = res.data.results || [];

      if (allImageUrls.length === 0) {
        return api.sendMessage(`❌ No images found for "${query}".`, event.threadId);
      }

      if (count) {
        const urls = allImageUrls.slice(0, Math.min(count, 9));
        for (const url of urls) {
            await api.sendPhotoFromUrl(event.threadId, url);
        }
        return;
      } else {
        const imagesPerPage = 21;
        const totalPages = Math.ceil(allImageUrls.length / imagesPerPage);
        const imagesForPage1 = allImageUrls.slice(0, imagesPerPage).map((url, idx) => ({
          url,
          originalIndex: idx
        }));

        const { outputPath: canvasPath, displayedMap } = await generatePinterestCanvas(imagesForPage1, query, 1, totalPages);

        const info = await api.sendMessage({
          body: `🖼️ Found ${allImageUrls.length} images for "${query}".\nReply with a number to get that image, or "next" for more.`,
          attachment: fs.createReadStream(canvasPath)
        }, event.threadId);

        fs.remove(canvasPath).catch(() => {});

        global.InstaBOT.onReply.set(info.messageId, {
          commandName,
          author: event.senderID,
          allImageUrls,
          query,
          imagesPerPage,
          currentPage: 1,
          totalPages,
          displayedMap,
          displayCount: displayedMap.length
        });
      }

    } catch (error) {
      logger.error('pinterest error', { error: error.message });
      api.sendMessage("❌ An error occurred. The server or API might be down.", event.threadId);
    }
  },

  async handleReply({ api, event, replyData, logger }) {
    try {
      const { author, allImageUrls, query, imagesPerPage, currentPage, totalPages, displayedMap, displayCount, commandName } = replyData;
      if (event.senderID !== author) return;

      const input = (event.body || "").trim().toLowerCase();

      if (input === 'next') {
        if (currentPage >= totalPages) {
          return api.sendMessage("❌ This is the last page of results.", event.threadId);
        }
        const nextPage = currentPage + 1;
        const startIndex = (nextPage - 1) * imagesPerPage;
        const endIndex = Math.min(startIndex + imagesPerPage, allImageUrls.length);

        const imagesForNextPage = allImageUrls.slice(startIndex, endIndex).map((url, idx) => ({
          url,
          originalIndex: startIndex + idx
        }));

        const { outputPath: canvasPath, displayedMap: nextDisplayedMap } = await generatePinterestCanvas(imagesForNextPage, query, nextPage, totalPages);

        const info = await api.sendMessage({
          body: `🖼️ Page ${nextPage}/${totalPages}.\nReply with a number to get that image, or "next" for more.`,
          attachment: fs.createReadStream(canvasPath)
        }, event.threadId);

        fs.remove(canvasPath).catch(() => {});

        global.InstaBOT.onReply.set(info.messageId, {
          commandName,
          author,
          allImageUrls,
          query,
          imagesPerPage,
          currentPage: nextPage,
          totalPages,
          displayedMap: nextDisplayedMap,
          displayCount: nextDisplayedMap.length
        });

      } else {
        const number = parseInt(input, 10);
        if (!isNaN(number) && number > 0 && number <= displayCount) {
          const originalIndex = displayedMap[number - 1];
          const imageUrl = allImageUrls[originalIndex];
          await api.sendPhotoFromUrl(event.threadId, imageUrl);
        } else {
          return api.sendMessage(`❌ Invalid choice. Please choose a number from 1 to ${displayCount}, or type "next".`, event.threadId);
        }
      }
    } catch (error) {
      logger.error('pinterest handleReply error', { error: error.message });
      api.sendMessage("❌ An error occurred while handling your reply.", event.threadId);
    }
  }
};
