module.exports = {
  config: {
    name: 'unsend',
    aliases: ['delete', 'remove', 'del', 'u', 'uns'],
    description: 'Unsend a message (reply to the message you want to unsend)',
    usage: 'unsend',
    cooldown: 3,
    role: 0,
    author: 'Gtajisan',
    category: 'admin'
  },

  async run({ api, event, bot, logger, config }) {
    try {
      let messageIdToUnsend;

      // If this is a reply to a message, verify it's the bot's own message
      if (event.replyToItemId) {
        // Check if messageReply metadata exists and if sender is the bot
        if (event.messageReply && String(event.messageReply.senderID) !== String(bot.userID)) {
          return api.sendMessage('❌ Please reply to a message sent by the bot to unsend it.', event.threadId);
        }

        messageIdToUnsend = event.replyToItemId;
        logger.debug('Unsending replied message', { itemId: messageIdToUnsend });
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
        await api.unsendMessage(event.threadId, messageIdToUnsend);
        logger.info(`Message unsent: ${messageIdToUnsend} in thread ${event.threadId}`);
      } catch (unsendError) {
        logger.error(`Failed to unsend message: ${unsendError.message}`);
        return api.sendMessage('❌ Failed to unsend message. It might be too old or already deleted.', event.threadId);
      }
    } catch (error) {
      logger.error(`Error in unsend command: ${error.message}`);
      return api.sendMessage('❌ Error executing unsend command.', event.threadId);
    }
  }
};
