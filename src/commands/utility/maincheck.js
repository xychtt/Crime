const { infoEmbed, errorEmbed } = require('../../utils/embed');
const { findLikelyMainAccounts, formatCandidate } = require('../../utils/accountLinker');

module.exports = {
  name: 'maincheck',
  aliases: ['findmain', 'altcheck'],
  description: 'Find likely main account matches for a user',
  usage: '!maincheck [@user|userId]',
  category: 'utility',
  async execute(message, args) {
    if (!message.member.permissions.has('ModerateMembers')) {
      return message.reply({ embeds: [errorEmbed('You need **Moderate Members** permission.')] });
    }

    const target = await resolveMember(message, args);
    if (!target) {
      return message.reply({ embeds: [errorEmbed('Please mention a valid server member or provide a valid user ID.')] });
    }

    const matches = await findLikelyMainAccounts(message.guild, target, { limit: 5, minScore: 40 });
    if (!matches.length) {
      return message.reply({
        embeds: [infoEmbed(`No strong main-account matches found for **${target.user.tag}**.`, 'Main Account Check')],
      });
    }

    const lines = matches.map(m => `- ${formatCandidate(m)}\n  Signals: ${m.signals.join(', ') || 'Heuristic match'}`);
    return message.reply({
      embeds: [infoEmbed(lines.join('\n'), `Main Account Check: ${target.user.tag}`)],
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

