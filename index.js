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

// Support both repo layouts:
// 1) app root contains src/
// 2) app root contains crime-bot/src/
const projectRoot = fs.existsSync(path.join(__dirname, 'src'))
  ? __dirname
  : (fs.existsSync(path.join(__dirname, 'crime-bot', 'src')) ? path.join(__dirname, 'crime-bot') : __dirname);

const commandsRoot = path.join(projectRoot, 'src', 'commands');
const eventsRoot = path.join(projectRoot, 'src', 'events');

if (!fs.existsSync(commandsRoot) || !fs.existsSync(eventsRoot)) {
  console.error(`Missing command/event folders. Checked:
  - ${commandsRoot}
  - ${eventsRoot}
Set Railway Root Directory to the folder that contains src/, or flatten the project.`);
  process.exit(1);
}

// Load commands (handles both single exports and named multi-exports)
const commandFolders = fs.readdirSync(commandsRoot);
for (const folder of commandFolders) {
  const folderPath = path.join(commandsRoot, folder);
  const commandFiles = fs.readdirSync(folderPath).filter(f => f.endsWith('.js'));
  for (const file of commandFiles) {
    const exported = require(path.join(folderPath, file));
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
const eventFiles = fs.readdirSync(eventsRoot).filter(f => f.endsWith('.js'));
for (const file of eventFiles) {
  const event = require(path.join(eventsRoot, file));
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
}

client.login(process.env.BOT_TOKEN);
