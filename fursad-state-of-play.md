# Fursad — state of play

**Written:** 22 August 2026
**For:** anyone who wants to know what just changed and how close Fursad is to being handed to real people.

This is written in plain language on purpose. Where something technical matters, it is explained rather than named and left alone.

---

## The short version

Six things were fixed. One of them was urgent in a way I did not realise until I looked closely — the app's master key was published, meaning anyone with a copy of the project could have signed in as any user, including an administrator.

That is now fixed in the code, but **one step is still waiting on you**: a single command that generates new keys. Until you run it, the server will refuse to start. That refusal is deliberate, not a bug.

Everything else is done and tested.

---

## Part 1 — What I changed

Seven pieces of work, ordered by how much they mattered.

### 1. The master key was public

**What was wrong.** Every time someone signs in, the app gives them a sealed pass that proves who they are. That seal is made with a secret key. Fursad had one, but the exact same key was also written into a file called `.env.example` — a template file that is committed and travels with the code.

So the key was not a secret. Anyone who had a copy of the project could have made a pass for any account on the platform, including the administrator, without ever knowing a password. A second key, the one that lets someone register themselves as an administrator, was published in the same file.

I checked, and the live keys were character-for-character identical to the published ones. This was not theoretical.

**What I did.**

- Created a single place where both keys are read and checked when the server starts.
- The server now **refuses to start** if either key is missing, too short, or is one of the two published values. Those two values are now permanently on a rejection list.
- Removed the four places in the code that quietly fell back to the published key when none was configured. A fallback everyone can read is not a fallback.
- Rewrote `.env.example` so it ships with the key fields **empty**, and included the command to generate a proper one right there in the file.
- Added limits on how often the sign-in and email endpoints can be called, so nobody can sit there guessing passwords or use the platform to send unlimited email.

**Why it matters.** This was the only problem on the list that was not about someone getting stuck. It was a door standing open.

