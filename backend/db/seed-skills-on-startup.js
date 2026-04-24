/* ═══════════════════════════════════════════════════════
   Auto-seed 42 Skills on Startup (for Railway & Production)
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
    const existingSkills = parseInt(result.rows[0].count || 0, 10);

    if (existingSkills >= 40) {
      console.log(`✅ Database already has ${existingSkills} published skills`);
      return;
    }

    console.log(`
    📊 Seed Status Report:
      - Existing published skills: ${existingSkills}
      - Seed file location: ${sqlPath}
      - Seed file exists: ${fs.existsSync(sqlPath)}
      - Statements to execute: ${statements.length}
    `);

    // Read SQL seed file
    const sqlPath = path.join(__dirname, '../sql/seed-42-skills.sql');
    if (!fs.existsSync(sqlPath)) {
      console.warn(`⚠️  Seed file not found: ${sqlPath}`);
      return;
    }

    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    const statements = sqlContent
      .split(';')
      .filter(s => s.trim() && !s.trim().startsWith('--'))
      .map(s => s.trim() + ';');

    let successCount = 0;
    for (const statement of statements) {
      try {
        await db.query(statement);
        successCount++;
      } catch (err) {
        // Silently ignore duplicate errors
        if (!err.message?.includes('UNIQUE') && !err.message?.includes('already exists')) {
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
