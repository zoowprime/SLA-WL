const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || './data';
const FILE = path.join(DATA_DIR, 'dm-sessions.json');

function ensureDataDir() {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch {}
  if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, JSON.stringify({ map: {} }, null, 2));
}
ensureDataDir();

function load() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); }
  catch { return { map: {} }; }
}
function save(db) {
  fs.writeFileSync(FILE, JSON.stringify(db, null, 2));
}

function setSession(userId, channelId) {
  const db = load();
  db.map[userId] = { channelId, updatedAt: Date.now() };
  save(db);
}
function getChannelByUser(userId) {
  const db = load();
  return db.map[userId]?.channelId || null;
}
function getUserByChannel(channelId) {
  const db = load();
  const entry = Object.entries(db.map).find(([, v]) => v.channelId === channelId);
  return entry ? entry[0] : null;
}
function removeByChannel(channelId) {
  const db = load();
  for (const [uid, v] of Object.entries(db.map)) {
    if (v.channelId === channelId) { delete db.map[uid]; break; }
  }
  save(db);
}

module.exports = { setSession, getChannelByUser, getUserByChannel, removeByChannel };
