const { ActivityType } = require('discord.js');

module.exports = {
  name: 'ready',
  once: true,
  execute(client) {
    console.log(`[SLA] Connecté en tant que ${client.user.tag}`);

    client.user.setPresence({
      activities: [
        { name: 'DM POUR SUPPORT', type: ActivityType.Playing }
      ],
      status: 'online'
    });
  },
};
