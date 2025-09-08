const { EmbedBuilder } = require('discord.js');

const COLOR_RED = 0xFF2D2D;
const CMD_LOG_CH = process.env.COMMANDS_LOGS_CHANNEL_ID || process.env.ALL_TICKET_LOGS;
const MSG_LOG_CH = process.env.MESSAGE_LOGS_CHANNEL_ID || process.env.ALL_TICKET_LOGS;

async function sendTo(client, channelId, payload) {
  if (!channelId) return;
  const ch = await client.channels.fetch(channelId).catch(()=>null);
  if (!ch) return;
  await ch.send(payload).catch(()=>{});
}

function italic(text) {
  return text ? `*${text}*` : '*—*';
}

// —— Logs de commandes
async function logCommand(client, { user, command, options, success, error }) {
  const e = new EmbedBuilder()
    .setColor(COLOR_RED)
    .setTitle('🔧 Commande de modération')
    .setDescription(italic(`Commande utilisée: /${command}`))
    .addFields(
      { name: '👤 Utilisateur', value: `<@${user.id}>`, inline: true },
      { name: '✅ Succès', value: success ? '*Oui*' : '*Non*', inline: true },
      ...(options?.target ? [{ name: '🎯 Cible', value: `<@${options.target.id}> (\`${options.target.id}\`)`, inline: false }] : []),
      ...(options?.reason ? [{ name: '📝 Raison', value: italic(options.reason), inline: false }] : []),
      ...(error ? [{ name: '⚠️ Erreur', value: '```' + String(error).slice(0, 900) + '```', inline: false }] : [])
    )
    .setTimestamp();
  await sendTo(client, CMD_LOG_CH, { embeds: [e] });
}

// —— Logs messages (create)
async function logMessageCreate(client, msg) {
  if (!msg.guild || msg.author?.bot) return;
  if (String(msg.channelId) === String(MSG_LOG_CH)) return; // évite la boucle
  const e = new EmbedBuilder()
    .setColor(COLOR_RED)
    .setTitle('📝 Nouveau message')
    .setDescription(italic('Message envoyé'))
    .addFields(
      { name: '👤 Auteur', value: `<@${msg.author.id}> (\`${msg.author.id}\`)`, inline: true },
      { name: '📺 Salon', value: `<#${msg.channelId}>`, inline: true },
      { name: '🔗 Lien', value: msg.url ?? '*—*', inline: false },
      { name: '💬 Contenu', value: italic(msg.content?.slice(0, 1900) || '(vide)'), inline: false },
    )
    .setTimestamp(msg.createdAt ?? new Date());
  await sendTo(client, MSG_LOG_CH, { embeds: [e] });
}

// —— Logs messages (edit)
async function logMessageEdit(client, oldMsg, newMsg) {
  if (!newMsg.guild || newMsg.author?.bot) return;
  if (String(newMsg.channelId) === String(MSG_LOG_CH)) return;
  const before = oldMsg?.content ?? '(inconnu / non-caché)';
  const after = newMsg?.content ?? '(vide)';
  const e = new EmbedBuilder()
    .setColor(COLOR_RED)
    .setTitle('✏️ Message modifié')
    .setDescription(italic('Contenu modifié (avant / après)'))
    .addFields(
      { name: '👤 Auteur', value: `<@${newMsg.author.id}> (\`${newMsg.author.id}\`)`, inline: true },
      { name: '📺 Salon', value: `<#${newMsg.channelId}>`, inline: true },
      { name: '🔗 Lien', value: newMsg.url ?? '*—*', inline: false },
      { name: '⬅️ Avant', value: italic(before?.slice(0, 950)), inline: false },
      { name: '➡️ Après', value: italic(after?.slice(0, 950)), inline: false },
    )
    .setTimestamp(new Date());
  await sendTo(client, MSG_LOG_CH, { embeds: [e] });
}

// —— Logs messages (delete)
async function logMessageDelete(client, msg) {
  if (!msg.guild) return;
  // si le message n’est pas en cache, author peut être null
  const author = msg.author ? `<@${msg.author.id}> (\`${msg.author.id}\`)` : '*Inconnu*';
  const e = new EmbedBuilder()
    .setColor(COLOR_RED)
    .setTitle('🗑️ Message supprimé')
    .setDescription(italic('Message supprimé'))
    .addFields(
      { name: '👤 Auteur', value: author, inline: true },
      { name: '📺 Salon', value: `<#${msg.channelId}>`, inline: true },
      { name: '💬 Dernier contenu connu', value: italic(msg.content?.slice(0, 1900) || '(non disponible)'), inline: false },
    )
    .setTimestamp(new Date());
  await sendTo(client, MSG_LOG_CH, { embeds: [e] });
}

module.exports = {
  logCommand, logMessageCreate, logMessageEdit, logMessageDelete,
};
