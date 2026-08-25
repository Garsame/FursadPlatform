/**
 * What a candidate must have before they may apply.
 *
 * An application with an empty profile behind it wastes both sides' time: the
 * employer reads nothing useful, and the candidate is scored near zero on a
 * role they might genuinely suit. The bar is deliberately about the fields the
 * matching engine reads, not about filling in forms for their own sake.
 */
module.exports = {
  MIN_COMPLETENESS_TO_APPLY: Number(process.env.MIN_PROFILE_COMPLETENESS || 70)
};
