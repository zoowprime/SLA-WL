const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { isMod, botCanActOn } = require('../../utils/perms');
const { logCommand } = require('../../services/logs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Expulse un membre')
    .addUserOption(o => o.setName('cible').setDescription('Membre à kick').setRequired(true))
    .addStringOption(o => o.setName('raison').setDescription('Raison').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  async execute(interaction) {
    const member = interaction.options.getMember('cible');
    const reason = interaction.options.getString('raison') || '—';

    if (!isMod(interaction.member)) return interaction.editReply('❌ Tu n’as pas la permission d’utiliser cette commande.');
    if (!member) return interaction.editReply('❌ Membre introuvable.');
    if (member.id === interaction.user.id) return interaction.editReply('❌ Tu ne peux pas te kick toi-même.');
    if (member.id === interaction.client.user.id) return interaction.editReply('❌ Impossible de kick le bot.');
    if (!botCanActOn(member, interaction.guild)) return interaction.editReply('❌ Le bot n’a pas un rôle assez haut pour agir sur cette cible.');

    try {
      await member.kick(`[KICK] ${reason}`);
      await interaction.editReply(`🥾 ${member} a été **expulsé**. Raison: *${reason}*`);
      await logCommand(interaction.client, { user: interaction.user, command: 'kick', options: { target: member.user, reason }, success: true });
    } catch (e) {
      await interaction.editReply('⚠️ Échec du kick (permissions/hiérarchie).').catch(()=>{});
      await logCommand(interaction.client, { user: interaction.user, command: 'kick', options: { target: member?.user, reason }, success: false, error: e });
    }
  }
};
