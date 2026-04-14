const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus } = require('@discordjs/voice');
const play = require('play-dl');
const { crimeEmbed, errorEmbed, successEmbed } = require('../../utils/embed');

module.exports = {
  name: 'play',
  aliases: ['p'],
  description: 'Play a song from YouTube',
  usage: '!play <song name or URL>',
  category: 'music',
  cooldown: 3,
  async execute(message, args, client) {
    if (!args.length)
      return message.reply({ embeds: [errorEmbed('Please provide a song name or URL.')] });

    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel)
      return message.reply({ embeds: [errorEmbed('You need to be in a voice channel.')] });

    const permissions = voiceChannel.permissionsFor(message.guild.members.me);
    if (!permissions.has('Connect') || !permissions.has('Speak'))
      return message.reply({ embeds: [errorEmbed("I don't have permission to join your voice channel.")] });

    const query = args.join(' ');
    const statusMsg = await message.reply({ embeds: [crimeEmbed({ description: `🔍 Searching for **${query}**...` })] });

    try {
      let source;
      if (play.yt_validate(query) === 'video') {
        source = query;
      } else {
        const results = await play.search(query, { limit: 1 });
        if (!results.length) return statusMsg.edit({ embeds: [errorEmbed('No results found.')] });
        source = results[0].url;
      }

      const info = await play.video_info(source);
      const videoDetails = info.video_details;

      const guildId = message.guild.id;
      if (!client.musicQueues.has(guildId)) {
        client.musicQueues.set(guildId, { connection: null, player: null, queue: [], playing: false });
      }
      const queue = client.musicQueues.get(guildId);

      queue.queue.push({
        url: source,
        title: videoDetails.title,
        duration: videoDetails.durationRaw,
        thumbnail: videoDetails.thumbnails?.[0]?.url,
        requestedBy: message.author.tag,
      });

      if (queue.playing) {
        statusMsg.edit({ embeds: [crimeEmbed({
          title: '➕ Added to Queue',
          description: `**[${videoDetails.title}](${source})**`,
          thumbnail: videoDetails.thumbnails?.[0]?.url,
          fields: [
            { name: 'Duration', value: videoDetails.durationRaw, inline: true },
            { name: 'Position', value: `#${queue.queue.length}`, inline: true },
          ],
        })] });
        return;
      }

      // Connect and start playing
      queue.connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator,
      });

      queue.player = createAudioPlayer();
      queue.connection.subscribe(queue.player);
      queue.playing = true;

      await playNext(queue, message, client, statusMsg);

    } catch (err) {
      console.error(err);
      statusMsg.edit({ embeds: [errorEmbed('Something went wrong playing that track.')] });
    }
  },
};

async function playNext(queue, message, client, statusMsg = null) {
  if (!queue.queue.length) {
    queue.playing = false;
    queue.connection?.destroy();
    client.musicQueues.delete(message.guild.id);
    return;
  }

  const track = queue.queue.shift();

  try {
    const stream = await play.stream(track.url);
    const resource = createAudioResource(stream.stream, { inputType: stream.type });

    queue.player.play(resource);

    const embed = crimeEmbed({
      title: '🎵 Now Playing',
      description: `**[${track.title}](${track.url})**`,
      thumbnail: track.thumbnail,
      fields: [
        { name: 'Duration', value: track.duration, inline: true },
        { name: 'Requested by', value: track.requestedBy, inline: true },
      ],
    });

    if (statusMsg) statusMsg.edit({ embeds: [embed] });
    else message.channel.send({ embeds: [embed] });

    queue.player.once(AudioPlayerStatus.Idle, () => {
      playNext(queue, message, client);
    });

    queue.player.on('error', (err) => {
      console.error('Player error:', err);
      playNext(queue, message, client);
    });

  } catch (err) {
    console.error(err);
    message.channel.send({ embeds: [errorEmbed(`Failed to play **${track.title}**. Skipping...`)] });
    playNext(queue, message, client);
  }
}

module.exports.playNext = playNext;
