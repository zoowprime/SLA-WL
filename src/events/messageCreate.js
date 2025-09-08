const { ensureSupportChannel, logToArchive } = require('../services/support');
const { getUserByChannel } = require('../services/store');

module.exports = {
  name: 'messageCreate',
  async execute(client, message) {
    // A) DM utilisateur -> créer/retourner channel staff et relayer
    if (!message.guild && !message.author.bot) {
      const guild = client.guilds.cache.get(process.env.DISCORD_GUILD_ID);
      if (!guild) return;
      const channel = await ensureSupportChannel(client, guild, message.author);

      const files = [...message.attachments.values()].map(a => a.url);
      const content = message.content?.trim() || (files.length ? '(fichiers)' : '(vide)');

      await channel.send({ content: `**${message.author.tag}** : ${content}`, files }).catch(()=>{});
      await logToArchive(client, { content: `🧾 **DM → Staff** | ${message.author.tag}\n${content}`, files });

      // auto-ack côté DM (facultatif)
      if (message.content) {
        await message.channel.send('✅ Support reçu. Un membre du staff va te répondre ici.').catch(()=>{});
      }
      return;
    }

    // B) Staff parle dans un salon de DM -> renvoyer au user
    if (message.guild && !message.author.bot) {
      const userId = getUserByChannel(message.channel.id);
      if (!userId) return; // pas un salon DM-relay

      const user = await client.users.fetch(userId).catch(()=>null);
      if (!user) return;

      const files = [...message.attachments.values()].map(a => a.url);
      const content = message.content?.trim() || (files.length ? '(fichiers)' : '(vide)');

      await user.send({ content, files }).catch(async () => {
        await message.channel.send('⚠️ Impossible d’envoyer le message en DM (utilisateur fermé aux MP).');
      });

      await logToArchive(client, { content: `🧾 **Staff → DM** | ${message.member?.displayName || message.author.tag}\n${content}`, files });
    }
  }
};
