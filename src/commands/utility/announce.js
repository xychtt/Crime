const { crimeEmbed, errorEmbed } = require('../../utils/embed');

module.exports = {
  name: 'announce',
  description: 'Send an announcement embed to a channel',
  usage: '!announce #channel Your message here',
  category: 'utility',
  async execute(message, args) {
    if (!message.member.permissions.has('ManageMessages'))
      return message.reply({ embeds: [errorEmbed('You need **Manage Messages** permission.')] });

    const channel = message.mentions.channels.first();
    if (!channel) return message.reply({ embeds: [errorEmbed('Please mention a channel. Example: `!announce #announcements Hello!`')] });

    const text = args.slice(1).join(' ');
    if (!text) return message.reply({ embeds: [errorEmbed('Please provide announcement text.')] });

    await channel.send({ embeds: [crimeEmbed({
      title: '📢 Announcement',
      description: text,
      footer: `Sent by ${message.author.tag}`,
    })] });

    message.reply({ embeds: [crimeEmbed({ description: `✅ Announcement sent to ${channel}.` })] });
  },
};
