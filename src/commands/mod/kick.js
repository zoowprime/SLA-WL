const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { isMod } = require('../../utils/perms');
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

    if (!isMod(interaction.member)) {
      return interaction.reply({ content: '❌ Tu n’as pas la permission d’utiliser cette commande.', ephemeral: true });
    }
    if (!member) {
      return interaction.reply({ content: '❌ Membre introuvable.', ephemeral: true });
    }

    try {
      await member.kick(`[KICK] ${reason}`);
      await interaction.reply({ content: `🥾 ${member} a été **expulsé**. Raison: *${reason}*`, ephemeral: true });
      await logCommand(interaction.client, {
        user: interaction.user,
        command: 'kick',
        options: { target: member.user, reason },
        success: true
      });
    } catch (e) {
      await interaction.reply({ content: '⚠️ Échec du kick (permissions manquantes ?).', ephemeral: true }).catch(()=>{});
      await logCommand(interaction.client, {
        user: interaction.user,
        command: 'kick',
        options: { target: member?.user, reason },
        success: false,
        error: e
      });
    }
  }
};
