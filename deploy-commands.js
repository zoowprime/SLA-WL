require('dotenv').config({ path: 'id.env' });
const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');

const BOT_TOKEN = process.env.BOT_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID  = process.env.DISCORD_GUILD_ID;

if (!BOT_TOKEN || !CLIENT_ID || !GUILD_ID) {
  console.error('[FATAL] BOT_TOKEN / DISCORD_CLIENT_ID / DISCORD_GUILD_ID manquants.');
  process.exit(1);
}

function collectCommands(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectCommands(full));
    else if (entry.isFile() && entry.name.endsWith('.js')) {
      const cmd = require(full);
      if (cmd?.data?.toJSON) out.push({ name: cmd.data.name, json: cmd.data.toJSON(), file: full });
    }
  }
  return out;
}

const base = path.join(__dirname, 'src/commands');
const found = fs.existsSync(base) ? collectCommands(base) : [];
console.log(`[DEPLOY] ${found.length} commande(s) trouvée(s):`, found.map(c => `${c.name} (${path.relative(process.cwd(), c.file)})`).join(', ') || '(aucune)');

const rest = new REST({ version: '10' }).setToken(BOT_TOKEN);

(async () => {
  try {
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: found.map(c => c.json) });
    console.log('[DEPLOY] OK. Vérification…');
    const published = await rest.get(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID));
    console.log('[DEPLOY] Enregistrées côté Discord:', published.map(c => c.name).join(', ') || '(aucune)');

  } catch (e) {
    console.error('[DEPLOY] Échec:', e);
    process.exit(1);
  }
})();
