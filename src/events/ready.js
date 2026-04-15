module.exports = {
  name: 'ready',
  once: true,
  execute(client) {
    console.log(`✅ Crime is online — logged in as ${client.user.tag}`);
    client.user.setPresence({
      activities: [{ name: `your server | !help`, type: 3 }],
      status: 'online',
    });
  },
};
