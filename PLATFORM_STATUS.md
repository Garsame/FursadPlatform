# Fursad Platform — Status & User Journeys

**Last updated:** 15 August 2026
**Purpose:** the single reference for what Fursad does today, what each user can
actually do, and what is still missing. Written to be read by someone who has
not seen the code.

---

## 1. What Fursad is

An AI-assisted job matching and hiring platform for Somalia and East Africa.
Bilingual (Somali + English).

The core idea: a jobseeker uploads a CV **once**, the AI reads it into a
structured profile, and a deterministic engine scores that profile against every
open vacancy — in both directions. Candidates stop firing blind applications;
employers stop reading CV piles.

**Stack:** React 18 + Vite + Tailwind · Node/Express · MongoDB/Mongoose ·
Socket.IO · Google Gemini · Nodemailer/SMTP

---

## 2. Where the platform stands

| Area | State |
|---|---|
| Public site | **Redesigned and working** |
| Jobseeker portal | **Working end to end**, verified |
| Employer portal | **Working**, two screens still on old design |
| Admin portal | **Functional but untouched** — no redesign, gaps below |
| AI | **Live** on real Gemini, 10 functions wired |
| Email | **Live** via SMTP |
| Matching | **Live**, semantic skills matching |

**Honest headline:** the jobseeker and employer journeys are genuinely complete
and tested. The admin side works but has never been reviewed or redesigned, and
some of it is fake. See §8.

---

## 3. The Job Seeker

**Entry:** `/signup` → `/verify` → `/dashboard`

### Journey

1. **Sign up** — two-step form collecting name, email, phone, gender, country,
   city, education level, and what they do, then password + confirmation
   (8-char minimum, enforced both sides).
2. **Verify** — a real 6-digit OTP arrives by email.
3. **Profile is pre-seeded** from signup data, so matching works immediately —
   no empty state.
4. **Upload CVs** (`/dashboard/cvs`) — PDF / Word / text, up to 8 MB, as many as
   they like. Each is parsed by Gemini into its **own** profile snapshot.
5. **Build profile with AI** (`/dashboard/build`) — 8 questions asked one at a
   time, each written in response to the previous answer. Answers feed straight
   into the matching engine. Ends with a derived **Main Job Specification**.
6. **Browse jobs** (`/dashboard/jobs`) — two tabs:
   - *All jobs* — every live vacancy
   - *AI matched for me* — ranked, with a per-CV selector and a full score
     breakdown showing which factor earned what
7. **Apply** — choose which CV to send, add a note. Match score and an AI
   summary of their suitability travel to the employer.
8. **Track** (`/dashboard/applications`) — applied → reviewed → shortlisted →
   interview → offer → hired/rejected. Status changes email them automatically.

### Capabilities — done

- Full identity captured at signup, persisted, seeds the profile
- Real OTP email verification
- Profile photo upload
- Multiple CVs, each independently AI-parsed
- Default CV selection; CVs sent with an application are locked from deletion
- AI profile interview with contextual questions
- Derived job specification (title, summary, strengths, suggested roles, target salary)
- Per-CV job matching with a transparent breakdown
- Apply with a chosen CV
- Application tracking with email notifications

### Not done

- **No chat UI.** Employers can message candidates; candidates have no screen to
  read or reply. Messaging is effectively one-way.
- **No per-CV margin comparison** — you can filter by CV but not see
  "this CV got you +12% on these roles" side by side.
- **CV parsing takes ~10s** with only a spinner, no progress detail.
- **"Resend code" on the verify screen does nothing.**
- **No password reset** anywhere in the product.
- **No saved jobs**, despite the field existing in the schema.

---

## 4. The Employer

**Entry:** `/provider/login` (never linked from the public site)

### Journey

1. **Sign up / sign in** — separate portal, own token.
2. **Complete the company profile** (`/provider/company`) — identity, the story
   candidates read, benefits, values, contact, logo. A weighted completeness
   meter drives it, and **"Draft with AI"** writes the copy from a few facts.
3. **Post a job** (`/provider/jobs/new`) — answer a few questions and the AI
   drafts title, description and skills. On publish it passes a fraud screen.
4. **Review applicants** (`/provider/jobs/:id/applicants`) — ranked by match
   score, each with an AI suitability summary.
