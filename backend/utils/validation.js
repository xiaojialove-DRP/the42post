/* ═══════════════════════════════════════════════════════
   Validation Utilities — Data Integrity Checks
   ═══════════════════════════════════════════════════════ */

/**
 * 验证 Five-Layer 结构完整性
 * @param {Object} fiveLayer - 五层架构对象
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validateFiveLayerSchema(fiveLayer) {
  const errors = [];

  // 检查是否为对象
  if (!fiveLayer || typeof fiveLayer !== 'object') {
    return {
      valid: false,
      errors: ['Five-layer must be a valid object']
    };
  }

  // 检查5个必需的层级
  const requiredLayers = ['principle', 'exemplars', 'boundaries', 'evaluation', 'cultural_variants'];

  for (const layer of requiredLayers) {
    if (!fiveLayer[layer]) {
      errors.push(`Missing required layer: ${layer}`);
    }
  }

  // 详细验证每一层
  if (fiveLayer.principle && typeof fiveLayer.principle !== 'string') {
    errors.push('principle must be a string');
  }

  if (fiveLayer.exemplars) {
    if (!Array.isArray(fiveLayer.exemplars)) {
      errors.push('exemplars must be an array');
    } else if (fiveLayer.exemplars.length === 0) {
      errors.push('exemplars array cannot be empty');
    } else {
      // 检查每个exemplar的结构
      fiveLayer.exemplars.forEach((ex, i) => {
        if (!ex.label || !ex.text || !ex.note) {
          errors.push(`exemplar[${i}] missing required fields: label, text, or note`);
        }
      });
    }
  }

  if (fiveLayer.boundaries) {
    if (typeof fiveLayer.boundaries !== 'object') {
      errors.push('boundaries must be an object');
    } else {
      // boundaries应包含applies_when, does_not_apply, 和/或 tension_zones
      if (!Array.isArray(fiveLayer.boundaries.applies_when) &&
          !Array.isArray(fiveLayer.boundaries.does_not_apply) &&
          !Array.isArray(fiveLayer.boundaries.tension_zones)) {
        errors.push('boundaries must contain at least one of: applies_when, does_not_apply, tension_zones');
      }
    }
  }

  if (fiveLayer.evaluation) {
    if (typeof fiveLayer.evaluation !== 'object') {
      errors.push('evaluation must be an object');
    } else {
      if (!Array.isArray(fiveLayer.evaluation.test_cases)) {
        errors.push('evaluation.test_cases must be an array');
      }
      if (!fiveLayer.evaluation.metric || typeof fiveLayer.evaluation.metric !== 'string') {
        errors.push('evaluation.metric must be a non-empty string');
      }
    }
  }

  if (fiveLayer.cultural_variants) {
    if (typeof fiveLayer.cultural_variants !== 'object') {
      errors.push('cultural_variants must be an object');
    } else if (Object.keys(fiveLayer.cultural_variants).length === 0) {
      errors.push('cultural_variants cannot be empty');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 验证 Skill 发布数据的完整性
 * @param {Object} skillData - Skill 数据
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validateSkillData(skillData) {
  const errors = [];

  if (!skillData.title || typeof skillData.title !== 'string' || skillData.title.trim().length === 0) {
    errors.push('title is required and must be non-empty string');
  }

  if (!skillData.description && !skillData.desc) {
    errors.push('description is recommended (description or desc field)');
  }

  if (!skillData.domain || typeof skillData.domain !== 'string') {
    errors.push('domain is required');
  }

  // 验证domain是有效的
  const validDomains = ['safety', 'science', 'narrative', 'design', 'visual', 'experience', 'sound', 'ideas', 'history', 'fun'];
  if (skillData.domain && !validDomains.includes(skillData.domain)) {
    errors.push(`domain must be one of: ${validDomains.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 验证下载格式参数
 * @param {string} format - 文件格式
 * @returns {boolean}
 */
export function isValidDownloadFormat(format) {
  const validFormats = ['markdown', 'langchain', 'mcp', 'certificate'];
  return validFormats.includes(format);
}

/**
 * 清理和规范化 Five-Layer 数据
 * 如果数据不完整，提供合理的默认值
 * @param {Object} fiveLayer - 原始五层数据
 * @returns {Object} 清理后的数据
 */
export function normalizeFiveLayer(fiveLayer) {
  if (!fiveLayer) {
    return null;
  }

  return {
    principle: fiveLayer.principle || 'Core principle definition pending',
    exemplars: Array.isArray(fiveLayer.exemplars) && fiveLayer.exemplars.length > 0
      ? fiveLayer.exemplars
      : [{ label: 'Example', text: 'To be exemplified', note: 'Pending development' }],
    boundaries: fiveLayer.boundaries || {
      applies_when: ['When applicable'],
      does_not_apply: ['When not applicable'],
      tension_zones: []
    },
    evaluation: fiveLayer.evaluation || {
      test_cases: [{ prompt: 'Test case pending', expected: 'Result pending', pass_criteria: 'TBD' }],
      metric: 'TBD'
    },
    cultural_variants: fiveLayer.cultural_variants || {
      'en': { principle_note: 'English context', adaptation: 'TBD' }
    }
  };
}

export default {
  validateFiveLayerSchema,
  validateSkillData,
  isValidDownloadFormat,
  normalizeFiveLayer
};
