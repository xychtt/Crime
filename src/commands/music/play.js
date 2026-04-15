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

module.exports = {
  name: 'play',
  aliases: ['p'],
  description: 'Play a song from YouTube or Spotify links',
  usage: '!play <YouTube/Spotify URL or search query>',
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
      player: createAudioPlayer({
        behaviors: { noSubscriber: NoSubscriberBehavior.Play },
      }),
      queue: [],
      playing: false,
      textChannelId: message.channel.id,
      initialized: false,
    });
  }

  const queue = client.musicQueues.get(guildId);
  queue.textChannelId = message.channel.id;

  const currentChannelId = queue.connection?.joinConfig?.channelId;
  if (queue.connection && currentChannelId && currentChannelId !== voiceChannel.id) {
    queue.connection.destroy();
    queue.connection = null;
    queue.initialized = false;
  }

  if (!queue.connection) {
    queue.connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: message.guild.id,
      adapterCreator: message.guild.voiceAdapterCreator,
      selfDeaf: true,
    });
  }

  if (!queue.initialized) {
    const sub = queue.connection.subscribe(queue.player);
    if (!sub) {
      throw new Error('Failed to subscribe audio player to voice connection.');
    }
    queue.initialized = true;
  }

  return queue;
}

async function resolveTrack(query, requestedBy) {
  // Spotify links are resolved to an equivalent YouTube audio source.
  if (isSpotifyUrl(query)) {
    return resolveSpotifyTrack(query, requestedBy);
  }

  const ytSource = await resolveYouTubeSource(query);
  if (!ytSource) return null;

  const info = await play.video_info(ytSource);
  const details = info.video_details;
  return {
    url: ytSource,
    playbackUrl: ytSource,
    title: details?.title || 'Unknown title',
    duration: details?.durationRaw || 'Unknown',
    thumbnail: details?.thumbnails?.[0]?.url,
    source: 'YouTube',
    requestedBy,
  };
}

function isSpotifyUrl(query) {
  return /(?:https?:\/\/)?(?:open\.)?spotify\.com\/(track|album|playlist)\//i.test(query);
}

async function resolveYouTubeSource(query) {
  if (play.yt_validate(query) === 'video') return query;
  const results = await play.search(query, { limit: 1, source: { youtube: 'video' } });
  if (!results?.length) return null;
  return results[0].url;
}

async function resolveSpotifyTrack(spotifyUrl, requestedBy) {
  let searchText = null;

  // Try play-dl Spotify metadata first.
  try {
    const spType = play.sp_validate(spotifyUrl);
    const sp = await play.spotify(spotifyUrl);
    if (sp?.fetch) await sp.fetch();

    if (spType === 'track') {
      const artist = sp?.artists?.[0]?.name || '';
      searchText = `${sp.name || ''} ${artist}`.trim();
    } else if ((spType === 'playlist' || spType === 'album') && sp?.all_tracks) {
      const tracks = await sp.all_tracks();
      const first = tracks?.[0];
      if (first) {
        const artist = first?.artists?.[0]?.name || '';
        searchText = `${first.name || ''} ${artist}`.trim();
      }
    }
  } catch {
    // Fall through to oEmbed fallback
  }

  // Fallback: Spotify oEmbed (no auth), useful if play-dl Spotify metadata fails.
  if (!searchText) {
    try {
      const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(spotifyUrl)}`;
      const res = await fetch(oembedUrl);
      if (res.ok) {
        const data = await res.json();
        searchText = `${data?.title || ''} ${data?.author_name || ''}`.trim();
      }
    } catch {
      // ignored
    }
  }

  if (!searchText) return null;

  const ytSource = await resolveYouTubeSource(`${searchText} official audio`);
  if (!ytSource) return null;

  const info = await play.video_info(ytSource);
  const details = info.video_details;

  return {
    url: spotifyUrl,
    playbackUrl: ytSource,
    title: details?.title || searchText,
    duration: details?.durationRaw || 'Unknown',
    thumbnail: details?.thumbnails?.[0]?.url,
    source: 'Spotify -> YouTube',
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
    // Stage channels can keep bots suppressed, causing "playing" but no audible output.
    const me = message.guild.members.me;
    if (me?.voice?.channel?.isStageChannel?.() && me.voice.suppress) {
      await me.voice.setSuppressed(false).catch(() => {});
      await me.voice.setRequestToSpeak(true).catch(() => {});
    }

    const streamUrl = track.playbackUrl || track.url;
    const stream = await play.stream(streamUrl, { discordPlayerCompatibility: true });
    const resource = createAudioResource(stream.stream, { inputType: stream.type });
    queue.player.play(resource);
    await entersState(queue.player, AudioPlayerStatus.Playing, 15_000);

    // Re-subscribe defensively in case connection changed states.
    queue.connection.subscribe(queue.player);

    const nowPlaying = crimeEmbed({
      title: 'Now Playing',
      description: `**[${track.title}](${track.url})**`,
      thumbnail: track.thumbnail,
      fields: [
        { name: 'Duration', value: track.duration, inline: true },
        { name: 'Source', value: track.source || 'YouTube', inline: true },
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
      message.channel.send({
        embeds: [errorEmbed(`Player error on **${track.title}**: ${err?.message || 'Unknown error'}`)],
      }).catch(() => {});
      playNext(queue, message, client).catch(nextErr => console.error('playNext recover error:', nextErr));
    });
  } catch (err) {
    console.error('Track playback error:', err);
    await message.channel.send({
      embeds: [errorEmbed(`Failed to play **${track.title}**. ${err?.message || 'Unknown error'} Skipping...`)],
    }).catch(() => {});
    await playNext(queue, message, client);
  }
}

module.exports.playNext = playNext;
