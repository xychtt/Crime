const { crimeEmbed, errorEmbed } = require('../../utils/embed');

module.exports = {
  name: 'play',
  aliases: ['p'],
  description: 'Play from YouTube/Spotify URL or search query',
  usage: '!play <YouTube/Spotify URL or search query>',
  category: 'music',
  cooldown: 2,
  async execute(message, args, client) {
    if (!args.length) {
      return message.reply({ embeds: [errorEmbed('Please provide a song name or URL.')] });
    }

    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) {
      return message.reply({ embeds: [errorEmbed('You need to be in a voice channel.')] });
    }

    const botMember = message.guild.members.me || await message.guild.members.fetchMe().catch(() => null);
    const permissions = botMember ? voiceChannel.permissionsFor(botMember) : null;
    if (!permissions?.has('Connect') || !permissions?.has('Speak')) {
      return message.reply({ embeds: [errorEmbed("I don't have permission to join/speak in your voice channel.")] });
    }

    const query = args.join(' ');
    const searching = await message.reply({
      embeds: [crimeEmbed({ description: `Searching for **${query}**...` })],
    });

    try {
      await client.distube.play(voiceChannel, query, {
        textChannel: message.channel,
        member: message.member,
      });

      await searching.delete().catch(() => {});
    } catch (err) {
      console.error('DisTube play error:', err);
      await searching.edit({
        embeds: [errorEmbed(`Could not play that track. ${err?.message || 'Unknown error'}`)],
      }).catch(() => {});
    }
  },
};

