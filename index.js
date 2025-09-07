// Bootstrap minimal : se connecte et log "prêt"
require('dotenv').config({ path: 'id.env' });

const { Client, GatewayIntentBits, Partials, ActivityType } = require('discord.js');

const BOT_TOKEN = process.env.BOT_TOKEN; // fourni par Render
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID  = process.env.DISCORD_GUILD_ID;

if (!BOT_TOKEN) {
  console.error('[FATAL] BOT_TOKEN manquant (Render env).');
  process.exit(1);
}
if (!CLIENT_ID || !GUILD_ID) {
  console.warn('[WARN] DISCORD_CLIENT_ID ou DISCORD_GUILD_ID manquant dans id.env (ok pour le moment).');
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, // minimal pour démarrer
  ],
  partials: [Partials.Channel]
});

client.once('ready', () => {
  console.log(`[SLA] Connecté en tant que ${client.user.tag}`);
  // petite présence par défaut (modif libre)
  client.user.setPresence({
    activities: [{ name: 'initialisation…', type: ActivityType.Playing }],
    status: 'online'
  });
});

client.login(BOT_TOKEN);
