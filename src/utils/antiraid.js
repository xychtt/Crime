const joinTracker = new Map();
const { warnEmbed } = require('./embed');

async function handleAntiRaid(member) {
  const enabled = process.env.ANTIRAID_ENABLED === 'true';
  if (!enabled) return false;

  const threshold = parseInt(process.env.ANTIRAID_JOIN_THRESHOLD || '10', 10);
  const windowMs = parseInt(process.env.ANTIRAID_JOIN_WINDOW || '10000', 10);

  const guildId = member.guild.id;
  const now = Date.now();

  const joins = joinTracker.get(guildId) || [];
  const recent = joins.filter(t => now - t < windowMs);
  recent.push(now);
  joinTracker.set(guildId, recent);

  if (recent.length < threshold) return false;

  await member.kick('Anti-raid: mass join detected').catch(() => {});

  const channel = member.guild.channels.cache.find(
    c => c.isTextBased() && c.permissionsFor(member.guild.members.me).has('SendMessages')
  );

  if (channel) {
    await channel.send({
      embeds: [warnEmbed(
        `Raid detected: ${recent.length} users joined in ${windowMs / 1000}s. Kicking new joins automatically.`,
        'Anti-Raid Triggered'
      )],
    }).catch(() => {});
  }

  return true;
}

module.exports = { handleAntiRaid };

