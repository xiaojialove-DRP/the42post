/* ═══════════════════════════════════════════════════════
   Request Validation Middleware

   Validates request body, query parameters, and headers
   against defined schemas before reaching route handlers.
   ═══════════════════════════════════════════════════════ */

/**
 * Define validation schemas for endpoints
 */
const VALIDATION_SCHEMAS = {
  // Auth endpoints
  'POST /auth/forge-session': {
    body: {
      email: { type: 'string', required: true, minLength: 5, maxLength: 254 },
      username: { type: 'string', required: true, minLength: 3, maxLength: 32 }
    }
  },

  'POST /auth/register': {
    body: {
      email: { type: 'string', required: true, minLength: 5, maxLength: 254 },
      username: { type: 'string', required: true, minLength: 3, maxLength: 32 },
      password: { type: 'string', required: true, minLength: 8, maxLength: 128 },
      // account_type removed - agents are no longer part of the product
    }
  },

  // Forge endpoints
  'POST /forge/probe': {
    body: {
      idea_text: { type: 'string', required: true, minLength: 10, maxLength: 5000 },
      language: { type: 'string', required: false, enum: ['en', 'zh'] }
    }
  },

  'POST /forge/generate': {
    body: {
      skill_name: { type: 'string', required: true, minLength: 3, maxLength: 200 },
      idea_text: { type: 'string', required: true, minLength: 10 },
      probe_data: { type: 'object', required: true },
      selected_response: { type: 'string', required: true, enum: ['thesis', 'antithesis', 'extreme'] },
      domain: { type: 'string', required: false, minLength: 3, maxLength: 50 },
      language: { type: 'string', required: false, enum: ['en', 'zh'] }
    }
  },

  // Skills endpoints
  'GET /skills': {
    query: {
      page: { type: 'number', required: false, min: 1, max: 1000 },
      limit: { type: 'number', required: false, min: 1, max: 100 },
      domain: { type: 'string', required: false, minLength: 3, maxLength: 50 },
      search: { type: 'string', required: false, maxLength: 100 }
    }
  },

  'POST /skills': {
    body: {
      title: { type: 'string', required: true, minLength: 3, maxLength: 200 },
      description: { type: 'string', required: false, maxLength: 1000 },
      domain: { type: 'string', required: false, minLength: 3, maxLength: 50 },
      five_layer: { type: 'object', required: true },
      // forge_mode removed - agents are no longer part of the product
      commercial_use: { type: 'string', required: false },
      remix_allowed: { type: 'boolean', required: false }
    }
  },

  // Playground endpoints
  'POST /playground/test': {
    body: {
      skill_id: { type: 'string', required: true, minLength: 1, maxLength: 100 },
      scenario: { type: 'object', required: true },
      language: { type: 'string', required: false, enum: ['en', 'zh'] }
    }
  }
};

/**
 * Validate field against schema definition
 */
function validateField(value, fieldSchema, fieldName) {
  const { type, required, minLength, maxLength, min, max, enum: enumValues } = fieldSchema;

  // Check required
  if (required && (value === undefined || value === null || value === '')) {
    return `${fieldName} is required`;
  }

  // Skip validation if not required and not provided
  if (!required && (value === undefined || value === null)) {
    return null;
  }

  // Type validation
  if (typeof value !== type) {
    // Allow string-to-number conversion for query params
    if (type === 'number' && typeof value === 'string') {
      const num = parseFloat(value);
      if (isNaN(num)) {
        return `${fieldName} must be a number`;
      }
    } else {
      return `${fieldName} must be ${type}`;
    }
  }

  // String length validation
  if (typeof value === 'string') {
    if (minLength && value.length < minLength) {
      return `${fieldName} must be at least ${minLength} characters`;
    }
    if (maxLength && value.length > maxLength) {
      return `${fieldName} must be at most ${maxLength} characters`;
    }
  }

  // Number range validation
  if (typeof value === 'number') {
    if (min !== undefined && value < min) {
      return `${fieldName} must be at least ${min}`;
    }
    if (max !== undefined && value > max) {
      return `${fieldName} must be at most ${max}`;
    }
  }

  // Enum validation
  if (enumValues && !enumValues.includes(value)) {
    return `${fieldName} must be one of: ${enumValues.join(', ')}`;
  }

  return null;
}

/**
 * Validate request against schema
 */
function validateRequest(req, schema) {
  const errors = [];

  // Validate body
  if (schema.body) {
    for (const [fieldName, fieldSchema] of Object.entries(schema.body)) {
      const value = req.body?.[fieldName];
      const error = validateField(value, fieldSchema, `body.${fieldName}`);
      if (error) errors.push(error);
    }
  }

  // Validate query parameters
  if (schema.query) {
    for (const [fieldName, fieldSchema] of Object.entries(schema.query)) {
      const value = req.query?.[fieldName];
      const error = validateField(value, fieldSchema, `query.${fieldName}`);
      if (error) errors.push(error);
    }
  }

  // Validate headers
  if (schema.headers) {
    for (const [fieldName, fieldSchema] of Object.entries(schema.headers)) {
      const value = req.headers?.[fieldName.toLowerCase()];
      const error = validateField(value, fieldSchema, `header.${fieldName}`);
      if (error) errors.push(error);
    }
  }

  return errors.length > 0 ? errors : null;
}

/**
 * Create request validation middleware
 */
export function createRequestValidator(schema) {
  return (req, res, next) => {
    const errors = validateRequest(req, schema);

    if (errors) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }

    next();
  };
}

/**
 * Middleware to validate based on route path
 */
export function requestValidator(req, res, next) {
  const key = `${req.method} ${req.baseUrl}${req.path}`;

  // Remove query string from path for schema lookup
  const pathForLookup = key.split('?')[0];

  const schema = VALIDATION_SCHEMAS[pathForLookup];

  if (!schema) {
    // No schema defined for this route
    return next();
  }

  const errors = validateRequest(req, schema);

  if (errors) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
  }

  next();
}

/**
 * Register validation schema at runtime
 */
export function registerSchema(path, schema) {
  VALIDATION_SCHEMAS[path] = schema;
  console.log(`✓ Registered validation schema for ${path}`);
}

/**
 * Get all registered schemas
 */
export function getSchemas() {
  return VALIDATION_SCHEMAS;
}
