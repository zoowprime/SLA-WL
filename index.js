// Point d'entrée — démarre simplement le bot
require('dotenv').config({ path: 'id.env' });

const { startBot } = require('./src/bot');

startBot();
