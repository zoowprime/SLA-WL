// Debug + DM relay minimal
const { ChannelType, PermissionsBitField } = require('discord.js');

module.exports = {
  name: 'messageCreate',
  async execute(client, message) {
    // LOG DIAG (tu verras ça dans les logs Render)
    console.log('[messageCreate]', {
      isDM: !message.guild,
      authorBot: !!message.author?.bot,
      content: message.content?.slice(0, 80) || '',
      attaches: message.attachments?.size || 0
    });

    // A) DM utilisateur -> créer un salon staff et relayer
    if (!message.guild && !message.author.bot) {
      const guild = client.guilds.cache.get(process.env.DISCORD_GUILD_ID);
      if (!guild) return console.error('[DM] Guild introuvable (DISCORD_GUILD_ID)');

      // Catégorie où créer les tickets
      const parentId = process.env.DEV_TICKET_CATEGORY_ID || null;

      // Cherche si un salon pour cet utilisateur existe déjà
      const existing = guild.channels.cache.find(c => 
        c.type === ChannelType.GuildText &&
        c.parentId === parentId &&
        c.topic === `DM:${message.author.id}`
      );
      let channel = existing;

      // Crée le salon si pas trouvé
      if (!channel) {
        const name = `dm-${message.author.username}-${message.author.id}`.toLowerCase().slice(0, 90);
        try {
          channel = await guild.channels.create({
            name,
            type: ChannelType.GuildText,
            parent: parentId ?? undefined,
            topic: `DM:${message.author.id}`, // on s’y repère plus tard
            permissionOverwrites: [
              { id: guild.roles.everyone, deny: [PermissionsBitField.Flags.ViewChannel] },
              // le user voit son salon, peut écrire
              { id: message.author.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
              // le bot
              { id: client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.ManageChannels] },
            ],
            reason: `DM support pour ${message.author.tag} (${message.author.id})`,
          });
          await channel.send(`📥 **Nouveau DM ouvert par ${message.author.tag}** (ID: \`${message.author.id}\`)`);
        } catch (e) {
          console.error('[DM] Création salon échouée (permissions/catégorie ?):', e);
          // Si ça plante, au moins logguer dans le channel d’archive
          const logId = process.env.ALL_TICKET_LOGS;
          if (logId) {
            const logCh = await client.channels.fetch(logId).catch(() => null);
            if (logCh) await logCh.send(`⚠️ Impossible de créer le salon pour **${message.author.tag}**. Vérifie les permissions/catégorie.`);
          }
          return;
        }
      }

      // Relais DM -> salon staff
      const files = [...message.attachments.values()].map(a => a.url);
      const content = message.content?.trim() || (files.length ? '(fichier)' : '(vide)');
      await channel.send({ content: `**${message.author.tag}**: ${content}`, files }).catch(e => {
        console.error('[DM] Envoi vers salon staff KO:', e);
      });

      // Accusé de réception au joueur (silencieux si DM fermés)
      if (message.content) {
        await message.channel.send('✅ Support reçu. Un membre du staff te répond ici.').catch(()=>{});
      }

      // Log archive
      const logId = process.env.ALL_TICKET_LOGS;
      if (logId) {
        const logCh = await client.channels.fetch(logId).catch(() => null);
        if (logCh) await logCh.send(`🧾 **DM → Staff** | ${message.author.tag}\n${content}`);
      }
      return;
    }

    // B) Staff -> DM utilisateur (si on écrit dans un salon lié)
    if (message.guild && !message.author.bot) {
      const topic = message.channel?.topic || '';
      if (!topic.startsWith('DM:')) return; // pas un salon DM-relay

      const userId = topic.slice(3);
      const user = await client.users.fetch(userId).catch(()=>null);
      if (!user) return;

      const files = [...message.attachments.values()].map(a => a.url);
      const content = message.content?.trim() || (files.length ? '(fichier)' : '(vide)');

      await user.send({ content, files }).catch(async () => {
        await message.channel.send('⚠️ Impossible d’envoyer le message en DM (utilisateur fermé aux MP).');
      });

      const logId = process.env.ALL_TICKET_LOGS;
      if (logId) {
        const logCh = await client.channels.fetch(logId).catch(() => null);
        if (logCh) await logCh.send(`🧾 **Staff → DM** | ${message.member?.displayName || message.author.tag}\n${content}`);
      }
    }
  }
};
