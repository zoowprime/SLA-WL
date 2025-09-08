const { ensureOpenChannelForUser, logArchive } = require('../services/support');
const { logMessageCreate } = require('../services/logs'); // logs 'message envoyé' (embed rouge, italique)

module.exports = {
  name: 'messageCreate',
  async execute(client, message) {
    try {
      // ===== A) DM UTILISATEUR -> relayer vers salon staff (ou le créer) =====
      if (!message.guild && !message.author?.bot) {
        const guildId = process.env.DISCORD_GUILD_ID;
        if (!guildId) {
          console.error('[DM] DISCORD_GUILD_ID manquant');
          return;
        }

        const channel = await ensureOpenChannelForUser(client, message.author).catch((e) => {
          console.error('[DM] ensureOpenChannelForUser KO:', e);
          return null;
        });
        if (!channel) return;

        const files = [...message.attachments.values()].map(a => a.url);
        const content = message.content?.trim() || (files.length ? '(fichiers)' : '(vide)');

        await channel.send({
          content: `**${message.author.tag}**: ${content}`,
          files
        }).catch(() => {});

        // petit accusé côté joueur (silencieux si DM fermés)
        if (message.content) {
          await message.channel.send('✅ Support reçu. Un membre du staff va te répondre ici.').catch(() => {});
        }

        await logArchive(client, `🧾 **DM → Staff** | ${message.author.tag}\n${content}`);
        return;
      }

      // ===== B) GUILDE : soit STAFF -> DM si salon lié, soit log des messages =====
      if (message.guild && !message.author?.bot) {
        const topic = message.channel?.topic || '';

        // B1) STAFF -> DM (si on parle dans un salon lié à un DM)
        if (topic.startsWith('DM:')) {
          const userId = topic.slice(3);
          const user = await client.users.fetch(userId).catch(() => null);
          if (!user) return;

          const files = [...message.attachments.values()].map(a => a.url);
          const content = message.content?.trim() || (files.length ? '(fichiers)' : '(vide)');

          await user.send({ content, files }).catch(async () => {
            await message.channel.send('⚠️ Impossible d’envoyer le message en DM (MP fermés).');
          });

          await logArchive(
            client,
            `🧾 **Staff → DM** | ${message.member?.displayName || message.author.tag}\n${content}`
          );
          return;
        }

        // B2) Sinon : log des messages de la guilde (création)
        await logMessageCreate(client, message);
      }
    } catch (err) {
      console.error('[messageCreate] Uncaught error:', err);
    }
  }
};
