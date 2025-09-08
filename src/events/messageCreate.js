const { ChannelType, PermissionsBitField } = require('discord.js');

module.exports = {
  name: 'messageCreate',
  async execute(client, message) {
    // DM -> staff
    if (!message.guild && !message.author.bot) {
      const GUILD_ID = process.env.DISCORD_GUILD_ID;
      if (!GUILD_ID) {
        console.error('[DM] DISCORD_GUILD_ID manquant dans id.env');
        return;
      }

      // >>> fetch plutôt que cache.get
      const guild = await client.guilds.fetch(GUILD_ID).catch(() => null);
      if (!guild) {
        console.error('[DM] Guild introuvable. Le bot est-il bien dans cette guilde ? Id =', GUILD_ID);
        return;
      }

      const parentId = process.env.DEV_TICKET_CATEGORY_ID || null;
      const name = `dm-${message.author.username}-${message.author.id}`.toLowerCase().slice(0, 90);

      // On tente de retrouver un salon existant par topic
      let channel = null;
      try {
        const channels = await guild.channels.fetch();
        channel = channels.find(c => c?.type === ChannelType.GuildText && c?.topic === `DM:${message.author.id}`) || null;
      } catch {}

      if (!channel) {
        try {
          channel = await guild.channels.create({
            name,
            type: ChannelType.GuildText,
            parent: parentId ?? undefined,
            topic: `DM:${message.author.id}`,
            permissionOverwrites: [
              { id: guild.roles.everyone, deny: [PermissionsBitField.Flags.ViewChannel] },
              { id: message.author.id,  allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
              { id: client.user.id,     allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.ManageChannels] },
            ],
            reason: `DM support pour ${message.author.tag} (${message.author.id})`,
          });
          await channel.send(`📥 **Nouveau DM** de ${message.author.tag} (\`${message.author.id}\`)`);
        } catch (e) {
          console.error('[DM] Création salon échouée :', e);
          return;
        }
      }

      const files = [...message.attachments.values()].map(a => a.url);
      const content = message.content?.trim() || (files.length ? '(fichier)' : '(vide)');
      await channel.send({ content: `**${message.author.tag}**: ${content}`, files }).catch(() => {});
      await message.channel.send('✅ Support reçu. Un membre du staff va te répondre ici.').catch(() => {});
      return;
    }

    // Staff -> DM (si topic "DM:<id>")
    if (message.guild && !message.author.bot) {
      const topic = message.channel?.topic || '';
      if (!topic.startsWith('DM:')) return;
      const userId = topic.slice(3);

      const user = await message.client.users.fetch(userId).catch(() => null);
      if (!user) return;

      const files = [...message.attachments.values()].map(a => a.url);
      const content = message.content?.trim() || (files.length ? '(fichier)' : '(vide)');
      await user.send({ content, files }).catch(async () => {
        await message.channel.send('⚠️ Impossible d’envoyer le message en DM (MP fermés).');
      });
    }
  }
};
