#!/usr/bin/env node

/* ═══════════════════════════════════════════════════════
   Seed 42 Curated Skills to Database
   SHARED_SKILLS (21) + Best from DEMO_SKILLS_50 (21)
   ═══════════════════════════════════════════════════════ */

import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Connect to database
const dbPath = path.join(__dirname, '../data/42post.db');
const database = new Database(dbPath);

console.log(`📊 Connected to database: ${dbPath}\n`);

// Generate Soul-Hash
function generateSoulHash(skillData) {
  const content = JSON.stringify({
    title: skillData.title,
    defining: skillData.five_layer?.defining,
    instantiating: skillData.five_layer?.instantiating,
    fencing: skillData.five_layer?.fencing,
    validating: skillData.five_layer?.validating,
    contextualizing: skillData.five_layer?.contextualizing
  });

  return '42-sk-' + crypto.createHash('sha256').update(content).digest('hex').substring(0, 32);
}

// Get or create author
function getOrCreateAuthor(authorName) {
  if (!authorName || authorName === 'Anonymous') {
    return 'system-user-001';
  }

  try {
    const user = database.prepare('SELECT id FROM users WHERE username = ?').get(authorName);
    if (user) return user.id;

    const userId = uuidv4();
    database.prepare(
      'INSERT INTO users (id, email, username, password_hash, account_type, verified) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(
      userId,
      `${authorName.toLowerCase().replace(/\s+/g, '.')}@the42post.local`,
      authorName,
      'placeholder',
      'skill-creator',
      1
    );

    return userId;
  } catch (err) {
    console.error(`⚠️  Error with author ${authorName}:`, err.message);
    return 'system-user-001';
  }
}

// Insert skill
function insertSkill(skillData, authorId) {
  try {
    const skillId = `skill-${uuidv4()}`;
    const soulHash = generateSoulHash(skillData);
    const fiveLayerJson = JSON.stringify(skillData.five_layer || {});

    database.prepare(
      `INSERT INTO skills (
        id, author_id, title, title_cn, description, description_cn,
        domain, soul_hash, five_layer, forge_mode, source_agent_id,
        commercial_use, remix_allowed, starlight_score, published, published_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      skillId,
      authorId,
      skillData.title,
      skillData.titleCn || skillData.title,
      skillData.desc,
      skillData.descCn || skillData.desc,
      skillData.domain || 'general',
      soulHash,
      fiveLayerJson,
      'human-crafted',
      skillData.agent || null,
      skillData.commercial || 'authorized',
      skillData.remix ? 1 : 0,
      skillData.starlight || 0,
      1,
      new Date().toISOString()
    );

    return { skillId, soulHash };
  } catch (err) {
    console.error(`❌ Error inserting ${skillData.title}:`, err.message);
    return null;
  }
}

// Main execution
try {
  // Ensure system user exists
  try {
    database.prepare(
      'INSERT INTO users (id, email, username, password_hash, account_type, verified) VALUES (?, ?, ?, ?, ?, ?)'
    ).run('system-user-001', 'system@the42post.local', 'System', 'system', 'system', 1);
  } catch (e) {
    // User may exist, ignore
  }

  // Read skills from frontend
  const skillsPath = path.join(__dirname, '../../frontend/skills.js');
  const skillsContent = fs.readFileSync(skillsPath, 'utf8');

  // Extract SHARED_SKILLS
  const sharedMatch = skillsContent.match(/const SHARED_SKILLS = \[([\s\S]*?)\n\];/);
  const demoMatch = skillsContent.match(/const DEMO_SKILLS_50 = \[([\s\S]*?)\n\];/);

  if (!sharedMatch || !demoMatch) {
    console.error('❌ Could not parse skills from frontend/skills.js');
    process.exit(1);
  }

  const SHARED_SKILLS = eval(`[${sharedMatch[1]}]`);
  const DEMO_SKILLS_50 = eval(`[${demoMatch[1]}]`);

  let count = 0;

  console.log('📚 Importing SHARED_SKILLS (21 curated skills)...\n');
  for (const skill of SHARED_SKILLS) {
    const authorId = getOrCreateAuthor(skill.author);
    const result = insertSkill(skill, authorId);
    if (result) {
      console.log(`  ✅ ${skill.id.padEnd(3)} | ${skill.title}`);
      count++;
    }
  }

  // Select best 21 from DEMO_SKILLS_50
  const BEST_IDS = [23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43];
  const bestDemoSkills = DEMO_SKILLS_50.filter(s => BEST_IDS.includes(parseInt(s.id)));

  console.log('\n🎯 Importing best 21 from DEMO_SKILLS_50...\n');
  for (const skill of bestDemoSkills) {
    const authorId = getOrCreateAuthor(skill.author);
    const result = insertSkill(skill, authorId);
    if (result) {
      console.log(`  ✅ ${skill.id.padEnd(3)} | ${skill.title}`);
      count++;
    }
  }

  console.log(`\n✨ Successfully imported ${count} skills!`);
  console.log(`📊 Total skills in database: ${count}`);

  database.close();
  process.exit(0);

} catch (err) {
  console.error('❌ Seed failed:', err.message);
  database.close();
  process.exit(1);
}
