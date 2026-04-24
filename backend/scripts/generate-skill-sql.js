#!/usr/bin/env node

/* Generate SQL INSERT statements for 42 skills */

import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function generateSoulHash(skillData) {
  const content = JSON.stringify({
    title: skillData.title,
    defining: skillData.five_layer?.defining,
  });
  return '42-sk-' + crypto.createHash('sha256').update(content).digest('hex').substring(0, 32);
}

function escapeSQL(str) {
  return str.replace(/'/g, "''");
}

try {
  const skillsPath = path.join(__dirname, '../../frontend/skills.js');
  const skillsContent = fs.readFileSync(skillsPath, 'utf8');

  const sharedMatch = skillsContent.match(/const SHARED_SKILLS = \[([\s\S]*?)\n\];/);
  const demoMatch = skillsContent.match(/const DEMO_SKILLS_50 = \[([\s\S]*?)\n\];/);

  if (!sharedMatch || !demoMatch) {
    console.error('❌ Could not parse skills');
    process.exit(1);
  }

  const SHARED_SKILLS = eval(`[${sharedMatch[1]}]`);
  const DEMO_SKILLS_50 = eval(`[${demoMatch[1]}]`);

  // System user ID for authors
  const SYSTEM_USER_ID = uuidv4();
  let sql = '';

  // Insert system user first
  sql += `-- System user for skills\n`;
  sql += `INSERT INTO users (id, email, username, password_hash, account_type, verified, created_at) VALUES ('${SYSTEM_USER_ID}', 'system@the42post.local', 'System', 'system', 'system', 1, NOW());\n\n`;

  // Author mapping
  const authorMap = {};

  // Insert SHARED_SKILLS
  sql += `-- SHARED_SKILLS (21 high-quality skills)\n`;
  for (const skill of SHARED_SKILLS) {
    const skillId = uuidv4();
    const soulHash = generateSoulHash(skill);
    const fiveLayer = escapeSQL(JSON.stringify(skill.five_layer || {}));
    const authorId = authorMap[skill.author] || SYSTEM_USER_ID;

    sql += `INSERT INTO skills (id, author_id, title, title_cn, description, description_cn, domain, soul_hash, five_layer, forge_mode, source_agent_id, commercial_use, remix_allowed, starlight_score, published, published_at, created_at) VALUES ('${skillId}', '${authorId}', '${escapeSQL(skill.title)}', '${escapeSQL(skill.titleCn || skill.title)}', '${escapeSQL(skill.desc)}', '${escapeSQL(skill.descCn || skill.desc)}', '${skill.domain || 'general'}', '${soulHash}', '${fiveLayer}', 'human-crafted', '${skill.agent || ''}', '${skill.commercial || 'authorized'}', ${skill.remix ? 1 : 0}, ${skill.starlight || 0}, 1, NOW(), NOW());\n`;
  }

  sql += `\n-- DEMO_SKILLS_50 Best 21\n`;
  const BEST_IDS = [23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43];
  const bestDemoSkills = DEMO_SKILLS_50.filter(s => BEST_IDS.includes(parseInt(s.id)));

  for (const skill of bestDemoSkills) {
    const skillId = uuidv4();
    const soulHash = generateSoulHash(skill);
    const fiveLayer = escapeSQL(JSON.stringify(skill.five_layer || {}));
    const authorId = authorMap[skill.author] || SYSTEM_USER_ID;

    sql += `INSERT INTO skills (id, author_id, title, title_cn, description, description_cn, domain, soul_hash, five_layer, forge_mode, source_agent_id, commercial_use, remix_allowed, starlight_score, published, published_at, created_at) VALUES ('${skillId}', '${authorId}', '${escapeSQL(skill.title)}', '${escapeSQL(skill.titleCn || skill.title)}', '${escapeSQL(skill.desc)}', '${escapeSQL(skill.descCn || skill.desc)}', '${skill.domain || 'general'}', '${soulHash}', '${fiveLayer}', 'human-crafted', '${skill.agent || ''}', '${skill.commercial || 'authorized'}', ${skill.remix ? 1 : 0}, ${skill.starlight || 0}, 1, NOW(), NOW());\n`;
  }

  // Write SQL file
  const sqlPath = path.join(__dirname, '../sql/seed-42-skills.sql');
  fs.mkdirSync(path.dirname(sqlPath), { recursive: true });
  fs.writeFileSync(sqlPath, sql);

  console.log(`✅ Generated SQL file: ${sqlPath}`);
  console.log(`📊 Skills to import: ${SHARED_SKILLS.length + bestDemoSkills.length}`);
  console.log(`\nTo import, run:`);
  console.log(`  psql your_database < backend/sql/seed-42-skills.sql`);

} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
}
