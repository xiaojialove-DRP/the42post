/* ═══════════════════════════════════════════════════════
   Versioned Schema Migrations (SQLite + PostgreSQL compatible)

   Replaces the old pattern of running every ALTER TABLE on every boot
   inside try/catch and swallowing "duplicate column" errors — which
   worked, but spammed ~20 expected errors into the boot log (burying
   real ones) and gave no record of which schema changes a given
   database had actually received.

   How it works:
   - schema_migrations records each migration name once it has run.
   - A migration is either a list of SQL `statements` or a `run(db)`
     function for logic that can't be expressed as plain statements.
   - Databases created before this mechanism already have most of these
     columns, so "duplicate column / already exists" errors are treated
     as "already applied" and the migration is recorded — the noise
     happens at most once per database, then never again.
   - Any other error aborts startup: a half-migrated schema is worse
     than a crashed boot.

   Adding a migration: append to MIGRATIONS with a new unique name
   (keep the NNN_ prefix ordered). Never edit or remove an entry that
   has shipped — databases that already recorded it will not re-run it.
   ═══════════════════════════════════════════════════════ */

// Errors that mean "this schema change already happened" (pre-migration
// databases). SQLite: "duplicate column name", "already exists".
// PostgreSQL: 42701 duplicate_column, 42P07 duplicate_table.
function isAlreadyApplied(err) {
  const msg = (err?.message || '').toLowerCase();
  return (
    msg.includes('duplicate column') ||
    msg.includes('already exists') ||
    err?.code === '42701' ||
    err?.code === '42P07'
  );
}

