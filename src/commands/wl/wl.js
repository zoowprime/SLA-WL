const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { isMod } = require('../../utils/perms');
const { logCommand } = require('../../services/logs');

const WL_ROLE_ID = process.env.WL_ROLE_ID;
const ORAL_A_FAIRE_ROLE_ID = process.env.ORAL_A_FAIRE_ROLE_ID; // rôle à retirer

function canManageRole(guild, roleId) {
  try {
    const me = guild.members.me;
    const role = guild.roles.cache.get(roleId);
    if (!me || !role) return false;
    // Le rôle du bot doit être STRICTEMENT au-dessus du rôle à modifier
    return me.roles.highest.comparePositionTo(role) > 0;
  } catch {
    return false;
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('wl')
    .setDescription('Whiteliste un joueur, lui envoie un DM et met à jour ses rôles.')
    .addUserOption(o => o.setName('user').setDescription('Utilisateur à whitelister').setRequired(true))
    .addStringOption(o => o.setName('type').setDescription('Type de Whitelist').setRequired(true))
    .addStringOption(o => o.setName('infos').setDescription('Informations supplémentaires').setRequired(true))
    .addStringOption(o => o.setName('parraine').setDescription('Parrainé par').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const type = interaction.options.getString('type');
    const infos = interaction.options.getString('infos');
    const parraine = interaction.options.getString('parraine') || 'Aucun parrain';
    const wlBy = interaction.user;

    // Permissions internes (tes rôles staff)
    if (!isMod(interaction.member)) {
      await logCommand(interaction.client, {
        user: interaction.user,
        command: 'wl',
        options: { target: user, type, infos, parraine },
        success: false,
        error: 'Permission refusée (rôles staff)',
      });
      return interaction.editReply('❌ Tu n’as pas la permission d’utiliser cette commande.');
    }

    // Vérifs d’IDs rôle
    if (!WL_ROLE_ID) {
      await interaction.editReply('❌ WL_ROLE_ID est manquant dans id.env.');
      return;
    }

    const guild = interaction.guild;
    const membre = await guild.members.fetch(user.id).catch(() => null);
    if (!membre) {
      await logCommand(interaction.client, {
        user: interaction.user,
        command: 'wl',
        options: { target: user, type, infos, parraine },
        success: false,
        error: 'Membre introuvable dans la guilde',
      });
      return interaction.editReply('❌ Cet utilisateur n’est pas dans la guilde.');
    }

    // Vérif que le bot peut gérer les rôles à ajouter/retirer
    if (!canManageRole(guild, WL_ROLE_ID)) {
      await interaction.editReply('❌ Le bot ne peut pas attribuer le rôle WL (hiérarchie insuffisante).');
      await logCommand(interaction.client, {
        user: interaction.user,
        command: 'wl',
        options: { target: user, type, infos, parraine },
        success: false,
        error: 'Bot trop bas pour WL_ROLE_ID',
      });
      return;
    }
    if (ORAL_A_FAIRE_ROLE_ID && !canManageRole(guild, ORAL_A_FAIRE_ROLE_ID)) {
      await interaction.editReply('❌ Le bot ne peut pas retirer le rôle oral (hiérarchie insuffisante).');
      await logCommand(interaction.client, {
        user: interaction.user,
        command: 'wl',
        options: { target: user, type, infos, parraine },
        success: false,
        error: 'Bot trop bas pour ORAL_A_FAIRE_ROLE_ID',
      });
      return;
    }

    // Construire l’embed d’infos WL (rouge + emojis)
    const embed = new EmbedBuilder()
      .setColor(0xFF2D2D)
      .setTitle('📜 Informations de la Whitelist')
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '👤 Membre', value: `${user}\n(\`${user.id}\`)`, inline: false },
        { name: '🏷️ Type de Whitelist', value: type, inline: false },
        { name: 'ℹ️ Infos Supp.', value: infos, inline: false },
        { name: '🤝 Parrainé par', value: parraine, inline: false },
        { name: '✅ Whitelist par', value: `${wlBy}`, inline: false },
      )
      .setTimestamp();

    let dmOk = true;
    try {
      // DM (texte principal)
      await user.send(
        `**Bonjour ${user},**\n\n` +
        `Félicitations ! Vous avez été ajouté à la whitelist de **South Los Angeles** en tant que **${type}**.\n\n` +
        `**Informations supplémentaires :** ${infos}\n\n` +
        `Bienvenue sur le serveur !\n\n`,
      );
      // DM (embed)
      await user.send({ embeds: [embed] });
    } catch {
      dmOk = false;
    }

    // Mise à jour des rôles
    let rolesOk = true;
    const ops = [];
    try {
      if (ORAL_A_FAIRE_ROLE_ID && membre.roles.cache.has(ORAL_A_FAIRE_ROLE_ID)) {
        ops.push('remove_oral');
        await membre.roles.remove(ORAL_A_FAIRE_ROLE_ID, '[WL] Retrait rôle ORAL').catch(() => { rolesOk = false; });
      }
      if (!membre.roles.cache.has(WL_ROLE_ID)) {
        ops.push('add_wl');
        await membre.roles.add(WL_ROLE_ID, '[WL] Ajout rôle WL').catch(() => { rolesOk = false; });
      }
    } catch {
      rolesOk = false;
    }

    // Réponse dans la slash
    if (dmOk && rolesOk) {
      await interaction.editReply(`✅ ${user} a été whitelist, DM envoyé et rôles mis à jour.`);
    } else if (!dmOk && rolesOk) {
      await interaction.editReply(`☑️ Rôles mis à jour, mais impossible d’envoyer un DM à ${user} (MP fermés).`);
    } else if (dmOk && !rolesOk) {
      await interaction.editReply(`⚠️ DM envoyé à ${user}, mais échec de la mise à jour des rôles (vérifie les permissions/hiérarchie).`);
    } else {
      await interaction.editReply(`⚠️ Échec DM et rôles. Vérifie les MP du joueur et les permissions/hiérarchie du bot.`);
    }

    // Logs commande
    await logCommand(interaction.client, {
      user: interaction.user,
      command: 'wl',
      options: {
        target: user,
        type,
        infos,
        parraine,
        rolesOps: ops.join(', ') || 'none',
        dmOk,
        rolesOk
      },
      success: dmOk && rolesOk,
      error: (dmOk && rolesOk) ? undefined : `dmOk=${dmOk}, rolesOk=${rolesOk}`
    });
  }
};
