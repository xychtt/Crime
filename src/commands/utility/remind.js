const { successEmbed, errorEmbed } = require('../../utils/embed');

const durations = { s: 1000, m: 60000, h: 3600000, d: 86400000 };

module.exports = {
  name: 'remind',
  description: 'Set a reminder',
  usage: '!remind 10m Take a break',
  category: 'utility',
  async execute(message, args) {
    const durationStr = args[0];
    if (!durationStr) return message.reply({ embeds: [errorEmbed('Usage: `!remind 10m Your reminder`')] });

    const unit = durationStr.slice(-1);
    const amount = parseInt(durationStr.slice(0, -1));

    if (!durations[unit] || isNaN(amount) || amount <= 0)
      return message.reply({ embeds: [errorEmbed('Invalid duration. Use: `10s`, `5m`, `2h`, `1d`')] });

    const ms = amount * durations[unit];
    if (ms > 7 * 24 * 60 * 60 * 1000)
      return message.reply({ embeds: [errorEmbed('Reminders can be at most 7 days.')] });

    const reminder = args.slice(1).join(' ') || 'No message set.';

    message.reply({ embeds: [successEmbed(`Got it! I'll remind you in **${durationStr}**.\n**Reminder:** ${reminder}`)] });

    setTimeout(() => {
      message.author.send({ embeds: [successEmbed(`⏰ **Reminder:** ${reminder}`, `Reminder from ${message.guild.name}`)] })
        .catch(() => {
          message.channel.send({ content: `${message.author}`, embeds: [successEmbed(`⏰ **Reminder:** ${reminder}`)] });
        });
    }, ms);
  },
};
