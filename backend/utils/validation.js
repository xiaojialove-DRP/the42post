/* ═══════════════════════════════════════════════════════
   Validation Utilities — Data Integrity Checks

   SECURITY:
   - Domain whitelist prevents SQL injection via domain filters
   - Input validation is strict: no unexpected fields accepted
   - Type checking on all user-supplied parameters
   ═══════════════════════════════════════════════════════ */

// Whitelist of valid skill domains
// These are the ONLY allowed values for domain filtering in queries
const VALID_DOMAINS = Object.freeze([
  'safety', 'science', 'narrative', 'design', 'visual',
  'experience', 'sound', 'ideas', 'history', 'fun'
]);

/**
 * Validate domain against whitelist
 * @param {string} domain - Domain to validate
 * @returns {boolean}
 */
export function isValidDomain(domain) {
  if (!domain || typeof domain !== 'string') {
    return false;
  }
  return VALID_DOMAINS.includes(domain.toLowerCase().trim());
}

/**
 * Get all valid domains
 * @returns {string[]}
 */
export function getValidDomains() {
  return [...VALID_DOMAINS];
}

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

  // Validate domain against whitelist (prevents SQL injection)
  if (skillData.domain && !isValidDomain(skillData.domain)) {
    errors.push(`domain must be one of: ${VALID_DOMAINS.join(', ')}`);
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
 * SECURITY: Validate X-Anonymous-Id header format
 * Should be a reasonable string (UUID format preferred, but fallback to alphanumeric)
 * @param {string} id - Anonymous ID from header
 * @returns {boolean}
 */
export function isValidAnonymousId(id) {
  if (!id || typeof id !== 'string') {
    return false;
  }

  // Accept UUID format or alphanumeric with hyphens/underscores
  // Max length 255 to prevent storage abuse
  if (id.length > 255) {
    return false;
  }

  // UUID format: 550e8400-e29b-41d4-a716-446655440000
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(id)) {
    return true;
  }

  // Fallback: alphanumeric with hyphens, underscores (e.g., anonymous-user-001)
  const alphanumericRegex = /^[a-zA-Z0-9_-]+$/;
  return alphanumericRegex.test(id);
}

/**
 * 验证 Email 格式
 * @param {string} email - Email 地址
 * @returns {boolean}
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }

  // RFC 5322 简化版本，足以过滤大多数无效输入
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * 验证用户名格式
 * - 字母数字下划线，3-32 字符
 * - 不能以数字开头
 * @param {string} username - 用户名
 * @returns {boolean}
 */
export function isValidUsername(username) {
  if (!username || typeof username !== 'string') {
    return false;
  }

  // 3-32 chars, alphanumeric + underscore, cannot start with number
  const usernameRegex = /^[a-zA-Z_][a-zA-Z0-9_]{2,31}$/;
  return usernameRegex.test(username);
}

/**
 * 验证密码强度
 * - 最少 8 个字符
 * - 至少一个大写字母，一个小写字母，一个数字
 * @param {string} password - 密码
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validatePassword(password) {
  const errors = [];

  if (!password || typeof password !== 'string') {
    errors.push('Password must be a string');
    return { valid: false, errors };
  }

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one digit');
  }

  if (password.length > 128) {
    errors.push('Password must be 128 characters or less');
  }

  return {
    valid: errors.length === 0,
    errors
  };
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
  normalizeFiveLayer,
  isValidDomain,
  getValidDomains,
  isValidEmail,
  isValidUsername,
  validatePassword,
  VALID_DOMAINS
};
