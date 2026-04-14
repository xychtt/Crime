const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/embed');
const { loadData, saveData } = require('../../utils/dataStore');

// !warn
const warn = {
  name: 'warn',
  description: 'Warn a member',
  usage: '!warn @user [reason]',
  category: 'mod',
  async execute(message, args) {
    if (!message.member.permissions.has('ModerateMembers'))
      return message.reply({ embeds: [errorEmbed('You need **Moderate Members** permission.')] });

    const target = message.mentions.members.first();
    if (!target) return message.reply({ embeds: [errorEmbed('Please mention a user to warn.')] });

    const reason = args.slice(1).join(' ') || 'No reason provided';
    const warnings = loadData('warnings');
    if (!warnings[message.guild.id]) warnings[message.guild.id] = {};
    if (!warnings[message.guild.id][target.id]) warnings[message.guild.id][target.id] = [];

    warnings[message.guild.id][target.id].push({
      reason,
      moderator: message.author.tag,
      date: new Date().toISOString(),
    });
    saveData('warnings', warnings);

    const count = warnings[message.guild.id][target.id].length;
    message.reply({ embeds: [successEmbed(`**${target.user.tag}** has been warned. (${count} total)\n**Reason:** ${reason}`)] });

    // DM the user
    target.user.send(`You were warned in **${message.guild.name}**.\n**Reason:** ${reason}`).catch(() => {});
  },
};

// !warnings
const warnings = {
  name: 'warnings',
  description: 'View warnings for a user',
  usage: '!warnings @user',
  category: 'mod',
  async execute(message, args) {
    if (!message.member.permissions.has('ModerateMembers'))
      return message.reply({ embeds: [errorEmbed('You need **Moderate Members** permission.')] });

    const target = message.mentions.users.first();
    if (!target) return message.reply({ embeds: [errorEmbed('Please mention a user.')] });

    const data = loadData('warnings');
    const userWarns = data[message.guild.id]?.[target.id] || [];

    if (userWarns.length === 0)
      return message.reply({ embeds: [infoEmbed(`**${target.tag}** has no warnings.`)] });

    const list = userWarns.map((w, i) =>
      `**${i + 1}.** ${w.reason} — *${w.moderator}* on ${new Date(w.date).toLocaleDateString()}`
    ).join('\n');

    message.reply({ embeds: [infoEmbed(list, `⚠️ Warnings for ${target.tag} (${userWarns.length})`)] });
  },
};

// !clearwarns
const clearwarns = {
  name: 'clearwarns',
  description: 'Clear all warnings for a user',
  usage: '!clearwarns @user',
  category: 'mod',
  async execute(message, args) {
    if (!message.member.permissions.has('Administrator'))
      return message.reply({ embeds: [errorEmbed('You need **Administrator** permission.')] });

    const target = message.mentions.users.first();
    if (!target) return message.reply({ embeds: [errorEmbed('Please mention a user.')] });

    const data = loadData('warnings');
    if (data[message.guild.id]) delete data[message.guild.id][target.id];
    saveData('warnings', data);

    message.reply({ embeds: [successEmbed(`Cleared all warnings for **${target.tag}**.`)] });
  },
};

module.exports = { warn, warnings, clearwarns };
