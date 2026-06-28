module.exports = {
  config: {
    name: 'rps',
    aliases: ['rockpaperscissors', 'rock'],
    description: 'Play Rock Paper Scissors with the bot',
    usage: 'rps <rock|paper|scissors>',
    cooldown: 2,
    role: 0,
    author: 'Gtajisan',
    category: 'game'
  },

  async run({ api, event, args, logger }) {
    try {
      if (args.length === 0) {
        return api.sendMessage(
          '✊✋✌️ Rock Paper Scissors!\n\n' +
          'Usage: rps <rock|paper|scissors>\n\n' +
          'Example: rps rock',
          event.threadId
        );
      }

      const choices = ['rock', 'paper', 'scissors'];
      const emojis = {
        rock: '✊',
        paper: '✋',
        scissors: '✌️'
      };

      const userChoice = args[0].toLowerCase();

      if (!choices.includes(userChoice)) {
        return api.sendMessage(
          '❌ Invalid choice!\n\n' +
          'Please choose: rock, paper, or scissors',
          event.threadId
        );
      }

      const botChoice = choices[Math.floor(Math.random() * choices.length)];

      let result = '';
      if (userChoice === botChoice) {
        result = "It's a tie!";
      } else if (
        (userChoice === 'rock' && botChoice === 'scissors') ||
        (userChoice === 'paper' && botChoice === 'rock') ||
        (userChoice === 'scissors' && botChoice === 'paper')
      ) {
        result = '🎉 You win!';
      } else {
        result = '💔 I win!';
      }

      const message = `✊✋✌️ Rock Paper Scissors!\n\n` +
        `You chose: ${emojis[userChoice]} ${userChoice}\n` +
        `I chose: ${emojis[botChoice]} ${botChoice}\n\n` +
        `${result}`;

      return api.sendMessage(message, event.threadId);

    } catch (error) {
      logger.error('Error in rps command', { error: error.message, stack: error.stack });
      return api.sendMessage('Error playing Rock Paper Scissors.', event.threadId);
    }
  }
};
