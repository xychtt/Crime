const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  NoSubscriberBehavior,
  entersState,
} = require('@discordjs/voice');
const play = require('play-dl');
const { crimeEmbed, errorEmbed } = require('../../utils/embed');
const LOOKUP_TIMEOUT_MS = 12000;
const STREAM_TIMEOUT_MS = 20000;

module.exports = {
  name: 'play',
  aliases: ['p'],
  description: 'Play a song from YouTube or Spotify links',
  usage: '!play <YouTube/Spotify URL or search query>',
  category: 'music',
  cooldown: 3,
  async execute(message, args, client) {
    if (!args.length) return message.reply({ embeds: [errorEmbed('Please provide a song name or URL.')] });

    const botMember = message.guild.members.me || await message.guild.members.fetchMe().catch(() => null);
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) return message.reply({ embeds: [errorEmbed('You need to be in a voice channel.')] });

    const permissions = botMember ? voiceChannel.permissionsFor(botMember) : null;
    if (!permissions?.has('Connect') || !permissions?.has('Speak')) {
      return message.reply({ embeds: [errorEmbed("I don't have permission to join/speak in your voice channel.")] });
    }

    const query = args.join(' ');
    const statusMsg = await message.reply({ embeds: [crimeEmbed({ description: `Searching for **${query}**...` })] });

    try {
      const track = await resolveTrack(query, message.author.tag);
      if (!track) return statusMsg.edit({ embeds: [errorEmbed('No results found for that query.')] });

      const queue = ensureQueue(client, message.guild.id, message, voiceChannel);
      queue.queue.push(track);

      if (queue.playing) {
        return statusMsg.edit({
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
      }

      queue.playing = true;
      await playNext(queue, message, client, statusMsg);
    } catch (err) {
      console.error('Play command error:', err);
      await statusMsg.edit({
        embeds: [errorEmbed(`Could not start playback. ${err?.message || 'Unknown error'}`)],
      }).catch(() => {});
    }
  },
};

function ensureQueue(client, guildId, message, voiceChannel) {
  if (!client.musicQueues.has(guildId)) {
    client.musicQueues.set(guildId, {
      connection: null,
      player: createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Play } }),
      queue: [],
      playing: false,
      textChannelId: message.channel.id,
    });
  }

  const queue = client.musicQueues.get(guildId);
  queue.textChannelId = message.channel.id;

  const currentChannelId = queue.connection?.joinConfig?.channelId;
  if (queue.connection && currentChannelId && currentChannelId !== voiceChannel.id) {
    queue.connection.destroy();
    queue.connection = null;
  }

  if (!queue.connection) {
    queue.connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: message.guild.id,
      adapterCreator: message.guild.voiceAdapterCreator,
      selfDeaf: true,
    });
  }

  return queue;
}

function isSpotifyUrl(query) {
  return /(?:https?:\/\/)?(?:open\.)?spotify\.com\/(track|album|playlist)\//i.test(query);
}

async function resolveYouTubeSource(query) {
  if (play.yt_validate(query) === 'video') return query;
  const results = await withTimeout(
    play.search(query, { limit: 1, source: { youtube: 'video' } }),
    LOOKUP_TIMEOUT_MS,
    'YouTube search timed out'
  );
  return results?.[0]?.url || null;
}

