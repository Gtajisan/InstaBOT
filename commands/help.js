module.exports = {
  config: {
    name: 'help',
    aliases: ['menu', 'commands', 'h'],
    version: '4.8',
    author: 'Gtajisan',
    description: 'Show all available commands or detailed info about one command',
    usage: 'help [command name]',
    cooldown: 3,
    role: 0,
    category: 'system'
  },

  async run({ api, event, args, bot, config, logger }) {
    try {
      const { commandLoader } = bot;
      const prefix = config.PREFIX;
      const allCommands = commandLoader.commands;

      const roleNames = {
        0: 'Normal User',
        1: 'Group Admin',
        2: 'Bot Admin',
        3: 'Premium User',
        4: 'Developer'
      };

      const emojiMap = {
        ai: '🤖', 'ai-image': '🎨', group: '👥', system: '⚙️',
        fun: '🎮', owner: '👑', config: '🔧', economy: '💰',
        media: '🎬', tools: '🛠️', utility: '🛠️', info: 'ℹ️',
        image: '🖼️', game: '🎲', admin: '👑', rank: '📊',
        boxchat: '💬', moderation: '🛡️', others: '📦'
      };

      const cleanCategory = (text) => {
        if (!text) return 'others';
        return text
          .normalize('NFKD')
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, ' ')
          .trim()
          .toLowerCase();
      };

      // ── Single command detail ──────────────────────────────────────────
      if (args.length > 0) {
        const query = args[0].toLowerCase();
        const cmd = commandLoader.getCommand(query);

        if (!cmd) {
          return api.sendMessage(
            `❌ Command "${query}" not found.\n\nType ${prefix}help to see all available commands.`,
            event.threadId
          );
        }

        const {
          name, version, author, usage, category,
          description, aliases, cooldown, role
        } = cmd.config;

        const roleName = roleNames[role] ?? 'Normal User';
        const usageStr = usage
          ? usage.replace(/\{pn\}/g, prefix)
          : `${prefix}${name}`;

        let info = `☠️ 𝗖𝗢𝗠𝗠𝗔𝗡𝗗 𝗜𝗡𝗙𝗢 ☠️\n\n`;
        info += `➥ Name: ${name}\n`;
        info += `➥ Version: ${version || '1.0'}\n`;
        info += `➥ Category: ${category || 'Uncategorized'}\n`;
        info += `➥ Description: ${description || 'No description'}\n`;
        info += `➥ Aliases: ${aliases?.length ? aliases.join(', ') : 'None'}\n`;
        info += `➥ Usage: ${usageStr}\n`;
        info += `➥ Cooldown: ${cooldown || 0}s\n`;
        info += `➥ Permission: ${role ?? 0} — ${roleName}\n`;
        info += `➥ Author: ${author || 'Unknown'}`;

        return api.sendMessage(info, event.threadId);
      }

      // ── Full command list ──────────────────────────────────────────────
      const categories = {};
      let totalUnique = 0;

      for (const [key, cmd] of allCommands) {
        if (cmd.config.name !== key) continue; // skip alias entries
        const cat = cleanCategory(cmd.config.category);
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(cmd.config.name);
        totalUnique++;
      }

      let msg = `━━━☠️ ${config.NICK_NAME_BOT || 'Gtajisan AI'} ☠️━━━\n`;
      msg += `│ Prefix: ${prefix}  │  Commands: ${totalUnique}\n`;

      const sortedCats = Object.keys(categories).sort();
      for (const cat of sortedCats) {
        const emoji = emojiMap[cat] || '➥';
        const cmds  = categories[cat].sort().map(c => `× ${c}`).join('  ');
        msg += `\n╭──『 ${emoji} ${cat.toUpperCase()} 』\n`;
        msg += `${cmds}\n`;
        msg += `╰────────────◊\n`;
      }

      msg += `\n➥ Use: ${prefix}help [command] for details`;

      return api.sendMessage(msg, event.threadId);

    } catch (error) {
      logger.error('Error in help command', { error: error.message });
      return api.sendMessage('❌ Error displaying help information.', event.threadId);
    }
  }
};
