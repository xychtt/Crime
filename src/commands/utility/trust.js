const { crimeEmbed, errorEmbed } = require('../../utils/embed');
const { loadData } = require('../../utils/dataStore');
const { findLikelyMainAccounts, formatCandidate } = require('../../utils/accountLinker');

module.exports = {
  name: 'trust',
  aliases: ['bgcheck', 'background', 'risk'],
  description: 'Run a trust/background check on a member',
  usage: '!trust [@user|userId]',
  category: 'utility',
  async execute(message, args) {
    if (!message.member.permissions.has('ModerateMembers')) {
      return message.reply({ embeds: [errorEmbed('You need **Moderate Members** permission.')] });
    }

    const targetMember = await resolveMember(message, args);
    if (!targetMember) {
      return message.reply({ embeds: [errorEmbed('Please mention a valid server member or provide a valid user ID.')] });
    }

    const report = buildTrustReport(message.guild.id, targetMember);
    const likelyMains = await findLikelyMainAccounts(message.guild, targetMember, { limit: 3, minScore: 45 });
    const likelyMainsText = likelyMains.length
      ? likelyMains.map(c => `- ${formatCandidate(c)}`).join('\n')
      : 'No strong main-account matches found.';

    return message.reply({
      embeds: [crimeEmbed({
        title: `Trust Check: ${targetMember.user.tag}`,
        thumbnail: targetMember.user.displayAvatarURL({ dynamic: true, size: 256 }),
        fields: [
          { name: 'Trust Score', value: `**${report.score}/100** (${report.level})`, inline: true },
          { name: 'Recommendation', value: report.recommendation, inline: true },
          { name: 'User ID', value: targetMember.id, inline: true },
          { name: 'Account Created', value: report.createdAtText, inline: true },
          { name: 'Joined Server', value: report.joinedAtText, inline: true },
          { name: 'Warnings', value: String(report.warnings), inline: true },
          { name: 'Security Flags', value: report.flagsText },
          { name: 'Signals', value: report.signalsText },
          { name: 'Possible Main Accounts', value: likelyMainsText },
        ],
        footer: 'Trust score is heuristic and should support, not replace, moderator judgment.',
      })],
    });
  },
};

async function resolveMember(message, args) {
  const mentioned = message.mentions.members.first();
  if (mentioned) return mentioned;

  const raw = args[0];
  if (!raw) return message.member;

  const id = raw.replace(/[<@!>]/g, '');
  if (!/^\d{16,20}$/.test(id)) return null;

  return message.guild.members.fetch(id).catch(() => null);
}

function buildTrustReport(guildId, member) {
  const userId = member.id;
  const now = Date.now();

  const createdTs = member.user.createdTimestamp;
  const joinedTs = member.joinedTimestamp || now;
  const accountAgeDays = Math.max(0, Math.floor((now - createdTs) / 86400000));
  const serverAgeDays = Math.max(0, Math.floor((now - joinedTs) / 86400000));

  const warningsData = loadData('warnings');
  const warnings = (warningsData[guildId]?.[userId] || []).length;

  const permanentBans = loadData('permanentBans');
  const wasPermanentlyBanned = Boolean(permanentBans[guildId]?.[userId]);

  const securityReviews = loadData('securityReviews');
  const allowlisted = Boolean(securityReviews.allowlist?.[guildId]?.[userId]);
  const pending = Object.values(securityReviews.pending || {}).filter(r =>
    r && r.guildId === guildId && r.userId === userId && !r.resolved
  ).length;
  const declined = Object.values(securityReviews.pending || {}).filter(r =>
    r && r.guildId === guildId && r.userId === userId && r.resolved && r.decision === 'decline'
  ).length;
  const approved = Object.values(securityReviews.pending || {}).filter(r =>
    r && r.guildId === guildId && r.userId === userId && r.resolved && r.decision === 'allow'
  ).length;

  const minAgeDays = parseInt(process.env.ALT_MIN_ACCOUNT_AGE_DAYS || '7', 10);

  let score = 100;
  if (accountAgeDays < minAgeDays) score -= 35;
  else if (accountAgeDays < 30) score -= 15;

  if (serverAgeDays < 1) score -= 15;
  else if (serverAgeDays < 7) score -= 8;

  score -= Math.min(30, warnings * 8);
  score -= Math.min(30, declined * 15);
  if (pending > 0) score -= 20;
  if (allowlisted) score += 10;
  if (wasPermanentlyBanned) score = 0;

  score = Math.max(0, Math.min(100, score));

  let level = 'Trusted';
  let recommendation = 'Allow';
  if (wasPermanentlyBanned) {
    level = 'Blocked';
    recommendation = 'Deny';
  } else if (score < 40) {
    level = 'High Risk';
    recommendation = 'Manual Review';
  } else if (score < 60) {
    level = 'Caution';
    recommendation = 'Review Closely';
  } else if (score < 80) {
    level = 'Medium';
    recommendation = 'Allow With Monitoring';
  }

  const flags = [];
  if (wasPermanentlyBanned) flags.push('Permanent ban history');
  if (accountAgeDays < minAgeDays) flags.push(`New account (< ${minAgeDays}d)`);
  if (warnings > 0) flags.push(`${warnings} warning(s)`);
  if (pending > 0) flags.push(`${pending} pending security review(s)`);
  if (declined > 0) flags.push(`${declined} prior decline decision(s)`);
  if (allowlisted) flags.push('Moderator allowlisted');

  const signals = [
    `Account age: ${accountAgeDays} day(s)`,
    `Server age: ${serverAgeDays} day(s)`,
    `Approved reviews: ${approved}`,
    `VPN check configured: ${process.env.VPN_CHECK_API_URL ? 'Yes' : 'No'}`,
  ];

  return {
    score,
    level,
    recommendation,
    warnings,
    flagsText: flags.length ? flags.map(f => `- ${f}`).join('\n') : 'No active risk flags.',
    signalsText: signals.map(s => `- ${s}`).join('\n'),
    createdAtText: `<t:${Math.floor(createdTs / 1000)}:F>\n(<t:${Math.floor(createdTs / 1000)}:R>)`,
    joinedAtText: `<t:${Math.floor(joinedTs / 1000)}:F>\n(<t:${Math.floor(joinedTs / 1000)}:R>)`,
  };
}
