const { recordPermanentBan } = require('../utils/banRegistry');

module.exports = {
  name: 'guildBanAdd',
  async execute(ban) {
    recordPermanentBan(ban.guild.id, ban.user.id, {
      reason: ban.reason || 'Banned (captured from guildBanAdd event)',
      source: 'guildBanAdd',
    });
  },
};

