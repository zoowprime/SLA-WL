const { ChannelType } = require('discord.js');
const { memberHasAnyRole, DELETE_ROLES } = require('../utils/perms');
const { isOpenTicketChannel } = require('../services/support');
const store = require('../services/store');

module.exports = {
  name: 'interactionCreate',
  async execute(client, interaction) {
    if (!interaction.isButton()) return;

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
      // on garde le mapping: si fermé, on ne le réutilisera plus (il est hors catégorie open)
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
};
