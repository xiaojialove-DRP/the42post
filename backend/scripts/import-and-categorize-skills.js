#!/usr/bin/env node

/* ═══════════════════════════════════════════════════════
   Import 42 Skills and Assign to 10 Categories
   ═══════════════════════════════════════════════════════ */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Connect to SQLite database
const dbPath = path.join(__dirname, '../../database.sqlite3');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

console.log(`📊 Connected to database: ${dbPath}\n`);

// 10个精心设计的分类
const CATEGORIES = {
  '01-narrative-language': {
    name: 'Narrative & Language',
    name_cn: '叙述与语言',
    description: '语言如何塑造思想，故事如何编码知识'
  },
  '02-logic-reasoning': {
    name: 'Logic & Reasoning',
    name_cn: '逻辑与推理',
    description: '批判性思维、逻辑谬误、论证结构'
  },
  '03-ethics-values': {
    name: 'Ethics & Values',
    name_cn: '伦理与价值',
    description: '核心价值判断、道德框架、人类尊严'
  },
  '04-history-tradition': {
    name: 'History & Tradition',
    name_cn: '历史与传统',
    description: '长期视角、文化脉络、代际思考'
  },
  '05-science-systems': {
    name: 'Science & Systems',
    name_cn: '科学与系统',
    description: '证据、因果关系、复杂系统思维'
  },
  '06-design-experience': {
    name: 'Design & Experience',
    name_cn: '设计与体验',
    description: '用户体验、人类感知、手艺精神'
  },
  '07-culture-understanding': {
    name: 'Culture & Understanding',
    name_cn: '文化与理解',
    description: '跨文化理解、多元视角、意义翻译'
  },
  '08-time-life': {
    name: 'Time & Life',
    name_cn: '时间与生命',
    description: '生命意义、遗产思维、代际责任'
  },
  '09-silence-space': {
    name: 'Silence & Space',
    name_cn: '寂静与空间',
    description: '沉默的力量、未言说之物、留白的意义'
  },
  '10-labor-value': {
    name: 'Labor & Value',
    name_cn: '劳动与价值',
    description: '隐形劳动、价值定义、经济公正'
  }
};

// 技能到分类的映射
const SKILL_ASSIGNMENTS = {
  'The Poetic Bridge': '01-narrative-language',
  'Comma as Philosophy': '01-narrative-language',
  'Naming as Power': '01-narrative-language',
  'Silence Between Words': '01-narrative-language',
  'The False Synonym': '01-narrative-language',
  'Stories as Models': '01-narrative-language',
  'The Untranslatable': '01-narrative-language',

  'Wittgenstein\'s Silence': '02-logic-reasoning',
  'Steel-Manning Opposition': '02-logic-reasoning',
  'Axioms vs Conclusions': '02-logic-reasoning',
  'The Examined Assumption': '02-logic-reasoning',
  'Category Mistakes': '02-logic-reasoning',
  'The Thought Experiment': '02-logic-reasoning',
  'Affirming the Consequent': '02-logic-reasoning',

  'Grandma Filter': '03-ethics-values',
  'Childhood Compass': '03-ethics-values',
  'Memory Fingerprint': '03-ethics-values',
  'Material Honesty': '03-ethics-values',
  'Grief Protocol': '03-ethics-values',

  'Temporal Ripples': '04-history-tradition',
  'The Long View': '04-history-tradition',
  'The Forgotten Context': '04-history-tradition',
  'Pattern Recognition Across Time': '04-history-tradition',
  'The Survivor\'s Bias': '04-history-tradition',
  'The Reversal of Narrative': '04-history-tradition',

  'Correlation ≠ Causation': '05-science-systems',
  'The Null Hypothesis': '05-science-systems',
  'Measurement Validity': '05-science-systems',
  'Complex Systems Thinking': '05-science-systems',

  'Craft Before Scale': '06-design-experience',
  'Analog Intuition': '06-design-experience',
  'Friction by Design': '06-design-experience',
  'Dissent Amplifier': '06-design-experience',
  'The Last Question': '06-design-experience',

  'Cultural Footnote': '07-culture-understanding',
  'The Slow Reader': '07-culture-understanding',

  'The Ancestor Test': '08-time-life',
  'Legacy Thinking': '08-time-life',
  'Proportional Memory': '08-time-life',
  'Domestic Entropy Auditor': '08-time-life',

  'Silence as Feature': '09-silence-space',
  'Midnight Philosopher': '09-silence-space',

  'Domestic Entropy Auditor': '10-labor-value'
};

