# Fursad — VPS deployment runbook

Your own VPS, a Namecheap domain, MongoDB on the same box, Nginx as the front
door, PM2 keeping the API alive. No managed platform, no Atlas.

Work through the phases in order. Replace `yourdomain.com` and `YOUR_VPS_IP`
throughout. Commands run on the VPS over SSH unless marked otherwise.

**Roughly 45–60 minutes**, most of it waiting on DNS and package installs.

---

## Architecture, in one picture

```
                 browser
                    │  https://yourdomain.com
                    ▼
        ┌───────────────────────┐
        │        Nginx          │   TLS terminates here (Certbot)
        │  :80 → :443           │
        └───┬─────────┬─────────┘
            │         │
   /  and static      │  /api/  ·  /socket.io/  ·  /uploads/avatars/
   files served       ▼
   from disk    ┌──────────────────┐
   frontend/    │  Node (PM2)      │  fursad-api, port 5000, 127.0.0.1 only
   dist/        │  Express+Socket  │
                └────────┬─────────┘
                         │
                ┌────────▼─────────┐        ┌──────────────────┐
                │ MongoDB 127.0.0.1│        │ backend/uploads/ │
                │ :27017 (closed)  │        │ CVs + avatars    │
                └──────────────────┘        └──────────────────┘
```

Two things follow from this diagram and are worth holding onto:

- **The frontend is static.** Nginx serves `frontend/dist` from disk. Node never
  serves HTML. So a frontend change requires a *rebuild*, not a restart.
- **The backend is a long-running process.** Socket.IO chat needs a persistent
  connection, which is exactly why this is a VPS and not a serverless host.

---

## Phase 0 — Before you start

- [ ] SSH access to the VPS as root or a sudo user
- [ ] The VPS public IP
- [ ] The domain in your Namecheap account
- [ ] Gemini API key on hand
- [ ] Gmail app password on hand (`myaccount.google.com/apppasswords`)
- [ ] Everything committed and pushed: `git status` clean, `git push origin main`

`.env` is gitignored and has never been committed — verified. Nothing secret
goes to GitHub.

---

## Phase 1 — DNS (do this first, it has a wait)

Namecheap → Domain List → **Manage** → **Advanced DNS** → add two records:

| Type | Host | Value | TTL |
|---|---|---|---|
| A Record | `@` | `YOUR_VPS_IP` | Automatic |
| A Record | `www` | `YOUR_VPS_IP` | Automatic |

Delete any parking/redirect records Namecheap added by default, or they will
fight your A records.

Propagation is minutes to a couple of hours. Start it now, then carry on —
check from your own machine while you work:

```bash
nslookup yourdomain.com
```

Certbot in Phase 6 **will fail** if DNS has not resolved yet. That is the one
hard dependency on this wait.

---

## Phase 2 — Server foundation

Assumes Ubuntu 22.04 or 24.04.

```bash
sudo apt update && sudo apt upgrade -y

# Node.js 20 LTS (package.json requires >=18)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v          # expect v20.x

sudo apt install -y nginx git build-essential ufw curl

# PM2 — keeps the API running and restarts it on crash or reboot
sudo npm install -g pm2

# Firewall: SSH and web only. 27017 stays shut.
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
sudo ufw status
```

### MongoDB

The repository codename must match your Ubuntu release, so detect it rather
than pasting a fixed string:

```bash
CODENAME=$(lsb_release -cs)   # jammy (22.04) or noble (24.04)
echo "Ubuntu codename: $CODENAME"

curl -fsSL https://pgp.mongodb.com/server-8.0.asc \
  | sudo gpg -o /usr/share/keyrings/mongodb-server-8.0.gpg --dearmor

echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu ${CODENAME}/mongodb-org/8.0 multiverse" \
  | sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list

sudo apt update
sudo apt install -y mongodb-org
sudo systemctl enable --now mongod
sudo systemctl status mongod --no-pager      # expect: active (running)
```

Confirm it is bound to loopback only — this is the default and should stay
that way:

```bash
grep bindIp /etc/mongod.conf     # expect: bindIp: 127.0.0.1
```

The Node app is the only thing that talks to Mongo and it runs on this same
machine. **Never open 27017 in the firewall.**

---

## Phase 3 — Get the code onto the server

```bash
sudo mkdir -p /var/www
cd /var/www
sudo git clone https://github.com/Garsame/FursadPlatform.git fursad
sudo chown -R $USER:$USER /var/www/fursad
cd /var/www/fursad/fursad
```

Note the doubled path: the repository root is `fursad/` *inside* the clone
directory. Everything below runs from `/var/www/fursad/fursad`.

---

## Phase 4 — Backend environment

