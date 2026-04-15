const { crimeEmbed } = require('../../utils/embed');
const { loadData } = require('../../utils/dataStore');
const { getLevel } = require('../../utils/leveling');

module.exports = {
  name: 'leaderboard',
  aliases: ['lb', 'top'],
  description: 'View the XP leaderboard',
  usage: '!leaderboard',
  category: 'utility',
  async execute(message) {
    const data = loadData('levels');
    const guildData = data[message.guild.id] || {};

    const sorted = Object.entries(guildData)
      .map(([id, d]) => ({ id, xp: d.xp, level: getLevel(d.xp) }))
      .sort((a, b) => b.xp - a.xp)
      .slice(0, 10);

    if (!sorted.length)
      return message.reply({ embeds: [crimeEmbed({ description: 'No one has earned XP yet.' })] });

    const medals = ['🥇', '🥈', '🥉'];
    const rows = await Promise.all(sorted.map(async (entry, i) => {
      const user = await message.client.users.fetch(entry.id).catch(() => null);
      const name = user ? user.username : 'Unknown User';
      const prefix = medals[i] || `**${i + 1}.**`;
      return `${prefix} ${name} — Level ${entry.level} (${entry.xp} XP)`;
    }));

    message.reply({ embeds: [crimeEmbed({
      title: '🏆 XP Leaderboard',
      description: rows.join('\n'),
    })] });
  },
};