5. **Use the AI shortlist** — one click ranks everyone who applied with a
   verdict (strong / consider / weak) and a specific reason per person.
6. **Read and download their CVs** — every CV the candidate holds, with the one
   actually submitted clearly marked.
7. **Move them through the pipeline** — each change emails the candidate.
8. **Message candidates** in real time over Socket.IO.
9. **Trigger AI interview prep** — questions and a tip emailed to the candidate.

### Capabilities — done

- Separate portal and token
- Full company profile with completeness scoring
- AI-drafted company copy
- Logo upload
- Public employer profile candidates read before applying
- AI-assisted job posting
- Fraud screening before publish
- Applicants ranked by match score with AI summaries
- **AI shortlist** with per-candidate reasoning
- **CV viewing and download**, correctly scoped
- Full ATS pipeline with automatic emails
- Real-time chat
- AI interview prep

### Not done

- **Cannot edit or close a job after posting.** The API supports it; there is no UI.
- **Provider Dashboard, My Jobs and Post Job still use the old dark-theme layout
  language.** They work and are readable, but were not redesigned.
- **No team members** — `recruiters[]` exists in the schema, unused. One login per company.
- **No applicant search or filtering** within a job.
- **No interview scheduling** — status can be set to "interview" but no date is captured.

### Privacy boundary (deliberate)

Employers see **only candidates who applied to their own jobs**. They cannot
browse the talent pool. CV download is authorised per-record: verified that an
employer a candidate applied to gets the file, and one they never applied to
gets **403**.

---

## 5. The Admin

**Entry:** `/admin/login`, gated by `ADMIN_SECRET` at registration

### Journey

1. **Sign in** — separate portal, auto-verified, no OTP.
2. **Dashboard** — totals for users, jobs, active applications, pending reviews.
3. **Users** — list, search, filter by role/status, suspend or reactivate.
4. **Jobs** — review the queue of AI-flagged posts, approve or reject.
5. **Analytics** — platform metrics and charts.
6. **Audit log** — every admin action, chronologically.

### Capabilities — done

- Separate portal with secret-gated registration
- User list with search and role/status filters
- Suspend / reactivate (suspended users are blocked at login — verified)
- Fraud review queue: approve → published, reject → flagged
- Audit logging of every moderation action
- Platform totals

### Not done — this is the weakest area

- **Analytics charts are fabricated.** `userGrowth` and `jobsGrowth` are
  hardcoded multipliers of the current total (`total × 0.4`, `× 0.5` …), not
  real time series. They will mislead anyone who reads them.
- **"Applications per job" and "top cities" were specified and never built.**
- **No admin view of CVs** in the UI, though the backend authorises it.
- **No admin view of a company profile** or ability to verify an employer.
- **Cannot delete a user** — only suspend.
- **No date-range filter on the audit log.**
- **Entire admin portal has had no design pass** — still the old layout language.
- **Admin registration is open to anyone holding the secret**, and the default
  secret is committed in `.env.example`.

---

## 6. The AI layer

All calls go through `backend/src/services/aiService.js`. Every function is
wrapped in try/catch with a realistic fallback — **AI failure never blocks a user
flow.**

**Models** (configurable via `.env`, no code change needed):
- Chat: `gemini-3.5-flash`
- Embeddings: `gemini-embedding-2` (3072 dims)

`gemini-3.7-flash` was tested and rejected: 13s latency and it failed on
structured JSON prompts.

| # | Function | Used by | Live? |
|---|---|---|---|
| 1 | `parseResume` | CV upload | Yes |
| 2 | `reviewJobPost` | Job publish (fraud screen) | Yes |
| 3 | `generateJobDescription` | Post a job | Yes |
| 4 | `generateCandidateSummary` | On apply | Yes |
| 5 | `generateInterviewQuestions` | Interview prep email | Yes |
| 6 | `generateStatusUpdateMessage` | Status change | Yes |
| 7 | `nextProfileQuestion` | Profile builder | Yes |
| 8 | `deriveJobSpecification` | End of profile builder | Yes |
| 9 | `generateCompanyProfile` | Employer "Draft with AI" | Yes |
| 10 | `rankApplicants` | Employer AI shortlist | Yes |

