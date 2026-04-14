const joinTracker = new Map();

async function handleAntiRaid(member) {
  const enabled = process.env.ANTIRAID_ENABLED === 'true';
  if (!enabled) return;

  const threshold = parseInt(process.env.ANTIRAID_JOIN_THRESHOLD) || 10;
  const window = parseInt(process.env.ANTIRAID_JOIN_WINDOW) || 10000;

  const guildId = member.guild.id;
  const now = Date.now();

  const joins = joinTracker.get(guildId) || [];
  const recent = joins.filter(t => now - t < window);
  recent.push(now);
  joinTracker.set(guildId, recent);

  if (recent.length >= threshold) {
    // Kick the joining member
    await member.kick('Anti-raid: mass join detected').catch(() => {});

    // Alert in first available text channel
    const channel = member.guild.channels.cache.find(
      c => c.isTextBased() && c.permissionsFor(member.guild.members.me).has('SendMessages')
    );

    if (channel) {
      const { warnEmbed } = require('./embed');
      channel.send({
        embeds: [warnEmbed(
          `⚠️ **Raid detected!** ${recent.length} users joined in ${window / 1000}s. Kicking new joins automatically.\n\nDisable with \`!antiraid off\` or adjust in \`.env\`.`,
          '🔒 Anti-Raid Triggered'
        )],
      });
    }
  }
}

module.exports = { handleAntiRaid };
