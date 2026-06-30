const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

const API_ENDPOINT = "https://dev.oculux.xyz/api/artv1";

module.exports = {
  config: {
    name: "art",
    aliases: ["artv1", "draw"],
    version: "1.0",
    author: "NeoKEX",
    cooldown: 15,
    role: 0,
    description: "Generate an image using the ArtV1 model.",
    category: "ai-image",
    usage: "art <prompt>"
  },

  async run({ api, event, args, logger }) {
    let prompt = args.join(" ");

    if (!prompt || !/^[\x00-\x7F]*$/.test(prompt)) {
        return api.sendMessage("❌ Please provide a valid English prompt to generate an image.", event.threadId);
    }

    await api.sendReaction("⏳", event.messageId);
    const cacheDir = path.join(__dirname, 'cache');
    await fs.ensureDir(cacheDir);
    const filePath = path.join(cacheDir, `artv1_${event.messageId}.png`);

    try {
      const fullApiUrl = `${API_ENDPOINT}?p=${encodeURIComponent(prompt.trim())}`;

      const response = await axios.get(fullApiUrl, {
          responseType: 'stream',
          timeout: 45000
      });

      if (response.status !== 200) {
           throw new Error(`API request failed with status code ${response.status}.`);
      }

      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });

      await api.sendPhoto(filePath, event.threadId, {
        caption: "ArtV1 image generated ✨"
      });
      await api.sendReaction("✅", event.messageId);

    } catch (error) {
      logger.error('art error', { error: error.message });
      await api.sendReaction("❌", event.messageId);
      api.sendMessage("❌ Error while generating image.", event.threadId);
    } finally {
      if (fs.existsSync(filePath)) await fs.remove(filePath);
    }
  }
};
