# VPS Deployment (CloudPanel + PM2 + Node 20)

This project builds a **Node SSR bundle** at `dist/server/server.js` plus
static client assets in `dist/client/`. A small launcher (`server.mjs`)
serves static files and delegates SSR to the bundle. Deploy on any VPS
(CloudPanel, Plesk, plain Ubuntu) behind Nginx.

Verified locally: `BUILD_TARGET=node bun run build` → `node server.mjs` →
HTTP 200 on `/`.

## 1. On the VPS — install runtime
```bash
curl -fsSL https://bun.sh/install | bash
export PATH="$HOME/.bun/bin:$PATH"
apt -y install nodejs   # Node 20+ required for server.mjs
npm install -g pm2
```

## 2. Get the code + build
```bash
cd ~/htdocs/callescort24.org
git clone <YOUR_REPO_URL> .
bun install
BUILD_TARGET=node bun run build   # MUST set BUILD_TARGET=node for VPS
```

## 3. Create `.env` (same folder)
```env
NODE_ENV=production
PORT=3000

SUPABASE_URL=https://jxvrfmekootjojxfovli.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_xPs_zW3F62yZYbCtg8jXvQ_RHdbOGiy
SUPABASE_SERVICE_ROLE_KEY=<from Lovable Cloud → Backend → Settings>
VITE_SUPABASE_URL=https://jxvrfmekootjojxfovli.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xPs_zW3F62yZYbCtg8jXvQ_RHdbOGiy
VITE_SUPABASE_PROJECT_ID=jxvrfmekootjojxfovli

PLISIO_API_KEY=<your key>
VITE_PAYMENTS_CLIENT_TOKEN=<your publishable token>
```

## 4. Start with PM2
```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup     # run the sudo line it prints, once
```
Check: `pm2 logs callescort` and `curl http://localhost:3000`.

## 5. CloudPanel — reverse proxy + SSL
In CloudPanel UI → create a **Node.js site** with App Port `3000`, then
**SSL/TLS → New Let's Encrypt Certificate**.

## Updating
```bash
git pull && bun install && bun run build && pm2 restart callescort
```
