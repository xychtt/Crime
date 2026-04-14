const { successEmbed, errorEmbed } = require('../../utils/embed');
const { loadData, saveData } = require('../../utils/dataStore');

module.exports = {
  name: 'ban',
  description: 'Ban a member from the server',
  usage: '!ban @user [reason]',
  category: 'mod',
  async execute(message, args) {
    if (!message.member.permissions.has('BanMembers'))
      return message.reply({ embeds: [errorEmbed('You need **Ban Members** permission.')] });

    const target = message.mentions.members.first();
    if (!target) return message.reply({ embeds: [errorEmbed('Please mention a user to ban.')] });
    if (!target.bannable) return message.reply({ embeds: [errorEmbed("I can't ban that user.")] });

    const reason = args.slice(1).join(' ') || 'No reason provided';
    await target.ban({ reason });

    // Log it
    await logAction(message.guild, 'Ban', message.author, target.user, reason);

    message.reply({ embeds: [successEmbed(`**${target.user.tag}** has been banned.\n**Reason:** ${reason}`)] });
  },
};

async function logAction(guild, action, moderator, target, reason) {
  const channelName = process.env.MOD_LOG_CHANNEL || 'mod-logs';
  const channel = guild.channels.cache.find(c => c.name === channelName && c.isTextBased());
  if (!channel) return;

  const { crimeEmbed } = require('../../utils/embed');
  channel.send({
    embeds: [crimeEmbed({
      color: 0xe74c3c,
      title: `🔨 ${action}`,
      fields: [
        { name: 'User', value: `${target.tag} (${target.id})`, inline: true },
        { name: 'Moderator', value: `${moderator.tag}`, inline: true },
        { name: 'Reason', value: reason },
      ],
      footer: new Date().toLocaleString(),
    })],
  });
}
