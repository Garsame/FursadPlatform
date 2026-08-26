import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles, ArrowRight, ChevronRight, Plus, Minus, Brain, ShieldCheck,
  Building2, Users, CheckCircle2, Cpu, Scale, Radar,
} from 'lucide-react';
import api from '../../services/api';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import {
  SECTIONS, PILLARS, AT_A_GLANCE, JOURNEYS, AI_CHAIN, AI_FUNCTIONS,
  FACTORS, BENEFITS, RULES, SECURITY,
} from './aboutContent';

/**
 * About — the one page that explains the whole platform.
 *
 * It is long deliberately, and built to be explored rather than read top to
 * bottom: a sticky section rail tracks where you are, the three journeys and
 * the two audiences are tabbed, the AI chain expands stage by stage, and the
 * matching engine can be operated rather than described.
 *
 * Every number on the page is either read from the live API or imported from
 * the same constants the engine uses. Nothing here is typed in by hand, which
 * is the point — a page about algorithmic transparency cannot be decorative.
 */
const About = () => {
  const [stats, setStats] = useState(null);
  const [active, setActive] = useState(SECTIONS[0].id);

  /* --- Live platform figures, from the two public endpoints ---------- */
  useEffect(() => {
    (async () => {
      const [jobsRes, cosRes] = await Promise.allSettled([
        api.get('/jobs'),
        api.get('/companies'),
      ]);
      const jobs =
        jobsRes.status === 'fulfilled' && jobsRes.value.data?.success ? jobsRes.value.data.data : [];
      const companies =
        cosRes.status === 'fulfilled' && cosRes.value.data?.success ? cosRes.value.data.data : [];

      setStats({
        jobs: jobs.length,
        companies: companies.length,
        cities: new Set(jobs.map((j) => j.location?.city).filter(Boolean)).size,
        skills: new Set(
          jobs.flatMap((j) => j.skillsRequired || []).map((s) => String(s).toLowerCase().trim())
        ).size,
      });
    })();
  }, []);

  /* --- Which section the reader is currently in --------------------- */
  useEffect(() => {
    /**
     * Deliberately a scroll listener rather than an IntersectionObserver.
     *
     * The obvious observer version needs a rootMargin band ("somewhere near
     * the top of the viewport"), and that band collapses to nothing on a
     * short viewport — at which point the rail silently stops tracking. This
     * compares positions directly, so it behaves the same at any height.
     */
    const onScroll = () => {
      // The last section whose top has passed under the rail is the one
      // being read. Walking forward and keeping the last match avoids
      // special-casing sections too short to reach the top of the viewport.
      const line = 160;
      let current = SECTIONS[0].id;
      for (const s of SECTIONS) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= line) current = s.id;
      }

      // Nothing below the last section can scroll into place, so at the very
      // bottom of the page it is always the one in view.
      const atEnd = window.innerHeight + window.scrollY >= document.body.scrollHeight - 2;
      if (atEnd) current = SECTIONS[SECTIONS.length - 1].id;

      setActive((prev) => (prev === current ? prev : current));
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <>
      <Hero stats={stats} />
      <SectionRail active={active} />

      <Overview />
      <HowItWorks />
      <AiChain />
      <MatchingEngine />
      <WhatYouGet />
      <Trust />
      <ClosingCta />
    </>
  );
};

/* ==================================================================== */
/*  Hero                                                                */
/* ==================================================================== */

