const axios = require('axios');

const BASE_URL = 'https://noobs-api.top/dipto/baby';

module.exports = {
  config: {
    name: 'bby',
    aliases: ['baby', 'bbe', 'babe'],
    description: 'Chat with Baby AI — teach it, manage replies, and more',
    usage: 'bby <message> | teach <msg> - <reply> | remove <msg> | list | msg <msg>',
    cooldown: 3,
    role: 0,
    author: 'dipto',
    category: 'ai'
  },

  async run({ api, event, args, logger, database }) {
    // If no arguments, send a random idle message
    if (args.length === 0) {
      const idle = ['Bolo baby 🥺', 'hum...', 'Type bby help', 'Ki bolbe?'];
      const res = await api.sendMessage(idle[Math.floor(Math.random() * idle.length)], event.threadId);

      // Store messageID so the user can reply to this idle message to start chatting
      if (res && res.messageID) {
        database.setReplyData(res.messageID, { commandName: 'bby' });
      }
      return res;
    }

    const uid  = event.senderID;
    const text = args.join(' ').toLowerCase();

    try {
      // remove <msg> logic
      if (args[0] === 'remove') {
        const msg = text.replace('remove ', '');
        const res = await axios.get(`${BASE_URL}?remove=${encodeURIComponent(msg)}&senderID=${uid}`);
        const sent = await api.sendMessage(res.data.message, event.threadId);
        if (sent && sent.messageID) {
          database.setReplyData(sent.messageID, { commandName: 'bby' });
        }
        return sent;
      }

      // list all teaches
      if (args[0] === 'list') {
        const res = await axios.get(`${BASE_URL}?list=all`);
        const data = res.data;
        const sent = await api.sendMessage(
          `❇️ Total Teaches: ${data.length || 'N/A'}\n♻️ Total Responses: ${data.responseLength || 'N/A'}`,
          event.threadId
        );
        if (sent && sent.messageID) {
          database.setReplyData(sent.messageID, { commandName: 'bby' });
        }
        return sent;
      }

      // msg <msg> - check response for a specific message
      if (args[0] === 'msg') {
        const msg = text.replace('msg ', '');
        const res = await axios.get(`${BASE_URL}?list=${encodeURIComponent(msg)}`);
        const sent = await api.sendMessage(`Message "${msg}" → ${res.data.data}`, event.threadId);
        if (sent && sent.messageID) {
          database.setReplyData(sent.messageID, { commandName: 'bby' });
        }
        return sent;
      }

      // teach <msg> - <reply> - teach new responses
      if (args[0] === 'teach') {
        const parts = text.replace('teach ', '').split(/\s*-\s*/);
        if (parts.length < 2 || parts[1].length < 2) {
          return api.sendMessage('❌ Invalid format!\n\nUsage: bby teach <message> - <reply1>, <reply2>', event.threadId);
        }
        const [question, reply] = parts;
        const res = await axios.get(
          `${BASE_URL}?teach=${encodeURIComponent(question)}&reply=${encodeURIComponent(reply)}&senderID=${uid}`
        );
        const sent = await api.sendMessage(`✅ Taught!\n${res.data.message}`, event.threadId);
        if (sent && sent.messageID) {
          database.setReplyData(sent.messageID, { commandName: 'bby' });
        }
        return sent;
      }

      // regular chat path
      const res = await axios.get(`${BASE_URL}?text=${encodeURIComponent(text)}&senderID=${uid}&font=1`);
      const sent = await api.sendMessage(res.data.reply || '...', event.threadId);

      // Enable "reply-to-continue": store this message's ID so we know
      // that future replies to it belong to the 'bby' command session.
      if (sent && sent.messageID) {
        database.setReplyData(sent.messageID, { commandName: 'bby' });
      }
      return sent;

    } catch (error) {
      logger.error('bby error', { error: error.message });
      return api.sendMessage('❌ Baby AI is unavailable right now.', event.threadId);
    }
  },

  /**
   * handleReply - New feature: Reply-to-continue chat
   * This is called by the message event dispatcher when a user replies to a bot bby message.
   */
  async handleReply({ api, event, logger, database }) {
    const uid  = event.senderID;
    const text = (event.body || '').trim().toLowerCase();

    // Ignore empty replies
    if (!text) return;

    try {
      // Call the same Baby AI chat endpoint
      const res = await axios.get(`${BASE_URL}?text=${encodeURIComponent(text)}&senderID=${uid}&font=1`);
      const sent = await api.sendMessage(res.data.reply || '...', event.threadId);

      // Store the new message ID so the user can keep replying to continue the chat indefinitely
      if (sent && sent.messageID) {
        database.setReplyData(sent.messageID, { commandName: 'bby' });
      }
    } catch (error) {
      logger.error('bby handleReply error', { error: error.message });
      // Silent error or message based on preference
      return api.sendMessage('❌ Baby AI is unavailable right now.', event.threadId);
    }
  }
};
