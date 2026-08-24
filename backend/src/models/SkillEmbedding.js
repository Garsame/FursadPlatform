const mongoose = require('mongoose');

/**
 * Embedding cache. Skill vocabulary is small and repeats constantly across
 * candidates and jobs, so each distinct string is embedded once and reused —
 * without this the matching engine would bill an API call per score.
 */
const skillEmbeddingSchema = new mongoose.Schema(
  {
    text:   { type: String, required: true, unique: true, index: true }, // lowercased key
    vector: { type: [Number], required: true },
    model:  { type: String, default: '' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('SkillEmbedding', skillEmbeddingSchema);
