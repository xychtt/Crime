const { loadData, saveData } = require('./dataStore');

const FILE = 'permanentBans';

function recordPermanentBan(guildId, userId, details = {}) {
  const data = loadData(FILE);
  if (!data[guildId]) data[guildId] = {};

  data[guildId][userId] = {
    bannedAt: new Date().toISOString(),
    ...details,
  };

  saveData(FILE, data);
}

function isPermanentlyBanned(guildId, userId) {
  const data = loadData(FILE);
  return Boolean(data[guildId]?.[userId]);
}

module.exports = { recordPermanentBan, isPermanentlyBanned };

