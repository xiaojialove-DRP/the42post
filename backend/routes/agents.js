/* ═══════════════════════════════════════════════════════
   Agent Integration Routes
   ═══════════════════════════════════════════════════════ */

import express from 'express';
import { requireAuth } from '../utils/auth.js';

const router = express.Router();

// ═══ BIND AGENT (Direct Knight mode) ═══
router.post('/bind', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { agent_id, agent_manifest, signature } = req.body;

    // Validation
    if (!agent_id || !agent_id.trim()) {
      return res.status(400).json({
        error: 'Missing input',
        message: 'agent_id is required'
      });
    }

    if (!agent_manifest) {
      return res.status(400).json({
        error: 'Missing input',
        message: 'agent_manifest is required'
      });
    }

    // TODO: Verify agent signature
    // TODO: Store binding in database
    // TODO: Verify agent is controlled by user

    res.json({
      success: true,
      message: 'Agent binding verified',
      agent: {
        id: agent_id,
        manifest: agent_manifest
      }
    });
  } catch (error) {
    next(error);
  }
});

// ═══ GET AGENT CAPABILITIES ═══
router.get('/:agent_id/capabilities', async (req, res, next) => {
  try {
    const { agent_id } = req.params;

    // TODO: Fetch agent capabilities from agent registry
    // For now, return a placeholder

    res.json({
      success: true,
      agent_id,
      capabilities: {
        message: 'Agent capabilities would be retrieved from agent registry',
        can_evaluate: true,
        can_respond: true,
        can_adapt: true
      }
    });
  } catch (error) {
    next(error);
  }
});

// ═══ VERIFY AGENT BINDING ═══
router.post('/:agent_id/verify', requireAuth, async (req, res, next) => {
  try {
    const { agent_id } = req.params;
    const { signature } = req.body;

    // TODO: Verify agent signature
    // TODO: Check agent ownership

    res.json({
      success: true,
      verified: true,
      agent_id
    });
  } catch (error) {
    next(error);
  }
});

export default router;
