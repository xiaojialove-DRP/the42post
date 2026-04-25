/* ═══════════════════════════════════════════════════════
   Downloads Routes — Skill Export in Multiple Formats
   ═══════════════════════════════════════════════════════ */

import express from 'express';
import { db } from '../server.js';
import { validateFiveLayerSchema, isValidDownloadFormat } from '../utils/validation.js';

const router = express.Router();

/**
 * GET /api/download/:skillId?format=markdown|langchain|mcp|certificate
 * Download skill in specified format
 */
router.get('/:skillId', async (req, res, next) => {
  try {
    const { skillId } = req.params;
    const { format = 'markdown' } = req.query;

    // Fetch skill from database
    const skillResult = await db.query(
      `SELECT s.*, u.username, u.email
       FROM skills s
       LEFT JOIN users u ON s.author_id = u.id
       WHERE s.id = $1 AND s.deleted_at IS NULL`,
      [skillId]
    );

    // Generate anonymous session ID (stored in browser localStorage)
    const anonymousUserId = req.headers['x-anonymous-id'] || null;

    if (skillResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Skill not found'
      });
    }

    const skill = skillResult.rows[0];

    // ═══ CHECK IF SKILL IS PUBLISHED ═══
    if (!skill.published) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'This skill has not been published yet'
      });
    }

    // ═══ VALIDATE DOWNLOAD FORMAT ═══
    if (!isValidDownloadFormat(format)) {
      return res.status(400).json({
        error: 'Invalid format',
        message: `Format must be one of: markdown, langchain, mcp, certificate. Got: ${format}`
      });
    }

    // ═══ VALIDATE FIVE-LAYER DATA INTEGRITY ═══
    let fiveLayer = null;
    if (skill.five_layer) {
      try {
        fiveLayer = JSON.parse(skill.five_layer);
        const validation = validateFiveLayerSchema(fiveLayer);
        if (!validation.valid) {
          console.warn(`⚠️ Five-layer validation failed for skill ${skillId}:`, validation.errors);
          // 允许下载，但数据可能不完整
          console.warn(`   Attempting to download anyway, but quality may be compromised`);
        }
      } catch (parseErr) {
        console.error(`❌ Failed to parse five_layer JSON for skill ${skillId}:`, parseErr.message);
        return res.status(400).json({
          error: 'Corrupted data',
          message: 'This skill has corrupted five-layer data and cannot be downloaded. Please contact support.'
        });
      }
    }

    // Prepare skill data object
    const skillData = {
      id: skill.id,
      title: skill.title,
      titleCn: skill.title_cn || skill.title,
      desc: skill.description || '',
      descCn: skill.description_cn || skill.description || '',
      domain: skill.domain || 'ideas',
      soulHash: skill.soul_hash,
      author: skill.username || 'Creator',
      email: skill.email,
      commercial: skill.commercial_use || 'authorized',
      remix: skill.remix_allowed ? 'yes' : 'no',
      useCases: skill.applicable_when || '',
      disallowedUses: skill.disallowed_uses || '',
      fiveLayerSkill: fiveLayer
    };

    let content, filename, contentType;

    switch (format) {
      case 'markdown':
        content = generateSkillMarkdown(skillData);
        filename = `The42Post_${skill.title.replace(/\s+/g, '_')}.md`;
        contentType = 'text/markdown';
        break;

      case 'langchain':
        content = generateAgentSkillFormat(skillData);
        filename = `The42Post_${skill.title.replace(/\s+/g, '_')}.py`;
        contentType = 'text/plain';
        break;

      case 'mcp':
        content = generateMCPConfigFormat(skillData);
        filename = `The42Post_${skill.title.replace(/\s+/g, '_')}.json`;
        contentType = 'application/json';
        break;

      case 'certificate':
        // Certificate is an HTML file
        content = generateCertificateHTML(skillData, skill.soul_hash);
        filename = `Creator_Certificate_${skill.soul_hash}.html`;
        contentType = 'text/html';
        break;

      default:
        return res.status(400).json({
          error: 'Invalid format',
          message: `Format '${format}' is not supported. Use: markdown, langchain, mcp, certificate`
        });
    }

    // Set response headers
    res.setHeader('Content-Type', `${contentType}; charset=utf-8`);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', Buffer.byteLength(content, 'utf-8'));

    // Send content
    res.send(content);

    // ═══ LOG DOWNLOAD (async, non-blocking) ═══
    // 记录下载日志（不中断下载过程）
    (async () => {
      try {
        await db.query(
          `INSERT INTO skill_usage_logs (id, skill_id, agent_id, context, outcome, created_at)
           VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
          [
            require('uuid').v4(),
            skillId,
            anonymousUserId, // 匿名用户ID（来自前端localStorage）
            `format: ${format} | ip: ${req.ip} | user-agent: ${req.get('user-agent')}`,
            'download_success'
          ]
        );
      } catch (logErr) {
        console.warn('Failed to log download:', logErr.message);
        // 不中断主流程，日志失败不影响用户
      }
    })();

  } catch (error) {
    next(error);
  }
});

/**
 * Generate Markdown format (SKILL.md)
 */
function generateSkillMarkdown(skillData) {
  const now = new Date();
  const timestamp = now.toISOString().split('T')[0];
  const fiveLayer = skillData.fiveLayerSkill || null;

  let md = `# SKILL: ${skillData.title}

## Metadata
- **Soul-Hash**: ${skillData.soulHash}
- **Author**: ${skillData.author}
- **Domain**: ${skillData.domain}
- **Version**: 1.0.0
- **Created**: ${timestamp}
- **Protocol**: THE 42 POST · Five-Layer Skill Architecture v0.1
- **License**: Creator Reserved

---

## Layer 1 · DEFINING / 定义
${fiveLayer ? fiveLayer.principle : (skillData.desc || 'A skill forged in The 42 Post')}

---

## Layer 2 · INSTANTIATING / 实例化
`;

  if (fiveLayer && fiveLayer.exemplars && fiveLayer.exemplars.length > 0) {
    fiveLayer.exemplars.forEach((ex, i) => {
      md += `\n### ${ex.label}
> ${ex.text}

*→ ${ex.note}*
`;
    });
  } else {
    md += `*No exemplars generated — complete the Intuition Probe to generate comparative examples.*\n`;
  }

  md += `\n---\n\n## Layer 3 · FENCING / 围界\n`;

  if (fiveLayer && fiveLayer.boundaries) {
    const b = fiveLayer.boundaries;
    if (b.applies_when && b.applies_when.length) {
      md += `\n### Applies when:
`;
      b.applies_when.forEach(t => { md += `- ✓ ${t}\n`; });
    }
    if (b.does_not_apply && b.does_not_apply.length) {
      md += `\n### Does not apply:
`;
      b.does_not_apply.forEach(t => { md += `- ✕ ${t}\n`; });
    }
    if (b.tension_zones && b.tension_zones.length) {
      md += `\n### Tension zones (gray areas requiring judgment):
`;
      b.tension_zones.forEach(t => { md += `- ⚠ ${t}\n`; });
    }
  } else {
    md += `**Allowed use cases:** ${skillData.useCases || 'General creative and professional applications'}\n`;
    md += `**Disallowed uses:** ${skillData.disallowedUses || 'Harmful, illegal, or deceptive purposes'}\n`;
  }

  md += `\n---\n\n## Layer 4 · VALIDATING / 验证\n`;

  if (fiveLayer && fiveLayer.evaluation && fiveLayer.evaluation.test_cases) {
    fiveLayer.evaluation.test_cases.forEach((tc, i) => {
      md += `\n### Test Case ${i + 1}
- **Prompt:** ${tc.prompt.substring(0, 200)}
- **Expected:** ${tc.expected}
- **Pass criteria:** ${tc.pass_criteria}
`;
    });
    md += `\n**Metric:** \`${fiveLayer.evaluation.metric}\`\n`;
  } else {
    md += `*No evaluation test cases — complete the Intuition Probe to auto-generate.*\n`;
  }

  md += `\n---\n\n## Layer 5 · CONTEXTUALIZING / 情境化\n`;

  if (fiveLayer && fiveLayer.cultural_variants) {
    for (const [locale, variant] of Object.entries(fiveLayer.cultural_variants)) {
      md += `\n### ${locale}
- **Note:** ${variant.principle_note}
- **Adaptation:** ${variant.adaptation}
`;
    }
  } else {
    md += `*Cultural adaptation pending — will be generated based on probe responses.*\n`;
  }

  md += `\n---\n\n## Creator Rights
- **Commercial Use**: ${skillData.commercial === 'allowed' ? 'Allowed' : skillData.commercial === 'authorized' ? 'Authorization Required' : 'Prohibited'}
- **Remix**: ${skillData.remix === 'yes' ? 'Allowed' : skillData.remix === 'share-alike' ? 'Share-alike Required' : 'Not Allowed'}

---
*Forged with THE 42 POST · Human Semantic Capital Protocol*
`;

  return md;
}

/**
 * Generate Python/LangChain format
 */
function generateAgentSkillFormat(skillData) {
  const fiveLayer = skillData.fiveLayerSkill || null;

  if (fiveLayer) {
    const agentJson = JSON.stringify({
      schema: '42post-skill-v0.1',
      id: skillData.soulHash,
      name: skillData.title,
      author: skillData.author,
      domain: skillData.domain,
      license: {
        type: 'creator-reserved',
        commercial: skillData.commercial,
        remix: skillData.remix
      },
      layers: {
        principle: fiveLayer.principle,
        exemplars: fiveLayer.exemplars,
        boundaries: fiveLayer.boundaries,
        evaluation: fiveLayer.evaluation,
        cultural_variants: fiveLayer.cultural_variants
      },
      probe_data: fiveLayer.probe_data || {}
    }, null, 2);

    return `#!/usr/bin/env python3
"""
THE 42 POST Skill: ${skillData.title}
Soul-Hash: ${skillData.soulHash}
Author: ${skillData.author}

Generated from the Five-Layer Skill Architecture
"""

import json
from typing import Any, Dict, List

# ═══ SKILL DEFINITION ═══
SKILL = ${agentJson}

# ═══ HELPER FUNCTIONS ═══

def get_principle() -> str:
    """Get the core principle (Layer 1)"""
    return SKILL['layers']['principle']

def get_exemplars() -> List[Dict[str, str]]:
    """Get instantiation examples (Layer 2)"""
    return SKILL['layers']['exemplars']

def get_boundaries() -> Dict[str, Any]:
    """Get boundary conditions (Layer 3)"""
    return SKILL['layers']['boundaries']

def get_evaluation() -> Dict[str, Any]:
    """Get validation rules (Layer 4)"""
    return SKILL['layers']['evaluation']

def get_cultural_variants() -> Dict[str, Any]:
    """Get cultural adaptations (Layer 5)"""
    return SKILL['layers']['cultural_variants']

def apply_skill(context: str) -> str:
    """
    Apply this skill to a given context.

    Args:
        context: The situation or prompt where the skill is applied

    Returns:
        A response that respects the skill's five-layer principles
    """
    principle = get_principle()
    exemplars = get_exemplars()
    boundaries = get_boundaries()

    # Validate against boundaries
    applies_when = boundaries.get('applies_when', [])
    does_not_apply = boundaries.get('does_not_apply', [])

    # Your implementation logic here
    return f"Applying skill '{SKILL['name']}' to: {context}"

if __name__ == '__main__':
    print(f"Skill Loaded: {SKILL['name']}")
    print(f"Soul-Hash: {SKILL['id']}")
    print(f"Principle: {get_principle()}")
`;
  }

  // Fallback for skills without five-layer data
  return `#!/usr/bin/env python3
"""
THE 42 POST Skill: ${skillData.title}
Soul-Hash: ${skillData.soulHash}
Author: ${skillData.author}
"""

SKILL_DEFINITION = """
${skillData.desc}
"""

def apply_skill(context: str) -> str:
    """Apply this skill to the given context."""
    return f"Applying skill '{skillData.title}' to: {context}"

if __name__ == '__main__':
    print(f"Skill: {skillData.title}")
`;
}

/**
 * Generate MCP Config format (JSON)
 */
function generateMCPConfigFormat(skillData) {
  const manifest = {
    schema: '42post-skill-v0.1',
    id: skillData.soulHash,
    name: skillData.title,
    author: skillData.author,
    domain: skillData.domain,
    license: {
      type: 'creator-reserved',
      commercial: skillData.commercial || 'authorized',
      remix: skillData.remix === 'yes' ? true : false
    },
    description: skillData.desc,
    input_schema: {
      type: 'object',
      properties: {
        request: {
          type: 'string',
          description: 'The input to apply this skill to'
        }
      },
      required: ['request']
    },
    input_example: {
      request: 'Please apply "' + skillData.title + '" to this task: [user request here]',
      expected_output: 'Aligned response respecting the skill\'s five-layer principles'
    },
    support: {
      creator_contact: skillData.email || 'creator@the42post.com',
      documentation_url: 'https://the42post.com/skills/' + skillData.soulHash,
      feedback_url: 'https://the42post.com/skills/' + skillData.soulHash + '/feedback'
    }
  };

  return JSON.stringify(manifest, null, 2);
}

/**
 * Generate Certificate HTML
 */
function generateCertificateHTML(skillData, soulHash) {
  const createdDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Creator Card — ${skillData.title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,400&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #f0ebe2;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      font-family: 'JetBrains Mono', monospace;
    }
    .commemorative-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      text-align: center;
      position: relative;
      width: 340px;
      height: 340px;
      padding: 24px 26px 20px;
      background: linear-gradient(150deg, #faf5ec 0%, #f3e8d5 55%, #f0e2ce 100%);
      border: 1px solid rgba(60,48,40,0.16);
      border-radius: 12px;
      box-shadow: 0 4px 28px rgba(42,32,24,0.14), 0 1px 5px rgba(42,32,24,0.08);
      overflow: hidden;
    }
    .sq-brand { font-family:'JetBrains Mono',monospace; font-size:9px; font-weight:700; letter-spacing:3px; color:#3c3028; text-transform:uppercase; }
    .sq-skill-name { font-family:'Playfair Display',serif; font-size:17px; font-weight:700; color:#2a2018; line-height:1.25; }
    .sq-creator-role { font-family:'JetBrains Mono',monospace; font-size:7.5px; letter-spacing:2px; color:#8a7c6e; text-transform:uppercase; }
    .sq-invite-code  { font-family:'JetBrains Mono',monospace; font-size:16px; font-weight:700; color:#3c3028; letter-spacing:2.5px; }
    .sq-url { font-family:'JetBrains Mono',monospace; font-size:7px; letter-spacing:1px; color:rgba(138,124,110,0.38); }
    @media print {
      body { background: #f0ebe2; }
      .commemorative-card { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="commemorative-card">
    <div class="sq-brand">THE 42 POST</div>
    <div style="font-size:26px; color:#d4a849;">✨</div>
    <div class="sq-skill-name">${skillData.title}</div>
    <div class="sq-creator-role">Created by ${skillData.author}</div>
    <div style="font-size:7px; color:rgba(138,124,110,0.6); margin: 4px 0;">Soul-Hash: ${soulHash.substring(0, 20)}...</div>
    <div class="sq-invite-code" style="margin: 8px 0; font-size: 12px;">CREATOR CARD</div>
    <div style="font-size:8px; color:#999;">Forged on ${createdDate}</div>
    <div class="sq-url">www.the42post.com</div>
  </div>
  <script>
    window.addEventListener('load', () => setTimeout(() => window.print(), 400));
  </script>
</body>
</html>`;
}

export default router;
