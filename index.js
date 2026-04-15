const { Client, GatewayIntentBits, Collection, Partials } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { initMusic } = require('./src/utils/musicManager');
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
initMusic(client);

function findProjectRoot(startDir, maxDepth = 4) {
  const queue = [{ dir: startDir, depth: 0 }];
  const visited = new Set();

  while (queue.length > 0) {
    const { dir, depth } = queue.shift();
    const realDir = path.resolve(dir);
    if (visited.has(realDir)) continue;
    visited.add(realDir);

    const srcDir = path.join(realDir, 'src');
    if (fs.existsSync(path.join(srcDir, 'commands')) && fs.existsSync(path.join(srcDir, 'events'))) {
      return realDir;
    }

    if (depth >= maxDepth) continue;

    let entries = [];
    try {
      entries = fs.readdirSync(realDir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      queue.push({ dir: path.join(realDir, entry.name), depth: depth + 1 });
    }
  }

  return null;
}

const projectRoot = findProjectRoot(__dirname);

const commandsRoot = projectRoot ? path.join(projectRoot, 'src', 'commands') : null;
const eventsRoot = projectRoot ? path.join(projectRoot, 'src', 'events') : null;

if (!projectRoot || !fs.existsSync(commandsRoot) || !fs.existsSync(eventsRoot)) {
  console.error(`Missing command/event folders. Checked:
  - ${path.join(__dirname, 'src', 'commands')}
  - ${path.join(__dirname, 'src', 'events')}
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
