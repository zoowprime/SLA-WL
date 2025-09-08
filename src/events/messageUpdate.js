const { logMessageEdit } = require('../services/logs');

module.exports = {
  name: 'messageUpdate',
  async execute(client, oldMsg, newMsg) {
    try {
      if (oldMsg?.partial) oldMsg = await oldMsg.fetch().catch(()=>oldMsg);
      if (newMsg?.partial) newMsg = await newMsg.fetch().catch(()=>newMsg);
    } catch {}
    if (!newMsg?.guild || newMsg?.author?.bot) return;
    await logMessageEdit(client, oldMsg, newMsg);
  }
};
