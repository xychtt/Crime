const { crimeEmbed } = require('../utils/embed');

module.exports = {
  name: 'guildMemberRemove',
  async execute(member, client) {
    const channelName = process.env.WELCOME_CHANNEL || 'welcome';
    const channel = member.guild.channels.cache.find(c => c.name === channelName && c.isTextBased());
    if (!channel) return;

    const msg = (process.env.GOODBYE_MESSAGE || '**{user}** has left the server.')
      .replace('{user}', member.user.tag)
      .replace('{username}', member.user.username)
      .replace('{server}', member.guild.name);

    const embed = crimeEmbed({
      description: msg,
      footer: `Members: ${member.guild.memberCount}`,
    });

    channel.send({ embeds: [embed] });
  },
};