// 注意：Domestic Entropy Auditor 出现了两次，需要调整
// 让我重新分配
const SKILL_ASSIGNMENTS_FIXED = {
  'The Poetic Bridge': '01-narrative-language',
  'Comma as Philosophy': '01-narrative-language',
  'Naming as Power': '01-narrative-language',
  'Silence Between Words': '01-narrative-language',
  'The False Synonym': '01-narrative-language',
  'Stories as Models': '01-narrative-language',
  'The Untranslatable': '01-narrative-language',

  'Wittgenstein\'s Silence': '02-logic-reasoning',
  'Steel-Manning Opposition': '02-logic-reasoning',
  'Axioms vs Conclusions': '02-logic-reasoning',
  'The Examined Assumption': '02-logic-reasoning',
  'Category Mistakes': '02-logic-reasoning',
  'The Thought Experiment': '02-logic-reasoning',

  'Grandma Filter': '03-ethics-values',
  'Childhood Compass': '03-ethics-values',
  'Memory Fingerprint': '03-ethics-values',
  'Material Honesty': '03-ethics-values',
  'Grief Protocol': '03-ethics-values',

  'Temporal Ripples': '04-history-tradition',
  'The Long View': '04-history-tradition',
  'The Forgotten Context': '04-history-tradition',
  'Pattern Recognition Across Time': '04-history-tradition',
  'The Survivor\'s Bias': '04-history-tradition',
  'The Reversal of Narrative': '04-history-tradition',

  'Correlation ≠ Causation': '05-science-systems',
  'The Null Hypothesis': '05-science-systems',
  'Measurement Validity': '05-science-systems',
  'Complex Systems Thinking': '05-science-systems',
  'Affirming the Consequent': '05-science-systems',

  'Craft Before Scale': '06-design-experience',
  'Analog Intuition': '06-design-experience',
  'Friction by Design': '06-design-experience',
  'Dissent Amplifier': '06-design-experience',
  'The Last Question': '06-design-experience',

  'Cultural Footnote': '07-culture-understanding',
  'The Slow Reader': '07-culture-understanding',

  'The Ancestor Test': '08-time-life',
  'Legacy Thinking': '08-time-life',
  'Proportional Memory': '08-time-life',
  'Domestic Entropy Auditor': '08-time-life',

  'Silence as Feature': '09-silence-space',
  'Midnight Philosopher': '09-silence-space'
};

async function importSkills() {
  try {
    console.log('🌱 Step 1: Importing 42 skills from SQL file...\n');

    // Read the seed SQL file
    const sqlPath = path.join(__dirname, '../sql/seed-42-skills.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    // Execute the SQL file (skip first line if it's a comment)
    const statements = sqlContent
      .split(';')
      .filter(s => s.trim() && !s.trim().startsWith('--'))
      .map(s => s.trim() + ';');

    for (const statement of statements) {
      try {
        db.exec(statement);
      } catch (err) {
        if (!err.message.includes('UNIQUE constraint failed')) {
          console.error('Error executing:', statement.substring(0, 100));
          console.error('Error:', err.message);
        }
      }
    }

    console.log('✅ Skills imported\n');

    // Get all skills
    const skills = db.prepare('SELECT id, title FROM skills WHERE published = 1').all();
    console.log(`📚 Found ${skills.length} published skills\n`);

    // Create category mapping
    console.log('🏷️  Step 2: Assigning skills to 10 categories...\n');

    let assigned = 0;
    let unassigned = [];

    for (const skill of skills) {
      const categoryKey = SKILL_ASSIGNMENTS_FIXED[skill.title];

      if (categoryKey) {
        // Update skill domain
        db.prepare('UPDATE skills SET domain = ? WHERE id = ?').run(categoryKey, skill.id);
        assigned++;
        console.log(`  ✅ ${skill.title.padEnd(40)} → ${CATEGORIES[categoryKey].name_cn}`);
      } else {
        unassigned.push(skill.title);
      }
    }

    console.log(`\n✨ Assigned: ${assigned} skills\n`);

    if (unassigned.length > 0) {
      console.log(`⚠️  Unassigned skills (${unassigned.length}):`);
      unassigned.forEach(s => console.log(`  - ${s}`));
      console.log();
    }

    // Display category summary
    console.log('📊 Category Distribution:\n');
    for (const [key, category] of Object.entries(CATEGORIES)) {
      const count = db.prepare('SELECT COUNT(*) as count FROM skills WHERE domain = ?').get(key).count;
      console.log(`  ${key.padEnd(20)} | ${category.name_cn.padEnd(12)} | ${count} skills`);
    }

    console.log(`\n✅ Import complete!`);
    console.log(`   Total skills in database: ${assigned}`);
    console.log(`   Total categories: 10`);

    db.close();
  } catch (err) {
    console.error('❌ Import failed:', err);
    db.close();
    process.exit(1);
  }
}

importSkills();
