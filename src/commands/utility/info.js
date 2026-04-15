const { crimeEmbed } = require('../../utils/embed');

const userinfo = {
  name: 'userinfo',
  aliases: ['whois', 'ui'],
  description: 'Get info about a user',
  usage: '!userinfo [@user]',
  category: 'utility',
  async execute(message, args) {
    const member = message.mentions.members.first() || message.member;
    const { user } = member;

    const roles = member.roles.cache
      .filter(r => r.id !== message.guild.id)
      .sort((a, b) => b.position - a.position)
      .map(r => r.toString())
      .slice(0, 10)
      .join(', ') || 'None';

    message.reply({ embeds: [crimeEmbed({
      title: user.tag,
      thumbnail: user.displayAvatarURL({ dynamic: true, size: 256 }),
      fields: [
        { name: 'ID', value: user.id, inline: true },
        { name: 'Nickname', value: member.nickname || 'None', inline: true },
        { name: 'Account Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
        { name: 'Joined Server', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
        { name: `Roles (${member.roles.cache.size - 1})`, value: roles },
      ],
    })] });
  },
};

const serverinfo = {
  name: 'serverinfo',
  aliases: ['si', 'guildinfo'],
  description: 'Get info about the server',
  usage: '!serverinfo',
  category: 'utility',
  async execute(message) {
    const guild = message.guild;
    await guild.members.fetch();

    const bots = guild.members.cache.filter(m => m.user.bot).size;
    const humans = guild.memberCount - bots;

    message.reply({ embeds: [crimeEmbed({
      title: guild.name,
      thumbnail: guild.iconURL({ dynamic: true }),
      fields: [
        { name: 'Owner', value: `<@${guild.ownerId}>`, inline: true },
        { name: 'Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
        { name: 'Members', value: `👥 ${humans} humans\n🤖 ${bots} bots`, inline: true },
        { name: 'Channels', value: `${guild.channels.cache.size} total`, inline: true },
        { name: 'Roles', value: `${guild.roles.cache.size}`, inline: true },
        { name: 'Boosts', value: `Level ${guild.premiumTier} (${guild.premiumSubscriptionCount} boosts)`, inline: true },
      ],
      footer: `ID: ${guild.id}`,
    })] });
  },
};

module.exports = { userinfo, serverinfo };
