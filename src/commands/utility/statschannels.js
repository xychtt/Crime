const { successEmbed, errorEmbed } = require('../../utils/embed');

module.exports = {
  name: 'statschannels',
  description: 'Create server stat voice channels (member count, bot count)',
  usage: '!statschannels',
  category: 'utility',
  cooldown: 30,
  async execute(message) {
    if (!message.member.permissions.has('Administrator'))
      return message.reply({ embeds: [errorEmbed('You need **Administrator** permission.')] });

    const guild = message.guild;

    // Create a category
    const category = await guild.channels.create({
      name: '📊 Server Stats',
      type: 4, // CategoryChannel
      permissionOverwrites: [
        { id: guild.id, deny: ['Connect'] }, // Nobody can join voice channels
      ],
    });

    const memberChannel = await guild.channels.create({
      name: `👥 Members: ${guild.memberCount}`,
      type: 2, // VoiceChannel
      parent: category.id,
      permissionOverwrites: [{ id: guild.id, deny: ['Connect'] }],
    });

    const bots = guild.members.cache.filter(m => m.user.bot).size;
    const botChannel = await guild.channels.create({
      name: `🤖 Bots: ${bots}`,
      type: 2,
      parent: category.id,
      permissionOverwrites: [{ id: guild.id, deny: ['Connect'] }],
    });

    // Update every 10 minutes
    setInterval(async () => {
      await guild.members.fetch();
      const total = guild.memberCount;
      const botCount = guild.members.cache.filter(m => m.user.bot).size;
      memberChannel.setName(`👥 Members: ${total}`).catch(() => {});
      botChannel.setName(`🤖 Bots: ${botCount}`).catch(() => {});
    }, 10 * 60 * 1000);

    message.reply({ embeds: [successEmbed('Stats channels created! They update every 10 minutes.')] });
  },
};
