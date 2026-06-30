const axios = require("axios");

module.exports = {
  config: {
    name: "aiphoto",
    aliases: ["aip"],
    version: "1.0",
    author: "Neoaz ゐ",
    cooldown: 10,
    role: 0,
    description: "Generate AI image with AI Photo",
    category: "image",
    usage: "aiphoto <prompt>"
  },

  async run({ api, event, args, logger }) {
    if (args.length === 0) {
      return api.sendMessage("❌ Please provide a prompt.", event.threadId);
    }

    const prompt = args.join(" ").trim();
    const model = "ai photo";

    try {
      await api.sendReaction("⏳", event.messageId);

      const res = await axios.get("https://fluxcdibai-1.onrender.com/generate", {
        params: { prompt, model },
        timeout: 120000
      });

      const resultUrl = res.data?.data?.imageResponseVo?.url;

      if (!resultUrl) {
        await api.sendReaction("❌", event.messageId);
        return api.sendMessage("❌ Failed to generate image.", event.threadId);
      }

      await api.sendMessage({
        body: "Image generated 🐦",
        attachment: resultUrl
      }, event.threadId);
      await api.sendReaction("✅", event.messageId);

    } catch (err) {
      logger.error('aiphoto error', { error: err.message });
      await api.sendReaction("❌", event.messageId);
      return api.sendMessage("❌ Error while generating image.", event.threadId);
    }
  }
};
