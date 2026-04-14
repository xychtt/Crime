const { crimeEmbed, successEmbed, errorEmbed } = require('../../utils/embed');
const { PermissionFlagsBits } = require('discord.js');
const { loadData, saveData } = require('../../utils/dataStore');

const ticket = {
  name: 'ticket',
  description: 'Open a support ticket',
  usage: '!ticket <topic>',
  category: 'utility',
  async execute(message, args) {
    const topic = args.join(' ') || 'Support';
    const guild = message.guild;

    const data = loadData('tickets');
    if (!data[guild.id]) data[guild.id] = { count: 0, tickets: {} };

    // Check if user already has open ticket
    const existing = Object.values(data[guild.id].tickets).find(
      t => t.userId === message.author.id && t.open
    );
    if (existing) {
      const ch = guild.channels.cache.get(existing.channelId);
      return message.reply({ embeds: [errorEmbed(`You already have an open ticket: ${ch || 'unknown channel'}`)] });
    }

    data[guild.id].count++;
    const ticketNumber = data[guild.id].count;

    // Create private channel
    const channel = await guild.channels.create({
      name: `ticket-${ticketNumber}`,
      type: 0,
      permissionOverwrites: [
        { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: message.author.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
        { id: guild.members.me.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
      ],
      topic: `Ticket by ${message.author.tag} | Topic: ${topic}`,
    });

    // Add staff role if it exists
    const staffRole = guild.roles.cache.find(r => r.name.toLowerCase() === 'staff' || r.name.toLowerCase() === 'mod');
    if (staffRole) {
      await channel.permissionOverwrites.create(staffRole, {
        ViewChannel: true,
        SendMessages: true,
      });
    }

    data[guild.id].tickets[channel.id] = {
      channelId: channel.id,
      userId: message.author.id,
      topic,
      open: true,
      createdAt: new Date().toISOString(),
      transcript: [],
    };
    saveData('tickets', data);

    // Send welcome embed in ticket channel
    channel.send({
      content: `${message.author}`,
      embeds: [crimeEmbed({
        title: `🎫 Ticket #${ticketNumber}`,
        description: `Hello ${message.author}! Support will be with you shortly.\n\n**Topic:** ${topic}\n\nUse \`!closeticket\` to close this ticket.`,
      })],
    });

    message.reply({ embeds: [successEmbed(`Your ticket has been opened: ${channel}`)] });
  },
};

const closeticket = {
  name: 'closeticket',
  aliases: ['close'],
  description: 'Close a ticket and save a transcript',
  usage: '!closeticket',
  category: 'utility',
  async execute(message) {
    const data = loadData('tickets');
    const guildTickets = data[message.guild.id]?.tickets || {};
    const ticketData = guildTickets[message.channel.id];

    if (!ticketData || !ticketData.open)
      return message.reply({ embeds: [errorEmbed('This is not an open ticket channel.')] });

    // Fetch messages for transcript
    const messages = await message.channel.messages.fetch({ limit: 100 });
    const transcript = messages.reverse().map(m =>
      `[${new Date(m.createdTimestamp).toLocaleString()}] ${m.author.tag}: ${m.content || '[embed/attachment]'}`
    ).join('\n');

    ticketData.open = false;
    ticketData.closedAt = new Date().toISOString();
    ticketData.closedBy = message.author.tag;
    saveData('tickets', data);

    // Log transcript to a logs channel if it exists
    const logChannel = message.guild.channels.cache.find(
      c => c.name === 'ticket-logs' && c.isTextBased()
    );

    if (logChannel) {
      const { AttachmentBuilder } = require('discord.js');
      const buffer = Buffer.from(transcript, 'utf-8');
      const attachment = new AttachmentBuilder(buffer, { name: `ticket-${message.channel.name}-transcript.txt` });

      logChannel.send({
        embeds: [crimeEmbed({
          title: `📁 Ticket Closed — ${message.channel.name}`,
          fields: [
            { name: 'Opened by', value: `<@${ticketData.userId}>`, inline: true },
            { name: 'Closed by', value: message.author.tag, inline: true },
            { name: 'Topic', value: ticketData.topic, inline: true },
          ],
        })],
        files: [attachment],
      });
    }

    await message.reply({ embeds: [successEmbed('Ticket closed. This channel will be deleted in 5 seconds.')] });
    setTimeout(() => message.channel.delete().catch(() => {}), 5000);
  },
};

module.exports = { ticket, closeticket };
