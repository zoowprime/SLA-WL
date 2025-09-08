const { PermissionsBitField, ChannelType, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { setSession } = require('./store');
const { TALK_ROLES, DELETE_ROLES } = require('../utils/perms');

async function ensureSupportChannel(client, guild, user) {
  // Existe déjà ?
  const existingId = require('./store').getChannelByUser(user.id);
  if (existingId) {
    try { const ch = await client.channels.fetch(existingId); if (ch) return ch; } catch {}
  }

  // Catégorie cible
  const categoryId = process.env.DEV_TICKET_CATEGORY_ID;
  const category = categoryId ? await client.channels.fetch(categoryId).catch(() => null) : null;

  // Overwrites : visible des rôles staff, du bot, et du user
  const overwrites = [
    { id: guild.roles.everyone, deny: [PermissionsBitField.Flags.ViewChannel] },
    // Rôles staff pouvant parler
    ...TALK_ROLES.map(id => ({ id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] })),
    // User (auteur DM)
    { id: user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
  ];

  const name = `dm-${user.username}-${user.id}`.slice(0, 90);
  const channel = await guild.channels.create({
    name,
    type: ChannelType.GuildText,
    parent: category ?? undefined,
    permissionOverwrites: overwrites,
    reason: `DM support pour ${user.tag} (${user.id})`,
  });

  // Panneau de contrôle (boutons)
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('dm_close').setLabel('Clôturer').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('dm_delete').setLabel('Supprimer').setStyle(ButtonStyle.Danger),
  );

  const embed = new EmbedBuilder()
    .setTitle('📥 Nouveau DM')
    .setDescription(`Utilisateur : **${user.tag}**\nID : \`${user.id}\``)
    .setTimestamp(new Date());

  await channel.send({ embeds: [embed], components: [row] });

  setSession(user.id, channel.id);
  return channel;
}

async function logToArchive(client, payload) {
  const logId = process.env.ALL_TICKET_LOGS;
  if (!logId) return;
  const ch = await client.channels.fetch(logId).catch(() => null);
  if (!ch) return;
  await ch.send(payload).catch(() => {});
}

module.exports = { ensureSupportChannel, logToArchive, DELETE_ROLES };
