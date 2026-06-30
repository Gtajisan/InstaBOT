const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

module.exports = {
  config: {
    name: "say",
    version: "1.7",
    author: "Samir Œ",
    cooldown: 5,
    role: 0,
    category: "media",
    description: "Convert text to voice using Google TTS",
    usage: "say [text] | [lang] or reply to a message"
  },

  async run({ api, event, args, logger }) {
    let text;
    let lang = 'en';

    if (event.messageReply && event.messageReply.body) {
      text = event.messageReply.body;
      if (args.length > 0) lang = args[0];
    } else {
      if (args.length > 0) {
        const fullArgs = args.join(" ");
        if (fullArgs.includes("|")) {
          const splitArgs = fullArgs.split("|").map(arg => arg.trim());
          text = splitArgs[0];
          lang = splitArgs[1] || 'en';
        } else {
          text = fullArgs;
        }
      }
    }

    if (!text) {
      return api.sendMessage("❌ Please provide some text or reply to a message.", event.threadId);
    }

    const cacheDir = path.join(__dirname, 'cache');
    await fs.ensureDir(cacheDir);
    const filePath = path.join(cacheDir, `tts_${event.messageId}.mp3`);

    try {
      if (text.length <= 150) {
        const response = await axios({
          method: "get",
          url: `https://translate.google.com/translate_tts?ie=UTF-8&tl=${lang}&client=tw-ob&q=${encodeURIComponent(text)}`,
          responseType: "stream"
        });

        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
          writer.on("finish", resolve);
          writer.on("error", reject);
        });

        await api.sendMessage({ attachment: filePath }, event.threadId);
        await fs.remove(filePath);
      } else {
        const chunkSize = 150;
        const chunks = text.match(new RegExp(`.{1,${chunkSize}}`, 'g'));

        const writer = fs.createWriteStream(filePath);

        for (let i = 0; i < chunks.length; i++) {
          const response = await axios({
            method: "get",
            url: `https://translate.google.com/translate_tts?ie=UTF-8&tl=${lang}&client=tw-ob&q=${encodeURIComponent(chunks[i])}`,
            responseType: "arraybuffer"
          });
          writer.write(Buffer.from(response.data));
        }

        writer.end();

        await new Promise((resolve, reject) => {
          writer.on("finish", resolve);
          writer.on("error", reject);
        });

        await api.sendMessage({ attachment: filePath }, event.threadId);
        await fs.remove(filePath);
      }
    } catch (err) {
      logger.error('say command error', { error: err.message });
      api.sendMessage("❌ An error occurred while converting text to speech.", event.threadId);
      if (fs.existsSync(filePath)) await fs.remove(filePath);
    }
  }
};
