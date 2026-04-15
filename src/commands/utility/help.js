const { crimeEmbed } = require('../../utils/embed');

const categories = {
  mod: {
    emoji: '🛡️',
    label: 'Moderation',
    commands: [
      { name: 'ban', desc: 'Ban a member' },
      { name: 'kick', desc: 'Kick a member' },
      { name: 'warn', desc: 'Warn a member' },
      { name: 'warnings', desc: 'View warnings for a user' },
      { name: 'clearwarns', desc: 'Clear all warnings for a user' },
      { name: 'timeout', desc: 'Timeout a member (e.g. `!timeout @user 10m`)' },
      { name: 'purge', desc: 'Delete messages (up to 100)' },
      { name: 'automod', desc: 'Configure automod (on/off/links/spam)' },
      { name: 'filter', desc: 'Manage word filter (add/remove/list)' },
      { name: 'antiraid', desc: 'Toggle anti-raid protection' },
    ],
  },
  utility: {
    emoji: '⚙️',
    label: 'Utility',
    commands: [
      { name: 'rank', desc: 'Check your XP rank' },
      { name: 'leaderboard', desc: 'View the XP leaderboard' },
      { name: 'statschannels', desc: 'Create server stats voice channels' },
      { name: 'announce', desc: 'Send an announcement to a channel' },
      { name: 'remind', desc: 'Set a personal reminder' },
      { name: 'userinfo', desc: 'Get info about a user' },
      { name: 'trust', desc: 'Trust/background check for a member' },
      { name: 'maincheck', desc: 'Find likely main account matches' },
      { name: 'serverinfo', desc: 'Get info about the server' },
      { name: 'ticket', desc: 'Open a support ticket' },
      { name: 'closeticket', desc: 'Close and archive a ticket' },
    ],
  },
  fun: {
    emoji: '🎮',
    label: 'Fun',
    commands: [
      { name: 'poll', desc: 'Create a yes/no poll' },
      { name: 'giveaway', desc: 'Start a giveaway' },
      { name: 'coinflip', desc: 'Flip a coin' },
      { name: '8ball', desc: 'Ask the magic 8-ball' },
    ],
  },
};

module.exports = {
  name: 'help',
  description: 'Show all commands',
  usage: '!help [command]',
  category: 'utility',
  async execute(message, args) {
    const prefix = process.env.PREFIX || '!';

    if (args[0]) {
      const cmd = message.client.commands.get(args[0].toLowerCase());
      if (!cmd) {
        return message.reply({ embeds: [crimeEmbed({ description: `No command found for \`${args[0]}\`.` })] });
      }

      return message.reply({ embeds: [crimeEmbed({
        title: `${prefix}${cmd.name}`,
        fields: [
          { name: 'Description', value: cmd.description || 'No description.' },
          { name: 'Usage', value: `\`${cmd.usage || prefix + cmd.name}\`` },
          { name: 'Category', value: cmd.category || 'misc' },
          ...(cmd.cooldown ? [{ name: 'Cooldown', value: `${cmd.cooldown}s` }] : []),
        ],
      })] });
    }

    const fields = Object.values(categories).map(cat => {
      const list = cat.commands.map(c => `\`${prefix}${c.name}\` - ${c.desc}`).join('\n');
      return { name: `${cat.emoji} ${cat.label}`, value: list };
    });

    return message.reply({ embeds: [crimeEmbed({
      title: 'Crime - Command List',
      description: `Use \`${prefix}help [command]\` for details on a specific command.`,
      fields,
      footer: `${Object.values(categories).reduce((a, c) => a + c.commands.length, 0)} commands total`,
    })] });
  },
};

