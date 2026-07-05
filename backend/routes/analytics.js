/* ═══════════════════════════════════════════════════════
   Analytics Routes — minimal funnel tracking

   Not a replacement for a real analytics platform — there was simply no
   visibility at all into where people drop off in Forge/Playground/Archive
   (e.g. open the Forge modal but never publish). This is the minimum
   needed to answer that, on the stack that's already here.
   ═══════════════════════════════════════════════════════ */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../utils/db.js';
import { buildFunnelReport } from '../utils/funnelReport.js';

const router = express.Router();

/**
 * POST /api/analytics/track
 * Fire-and-forget event log. Never blocks or errors loudly on the client —
 * a dropped analytics event should never be visible to a real user.
 */
router.post('/track', async (req, res) => {
  try {
    const { event, page, anonymous_id, metadata } = req.body || {};

    if (!event || typeof event !== 'string') {
      return res.status(400).json({ error: 'Missing input', message: 'event is required' });
    }

    const eventName = event.slice(0, 100);
    const pageName = typeof page === 'string' ? page.slice(0, 100) : null;
    const anonId = typeof anonymous_id === 'string' ? anonymous_id.slice(0, 255) : null;
    // metadata is free-form but small — cap the serialized size so this
    // can't be used to dump arbitrary large payloads into the DB.
    let metaStr = null;
    if (metadata && typeof metadata === 'object') {
      try {
        metaStr = JSON.stringify(metadata).slice(0, 2000);
      } catch { /* non-serializable metadata is just dropped */ }
    }

    await db.query(
      `INSERT INTO analytics_events (id, event_name, page, anonymous_id, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [uuidv4(), eventName, pageName, anonId, metaStr]
    );

    res.json({ success: true });
  } catch (error) {
    // Logged, not surfaced — a tracking failure must never look like a
    // product error to the person using the site.
    console.warn('[analytics] track failed:', error.message);
    res.json({ success: false });
  }
});

/**
 * GET /api/analytics/funnel?days=7&format=md
 * Admin-gated weekly snapshot: the 4 open-testing metrics in one call.
 * format=md returns text/plain markdown ready to paste into CHANGELOG.md;
 * default returns the structured JSON. Same x-admin-key guard as the
 * /api/admin/* routes in server.js.
 */
router.get('/funnel', async (req, res) => {
  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey) {
    return res.status(503).json({ error: 'Admin endpoints disabled: ADMIN_KEY not configured' });
  }
  if (req.headers['x-admin-key'] !== adminKey) {
    return res.status(403).json({ error: 'Forbidden: invalid admin key' });
  }

  try {
    const days = Math.min(Math.max(parseInt(req.query.days, 10) || 7, 1), 90);
    const { report, markdown } = await buildFunnelReport(db, days);

    if (req.query.format === 'md') {
      res.type('text/plain').send(markdown);
    } else {
      res.json({ success: true, report, markdown });
    }
  } catch (error) {
    console.error('[analytics] funnel report failed:', error.message);
    res.status(500).json({ error: 'Funnel report failed', message: error.message });
  }
});

export default router;
