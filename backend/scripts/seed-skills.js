#!/usr/bin/env node

/* ═══════════════════════════════════════════════════════
   Seed Skills Database with 42 Curated Skills
   Imports 21 SHARED_SKILLS + 21 best from DEMO_SKILLS_50
   ═══════════════════════════════════════════════════════ */

import crypto from 'crypto';
import { db } from '../server.js';
import { v4 as uuidv4 } from 'uuid';

// Import skills from frontend
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read skills data from frontend
const skillsPath = path.join(__dirname, '../../frontend/skills.js');
const skillsContent = fs.readFileSync(skillsPath, 'utf8');

// Parse SHARED_SKILLS and DEMO_SKILLS_50
const sharedSkillsMatch = skillsContent.match(/const SHARED_SKILLS = \[([\s\S]*?)\n\];/);
const demoSkillsMatch = skillsContent.match(/const DEMO_SKILLS_50 = \[([\s\S]*?)\n\];/);

if (!sharedSkillsMatch || !demoSkillsMatch) {
  console.error('❌ Could not parse skills from frontend/skills.js');
  process.exit(1);
}

// Function to generate Soul-Hash
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
async function getOrCreateAuthor(authorName) {
  if (!authorName || authorName === 'Anonymous') {
    // Return system user for anonymous skills
    return 'system-user-001';
  }

  try {
    // Check if author exists
    const result = await db.query(
      'SELECT id FROM users WHERE username = $1',
      [authorName]
    );

    if (result.rows.length > 0) {
      return result.rows[0].id;
    }

    // Create new author user
    const userId = uuidv4();
    await db.query(
      'INSERT INTO users (id, email, username, password_hash, account_type, verified) VALUES ($1, $2, $3, $4, $5, $6)',
      [
        userId,
        `${authorName.toLowerCase().replace(/\s+/g, '.')}@the42post.local`,
        authorName,
        'hashed-placeholder', // Placeholder - they won't login
        'skill-creator',
        1
      ]
    );

    return userId;
  } catch (err) {
    console.error(`Error creating author ${authorName}:`, err.message);
    return 'system-user-001';
  }
}

// Insert skill into database
async function insertSkill(skillData, authorId) {
  try {
    const skillId = `skill-${uuidv4()}`;
    const soulHash = generateSoulHash(skillData);

    const fiveLayerJson = JSON.stringify(skillData.five_layer || {});

    await db.query(
      `INSERT INTO skills (
        id, author_id, title, title_cn, description, description_cn,
        domain, soul_hash, five_layer, forge_mode, source_agent_id,
        commercial_use, remix_allowed, starlight_score, published, published_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
      [
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
        1, // published
        new Date().toISOString()
      ]
    );

    return { skillId, soulHash };
  } catch (err) {
    console.error(`Error inserting skill ${skillData.title}:`, err.message);
    return null;
  }
}

// Best 21 skills from DEMO_SKILLS_50 (selected for quality, uniqueness, and relevance)
const BEST_DEMO_SKILLS = [
  23, 24, 25, 26, 27, 28, 29, 30, 31, 32, // Narrative & language
  33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43 // Diverse domains
];

// Main seed function
async function seedSkills() {
  console.log('🌱 Starting to seed 42 curated skills...\n');

  let insertedCount = 0;
  let skippedCount = 0;

  try {
    // Ensure system user exists
    try {
      await db.query(
        'INSERT INTO users (id, email, username, password_hash, account_type, verified) VALUES ($1, $2, $3, $4, $5, $6)',
        [
          'system-user-001',
          'system@the42post.local',
          'System',
          'system-placeholder',
          'system',
          1
        ]
      );
    } catch (e) {
      // User may already exist, that's fine
    }

    console.log('📚 Inserting SHARED_SKILLS (21 high-quality skills)...');

    // Parse and insert SHARED_SKILLS
    const sharedSkillsCode = sharedSkillsMatch[1];
    const sharedSkillsArray = eval(`[${sharedSkillsCode}]`);

    for (const skill of sharedSkillsArray) {
      const authorId = await getOrCreateAuthor(skill.author);
      const result = await insertSkill(skill, authorId);

      if (result) {
        console.log(`  ✅ ${skill.title} (${result.soulHash.substring(0, 16)}...)`);
        insertedCount++;
      } else {
        console.log(`  ⚠️  Skipped: ${skill.title}`);
        skippedCount++;
      }
    }

    console.log(`\n🎯 Inserting best 21 from DEMO_SKILLS_50...\n`);

    // Parse and insert best DEMO_SKILLS
    const demoSkillsCode = demoSkillsMatch[1];
    const demoSkillsArray = eval(`[${demoSkillsCode}]`);

    // Select only the best skills
    const selectedDemoSkills = demoSkillsArray.filter(skill => {
      const id = parseInt(skill.id);
      return BEST_DEMO_SKILLS.includes(id);
    });

    for (const skill of selectedDemoSkills) {
      const authorId = await getOrCreateAuthor(skill.author);
      const result = await insertSkill(skill, authorId);

      if (result) {
        console.log(`  ✅ ${skill.title} (${result.soulHash.substring(0, 16)}...)`);
        insertedCount++;
      } else {
        console.log(`  ⚠️  Skipped: ${skill.title}`);
        skippedCount++;
      }
    }

    console.log(`\n✨ Seed complete!`);
    console.log(`  ✅ Inserted: ${insertedCount} skills`);
    console.log(`  ⚠️  Skipped: ${skippedCount} skills`);
    console.log(`  📊 Total in database: ${insertedCount}`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  }
}

// Run seeder
seedSkills();
