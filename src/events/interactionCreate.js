const { ChannelType } = require('discord.js');
const { getUserByChannel, removeByChannel } = require('../services/store');
const { DELETE_ROLES, memberHasAnyRole } = require('../utils/perms');

module.exports = {
  name: 'interactionCreate',
  async execute(client, interaction) {
    if (!interaction.isButton()) return;

    const ch = interaction.channel;
    if (!ch || ch.type !== ChannelType.GuildText) return;

    const userId = getUserByChannel(ch.id);
    if (!userId) return interaction.reply({ content: 'Ce salon n’est pas lié à un DM.', ephemeral: true });

    if (interaction.customId === 'dm_close') {
      const closeCat = process.env.CLOSE_TICKET_CATEGORY_ID;
      const target = await client.users.fetch(userId).catch(()=>null);
      if (target) await target.send('✅ Votre discussion support a été **clôturée**. Vous pouvez rouvrir en réécrivant au bot.').catch(()=>{});
      if (closeCat) await ch.setParent(closeCat).catch(()=>{});
      await interaction.reply({ content: 'Salon **clôturé** et déplacé.', ephemeral: true });
      return;
    }

    if (interaction.customId === 'dm_delete') {
      // protection : seuls rôles sup peuvent supprimer
      if (!memberHasAnyRole(interaction.member, DELETE_ROLES)) {
        return interaction.reply({ content: '❌ Tu n’as pas la permission de **supprimer** ce ticket.', ephemeral: true });
      }
      removeByChannel(ch.id);
      await interaction.reply({ content: 'Salon supprimé…', ephemeral: true });
      await ch.delete('DM ticket supprimé par staff').catch(()=>{});
      return;
    }
  }
};
