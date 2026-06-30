const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const FormData = require("form-data");

module.exports = {
  config: {
    name: "4k",
    aliases: ["upscale", "enhance"],
    version: "1.0.0",
    author: "Neoaz 🐦",
    cooldown: 10,
    role: 0,
    description: "Upscale images to 4k quality",
    category: "media",
    usage: "4k (reply to an image)"
  },

  async run({ api, event, args, logger }) {
    let imageUrl = null;

    if (event.messageReply && event.messageReply.attachments?.length > 0) {
      const att = event.messageReply.attachments[0];
      if (att.type === "photo") imageUrl = att.url;
    } else if (args[0] && args[0].startsWith("http")) {
      imageUrl = args[0];
    }

    if (!imageUrl) {
      return api.sendMessage("❌ Please reply to an image or provide a URL.", event.threadId);
    }

    await api.sendReaction("⏳", event.messageId);

    const cacheDir = path.join(__dirname, 'cache');
    await fs.ensureDir(cacheDir);
    const filePath = path.join(cacheDir, `4k_${event.messageId}.png`);

    try {
      const form = new FormData();
      form.append("scale", "16");
      form.append("image", "");
      form.append("image_url", imageUrl);

      const response = await axios.post("https://nkximggen.onrender.com/api/enhance", form, {
        headers: {
          ...form.getHeaders(),
          "accept": "application/json"
        },
        timeout: 300000
      });

      const upscaledUrl = response.data?.data?.[0]?.url;
      if (!upscaledUrl) throw new Error("No upscaled URL returned");

      const imageRes = await axios.get(upscaledUrl, { responseType: "arraybuffer" });
      await fs.writeFile(filePath, Buffer.from(imageRes.data));

      await api.sendPhoto(filePath, event.threadId, {
        caption: "✅ | Image upscaled"
      });

      await api.sendReaction("✅", event.messageId);

    } catch (error) {
      logger.error('4k error', { error: error.message });
      await api.sendReaction("❌", event.messageId);
      api.sendMessage("❌ Error while upscaling image.", event.threadId);
    } finally {
      if (fs.existsSync(filePath)) await fs.remove(filePath);
    }
  }
};
