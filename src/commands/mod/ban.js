const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { isMod } = require('../../utils/perms');
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

    if (!isMod(interaction.member)) {
      return interaction.reply({ content: '❌ Tu n’as pas la permission d’utiliser cette commande.', ephemeral: true });
    }
    if (!user) {
      return interaction.reply({ content: '❌ Utilisateur introuvable.', ephemeral: true });
    }

    try {
      await interaction.guild.members.ban(user.id, { reason: `[BAN] ${reason}` });
      await interaction.reply({ content: `🔨 <@${user.id}> a été **banni**. Raison: *${reason}*`, ephemeral: true });
      await logCommand(interaction.client, {
        user: interaction.user,
        command: 'ban',
        options: { target: user, reason },
        success: true
      });
    } catch (e) {
      await interaction.reply({ content: '⚠️ Échec du ban (permissions manquantes ?).', ephemeral: true }).catch(()=>{});
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
