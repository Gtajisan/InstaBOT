const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "sing",
    aliases: ["song", "music"],
    version: "1.1",
    author: "Neoaz 🐊",
    cooldown: 5,
    role: 0,
    description: "Search and download YouTube audio",
    category: "media",
    usage: "sing <song name>"
  },

  async run({ api, event, args, logger, commandName }) {
    const query = args.join(" ");
    if (!query) return api.sendMessage("❌ Please provide a song name.", event.threadId);

    try {
      const res = await axios.get(`https://neokex-dlapis.vercel.app/api/search?q=${encodeURIComponent(query)}`);
      const results = res.data.results.slice(0, 6);

      if (results.length === 0) return api.sendMessage("❌ No songs found.", event.threadId);

      let msg = "🔎 Found the following results:\n\n";
      const cacheDir = path.join(__dirname, 'cache');
      await fs.ensureDir(cacheDir);

      // We'll just send the text list for now as sending multiple thumbnails might be slow or hit limits
      for (let i = 0; i < results.length; i++) {
        msg += `${i + 1}. ${results[i].title}\n[${results[i].duration}]\n\n`;
      }
      msg += "Reply with the number to download.";

      const info = await api.sendMessage(msg, event.threadId);

      global.InstaBOT.onReply.set(info.messageId, {
        commandName,
        author: event.senderID,
        results
      });

    } catch (e) {
      logger.error('sing search error', { error: e.message });
      api.sendMessage("❌ Search error.", event.threadId);
    }
  },

  async handleReply({ api, event, replyData, logger }) {
    const { results, author } = replyData;
    if (event.senderID !== author) return;

    const choice = parseInt(event.body);
    if (isNaN(choice) || choice < 1 || choice > results.length) return;

    const selected = results[choice - 1];

    // Attempt to unsend the selection message
    try {
        await api.unsendMessage(event.threadId, event.replyToItemId);
    } catch (e) {}

    await api.sendReaction("⏳", event.messageId);

    const cacheDir = path.join(__dirname, 'cache');
    await fs.ensureDir(cacheDir);
    const filePath = path.join(cacheDir, `sing_${Date.now()}.mp3`);

    try {
      const dlRes = await axios.get(`https://neokex-dlapis.vercel.app/api/alldl?url=${encodeURIComponent(selected.url)}`);
      const pollUrl = dlRes.data.audio.downloadUrl;

      let streamUrl = null;
      for (let i = 0; i < 60; i++) {
        const statusRes = await axios.get(pollUrl);
        if (statusRes.data.status === "completed") {
          streamUrl = statusRes.data.viewUrl;
          break;
        }
        await new Promise(r => setTimeout(r, 1000));
      }

      if (!streamUrl) throw new Error("Processing timeout.");

      const fileRes = await axios.get(streamUrl, { responseType: "arraybuffer" });
      await fs.writeFile(filePath, Buffer.from(fileRes.data));

      await api.sendAudio(filePath, event.threadId);
      await api.sendReaction("✅", event.messageId);

    } catch (e) {
      logger.error('sing download error', { error: e.message });
      api.sendReaction("❌", event.messageId);
      api.sendMessage("❌ Download error.", event.threadId);
    } finally {
      if (fs.existsSync(filePath)) await fs.remove(filePath);
    }
  }
};
