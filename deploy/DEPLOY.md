# Fursad — VPS deployment runbook

Target: your own VPS + a Namecheap domain, self-hosted MongoDB, Nginx as the
front door, PM2 keeping the API alive. No managed platform, no Atlas.

Work through this top to bottom. Replace `yourdomain.com` and `YOUR_VPS_IP`
everywhere with the real values. Run the numbered commands on the VPS over
SSH unless marked "on Namecheap" or "on your machine".

---

## 0. Before you start

- [ ] You can SSH into the VPS as root or a sudo user
- [ ] You know the VPS's public IP
- [ ] You have the domain in a Namecheap account
- [ ] Your Gemini API key and SMTP (Gmail app password) are on hand
- [ ] The repo is pushed to GitHub (`git push origin main`) — confirm with
      `git status` and `git log -1` locally first. `.env` is gitignored, so
      this is safe; nothing secret goes up.

---

## 1. Point the domain at the VPS (on Namecheap)

Namecheap dashboard → Domain List → Manage → Advanced DNS → Add:

| Type | Host | Value | TTL |
|---|---|---|---|
| A Record | @ | YOUR_VPS_IP | Automatic |
| A Record | www | YOUR_VPS_IP | Automatic |

DNS can take anywhere from a few minutes to a couple of hours to propagate.
Do this step **first** — it's the only thing on this list with a wait built
in, so get it going before you touch the server.

Check propagation from your own machine while you work through the rest:
```
nslookup yourdomain.com
```

---

## 2. Base server setup (on the VPS)

Assumes Ubuntu 22.04/24.04. Adjust package manager commands if it's Debian —
everything else is the same.

```bash
sudo apt update && sudo apt upgrade -y

# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Nginx, git, build tools
sudo apt install -y nginx git build-essential

# PM2 (keeps the API running, restarts it on crash or reboot)
sudo npm install -g pm2

# Firewall — only SSH, HTTP, HTTPS reach the outside world
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### MongoDB (self-hosted, local only — never exposed to the internet)

```bash
curl -fsSL https://pgp.mongodb.com/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl enable --now mongod
sudo systemctl status mongod   # should say "active (running)"
```

MongoDB's default config already binds to `127.0.0.1` only — leave it that
way. It never needs to be reachable from outside the VPS since the Node app
running on the same machine is the only thing that talks to it. Do **not**
open port 27017 in the firewall.

---

## 3. Get the code onto the VPS

```bash
sudo mkdir -p /var/www
cd /var/www
sudo git clone https://github.com/Garsame/FursadPlatform.git fursad
sudo chown -R $USER:$USER /var/www/fursad
cd /var/www/fursad
```

(If the repo isn't pushed yet, do that from your desktop first — `git push
origin main` — then clone. Pushing straight from Windows to the VPS without
GitHub in between is also possible via `scp`/`rsync` but is more fiddly under
time pressure; GitHub as the handoff point is simpler.)

---

## 4. Backend environment

```bash
cd /var/www/fursad/fursad/backend
cp .env.example .env
```

Generate two **fresh** secrets, don't reuse anything from your local machine
or from `.env.example` — freshest and simplest is to generate them directly
on the VPS:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Now edit `.env` (`nano .env`) and fill in **every** field — this is the
checklist that matters most, since a missed var here is the most common way
a "working locally" app breaks in production:

```env
PORT=5000
NODE_ENV=production
CLIENT_URL=https://yourdomain.com
MONGO_URI=mongodb://localhost:27017/Fursad_Platform
JWT_EXPIRES_IN=7d
OTP_EXPIRES_MINUTES=10

JWT_SECRET=<the first generated value>
ADMIN_SECRET=<the second generated value>

GEMINI_API_KEY=<your key>
GEMINI_MODEL=gemini-3.5-flash
GEMINI_EMBED_MODEL=gemini-embedding-2

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<your gmail address>
SMTP_PASSWORD=<gmail app password, spaces are fine, code strips them>
EMAIL_FROM=<same as SMTP_USER, or a display name>
MANAGEMENT_EMAIL=<where contact-form enquiries should land>

