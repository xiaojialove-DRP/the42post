/* ═══════════════════════════════════════════════════════
   Weekly Funnel Report — the 4 open-testing metrics

   1. Forge funnel      idea started → probe generated → published
   2. Twin Test depth   tests run per skill + rating breakdown
   3. Creator D7 return creators active again within 7 days of publishing
   4. Audience share    stars/ratings from people who never forged

   Built for the weekly CHANGELOG snapshot ritual: one call returns both
   structured numbers and a paste-ready markdown block. Works on SQLite
   and PostgreSQL — timestamps are compared as 'YYYY-MM-DD HH:MM:SS'
   strings (matching SQLite's CURRENT_TIMESTAMP format; PG casts them).

   Caveat baked into the output: "creator" is detected by device
   (anonymous_id with a forge_published event), so numbers are
   approximate — good enough for weekly direction, not for a paper.
   ═══════════════════════════════════════════════════════ */

function tsString(date) {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function pct(part, whole) {
  if (!whole) return null;
  return Math.round((part / whole) * 1000) / 10;
}

export async function buildFunnelReport(db, days = 7) {
  const now = new Date();
  const cutoff = tsString(new Date(now.getTime() - days * 864e5));
  // D7-return window: creators who published between 2×window and 1×window
  // ago, so a full 7 days of "did they come back" has already elapsed.
  const returnWindowStart = tsString(new Date(now.getTime() - (days + 7) * 864e5));
  const returnWindowEnd = tsString(new Date(now.getTime() - 7 * 864e5));

  // ── 1. Forge funnel (unique devices per stage, current window) ──
  const funnelRes = await db.query(
    `SELECT event_name, COUNT(DISTINCT anonymous_id) AS devices, COUNT(*) AS events
     FROM analytics_events
     WHERE created_at >= $1
       AND event_name IN ('forge_step1_started', 'forge_probe_generated', 'forge_published')
     GROUP BY event_name`,
    [cutoff]
  );
  const stages = { forge_step1_started: 0, forge_probe_generated: 0, forge_published: 0 };
  for (const row of funnelRes.rows) stages[row.event_name] = Number(row.devices);

  // ── 2. Twin Test depth (current window) ──
  const testsRes = await db.query(
    `SELECT COUNT(*) AS tests, COUNT(DISTINCT skill_id) AS skills
     FROM skill_test_votes WHERE created_at >= $1`,
    [cutoff]
  );
  const tests = Number(testsRes.rows[0]?.tests || 0);
  const skillsTested = Number(testsRes.rows[0]?.skills || 0);

  const ratingsRes = await db.query(
    `SELECT rating, COUNT(*) AS n FROM skill_feedback
     WHERE created_at >= $1 GROUP BY rating`,
    [cutoff]
  );
  const ratings = { better: 0, neutral: 0, no_diff: 0 };
  for (const row of ratingsRes.rows) {
    if (row.rating in ratings) ratings[row.rating] = Number(row.n);
  }
  const ratingsTotal = ratings.better + ratings.neutral + ratings.no_diff;

  // ── 3. Creator D7 return (publishers from the previous window) ──
  const publishersRes = await db.query(
    `SELECT anonymous_id, MIN(created_at) AS first_publish
     FROM analytics_events
     WHERE event_name = 'forge_published'
       AND anonymous_id IS NOT NULL
       AND created_at >= $1 AND created_at < $2
     GROUP BY anonymous_id`,
    [returnWindowStart, returnWindowEnd]
  );
  let returned = 0;
  for (const pub of publishersRes.rows) {
    const within7d = tsString(new Date(new Date(pub.first_publish.replace(' ', 'T') + 'Z').getTime() + 7 * 864e5));
    const laterRes = await db.query(
      `SELECT 1 FROM analytics_events
       WHERE anonymous_id = $1 AND created_at > $2 AND created_at <= $3
       LIMIT 1`,
      [pub.anonymous_id, pub.first_publish, within7d]
    );
    if (laterRes.rows.length > 0) returned++;
  }
  const cohort = publishersRes.rows.length;

  // ── 4. Non-creator engagement share (current window) ──
  // "Creator device" = any device that has ever published. Approximate by
  // design: a person can use two devices, localStorage can be cleared.
  const creatorIdsRes = await db.query(
    `SELECT DISTINCT anonymous_id FROM analytics_events
     WHERE event_name = 'forge_published' AND anonymous_id IS NOT NULL`
  );
  const creatorIds = new Set(creatorIdsRes.rows.map(r => r.anonymous_id));

  const starsRes = await db.query(
    `SELECT anonymous_id FROM user_skill_interactions
     WHERE starred = 1 AND starred_at >= $1`,
    [cutoff]
  );
  const starsTotal = starsRes.rows.length;
  const starsNonCreator = starsRes.rows.filter(r => !creatorIds.has(r.anonymous_id)).length;

  const fbRes = await db.query(
    `SELECT anonymous_id FROM skill_feedback WHERE created_at >= $1`,
    [cutoff]
  );
  const fbTotal = fbRes.rows.length;
  const fbNonCreator = fbRes.rows.filter(r => !creatorIds.has(r.anonymous_id)).length;

  // ── Data-quality sentinel: template-degraded publishes in window ──
  let templatePublishes = 0;
  try {
    const tplRes = await db.query(
      `SELECT COUNT(*) AS n FROM skills
       WHERE generation_source = 'template' AND created_at >= $1`,
      [cutoff]
    );
    templatePublishes = Number(tplRes.rows[0]?.n || 0);
  } catch { /* column not migrated yet */ }

  const report = {
    window_days: days,
    from: cutoff,
    to: tsString(now),
    forge_funnel: {
      started: stages.forge_step1_started,
      probe_generated: stages.forge_probe_generated,
      published: stages.forge_published,
      conversion_pct: pct(stages.forge_published, stages.forge_step1_started)
    },
    twin_tests: {
      tests,
      skills_tested: skillsTested,
      avg_per_skill: skillsTested ? Math.round((tests / skillsTested) * 10) / 10 : null,
      ratings,
      ratings_total: ratingsTotal
    },
    creator_d7_return: {
      cohort,
      returned,
      rate_pct: pct(returned, cohort)
    },
    non_creator_engagement: {
      stars_total: starsTotal,
      stars_non_creator: starsNonCreator,
      stars_share_pct: pct(starsNonCreator, starsTotal),
      ratings_total: fbTotal,
      ratings_non_creator: fbNonCreator,
      ratings_share_pct: pct(fbNonCreator, fbTotal)
    },
    template_degraded_publishes: templatePublishes
  };

  return { report, markdown: toMarkdown(report) };
}

function fmtPct(v) {
  return v === null ? 'n/a' : `${v}%`;
}

function toMarkdown(r) {
  const f = r.forge_funnel;
  const t = r.twin_tests;
  const d = r.creator_d7_return;
  const n = r.non_creator_engagement;
  const dateFrom = r.from.slice(0, 10);
  const dateTo = r.to.slice(0, 10);

  const lines = [
    `### 📊 Funnel Snapshot — ${dateFrom} → ${dateTo} (${r.window_days}d)`,
    '',
    `- **Forge funnel**: ${f.started} started → ${f.probe_generated} probes → ${f.published} published (${fmtPct(f.conversion_pct)} end-to-end)`,
    `- **Twin Tests**: ${t.tests} tests across ${t.skills_tested} skills${t.avg_per_skill !== null ? ` (avg ${t.avg_per_skill}/skill)` : ''}; ratings: ${t.ratings.better} better / ${t.ratings.neutral} neutral / ${t.ratings.no_diff} no_diff`,
    `- **Creator D7 return**: ${d.returned} of ${d.cohort} publishers active within 7 days (${fmtPct(d.rate_pct)})`,
    `- **Non-creator engagement**: ${n.stars_non_creator}/${n.stars_total} stars (${fmtPct(n.stars_share_pct)}), ${n.ratings_non_creator}/${n.ratings_total} ratings (${fmtPct(n.ratings_share_pct)}) from non-creators`
  ];
  if (r.template_degraded_publishes > 0) {
    lines.push(`- ⚠️ **Template-degraded publishes**: ${r.template_degraded_publishes} — investigate LLM providers`);
  }
  lines.push('', `> Creator detection is device-based (analytics anonymous_id) — directional, not exact.`);
  return lines.join('\n');
}
