const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');

function startBot() {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.DirectMessages, // 👈 nécessaire pour DM
    ],
    partials: [Partials.Channel, Partials.Message, Partials.Reaction, Partials.User, Partials.GuildMember],
  });

  client.commands = new Collection();

  // EVENTS
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
