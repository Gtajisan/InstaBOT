const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

const API_ENDPOINT = "https://neokex-img-api.vercel.app/generate";

module.exports = {
  config: {
    name: "dalle3",
    aliases: ["dalle"],
    version: "1.0",
    author: "NeoKEX",
    cooldown: 15,
    role: 0,
    description: "Generate an image using the DALL-E 3 model.",
    category: "ai-image",
    usage: "dalle3 <prompt>"
  },

  async run({ api, event, args, logger }) {
    let prompt = args.join(" ");
    if (!prompt) {
        return api.sendMessage("❌ Please provide a prompt.", event.threadId);
    }

    await api.sendReaction("🎨", event.messageId);
    const cacheDir = path.join(__dirname, 'cache');
    await fs.ensureDir(cacheDir);
    const filePath = path.join(cacheDir, `dalle3_${event.messageId}.png`);

    try {
      const fullApiUrl = `${API_ENDPOINT}?prompt=${encodeURIComponent(prompt.trim())}&model=dalle3`;

      const response = await axios.get(fullApiUrl, {
          responseType: 'stream',
          timeout: 60000
      });

      if (response.status !== 200) {
           throw new Error(`API error: ${response.status}`);
      }

      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });

      await api.sendPhoto(filePath, event.threadId, {
        caption: "DALL-E 3 image generated 🐦"
      });
      await api.sendReaction("✅", event.messageId);

    } catch (error) {
      logger.error('dalle3 error', { error: error.message });
      await api.sendReaction("❌", event.messageId);
      api.sendMessage(`❌ Error: ${error.message}`, event.threadId);
    } finally {
      if (fs.existsSync(filePath)) await fs.remove(filePath);
    }
  }
};
