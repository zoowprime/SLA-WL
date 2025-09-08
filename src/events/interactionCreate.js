const { logCommand } = require('../services/logs');
const { memberHasAnyRole, DELETE_ROLES } = require('../utils/perms');
const { ChannelType } = require('discord.js');
const { isOpenTicketChannel } = require('../services/support');
const store = require('../services/store');

module.exports = {
  name: 'interactionCreate',
  async execute(client, interaction) {
    // ===== Slash commands =====
    if (interaction.isChatInputCommand()) {
      const cmd = interaction.client.commands.get(interaction.commandName);
      if (!cmd) return;
      try {
        await cmd.execute(interaction);
        // (Chaque commande appelle déjà logCommand à la fin)
      } catch (e) {
        await interaction.reply({ content: '❌ Erreur lors de la commande.', ephemeral: true }).catch(()=>{});
        await logCommand(client, {
          user: interaction.user,
          command: interaction.commandName,
          options: {},
          success: false,
          error: e
        });
      }
      return;
    }

    // ===== Boutons (DM tickets) =====
    if (interaction.isButton()) {
      const ch = interaction.channel;
      if (!ch || ch.type !== ChannelType.GuildText) return;

      const topic = ch.topic || '';
      if (!topic.startsWith('DM:')) return;

      const userId = topic.slice(3);

      if (interaction.customId === 'dm_close') {
        const closeCat = process.env.CLOSE_TICKET_CATEGORY_ID;
        if (isOpenTicketChannel(ch) && closeCat) {
          await ch.setParent(closeCat).catch(()=>{});
        }
        await interaction.reply({ content: '✅ Ticket **clôturé** et déplacé.', ephemeral: true });
        return;
      }

      if (interaction.customId === 'dm_delete') {
        if (!memberHasAnyRole(interaction.member, DELETE_ROLES)) {
          return interaction.reply({ content: '❌ Tu n’as pas la permission de **supprimer** ce ticket.', ephemeral: true });
        }
        store.removeByChannel(ch.id);
        await interaction.reply({ content: '🗑️ Ticket supprimé.', ephemeral: true });
        await ch.delete('Ticket DM supprimé').catch(()=>{});
        return;
      }
    }
  }
};
