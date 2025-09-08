const { ActivityType } = require('discord.js');

module.exports = {
  name: 'clientReady', // prêt pour v15
  once: true,
  async execute(client) {
    console.log(`[SLA] Connecté en tant que ${client.user.tag}`);
    console.log('[ENV] DISCORD_GUILD_ID =', process.env.DISCORD_GUILD_ID);

    // Liste les guilds où est le bot
    const guilds = await client.guilds.fetch();
    console.log('[GUILDS] Bot est dans :', [...guilds.keys()].join(', '));

    client.user.setPresence({
      activities: [{ name: 'DM POUR SUPPORT', type: ActivityType.Playing }],
      status: 'online',
    });
  },
};