// Exported so test/helpers/db.js can apply the same migrations to its
// in-memory database — the test schema previously drifted from production
// because every new column had to be added in both places by hand.
export const MIGRATIONS = [
  {
    name: '001_users_background',
    statements: [`ALTER TABLE users ADD COLUMN background TEXT`]
  },
  {
    name: '002_skill_test_votes_diagnostic',
    statements: [`ALTER TABLE skill_test_votes ADD COLUMN diagnostic TEXT`]
  },
  {
    name: '003_skills_creator_anonymous_id',
    statements: [`ALTER TABLE skills ADD COLUMN creator_anonymous_id TEXT`]
  },
  {
    name: '004_skills_ready_to_use_prompt',
    statements: [`ALTER TABLE skills ADD COLUMN ready_to_use_prompt TEXT`]
  },
  {
    name: '005_skills_moderation_and_downloads',
    statements: [
      `ALTER TABLE skills ADD COLUMN moderation_status VARCHAR(30) DEFAULT 'pending'`,
      `ALTER TABLE skills ADD COLUMN moderation_risk_level VARCHAR(20)`,
      `ALTER TABLE skills ADD COLUMN moderation_explanation TEXT`,
      `ALTER TABLE skills ADD COLUMN moderation_categories TEXT`,
      `ALTER TABLE skills ADD COLUMN moderation_decided_at TIMESTAMP`,
      `ALTER TABLE skills ADD COLUMN moderation_review_required INTEGER DEFAULT 0`,
      `ALTER TABLE skills ADD COLUMN download_count INTEGER DEFAULT 0`,
      `CREATE INDEX IF NOT EXISTS idx_skills_moderation_status ON skills(moderation_status)`,
      `CREATE INDEX IF NOT EXISTS idx_skills_moderation_review ON skills(moderation_review_required) WHERE moderation_review_required = 1`
    ]
  },
  {
    name: '006_probe_sessions_research_consent',
    statements: [`ALTER TABLE probe_sessions ADD COLUMN research_consent INTEGER DEFAULT 1`]
  },
  {
    name: '007_skill_test_votes_research_text',
    statements: [
      `ALTER TABLE skill_test_votes ADD COLUMN scenario_text TEXT`,
      `ALTER TABLE skill_test_votes ADD COLUMN response_a_text TEXT`,
      `ALTER TABLE skill_test_votes ADD COLUMN response_b_text TEXT`,
      `ALTER TABLE skill_test_votes ADD COLUMN decision_ms INTEGER`
    ]
  },
  {
    name: '008_forging_histories_research_columns',
    statements: [
      `ALTER TABLE forging_histories ADD COLUMN country_code VARCHAR(10)`,
      `ALTER TABLE forging_histories ADD COLUMN accept_language VARCHAR(100)`,
      `ALTER TABLE forging_histories ADD COLUMN probe_session_id TEXT REFERENCES probe_sessions(id) ON DELETE SET NULL`
    ]
  },
  {
    // One-time data cleanup that previously re-ran on every boot.
    name: '009_normalize_creator_names',
    statements: [
      `UPDATE skills SET creator_anonymous_id = 'creator_42'
       WHERE (creator_anonymous_id IS NULL OR creator_anonymous_id = '')
         AND deleted_at IS NULL`,
      `UPDATE skills SET creator_anonymous_id = 'creator_' || creator_anonymous_id
       WHERE creator_anonymous_id IS NOT NULL
         AND creator_anonymous_id NOT LIKE 'creator_%'
         AND deleted_at IS NULL`,
      `UPDATE skills SET creator_anonymous_id = REPLACE(creator_anonymous_id, 'creator_creator_', 'creator_')
       WHERE creator_anonymous_id LIKE 'creator_creator_%'
         AND deleted_at IS NULL`
    ]
  },
  {
    // probe_logs was originally created with NOT NULL on user_id, but the
    // probe endpoint is public (no auth). SQLite can't ALTER COLUMN, so
    // detect the old constraint with a test insert and rename-recreate.
    name: '010_probe_logs_nullable_user_id',
    run: async (db) => {
      try {
        await db.query(`INSERT INTO probe_logs (id, user_id, idea_text, generated_probe) VALUES ('__schema_test__', NULL, 'test', 'test')`);
        await db.query(`DELETE FROM probe_logs WHERE id = '__schema_test__'`);
      } catch (schemaErr) {
        if (schemaErr.message && schemaErr.message.includes('NOT NULL')) {
          console.log('[migrate] probe_logs: removing NOT NULL constraint on user_id…');
          await db.query(`ALTER TABLE probe_logs RENAME TO probe_logs_old`);
          await db.query(`
            CREATE TABLE probe_logs (
              id TEXT PRIMARY KEY,
              user_id TEXT REFERENCES users(id),
              idea_text TEXT NOT NULL,
              generated_probe TEXT NOT NULL,
              model_version VARCHAR(50),
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
          `);
          await db.query(`INSERT INTO probe_logs SELECT * FROM probe_logs_old`);
          await db.query(`DROP TABLE probe_logs_old`);
          await db.query(`CREATE INDEX IF NOT EXISTS idx_probe_logs_user ON probe_logs(user_id)`);
        }
      }
    }
  },
  {
    // Research integrity: which pipeline produced the published skill
    // ('deepseek' | 'claude' | 'template'), which stored draft it came
    // from, and how much the author edited the AI draft before publishing
    // (0 = published verbatim, 1 = fully rewritten). NULL on all three =
    // published before this was tracked, or client didn't pass draft_id.
    name: '011_skills_generation_provenance',
    statements: [
      `ALTER TABLE skills ADD COLUMN generation_source VARCHAR(30)`,
      `ALTER TABLE skills ADD COLUMN draft_id TEXT`,
      `ALTER TABLE skills ADD COLUMN draft_edit_ratio REAL`
    ]
  },
  {
    // Server-side record of every AI-generated five-layer draft, written
    // at /api/forge/preview time. The publish endpoint joins back to this
    // by draft_id so generation_source and edit distance are derived from
    // server-stored data, not client-claimed flags.
    name: '012_generation_drafts_table',
    statements: [
      `CREATE TABLE IF NOT EXISTS generation_drafts (
        id TEXT PRIMARY KEY,
        skill_name TEXT,
        definition TEXT,
        domain VARCHAR(100),
        language VARCHAR(10),
        draft_json TEXT NOT NULL,
        model VARCHAR(100),
        is_fallback INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE INDEX IF NOT EXISTS idx_generation_drafts_created ON generation_drafts(created_at)`
    ]
  },
  {
    // Marks a Twin Test vote as cast by the Skill's own creator. The vote
    // still counts toward the public win rate (see utils/verificationHealth.js
    // header) — this flag exists so author votes can be singled out later
    // for data analysis, not to exclude them.
    name: '013_skill_test_votes_is_author',
    statements: [
      `ALTER TABLE skill_test_votes ADD COLUMN is_author INTEGER DEFAULT 0`,
      `CREATE INDEX IF NOT EXISTS idx_skill_test_votes_skill_author ON skill_test_votes(skill_id, is_author)`
    ]
  },
  {
    // Cache for on-demand five-layer/ready-to-use-prompt translation
    // (utils/skillGeneration.js translateFiveLayerContent, called from
    // POST /api/skills/:id/translate-content). A Skill's generated content
    // is only ever forged in one language; this stores the translation
    // into whichever OTHER language someone has actually requested a
    // download in, so the LLM call happens once per Skill per target
    // language rather than once per download. content_translated_lang
    // records which language the cached columns are in ('cn' or 'en') —
    // a Skill only ever needs one cached translation, since it only has
    // one "other" language.
    name: '014_skills_content_translation_cache',
    statements: [
      `ALTER TABLE skills ADD COLUMN five_layer_translated TEXT`,
      `ALTER TABLE skills ADD COLUMN ready_to_use_prompt_translated TEXT`,
      `ALTER TABLE skills ADD COLUMN content_translated_lang VARCHAR(10)`
    ]
  }
];

export async function runMigrations(db) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const appliedRes = await db.query(`SELECT name FROM schema_migrations`);
  const applied = new Set((appliedRes.rows || []).map(r => r.name));

  let ran = 0;
  for (const migration of MIGRATIONS) {
    if (applied.has(migration.name)) continue;

    try {
      if (migration.run) {
        await migration.run(db);
      } else {
        for (const sql of migration.statements) {
          try {
            await db.query(sql);
          } catch (err) {
            if (isAlreadyApplied(err)) continue;
            throw err;
          }
        }
      }
    } catch (err) {
      // A migration that fails for a real reason must abort startup —
      // recording it as applied would permanently skip it.
      throw new Error(`Migration ${migration.name} failed: ${err.message}`);
    }

    await db.query(`INSERT INTO schema_migrations (name) VALUES ($1)`, [migration.name]);
    ran++;
    console.log(`[migrate] applied ${migration.name}`);
  }

  if (ran === 0) {
    console.log(`[migrate] schema up to date (${MIGRATIONS.length} migrations recorded)`);
  }
}
