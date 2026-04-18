/* ═══════════════════════════════════════════════════════
   Phase 0 Connection Test
   Verifies front-back integration

   Run with: node scripts/test-connection.js
   ═══════════════════════════════════════════════════════ */

import pg from 'pg';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const { Pool } = pg;

async function testConnection() {
  console.log('\n═══ THE 42 POST — Phase 0 Connection Test ═══\n');

  let passed = 0;
  let failed = 0;

  // TEST 1: Environment Variables
  console.log('📋 TEST 1: Environment Variables');
  const required = ['DATABASE_URL', 'JWT_SECRET', 'SIGNING_SECRET', 'ANTHROPIC_API_KEY'];
  for (const key of required) {
    if (process.env[key]) {
      console.log(`  ✅ ${key}`);
      passed++;
    } else {
      console.log(`  ❌ ${key} — MISSING (check .env)`);
      failed++;
    }
  }

  // TEST 2: Database Connection
  console.log('\n🗄️  TEST 2: Database Connection');
  const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    const result = await db.query('SELECT NOW() as time');
    console.log(`  ✅ Connected to: ${process.env.DATABASE_URL.split('@')[1].split('/')[0]}`);
    console.log(`  ✅ Server time: ${result.rows[0].time}`);
    passed += 2;
  } catch (error) {
    console.log(`  ❌ Database connection failed: ${error.message}`);
    failed += 2;
  }

  // TEST 3: Tables Exist
  console.log('\n📊 TEST 3: Database Tables');
  const tables = ['users', 'skills', 'skill_versions', 'skill_manifests', 'probe_logs'];
  for (const table of tables) {
    try {
      const result = await db.query(`SELECT COUNT(*) FROM ${table}`);
      console.log(`  ✅ ${table} (${result.rows[0].count} rows)`);
      passed++;
    } catch (error) {
      console.log(`  ❌ ${table} — not found`);
      failed++;
    }
  }

  // TEST 4: JWT Secret Strength
  console.log('\n🔐 TEST 4: Secret Key Strength');
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32) {
    console.log(`  ✅ JWT_SECRET (${process.env.JWT_SECRET.length} chars)`);
    passed++;
  } else {
    console.log(`  ❌ JWT_SECRET too short (${process.env.JWT_SECRET?.length || 0} chars, need 32+)`);
    failed++;
  }

  if (process.env.SIGNING_SECRET && process.env.SIGNING_SECRET.length >= 32) {
    console.log(`  ✅ SIGNING_SECRET (${process.env.SIGNING_SECRET.length} chars)`);
    passed++;
  } else {
    console.log(`  ❌ SIGNING_SECRET too short (${process.env.SIGNING_SECRET?.length || 0} chars, need 32+)`);
    failed++;
  }

  // TEST 5: Claude API
  console.log('\n🤖 TEST 5: Claude API Key');
  if (process.env.ANTHROPIC_API_KEY?.startsWith('sk-ant-')) {
    console.log(`  ✅ ANTHROPIC_API_KEY present`);
    passed++;
  } else {
    console.log(`  ⚠️  ANTHROPIC_API_KEY invalid or missing (required for /forge endpoints)`);
    failed++;
  }

  // TEST 6: Server Configuration
  console.log('\n⚙️  TEST 6: Server Configuration');
  const port = process.env.PORT || 3000;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8000';
  console.log(`  ✅ PORT: ${port}`);
  console.log(`  ✅ FRONTEND_URL: ${frontendUrl}`);
  console.log(`  ✅ NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
  passed += 3;

  // Cleanup
  await db.end();

  // Summary
  console.log('\n═══════════════════════════════════════════════════');
  console.log(`\n✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);

  if (failed === 0) {
    console.log('\n🎉 All tests passed! You can now:');
    console.log('   1. Start backend: npm run dev');
    console.log('   2. Start frontend: cd day1 && python3 -m http.server 8000');
    console.log('   3. Open http://localhost:8000');
    console.log('\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  Fix the issues above before starting the server.\n');
    process.exit(1);
  }
}

testConnection().catch(error => {
  console.error('\n🔴 Fatal error:', error.message);
  process.exit(1);
});
