const { handleAntiRaid } = require('../utils/antiraid');
const { handleJoinSecurity } = require('../utils/joinSecurity');
const { crimeEmbed } = require('../utils/embed');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member, client) {
    // Anti-raid check
    const antiRaidBlocked = await handleAntiRaid(member);
    if (antiRaidBlocked) return;

    // Security checks (permanent bans, anti-alt, optional VPN check)
    const securityBlocked = await handleJoinSecurity(member);
    if (securityBlocked) return;

    // Welcome message
    const channelName = process.env.WELCOME_CHANNEL || 'welcome';
    const channel = member.guild.channels.cache.find(c => c.name === channelName && c.isTextBased());
    if (!channel) return;

    const msg = (process.env.WELCOME_MESSAGE || 'Welcome to the server, {user}! 👋')
      .replace('{user}', member.toString())
      .replace('{username}', member.user.username)
      .replace('{server}', member.guild.name)
      .replace('{count}', member.guild.memberCount);

    const embed = crimeEmbed({
      title: `👋 Welcome to ${member.guild.name}`,
      description: msg,
      thumbnail: member.user.displayAvatarURL({ dynamic: true }),
      footer: `Member #${member.guild.memberCount}`,
    });

    channel.send({ embeds: [embed] });
  },
};
