const fs = require('fs');
const path = require('path');
const { PermissionFlagsBits, PermissionsBitField, ChannelType } = require('discord.js');
const { successEmbed, errorEmbed, warnEmbed, infoEmbed } = require('../../utils/embed');

const runtime = new Map();
const BROADCAST_INTERVAL_MS = 1_000;

module.exports = {
  name: 'pnic',
  aliases: ['panic'],
  description: 'Emergency panic mode: archive + lockdown + controlled recovery broadcast',
  usage: '!pnic <start|stop|status>',
  category: 'mod',
  async execute(message, args) {
    if (!message.member.permissions.has('Administrator')) {
      return message.reply({ embeds: [errorEmbed('You need **Administrator** permission.')] });
    }

    const sub = (args[0] || 'status').toLowerCase();
    const guildId = message.guild.id;

    if (!runtime.has(guildId)) {
      runtime.set(guildId, {
        active: false,
        arming: false,
        timer: null,
        broadcaster: null,
        backup: {},
        activatedBy: null,
        activatedAt: null,
        archiveFile: null,
        sentMessages: [],
      });
    }

    const state = runtime.get(guildId);

    if (sub === 'status') {
      const status = state.arming ? 'Arming' : (state.active ? 'Active' : 'Inactive');
      return message.reply({
        embeds: [infoEmbed(
          `**Status:** ${status}\n**Interval:** 60 seconds\n**Broadcast channels:** #annc, #gen\n**Recovery link set:** ${process.env.PNIC_RECOVERY_LINK ? 'Yes' : 'No'}`,
          'PNIC Status'
        )],
      });
    }

    if (sub === 'start') {
      if (state.arming || state.active) {
        return message.reply({ embeds: [errorEmbed('PNIC is already arming or active.')] });
      }

      state.arming = true;
      const delaySec = Number.parseInt(process.env.PNIC_DELAY_SECONDS || '1', 10);
      const archiveFile = await createGuildArchive(message.guild);
      state.archiveFile = archiveFile;

      await message.reply({
        embeds: [warnEmbed(
          `PNIC arming now. Lockdown starts in **${delaySec}s**.\nArchive created: \`${path.basename(archiveFile)}\``,
          'PNIC Arming'
        )],
      });

      state.timer = setTimeout(async () => {
        try {
          // Use pre-configured recovery link (Discord blocks bots from creating guilds)
          const recoveryLink = process.env.PNIC_RECOVERY_LINK || 'https://discord.gg/ynDPAfsj';
          if (!recoveryLink) throw new Error('PNIC_RECOVERY_LINK is not set in environment variables. Create a backup server manually and set the invite link.');
          state.recoveryLink = recoveryLink;

          const backup = await lockTextChannels(message.guild);
          state.backup = backup;
          state.active = true;
          state.arming = false;
          state.activatedBy = message.author.tag;
          state.activatedAt = new Date().toISOString();

          const modChannel = findModLogChannel(message.guild);
          const modMsg = await modChannel?.send({
            embeds: [warnEmbed(
              `PNIC is now **ACTIVE**.\nText channels locked.\nBackup server created: ${recoveryLink}\nRecovery announcements will post every 60 seconds to #annc and #gen.`,
              'PNIC Active'
            )],
          }).catch(() => null);
          if (modMsg) state.sentMessages.push(modMsg);

          state.broadcaster = setInterval(async () => {
            await broadcastRecoveryLink(message.guild, state.recoveryLink, state.sentMessages);
          }, BROADCAST_INTERVAL_MS);

          await broadcastRecoveryLink(message.guild, state.recoveryLink, state.sentMessages);
        } catch (err) {
          state.arming = false;
          state.active = false;
          const modChannel = findModLogChannel(message.guild);
          await modChannel?.send({
            embeds: [errorEmbed(`PNIC activation failed: ${err?.message || 'Unknown error'}`)],
          }).catch(() => {});
        }
      }, Math.max(1, delaySec) * 1000);

      return;
    }

    if (sub === 'stop') {
      if (state.timer) {
        clearTimeout(state.timer);
        state.timer = null;
      }
      if (state.broadcaster) {
        clearInterval(state.broadcaster);
        state.broadcaster = null;
      }

      if (state.active) {
        await restoreTextChannels(message.guild, state.backup);
      }

      // Delete all messages sent during PNIC
      for (const msg of (state.sentMessages || [])) {
        await msg.delete().catch(() => {});
      }

      state.active = false;
      state.arming = false;
      state.backup = {};
      state.sentMessages = [];

      return message.reply({ embeds: [successEmbed('PNIC stopped. Channel permissions restored.')] });
    }

    return message.reply({ embeds: [errorEmbed('Usage: `!pnic <start|stop|status>`')] });
  },
};


