module.exports = {
  config: {
    name: 'unsend',
    aliases: ['delete', 'remove', 'del', 'u'],
    description: 'Unsend a message (reply to the bot\'s message you want to unsend)',
    usage: 'unsend',
    cooldown: 3,
    role: 0,
    author: 'NeoKEX',
    category: 'admin'
  },

  async run({ api, event, bot, logger, config }) {
    try {
      // Debug: Log event structure
      if (config.LOG_LEVEL === 'debug') {
        logger.debug('Unsend command event:', {
          hasReplyToItemId: !!event.replyToItemId,
          eventKeys: Object.keys(event)
        });
      }

      let messageIdToUnsend;

      // If this is a reply to a message
      if (event.messageReply) {
        // Check if the replied message was sent by the bot
        if (event.messageReply.senderID != bot.userID) {
          return api.sendMessage('❌ I can only unsend my own messages. Please reply to one of my messages.', event.threadId);
        }
        messageIdToUnsend = event.messageReply.messageID || event.messageReply.messageId;
        logger.debug('Unsending replied bot message', { itemId: messageIdToUnsend });
      } else {
        // Otherwise, try to unsend the last message sent by the bot in this thread
        const lastMessage = api.getLastSentMessage(event.threadId);
        
        if (!lastMessage) {
          return api.sendMessage(
            '❌ No message to unsend!\n\n' +
            'Usage:\n' +
            '• Reply to a bot message and type unsend to delete it\n' +
            '• Type unsend to delete the bot\'s last message in this chat',
            event.threadId
          );
        }
        
        messageIdToUnsend = lastMessage.itemId;
        logger.debug('Unsending last bot message', { itemId: messageIdToUnsend });
      }

      // Try to unsend the message
      try {
        await api.unsend(messageIdToUnsend);
        logger.info(`Message unsent: ${messageIdToUnsend} in thread ${event.threadId}`);
      } catch (unsendError) {
        logger.error(`Failed to unsend message: ${unsendError.message}`);
        return api.sendMessage(`❌ Failed to unsend message: ${unsendError.message}`, event.threadId);
      }
    } catch (error) {
      logger.error(`Error in unsend command: ${error.message}`);
      return api.sendMessage('❌ Error executing unsend command.', event.threadId);
    }
  }
};
