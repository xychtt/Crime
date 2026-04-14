const { loadData, saveData } = require('./dataStore');

const XP_PER_MESSAGE = 15;
const XP_COOLDOWN_MS = 60000; // 1 message per minute gives XP
const cooldowns = new Map();

function getLevel(xp) {
  return Math.floor(0.1 * Math.sqrt(xp));
}

function xpForLevel(level) {
  return Math.pow(level / 0.1, 2);
}

function xpForNextLevel(level) {
  return Math.floor(xpForLevel(level + 1));
}

async function handleXP(message, client) {
  if (message.author.bot) return;

  const key = `${message.guild.id}-${message.author.id}`;
  const now = Date.now();

  if (cooldowns.has(key) && now - cooldowns.get(key) < XP_COOLDOWN_MS) return;
  cooldowns.set(key, now);

  const levels = loadData('levels');
  if (!levels[message.guild.id]) levels[message.guild.id] = {};
  if (!levels[message.guild.id][message.author.id]) {
    levels[message.guild.id][message.author.id] = { xp: 0, level: 0 };
  }

  const userData = levels[message.guild.id][message.author.id];
  userData.xp += XP_PER_MESSAGE;
  const newLevel = getLevel(userData.xp);

  if (newLevel > userData.level) {
    userData.level = newLevel;
    saveData('levels', levels);

    const { crimeEmbed } = require('./embed');
    const embed = crimeEmbed({
      color: 0x2b2d31,
      title: '🎉 Level Up!',
      description: `${message.author}, you reached **Level ${newLevel}**!`,
    });
    message.channel.send({ embeds: [embed] });
  } else {
    saveData('levels', levels);
  }
}

module.exports = { handleXP, getLevel, xpForNextLevel };
