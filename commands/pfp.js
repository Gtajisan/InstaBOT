const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

module.exports = {
  config: {
    name: 'pfp',
    aliases: ['avatar', 'profilepic'],
    description: "Fetch user's profile picture",
    usage: 'pfp [username | @username | link | reply | @tag]',
    cooldown: 5,
    role: 0,
    author: 'Gtajisan',
    category: 'utility'
  },

  async run({ api, event, args, logger }) {
    try {
      let targetInput = null;
      let isUid = false;

      // 1. Check explicit arguments
      if (args.length > 0) {
        const input = args[0].trim();
        if (input.includes('instagram.com/')) {
          const match = input.match(/instagram\.com\/([^/?#&]+)/);
          if (match) targetInput = match[1];
        } else {
          // Normalize username: remove all leading @ symbols
          targetInput = input.replace(/^@+/, '');
        }
      }
      // 2. Check mentions (parity with GoatBot)
      else if (event.mentions && Object.keys(event.mentions).length > 0) {
        targetInput = Object.keys(event.mentions)[0];
        isUid = true;
      }
      // 3. Check reply
      else if (event.messageReply) {
        const replyBody = event.messageReply.body || '';
        const senderID = event.messageReply.senderID;

        const urlMatch = replyBody.match(/instagram\.com\/([^/?#&]+)/);
        if (urlMatch) {
          targetInput = urlMatch[1];
        } else {
          const atMatch = replyBody.match(/@([a-zA-Z0-9._]+)/);
          if (atMatch) {
            targetInput = atMatch[1];
          } else {
            targetInput = senderID;
            isUid = true;
          }
        }
      }
      // 4. Fallback to sender
      else {
        targetInput = event.senderID;
        isUid = true;
      }

      if (!targetInput) {
        return api.sendMessage('❌ Could not identify a user.', event.threadId);
      }

      if (!isUid && /^\d+$/.test(targetInput)) {
        isUid = true;
      }

      // Check cache
      const cacheKey = `${isUid ? 'uid' : 'user'}:${targetInput}`;
      if (cache.has(cacheKey)) {
        const { data, timestamp } = cache.get(cacheKey);
        if (Date.now() - timestamp < CACHE_TTL) {
          return this.sendProfile(api, event, data, logger);
        }
      }

      await api.sendMessage('🔍 Fetching profile picture...', event.threadId);

      const userInfo = await this.fetchWithRetry(async () => {
        return isUid
          ? await api.getUserInfo(targetInput)
          : await api.getUserInfoByUsername(targetInput);
      }, logger);

      if (!userInfo) {
        return api.sendMessage(`❌ User ${isUid ? targetInput : '@' + targetInput} not found or account is private.`, event.threadId);
      }

      // Store in cache
      cache.set(cacheKey, { data: userInfo, timestamp: Date.now() });

      return this.sendProfile(api, event, userInfo, logger);

    } catch (error) {
      logger.error('Error in pfp command', { error: error.message });
      return api.sendMessage(`❌ Error: ${error.message}`, event.threadId);
    }
  },

  async sendProfile(api, event, userInfo, logger) {
    const userId = userInfo.userID || userInfo.userId;
    const username = userInfo.username;
    const fullName = userInfo.fullName || 'N/A';
    const isPrivate = userInfo.isPrivate ? '🔒 Private' : '🔓 Public';
    const isVerified = userInfo.isVerified ? '✅ Verified' : '❌ Not Verified';

    const pfpUrl = userInfo.profilePicUrlHd ||
                   userInfo.hdProfilePicUrlInfo?.url ||
                   userInfo.profilePicUrl;

    if (!pfpUrl) {
      return api.sendMessage('❌ Could not find a profile picture URL.', event.threadId);
    }

    let caption = `👤 Username: @${username}\n`;
    caption += `📝 Full Name: ${fullName}\n`;
    caption += `🆔 User ID: ${userId}\n`;
    caption += `🛡️ Status: ${isPrivate} | ${isVerified}\n`;
    caption += `🔗 Profile: https://instagram.com/${username}`;

    const tempDir = path.join(process.cwd(), 'temp');
    await fs.ensureDir(tempDir);
    const filePath = path.join(tempDir, `pfp_${userId}_${Date.now()}.jpg`);

    try {
      const response = await axios.get(pfpUrl, { responseType: 'arraybuffer', timeout: 15000 });
      await fs.writeFile(filePath, Buffer.from(response.data));

      await api.sendPhoto(filePath, event.threadId, { caption });
    } catch (error) {
      logger.error('Failed to send profile picture as attachment', { error: error.message });
      try {
        await api.sendPhotoFromUrl(event.threadId, pfpUrl, { caption });
      } catch (fallbackError) {
        await api.sendMessage(`${caption}\n\n🖼️ PFP URL: ${pfpUrl}`, event.threadId);
      }
    } finally {
      if (await fs.pathExists(filePath)) {
        await fs.unlink(filePath).catch(() => {});
      }
    }
  },

  async fetchWithRetry(fn, logger, retries = 3, backoff = 1000) {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error) {
        const errorMsg = error.message.toLowerCase();
        const isRateLimit = errorMsg.includes('rate limit') || errorMsg.includes('429') || errorMsg.includes('too many requests');

        if (isRateLimit && i < retries - 1) {
          const delay = backoff * Math.pow(2, i);
          logger.warn(`Rate limit hit fetching profile, retrying in ${delay}ms... (Attempt ${i+1}/${retries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw error;
      }
    }
  }
};
