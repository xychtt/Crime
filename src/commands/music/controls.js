const { successEmbed, errorEmbed, crimeEmbed } = require('../../utils/embed');
const { AudioPlayerStatus } = require('@discordjs/voice');

function getQueue(client, guildId) {
  return client.musicQueues.get(guildId);
}

const skip = {
  name: 'skip',
  aliases: ['s'],
  description: 'Skip the current song',
  usage: '!skip',
  category: 'music',
  async execute(message, args, client) {
    const queue = getQueue(client, message.guild.id);
    if (!queue || !queue.playing)
      return message.reply({ embeds: [errorEmbed('Nothing is playing.')] });

    queue.player.stop();
    message.reply({ embeds: [successEmbed('⏭️ Skipped the current track.')] });
  },
};

const stop = {
  name: 'stop',
  description: 'Stop music and clear the queue',
  usage: '!stop',
  category: 'music',
  async execute(message, args, client) {
    const queue = getQueue(client, message.guild.id);
    if (!queue || !queue.playing)
      return message.reply({ embeds: [errorEmbed('Nothing is playing.')] });

    queue.queue = [];
    queue.player.stop();
    queue.connection?.destroy();
    client.musicQueues.delete(message.guild.id);

    message.reply({ embeds: [successEmbed('⏹️ Stopped and cleared the queue.')] });
  },
};

const queue = {
  name: 'queue',
  aliases: ['q'],
  description: 'View the music queue',
  usage: '!queue',
  category: 'music',
  async execute(message, args, client) {
    const q = getQueue(client, message.guild.id);
    if (!q || !q.playing)
      return message.reply({ embeds: [errorEmbed('Nothing is playing.')] });

    const list = q.queue.slice(0, 10).map((t, i) => `**${i + 1}.** ${t.title} — *${t.duration}*`).join('\n');

    message.reply({ embeds: [crimeEmbed({
      title: `🎶 Queue (${q.queue.length} tracks)`,
      description: list || 'Queue is empty — current track is the last one.',
    })] });
  },
};

const nowplaying = {
  name: 'nowplaying',
  aliases: ['np'],
  description: 'See what\'s currently playing',
  usage: '!nowplaying',
  category: 'music',
  async execute(message, args, client) {
    const q = getQueue(client, message.guild.id);
    if (!q || !q.playing)
      return message.reply({ embeds: [errorEmbed('Nothing is playing right now.')] });

    message.reply({ embeds: [crimeEmbed({ description: '🎵 Use `!queue` to see the full list of upcoming tracks.' })] });
  },
};

const pause = {
  name: 'pause',
  description: 'Pause the current song',
  usage: '!pause',
  category: 'music',
  async execute(message, args, client) {
    const q = getQueue(client, message.guild.id);
    if (!q || !q.playing) return message.reply({ embeds: [errorEmbed('Nothing is playing.')] });
    if (q.player.state.status === AudioPlayerStatus.Paused)
      return message.reply({ embeds: [errorEmbed('Already paused. Use `!resume` to continue.')] });

    q.player.pause();
    message.reply({ embeds: [successEmbed('⏸️ Paused.')] });
  },
};

const resume = {
  name: 'resume',
  description: 'Resume the current song',
  usage: '!resume',
  category: 'music',
  async execute(message, args, client) {
    const q = getQueue(client, message.guild.id);
    if (!q) return message.reply({ embeds: [errorEmbed('Nothing is paused.')] });
    if (q.player.state.status !== AudioPlayerStatus.Paused)
      return message.reply({ embeds: [errorEmbed('Not paused.')] });

    q.player.unpause();
    message.reply({ embeds: [successEmbed('▶️ Resumed.')] });
  },
};

module.exports = { skip, stop, queue, nowplaying, pause, resume };
