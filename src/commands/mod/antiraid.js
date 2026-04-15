const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/embed');

module.exports = {
  name: 'antiraid',
  description: 'Toggle anti-raid protection',
  usage: '!antiraid <on|off|status>',
  category: 'mod',
  async execute(message, args) {
    if (!message.member.permissions.has('Administrator'))
      return message.reply({ embeds: [errorEmbed('You need **Administrator** permission.')] });

    const sub = args[0]?.toLowerCase();

    if (!sub || sub === 'status') {
      const status = process.env.ANTIRAID_ENABLED === 'true';
      return message.reply({ embeds: [infoEmbed(
        `**Anti-raid:** ${status ? '✅ Active' : '❌ Inactive'}\n**Threshold:** ${process.env.ANTIRAID_JOIN_THRESHOLD || 10} joins in ${(parseInt(process.env.ANTIRAID_JOIN_WINDOW) || 10000) / 1000}s`,
        '🔒 Anti-Raid Status'
      )] });
    }

    if (sub === 'on') {
      process.env.ANTIRAID_ENABLED = 'true';
      return message.reply({ embeds: [successEmbed('Anti-raid protection **enabled**.')] });
    }

    if (sub === 'off') {
      process.env.ANTIRAID_ENABLED = 'false';
      return message.reply({ embeds: [successEmbed('Anti-raid protection **disabled**.')] });
    }

    message.reply({ embeds: [errorEmbed('Usage: `!antiraid <on|off|status>`')] });
  },
};
