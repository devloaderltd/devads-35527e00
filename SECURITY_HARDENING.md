# Security Hardening Checklist — CallEscort24

Living document. Re-review every quarter.

## 1. VPS / OS
- [ ] SSH: key-only auth, `PermitRootLogin no`, `PasswordAuthentication no`
- [ ] SSH on non-default port (e.g. 2222)
- [ ] `fail2ban` installed and enabled for sshd + nginx
- [ ] UFW: deny incoming by default; allow only SSH, 80, 443, CloudPanel admin
- [ ] App port 3000 bound to `127.0.0.1` only (never public)
- [ ] `unattended-upgrades` for security patches
- [ ] Non-root user runs Bun/PM2
- [ ] `chmod 600 .env` and owned by app user

## 2. CloudPanel
- [ ] Strong unique admin password + 2FA enabled
- [ ] Admin port 8443 firewalled to your IP only
- [ ] `sudo clpctl update` monthly
- [ ] phpMyAdmin / Adminer NOT exposed publicly
- [ ] Nightly DB backups + offsite copy (rclone → S3/B2)

## 3. Nginx
- [ ] Force HTTPS redirect (Let's Encrypt via CloudPanel)
- [ ] Security headers: HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- [ ] Rate limit `/login`, `/signup`, `/api/public/*`
- [ ] Hide `Server` header

```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "geolocation=(), camera=(), microphone=()" always;
server_tokens off;

limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;
location /login { limit_req zone=login burst=5 nodelay; proxy_pass http://127.0.0.1:3000; }
```

## 4. Cloudflare (recommended)
- [ ] Domain proxied through Cloudflare (orange cloud)
- [ ] SSL mode: Full (Strict)
- [ ] "Always Use HTTPS" on
- [ ] WAF Managed Rules + Bot Fight Mode
- [ ] Rate limiting rule on `/login` and `/signup`

## 5. Application / Supabase
- [x] RLS enabled on all user-data tables
- [x] Roles in separate `user_roles` table with `has_role()` SECURITY DEFINER
- [x] `phone` / `whatsapp` revoked at column level; only via `reveal_listing_contact()`
- [x] `profiles` sensitive fields revoked at column level (kyc_*, *_verified_at)
- [x] Plisio webhook signature verification
- [x] HIBP leaked-password check enabled
- [ ] CAPTCHA (Cloudflare Turnstile / hCaptcha) on signup + login
- [ ] Rate limit on `/api/public/*` server routes
- [ ] Rotate `SUPABASE_SERVICE_ROLE_KEY` quarterly
- [ ] Rotate `PLISIO_API_KEY` quarterly

## 6. Dependencies
- [ ] `bun update` + `bun audit` monthly
- [ ] Subscribe to GitHub security alerts on the repo

## 7. Monitoring
- [ ] `pm2 logs callescort` reviewed weekly
- [ ] CloudPanel access log scanned for repeated 401/403
- [ ] Set up uptime monitor (UptimeRobot / BetterStack)

## 8. Incident response
- [ ] DB restore drill performed (see `scripts/db-restore.sh`)
- [ ] Emergency contact list (domain registrar, Cloudflare, Supabase, VPS)
- [ ] Documented procedure to rotate all secrets in <30 min

---

## Common attacks → defenses

| Attack | Defense |
|---|---|
| SSH brute force | fail2ban + key auth + non-default port |
| DDoS | Cloudflare proxy |
| Credential stuffing | HIBP + CAPTCHA + rate limit |
| SQL injection | Parameterized queries (Supabase SDK) |
| XSS | React escaping + CSP header |
| CSRF | JWT bearer in Authorization header (not cookies) |
| RLS bypass | Column-level grants + server-side RPCs for sensitive ops |
| Webhook spoofing | HMAC signature verification |
| Stolen service key | `.env` perms 600 + quarterly rotation |
