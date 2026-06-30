const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

const API_ENDPOINT = "https://dev.oculux.xyz/api/screenshot";

module.exports = {
  config: {
    name: "screenshot",
    aliases: ["ss", "webss"],
    version: "1.0",
    author: "NeoKEX",
    cooldown: 10,
    role: 0,
    description: "Captures a full-page screenshot of a given website URL",
    category: "tools",
    usage: "screenshot <URL>"
  },

  async run({ api, event, args, logger }) {
    const userUrl = args[0];

    if (!userUrl) {
      return api.sendMessage("❌ Please provide a URL to capture. Example: !screenshot https://google.com", event.threadId);
    }

    if (!userUrl.startsWith('http://') && !userUrl.startsWith('https://')) {
      return api.sendMessage("❌ Invalid URL. Please include http:// or https://", event.threadId);
    }

    const cacheDir = path.join(__dirname, 'cache');
    await fs.ensureDir(cacheDir);

    await api.sendReaction("⏳", event.messageId);
    const filePath = path.join(cacheDir, `screenshot_${event.messageId}.png`);

    try {
      const fullApiUrl = `${API_ENDPOINT}?url=${encodeURIComponent(userUrl)}`;

      const response = await axios.get(fullApiUrl, {
          responseType: 'stream',
          timeout: 60000
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
        caption: `✨ Here is the screenshot for ${userUrl}`
      });
      await api.sendReaction("✅", event.messageId);

    } catch (error) {
      logger.error('screenshot error', { error: error.message });
      await api.sendReaction("❌", event.messageId);
      api.sendMessage(`❌ Error: ${error.message}`, event.threadId);
    } finally {
      if (fs.existsSync(filePath)) await fs.remove(filePath);
    }
  }
};
