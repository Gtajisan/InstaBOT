const axios = require("axios");

const AR_MAP = {
  "1:1": "1024x1024",
  "16:9": "1344x768",
  "9:16": "768x1344",
  "3:4": "768x1024",
  "4:3": "1024x768",
  "2:3": "768x1152",
  "3:2": "1152x768"
};

module.exports = {
  config: {
    name: "anigen",
    aliases: ["anikex"],
    version: "1.0.0",
    author: "Neoaz 🐦",
    cooldown: 10,
    role: 0,
    description: "Generate anime images",
    category: "ai",
    usage: "anigen <prompt> [--ar 16:9]"
  },

  async run({ api, event, args, logger }) {
    let prompt = args.join(" ").trim();
    if (!prompt) return api.sendMessage("❌ Please provide a prompt.", event.threadId);

    let aspect_ratio = "1:1";
    let size = "1024x1024";

    const arMatch = prompt.match(/--ar\s+(\S+)/i);
    if (arMatch) {
      const requestedAr = arMatch[1];
      if (AR_MAP[requestedAr]) {
        aspect_ratio = requestedAr;
        size = AR_MAP[requestedAr];
      }
      prompt = prompt.replace(arMatch[0], "").trim();
    }

    await api.sendReaction("⏳", event.messageId);

    try {
      const response = await axios.post("https://anikex-img-api.onrender.com/v1/images/generations", {
        prompt: prompt,
        model: "anime-art-default",
        n: 1,
        size: size,
        aspect_ratio: aspect_ratio,
        negative_prompt: "",
        response_format: "url"
      }, {
        headers: {
          "accept": "application/json",
          "Content-Type": "application/json"
        },
        timeout: 180000
      });

      const imageUrl = response.data?.data?.[0]?.url;
      if (!imageUrl) throw new Error("No image URL returned");

      await api.sendMessage({
        body: `Done - ${aspect_ratio}`,
        attachment: imageUrl
      }, event.threadId);
      await api.sendReaction("✅", event.messageId);

    } catch (error) {
      logger.error('anigen error', { error: error.message });
      await api.sendReaction("❌", event.messageId);
      api.sendMessage("❌ Error while generating anime image.", event.threadId);
    }
  }
};
