// src/bot.js
const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');

function collectCommands(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectCommands(full));
    else if (entry.isFile() && full.endsWith('.js')) {
      try {
        const mod = require(full);
        if (mod?.data?.name && typeof mod.execute === 'function') {
          out.push({ name: mod.data.name, file: full, mod });
        } else {
          console.warn('[CMD] ignorée (pas {data, execute}) →', path.relative(process.cwd(), full));
        }
      } catch (e) {
        console.error('[CMD] erreur chargement', full, e);
      }
    }
  }
  return out;
}

function startBot() {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,   // nécessaire pour roles.add/remove
      GatewayIntentBits.GuildMessages,  // utile si tu logs des messages ailleurs
      GatewayIntentBits.MessageContent, // optionnel pour QCM, mais ok si tu l'utilises déjà
      GatewayIntentBits.DirectMessages, // pas requis pour ce QCM, mais ok si DM ailleurs
    ],
    partials: [Partials.Channel, Partials.Message, Partials.Reaction, Partials.User, Partials.GuildMember],
  });

  // ===== COMMANDES =====
  client.commands = new Collection();
  const cmdDir = path.join(__dirname, 'commands');
  const found = collectCommands(cmdDir);
  for (const c of found) client.commands.set(c.name, c.mod);
  console.log(`[BOOT] Commandes chargées: ${found.map(c => c.name).join(', ') || '(aucune)'}`);

  // ===== EVENTS =====
  const eventsPath = path.join(__dirname, 'events');
  if (fs.existsSync(eventsPath)) {
    for (const file of fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'))) {
      const full = path.join(eventsPath, file);
      try {
        const ev = require(full);

        // Style 1: fonction d'init (ex: qcmNoCmd.js, welcome.js)
        if (typeof ev === 'function') {
          ev(client);
          console.log(`[events] init  (fn)  → ${file}`);
          continue;
        }

        // Style 2: objet { name, once, execute }
        if (ev && typeof ev === 'object' && ev.name && typeof ev.execute === 'function') {
          if (ev.once) client.once(ev.name, (...args) => ev.execute(client, ...args));
          else client.on(ev.name, (...args) => ev.execute(client, ...args));
          console.log(`[events] bind ${ev.once ? 'once' : 'on  '} → ${ev.name} (${file})`);
          continue;
        }

        console.warn('[events] ignoré (format non reconnu) →', file);
      } catch (e) {
        console.error('[events] erreur chargement', file, e);
      }
    }
  } else {
    console.warn('[events] dossier introuvable:', eventsPath);
  }

  // Petit log prêt
  client.once('clientReady', () => {
    console.log(`[SLA] Connecté en tant que ${client.user.tag}`);
  });

  client.login(process.env.BOT_TOKEN);
}

module.exports = { startBot };
