const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { isMod, botCanActOn } = require('../../utils/perms');
const { logCommand } = require('../../services/logs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Bannit un utilisateur')
    .addUserOption(o => o.setName('cible').setDescription('Membre à bannir').setRequired(true))
    .addStringOption(o => o.setName('raison').setDescription('Raison').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction) {
    const user = interaction.options.getUser('cible');
    const reason = interaction.options.getString('raison') || '—';

    if (!isMod(interaction.member)) return interaction.editReply('❌ Tu n’as pas la permission d’utiliser cette commande.');
    if (!user) return interaction.editReply('❌ Utilisateur introuvable.');
    if (user.id === interaction.user.id) return interaction.editReply('❌ Tu ne peux pas te bannir toi-même.');
    if (user.id === interaction.client.user.id) return interaction.editReply('❌ Impossible de bannir le bot.');

    // Si la cible est dans la guilde, on vérifie que le BOT peut agir
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (member && !botCanActOn(member, interaction.guild)) {
      return interaction.editReply('❌ Le bot n’a pas un rôle assez haut pour bannir cette cible.');
    }

    try {
      await interaction.guild.members.ban(user.id, { reason: `[BAN] ${reason}` });
      await interaction.editReply(`🔨 <@${user.id}> a été **banni**. Raison: *${reason}*`);
      await logCommand(interaction.client, { user: interaction.user, command: 'ban', options: { target: user, reason }, success: true });
    } catch (e) {
      await interaction.editReply('⚠️ Échec du ban (permissions/hiérarchie).').catch(()=>{});
      await logCommand(interaction.client, { user: interaction.user, command: 'ban', options: { target: user, reason }, success: false, error: e });
    }
  }
};
