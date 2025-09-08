const { logMessageDelete } = require('../services/logs');

module.exports = {
  name: 'messageDelete',
  async execute(client, msg) {
    if (!msg?.guild) return;
    await logMessageDelete(client, msg);
  }
};
