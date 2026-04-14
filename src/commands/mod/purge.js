const { successEmbed, errorEmbed } = require('../../utils/embed');

module.exports = {
  name: 'purge',
  description: 'Delete a number of messages',
  usage: '!purge [amount]',
  category: 'mod',
  async execute(message, args) {
    if (!message.member.permissions.has('ManageMessages'))
      return message.reply({ embeds: [errorEmbed('You need **Manage Messages** permission.')] });

    const amount = parseInt(args[0]);
    if (isNaN(amount) || amount < 1 || amount > 100)
      return message.reply({ embeds: [errorEmbed('Please provide a number between 1 and 100.')] });

    await message.delete().catch(() => {});
    const deleted = await message.channel.bulkDelete(amount, true).catch(() => null);

    if (!deleted) return message.channel.send({ embeds: [errorEmbed('Could not delete messages (they may be too old).')] });

    const confirm = await message.channel.send({ embeds: [successEmbed(`Deleted **${deleted.size}** messages.`)] });
    setTimeout(() => confirm.delete().catch(() => {}), 4000);
  },
};
