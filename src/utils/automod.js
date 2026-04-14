const { loadData, saveData } = require('./dataStore');

const spamTracker = new Map();

async function runAutomod(message) {
  if (message.author.bot) return false;
  if (!message.member) return false;
  if (message.member.permissions.has('ManageMessages')) return false;

  const settings = loadData('automod');
  const guildSettings = settings[message.guild.id] || {};

  if (!guildSettings.enabled) return false;

  const content = message.content.toLowerCase();

  // Bad word filter
  const badWords = loadData('badwords');
  const wordList = badWords[message.guild.id] || [];
  if (wordList.some(word => content.includes(word.toLowerCase()))) {
    await message.delete().catch(() => {});
    await message.channel.send(`${message.author}, that language isn't allowed here.`).then(m => {
      setTimeout(() => m.delete().catch(() => {}), 5000);
    });
    return true;
  }

  // Link filter
  if (guildSettings.blockLinks) {
    const linkRegex = /(https?:\/\/|www\.)\S+/gi;
    if (linkRegex.test(message.content)) {
      await message.delete().catch(() => {});
      await message.channel.send(`${message.author}, links are not allowed here.`).then(m => {
        setTimeout(() => m.delete().catch(() => {}), 5000);
      });
      return true;
    }
  }

  // Spam filter (5 messages in 5 seconds)
  if (guildSettings.antiSpam) {
    const key = `${message.guild.id}-${message.author.id}`;
    const now = Date.now();
    const timestamps = spamTracker.get(key) || [];
    const recent = timestamps.filter(t => now - t < 5000);
    recent.push(now);
    spamTracker.set(key, recent);

    if (recent.length >= 5) {
      await message.member.timeout(10 * 60 * 1000, 'Spamming').catch(() => {});
      await message.channel.send(`${message.author} has been timed out for spamming.`).then(m => {
        setTimeout(() => m.delete().catch(() => {}), 5000);
      });
      spamTracker.set(key, []);
      return true;
    }
  }

  return false;
}

module.exports = { runAutomod };