# Critical: Nginx is one proxy hop in front of the API. Without this, rate
# limiting collapses every visitor into one shared bucket and a handful of
# people signing up around the same time can lock everyone out.
TRUST_PROXY=1
```

Double-check `GEMINI_MODEL` and `GEMINI_EMBED_MODEL` are set exactly as
above — the code's built-in fallback values are older models you never
tested against, and they only kick in if these two lines are missing.

Install backend dependencies:

```bash
npm install --production=false
npm test
```

`npm test` should pass all three checks. If it doesn't, stop here and fix
that before going further — it's the same suite that's already been
validated locally, so a failure here means something about the VPS
environment differs (usually a missing env var).

---

## 5. Frontend build

Vite reads `frontend/.env` **at build time**, not runtime — so this file has
to exist with the real production URLs *before* you run the build.

```bash
cd /var/www/fursad/fursad/frontend
cat > .env << 'EOF'
VITE_API_URL=https://yourdomain.com/api
VITE_SOCKET_URL=https://yourdomain.com
EOF

npm install
npm run build
```

This produces `frontend/dist/` — the static files Nginx will serve directly.
If you change the domain later, you must edit `.env` and run `npm run build`
again; editing it after the build does nothing.

---

## 6. Start the API with PM2

From the repo root:

```bash
cd /var/www/fursad/fursad
```

Save the `ecosystem.config.js` file below at `/var/www/fursad/fursad/ecosystem.config.js`,
then:

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup    # follow the one printed command to enable on-boot start
pm2 logs fursad-api --lines 50   # confirm it says "MongoDB Connected" and
                                  # "Server running in production mode"
```

---

## 7. Nginx + SSL

Save the `nginx-fursad.conf` file below to
`/etc/nginx/sites-available/fursad`, editing `yourdomain.com` to your real
domain, then:

```bash
sudo ln -s /etc/nginx/sites-available/fursad /etc/nginx/sites-enabled/fursad
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t          # must say "syntax is ok" / "test is successful"
sudo systemctl reload nginx
```

Now get a free TLS certificate — Certbot edits the Nginx config in place to
add the HTTPS server block and redirect, so run this **after** the config
above is live:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Answer its prompts (email, agree to terms, redirect HTTP→HTTPS: yes).
Certbot auto-renews via a systemd timer — nothing further to do.

---

## 8. Smoke test — do this before you present, not during

Open `https://yourdomain.com` in an actual browser (not just curl) and walk
the full loop once, live on the deployed URL:

- [ ] Public site loads over HTTPS, no mixed-content warnings
- [ ] Sign up a jobseeker → verification email arrives (check spam) or, if
      SMTP isn't configured yet, check `pm2 logs fursad-api` for the
      `[MAIL FALLBACK]` printed code
- [ ] Sign in, complete the profile to 70%+, upload a CV, confirm it parses
- [ ] Sign up an employer at `/provider/signup`, complete the company
      profile, post a job
- [ ] Sign up an admin at `/admin/signup` (needs `ADMIN_SECRET`), approve the
      pending job
- [ ] Back on the jobseeker side, the job appears and can be applied to
- [ ] Employer sees the applicant, opens the AI shortlist
- [ ] Send a message from the employer side, confirm the candidate receives
      it live (this is the real Socket.IO test — if messages don't arrive
      without a refresh, the `/socket.io/` Nginx proxy block is the first
      thing to check)
- [ ] Log in as admin, confirm the analytics charts show real numbers, not
      zeros-with-an-error

If the Socket.IO step fails: `sudo nginx -t`, confirm the `/socket.io/`
location block has the `Upgrade`/`Connection` headers exactly as in the
config below, then `sudo systemctl reload nginx`.

---

## 9. What to say if a judge asks

These are already-known, already-documented gaps (see the project's own
architecture doc, §11) — better to name them yourself than have them found:

- No pagination yet — long lists load in full, fine at this scale
- No admin view of company profiles / employer verification screen
- No interview scheduling with a real date, no saved jobs, no employer
  multi-seat accounts
- Uploaded CVs/avatars live on this VPS's disk — durable here (unlike a
  typical PaaS free tier), but not yet backed up anywhere else

And one honest one to have ready: rate limits are per-IP and generous for a
single visitor, but if several people test signup from the same venue WiFi
in quick succession, they may see "too many attempts" — that's the security
hardening working as designed, not a bug.
