const { successEmbed, errorEmbed, crimeEmbed } = require('../../utils/embed');
const { initMusic } = require('../../utils/musicManager');

function getQueue(client, message) {
  if (!client.distube) {
    try {
      initMusic(client);
      client.musicInitError = null;
    } catch (err) {
      client.musicInitError = err?.message || String(err);
      return null;
    }
  }
  return client.distube.getQueue(message);
}

const skip = {
  name: 'skip',
  aliases: ['s'],
  description: 'Skip the current song',
  usage: '!skip',
  category: 'music',
  async execute(message, args, client) {
    if (!client.distube) return message.reply({ embeds: [errorEmbed(`Music engine unavailable. ${client.musicInitError || ''}`)] });
    const queue = getQueue(client, message);
    if (!queue) return message.reply({ embeds: [errorEmbed('Nothing is playing.')] });

    try {
      await client.distube.skip(message);
      return message.reply({ embeds: [successEmbed('Skipped the current track.')] });
    } catch (err) {
      return message.reply({ embeds: [errorEmbed(err?.message || 'Could not skip this track.')] });
    }
  },
};

const stop = {
  name: 'stop',
  description: 'Stop music and clear the queue',
  usage: '!stop',
  category: 'music',
  async execute(message, args, client) {
    if (!client.distube) return message.reply({ embeds: [errorEmbed(`Music engine unavailable. ${client.musicInitError || ''}`)] });
    const queue = getQueue(client, message);
    if (!queue) return message.reply({ embeds: [errorEmbed('Nothing is playing.')] });

    try {
      await client.distube.stop(message);
      return message.reply({ embeds: [successEmbed('Stopped and cleared the queue.')] });
    } catch (err) {
      return message.reply({ embeds: [errorEmbed(err?.message || 'Could not stop playback.')] });
    }
  },
};

const queue = {
  name: 'queue',
  aliases: ['q'],
  description: 'View the music queue',
  usage: '!queue',
  category: 'music',
  async execute(message, args, client) {
    if (!client.distube) return message.reply({ embeds: [errorEmbed(`Music engine unavailable. ${client.musicInitError || ''}`)] });
    const q = getQueue(client, message);
    if (!q || !q.songs?.length) return message.reply({ embeds: [errorEmbed('Nothing is playing.')] });

    const now = q.songs[0];
    const upcoming = q.songs
      .slice(1, 11)
      .map((song, i) => `**${i + 1}.** ${song.name} - *${song.formattedDuration || 'Unknown'}*`)
      .join('\n');

    return message.reply({
      embeds: [crimeEmbed({
        title: `Queue (${q.songs.length - 1} upcoming)`,
        fields: [
          { name: 'Now Playing', value: `[${now.name}](${now.url})` },
          { name: 'Up Next', value: upcoming || 'No upcoming tracks.' },
        ],
      })],
    });
  },
};

const nowplaying = {
  name: 'nowplaying',
  aliases: ['np'],
  description: 'See what is currently playing',
  usage: '!nowplaying',
  category: 'music',
  async execute(message, args, client) {
    if (!client.distube) return message.reply({ embeds: [errorEmbed(`Music engine unavailable. ${client.musicInitError || ''}`)] });
    const q = getQueue(client, message);
    const song = q?.songs?.[0];
    if (!song) return message.reply({ embeds: [errorEmbed('Nothing is playing right now.')] });

    return message.reply({
      embeds: [crimeEmbed({
        title: 'Now Playing',
        description: `**[${song.name}](${song.url})**`,
        fields: [
          { name: 'Duration', value: song.formattedDuration || 'Unknown', inline: true },
          { name: 'Requested by', value: song.user?.tag || 'Unknown', inline: true },
        ],
        thumbnail: song.thumbnail,
      })],
    });
  },
};

const pause = {
  name: 'pause',
  description: 'Pause the current song',
  usage: '!pause',
  category: 'music',
  async execute(message, args, client) {
    if (!client.distube) return message.reply({ embeds: [errorEmbed(`Music engine unavailable. ${client.musicInitError || ''}`)] });
    const q = getQueue(client, message);
    if (!q) return message.reply({ embeds: [errorEmbed('Nothing is playing.')] });
    if (q.paused) return message.reply({ embeds: [errorEmbed('Already paused.')] });

    try {
      await client.distube.pause(message);
      return message.reply({ embeds: [successEmbed('Paused playback.')] });
    } catch (err) {
      return message.reply({ embeds: [errorEmbed(err?.message || 'Could not pause playback.')] });
    }
  },
};

const resume = {
  name: 'resume',
  description: 'Resume the current song',
  usage: '!resume',
  category: 'music',
  async execute(message, args, client) {
    if (!client.distube) return message.reply({ embeds: [errorEmbed(`Music engine unavailable. ${client.musicInitError || ''}`)] });
    const q = getQueue(client, message);
    if (!q) return message.reply({ embeds: [errorEmbed('Nothing is playing.')] });
    if (!q.paused) return message.reply({ embeds: [errorEmbed('Playback is not paused.')] });

    try {
      await client.distube.resume(message);
      return message.reply({ embeds: [successEmbed('Resumed playback.')] });
    } catch (err) {
      return message.reply({ embeds: [errorEmbed(err?.message || 'Could not resume playback.')] });
    }
  },
};

module.exports = { skip, stop, queue, nowplaying, pause, resume };
