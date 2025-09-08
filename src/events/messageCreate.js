const { ensureOpenChannelForUser, logArchive } = require('../services/support');

module.exports = {
  name: 'messageCreate',
  async execute(client, message) {
    // DM utilisateur -> relayer vers le salon staff ouvert (ou le créer)
    if (!message.guild && !message.author.bot) {
      const guildId = process.env.DISCORD_GUILD_ID;
      if (!guildId) return console.error('[DM] DISCORD_GUILD_ID manquant');

      const channel = await ensureOpenChannelForUser(client, message.author).catch(e => {
        console.error('[DM] ensureOpenChannelForUser KO:', e);
        return null;
      });
      if (!channel) return;

      const files = [...message.attachments.values()].map(a => a.url);
      const content = message.content?.trim() || (files.length ? '(fichiers)' : '(vide)');

      await channel.send({ content: `**${message.author.tag}**: ${content}`, files }).catch(()=>{});
      if (message.content) await message.channel.send('✅ Support reçu. Un membre du staff va te répondre ici.').catch(()=>{});

      await logArchive(client, `🧾 **DM → Staff** | ${message.author.tag}\n${content}`);
      return;
    }

    // Staff -> DM utilisateur (si on écrit dans un salon lié)
    if (message.guild && !message.author.bot) {
      const topic = message.channel?.topic || '';
      if (!topic.startsWith('DM:')) return;

      const userId = topic.slice(3);
      const user = await client.users.fetch(userId).catch(()=>null);
      if (!user) return;

      const files = [...message.attachments.values()].map(a => a.url);
      const content = message.content?.trim() || (files.length ? '(fichiers)' : '(vide)');

      await user.send({ content, files }).catch(async () => {
        await message.channel.send('⚠️ Impossible d’envoyer le message en DM (MP fermés).');
      });

      await logArchive(client, `🧾 **Staff → DM** | ${message.member?.displayName || message.author.tag}\n${content}`);
    }
  }
};
