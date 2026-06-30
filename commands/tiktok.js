const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

const TIKTOK_SEARCH_API = 'https://lyric-search-neon.vercel.app/kshitiz?keyword=';

module.exports = {
  config: {
    name: "tiktok",
    aliases: ["tt"],
    version: "1.0.0",
    author: "Neoaz ゐ",
    cooldown: 5,
    role: 0,
    description: "Search and download TikTok video",
    category: "media",
    usage: "tiktok <search query>"
  },

  async run({ api, event, args, logger, commandName }) {
    const query = args.join(" ");
    if (!query) return api.sendMessage("❌ Please provide a search query.", event.threadId);

    try {
      await api.sendReaction("⏳", event.messageId);

      const searchResponse = await axios.get(TIKTOK_SEARCH_API + encodeURIComponent(query), { timeout: 20000 });
      const results = searchResponse.data.slice(0, 6);

      if (!results || results.length === 0) {
        await api.sendReaction("❌", event.messageId);
        return api.sendMessage("❌ No TikTok videos found for the query.", event.threadId);
      }

      let messageBody = "🔎 TikTok Search Results:\n\n";
      for (let i = 0; i < results.length; i++) {
        const video = results[i];
        messageBody += `${i + 1}. ${video.title.substring(0, 70)}...\n`;
        messageBody += `   • Creator: @${video.author.unique_id}\n`;
        messageBody += `   • Duration: ${video.duration}s\n\n`;
      }
      messageBody += "Reply with the number to download.";

      const info = await api.sendMessage(messageBody, event.threadId);

      global.InstaBOT.onReply.set(info.messageId, {
        commandName: commandName,
        author: event.senderID,
        results: results
      });

    } catch (error) {
      logger.error("TikTok Search Error:", error);
      api.sendMessage("❌ Failed to search TikTok or API error.", event.threadId);
    }
  },

  async handleReply({ event, api, replyData, logger }) {
    const { results, author } = replyData;
    if (event.senderID !== author) return;

    const selection = parseInt(event.body);
    if (isNaN(selection) || selection < 1 || selection > results.length) return;

    const selectedVideo = results[selection - 1];

    try {
        await api.unsendMessage(event.threadId, event.replyToItemId);
    } catch (e) {}

    await api.sendReaction("⏳", event.messageId);

    const cacheDir = path.join(__dirname, 'cache');
    await fs.ensureDir(cacheDir);
    const filePath = path.join(cacheDir, `tiktok_${event.messageId}.mp4`);

    try {
        const response = await axios({
            url: selectedVideo.videoUrl || selectedVideo.play,
            method: 'GET',
            responseType: 'stream',
            timeout: 300000
        });

        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        await api.sendVideo(filePath, event.threadId, {
            caption: `✅ Downloaded: ${selectedVideo.title}\nCreator: @${selectedVideo.author.unique_id}\nDuration: ${selectedVideo.duration}s`
        });
        await api.sendReaction("✅", event.messageId);

    } catch (error) {
        logger.error("TikTok Download Error:", error);
        api.sendReaction("❌", event.messageId);
        api.sendMessage("❌ Failed to download the video.", event.threadId);
    } finally {
        if (fs.existsSync(filePath)) await fs.remove(filePath);
    }
  }
};
