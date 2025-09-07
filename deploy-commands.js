/**
 * Déploiement des slash-commands au niveau GUILD.
 * Pour l’instant, on déploie un tableau vide -> OK.
 * Dès qu’on créera /ping ou autres, le script les publiera.
 */
require('dotenv').config({ path: 'id.env' });

const { REST, Routes } = require('discord.js');

const BOT_TOKEN = process.env.BOT_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID  = process.env.DISCORD_GUILD_ID;

if (!BOT_TOKEN || !CLIENT_ID || !GUILD_ID) {
  console.error('[FATAL] Variables manquantes. Vérifie BOT_TOKEN (Render), DISCORD_CLIENT_ID et DISCORD_GUILD_ID (id.env).');
  process.exit(1);
}

// Pour l’instant : zéro commande
const commands = [];

const rest = new REST({ version: '10' }).setToken(BOT_TOKEN);

(async () => {
  try {
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log(`[SLA] Déploiement terminé : ${commands.length} commande(s).`);
  } catch (error) {
    console.error('[SLA] Erreur de déploiement :', error);
    process.exit(1);
  }
})();
