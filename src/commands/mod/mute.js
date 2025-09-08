const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { isMod } = require('../../utils/perms');
const { logCommand } = require('../../services/logs');

const DEFAULT_MINUTES = Number(process.env.MUTE_DEFAULT_MINUTES || 10);

function higherOrEqual(me, other) {
  if (!me || !other) return false;
  return me.roles.highest.comparePositionTo(other.roles.highest) <= 0;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Met en sourdine (timeout) un membre')
    .addUserOption(o => o.setName('cible').setDescription('Membre à mute').setRequired(true))
    .addStringOption(o => o.setName('raison').setDescription('Raison').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    // si tu n’as PAS mis le defer global dans interactionCreate, décommente :
    // if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ ephemeral: true });

    const member = interaction.options.getMember('cible');
    const reason = interaction.options.getString('raison') || '—';

    if (!isMod(interaction.member)) {
      return interaction.editReply('❌ Tu n’as pas la permission d’utiliser cette commande.');
    }
    if (!member) return interaction.editReply('❌ Membre introuvable.');
    if (member.id === interaction.user.id) return interaction.editReply('❌ Tu ne peux pas te mute toi-même.');
    if (member.id === interaction.client.user.id) return interaction.editReply('❌ Impossible de mute le bot.');
    if (higherOrEqual(member, interaction.member)) return interaction.editReply('❌ Tu ne peux pas mute un membre de rôle supérieur/égal.');

    const ms = DEFAULT_MINUTES * 60 * 1000;

    try {
      await member.timeout(ms, `[MUTE] ${reason}`);
      await interaction.editReply(`🔇 ${member} a été **muté** ${DEFAULT_MINUTES} min. Raison: *${reason}*`);
      await logCommand(interaction.client, {
        user: interaction.user,
        command: 'mute',
        options: { target: member.user, reason },
        success: true
      });
    } catch (e) {
      await interaction.editReply('⚠️ Échec du mute (permissions manquantes ? rôle du bot trop bas ?).').catch(()=>{});
      await logCommand(interaction.client, {
        user: interaction.user,
        command: 'mute',
        options: { target: member?.user, reason },
        success: false,
        error: e
      });
    }
  }
};
