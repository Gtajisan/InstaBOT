const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "alldl",
    aliases: ["fbdl", "igdl", "ttdl", "ytdl", "dl"],
    version: "2.6",
    author: "Neoaz 🐦",
    cooldown: 5,
    role: 0,
    description: "Multi-platform video/audio downloader",
    category: "media",
    usage: "alldl <url> [--a] or reply to a link"
  },

  async run({ api, event, args, logger }) {
    let url = args[0];
    let isAudio = args.includes("--a");

    if (event.messageReply && event.messageReply.body) {
      const urlMatch = event.messageReply.body.match(/https?:\/\/[^\s]+/);
      if (urlMatch) {
        url = urlMatch[0];
        if (args.includes("--a")) isAudio = true;
      }
    }

    if (!url || !url.startsWith("http")) return api.sendMessage("❌ Please provide a valid link.", event.threadId);

    await api.sendReaction("⏳", event.messageId);
    const cacheDir = path.join(__dirname, "cache");
    await fs.ensureDir(cacheDir);
    const fileName = `dl_${event.messageId}.${isAudio ? "mp3" : "mp4"}`;
    const filePath = path.join(cacheDir, fileName);

    try {
      const res = await axios.get(`https://neoaz.is-a.dev/api/download?url=${encodeURIComponent(url)}`);
      const data = res.data.data;
      if (!data || !data.formats || data.formats.length === 0) throw new Error("No download data found");

      let downloadUrl = "";
      if (isAudio) {
        const audioFormat = data.formats.find(f => f.quality === "audio_only" || f.ext === "mp3" || f.ext === "m4a" || f.ext === "weba");
        downloadUrl = audioFormat?.url || data.formats[data.formats.length - 1].url;
      } else {
        const videoFormat = data.formats.find(f => f.quality === "hd_no_watermark" || f.quality === "no_watermark" || f.quality === "HD" || f.quality === "Full HD" || f.quality === "720p");
        downloadUrl = videoFormat?.url || data.formats[0].url;
      }

      if (!downloadUrl) throw new Error("Could not determine download URL");

      const response = await axios({
        method: 'get',
        url: downloadUrl,
        responseType: 'stream',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Referer': 'https://tikwm.com/'
        }
      });

      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      if (isAudio) {
        await api.sendAudio(filePath, event.threadId);
      } else {
        await api.sendVideo(filePath, event.threadId);
      }

      await api.sendReaction("✅", event.messageId);
    } catch (error) {
      logger.error('alldl error', { error: error.message });
      await api.sendReaction("❌", event.messageId);
      api.sendMessage(`❌ Failed to download: ${error.message}`, event.threadId);
    } finally {
      if (fs.existsSync(filePath)) await fs.remove(filePath);
    }
  }
};
