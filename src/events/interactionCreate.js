const { ChannelType } = require('discord.js');
const { logCommand } = require('../services/logs');
const { memberHasAnyRole, DELETE_ROLES } = require('../utils/perms');
const { isOpenTicketChannel } = require('../services/support');
const store = require('../services/store');

module.exports = {
  name: 'interactionCreate',
  async execute(client, interaction) {
    try {
      // ===== Slash commands =====
      if (interaction.isChatInputCommand()) {
        const cmd = interaction.client.commands.get(interaction.commandName);
        if (!cmd) return;

        // Auto-defer si la commande tarde (sécurité anti 3s)
        // -> on défère tout de suite, comme ça on est tranquille
        if (!interaction.deferred && !interaction.replied) {
          await interaction.deferReply({ ephemeral: true }).catch(()=>{});
        }

        try {
          await cmd.execute(interaction); // dans tes commandes, utilise editReply/followUp
          // (Chaque commande peut appeler logCommand; sinon on peut log ici)
        } catch (e) {
          await logCommand(client, {
            user: interaction.user,
            command: interaction.commandName,
            options: {},
            success: false,
            error: e
          });
          if (interaction.deferred && !interaction.replied) {
            await interaction.editReply('❌ Erreur lors de la commande.').catch(()=>{});
          } else if (!interaction.replied) {
            await interaction.reply({ content: '❌ Erreur lors de la commande.', ephemeral: true }).catch(()=>{});
          }
        }
        return;
      }

      // ===== Boutons (DM tickets) =====
      if (interaction.isButton()) {
        // Déférer tout de suite pour éviter le timeout
        let acked = false;
        if (!interaction.deferred && !interaction.replied) {
          // pour un bouton qui modifie l’UI en place, on peut faire deferUpdate();
          await interaction.deferReply({ ephemeral: true }).catch(()=>{});
          acked = true;
        }

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
          if (acked) await interaction.editReply('✅ Ticket **clôturé** et déplacé.').catch(()=>{});
          else await interaction.reply({ content: '✅ Ticket **clôturé** et déplacé.', ephemeral: true }).catch(()=>{});
          return;
        }

        if (interaction.customId === 'dm_delete') {
          if (!memberHasAnyRole(interaction.member, DELETE_ROLES)) {
            if (acked) await interaction.editReply('❌ Tu n’as pas la permission de **supprimer** ce ticket.').catch(()=>{});
            else await interaction.reply({ content: '❌ Tu n’as pas la permission de **supprimer** ce ticket.', ephemeral: true }).catch(()=>{});
            return;
          }
          store.removeByChannel(ch.id);
          if (acked) await interaction.editReply('🗑️ Ticket supprimé.').catch(()=>{});
          else await interaction.reply({ content: '🗑️ Ticket supprimé.', ephemeral: true }).catch(()=>{});
          await ch.delete('Ticket DM supprimé').catch(()=>{});
          return;
        }
      }
    } catch (err) {
      // Dernier filet
      try {
        if (interaction?.isRepliable() && !interaction.deferred && !interaction.replied) {
          await interaction.reply({ content: '❌ Erreur inattendue.', ephemeral: true });
        }
      } catch {}
      console.error('[interactionCreate] Uncaught:', err);
    }
  }
};
