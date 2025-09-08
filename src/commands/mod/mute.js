const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { isMod } = require('../../utils/perms');
const { logCommand } = require('../../services/logs');

// Mute = timeout (par défaut 10 minutes)
const DEFAULT_MINUTES = Number(process.env.MUTE_DEFAULT_MINUTES || 10);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Met en sourdine (timeout) un membre')
    .addUserOption(o => o.setName('cible').setDescription('Membre à mute').setRequired(true))
    .addStringOption(o => o.setName('raison').setDescription('Raison').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const member = interaction.options.getMember('cible');
    const reason = interaction.options.getString('raison') || '—';

    // Vérif rôles maison
    if (!isMod(interaction.member)) {
      return interaction.reply({ content: '❌ Tu n’as pas la permission d’utiliser cette commande.', ephemeral: true });
    }
    if (!member) {
      return interaction.reply({ content: '❌ Membre introuvable.', ephemeral: true });
    }

    const ms = DEFAULT_MINUTES * 60 * 1000;
    try {
      await member.timeout(ms, `[MUTE] ${reason}`);
      await interaction.reply({ content: `🔇 ${member} a été **muté** ${DEFAULT_MINUTES} min. Raison: *${reason}*`, ephemeral: true });
      await logCommand(interaction.client, {
        user: interaction.user,
        command: 'mute',
        options: { target: member.user, reason },
        success: true
      });
    } catch (e) {
      await interaction.reply({ content: '⚠️ Échec du mute (permissions manquantes ?).', ephemeral: true }).catch(()=>{});
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
