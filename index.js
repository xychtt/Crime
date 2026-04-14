const { Client, GatewayIntentBits, Collection, Partials } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

client.commands = new Collection();
client.cooldowns = new Collection();
client.musicQueues = new Map();

// Load commands (handles both single exports and named multi-exports)
const commandFolders = fs.readdirSync(path.join(__dirname, 'src/commands'));
for (const folder of commandFolders) {
  const commandFiles = fs.readdirSync(path.join(__dirname, `src/commands/${folder}`)).filter(f => f.endsWith('.js'));
  for (const file of commandFiles) {
    const exported = require(`./src/commands/${folder}/${file}`);
    // Single command export
    if (exported.name) {
      client.commands.set(exported.name, exported);
      if (exported.aliases) exported.aliases.forEach(a => client.commands.set(a, exported));
    } else {
      // Named multi-export (e.g. { warn, warnings, clearwarns })
      for (const key of Object.keys(exported)) {
        const command = exported[key];
        if (command && command.name) {
          client.commands.set(command.name, command);
          if (command.aliases) command.aliases.forEach(a => client.commands.set(a, command));
        }
      }
    }
  }
}

// Load events
const eventFiles = fs.readdirSync(path.join(__dirname, 'src/events')).filter(f => f.endsWith('.js'));
for (const file of eventFiles) {
  const event = require(`./src/events/${file}`);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
}

client.login(process.env.BOT_TOKEN);