```bash
cd /var/www/fursad/fursad/backend
cp ../deploy/env.production.template .env
```

Generate the two secrets **on the server**, so they never exist anywhere else:

```bash
echo "JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")"
echo "ADMIN_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
```

Then `nano .env` and fill in every value. The template explains each one.
The five that must be right or nothing works:

| Variable | Value | If wrong |
|---|---|---|
| `CLIENT_URL` | `https://yourdomain.com` | Site loads, every API call is silently discarded by the browser |
| `JWT_SECRET` | the 96-char value above | Server refuses to start |
| `ADMIN_SECRET` | the 64-char value above | Server refuses to start |
| `TRUST_PROXY` | `1` | Rate limits treat all visitors as one client — a few signups lock out everybody |
| `GEMINI_MODEL` / `GEMINI_EMBED_MODEL` | as in the template | Silently runs older models you never tested |

Lock the file down — it holds your live keys:

```bash
chmod 600 .env
```

Install and prove it works before going further:

```bash
cd /var/www/fursad/fursad
npm --prefix backend install
npm --prefix backend test
```

`npm test` must pass. If it fails here, stop and fix it — the same suite
passes locally, so a failure means something about this box differs (almost
always a missing or malformed `.env` value).

---

## Phase 5 — Frontend build

**Vite reads `frontend/.env` at BUILD time, not at run time.** The values are
compiled into the JavaScript bundle. This file must exist with production URLs
*before* you build, and changing it later does nothing until you rebuild.

```bash
cd /var/www/fursad/fursad/frontend
cat > .env << 'EOF'
VITE_API_URL=https://yourdomain.com/api
VITE_SOCKET_URL=https://yourdomain.com
EOF

cd /var/www/fursad/fursad
npm --prefix frontend install     # devDeps included — vite and tailwind are dev deps
npm run build                     # → frontend/dist
ls -la frontend/dist              # expect index.html and assets/
```

---

## Phase 6 — Nginx and TLS

```bash
sudo cp /var/www/fursad/fursad/deploy/nginx-fursad.conf /etc/nginx/sites-available/fursad
sudo nano /etc/nginx/sites-available/fursad      # replace yourdomain.com (3 places)

sudo ln -sf /etc/nginx/sites-available/fursad /etc/nginx/sites-enabled/fursad
sudo rm -f /etc/nginx/sites-enabled/default

sudo nginx -t                    # must say: syntax is ok / test is successful
sudo systemctl reload nginx
```

Visit `http://yourdomain.com` — you should get the site over plain HTTP.
If you do, TLS:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Answer its prompts: email, agree to terms, and **yes** to redirecting HTTP to
HTTPS. Certbot rewrites the Nginx config in place to add the TLS server block —
let it, do not hand-write that part.

Renewal is automatic via a systemd timer. Confirm:

```bash
sudo systemctl list-timers | grep certbot
sudo certbot renew --dry-run
```

---

## Phase 7 — Start the API under PM2

```bash
cd /var/www/fursad/fursad
pm2 start ecosystem.config.js
pm2 save
pm2 startup            # prints ONE command — copy it, paste it, run it
```

That last step is what makes the API come back after a reboot. It is easy to
skip and you only find out during an unplanned restart.

Check it came up clean:

```bash
pm2 status
pm2 logs fursad-api --lines 40
```

You are looking for three lines:

```
MongoDB Connected: 127.0.0.1
Gemini AI initialised — chat: gemini-3.5-flash, embeddings: gemini-embedding-2
Server running in production mode on port 5000
Accepting browser requests from: https://yourdomain.com
```

If instead you see `[FATAL] JWT_SECRET …` the server is doing its job —
the secret is missing, too short, or still a published example value.

Keep the logs from growing forever:

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 14
```

---

## Phase 8 — Smoke test on the live domain

Do this **before** you tell anyone the URL. Open a real browser, not curl.

```bash
# API is alive behind the proxy
curl -fsS http://127.0.0.1:5000/          # {"message":"Welcome to the Fursad Platform API"}
curl -fsS https://yourdomain.com/api/jobs # {"success":true,...}
```

Then walk the whole loop in the browser:

- [ ] Site loads over HTTPS, padlock present, no mixed-content warnings
- [ ] Register a candidate → the verification email arrives (check spam). If
      SMTP is not set, read the code from `pm2 logs fursad-api` — it prints
      under `[MAIL FALLBACK]`
- [ ] Sign in, complete the profile past 70%, upload a CV, confirm it parses
- [ ] Register an employer at `/provider/signup`, complete the company profile,
      post a job
- [ ] Register an admin at `/admin/signup` using `ADMIN_SECRET`, approve the job
- [ ] Candidate side: the job appears with a match score and breakdown
- [ ] Apply; employer sees the applicant ranked with an AI summary
- [ ] **Send a message from the employer — it must appear on the candidate side
      without a refresh.** This is the real Socket.IO test
- [ ] Admin analytics show real numbers, and the growth chart's last point
      equals the total user count

Or run the whole thing automatically, which is faster and checks more:

```bash
cd /var/www/fursad/fursad/backend
node scripts/walkthrough.js
```

33 checks against the live database, and it leaves working demo data behind.
Add `--clean` if you would rather it tidy up after itself.

---

## Phase 9 — Backups

The uploads directory holds real people's CVs. Losing it is not recoverable.

```bash
sudo mkdir -p /var/backups/fursad
sudo chown $USER:$USER /var/backups/fursad
chmod +x /var/www/fursad/fursad/deploy/backup.sh

