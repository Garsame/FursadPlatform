const SkillEmbedding = require('../models/SkillEmbedding');
const aiService = require('./aiService');

/**
 * Semantic skill matching.
 *
 * Exact string equality was the single biggest weakness in scoring — "Node.js",
 * "NodeJS" and "Node" were three different skills, so a perfect candidate could
 * score 0 on the 45% weight over spelling. This compares meaning instead, with
 * a persistent cache so each distinct skill string is embedded only once.
 */

// Cosine similarity is mapped onto 0..1 credit: modern embedding models put
// unrelated terms around 0.4-0.6, so raw similarity would inflate every score.
const SIM_FLOOR = Number(process.env.SKILL_SIM_FLOOR || 0.62); // below this = no credit
const SIM_CEIL  = Number(process.env.SKILL_SIM_CEIL  || 0.86); // at/above this = full credit

const norm = (s) => String(s || '').toLowerCase().trim().replace(/\s+/g, ' ');

const cosine = (a, b) => {
  let dot = 0, ma = 0, mb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; ma += a[i] * a[i]; mb += b[i] * b[i]; }
  if (!ma || !mb) return 0;
  return dot / (Math.sqrt(ma) * Math.sqrt(mb));
};

/** Fetches vectors for the given strings, embedding and caching any misses. */
const getVectors = async (texts) => {
  const keys = [...new Set(texts.map(norm).filter(Boolean))];
  if (!keys.length) return new Map();

  const cached = await SkillEmbedding.find({ text: { $in: keys } });
  const map = new Map(cached.map((c) => [c.text, c.vector]));

  const missing = keys.filter((k) => !map.has(k));
  if (missing.length) {
    const vectors = await aiService.embedTexts(missing);
    if (vectors) {
      const docs = missing.map((text, i) => ({ text, vector: vectors[i] }));
      // Concurrent scoring can race on the same skill; ignore duplicate-key errors.
      await SkillEmbedding.insertMany(docs, { ordered: false }).catch(() => {});
      docs.forEach((d) => map.set(d.text, d.vector));
    }
  }

  return map;
};

/** Exact/substring fallback used when embeddings are unavailable. */
const literalScore = (candidateSkills, jobSkills) => {
  const cand = candidateSkills.map(norm);
  const matched = jobSkills.filter((j) => {
    const nj = norm(j);
    return cand.some((c) => c === nj || c.includes(nj) || nj.includes(c));
  });
  return Math.round((matched.length / jobSkills.length) * 100);
};

/**
 * Returns { score 0-100, matched: [{ jobSkill, via, similarity }] } so the UI
 * can explain which candidate skill satisfied which requirement.
 */
const scoreSkills = async (candidateSkills = [], jobSkills = []) => {
  if (!jobSkills.length) return { score: 100, matched: [], method: 'none-required' };
  if (!candidateSkills.length) return { score: 0, matched: [], method: 'no-skills' };

  if (!aiService.isLive()) {
    return { score: literalScore(candidateSkills, jobSkills), matched: [], method: 'literal' };
  }

  try {
    const vectors = await getVectors([...candidateSkills, ...jobSkills]);
    if (!vectors.size) {
      return { score: literalScore(candidateSkills, jobSkills), matched: [], method: 'literal' };
    }

    const matched = [];
    let total = 0;

    for (const jobSkill of jobSkills) {
      const jv = vectors.get(norm(jobSkill));
      let best = { sim: 0, via: null };

      for (const candSkill of candidateSkills) {
        // An exact match should never be beaten by embedding noise.
        if (norm(candSkill) === norm(jobSkill)) { best = { sim: 1, via: candSkill }; break; }
        const cv = vectors.get(norm(candSkill));
        if (!jv || !cv) continue;
        const sim = cosine(jv, cv);
        if (sim > best.sim) best = { sim, via: candSkill };
      }

      const credit = best.sim >= SIM_CEIL ? 1
        : best.sim <= SIM_FLOOR ? 0
        : (best.sim - SIM_FLOOR) / (SIM_CEIL - SIM_FLOOR);

      total += credit;
      if (credit > 0) {
        matched.push({ jobSkill, via: best.via, similarity: Number(best.sim.toFixed(3)) });
      }
    }

    return {
      score: Math.round((total / jobSkills.length) * 100),
      matched,
      method: 'semantic'
    };
  } catch (error) {
    console.error('Semantic skill match failed, using literal:', error.message);
    return { score: literalScore(candidateSkills, jobSkills), matched: [], method: 'literal' };
  }
};

module.exports = { scoreSkills, getVectors, cosine, literalScore };
