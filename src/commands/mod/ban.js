const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { isMod } = require('../../utils/perms');
const { logCommand } = require('../../services/logs');

function higherOrEqual(me, other) {
  if (!me || !other) return false;
  return me.roles.highest.comparePositionTo(other.roles.highest) <= 0;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Bannit un utilisateur')
    .addUserOption(o => o.setName('cible').setDescription('Membre à bannir').setRequired(true))
    .addStringOption(o => o.setName('raison').setDescription('Raison').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction) {
    // if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ ephemeral: true });

    const user = interaction.options.getUser('cible');
    const reason = interaction.options.getString('raison') || '—';

    if (!isMod(interaction.member)) {
      return interaction.editReply('❌ Tu n’as pas la permission d’utiliser cette commande.');
    }
    if (!user) return interaction.editReply('❌ Utilisateur introuvable.');
    if (user.id === interaction.user.id) return interaction.editReply('❌ Tu ne peux pas te bannir toi-même.');
    if (user.id === interaction.client.user.id) return interaction.editReply('❌ Impossible de bannir le bot.');

    // Si l’utilisateur est dans la guilde, on vérifie aussi la hiérarchie
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (member && higherOrEqual(member, interaction.member)) {
      return interaction.editReply('❌ Tu ne peux pas bannir un membre de rôle supérieur/égal.');
    }

    try {
      await interaction.guild.members.ban(user.id, { reason: `[BAN] ${reason}` });
      await interaction.editReply(`🔨 <@${user.id}> a été **banni**. Raison: *${reason}*`);
      await logCommand(interaction.client, {
        user: interaction.user,
        command: 'ban',
        options: { target: user, reason },
        success: true
      });
    } catch (e) {
      await interaction.editReply('⚠️ Échec du ban (permissions manquantes ? rôle du bot trop bas ?).').catch(()=>{});
      await logCommand(interaction.client, {
        user: interaction.user,
        command: 'ban',
        options: { target: user, reason },
        success: false,
        error: e
      });
    }
  }
};
