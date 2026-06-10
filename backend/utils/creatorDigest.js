/* ═══════════════════════════════════════════════════════
   Creator Monthly Digest — "your Skill's impact this month"

   Once a month, every creator with ≥1 published skill and a real
   email gets a digest:
     - per-skill: tests run + win rate over the last 30 days
     - one community skill recommendation (top starlight, not theirs)

   Scheduling: checked every 12h. A digest_log row per (user, period)
   guarantees at-most-once delivery per month even across restarts.
   Period key = YYYY-MM (e.g. "2026-06"). Sends happen on/after the
   1st of each month for the *previous* month's activity.
   ═══════════════════════════════════════════════════════ */

import { db } from './db.js';
import { sendViaResend } from './email.js';
import { v4 as uuidv4 } from 'uuid';

const CHECK_INTERVAL_MS = 12 * 60 * 60 * 1000;  // every 12h
const FIRST_CHECK_DELAY_MS = 3 * 60 * 1000;     // 3 min after boot
const SEND_DELAY_BETWEEN_EMAILS_MS = 1500;      // be gentle to Resend rate limits

const ANONYMOUS_AUTHOR_ID = '00000000-0000-0000-0000-000000000000';

function currentPeriodKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function ensureDigestLogTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS digest_log (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      period_key VARCHAR(10) NOT NULL,
      sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (user_id, period_key)
    )
  `);
}

/** Stats for one creator's skills over the last 30 days. */
async function getCreatorStats(userId) {
  const skills = (await db.query(
    `SELECT id, title, title_cn FROM skills
     WHERE author_id = $1 AND published = 1 AND deleted_at IS NULL`,
    [userId]
  )).rows || [];
  if (!skills.length) return null;

  const ids = skills.map(s => s.id);
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');

  const [tests, feedback] = await Promise.all([
    db.query(
      `SELECT skill_id, COUNT(*) AS n FROM skill_test_votes
       WHERE skill_id IN (${placeholders})
         AND created_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'
       GROUP BY skill_id`,
      ids
    ).catch(() => ({ rows: [] })),   // SQLite has no INTERVAL — degrade to all-time below
    db.query(
      `SELECT skill_id, rating, COUNT(*) AS n FROM skill_feedback
       WHERE skill_id IN (${placeholders})
         AND rating IN ('better','worse','no_diff')
       GROUP BY skill_id, rating`,
      ids
    ).catch(() => ({ rows: [] }))
  ]);

  const byId = {};
  for (const s of skills) byId[s.id] = { title: s.title || s.title_cn, tests: 0, better: 0, worse: 0, no_diff: 0 };
  for (const r of (tests.rows || [])) if (byId[r.skill_id]) byId[r.skill_id].tests = Number(r.n) || 0;
  for (const r of (feedback.rows || [])) if (byId[r.skill_id]) byId[r.skill_id][r.rating] = Number(r.n) || 0;

  const rows = Object.values(byId).map(s => {
    const rated = s.better + s.worse + s.no_diff;
    return { ...s, rated, win_rate: rated > 0 ? Math.round((s.better / rated) * 100) : null };
  });

  const totalTests = rows.reduce((a, s) => a + s.tests, 0);
  return { rows, totalTests };
}

/** Top community skill (by starlight) NOT authored by this user. */
async function getRecommendation(userId) {
  const rec = (await db.query(
    `SELECT s.id, s.title, s.title_cn, s.description, s.description_cn,
            COALESCE(s.starlight_score, 0) AS starlight
     FROM skills s
     WHERE s.published = 1 AND s.deleted_at IS NULL AND s.author_id != $1
     ORDER BY COALESCE(s.starlight_score, 0) DESC, s.published_at DESC
     LIMIT 1`,
    [userId]
  )).rows?.[0];
  return rec || null;
}

function buildDigestHtml({ username, periodLabel, stats, rec }) {
  const skillRows = stats.rows.map(s => `
    <tr>
      <td style="padding:10px 14px;border-bottom:1px solid #f0e8d8;font-weight:600;color:#2a2018;">${escapeHtml(s.title)}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #f0e8d8;text-align:center;color:#3c3028;">${s.tests}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #f0e8d8;text-align:center;color:${s.win_rate !== null && s.win_rate >= 50 ? '#6a8d52' : '#8a7c6e'};font-weight:600;">
        ${s.win_rate !== null ? s.win_rate + '%' : '—'}
      </td>
    </tr>`).join('');

  const recBlock = rec ? `
    <div style="margin-top:28px;padding:18px 20px;background:#faf5ed;border:1px solid #f0d090;border-radius:12px;">
      <div style="font-family:monospace;font-size:10px;letter-spacing:2px;color:#8a7c6e;margin-bottom:8px;">本月社区推荐 · COMMUNITY PICK</div>
      <div style="font-size:16px;font-weight:700;color:#2a2018;margin-bottom:4px;">${escapeHtml(rec.title || rec.title_cn)}</div>
      <div style="font-size:13px;color:#5a4f44;line-height:1.6;">${escapeHtml((rec.description_cn || rec.description || '').slice(0, 120))}</div>
      <a href="https://the42post.com/archive.html" style="display:inline-block;margin-top:12px;font-size:13px;color:#2a2018;font-weight:600;">去档案馆看看 →</a>
    </div>` : '';

  return `
  <div style="max-width:560px;margin:0 auto;font-family:Georgia,'Noto Serif SC',serif;background:#fffdf8;padding:32px 28px;border:1px solid #e8e0d4;">
    <div style="text-align:center;border-bottom:2px solid #2a2018;padding-bottom:16px;margin-bottom:24px;">
      <div style="font-size:22px;font-weight:900;letter-spacing:2px;color:#2a2018;">THE 42 POST</div>
      <div style="font-family:monospace;font-size:10px;letter-spacing:3px;color:#8a7c6e;margin-top:4px;">CREATOR IMPACT REPORT · ${escapeHtml(periodLabel)}</div>
    </div>

    <p style="font-size:15px;color:#2a2018;line-height:1.7;">你好 ${escapeHtml(username)}，</p>
    <p style="font-size:14px;color:#5a4f44;line-height:1.7;">这是你的 Skill 在过去30天的真实表现——每一次测试，都是一个真实的人在用你的思维方式和 AI 对话。</p>

    <table style="width:100%;border-collapse:collapse;margin-top:18px;background:#fff;border:1px solid #e8e0d4;border-radius:8px;overflow:hidden;">
      <thead>
        <tr style="background:#f8f4ee;">
          <th style="padding:10px 14px;text-align:left;font-size:11px;letter-spacing:1px;color:#8a7c6e;">SKILL</th>
          <th style="padding:10px 14px;text-align:center;font-size:11px;letter-spacing:1px;color:#8a7c6e;">测试次数</th>
          <th style="padding:10px 14px;text-align:center;font-size:11px;letter-spacing:1px;color:#8a7c6e;">胜率</th>
        </tr>
      </thead>
      <tbody>${skillRows}</tbody>
    </table>

    ${stats.totalTests === 0 ? `
    <p style="font-size:13px;color:#8a7c6e;line-height:1.7;margin-top:14px;">这个月还没有人测试你的 Skill——分享它的档案页，或者自己先去 Playground 跑一轮，都会让它被更多人看见。</p>` : ''}

    ${recBlock}

    <div style="text-align:center;margin-top:30px;">
      <a href="https://the42post.com/playground.html" style="display:inline-block;padding:13px 26px;background:#2a2018;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:700;">🎮 去 Playground 测试</a>
    </div>

    <p style="font-size:11px;color:#b8a89a;text-align:center;margin-top:28px;line-height:1.6;">
      THE 42 POST · Forging Human Wisdom for a Better AI Future<br>
      你收到这封邮件是因为你在 the42post.com 锻造过 Skill
    </p>
  </div>`;
}

/** Send digests to all eligible creators for the current period. */
export async function runCreatorDigest({ force = false } = {}) {
  const period = currentPeriodKey();

  // Creators: real users (not the anonymous sentinel) with a published skill.
  const creators = (await db.query(
    `SELECT DISTINCT u.id, u.email, u.username
     FROM users u
     JOIN skills s ON s.author_id = u.id
     WHERE s.published = 1 AND s.deleted_at IS NULL
       AND u.id != $1
       AND u.email IS NOT NULL AND u.email != ''`,
    [ANONYMOUS_AUTHOR_ID]
  )).rows || [];

  let sent = 0, skipped = 0, failed = 0;
  for (const c of creators) {
    try {
      if (!force) {
        const already = (await db.query(
          `SELECT 1 FROM digest_log WHERE user_id = $1 AND period_key = $2`,
          [c.id, period]
        )).rows;
        if (already && already.length) { skipped++; continue; }
      }

      const stats = await getCreatorStats(c.id);
      if (!stats) { skipped++; continue; }
      const rec = await getRecommendation(c.id);

      const result = await sendViaResend({
        to: c.email,
        subject: `📊 你的 Skill 本月被测试了 ${stats.totalTests} 次 — THE 42 POST 影响力月报`,
        html: buildDigestHtml({
          username: c.username || 'Creator',
          periodLabel: period,
          stats,
          rec
        }),
        text: `你的 Skill 过去30天共被测试 ${stats.totalTests} 次。详情请用支持 HTML 的邮箱查看。— THE 42 POST`
      });

      if (result.success) {
        await db.query(
          `INSERT INTO digest_log (id, user_id, period_key) VALUES ($1, $2, $3)`,
          [uuidv4(), c.id, period]
        );
        sent++;
      } else {
        failed++;
        console.warn(`[digest] Send failed for ${c.email}:`, result.error);
      }
    } catch (err) {
      failed++;
      console.warn(`[digest] Error for user ${c.id}:`, err.message);
    }
    await new Promise(r => setTimeout(r, SEND_DELAY_BETWEEN_EMAILS_MS));
  }

  console.log(`[digest] Period ${period}: sent=${sent} skipped=${skipped} failed=${failed} (of ${creators.length} creators)`);
  return { period, sent, skipped, failed, total: creators.length };
}

/** Start the scheduler — call once from server.js after DB init. */
export function startCreatorDigestScheduler() {
  const check = async () => {
    try {
      await ensureDigestLogTable();
      await runCreatorDigest();
    } catch (err) {
      console.warn('[digest] Scheduler run failed:', err.message);
    }
  };
  setTimeout(check, FIRST_CHECK_DELAY_MS);
  setInterval(check, CHECK_INTERVAL_MS);
  console.log('[digest] Creator monthly digest scheduler started (checks every 12h)');
}