# nightly at 02:30
( crontab -l 2>/dev/null; echo "30 2 * * * /var/www/fursad/fursad/deploy/backup.sh >> /var/log/fursad-backup.log 2>&1" ) | crontab -
crontab -l
```

Run it once by hand now to prove it works:

```bash
/var/www/fursad/fursad/deploy/backup.sh
ls -la /var/backups/fursad
```

---

## Day-to-day: shipping a change

This is the loop you will use from now on. **One command:**

```bash
cd /var/www/fursad/fursad && ./deploy/update.sh
```

It pulls, installs, rebuilds the frontend, restarts the API, and health-checks
the result. What it does and why:

| Step | Why |
|---|---|
| `git pull` | brings the new code |
| `npm install` both sides | a new dependency would otherwise crash at boot |
| `npm run build` | the frontend is static — **a restart alone changes nothing** |
| `pm2 restart --update-env` | picks up `.env` edits, which a plain restart does not |
| health check | fails loudly rather than leaving you a broken site |

### The three cases, in plain terms

**Backend code changed** — `pm2 restart fursad-api` is enough.

**Frontend code changed** — you must `npm run build`. Restarting Node does
nothing, because Node does not serve the frontend.

**`.env` changed** — `pm2 restart fursad-api --update-env`. Without
`--update-env` PM2 reuses the old environment and your change appears to have
been ignored. And if you changed `VITE_*`, that is a frontend rebuild, not a
restart.

### Useful commands

```bash
pm2 status                      # is it up
pm2 logs fursad-api             # live logs
pm2 logs fursad-api --err       # errors only
pm2 restart fursad-api          # restart
pm2 monit                       # live CPU / memory

sudo nginx -t                   # validate config before reloading
sudo systemctl reload nginx     # apply Nginx changes with no downtime
sudo systemctl status mongod    # database health

df -h                           # disk — uploads grow
free -h                         # memory
```

---

## When something is wrong

| Symptom | Cause | Fix |
|---|---|---|
| Site loads, nothing works, no visible error | `CLIENT_URL` ≠ the address in the URL bar | Fix `.env`, `pm2 restart fursad-api --update-env` |
| API calls 404 | Nginx `/api/` block missing or misspelled | `sudo nginx -t`, check the location block |
| Chat needs a refresh to show messages | `/socket.io/` block missing its Upgrade headers | Compare against `deploy/nginx-fursad.conf`, reload |
| `[FATAL] JWT_SECRET …` in the log | Secret missing, under 32 chars, or a published value | Regenerate, put it in `.env`, restart |
| "Too many attempts" for everyone at once | `TRUST_PROXY` not set | Set `TRUST_PROXY=1`, restart with `--update-env` |
| Frontend changes not showing | Forgot the rebuild | `npm run build` |
| CVs upload but never parse | Gemini key wrong, or quota | `pm2 logs fursad-api` — the AI errors are logged plainly |
| Emails not arriving | SMTP wrong | Log shows `[EMAIL] SMTP login failed`; codes still print under `[MAIL FALLBACK]` |
| 502 Bad Gateway | Node is down | `pm2 status`, `pm2 logs fursad-api`, `pm2 restart fursad-api` |
| Disk full | uploads or PM2 logs | `df -h`, then `pm2 flush` and check `backend/uploads/` |

---

## What is deliberately not in this setup

Say these yourself before someone asks:

- **No CDN.** All traffic hits this one box.
- **No horizontal scaling.** One Node process. Socket.IO would need a Redis
  adapter to run more than one.
- **Uploads live on this disk only**, backed up nightly to the same machine.
  Off-site copies are the obvious next step.
- **No staging environment.** `update.sh` deploys straight to production; the
  frontend is unavailable for the few seconds of the build.
- **Pagination is not implemented.** Fine at current size, not at scale.
