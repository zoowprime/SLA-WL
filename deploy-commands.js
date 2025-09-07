require('dotenv').config({ path: 'id.env' });

const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');

const BOT_TOKEN = process.env.BOT_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID;

if (!BOT_TOKEN || !CLIENT_ID || !GUILD_ID) {
  console.error('[FATAL] Variables manquantes. Vérifie BOT_TOKEN (Render), DISCORD_CLIENT_ID et DISCORD_GUILD_ID (id.env).');
  process.exit(1);
}

const commands = [];

// Parcourir src/commands et sous-dossiers
const foldersPath = path.join(__dirname, 'src/commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
  const commandsPath = path.join(foldersPath, folder);
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    if ('data' in command && 'execute' in command) {
      commands.push(command.data.toJSON());
    } else {
      console.warn(`[WARN] La commande à ${filePath} est invalide (il manque data ou execute).`);
    }
  }
}

const rest = new REST({ version: '10' }).setToken(BOT_TOKEN);

(async () => {
  try {
    console.log(`[SLA] Déploiement de ${commands.length} commande(s) → serveur ${GUILD_ID}`);
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands },
    );
    console.log('[SLA] Déploiement terminé.');
  } catch (error) {
    console.error(error);
  }
})();
