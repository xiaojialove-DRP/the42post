/* ═══════════════════════════════════════════════════════
   Backfill Skill Descriptions
   ═══════════════════════════════════════════════════════

   Purpose:
   - Find skills whose description (en or cn) is missing, too short,
     or just nonsense user input (e.g. "ssadsfsef").
   - Use the same LLM refine+translate pipeline as the live POST /skills
     route to produce a one-sentence bilingual description.
   - Update the DB row in place. Dry-run by default; pass --apply to write.

   Usage:
     node backend/scripts/backfill-descriptions.js          # preview
     node backend/scripts/backfill-descriptions.js --apply  # actually update

   Safety:
   - Only touches rows that match the "needs fix" criteria.
   - Per-skill failures don't abort the run.
   - Logs each decision so you can audit.
*/

import { SqlitePool } from '../db/sqlite-adapter.js';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { callLLMJSON } from '../utils/skillGeneration.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Resolve DB path (production volume first, then local fallback)
const PROD_PATH = '/app/data/database.sqlite3';
const LOCAL_PATH = join(__dirname, '../../database.sqlite3');
const dbPath = existsSync(PROD_PATH) ? PROD_PATH : LOCAL_PATH;

console.log(`[backfill] Database: ${dbPath}`);

const APPLY = process.argv.includes('--apply');
console.log(`[backfill] Mode: ${APPLY ? 'APPLY (will write)' : 'DRY RUN'}`);

// Heuristic: "description needs fixing" if any of these is true
function needsFix(skill) {
  const en = (skill.description || '').trim();
  const cn = (skill.description_cn || '').trim();

  // 1. Either language missing
  if (!en || !cn) return { reason: 'empty', en, cn };

  // 2. Too short (likely garbage like "ssadsfsef")
  if (en.length < 10 || cn.length < 5) return { reason: 'too_short', en, cn };

  // 3. EN and CN are identical (translation never happened)
  if (en === cn) return { reason: 'monolingual', en, cn };

  // 4. Looks like raw user input pasted (very long, no period, ramble)
  if (en.length > 200 && !/[.!?]/.test(en.slice(0, 100))) {
    return { reason: 'too_long_unrefined', en, cn };
  }

  return null;
}

function detectIsChinese(text) {
  if (!text || typeof text !== 'string') return false;
  return /[一-鿿　-〿＀-￯]/.test(text);
}

async function refineSkill(skill) {
  const sourceTitle = detectIsChinese(skill.title_cn || skill.title || '')
    ? (skill.title_cn || skill.title)
    : (skill.title || skill.title_cn);
  const isSourceChinese = detectIsChinese(sourceTitle);

  // Pull source description from the longer existing one, or from five_layer.defining
  let sourceDesc = (skill.description || skill.description_cn || '').trim();
  if (sourceDesc.length < 10) {
    try {
      const fl = JSON.parse(skill.five_layer || '{}');
      sourceDesc = fl.defining || fl.Defining || sourceDesc || skill.title;
    } catch (e) {
      sourceDesc = skill.title || '(no source)';
    }
  }

  const prompt = `You curate metadata for skills on "THE 42 POST", an AI alignment platform. Given a Skill's title and a (possibly long, raw, or empty) description, produce a refined bilingual pair.

Rules:
- Description: ONE sentence, under 100 characters in English (or 40 Chinese chars). Capture the essence, not the full idea. Crisp, evocative, slightly poetic. No marketing fluff.
- Title: keep brief (under 30 chars). Refine if awkward.
- Preserve technical terms (Skill, AI, prompt) in English even in Chinese version.
- Tone: philosophical, design-oriented, sometimes playful — never corporate.

Source language: ${isSourceChinese ? 'Chinese' : 'English'}
Source title: ${sourceTitle}
Source description: ${sourceDesc}

Return ONLY this JSON:
{
  "title_en": "concise English title",
  "title_cn": "简洁中文标题",
  "description_en": "One crisp English sentence.",
  "description_cn": "一句精炼的中文描述。"
}`;

  const result = await callLLMJSON(prompt, 600);
  return result.data || {};
}

async function main() {
  const db = new SqlitePool({ connectionString: `sqlite:///${dbPath}` });
  global.__db__ = db;

  const allRes = await db.query(
    'SELECT id, title, title_cn, description, description_cn, five_layer FROM skills WHERE deleted_at IS NULL'
  );
  const skills = allRes.rows;
  console.log(`[backfill] Total skills in DB: ${skills.length}`);

  const candidates = [];
  for (const s of skills) {
    const fix = needsFix(s);
    if (fix) candidates.push({ ...s, _fix: fix });
  }

  console.log(`[backfill] Candidates needing fix: ${candidates.length}`);
  if (candidates.length === 0) {
    console.log('[backfill] Nothing to do. All skills have good bilingual descriptions.');
    db.end();
    return;
  }

  console.log('[backfill] Sample candidates:');
  for (const c of candidates.slice(0, 5)) {
    console.log(`  - [${c._fix.reason}] ${c.title} | en: "${(c.description || '').slice(0, 50)}" | cn: "${(c.description_cn || '').slice(0, 30)}"`);
  }

  if (!APPLY) {
    console.log('\n[backfill] DRY RUN — no changes written. Re-run with --apply to update.');
    db.end();
    return;
  }

  let success = 0, failed = 0;
  for (const skill of candidates) {
    process.stdout.write(`[backfill] Refining "${skill.title}" (${skill._fix.reason})... `);
    try {
      const out = await refineSkill(skill);
      if (!out.description_en && !out.description_cn) {
        throw new Error('LLM returned empty descriptions');
      }
      await db.query(
        `UPDATE skills SET
           title = COALESCE($1, title),
           title_cn = COALESCE($2, title_cn),
           description = COALESCE($3, description),
           description_cn = COALESCE($4, description_cn),
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $5`,
        [
          out.title_en || null,
          out.title_cn || null,
          out.description_en || null,
          out.description_cn || null,
          skill.id
        ]
      );
      console.log(`✓`);
      success++;
    } catch (err) {
      console.log(`✗ ${err.message}`);
      failed++;
    }
  }

  console.log(`\n[backfill] Done. ${success} updated, ${failed} failed.`);
  db.end();
}

main().catch(err => {
  console.error('[backfill] Fatal:', err);
  process.exit(1);
});