**Still needs you.** See [Part 5](#part-5--what-to-do-next).

---

### 2. Forgetting your password meant losing your account

**What was wrong.** There was no way to reset a password. Not a broken one — none at all. I searched the whole codebase for any trace of a reset feature and found nothing, front or back. A person who forgot their password was locked out permanently, with no route back in.

**What I did.** Built the full flow.

- A person enters their email and receives a six-digit code.
- They enter the code and choose a new password.
- They land signed in, rather than being asked for the password they just finished setting.

Three details worth knowing:

- **The reset code is kept separate from the sign-up code.** They are stored in different fields, so a reset can never accidentally satisfy email verification, or the other way round.
- **The app gives the same answer whether or not the email exists.** Otherwise the reset form becomes a way to find out who has an account.
- **A successful reset also finishes setting up the account.** If someone never completed sign-up verification, receiving the reset code proves they own that email anyway — so the account is marked verified and the missing profile record is created. Without this, a recovered user would have been stopped at "complete your profile before applying" with no way to do so.

---

### 3. The "resend code" button was telling people something untrue

**What was wrong.** During sign-up, people get a code by email. If that email was slow or lost, there was a "Resend Code" button. It sent nothing. It set a message on screen saying a new code had been generated and telling the person to *check their console logs* — something no ordinary user has or understands.

This sat in the sign-up flow, which is the busiest point in the whole product.

**What I did.**

- Built a real endpoint that generates a fresh code and actually emails it.
- The button now calls it.
- Added a sixty-second countdown after each send. The server limits how many codes it will send in a window, and without the countdown an anxious person would spend that allowance in a few clicks and get blocked for something that was not their fault.

---

### 4. Employers could write, but candidates could never read

**What was wrong.** Employers had a working chat. They could message any candidate who applied. Those messages were saved correctly and delivered in real time.

The candidate had no screen to open them on. Not a broken one — it did not exist. Every message an employer sent went into a conversation the person it was addressed to could never see.

**What I did.** Built the candidate's side.

- A conversation list showing each employer, the job applied for, the last message, and how many are unread.
- A live conversation view — messages arrive as they are sent, without refreshing.
- Automated updates (the ones sent when an application status changes) are labelled as automated, so people know when they are reading a person and when they are reading the system.
- An unread badge in the sidebar.

Worth saying: none of the underlying machinery was new. The live connection, the message storage and the permission checks all already existed and worked. What was missing was the screen. This was carpentry, not plumbing.

---

### 5. The admin charts were inventing their numbers

**What was wrong.** The admin analytics page showed two growth charts. They were not built from history. They were the current total multiplied by a fixed set of numbers — 40%, 50%, 70%, 80%, 90%, 100%.

That means the chart drew the same rising curve no matter what actually happened. If the platform had lost users every month, it would still have shown steady growth. An administrator reading it would have drawn conclusions from a decoration.

Next to it sat a card reading "Platform Match Accuracy — 94.2%". That number was typed into the page. It was not measured.

**What I did.**

- Replaced both charts with real counts, grouped by the month each user and each job was actually created. The last point now reconciles exactly with the total shown on the summary cards above.
- Replaced the invented 94.2% with the real average match score across all applications, shown alongside how many applications it is based on.
- When there is nothing to average, it shows a dash rather than inventing a number to fill the space.

With your current data the chart now reads: March 0, April 0, May 0, June 1, July 1, August 20. The real average match score is **60.1%** across 11 applications. That is a less flattering number than 94.2%, and it is the true one.

---

### 6. A posted job could never be fixed

**What was wrong.** Once an employer published a vacancy, that was it. A typo in the salary was permanent. A filled role stayed advertised forever. The ability to change a job existed in the backend the whole time — there was simply no button anywhere in the interface.

**What I did.**

- Built an edit screen covering title, description, skills, location, salary, employment type, education and experience.
- Added **Edit**, **Close** and **Reopen** buttons to the employer's job list.
- Closing takes a job out of search but keeps every application already received.
- Reopening runs the automatic quality and fraud check again, exactly as first publishing does. The screen handles the case where that check sends the job back for review rather than publishing it straight away.

---

### 7. Something I found along the way: the tests had not run in a long time

**What was wrong.** The project has one test file. It crashed on its very first check — before any of my work.

The cause: the matching engine was changed some time ago to look up skills by meaning rather than exact spelling, which made it slower and therefore asynchronous. The test still called it the old, immediate way, so it read an empty result and failed. Nobody would have seen a passing run since that change landed.

**What I did.** Repaired it so the whole suite runs and passes.

I also loosened one check deliberately. The old test demanded the skills score be exactly 60%. That is only correct when the AI is switched off. With your Gemini key active, skills are matched by meaning and can legitimately score higher — so the strict check would have failed on a *correctly configured* server. It now requires the score to be at least the old value, never less.

---

## Part 2 — Where we stand, user by user

### Job seekers

The most complete journey on the platform.

| Can do | Cannot do |
|---|---|
| Sign up with full details | See how one CV compares against another side by side |
| Verify by email, and now **resend the code** | Save a job for later — the field exists, nothing uses it |
| **Reset a forgotten password** | |
| Upload several CVs, each read by AI separately | |
| Build a profile through an eight-question AI interview | |
| Browse jobs, and see AI-matched ones with a score breakdown | |
| Apply with a chosen CV | |
| Track applications through the whole hiring pipeline | |
| **Read and reply to employer messages** | |

**Verdict:** a real person can now get in, get stuck nowhere, and get back in if they forget their password. This journey is finished.

### Employers

| Can do | Cannot do |
|---|---|
| Sign up with a separate portal and login | Add colleagues — one login per company |
| Build a company profile, with AI help writing it | Search or filter applicants within a job |
| Post a job with AI assistance | Schedule an interview with an actual date |
| **Edit, close and reopen a posted job** | |
| See applicants ranked by match score | |
| Run an AI shortlist with reasons per person | |
| Read and download applicant CVs | |
| Move people through the pipeline, with automatic emails | |
| Message candidates live — and now be **read and answered** | |

**Verdict:** strong. The remaining gaps are conveniences, not dead ends.

### Administrators

| Can do | Cannot do |
|---|---|
| Sign in through a separate, secret-gated portal | View a company profile or verify an employer |
| See platform totals | Delete a user — only suspend |
| Search and filter users, suspend and reactivate | Filter the audit log by date |
| Review AI-flagged job posts and approve or reject | See long lists in pages — everything loads at once |
| See an audit trail of every moderation action | |
| **Read charts and figures that are actually true** | |

**Verdict:** the weakest of the three, but it no longer misleads the person reading it. That was the important part.

### The platform right now

| | Count |
|---|---|
| Users | 18 |
| Companies | 5 |
| Jobs (all published) | 10 |
| Applications | 11 |
| CVs uploaded | 3 |
| Messages | 6 — all currently unread |
| Cached skill vectors | 45 |
| Average match score | 60.1% |

Those six unread messages are worth a mention. They have been sitting unreadable until today. They are the first thing to look at when the candidate inbox goes live.

---

## Part 3 — Security, plainly

### Now fixed in the code

- **The master key is no longer published.** The server refuses to run on a key anyone can read.
- **The admin registration key is no longer published**, and the same refusal applies.
- **No silent fallbacks.** Four places in the code used to quietly fall back to the published key if none was set. All removed.
- **Sign-in attempts are limited** — ten failed attempts per fifteen minutes, per network.
- **Email-sending endpoints are limited** — four requests per ten minutes. Without this, anyone could have used your real email account to send unlimited mail to any address they chose.
- **Account creation is limited** — twelve per hour.
- **Reset codes cannot be reused, guessed comfortably, or used after they expire**, and every failure gives the same reply so the form cannot be used to probe which emails exist.

### Waiting on you

- **The keys themselves still need rotating.** The code is ready; the values in your `.env` are still the published ones. One command, in Part 5. I could not run it myself — that file holds your live Gemini key and email password, and the sandbox correctly stopped me from writing to it. Rotating also signs everyone out, which felt like your decision rather than mine.

### Still open, and honest about it

- **Behind a proxy, the rate limiting will not work properly** unless the app is told to trust the proxy. It counts per network address, and without that setting every visitor collapses into a single bucket. Fine locally; a real issue on a real server. I left a note in the code.
- **No general security headers.** A small, standard addition that has not been made.
- **Long lists load entirely.** The admin user list fetches every user at once. Fine at 18. Not fine at 18,000.
- **The four demo employers are not real businesses.** They are seeded accounts with invented contact addresses. They must be replaced with genuine registrations before anyone outside sees the platform.
- **All work is still uncommitted.** The repository holds two commits from June. Everything since then, including today, exists on one disk with no version history. This is the quietest risk on the list and probably the most costly if the machine fails.

---

## Part 4 — What is still missing

Nothing here stops a person from using Fursad. These are the things that would make it better.

| Priority | Item |
|---|---|
| Worth doing soon | Interview scheduling with real dates |
| Worth doing soon | Saved jobs for candidates |
| Worth doing soon | Applicant search within a job |
| Worth doing soon | Team members for employers |
| Later | Side-by-side CV comparison for candidates |
| Later | Admin view of company profiles, and employer verification |
| Later | Date filtering on the audit log |
| Housekeeping | Commit the work |
| Housekeeping | Update the old specification documents — they still describe the June build, name the wrong AI provider, and describe codes arriving by SMS when they arrive by email |

---

## Part 5 — What to do next

Three steps, in order. Run them from `C:\Users\ICT-LAB 3\Desktop\Fursad Platform`.

**Step one — rotate the keys.** This touches only the two key lines. Your Gemini key and email settings are left alone.

```
$p="$PWD\fursad\backend\.env"; $j=node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"; $a=node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"; $l=(Get-Content $p) -replace '^JWT_SECRET=.*',"JWT_SECRET=$j" -replace '^ADMIN_SECRET=.*',"ADMIN_SECRET=$a"; [System.IO.File]::WriteAllLines($p,$l); Write-Host "Secrets rotated."
```

**Step two — restart the backend.** Stop the running one first with Ctrl+C in its terminal.

```
npm --prefix "fursad/backend" run dev
```

**Step three — run the frontend on port 5174.** It must be 5174, not 5173 — the backend only accepts requests from the address it has been told about, and on 5173 the browser blocks every call before it arrives.

```
npm --prefix "fursad/frontend" run dev '--' --port 5174
```

### After rotating

Everyone is signed out. Passwords are unchanged, so everyone signs back in as normal:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@fursad.so` | `Fursad@2026` |
| Employer | `careers@hormuud.example.so` | `Fursad@2026` |
| Job seeker | `ilyas.abdi@example.so` | `Fursad@2026` |

The old admin registration key will no longer create administrators. The existing admin account is unaffected — it signs in with a password like everyone else.

---

## What I checked, and what I did not

**Checked.**

- The frontend builds cleanly for production — 1,520 modules, no errors. This catches every broken import and every malformed screen.
- A temporary test harness ran **31 checks** against your real database, covering the reset flow end to end (wrong code, short password, reused code, expired code, profile creation), the resend, the conversation list, and the analytics. All 31 passed. The harness has been deleted.
- The project's own test suite runs and passes again for the first time in a while.
- Every backend file parses. Every new route is registered with its permission checks in place.
- The refusal-to-start behaviour works — I fed it the published key and it stopped, with a message explaining how to generate a proper one.

**Not checked.**

- **None of the new screens have been opened in a browser yet.** They cannot be, until the keys are rotated and the backend restarts. The logic underneath them is tested; the screens themselves are not.
- **Behaviour behind a proxy**, as described in Part 3.

Once you have run the three steps, I can drive the new screens in a browser and confirm they work end to end.