async function createGuildArchive(guild) {
  const archiveDir = path.join(__dirname, '../../data/archives');
  fs.mkdirSync(archiveDir, { recursive: true });

  const payload = {
    guild: {
      id: guild.id,
      name: guild.name,
      createdTimestamp: guild.createdTimestamp,
      memberCount: guild.memberCount,
      archivedAt: new Date().toISOString(),
    },
    roles: guild.roles.cache
      .filter(r => r.id !== guild.id)
      .sort((a, b) => b.position - a.position)
      .map(r => ({
        id: r.id,
        name: r.name,
        color: r.color,
        permissions: r.permissions.bitfield.toString(),
        hoist: r.hoist,
        mentionable: r.mentionable,
        position: r.position,
      })),
    channels: guild.channels.cache
      .sort((a, b) => (a.rawPosition ?? 0) - (b.rawPosition ?? 0))
      .map(c => ({
        id: c.id,
        name: c.name,
        type: c.type,
        parentId: c.parentId || null,
        position: c.rawPosition ?? null,
      })),
  };

  const file = path.join(archiveDir, `${guild.id}-${Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify(payload, null, 2), 'utf8');
  return file;
}

async function lockTextChannels(guild) {
  const everyoneId = guild.roles.everyone.id;
  const me = guild.members.me || await guild.members.fetchMe().catch(() => null);
  const backup = {};

  const channels = guild.channels.cache.filter(c =>
    isTextLike(c) && c.permissionsFor(me)?.has(PermissionFlagsBits.ManageChannels)
  );

  for (const [, channel] of channels) {
    const existing = channel.permissionOverwrites.cache.get(everyoneId);
    backup[channel.id] = {
      hadOverwrite: Boolean(existing),
      allow: existing ? existing.allow.bitfield.toString() : null,
      deny: existing ? existing.deny.bitfield.toString() : null,
    };

    await channel.permissionOverwrites.edit(everyoneId, {
      SendMessages: false,
      AddReactions: false,
      CreatePublicThreads: false,
      CreatePrivateThreads: false,
      SendMessagesInThreads: false,
    }).catch(() => {});
  }

  return backup;
}

async function restoreTextChannels(guild, backup) {
  const everyoneId = guild.roles.everyone.id;
  const me = guild.members.me || await guild.members.fetchMe().catch(() => null);

  for (const channelId of Object.keys(backup || {})) {
    const channel = guild.channels.cache.get(channelId);
    if (!channel || !isTextLike(channel)) continue;
    if (!channel.permissionsFor(me)?.has(PermissionFlagsBits.ManageChannels)) continue;

    const item = backup[channelId];
    if (!item?.hadOverwrite) {
      await channel.permissionOverwrites.delete(everyoneId).catch(() => {});
      continue;
    }

    await channel.permissionOverwrites.edit(everyoneId, {
      SendMessages: null,
      AddReactions: null,
      CreatePublicThreads: null,
      CreatePrivateThreads: null,
      SendMessagesInThreads: null,
    }).catch(() => {});

    const allow = item.allow ? new PermissionsBitField(BigInt(item.allow)) : new PermissionsBitField(0n);
    const deny = item.deny ? new PermissionsBitField(BigInt(item.deny)) : new PermissionsBitField(0n);
    await channel.permissionOverwrites.set([
      ...channel.permissionOverwrites.cache
        .filter(po => po.id !== everyoneId)
        .map(po => ({
          id: po.id,
          type: po.type,
          allow: po.allow.bitfield,
          deny: po.deny.bitfield,
        })),
      {
        id: everyoneId,
        type: 0,
        allow: allow.bitfield,
        deny: deny.bitfield,
      },
    ]).catch(() => {});
  }
}

async function broadcastRecoveryLink(guild, link, sentMessages = []) {
  link = link || process.env.PNIC_RECOVERY_LINK;
  if (!link) return;

  const targetNames = new Set(['annc', 'gen']);
  const me = guild.members.me || await guild.members.fetchMe().catch(() => null);

  const channels = guild.channels.cache.filter(c =>
    isTextLike(c) &&
    targetNames.has((c.name || '').toLowerCase()) &&
    c.permissionsFor(me)?.has(PermissionFlagsBits.SendMessages)
  );

  for (const [, channel] of channels) {
    const msg = await channel.send({
      embeds: [warnEmbed(
        `Emergency recovery link:\n${link}\n\nThis message repeats every 60s while PNIC is active.`,
        'PNIC Recovery Notice'
      )],
    }).catch(() => null);
    if (msg) sentMessages.push(msg);
  }
}

function isTextLike(channel) {
  return channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildAnnouncement;
}

function findModLogChannel(guild) {
  const channelName = process.env.MOD_LOG_CHANNEL || 'mod-logs';
  return guild.channels.cache.find(c => c.name === channelName && isTextLike(c));
}

