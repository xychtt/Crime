const { successEmbed, errorEmbed } = require('../../utils/embed');

const durations = { s: 1000, m: 60000, h: 3600000, d: 86400000 };

module.exports = {
  name: 'timeout',
  description: 'Timeout a member',
  usage: '!timeout @user 10m [reason]',
  category: 'mod',
  async execute(message, args) {
    if (!message.member.permissions.has('ModerateMembers'))
      return message.reply({ embeds: [errorEmbed('You need **Moderate Members** permission.')] });

    const target = message.mentions.members.first();
    if (!target) return message.reply({ embeds: [errorEmbed('Please mention a user.')] });

    const durationStr = args[1];
    if (!durationStr) return message.reply({ embeds: [errorEmbed('Please provide a duration. Example: `10m`, `1h`, `2d`')] });

    const unit = durationStr.slice(-1);
    const amount = parseInt(durationStr.slice(0, -1));
    if (!durations[unit] || isNaN(amount))
      return message.reply({ embeds: [errorEmbed('Invalid duration. Use: `10s`, `5m`, `1h`, `2d`')] });

    const ms = amount * durations[unit];
    const reason = args.slice(2).join(' ') || 'No reason provided';

    await target.timeout(ms, reason);

    message.reply({ embeds: [successEmbed(`**${target.user.tag}** has been timed out for **${durationStr}**.\n**Reason:** ${reason}`)] });
  },
};
