const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isMod } = require('../../utils/perms');
const { logCommand } = require('../../services/logs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('wl')
    .setDescription('Ajoute un joueur à la whitelist et lui envoie un message de bienvenue en DM.')
    .addUserOption(o => o.setName('user').setDescription('Utilisateur à whitelister').setRequired(true))
    .addStringOption(o => o.setName('type').setDescription('Type de Whitelist').setRequired(true))
    .addStringOption(o => o.setName('infos').setDescription('Informations supplémentaires').setRequired(true))
    .addStringOption(o => o.setName('parraine').setDescription('Parrainé par').setRequired(false)),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const type = interaction.options.getString('type');
    const infos = interaction.options.getString('infos');
    const parraine = interaction.options.getString('parraine') || 'Aucun parrain';
    const wlBy = interaction.user; // celui qui fait la commande

    if (!isMod(interaction.member)) {
      await logCommand(interaction.client, {
        user: interaction.user,
        command: 'wl',
        options: { target: user, type, infos, parraine },
        success: false,
        error: 'Permission refusée',
      });
      return interaction.editReply('❌ Tu n’as pas la permission d’utiliser cette commande.');
    }

    // Embed d'infos WL
    const embed = new EmbedBuilder()
      .setColor(0xFF2D2D) // rouge
      .setTitle('📜 Informations de la Whitelist')
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '👤 Membre', value: `${user} \n(\`${user.id}\`)`, inline: false },
        { name: '🏷️ Type de Whitelist', value: type, inline: false },
        { name: 'ℹ️ Infos Supp.', value: infos, inline: false },
        { name: '🤝 Parrainé par', value: parraine, inline: false },
        { name: '✅ Whitelist par', value: `${wlBy}`, inline: false }
      )
      .setTimestamp();

    try {
      // Message principal + embed en DM
      await user.send(
        `**Bonjour ${user},**\n\n` +
        `Félicitations ! Vous avez été ajouté à la whitelist de **South Los Angeles** en tant que **${type}**.\n\n` +
        `**Informations supplémentaires :** ${infos}\n\n` +
        `Bienvenue sur le serveur !\n\n`,
      );
      await user.send({ embeds: [embed] });

      await interaction.editReply(`✅ ${user} a été whitelist avec succès et a reçu un DM.`);

      // Log commande OK
      await logCommand(interaction.client, {
        user: interaction.user,
        command: 'wl',
        options: { target: user, type, infos, parraine },
        success: true,
      });
    } catch (err) {
      await interaction.editReply(`⚠️ Impossible d’envoyer le DM à ${user}. Vérifie que ses MP sont ouverts.`);

      // Log commande KO
      await logCommand(interaction.client, {
        user: interaction.user,
        command: 'wl',
        options: { target: user, type, infos, parraine },
        success: false,
        error: err,
      });
    }
  }
};
