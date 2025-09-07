module.exports = {
  name: 'ready',
  once: true,
  execute(client) {
    console.log(`[SLA] Connecté en tant que ${client.user.tag}`);
  },
};
