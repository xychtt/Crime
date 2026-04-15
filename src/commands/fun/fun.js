const { crimeEmbed, successEmbed, errorEmbed } = require('../../utils/embed');

const poll = {
  name: 'poll',
  description: 'Create a quick yes/no poll',
  usage: '!poll <question>',
  category: 'fun',
  async execute(message, args) {
    if (!args.length) return message.reply({ embeds: [errorEmbed('Please provide a poll question.')] });

    const question = args.join(' ');
    const embed = crimeEmbed({
      title: '📊 Poll',
      description: `**${question}**\n\nReact with ✅ or ❌`,
      footer: `Poll by ${message.author.tag}`,
    });

    const msg = await message.channel.send({ embeds: [embed] });
    await message.delete().catch(() => {});
    await msg.react('✅');
    await msg.react('❌');
  },
};

const giveaway = {
  name: 'giveaway',
  description: 'Start a giveaway',
  usage: '!giveaway <duration> <prize>  e.g. !giveaway 1h Nitro',
  category: 'fun',
  async execute(message, args) {
    if (!message.member.permissions.has('ManageMessages'))
      return message.reply({ embeds: [errorEmbed('You need **Manage Messages** permission.')] });

    const durations = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
    const durationStr = args[0];
    if (!durationStr) return message.reply({ embeds: [errorEmbed('Usage: `!giveaway 1h Prize name`')] });

    const unit = durationStr.slice(-1);
    const amount = parseInt(durationStr.slice(0, -1));
    if (!durations[unit] || isNaN(amount))
      return message.reply({ embeds: [errorEmbed('Invalid duration. Example: `30m`, `2h`, `1d`')] });

    const prize = args.slice(1).join(' ');
    if (!prize) return message.reply({ embeds: [errorEmbed('Please provide a prize.')] });

    const ms = amount * durations[unit];
    const endsAt = Math.floor((Date.now() + ms) / 1000);

    const embed = crimeEmbed({
      title: '🎉 GIVEAWAY',
      description: `**${prize}**\n\nReact with 🎉 to enter!\n\nEnds: <t:${endsAt}:R>`,
      footer: `Hosted by ${message.author.tag} • Ends at`,
      color: 0xf39c12,
    });

    const giveawayMsg = await message.channel.send({ embeds: [embed] });
    await giveawayMsg.react('🎉');
    await message.delete().catch(() => {});

    setTimeout(async () => {
      const fetchedMsg = await giveawayMsg.fetch().catch(() => null);
      if (!fetchedMsg) return;

      const reaction = fetchedMsg.reactions.cache.get('🎉');
      if (!reaction) return;

      const users = await reaction.users.fetch();
      const entries = users.filter(u => !u.bot);

      if (!entries.size) {
        giveawayMsg.reply({ embeds: [crimeEmbed({ description: '🎉 Giveaway ended — no valid entries.' })] });
        return;
      }

      const winner = entries.random();
      giveawayMsg.reply({ embeds: [crimeEmbed({
        title: '🎉 Giveaway Ended!',
        description: `Congratulations ${winner}! You won **${prize}**!`,
        color: 0x2ecc71,
      })] });
    }, ms);
  },
};

const coinflip = {
  name: 'coinflip',
  aliases: ['cf', 'flip'],
  description: 'Flip a coin',
  usage: '!coinflip',
  category: 'fun',
  async execute(message) {
    const result = Math.random() < 0.5 ? 'Heads 🪙' : 'Tails 🪙';
    message.reply({ embeds: [crimeEmbed({ description: `**${result}**` })] });
  },
};

const eightball = {
  name: '8ball',
  description: 'Ask the magic 8ball',
  usage: '!8ball <question>',
  category: 'fun',
  async execute(message, args) {
    if (!args.length) return message.reply({ embeds: [errorEmbed('Ask a question!')] });

    const responses = [
      'It is certain.', 'It is decidedly so.', 'Without a doubt.',
      'Yes, definitely.', 'You may rely on it.', 'As I see it, yes.',
      'Most likely.', 'Outlook good.', 'Yes.', 'Signs point to yes.',
      'Reply hazy, try again.', 'Ask again later.', 'Better not tell you now.',
      'Cannot predict now.', 'Concentrate and ask again.',
      "Don't count on it.", 'My reply is no.', 'My sources say no.',
      'Outlook not so good.', 'Very doubtful.',
    ];

    const answer = responses[Math.floor(Math.random() * responses.length)];
    message.reply({ embeds: [crimeEmbed({
      title: '🎱 Magic 8-Ball',
      fields: [
        { name: 'Question', value: args.join(' ') },
        { name: 'Answer', value: answer },
      ],
    })] });
  },
};

module.exports = { poll, giveaway, coinflip, eightball };
