const { randomUUID } = require('crypto');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { warnEmbed } = require('./embed');
const { isPermanentlyBanned } = require('./banRegistry');
const { isAllowlisted, createPendingReview } = require('./securityReviewStore');
const { findLikelyMainAccounts, formatCandidate } = require('./accountLinker');

async function handleJoinSecurity(member) {
  if (isPermanentlyBanned(member.guild.id, member.id)) {
    await member.ban({ reason: 'Permanent ban policy: once banned, always banned.' }).catch(() => {});
    await postSecurityNotice(
      member.guild,
      `Re-banned ${member.user.tag} (${member.id}) due to permanent ban policy.`
    );
    return true;
  }

  if (isAllowlisted(member.guild.id, member.id)) return false;

  const altDecision = await evaluateAltRisk(member);
  if (altDecision.flagged) {
    const queued = await sendSecurityReview(member, altDecision.reason, altDecision.recommendedAction);
    if (!queued) {
      await applyAction(member, altDecision.recommendedAction, altDecision.reason);
      await postSecurityNotice(member.guild, `No mod-log review channel found. Auto-${altDecision.recommendedAction} for ${member.user.tag} (${member.id}).`);
    }
    return true;
  }

  const vpnDecision = await evaluateVpnRisk(member);
  if (vpnDecision.flagged) {
    const queued = await sendSecurityReview(member, vpnDecision.reason, 'kick');
    if (!queued) {
      await applyAction(member, 'kick', vpnDecision.reason);
      await postSecurityNotice(member.guild, `No mod-log review channel found. Auto-kick for ${member.user.tag} (${member.id}).`);
    }
    return true;
  }

  return false;
}

async function evaluateAltRisk(member) {
  const minAgeDays = parseInt(process.env.ALT_MIN_ACCOUNT_AGE_DAYS || '7', 10);
  if (!Number.isFinite(minAgeDays) || minAgeDays <= 0) {
    return { flagged: false };
  }

  const accountAgeMs = Date.now() - member.user.createdTimestamp;
  const minAgeMs = minAgeDays * 24 * 60 * 60 * 1000;
  if (accountAgeMs >= minAgeMs) return { flagged: false };

  const ageDays = (accountAgeMs / (24 * 60 * 60 * 1000)).toFixed(2);
  const action = (process.env.ALT_MIN_ACCOUNT_AGE_ACTION || 'kick').toLowerCase() === 'ban' ? 'ban' : 'kick';
  return {
    flagged: true,
    recommendedAction: action,
    reason: `New account risk: account age ${ageDays}d, minimum required is ${minAgeDays}d.`,
  };
}

async function evaluateVpnRisk(member) {
  const vpnApi = process.env.VPN_CHECK_API_URL;
  if (!vpnApi) return { flagged: false };

  try {
    const url = new URL(vpnApi);
    url.searchParams.set('userId', member.id);
    url.searchParams.set('guildId', member.guild.id);

    const headers = {};
    if (process.env.VPN_CHECK_API_KEY) {
      headers.Authorization = `Bearer ${process.env.VPN_CHECK_API_KEY}`;
    }

    const res = await fetch(url, { headers });
    if (!res.ok) return { flagged: false };

    const data = await res.json().catch(() => ({}));
    if (data?.vpn === true || data?.proxy === true || data?.blocked === true) {
      return {
        flagged: true,
        reason: `VPN/proxy risk flagged by external verifier.${data?.reason ? ` ${data.reason}` : ''}`,
      };
    }
  } catch {
    return { flagged: false };
  }

  return { flagged: false };
}

async function sendSecurityReview(member, reason, recommendedAction = 'kick') {
  const channelName = process.env.MOD_LOG_CHANNEL || 'mod-logs';
  const channel = member.guild.channels.cache.find(c => c.name === channelName && c.isTextBased());
  if (!channel) return false;

  const reviewId = randomUUID().slice(0, 12);
  const likelyMains = await findLikelyMainAccounts(member.guild, member, { limit: 3, minScore: 45 });
  const likelyMainsText = likelyMains.length
    ? likelyMains.map(c => `- ${formatCandidate(c)}`).join('\n')
    : 'No strong match found.';

  createPendingReview(reviewId, {
    guildId: member.guild.id,
    userId: member.id,
    username: member.user.tag,
    reason,
    recommendedAction,
    likelyMains,
  });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`sec_allow:${reviewId}`)
      .setLabel('Allow')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`sec_decline:${reviewId}`)
      .setLabel('Decline')
      .setStyle(ButtonStyle.Danger),
  );

  await channel.send({
    embeds: [warnEmbed(
      `Do you want to allow this account?\n\nUser: ${member.user.tag} (${member.id})\nReason: ${reason}\nLikely main matches:\n${likelyMainsText}\nRecommended action on decline: ${recommendedAction.toUpperCase()}`,
      'Security Warning'
    )],
    components: [row],
  }).catch(() => {});
  return true;
}

async function applyAction(member, action, reason) {
  if (action === 'ban') {
    await member.ban({ reason: `Security policy: ${reason}` }).catch(() => {});
    return;
  }
  await member.kick(`Security policy: ${reason}`).catch(() => {});
}

async function postSecurityNotice(guild, description) {
  const channelName = process.env.MOD_LOG_CHANNEL || 'mod-logs';
  const channel = guild.channels.cache.find(c => c.name === channelName && c.isTextBased());
  if (!channel) return;
  await channel.send({ embeds: [warnEmbed(description, 'Security Enforcement')] }).catch(() => {});
}

module.exports = { handleJoinSecurity };