Plus `embedTexts` powering semantic skill matching.

### What "AI matching" actually means

Worth being precise: **the AI does extraction and judgement; the scoring is
deterministic arithmetic.** That is a deliberate strength — it is explainable,
instant, free to re-run, and lets the UI show *why* a score is what it is. It
should not be replaced with an LLM.

---

## 7. The matching engine

`backend/src/services/matchingService.js`

| Factor | Weight | How |
|---|---|---|
| Skills | 45% | **Semantic** — Gemini embeddings, cosine similarity, calibrated |
| Location | 20% | City+country = 100, country only = 50, else 0 |
| Salary | 15% | Range overlap = 100, else proximity decay; unstated = neutral |
| Education | 10% | Ranked ladder, candidate ≥ required = 100 |
| Experience | 10% | Ranked ladder, same rule |

**Semantic skills** replaced exact string matching. Previously `"Node.js"`,
`"NodeJS"` and `"Node"` were three different skills, so a perfect candidate could
score 0 on the heaviest weight over spelling. Embeddings are cached in a
`SkillEmbedding` collection — each distinct skill string is billed **once ever**.

Measured effect — a data CV (Python, SQL, Pandas, scikit-learn, Tableau) against a
role wanting SQL, Excel, Python, Power BI:
- Exact matching: **50%** (only SQL, Python)
- Semantic: **74%** (Pandas credits against Excel, Tableau against Power BI)

And it refuses to inflate: the same CV scores 29% on a full-stack role.

Scores are computed **server-side at apply time and frozen** on the application,
never recomputed in the browser.

Two directions:
- `rankJobsForCandidate` — the seeker's matched tab
- `rankCandidatesForJob` — scoped to actual applicants only

---

## 8. What is not done — prioritised

### Blocking a real launch
1. **Fake admin analytics** — replace with real aggregation, or remove the charts.
2. **No password reset** — users who forget a password are locked out permanently.
3. **Hardcoded secret fallbacks** — `JWT_SECRET` and `ADMIN_SECRET` have literal
   defaults in source. Anyone knowing the default admin secret can self-register
   as an administrator.
4. **Demo employers are not real signups.** The four Somali businesses are
   seeded demo accounts with generated wordmarks, not their trademarks, and
   `.example.so` contact addresses. They must be replaced by genuine
   registrations before the platform is public.

### High value
5. **Jobseeker chat UI** — messaging is one-way today.
6. **Admin portal redesign** — never had a design pass.
7. **Job edit / close** for employers.
8. **Per-CV margin comparison** for jobseekers.
9. **Provider Dashboard / My Jobs / Post Job** redesign.

### Worth doing
10. Interview scheduling with dates
11. Saved jobs
12. Employer team members
13. Resend OTP
14. CV parse progress indicator
15. Applicant search within a job

---

## 9. Known risks

- **All work is uncommitted.** The repository still has only the two June
  commits; ~70 changed paths exist on one disk with no version history.
- **Live credentials sit in `backend/.env`** — a paid Gemini key and a Gmail app
  password. The file is correctly gitignored, but the app password grants send
  access to a real inbox.
- **Specification documents are stale.** `Project_running_pages` and
  `FURSAD PLATFORM.docx` describe the June build. They still name Anthropic as
  the AI provider (the code uses Gemini), describe OTP over SMS (it is email),
  and omit CVs, the profile builder, company profiles and semantic matching.

---

## 10. Test accounts

Password for all seeded accounts: `Fursad@2026`

| Role | Email |
|---|---|
| Admin | `admin@fursad.so` |
| Employer | `careers@hormuud.example.so` |
| Employer | `recruitment@dahabshiil.example.so` |
| Employer | `hr@premierbank.example.so` |
| Employer | `jobs@amalbank.example.so` |
| Jobseeker | `ilyas.abdi@example.so` (has a CV) |
| Jobseeker | `nasra.omar@example.so` |
| Jobseeker | `mustafa.ali@example.so` |

**Running it** — from the project root, in two terminals:

```
npm --prefix "fursad/backend" run dev
npm --prefix "fursad/frontend" run dev -- --port 5174
```

PowerShell eats the `--` separator; use `npm run dev '--' --port 5174` or set the
port in `vite.config.js`. MongoDB must be running on 27017.
