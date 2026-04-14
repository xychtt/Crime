const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/embed');
const { loadData, saveData } = require('../../utils/dataStore');

module.exports = {
  name: 'automod',
  description: 'Configure automod settings',
  usage: '!automod <on|off|status|links <on|off>|spam <on|off>>',
  category: 'mod',
  async execute(message, args) {
    if (!message.member.permissions.has('Administrator'))
      return message.reply({ embeds: [errorEmbed('You need **Administrator** permission.')] });

    const settings = loadData('automod');
    if (!settings[message.guild.id]) settings[message.guild.id] = { enabled: false, blockLinks: false, antiSpam: false };
    const gs = settings[message.guild.id];

    const sub = args[0]?.toLowerCase();

    if (!sub || sub === 'status') {
      return message.reply({ embeds: [infoEmbed(
        `**Automod:** ${gs.enabled ? '✅ On' : '❌ Off'}\n**Link filter:** ${gs.blockLinks ? '✅ On' : '❌ Off'}\n**Anti-spam:** ${gs.antiSpam ? '✅ On' : '❌ Off'}`,
        '⚙️ Automod Status'
      )] });
    }

    if (sub === 'on') { gs.enabled = true; saveData('automod', settings); return message.reply({ embeds: [successEmbed('Automod **enabled**.')] }); }
    if (sub === 'off') { gs.enabled = false; saveData('automod', settings); return message.reply({ embeds: [successEmbed('Automod **disabled**.')] }); }

    if (sub === 'links') {
      const val = args[1]?.toLowerCase();
      if (val === 'on') gs.blockLinks = true;
      else if (val === 'off') gs.blockLinks = false;
      else return message.reply({ embeds: [errorEmbed('Usage: `!automod links <on|off>`')] });
      saveData('automod', settings);
      return message.reply({ embeds: [successEmbed(`Link filter **${gs.blockLinks ? 'enabled' : 'disabled'}**.`)] });
    }

    if (sub === 'spam') {
      const val = args[1]?.toLowerCase();
      if (val === 'on') gs.antiSpam = true;
      else if (val === 'off') gs.antiSpam = false;
      else return message.reply({ embeds: [errorEmbed('Usage: `!automod spam <on|off>`')] });
      saveData('automod', settings);
      return message.reply({ embeds: [successEmbed(`Anti-spam **${gs.antiSpam ? 'enabled' : 'disabled'}**.`)] });
    }

    message.reply({ embeds: [errorEmbed('Usage: `!automod <on|off|status|links <on|off>|spam <on|off>>`')] });
  },
};
