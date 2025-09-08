const { ActivityType } = require('discord.js');

module.exports = {
  name: 'clientReady',
  once: true,
  async execute(client) {
    console.log(`[SLA] Connecté en tant que ${client.user.tag}`);
    console.log('[ENV] DISCORD_GUILD_ID =', process.env.DISCORD_GUILD_ID);
    const guilds = await client.guilds.fetch();
    console.log('[GUILDS] Bot est dans :', [...guilds.keys()].join(', '));

    // Vérifie les commandes visibles
    try {
      const cmds = await client.application.commands.fetch({ guildId: process.env.DISCORD_GUILD_ID });
      console.log('[READY] Commandes guilde:', [...cmds.values()].map(c => c.name).join(', ') || '(aucune)');
    } catch (e) {
      console.log('[READY] Impossible de lister les commandes guilde:', e?.message);
    }

    client.user.setPresence({
      activities: [{ name: 'DM POUR SUPPORT', type: ActivityType.Playing }],
      status: 'online',
    });
  },
};
