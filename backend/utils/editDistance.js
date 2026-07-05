/* ═══════════════════════════════════════════════════════
   Draft-vs-published edit distance

   Research metric: how much did the author actually edit the AI-generated
   draft before publishing? 0 = published verbatim, 1 = fully rewritten.
   This is the measurable "human contribution" signal that separates
   "the human wrote one sentence and shipped whatever the LLM said"
   from "the human substantially reworked the draft" — the confound any
   reviewer of this dataset will ask about first.
   ═══════════════════════════════════════════════════════ */

// The five layer fields + the ready-to-use prompt, in a fixed order so
// draft and published text flatten identically regardless of key order.
const TEXT_FIELDS = [
  'defining',
  'instantiating',
  'fencing',
  'validating',
  'contextualizing',
  'ready_to_use_prompt'
];

// Levenshtein inputs are capped so a pathological payload can't stall the
// publish request — 8k chars each side ≈ 64M cell upper bound, still
// tens of ms in practice since real skills are 1-3k chars total.
const MAX_COMPARE_CHARS = 8000;

/**
 * Flatten a skill-shaped object (draft data or published five_layer) into
 * one normalized text blob for comparison. Accepts the flat shape
 * ({ defining: "...", ... }) which is what the live forge path produces;
 * non-string fields are ignored rather than stringified so structural
 * legacy shapes don't inflate the distance.
 */
export function flattenSkillText(obj) {
  if (!obj || typeof obj !== 'object') return '';
  return TEXT_FIELDS
    .map(k => (typeof obj[k] === 'string' ? obj[k] : ''))
    .join('\n')
    .replace(/\s+/g, ' ')
    .trim();
}

// Classic two-row Levenshtein.
function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  let prev = new Array(b.length + 1);
  let curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    const ca = a.charCodeAt(i - 1);
    for (let j = 1; j <= b.length; j++) {
      const cost = ca === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

/**
 * Normalized edit ratio between an AI draft and the published skill.
 * Returns a number in [0, 1], or null when there is nothing to compare.
 */
export function draftEditRatio(draftObj, publishedObj) {
  const a = flattenSkillText(draftObj).slice(0, MAX_COMPARE_CHARS);
  const b = flattenSkillText(publishedObj).slice(0, MAX_COMPARE_CHARS);
  if (!a && !b) return null;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return null;
  return Math.round((levenshtein(a, b) / maxLen) * 1000) / 1000;
}
