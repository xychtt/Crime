const { runAutomod } = require('../utils/automod');
const { handleXP } = require('../utils/leveling');

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (message.author.bot || !message.guild) return;

    // Run automod first — if it deleted the message, stop
    const blocked = await runAutomod(message);
    if (blocked) return;

    // Give XP for the message
    await handleXP(message, client);

    const prefix = process.env.PREFIX || '!';
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = client.commands.get(commandName);
    if (!command) return;

    // Cooldown handling
    const { cooldowns } = client;
    if (!cooldowns.has(command.name)) cooldowns.set(command.name, new Map());
    const now = Date.now();
    const timestamps = cooldowns.get(command.name);
    const cooldownAmount = (command.cooldown || 3) * 1000;

    if (timestamps.has(message.author.id)) {
      const expiration = timestamps.get(message.author.id) + cooldownAmount;
      if (now < expiration) {
        const remaining = ((expiration - now) / 1000).toFixed(1);
        return message.reply(`Please wait **${remaining}s** before using \`${prefix}${command.name}\` again.`);
      }
    }
    timestamps.set(message.author.id, now);
    setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);

    try {
      await command.execute(message, args, client);
    } catch (err) {
      console.error(err);
      message.reply('Something went wrong running that command.').catch(() => {});
    }
  },
};
