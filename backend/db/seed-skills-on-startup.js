/* ═══════════════════════════════════════════════════════
   Auto-seed 42 Skills on Startup (for Zeabur & Production)
   ═══════════════════════════════════════════════════════ */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function seedSkillsIfNeeded(db) {
  try {
    // Check if skills already exist
    const result = await db.query('SELECT COUNT(*) as count FROM skills WHERE published = 1');
    const existingSkills = parseInt(result.rows[0]?.count || 0, 10);

    console.log(`[seed] Checking: ${existingSkills} published skills found`);

    if (existingSkills >= 42) {
      console.log(`✅ Database already has ${existingSkills} published skills. Skipping seed.`);
      return;
    }

    console.log(`[seed] Found ${existingSkills} skills (< 42 needed). Proceeding with seed...`);

    // Read SQL seed file (define paths BEFORE referencing them in log output)
    const sqlPath = path.join(__dirname, '../sql/seed-42-skills.sql');
    if (!fs.existsSync(sqlPath)) {
      console.warn(`⚠️  Seed file not found: ${sqlPath}`);
      return;
    }

    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    const statements = sqlContent
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n')
      .split(/;\s*\n/)
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .map(s => s + ';');

    console.log(`
    📊 Seed Status Report:
      - Existing published skills: ${existingSkills}
      - Seed file location: ${sqlPath}
      - Seed file exists: ${fs.existsSync(sqlPath)}
      - Statements to execute: ${statements.length}
    `);

    let successCount = 0;
    for (const statement of statements) {
      try {
        await db.query(statement);
        successCount++;
      } catch (err) {
        // Silently ignore duplicate errors
        if (!err.message?.toLowerCase().includes('unique') && !err.message?.includes('already exists') && err.code !== '23505') {
          console.warn(`  ⚠️  ${err.message?.substring(0, 80)}`);
        }
      }
    }

    // Verify
    const finalResult = await db.query('SELECT COUNT(*) as count FROM skills WHERE published = 1');
    const finalCount = parseInt(finalResult.rows[0].count || 0, 10);

    console.log(`✅ Seeding complete! Database now has ${finalCount} published skills\n`);
  } catch (err) {
    console.error('❌ Seeding error:', err.message);
    // Don't fail the server startup if seeding fails
  }
}
