const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/embed');
const { loadData, saveData } = require('../../utils/dataStore');

module.exports = {
  name: 'filter',
  description: 'Manage the bad word filter',
  usage: '!filter <add|remove|list> [word]',
  category: 'mod',
  async execute(message, args) {
    if (!message.member.permissions.has('Administrator'))
      return message.reply({ embeds: [errorEmbed('You need **Administrator** permission.')] });

    const sub = args[0]?.toLowerCase();
    const word = args[1]?.toLowerCase();
    const data = loadData('badwords');
    if (!data[message.guild.id]) data[message.guild.id] = [];

    if (sub === 'add') {
      if (!word) return message.reply({ embeds: [errorEmbed('Provide a word to add.')] });
      if (data[message.guild.id].includes(word))
        return message.reply({ embeds: [errorEmbed(`\`${word}\` is already in the filter.`)] });
      data[message.guild.id].push(word);
      saveData('badwords', data);
      return message.reply({ embeds: [successEmbed(`Added \`${word}\` to the filter.`)] });
    }

    if (sub === 'remove') {
      if (!word) return message.reply({ embeds: [errorEmbed('Provide a word to remove.')] });
      data[message.guild.id] = data[message.guild.id].filter(w => w !== word);
      saveData('badwords', data);
      return message.reply({ embeds: [successEmbed(`Removed \`${word}\` from the filter.`)] });
    }

    if (sub === 'list') {
      const list = data[message.guild.id];
      if (!list.length) return message.reply({ embeds: [infoEmbed('The filter list is empty.')] });
      return message.reply({ embeds: [infoEmbed(`\`${list.join('`, `')}\``, '🚫 Filtered Words')] });
    }

    message.reply({ embeds: [errorEmbed('Usage: `!filter <add|remove|list> [word]`')] });
  },
};
