const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
} = require('@discordjs/voice');
const play = require('play-dl');
const { crimeEmbed, errorEmbed } = require('../../utils/embed');

module.exports = {
  name: 'play',
  aliases: ['p'],
  description: 'Play a song from YouTube',
  usage: '!play <song name or URL>',
  category: 'music',
  cooldown: 3,
  async execute(message, args, client) {
    if (!args.length) {
      return message.reply({ embeds: [errorEmbed('Please provide a song name or URL.')] });
    }

    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) {
      return message.reply({ embeds: [errorEmbed('You need to be in a voice channel.')] });
    }

    const permissions = voiceChannel.permissionsFor(message.guild.members.me);
    if (!permissions?.has('Connect') || !permissions?.has('Speak')) {
      return message.reply({ embeds: [errorEmbed("I don't have permission to join/speak in your voice channel.")] });
    }

    const query = args.join(' ');
    const statusMsg = await message.reply({
      embeds: [crimeEmbed({ description: `Searching for **${query}**...` })],
    });

    try {
      const track = await resolveTrack(query, message.author.tag);
      if (!track) {
        await statusMsg.edit({ embeds: [errorEmbed('No results found for that query.')] });
        return;
      }

      const guildId = message.guild.id;
      const queue = ensureQueue(client, guildId, message, voiceChannel);
      queue.queue.push(track);

      if (queue.playing) {
        await statusMsg.edit({
          embeds: [crimeEmbed({
            title: 'Added to Queue',
            description: `**[${track.title}](${track.url})**`,
            thumbnail: track.thumbnail,
            fields: [
              { name: 'Duration', value: track.duration, inline: true },
              { name: 'Position', value: `#${queue.queue.length}`, inline: true },
            ],
          })],
        });
        return;
      }

      queue.playing = true;
      await playNext(queue, message, client, statusMsg);
    } catch (err) {
      console.error('Play command error:', err);
      await statusMsg.edit({
        embeds: [errorEmbed('Could not start playback. Try another song or URL.')],
      }).catch(() => {});
    }
  },
};

function ensureQueue(client, guildId, message, voiceChannel) {
  if (!client.musicQueues.has(guildId)) {
    client.musicQueues.set(guildId, {
      connection: null,
      player: createAudioPlayer(),
      queue: [],
      playing: false,
      textChannelId: message.channel.id,
      initialized: false,
    });
  }

  const queue = client.musicQueues.get(guildId);
  queue.textChannelId = message.channel.id;

  if (!queue.connection) {
    queue.connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: message.guild.id,
      adapterCreator: message.guild.voiceAdapterCreator,
      selfDeaf: true,
    });
  }

  if (!queue.initialized) {
    queue.connection.subscribe(queue.player);
    queue.initialized = true;
  }

  return queue;
}

async function resolveTrack(query, requestedBy) {
  let source;
  if (play.yt_validate(query) === 'video') {
    source = query;
  } else {
    const results = await play.search(query, { limit: 1, source: { youtube: 'video' } });
    if (!results?.length) return null;
    source = results[0].url;
  }

  const info = await play.video_info(source);
  const details = info.video_details;
  return {
    url: source,
    title: details?.title || 'Unknown title',
    duration: details?.durationRaw || 'Unknown',
    thumbnail: details?.thumbnails?.[0]?.url,
    requestedBy,
  };
}

async function playNext(queue, message, client, statusMsg = null) {
  const guildId = message.guild.id;
  if (!queue.queue.length) {
    queue.playing = false;
    queue.connection?.destroy();
    client.musicQueues.delete(guildId);
    return;
  }

  const track = queue.queue.shift();

  try {
    await entersState(queue.connection, VoiceConnectionStatus.Ready, 20_000);
  } catch {
    queue.connection?.destroy();
    queue.playing = false;
    client.musicQueues.delete(guildId);
    await message.channel.send({ embeds: [errorEmbed('Voice connection timed out. Try `!play` again.')] }).catch(() => {});
    return;
  }

  try {
    const stream = await play.stream(track.url, { discordPlayerCompatibility: true });
    const resource = createAudioResource(stream.stream, { inputType: stream.type });
    queue.player.play(resource);

    const nowPlaying = crimeEmbed({
      title: 'Now Playing',
      description: `**[${track.title}](${track.url})**`,
      thumbnail: track.thumbnail,
      fields: [
        { name: 'Duration', value: track.duration, inline: true },
        { name: 'Requested by', value: track.requestedBy, inline: true },
      ],
    });

    if (statusMsg) await statusMsg.edit({ embeds: [nowPlaying] }).catch(() => {});
    else await message.channel.send({ embeds: [nowPlaying] }).catch(() => {});

    queue.player.once(AudioPlayerStatus.Idle, () => {
      playNext(queue, message, client).catch(err => console.error('playNext idle error:', err));
    });
    queue.player.once('error', (err) => {
      console.error('Player error:', err);
      playNext(queue, message, client).catch(nextErr => console.error('playNext recover error:', nextErr));
    });
  } catch (err) {
    console.error('Track playback error:', err);
    await message.channel.send({
      embeds: [errorEmbed(`Failed to play **${track.title}**. Skipping...`)],
    }).catch(() => {});
    await playNext(queue, message, client);
  }
}

module.exports.playNext = playNext;

