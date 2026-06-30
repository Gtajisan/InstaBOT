const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

const BASE_API = "https://metabyneokex.vercel.app/videos";

module.exports = {
  config: {
    name: "animate",
    aliases: ["anim", "vido", "mvid"],
    version: "2.0",
    author: "Neoaz ゐ",
    cooldown: 30,
    role: 0,
    description: "Generate or edit videos using Meta AI",
    category: "ai-video",
    usage: "animate <prompt> or reply to an image"
  },

  async run({ api, event, args, logger }) {
    const prompt = args.join(" ");
    if (!prompt) return api.sendMessage("❌ Please provide a prompt.", event.threadId);

    const cacheDir = path.join(__dirname, 'cache');
    await fs.ensureDir(cacheDir);

    const isEdit = event.messageReply && event.messageReply.attachments && event.messageReply.attachments[0].type === "photo";

    const endpoint = isEdit ? `${BASE_API}/edit` : `${BASE_API}/generate`;
    const params = {
      prompt: prompt,
      poll_attempts: 25,
      poll_wait_seconds: 3
    };

    if (isEdit) {
      params.img_url = event.messageReply.attachments[0].url;
    }

    await api.sendReaction("⏳", event.messageId);
    const filePath = path.join(cacheDir, `animate_${event.messageId}.mp4`);

    try {
      const response = await axios.get(endpoint, {
        params: params,
        timeout: 350000
      });

      const data = response.data;
      if (!data.success || !data.video_urls || data.video_urls.length === 0) {
        throw new Error("Action failed or API returned no video.");
      }

      const videoUrl = data.video_urls[0];
      const videoRes = await axios({
        method: 'get',
        url: videoUrl,
        responseType: 'stream',
        timeout: 180000
      });

      const writer = fs.createWriteStream(filePath);
      videoRes.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });

      await api.sendVideo(filePath, event.threadId);
      await api.sendReaction("✅", event.messageId);

    } catch (error) {
      logger.error('animate error', { error: error.message });
      await api.sendReaction("❌", event.messageId);
      const errMsg = error.response?.data?.detail?.[0]?.msg || error.message;
      api.sendMessage(`❌ Error: ${errMsg}`, event.threadId);
    } finally {
      if (fs.existsSync(filePath)) await fs.remove(filePath);
    }
  }
};
