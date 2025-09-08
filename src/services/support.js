const {
  PermissionsBitField,
  ChannelType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

const store = require('./store');
const { TALK_ROLES } = require('../utils/perms');

function isOpenTicketChannel(channel) {
  const closedCat = process.env.CLOSE_TICKET_CATEGORY_ID || null;
  return channel && channel.type === ChannelType.GuildText && channel.parentId !== closedCat;
}

async function ensureGuild(client) {
  const gid = process.env.DISCORD_GUILD_ID;
  if (!gid) throw new Error('DISCORD_GUILD_ID manquant');
  const guild = await client.guilds.fetch(gid);
  return guild;
}

async function ensureOpenChannelForUser(client, user) {
  const guild = await ensureGuild(client);
  const parentId = process.env.DEV_TICKET_CATEGORY_ID || null;

  // 1) Si on a un channel persistant et qu’il est encore ouvert → réutilise
  const existingId = store.getChannel(user.id);
  if (existingId) {
    const existing = await client.channels.fetch(existingId).catch(() => null);
    if (existing && isOpenTicketChannel(existing)) return existing;
    // sinon on laissera recréer plus bas
  }

  // 2) Sinon, tente de retrouver par topic (cas où le JSON a été perdu)
  let channel = null;
  try {
    const chans = await guild.channels.fetch();
    channel = chans.find(c => c?.type === ChannelType.GuildText && c?.topic === `DM:${user.id}`) || null;
    if (channel && isOpenTicketChannel(channel)) {
      store.set(user.id, channel.id);
      return channel;
    }
  } catch {}

  // 3) Créer un nouveau salon
  const overwrites = [
    { id: guild.roles.everyone, deny: [PermissionsBitField.Flags.ViewChannel] },
    // rôles staff autorisés à parler
    ...TALK_ROLES.map(id => ({
      id, allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ReadMessageHistory,
      ],
    })),
    // le joueur voit son salon
    { id: user.id, allow: [
      PermissionsBitField.Flags.ViewChannel,
      PermissionsBitField.Flags.SendMessages,
      PermissionsBitField.Flags.ReadMessageHistory,
    ]},
  ];

  const name = `dm-${user.username}-${user.id}`.toLowerCase().slice(0, 90);

  channel = await guild.channels.create({
    name,
    type: ChannelType.GuildText,
    parent: parentId ?? undefined,
    topic: `DM:${user.id}`,
    permissionOverwrites: overwrites,
    reason: `DM support pour ${user.tag} (${user.id})`,
  });

  // panneau de contrôle
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('dm_close').setLabel('Clôturer').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('dm_delete').setLabel('Supprimer').setStyle(ButtonStyle.Danger),
  );

  const embed = new EmbedBuilder()
    .setTitle('📥 Nouveau DM ouvert')
    .setDescription(`Utilisateur : **${user.tag}**\nID : \`${user.id}\``)
    .setTimestamp();

  await channel.send({ embeds: [embed], components: [row] });

  store.set(user.id, channel.id);
  return channel;
}

async function logArchive(client, payload) {
  const id = process.env.ALL_TICKET_LOGS;
  if (!id) return;
  const ch = await client.channels.fetch(id).catch(() => null);
  if (!ch) return;
  await ch.send(payload).catch(() => {});
}

module.exports = { ensureOpenChannelForUser, logArchive, isOpenTicketChannel };