const Hero = ({ stats }) => (
  <section className="relative overflow-hidden">
    <div className="absolute inset-0 -z-10 bg-gradient-to-b from-brand-muted via-bg-primary to-bg-primary" />
    <div className="absolute -top-40 -right-32 -z-10 w-[38rem] h-[38rem] rounded-full bg-accent-ochreMuted blur-3xl opacity-70" />

    <div className="max-w-7xl mx-auto px-6 pt-lg pb-md">
      <div className="max-w-3xl animate-fade-up">
        <span className="eyebrow">
          <Sparkles size={14} /> About Fursad
        </span>

        <h1 className="font-display text-[2.6rem] sm:text-6xl font-semibold leading-[1.05] text-text-primary mt-5">
          Opportunity, matched on{' '}
          <span className="relative inline-block">
            <span className="relative z-10 text-brand-deep">evidence</span>
            <span className="absolute left-0 right-0 bottom-1.5 h-3.5 bg-brand-green/30 -z-0 rounded-sm" />
          </span>
          .
        </h1>

        <p className="text-lg text-text-secondary mt-6 max-w-prose leading-relaxed">
          Fursad is an AI-assisted hiring platform built for Somalia and East Africa. It reads CVs,
          understands skills by meaning rather than spelling, and scores every candidate against
          every vacancy with arithmetic anyone can check. Three separate portals — candidate,
          employer and moderator — run one hiring process from first upload to signed offer.
        </p>

        <p className="text-base text-text-muted mt-4 max-w-prose leading-relaxed">
          This page is the long version. It covers how the platform works, exactly where AI is used
          and where it deliberately is not, what each side gets out of it, and the rules that govern
          everyone.
        </p>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-8">
          {/* An anchor, not a Button — this scrolls, it does not act. */}
          <a
            href="#how"
            className="inline-flex items-center justify-center gap-2 h-12 px-7 text-base font-semibold
              rounded-btn bg-brand-green hover:bg-brand-hover text-brand-ink shadow-card hover:shadow-lift
              transition-all duration-200"
          >
            Start exploring <ArrowRight size={17} />
          </a>
          <a
            href="#matching"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-deep hover:gap-2.5 transition-all"
          >
            Try the matching engine <ChevronRight size={16} />
          </a>
        </div>
      </div>

      {/* Live figures — counted from the public API, not written into the page */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-2xl">
        <Stat value={stats?.jobs} label="Live vacancies" hint="Approved and open right now" />
        <Stat value={stats?.companies} label="Employers hiring" hint="With at least one open role" />
        <Stat value={stats?.cities} label="Cities covered" hint="Distinct locations advertised" />
        <Stat value={stats?.skills} label="Skills in demand" hint="Distinct skills across live roles" />
      </div>
      <p className="text-xs text-text-muted mt-4">
        Counted live from the public listings each time this page loads.
      </p>
    </div>
  </section>
);

const Stat = ({ value, label, hint }) => (
  <div className="bg-bg-surface border border-border-subtle rounded-card shadow-card p-5">
    {value === undefined || value === null ? (
      <div className="h-9 w-16 rounded bg-bg-elevated animate-pulse" />
    ) : (
      <div className="font-display text-4xl font-semibold text-brand-deep leading-none">{value}</div>
    )}
    <div className="text-sm font-bold text-text-primary mt-3">{label}</div>
    <div className="text-[11px] text-text-muted mt-1 leading-snug">{hint}</div>
  </div>
);

/* ==================================================================== */
/*  Sticky section rail                                                 */
/* ==================================================================== */

const SectionRail = ({ active }) => (
  <div className="sticky top-[72px] z-30 bg-bg-primary/85 backdrop-blur-xl border-y border-border-subtle">
    <nav
      aria-label="On this page"
      className="max-w-7xl mx-auto px-6 flex gap-1 overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {SECTIONS.map((s) => (
        <a
          key={s.id}
          href={`#${s.id}`}
          aria-current={active === s.id ? 'true' : undefined}
          className={`shrink-0 px-3.5 py-2 rounded-pill text-sm font-semibold transition-colors ${
            active === s.id
              ? 'bg-brand-deep text-text-inverse'
              : 'text-text-secondary hover:text-brand-deep hover:bg-brand-muted'
          }`}
        >
          {s.label}
        </a>
      ))}
    </nav>
  </div>
);

/** Shared section heading, so every block on the page opens the same way. */
const Heading = ({ eyebrow, title, sub, center = false }) => (
  <div className={`${center ? 'text-center max-w-2xl mx-auto' : 'max-w-3xl'} mb-12`}>
    <span className="eyebrow">{eyebrow}</span>
    {!center && <div className="rule-ochre mt-3" />}
    <h2 className="font-display text-4xl font-semibold text-text-primary mt-4 leading-tight">{title}</h2>
    {sub && <p className="text-text-secondary mt-3 leading-relaxed">{sub}</p>}
  </div>
);

