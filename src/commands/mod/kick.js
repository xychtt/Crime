const { successEmbed, errorEmbed, crimeEmbed } = require('../../utils/embed');

module.exports = {
  name: 'kick',
  description: 'Kick a member from the server',
  usage: '!kick @user [reason]',
  category: 'mod',
  async execute(message, args) {
    if (!message.member.permissions.has('KickMembers'))
      return message.reply({ embeds: [errorEmbed('You need **Kick Members** permission.')] });

    const target = message.mentions.members.first();
    if (!target) return message.reply({ embeds: [errorEmbed('Please mention a user to kick.')] });
    if (!target.kickable) return message.reply({ embeds: [errorEmbed("I can't kick that user.")] });

    const reason = args.slice(1).join(' ') || 'No reason provided';
    await target.kick(reason);

    const logChannel = message.guild.channels.cache.find(c => c.name === (process.env.MOD_LOG_CHANNEL || 'mod-logs') && c.isTextBased());
    if (logChannel) {
      logChannel.send({ embeds: [crimeEmbed({
        color: 0xf39c12,
        title: '👢 Kick',
        fields: [
          { name: 'User', value: `${target.user.tag} (${target.user.id})`, inline: true },
          { name: 'Moderator', value: message.author.tag, inline: true },
          { name: 'Reason', value: reason },
        ],
      })] });
    }

    message.reply({ embeds: [successEmbed(`**${target.user.tag}** has been kicked.\n**Reason:** ${reason}`)] });
  },
};
