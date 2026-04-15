function normalize(text) {
  return (text || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function bigrams(text) {
  if (!text || text.length < 2) return [];
  const out = [];
  for (let i = 0; i < text.length - 1; i += 1) out.push(text.slice(i, i + 2));
  return out;
}

function diceSimilarity(a, b) {
  const aN = normalize(a);
  const bN = normalize(b);
  if (!aN || !bN) return 0;
  if (aN === bN) return 1;
  const aB = bigrams(aN);
  const bB = bigrams(bN);
  if (aB.length === 0 || bB.length === 0) return 0;

  const map = new Map();
  for (const bi of aB) map.set(bi, (map.get(bi) || 0) + 1);
  let matches = 0;
  for (const bi of bB) {
    const count = map.get(bi) || 0;
    if (count > 0) {
      matches += 1;
      map.set(bi, count - 1);
    }
  }

  return (2 * matches) / (aB.length + bB.length);
}

function confidence(score) {
  if (score >= 70) return 'High';
  if (score >= 55) return 'Medium';
  return 'Low';
}

function formatCandidate(candidate) {
  return `<@${candidate.userId}> (${candidate.tag}) - ${candidate.score}% ${candidate.confidence}`;
}

async function findLikelyMainAccounts(guild, targetMember, options = {}) {
  const minScore = options.minScore || 40;
  const limit = options.limit || 3;

  try {
    if (guild.members.cache.size < guild.memberCount) {
      await guild.members.fetch().catch(() => {});
    }
  } catch {
    // Ignore partial cache fetch issues.
  }

  const targetUser = targetMember.user;
  const targetUsername = targetUser.username;
  const targetDisplay = targetMember.displayName || targetUser.globalName || targetUser.username;
  const targetAvatar = targetUser.avatar || null;
  const now = Date.now();
  const targetAccountAge = now - targetUser.createdTimestamp;
  const targetJoinAge = now - (targetMember.joinedTimestamp || now);

  const candidates = [];
  for (const [, member] of guild.members.cache) {
    if (member.user.bot) continue;
    if (member.id === targetMember.id) continue;

    let score = 0;
    const signals = [];

    const user = member.user;
    const usernameSim = diceSimilarity(targetUsername, user.username);
    const displaySim = diceSimilarity(targetDisplay, member.displayName || user.globalName || user.username);

    if (usernameSim === 1) {
      score += 35;
      signals.push('Exact username match');
    } else if (usernameSim >= 0.55) {
      const delta = Math.round(usernameSim * 25);
      score += delta;
      signals.push(`Username similarity ${Math.round(usernameSim * 100)}%`);
    }

    if (displaySim === 1) {
      score += 25;
      signals.push('Exact display-name match');
    } else if (displaySim >= 0.6) {
      const delta = Math.round(displaySim * 15);
      score += delta;
      signals.push(`Display-name similarity ${Math.round(displaySim * 100)}%`);
    }

    if (targetAvatar && user.avatar && targetAvatar === user.avatar) {
      score += 55;
      signals.push('Matching avatar hash');
    }

    const candidateAccountAge = now - user.createdTimestamp;
    const candidateJoinAge = now - (member.joinedTimestamp || now);
    if (targetAccountAge < 30 * 86400000 && candidateAccountAge > 180 * 86400000) {
      score += 8;
      signals.push('Target is new while candidate is older');
    }
    if (targetJoinAge < 3 * 86400000 && candidateJoinAge > 30 * 86400000) {
      score += 7;
      signals.push('Candidate joined long before target');
    }

    score = Math.max(0, Math.min(100, score));
    if (score < minScore) continue;

    candidates.push({
      userId: member.id,
      tag: user.tag,
      score,
      confidence: confidence(score),
      signals,
    });
  }

  return candidates.sort((a, b) => b.score - a.score).slice(0, limit);
}

module.exports = { findLikelyMainAccounts, formatCandidate };