/* ==================================================================== */
/*  1 — What Fursad is                                                  */
/* ==================================================================== */

const Overview = () => (
  <section id="overview" className="section scroll-mt-[9rem]">
    <Heading
      eyebrow="What Fursad is"
      title="A hiring process, not a noticeboard"
      sub="Somalia has one of the youngest workforces in the world and no shared infrastructure for hiring into it."
    />

    <div className="grid lg:grid-cols-[1.15fr_1fr] gap-xl items-start">
      <div className="max-w-prose text-text-secondary leading-relaxed flex flex-col gap-4">
        <p>
          Vacancies travel through WhatsApp groups and personal networks, which means the people who
          hear about them are the people already close to the person hiring. CVs arrive as a folder
          of attachments nobody has the hours to open. Strong candidates are missed for reasons that
          have nothing whatsoever to do with what they can do.
        </p>
        <p>
          Fursad closes that gap from both ends at once. A candidate uploads a CV and it is read
          properly, once, into something the platform can reason about. An employer describes a role
          and it reaches everyone who fits it, ranked, with the reasoning attached.
        </p>
        <p className="text-text-primary font-medium">
          The difference between this and a job board is that nothing here is a list. Every screen
          is ordered by how well two specific things fit each other, and every ordering can be
          opened up and checked.
        </p>
      </div>

      {/* At a glance */}
      <div className="bg-bg-surface border border-border-subtle rounded-card shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border-subtle bg-bg-elevated">
          <h3 className="text-sm font-bold text-text-primary">At a glance</h3>
        </div>
        <dl className="divide-y divide-border-subtle">
          {AT_A_GLANCE.map(([k, v]) => (
            <div key={k} className="px-5 py-3.5 grid grid-cols-[7.5rem_1fr] gap-4">
              <dt className="text-xs font-bold uppercase tracking-wide text-text-muted pt-0.5">{k}</dt>
              <dd className="text-sm text-text-secondary leading-snug">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>

    {/* Mission / vision / values */}
    <div className="grid md:grid-cols-3 gap-5 mt-xl">
      {PILLARS.map((p) => (
        <div
          key={p.title}
          className="p-6 rounded-card border border-border-subtle bg-bg-surface shadow-card
            hover:border-brand-green/40 hover:shadow-lift transition-all duration-200"
        >
          <span className="w-11 h-11 rounded-xl bg-brand-muted grid place-items-center">
            <p.icon size={20} className="text-brand-deep" />
          </span>
          <h3 className="font-bold text-text-primary mt-4">{p.title}</h3>
          <p className="text-sm text-text-secondary mt-2 leading-relaxed">{p.body}</p>
        </div>
      ))}
    </div>
  </section>
);

/* ==================================================================== */
/*  2 — How it works                                                    */
/* ==================================================================== */

const HowItWorks = () => {
  const [tab, setTab] = useState(0);
  const journey = JOURNEYS[tab];

  return (
    <section id="how" className="bg-bg-surface border-y border-border-subtle scroll-mt-[9rem]">
      <div className="section">
        <Heading
          eyebrow="How it works"
          title="Three portals, one process"
          sub="The candidate side, the employer side and the moderator side are entirely separate applications with their own logins. They meet in exactly one place: the application record. Pick a side to follow it through."
        />

        {/* Portal switcher */}
        <div
          role="tablist"
          aria-label="Choose a portal"
          className="inline-flex flex-wrap gap-1.5 p-1.5 bg-bg-elevated rounded-pill border border-border-subtle"
        >
          {JOURNEYS.map((j, i) => (
            <button
              key={j.key}
              role="tab"
              aria-selected={tab === i}
              onClick={() => setTab(i)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-pill text-sm font-semibold transition-all ${
                tab === i
                  ? 'bg-brand-deep text-text-inverse shadow-card'
                  : 'text-text-secondary hover:text-brand-deep'
              }`}
            >
              <j.icon size={16} /> {j.label}
            </button>
          ))}
        </div>

        <p className="text-text-secondary mt-6 max-w-prose leading-relaxed">{journey.lede}</p>

        {/* The journey itself */}
        <ol className="grid md:grid-cols-2 xl:grid-cols-3 gap-5 mt-10">
          {journey.steps.map((s, i) => (
            <li
              key={s.title}
              className="relative p-6 rounded-card border border-border-subtle bg-bg-primary
                hover:border-brand-green/40 hover:shadow-card transition-all duration-200 animate-fade-up"
              style={{ animationDelay: `${i * 45}ms` }}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="w-11 h-11 rounded-xl bg-brand-muted grid place-items-center shrink-0">
                  <s.icon size={19} className="text-brand-deep" />
                </span>
                <span className="font-display text-3xl font-semibold text-border-strong leading-none">
                  {String(i + 1).padStart(2, '0')}
                </span>
              </div>
              <h3 className="font-bold text-text-primary mt-4">{s.title}</h3>
              <p className="text-sm text-text-secondary mt-2 leading-relaxed">{s.body}</p>
            </li>
          ))}
        </ol>

        <div className="flex flex-wrap items-center justify-between gap-4 mt-10 p-5 rounded-card bg-brand-muted border border-brand-green/25">
          <p className="text-sm font-semibold text-brand-deep">{journey.replaces}</p>
          {journey.cta && (
            <Link to={journey.cta.to}>
              <Button variant="deep">
                {journey.cta.label} <ArrowRight size={16} />
              </Button>
            </Link>
          )}
        </div>
      </div>
    </section>
  );
};

/* ==================================================================== */
/*  3 — The AI chain                                                    */
/* ==================================================================== */

const AiChain = () => {
  const [open, setOpen] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const stage = AI_CHAIN[open];

  return (
    <section id="ai" className="section scroll-mt-[9rem]">
      <Heading
        eyebrow="The AI chain"
        title="Where the intelligence actually sits"
        sub="Eleven AI functions run across a single hire, in a chain — each one handing structured work to the next. Select a stage to see what goes in, what comes out, and what it removes from somebody's day."
      />

      <div className="grid lg:grid-cols-[20rem_1fr] gap-8 items-start">
        {/* Stage rail.
            min-w-0 is load-bearing: the taglines are `truncate`, so their
            nowrap width becomes the grid track's min-content size and the
            column grows past the viewport on narrow screens. */}
        <ol className="relative flex flex-col gap-1.5 min-w-0">
          <div
            className="absolute left-[27px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-brand-green via-border-strong to-accent-ochre"
            aria-hidden="true"
          />
          {AI_CHAIN.map((s, i) => {
            const isOpen = open === i;
            return (
              <li key={s.key} className="relative">
                <button
                  onClick={() => setOpen(i)}
                  aria-expanded={isOpen}
                  className={`w-full flex items-center gap-3.5 p-2.5 rounded-card text-left transition-all ${
                    isOpen ? 'bg-bg-surface shadow-card border border-brand-green/40' : 'border border-transparent hover:bg-bg-elevated'
                  }`}
                >
                  <span
                    className={`relative z-10 w-11 h-11 rounded-xl grid place-items-center shrink-0 border-2 transition-colors ${
                      isOpen
                        ? 'bg-brand-deep border-brand-deep text-text-inverse'
                        : 'bg-bg-surface border-border-subtle text-brand-deep'
                    }`}
                  >
                    <s.icon size={18} />
                  </span>
                  <span className="min-w-0 overflow-hidden">
                    <span className="block text-sm font-bold text-text-primary">{s.stage}</span>
                    <span className="block text-xs text-text-muted truncate">{s.tagline}</span>
                  </span>
                  <ChevronRight
                    size={16}
                    className={`ml-auto shrink-0 transition-transform ${isOpen ? 'text-brand-deep translate-x-0.5' : 'text-text-muted'}`}
                  />
                </button>
              </li>
            );
          })}
        </ol>

        {/* Detail panel */}
        <div
          key={stage.key}
          className="bg-bg-surface border border-border-subtle rounded-card shadow-card p-7 animate-fade-up min-w-0"
        >
          <div className="flex items-center gap-3">
            <span className="w-12 h-12 rounded-xl bg-brand-muted grid place-items-center">
              <stage.icon size={22} className="text-brand-deep" />
            </span>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-text-muted">
                Stage {open + 1} of {AI_CHAIN.length}
              </div>
              <h3 className="font-display text-2xl font-semibold text-text-primary leading-tight">
                {stage.stage}
              </h3>
            </div>
          </div>

          <p className="text-text-secondary leading-relaxed mt-5">{stage.body}</p>

          <div className="grid sm:grid-cols-2 gap-4 mt-6">
            <div className="p-4 rounded-card bg-bg-primary border border-border-subtle">
              <div className="text-[11px] font-bold uppercase tracking-wide text-text-muted">Goes in</div>
              <p className="text-sm text-text-secondary mt-1.5 leading-snug">{stage.input}</p>
            </div>
            <div className="p-4 rounded-card bg-bg-primary border border-border-subtle">
              <div className="text-[11px] font-bold uppercase tracking-wide text-text-muted">Comes out</div>
              <p className="text-sm text-text-secondary mt-1.5 leading-snug">{stage.output}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-5">
            {stage.functions.map((f) => (
              <Badge key={f} variant="brand">
                <Cpu size={12} /> {f}
              </Badge>
            ))}
          </div>

          <div className="flex gap-3 mt-6 pt-5 border-t border-border-subtle">
            <CheckCircle2 size={18} className="text-success shrink-0 mt-0.5" />
            <p className="text-sm text-text-primary font-medium leading-relaxed">{stage.gain}</p>
          </div>
        </div>
      </div>

      {/* The two things worth saying out loud about the AI */}
      <div className="grid md:grid-cols-2 gap-5 mt-xl">
        <div className="p-6 rounded-card bg-bg-deep text-text-inverse relative overflow-hidden">
          <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-brand-green/15 blur-3xl" />
          <div className="relative">
            <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-accent-ochre">
              <Scale size={14} /> Where AI stops
            </span>
            <h3 className="font-display text-2xl font-semibold mt-3 leading-tight">
              The model extracts and judges. It never scores.
            </h3>
            <p className="text-text-onDeepDim mt-3 leading-relaxed text-sm">
              Once the AI has read a CV and a vacancy, the match itself is fixed arithmetic over what
              it found. That is a deliberate boundary. It is why the breakdown can be shown to both
              sides, why identical inputs always produce an identical number, and why nobody has to
              take a score on trust.
            </p>
          </div>
        </div>

        <div className="p-6 rounded-card bg-bg-surface border border-border-subtle shadow-card">
          <span className="eyebrow">
            <ShieldCheck size={14} /> When AI fails
          </span>
          <h3 className="font-display text-2xl font-semibold text-text-primary mt-3 leading-tight">
            It degrades the experience. It never blocks a person.
          </h3>
          <p className="text-text-secondary mt-3 leading-relaxed text-sm">
            Every one of the eleven functions is wrapped so that a slow, rate-limited or unavailable
            model returns a realistic fallback instead of an error. Transient failures are retried
            automatically before that. A candidate can always finish applying, and an employer can
            always finish posting, whatever the model is doing.
          </p>
        </div>
      </div>

      {/* Full function list */}
      <div className="mt-8">
        <button
          onClick={() => setShowAll((v) => !v)}
          aria-expanded={showAll}
          className="inline-flex items-center gap-2 text-sm font-semibold text-brand-deep hover:gap-3 transition-all"
        >
          {showAll ? <Minus size={16} /> : <Plus size={16} />}
          {showAll ? 'Hide the full function list' : 'See all eleven functions, plus embeddings'}
        </button>

        {showAll && (
          <div className="mt-5 overflow-x-auto rounded-card border border-border-subtle bg-bg-surface shadow-card animate-fade-up">
            <table className="w-full text-left border-collapse min-w-[42rem]">
              <thead>
                <tr className="bg-bg-elevated">
                  <th className="text-xs font-bold uppercase tracking-wide text-text-muted px-5 py-3">Function</th>
                  <th className="text-xs font-bold uppercase tracking-wide text-text-muted px-5 py-3">Runs at</th>
                  <th className="text-xs font-bold uppercase tracking-wide text-text-muted px-5 py-3">Produces</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {AI_FUNCTIONS.map(([fn, where, out]) => (
                  <tr key={fn} className="hover:bg-bg-elevated/60 transition-colors">
                    <td className="px-5 py-3 text-sm font-semibold text-brand-deep whitespace-nowrap">{fn}</td>
                    <td className="px-5 py-3 text-sm text-text-muted whitespace-nowrap">{where}</td>
                    <td className="px-5 py-3 text-sm text-text-secondary">{out}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
};

/* ==================================================================== */
/*  4 — The matching engine                                             */
/* ==================================================================== */

const PRESETS = [
  { label: 'Ideal fit',        values: { skills: 100, location: 100, salary: 100, education: 100, experience: 100 } },
  { label: 'Right skills, wrong city', values: { skills: 100, location: 0, salary: 100, education: 100, experience: 100 } },
  { label: 'Career changer',   values: { skills: 60, location: 100, salary: 100, education: 100, experience: 33 } },
  { label: 'Long shot',        values: { skills: 25, location: 50, salary: 60, education: 67, experience: 67 } },
];

const MatchingEngine = () => {
  const [sim, setSim] = useState(PRESETS[0].values);

  const total = Math.round(FACTORS.reduce((sum, f) => sum + sim[f.key] * f.weight, 0));

  return (
    <section id="matching" className="bg-bg-surface border-y border-border-subtle scroll-mt-[9rem]">
      <div className="section">
        <Heading
          eyebrow="The matching engine"
          title="A score you can take apart"
          sub="Five factors, fixed weights, no hidden term. Change the assumptions below and watch the number move — this is the same arithmetic the platform runs, with the weights imported from the engine rather than retyped."
        />

        <div className="grid lg:grid-cols-[1fr_20rem] gap-8 items-start">
          {/* Controls */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-wide text-text-muted mr-1">
                Try a candidate:
              </span>
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => setSim(p.values)}
                  className="px-3 py-1.5 rounded-pill text-xs font-semibold border border-border-subtle
                    bg-bg-primary text-text-secondary hover:border-brand-green/50 hover:text-brand-deep transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>

            {FACTORS.map((f) => {
              const earned = sim[f.key] * f.weight;
              const available = f.weight * 100;
              return (
                <div key={f.key} className="p-5 rounded-card border border-border-subtle bg-bg-primary">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-9 h-9 rounded-lg bg-brand-muted grid place-items-center shrink-0">
                        <f.icon size={16} className="text-brand-deep" />
                      </span>
                      <div>
                        <span className="text-sm font-bold text-text-primary">{f.label}</span>
                        <span className="text-xs text-text-muted ml-2">
                          {Math.round(f.weight * 100)}% of the score
                        </span>
                      </div>
                    </div>

                    <div className="inline-flex gap-1 p-1 bg-bg-elevated rounded-pill border border-border-subtle">
                      {f.options.map((o) => (
                        <button
                          key={o.label}
                          onClick={() => setSim((s) => ({ ...s, [f.key]: o.value }))}
                          aria-pressed={sim[f.key] === o.value}
                          className={`px-3 py-1.5 rounded-pill text-xs font-semibold transition-all ${
                            sim[f.key] === o.value
                              ? 'bg-brand-green text-brand-ink shadow-card'
                              : 'text-text-secondary hover:text-brand-deep'
                          }`}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Points earned against points available for this factor */}
                  <div className="mt-4 h-2 rounded-full bg-bg-elevated overflow-hidden">
                    <div
                      className="h-full bg-brand-green rounded-full transition-all duration-500"
                      style={{ width: `${earned}%` }}
                    />
                  </div>
                  <div className="flex items-start justify-between gap-4 mt-2.5">
                    <p className="text-xs text-text-muted leading-snug max-w-prose">{f.rule}</p>
                    <span className="text-xs font-bold text-brand-deep whitespace-nowrap">
                      {earned.toFixed(1)} / {available.toFixed(0)} pts
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Result */}
          <div className="lg:sticky lg:top-[9.5rem]">
            <div className="bg-bg-deep text-text-inverse rounded-card p-7 shadow-deep relative overflow-hidden">
              <div className="absolute -right-16 -bottom-20 w-56 h-56 rounded-full bg-brand-green/20 blur-3xl" />
              <div className="relative">
                <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-accent-ochre">
                  <Radar size={14} /> Match score
                </span>
                <div className="font-display text-7xl font-semibold leading-none mt-4">{total}</div>
                <div className="text-sm text-text-onDeepDim mt-1">out of 100</div>

                <div className="h-2.5 rounded-full bg-white/15 overflow-hidden mt-6">
                  <div
                    className="h-full bg-brand-green rounded-full transition-all duration-500"
                    style={{ width: `${total}%` }}
                  />
                </div>

                <ul className="mt-6 flex flex-col gap-2 pt-5 border-t border-border-onDeep">
                  {FACTORS.map((f) => (
                    <li key={f.key} className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-text-onDeepDim">{f.label}</span>
                      <span className="font-semibold">{(sim[f.key] * f.weight).toFixed(1)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <p className="text-xs text-text-muted mt-4 leading-relaxed">
              In the real platform this number is calculated at the moment of applying and frozen onto
              the application — against the CV actually being sent. The score the candidate saw is the
              score the employer reads.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ==================================================================== */
/*  5 — What you get                                                    */
/* ==================================================================== */

const WhatYouGet = () => {
  const [tab, setTab] = useState(0);
  const side = BENEFITS[tab];

  return (
    <section id="value" className="section scroll-mt-[9rem]">
      <Heading
        eyebrow="What you get"
        title="The advantage, stated plainly"
        center
      />

      <div className="flex justify-center">
        <div
          role="tablist"
          aria-label="Choose an audience"
          className="inline-flex gap-1.5 p-1.5 bg-bg-elevated rounded-pill border border-border-subtle"
        >
          {BENEFITS.map((b, i) => (
            <button
              key={b.key}
              role="tab"
              aria-selected={tab === i}
              onClick={() => setTab(i)}
              className={`inline-flex items-center gap-2 px-5 py-2 rounded-pill text-sm font-semibold transition-all ${
                tab === i ? 'bg-brand-deep text-text-inverse shadow-card' : 'text-text-secondary hover:text-brand-deep'
              }`}
            >
              <b.icon size={16} /> {b.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-10">
        {side.items.map((it, i) => (
          <div
            key={it.title}
            className="p-6 rounded-card border border-border-subtle bg-bg-surface shadow-card
              hover:border-brand-green/40 hover:shadow-lift transition-all duration-200 animate-fade-up"
            style={{ animationDelay: `${i * 45}ms` }}
          >
            <span className="w-11 h-11 rounded-xl bg-brand-muted grid place-items-center">
              <it.icon size={19} className="text-brand-deep" />
            </span>
            <h3 className="font-bold text-text-primary mt-4">{it.title}</h3>
            <p className="text-sm text-text-secondary mt-2 leading-relaxed">{it.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

/* ==================================================================== */
/*  6 — Trust and the rules                                             */
/* ==================================================================== */

const Trust = () => {
  const [open, setOpen] = useState(0);

  return (
    <section id="trust" className="bg-bg-surface border-y border-border-subtle scroll-mt-[9rem]">
      <div className="section">
        <Heading
          eyebrow="Trust & rules"
          title="What the platform will not let anyone do"
          sub="These are enforced on the server, not in the interface. The screens reflect them; they never grant them. Each one exists because of what happens when it is missing."
        />

        <div className="grid lg:grid-cols-[1.2fr_1fr] gap-8 items-start">
          {/* The rules */}
          <div className="flex flex-col gap-3">
            {RULES.map((r, i) => {
              const isOpen = open === i;
              return (
                <div
                  key={r.q}
                  className={`border rounded-card bg-bg-primary transition-all duration-200 ${
                    isOpen ? 'border-brand-green/45 shadow-card' : 'border-border-subtle'
                  }`}
                >
                  <button
                    onClick={() => setOpen(isOpen ? -1 : i)}
                    aria-expanded={isOpen}
                    className="w-full flex items-center justify-between gap-4 text-left px-5 py-4"
                  >
                    <span className="flex items-start gap-3">
                      <Scale size={17} className="text-brand-deep shrink-0 mt-0.5" />
                      <span className="font-semibold text-text-primary">{r.q}</span>
                    </span>
                    <span className="shrink-0 w-7 h-7 rounded-full bg-bg-elevated grid place-items-center">
                      {isOpen ? <Minus size={15} /> : <Plus size={15} />}
                    </span>
                  </button>
                  {isOpen && (
                    <p className="px-5 pb-5 pl-[3.25rem] -mt-1 text-sm text-text-secondary leading-relaxed">
                      {r.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Security controls */}
          <div className="bg-bg-primary border border-border-subtle rounded-card shadow-card p-6">
            <span className="eyebrow">
              <ShieldCheck size={14} /> Security controls in place
            </span>
            <ul className="flex flex-col gap-4 mt-5">
              {SECURITY.map((s) => (
                <li key={s.text} className="flex gap-3">
                  <span className="w-8 h-8 rounded-lg bg-brand-muted grid place-items-center shrink-0">
                    <s.icon size={15} className="text-brand-deep" />
                  </span>
                  <p className="text-sm text-text-secondary leading-snug">{s.text}</p>
                </li>
              ))}
            </ul>

            <div className="mt-6 pt-5 border-t border-border-subtle">
              <p className="text-xs text-text-muted leading-relaxed">
                <span className="font-bold text-text-secondary">Still open, and said rather than hidden:</span>{' '}
                there is no security-headers package yet, and rate limiting counts per network address —
                a deployment behind a load balancer has to be told to trust the proxy or every visitor
                collapses into a single bucket.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ==================================================================== */
/*  Closing                                                             */
/* ==================================================================== */

const ClosingCta = () => (
  <section className="section pt-0">
    <div className="relative overflow-hidden rounded-[26px] bg-bg-deeper text-text-inverse px-8 py-14 sm:px-14">
      <div className="absolute -right-20 -top-24 w-96 h-96 rounded-full bg-brand-green/15 blur-3xl" />
      <div className="absolute -left-16 -bottom-24 w-80 h-80 rounded-full bg-accent-ochre/15 blur-3xl" />

      <div className="relative text-center max-w-2xl mx-auto">
        <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-accent-ochre">
          <Brain size={14} /> Start here
        </span>
        <h2 className="font-display text-4xl font-semibold mt-4 leading-tight">
          Whichever side of the table you are on
        </h2>
        <p className="text-text-onDeepDim mt-4 leading-relaxed">
          Candidates upload a CV and see what fits within minutes. Employers post a role and read
          applicants already ranked and already explained.
        </p>

        <div className="flex flex-wrap justify-center gap-3 mt-8">
          <Link to="/signup">
            <Button variant="primary" size="lg">
              <Users size={17} /> I am looking for work
            </Button>
          </Link>
          <Link to="/provider/signup">
            <Button variant="onDeep" size="lg">
              <Building2 size={17} /> I am hiring
            </Button>
          </Link>
        </div>

        <p className="text-sm text-text-onDeepDim mt-6">
          Questions about any of this?{' '}
          <Link to="/contact" className="font-semibold text-text-inverse underline underline-offset-4">
            Get in touch
          </Link>
          .
        </p>
      </div>
    </div>
  </section>
);

export default About;
