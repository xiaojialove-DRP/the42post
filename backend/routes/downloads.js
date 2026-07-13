/* ═══════════════════════════════════════════════════════
   Downloads Routes — Skill Export in Multiple Formats
   ═══════════════════════════════════════════════════════ */

import express from 'express';
import { db } from '../utils/db.js';
import { validateFiveLayerSchema, isValidDownloadFormat, isValidAnonymousId } from '../utils/validation.js';
import { normalizeFiveLayer } from '../utils/skillGeneration.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Simple HTML escape for backend use (avoids XSS in generated HTML files)
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

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
      `SELECT s.*, u.username, u.email, u.background
       FROM skills s
       LEFT JOIN users u ON s.author_id = u.id
       WHERE s.id = $1 AND s.deleted_at IS NULL`,
      [skillId]
    );

    // Generate anonymous session ID (stored in browser localStorage)
    const anonymousUserId = req.headers['x-anonymous-id'] || null;

    // SECURITY: Validate X-Anonymous-Id if present
    if (anonymousUserId && !isValidAnonymousId(anonymousUserId)) {
      return res.status(400).json({
        error: 'Invalid anonymous ID format',
        message: 'X-Anonymous-Id must be a valid UUID or alphanumeric string (max 255 chars)'
      });
    }

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
      // Prefer the name snapshotted at forge time over the live
      // users.username join - same reasoning as routes/skills.js's
      // creator_name: a creator renaming their account later shouldn't
      // retroactively relabel who's credited on an already-published file.
      author: (skill.creator_anonymous_id || '').replace(/^creator_/, '') || skill.username || 'Creator',
      authorBackground: skill.background || '',
      email: skill.email,
      commercial: skill.commercial_use || 'authorized',
      remix: skill.remix_allowed ? 'yes' : 'no',
      useCases: skill.applicable_when || '',
      disallowedUses: skill.disallowed_uses || '',
      ready_to_use_prompt: skill.ready_to_use_prompt || null,
      fiveLayerSkill: fiveLayer
    };

    let content, filename, contentType;

    // Build a clean filename from the skill title (ASCII-safe, no spaces)
    const titleSlug = (skill.title || 'skill')
      .replace(/[^\w一-鿿\s-]/g, '')   // keep letters, CJK, spaces, hyphens
      .trim()
      .replace(/\s+/g, '-')                      // spaces → hyphens
      .substring(0, 40);                         // max 40 chars
    const safeFilename = titleSlug || skill.id.substring(0, 8);

    switch (format) {
      case 'markdown':
        content = generateSkillMarkdown(skillData);
        filename = `42post-skill-${safeFilename}.md`;
        contentType = 'text/markdown';
        break;

      case 'langchain':
        content = generateAgentSkillFormat(skillData);
        filename = `The42Post_${safeFilename}.py`;
        contentType = 'text/plain';
        break;

      case 'mcp':
        content = generateMCPConfigFormat(skillData);
        filename = `The42Post_${safeFilename}.json`;
        contentType = 'application/json';
        break;

      case 'certificate':
        // Certificate is an HTML file
        content = generateCertificateHTML(skillData, skill.soul_hash);
        filename = `Creator_Certificate_${safeFilename}.html`;
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

    // ═══ LOG DOWNLOAD + INCREMENT COUNTER (async, non-blocking) ═══
    // 记录下载日志 + 累加 skills.download_count 让 archive 显示真实数字
    (async () => {
      try {
        await db.query(
          `INSERT INTO skill_usage_logs (id, skill_id, agent_id, context, outcome, created_at)
           VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
          [
            uuidv4(),
            skillId,
            anonymousUserId,
            `format: ${format} | ip: ${req.ip} | user-agent: ${req.get('user-agent')}`,
            'download_success'
          ]
        );
        // Bump the per-skill download counter so the archive UI reflects it
        try {
          await db.query(
            `UPDATE skills SET download_count = COALESCE(download_count, 0) + 1 WHERE id = $1`,
            [skillId]
          );
        } catch (colErr) {
          // Column may not exist yet — ensure it and retry once
          if (/column/.test(colErr.message || '')) {
            await db.query(`ALTER TABLE skills ADD COLUMN download_count INTEGER DEFAULT 0`).catch(() => {});
            await db.query(
              `UPDATE skills SET download_count = COALESCE(download_count, 0) + 1 WHERE id = $1`,
              [skillId]
            ).catch(() => {});
          }
        }
      } catch (logErr) {
        console.warn('Failed to log download:', logErr.message);
      }
    })();

  } catch (error) {
    next(error);
  }
});

/**
 * Build a complete, usable System Prompt from available fields. Shared by
 * all three export formats so "Ready to Use" means the same thing whether
 * you downloaded the .md, the .py, or the .json.
 * Priority: stored ready_to_use_prompt → synthesize from five_layer → fallback
 */
function buildReadyPrompt(skillData, fl) {
  let readyPrompt = skillData.ready_to_use_prompt || '';

  if (!readyPrompt && fl) {
    // Synthesize from five_layer: principle + key DO behavior + boundary
    const parts = [];
    if (fl.principle) parts.push(fl.principle);
    if (fl.reasoning) parts.push(fl.reasoning);
    const doEx = fl.exemplars?.find(e => /^DO/i.test(e.label || ''));
    if (doEx?.text) parts.push(`Apply this skill like so: ${doEx.text}`);
    const applies = fl.boundaries?.applies_when?.[0];
    if (applies) parts.push(`Use this when: ${applies}`);
    const notApply = fl.boundaries?.does_not_apply?.[0];
    if (notApply) parts.push(`Do not use this when: ${notApply}`);
    readyPrompt = parts.join('\n\n');
  }

  if (!readyPrompt) readyPrompt = skillData.desc || 'A skill forged in The 42 Post';
  return readyPrompt;
}

/**
 * Generate Markdown format (SKILL.md)
 */
function generateSkillMarkdown(skillData) {
  const now = new Date();
  const timestamp = now.toISOString().split('T')[0];
  const fl = normalizeFiveLayer(skillData.fiveLayerSkill);
  const readyPrompt = buildReadyPrompt(skillData, fl);

  // Detect language from title/desc for bilingual labels
  const isCn = /[一-鿿]/.test(skillData.title + (skillData.desc || ''));

  const L = {
    readyTitle:    isCn ? '⚡ 直接使用' : '⚡ Ready to Use',
    readyHint:     isCn ? '复制下方内容，粘贴到任意 AI 的 System Prompt 即可使用（Claude / ChatGPT / Gemini 均支持）'
                        : 'Copy the block below and paste as System Prompt into Claude / ChatGPT / Gemini — no setup needed.',
    l1:            isCn ? '这个 Skill 的核心信念' : 'Core Belief',
    whyMatters:    isCn ? '为什么这很重要' : 'Why this matters',
    l2:            isCn ? '实际效果对比' : 'Before & After',
    l3:            isCn ? '什么时候用，什么时候不该用' : 'When to Use / Avoid',
    applyWhen:     isCn ? '✅ 适合用的场景' : '✅ Use when',
    notApply:      isCn ? '❌ 不适合用的场景' : '❌ Avoid when',
    grayArea:      isCn ? '⚠️ 需要判断的灰色地带' : '⚠️ Gray areas',
    l4:            isCn ? '怎么知道它起效了' : 'How to Know It\'s Working',
    prompt:        isCn ? '测试场景' : 'Test prompt',
    expected:      isCn ? '期望表现' : 'Expected behavior',
    passWhen:      isCn ? '通过条件' : 'Pass when',
    metric:        isCn ? '成功指标' : 'Success metric',
    watchOut:      isCn ? '注意避免' : 'Watch out for',
    l5:            isCn ? '不同文化的用法' : 'Cultural Adaptations',
    context:       isCn ? '文化背景' : 'Cultural context',
    adaptation:    isCn ? '适配方式' : 'Adaptation',
    licensing:     isCn ? '授权说明' : 'Licensing',
    commercial:    isCn ? '商业使用' : 'Commercial use',
    remix:         isCn ? '改编权限' : 'Remixing',
    creator:       isCn ? '创作者' : 'Creator',
    noData:        isCn ? '暂无内容' : 'Not specified',
    footer:        isCn ? `由 THE 42 POST 锻造 · 人类语义资本协议 v0.1 · ${timestamp}`
                        : `Forged via THE 42 POST · Human Semantic Capital Protocol v0.1 · ${timestamp}`,
  };

  let md = `# ${skillData.title}
*${skillData.author} · THE 42 POST · ${skillData.domain}*

---

## ${L.readyTitle}

> ${L.readyHint}

\`\`\`
${readyPrompt}
\`\`\`

---

## ${L.l1}

${fl && fl.principle ? fl.principle : (skillData.desc || '')}
`;

  if (fl && fl.reasoning) {
    md += `\n**${L.whyMatters}：** ${fl.reasoning}\n`;
  }

  md += `\n---\n\n## ${L.l2}\n`;

  if (fl && fl.exemplars && fl.exemplars.length > 0) {
    fl.exemplars.forEach((ex, i) => {
      md += ex.label ? `\n### ${i + 1}. ${ex.label}\n\n${ex.text || ''}\n` : `\n### ${i + 1}\n\n${ex.text || ''}\n`;
      if (ex.note) md += `\n> ${ex.note}\n`;
    });
  } else {
    md += `\n*${L.noData}*\n`;
  }

  md += `\n---\n\n## ${L.l3}\n`;

  if (fl && fl.boundaries) {
    const b = fl.boundaries;
    if (b.applies_when && b.applies_when.length) {
      md += `\n### ${L.applyWhen}\n`;
      b.applies_when.forEach(t => { md += `- ${t}\n`; });
    }
    if (b.does_not_apply && b.does_not_apply.length) {
      md += `\n### ${L.notApply}\n`;
      b.does_not_apply.forEach(t => { md += `- ${t}\n`; });
    }
    if (b.tension_zones && b.tension_zones.length) {
      md += `\n### ${L.grayArea}\n`;
      b.tension_zones.forEach(t => { md += `- ${t}\n`; });
    }
  } else if (skillData.useCases || skillData.disallowedUses) {
    if (skillData.useCases) md += `\n### ${L.applyWhen}\n- ${skillData.useCases}\n`;
    if (skillData.disallowedUses) md += `\n### ${L.notApply}\n- ${skillData.disallowedUses}\n`;
  } else {
    md += `\n*${L.noData}*\n`;
  }

  md += `\n---\n\n## ${L.l4}\n`;

  if (fl && fl.evaluation && fl.evaluation.test_cases && fl.evaluation.test_cases.length) {
    fl.evaluation.test_cases.forEach((tc, i) => {
      md += `\n### ${isCn ? '场景' : 'Test'} ${i + 1}\n`;
      if (tc.prompt) md += `**${L.prompt}：** ${tc.prompt}\n\n`;
      if (tc.expected) md += `**${L.expected}：** ${tc.expected}\n\n`;
      if (tc.pass_criteria) md += `**${L.passWhen}：** ${tc.pass_criteria}\n`;
    });
    if (fl.evaluation.metric) md += `\n**${L.metric}：** ${fl.evaluation.metric}\n`;
    if (fl.evaluation.silent_failures?.length) {
      md += `\n**${L.watchOut}：**\n`;
      fl.evaluation.silent_failures.forEach(f => { md += `- ${f}\n`; });
    }
  } else {
    md += `\n*${L.noData}*\n`;
  }

  md += `\n---\n\n## ${L.l5}\n`;

  if (fl && fl.cultural_variants && Object.keys(fl.cultural_variants).length) {
    const localeNames = { 'zh-CN': '🇨🇳 中文', 'en-US': '🇺🇸 English', 'ja-JP': '🇯🇵 日本語' };
    for (const [locale, variant] of Object.entries(fl.cultural_variants)) {
      md += `\n### ${localeNames[locale] || locale}\n`;
      if (variant.principle_note) md += `**${L.context}：** ${variant.principle_note}\n\n`;
      if (variant.adaptation) md += `**${L.adaptation}：** ${variant.adaptation}\n`;
    }
  } else if (fl && fl.contextualizing) {
    md += `\n${fl.contextualizing}\n`;
  } else {
    md += `\n*${L.noData}*\n`;
  }

  const licenseCommercial = skillData.commercial === 'allowed'
    ? (isCn ? '✅ 可商用' : '✅ Commercial use OK')
    : skillData.commercial === 'authorized'
    ? (isCn ? '⚠️ 需授权' : '⚠️ Requires permission')
    : (isCn ? '❌ 仅非商业' : '❌ Non-commercial only');

  const licenseRemix = skillData.remix !== 'no'
    ? (isCn ? '✅ 可改编' : '✅ Remix allowed')
    : (isCn ? '❌ 不可改编' : '❌ No derivatives');

  md += `\n---\n\n## ${L.licensing}

| | |
|---|---|
| **${L.commercial}** | ${licenseCommercial} |
| **${L.remix}** | ${licenseRemix} |
| **${L.creator}** | ${skillData.author}${skillData.authorBackground ? ` — ${skillData.authorBackground}` : ''} |

---

*${L.footer}*
`;

  return md;
}


/**
 * Generate Python/LangChain format
 */
function generateAgentSkillFormat(skillData) {
  // normalizeFiveLayer() handles all three five_layer shapes that exist in
  // the DB (rich/structured, older object-shaped, and the current flat-
  // string shape from generateFlatFiveLayerWithClaude) — reading
  // skillData.fiveLayerSkill directly here used to skip that entirely, so
  // every real skill produced an empty `layers: {}` with no error raised.
  const fiveLayer = normalizeFiveLayer(skillData.fiveLayerSkill);
  // Guard against the prompt text containing `"""`, which would otherwise
  // terminate the Python triple-quoted string early.
  const pyReadyPrompt = buildReadyPrompt(skillData, fiveLayer).replace(/"""/g, '\\"\\"\\"');
  const authorLine = skillData.authorBackground
    ? `Author: ${skillData.author} (${skillData.authorBackground})`
    : `Author: ${skillData.author}`;

  if (fiveLayer) {
    const agentJson = JSON.stringify({
      schema: '42post-skill-v0.1',
      id: skillData.soulHash,
      name: skillData.title,
      author: skillData.author,
      author_background: skillData.authorBackground || null,
      domain: skillData.domain,
      license: {
        type: 'creator-reserved',
        commercial: skillData.commercial,
        remix: skillData.remix
      },
      ready_to_use_prompt: skillData.ready_to_use_prompt || buildReadyPrompt(skillData, fiveLayer),
      layers: {
        principle: fiveLayer.principle || '',
        exemplars: fiveLayer.exemplars || [],
        boundaries: fiveLayer.boundaries || {},
        evaluation: fiveLayer.evaluation || {},
        cultural_variants: fiveLayer.cultural_variants || {}
      },
      probe_data: fiveLayer.probe_data || {}
    }, null, 2);

    return `#!/usr/bin/env python3
"""
THE 42 POST Skill: ${skillData.title}
Soul-Hash: ${skillData.soulHash}
${authorLine}

Generated from the Five-Layer Skill Architecture
"""

import json
from typing import Any, Dict, List

# ═══ SKILL DEFINITION ═══
SKILL = ${agentJson}

# ═══ READY TO USE ═══
# Paste this directly as a system prompt into Claude / ChatGPT / Gemini —
# same content as the "Ready to Use" block in the .md export.
READY_TO_USE_PROMPT = """${pyReadyPrompt}"""

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

def apply_skill(context: str, llm_call=None) -> str:
    """
    Apply this skill to a given context using READY_TO_USE_PROMPT as the
    system prompt. Pass your own LLM call as llm_call(system, user) -> str
    (e.g. an OpenAI/Anthropic client wrapper); without one, returns the
    prompt + context so you can see exactly what would be sent.
    """
    if llm_call:
        return llm_call(READY_TO_USE_PROMPT, context)
    return f"[system]\\n{READY_TO_USE_PROMPT}\\n\\n[user]\\n{context}"

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
${authorLine}
"""

SKILL_DEFINITION = """
${skillData.desc}
"""

# Paste this directly as a system prompt into Claude / ChatGPT / Gemini.
READY_TO_USE_PROMPT = """${pyReadyPrompt}"""

def apply_skill(context: str, llm_call=None) -> str:
    """Apply this skill to the given context using READY_TO_USE_PROMPT."""
    if llm_call:
        return llm_call(READY_TO_USE_PROMPT, context)
    return f"[system]\\n{READY_TO_USE_PROMPT}\\n\\n[user]\\n{context}"

if __name__ == '__main__':
    print(f"Skill: {skillData.title}")
`;
}

/**
 * Generate MCP Config format (JSON)
 */
function generateMCPConfigFormat(skillData) {
  const fiveLayer = normalizeFiveLayer(skillData.fiveLayerSkill);
  const manifest = {
    schema: '42post-skill-v0.1',
    id: skillData.soulHash,
    name: skillData.title,
    author: skillData.author,
    author_background: skillData.authorBackground || null,
    domain: skillData.domain,
    license: {
      type: 'creator-reserved',
      commercial: skillData.commercial || 'authorized',
      remix: skillData.remix === 'yes' ? true : false
    },
    description: skillData.desc,
    // Copy-pasteable as a system prompt — same content as the "Ready to
    // Use" block in the .md export and READY_TO_USE_PROMPT in the .py.
    ready_to_use_prompt: skillData.ready_to_use_prompt || buildReadyPrompt(skillData, fiveLayer),
    layers: fiveLayer ? {
      principle: fiveLayer.principle || '',
      exemplars: fiveLayer.exemplars || [],
      boundaries: fiveLayer.boundaries || {},
      evaluation: fiveLayer.evaluation || {},
      cultural_variants: fiveLayer.cultural_variants || {}
    } : null,
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
      // No creator_contact field here on purpose — this used to be the
      // creator's real email address (skillData.email), baked into a
      // file anyone can download. Identity on this platform is meant to
      // be anonymous-by-default (username only); feedback_url below is
      // the actual intended contact path and carries no PII.
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
  <title>Creator Card — ${escapeHtml(skillData.title)}</title>
  <link rel="preconnect" href="https://fonts.font.im">
  <link href="https://fonts.font.im/css2?family=Playfair+Display:ital,wght@0,700;1,400&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
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
    <div class="sq-skill-name">${escapeHtml(skillData.title)}</div>
    <div class="sq-creator-role">Created by ${escapeHtml(skillData.author)}</div>
    <div style="font-size:7px; color:rgba(138,124,110,0.6); margin: 4px 0;">Soul-Hash: ${escapeHtml(soulHash.substring(0, 20))}...</div>
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
