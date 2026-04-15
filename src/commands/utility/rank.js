const { crimeEmbed, errorEmbed } = require('../../utils/embed');
const { loadData } = require('../../utils/dataStore');
const { getLevel, xpForNextLevel } = require('../../utils/leveling');

module.exports = {
  name: 'rank',
  description: 'Check your rank or another user\'s rank',
  usage: '!rank [@user]',
  category: 'utility',
  async execute(message, args) {
    const target = message.mentions.users.first() || message.author;
    const data = loadData('levels');
    const userData = data[message.guild.id]?.[target.id] || { xp: 0, level: 0 };

    const level = getLevel(userData.xp);
    const nextXP = xpForNextLevel(level);
    const progress = Math.min(Math.floor((userData.xp / nextXP) * 20), 20);
    const bar = '█'.repeat(progress) + '░'.repeat(20 - progress);

    message.reply({ embeds: [crimeEmbed({
      title: `📊 ${target.username}'s Rank`,
      thumbnail: target.displayAvatarURL({ dynamic: true }),
      fields: [
        { name: 'Level', value: `${level}`, inline: true },
        { name: 'XP', value: `${userData.xp} / ${nextXP}`, inline: true },
        { name: 'Progress', value: `\`${bar}\`` },
      ],
    })] });
  },
};
