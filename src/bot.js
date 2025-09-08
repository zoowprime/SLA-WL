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
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.DirectMessages,
    ],
    partials: [Partials.Channel, Partials.Message, Partials.Reaction, Partials.User, Partials.GuildMember],
  });

  // ===== CHARGER COMMANDES =====
  client.commands = new Collection();
  const cmdDir = path.join(__dirname, 'commands');
  const found = collectCommands(cmdDir);
  for (const c of found) client.commands.set(c.name, c.mod);
  console.log(`[BOOT] Commandes chargées: ${found.map(c => c.name).join(', ') || '(aucune)'}`);

  // ===== CHARGER EVENTS =====
  const eventsPath = path.join(__dirname, 'events');
  if (fs.existsSync(eventsPath)) {
    for (const file of fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'))) {
      const ev = require(path.join(eventsPath, file));
      if (ev.once) client.once(ev.name, (...args) => ev.execute(client, ...args));
      else client.on(ev.name, (...args) => ev.execute(client, ...args));
    }
  }

  client.login(process.env.BOT_TOKEN);
}

module.exports = { startBot };
