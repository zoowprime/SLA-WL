# SLA Bot Core (JS)

- Node.js runtime
- Token **uniquement** sur Render: `BOT_TOKEN=********`
- Autres IDs dans `id.env` (commit OK)
- Build command (Render): `npm ci`
- Start command (Render): `node index.js`

## Locally
1. `cp id.env id.env.local` (optionnel)
2. Remplir `DISCORD_CLIENT_ID` et `DISCORD_GUILD_ID` dans `id.env`
3. Exporter un token local si besoin: `export BOT_TOKEN=...`
4. `npm ci`
5. `npm run deploy`
6. `npm start`
