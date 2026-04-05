const { ActivityType } = require('discord.js');

module.exports = {
  name:  'ready',
  once:  true,
  execute(client) {
    console.log(`\n✅ Bot ist online als: ${client.user.tag}`);
    console.log(`   Verbunden mit ${client.guilds.cache.size} Server(n)\n`);

    client.user.setPresence({
      activities: [{ name: 'Minecraft Schematics Shop', type: ActivityType.Watching }],
      status: 'online',
    });
  },
};