async function resolveSpotifyTrack(spotifyUrl, requestedBy) {
  let searchText = null;
  try {
    const spType = play.sp_validate(spotifyUrl);
    const sp = await withTimeout(play.spotify(spotifyUrl), LOOKUP_TIMEOUT_MS, 'Spotify lookup timed out');
    if (sp?.fetch) await withTimeout(sp.fetch(), LOOKUP_TIMEOUT_MS, 'Spotify fetch timed out');

    if (spType === 'track') {
      searchText = `${sp?.name || ''} ${sp?.artists?.[0]?.name || ''}`.trim();
    } else if ((spType === 'playlist' || spType === 'album') && sp?.all_tracks) {
      const tracks = await withTimeout(sp.all_tracks(), LOOKUP_TIMEOUT_MS, 'Spotify track list timed out');
      const first = tracks?.[0];
      if (first) searchText = `${first?.name || ''} ${first?.artists?.[0]?.name || ''}`.trim();
    }
  } catch {
    // fallback below
  }

  if (!searchText) {
    try {
      const res = await withTimeout(
        fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(spotifyUrl)}`),
        LOOKUP_TIMEOUT_MS,
        'Spotify oEmbed timed out'
      );
      if (res.ok) {
        const data = await withTimeout(res.json(), 5000, 'Spotify oEmbed parse timed out');
        searchText = `${data?.title || ''} ${data?.author_name || ''}`.trim();
      }
    } catch {
      // ignored
    }
  }

  if (!searchText) return null;
  const yt = await resolveYouTubeSource(`${searchText} official audio`);
  if (!yt) return null;

  let d = null;
  try {
    const info = await withTimeout(play.video_info(yt), LOOKUP_TIMEOUT_MS, 'YouTube metadata timed out');
    d = info.video_details;
  } catch {
    d = null;
  }
  return {
    url: spotifyUrl,
    playbackUrl: yt,
    title: d?.title || searchText,
    duration: d?.durationRaw || 'Unknown',
    thumbnail: d?.thumbnails?.[0]?.url,
    source: 'Spotify -> YouTube',
    requestedBy,
  };
}

async function resolveTrack(query, requestedBy) {
  if (isSpotifyUrl(query)) return resolveSpotifyTrack(query, requestedBy);

  const yt = await resolveYouTubeSource(query);
  if (!yt) return null;

  let d = null;
  try {
    const info = await withTimeout(play.video_info(yt), LOOKUP_TIMEOUT_MS, 'YouTube metadata timed out');
    d = info.video_details;
  } catch {
    d = null;
  }
  return {
    url: yt,
    playbackUrl: yt,
    title: d?.title || guessTitleFromQuery(query),
    duration: d?.durationRaw || 'Unknown',
    thumbnail: d?.thumbnails?.[0]?.url,
    source: 'YouTube',
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
    queue.connection.subscribe(queue.player);
  } catch (err) {
    queue.connection?.destroy();
    queue.playing = false;
    client.musicQueues.delete(guildId);
    await message.channel.send({ embeds: [errorEmbed(`Voice join failed: ${err?.message || 'timeout'}`)] }).catch(() => {});
    return;
  }

  try {
    const me = message.guild.members.me;
    if (me?.voice?.channel?.isStageChannel?.() && me.voice.suppress) {
      await me.voice.setSuppressed(false).catch(() => {});
      await me.voice.setRequestToSpeak(true).catch(() => {});
    }

    const stream = await withTimeout(
      play.stream(track.playbackUrl || track.url, { discordPlayerCompatibility: true }),
      STREAM_TIMEOUT_MS,
      'Audio stream timed out'
    );
    const resource = createAudioResource(stream.stream, { inputType: stream.type });
    queue.player.play(resource);
    await entersState(queue.player, AudioPlayerStatus.Playing, 15_000);

    const embed = crimeEmbed({
      title: 'Now Playing',
      description: `**[${track.title}](${track.url})**`,
      thumbnail: track.thumbnail,
      fields: [
        { name: 'Duration', value: track.duration, inline: true },
        { name: 'Source', value: track.source || 'YouTube', inline: true },
        { name: 'Requested by', value: track.requestedBy, inline: true },
      ],
    });

    if (statusMsg) await statusMsg.edit({ embeds: [embed] }).catch(() => {});
    else await message.channel.send({ embeds: [embed] }).catch(() => {});

    queue.player.once(AudioPlayerStatus.Idle, () => {
      playNext(queue, message, client).catch(e => console.error('Idle next error:', e));
    });
    queue.player.once('error', (err) => {
      message.channel.send({ embeds: [errorEmbed(`Player error: ${err?.message || 'unknown'}`)] }).catch(() => {});
      playNext(queue, message, client).catch(e => console.error('Recover next error:', e));
    });
  } catch (err) {
    await message.channel.send({
      embeds: [errorEmbed(`Failed to play **${track.title}**. ${err?.message || 'Unknown error'} Skipping...`)],
    }).catch(() => {});
    await playNext(queue, message, client);
  }
}

module.exports.playNext = playNext;

function withTimeout(promise, ms, message = 'Operation timed out') {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

function guessTitleFromQuery(query) {
  if (typeof query !== 'string') return 'Unknown title';
  return query.length > 90 ? `${query.slice(0, 87)}...` : query;
}
