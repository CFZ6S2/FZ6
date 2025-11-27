// logger.js - Conditional logging system for production
// Only logs in development mode, silent in production
// Includes data sanitization for sensitive information

/**
 * Check if we're in development mode
 * @returns {boolean}
 */
function isDevelopment() {
  // Development indicators:
  // 1. localhost
  // 2. 127.0.0.1
  // 3. .local domain
  // 4. URL parameter ?debug=true
  const hostname = window.location.hostname;
  const isDev = hostname === 'localhost' ||
                hostname === '127.0.0.1' ||
                hostname.endsWith('.local') ||
                new URLSearchParams(window.location.search).get('debug') === 'true';

  return isDev;
}

/**
 * Campos sensibles que deben redactarse completamente
 */
const REDACT_FIELDS = new Set([
  'password',
  'passwd',
  'pwd',
  'secret',
  'apiKey',
  'api_key',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'privateKey',
  'private_key',
  'cvv',
  'cvc',
  'cardNumber',
  'card_number',
  'ssn',
  'authorization',
  'cookie',
  'sessionId',
  'session_id'
]);

/**
 * Campos que deben parcialmente enmascararse
 */
const MASK_FIELDS = new Set([
  'email',
  'phone',
  'telefono',
  'mobile',
  'dni',
  'nif'
]);

/**
 * Sanitizar valor según tipo de dato sensible
 * @param {string} key - Nombre del campo
 * @param {any} value - Valor a sanitizar
 * @returns {any} Valor sanitizado
 */
function sanitizeValue(key, value) {
  if (value === null || value === undefined) {
    return value;
  }

  const keyLower = key.toLowerCase();

  // Redactar completamente campos sensibles
  if (REDACT_FIELDS.has(key) || REDACT_FIELDS.has(keyLower)) {
    return '[REDACTED]';
  }

  // Enmascarar parcialmente ciertos campos
  if (MASK_FIELDS.has(key) || MASK_FIELDS.has(keyLower)) {
    const str = String(value);
    if (str.length <= 4) {
      return '****';
    }
    return '****' + str.slice(-4);
  }

  // Sanitizar emails
  if (typeof value === 'string' && value.includes('@') && value.includes('.')) {
    const parts = value.split('@');
    if (parts.length === 2 && parts[0].length > 2) {
      return parts[0].substring(0, 2) + '****@' + parts[1];
    }
  }

  return value;
}

/**
 * Sanitizar objeto recursivamente
 * @param {any} obj - Objeto a sanitizar
 * @param {number} depth - Profundidad actual
 * @returns {any} Objeto sanitizado
 */
function sanitizeObject(obj, depth = 0) {
  // Prevenir recursión infinita
  if (depth > 10) {
    return '[MAX_DEPTH]';
  }

  if (obj === null || obj === undefined) {
    return obj;
  }

  // Tipos primitivos
  if (typeof obj !== 'object') {
    return obj;
  }

  // Arrays
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, depth + 1));
  }

  // Objetos
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value, depth + 1);
    } else {
      sanitized[key] = sanitizeValue(key, value);
    }
  }

  return sanitized;
}

/**
 * Logger object with conditional methods and sanitization
 */
export const logger = {
  /**
   * Log debug information (only in development)
   * @param {...any} args - Arguments to log
   */
  debug(...args) {
    if (isDevelopment()) {
      const sanitized = args.map(arg =>
        typeof arg === 'object' ? sanitizeObject(arg) : arg
      );
      console.log('[DEBUG]', ...sanitized);
    }
  },

  /**
   * Log informational messages (only in development)
   * @param {...any} args - Arguments to log
   */
  info(...args) {
    if (isDevelopment()) {
      const sanitized = args.map(arg =>
        typeof arg === 'object' ? sanitizeObject(arg) : arg
      );
      console.info('[INFO]', ...sanitized);
    }
  },

  /**
   * Log warnings (always shown, sanitized)
   * @param {...any} args - Arguments to log
   */
  warn(...args) {
    const sanitized = args.map(arg =>
      typeof arg === 'object' ? sanitizeObject(arg) : arg
    );
    console.warn('[WARN]', ...sanitized);
  },

  /**
   * Log errors (always shown, sanitized)
   * @param {...any} args - Arguments to log
   */
  error(...args) {
    const sanitized = args.map(arg => {
      if (arg instanceof Error) {
        return {
          message: arg.message,
          name: arg.name,
          code: arg.code,
          stack: isDevelopment() ? arg.stack : undefined
        };
      }
      return typeof arg === 'object' ? sanitizeObject(arg) : arg;
    });
    console.error('[ERROR]', ...sanitized);
  },

  /**
   * Log success messages (only in development)
   * @param {...any} args - Arguments to log
   */
  success(...args) {
    if (isDevelopment()) {
      const sanitized = args.map(arg =>
        typeof arg === 'object' ? sanitizeObject(arg) : arg
      );
      console.log('%c[SUCCESS]', 'color: green; font-weight: bold', ...sanitized);
    }
  },

  /**
   * Log with custom styling (only in development)
   * @param {string} style - CSS style string
   * @param {...any} args - Arguments to log
   */
  styled(style, ...args) {
    if (isDevelopment()) {
      const sanitized = args.map(arg =>
        typeof arg === 'object' ? sanitizeObject(arg) : arg
      );
      console.log(`%c${sanitized[0]}`, style, ...sanitized.slice(1));
    }
  },

  /**
   * Group logs together (only in development)
   * @param {string} label - Group label
   * @param {Function} fn - Function to execute in group
   */
  group(label, fn) {
    if (isDevelopment()) {
      console.group(label);
      fn();
      console.groupEnd();
    } else {
      fn(); // Still execute function, just don't group
    }
  },

  /**
   * Log table data (only in development, sanitized)
   * @param {any} data - Data to display as table
   */
  table(data) {
    if (isDevelopment()) {
      const sanitized = sanitizeObject(data);
      console.table(sanitized);
    }
  },

  /**
   * Performance timing
   * @param {string} label - Timer label
   */
  time(label) {
    if (isDevelopment()) {
      console.time(label);
    }
  },

  /**
   * End performance timing
   * @param {string} label - Timer label
   */
  timeEnd(label) {
    if (isDevelopment()) {
      console.timeEnd(label);
    }
  },

  /**
   * Log security event (always logged, highly sanitized)
   * @param {string} event - Event description
   * @param {Object} context - Context information
   */
  security(event, context = {}) {
    const sanitized = sanitizeObject(context);
    console.warn('[SECURITY]', event, sanitized);
  }
};

// Default export
export default logger;
