const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || './data';
const FILE = path.join(DATA_DIR, 'dm-sessions.json');

function ensure() {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch {}
  if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, JSON.stringify({ byUser: {} }, null, 2));
}
ensure();

function read() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); }
  catch { return { byUser: {} }; }
}
function write(db) { fs.writeFileSync(FILE, JSON.stringify(db, null, 2)); }

function set(userId, channelId) {
  const db = read();
  db.byUser[userId] = { channelId, updatedAt: Date.now() };
  write(db);
}
function getChannel(userId) {
  const db = read();
  return db.byUser[userId]?.channelId || null;
}
function removeByChannel(channelId) {
  const db = read();
  for (const [uid, v] of Object.entries(db.byUser)) {
    if (v.channelId === channelId) { delete db.byUser[uid]; break; }
  }
  write(db);
}

module.exports = { set, getChannel, removeByChannel };
