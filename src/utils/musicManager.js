const { DisTube } = require('distube');
const { SpotifyPlugin } = require('@distube/spotify');
const { YouTubePlugin } = require('@distube/youtube');
const ffmpegPath = require('ffmpeg-static');
const { crimeEmbed, errorEmbed } = require('./embed');

function initMusic(client) {
  if (client.distube) return client.distube;
  if (ffmpegPath) process.env.FFMPEG_PATH = ffmpegPath;

  client.distube = new DisTube(client, {
    emitNewSongOnly: true,
    emitAddSongWhenCreatingQueue: false,
    emitAddListWhenCreatingQueue: false,
    plugins: [
      new YouTubePlugin(),
      new SpotifyPlugin(),
    ],
    ffmpeg: {
      path: ffmpegPath || undefined,
    },
  });

  client.distube
    .on('playSong', (queue, song) => {
      queue.textChannel?.send({
        embeds: [crimeEmbed({
          title: 'Now Playing',
          description: `**[${song.name}](${song.url})**`,
          fields: [
            { name: 'Duration', value: song.formattedDuration || 'Unknown', inline: true },
            { name: 'Requested by', value: song.user?.tag || 'Unknown', inline: true },
          ],
          thumbnail: song.thumbnail,
        })],
      }).catch(() => {});
    })
    .on('addSong', (queue, song) => {
      queue.textChannel?.send({
        embeds: [crimeEmbed({
          title: 'Added to Queue',
          description: `**[${song.name}](${song.url})**`,
          fields: [
            { name: 'Duration', value: song.formattedDuration || 'Unknown', inline: true },
            { name: 'Position', value: `#${queue.songs.length}`, inline: true },
          ],
          thumbnail: song.thumbnail,
        })],
      }).catch(() => {});
    })
    .on('addList', (queue, playlist) => {
      queue.textChannel?.send({
        embeds: [crimeEmbed({
          title: 'Playlist Queued',
          description: `Added **${playlist.songs.length}** tracks from **${playlist.name}**.`,
        })],
      }).catch(() => {});
    })
    .on('error', (channel, err) => {
      const msg = err?.message || 'Unknown music engine error';
      const target = channel?.send ? channel : null;
      target?.send({ embeds: [errorEmbed(`Music error: ${msg}`)] }).catch(() => {});
      console.error('DisTube error:', err);
    })
    .on('empty', (channel) => {
      channel?.send({ embeds: [crimeEmbed({ description: 'Voice channel is empty. Leaving...' })] }).catch(() => {});
    })
    .on('finish', (queue) => {
      queue.textChannel?.send({ embeds: [crimeEmbed({ description: 'Queue finished.' })] }).catch(() => {});
    });

  return client.distube;
}

module.exports = { initMusic };
