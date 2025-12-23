// logger.js - Structured logging system with sanitization
// Compatible with Cloud Logging and Sentry
// Includes performance tracking and audit logging

/**
 * Niveles de severidad según Cloud Logging
 * https://cloud.google.com/logging/docs/reference/v2/rest/v2/LogEntry#logseverity
 */
export const Severity = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  NOTICE: 'NOTICE',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
  CRITICAL: 'CRITICAL',
  ALERT: 'ALERT',
  EMERGENCY: 'EMERGENCY'
};

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
  if (typeof window === 'undefined') return false; // Non-browser env

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
 * Crear entrada de log estructurada
 * @param {string} severity - Nivel de severidad
 * @param {string} message - Mensaje de log
 * @param {Object} context - Contexto adicional
 * @returns {Object} Entrada de log estructurada
 */
function createLogEntry(severity, message, context = {}) {
  return {
    severity,
    message,
    timestamp: new Date().toISOString(),
    ...sanitizeObject(context)
  };
}

/**
 * Structured Logger class
 */
export class StructuredLogger {
  constructor(component = 'default') {
    this.component = component;
  }

  /**
   * Log de debug (solo desarrollo)
   */
  debug(message, context = {}) {
    if (isDevelopment()) {
      const entry = createLogEntry(Severity.DEBUG, message, {
        component: this.component,
        ...context
      });
      console.debug(JSON.stringify(entry));
    }
  }

  /**
   * Log de info
   */
  info(message, context = {}) {
    const entry = createLogEntry(Severity.INFO, message, {
      component: this.component,
      ...context
    });
    console.info(JSON.stringify(entry));
  }

  /**
   * Log de notice
   */
  notice(message, context = {}) {
    const entry = createLogEntry(Severity.NOTICE, message, {
      component: this.component,
      ...context
    });
    console.log(JSON.stringify(entry));
  }

  /**
   * Log de warning
   */
  warn(message, context = {}) {
    const entry = createLogEntry(Severity.WARNING, message, {
      component: this.component,
      ...context
    });
    console.warn(JSON.stringify(entry));
  }

  /**
   * Alias para warn
   */
  warning(message, context = {}) {
    this.warn(message, context);
  }

  /**
   * Log de error
   */
  error(message, error = null, context = {}) {
    const entry = createLogEntry(Severity.ERROR, message, {
      component: this.component,
      error: error ? {
        message: error.message,
        name: error.name,
        code: error.code,
        stack: isDevelopment() ? error.stack : undefined,
        ...sanitizeObject(error)
      } : null,
      ...context
    });
    console.error(JSON.stringify(entry));

    // Enviar a Sentry si está disponible
    if (typeof Sentry !== 'undefined' && error) {
      Sentry.captureException(error, {
        contexts: {
          component: { name: this.component },
          custom: context
        }
      });
    }
  }

  /**
   * Log de critical
   */
  critical(message, error = null, context = {}) {
    const entry = createLogEntry(Severity.CRITICAL, message, {
      component: this.component,
      error: error ? {
        message: error.message,
        name: error.name,
        code: error.code,
        stack: error.stack
      } : null,
      ...context
    });
    console.error(JSON.stringify(entry));

    // Enviar a Sentry con nivel critical
    if (typeof Sentry !== 'undefined') {
      Sentry.captureMessage(message, {
        level: 'fatal',
        contexts: {
          component: { name: this.component },
          custom: context
        }
      });
    }
  }

  /**
   * Log de evento de seguridad
   */
  security(event, context = {}) {
    const entry = createLogEntry(Severity.WARNING, `Security event: ${event}`, {
      component: this.component,
      eventType: 'security',
      event,
      ...context
    });
    console.warn(JSON.stringify(entry));

    // Enviar a Sentry para tracking
    if (typeof Sentry !== 'undefined') {
      Sentry.captureMessage(`Security event: ${event}`, {
        level: 'warning',
        tags: { eventType: 'security', event },
        contexts: {
          component: { name: this.component },
          custom: context
        }
      });
    }
  }

  /**
   * Log de auditoría
   */
  audit(action, userId, context = {}) {
    const entry = createLogEntry(Severity.NOTICE, `Audit: ${action}`, {
      component: this.component,
      eventType: 'audit',
      action,
      userId,
      ...context
    });
    console.log(JSON.stringify(entry));
  }

  /**
   * Log de métrica de performance
   */
  performance(operation, durationMs, context = {}) {
    const entry = createLogEntry(Severity.INFO, `Performance: ${operation}`, {
      component: this.component,
      eventType: 'performance',
      operation,
      durationMs: Math.round(durationMs * 100) / 100,
      ...context
    });
    console.log(JSON.stringify(entry));

    // Enviar a Firebase Performance si está disponible
    if (typeof firebase !== 'undefined' && firebase.performance) {
      const trace = firebase.performance().trace(operation);
      trace.putMetric('duration', durationMs);
      Object.entries(context).forEach(([key, value]) => {
        if (typeof value === 'string') {
          trace.putAttribute(key, value);
        }
      });
    }
  }

  /**
   * Log con tabla (solo desarrollo)
   */
  table(data, label = '') {
    if (isDevelopment()) {
      if (label) console.log(label);
      console.table(sanitizeObject(data));
    }
  }

  /**
   * Group logs (solo desarrollo)
   */
  group(label, fn) {
    if (isDevelopment()) {
      console.group(label);
      fn();
      console.groupEnd();
    } else {
      fn();
    }
  }
}

/**
 * Helper para medir tiempo de ejecución
 */
export class PerformanceTimer {
  constructor(logger, operation) {
    this.logger = logger;
    this.operation = operation;
    this.startTime = performance.now();
  }

  end(context = {}) {
    const duration = performance.now() - this.startTime;
    this.logger.performance(this.operation, duration, context);
    return duration;
  }
}

/**
 * Crear logger para componente específico
 * @param {string} component - Nombre del componente
 * @returns {StructuredLogger}
 */
export function createLogger(component) {
  return new StructuredLogger(component);
}

/**
 * Logger por defecto (retrocompatibilidad)
 */
export const logger = {
  debug(...args) {
    if (isDevelopment()) {
      const sanitized = args.map(arg =>
        typeof arg === 'object' ? sanitizeObject(arg) : arg
      );
      console.debug('[DEBUG]', ...sanitized);
    }
  },

  info(...args) {
    if (isDevelopment()) {
      const sanitized = args.map(arg =>
        typeof arg === 'object' ? sanitizeObject(arg) : arg
      );
      console.info('[INFO]', ...sanitized);
    }
  },

  warn(...args) {
    // Warnings are kept in production but sanitized
    const sanitized = args.map(arg =>
      typeof arg === 'object' ? sanitizeObject(arg) : arg
    );
    console.warn('[WARN]', ...sanitized);
  },

  error(...args) {
    // Errors are always kept
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

  success(...args) {
    if (isDevelopment()) {
      const sanitized = args.map(arg =>
        typeof arg === 'object' ? sanitizeObject(arg) : arg
      );
      console.log('%c[SUCCESS]', 'color: green; font-weight: bold', ...sanitized);
    }
  },

  security(event, context = {}) {
    const sanitized = sanitizeObject(context);
    console.warn('[SECURITY]', event, sanitized);
  },

  table(data) {
    if (isDevelopment()) {
      console.table(sanitizeObject(data));
    }
  },

  time(label) {
    if (isDevelopment()) {
      console.time(label);
    }
  },

  timeEnd(label) {
    if (isDevelopment()) {
      console.timeEnd(label);
    }
  }
};

/**
 * Override global console methods in PRODUCTION to silence noise
 * This prevents data leaks via console.log in user browsers
 */
// (function silencerConfig() {
//   if (typeof window !== 'undefined' && !isDevelopment()) {
//     const noop = () => { };
//     // Silence log, info, debug, time, timeEnd, table
//     window.console.log = noop;
//     window.console.info = noop;
//     window.console.debug = noop;
//     window.console.time = noop;
//     window.console.timeEnd = noop;
//     window.console.table = noop;
//     // Note: warn and error are preserved for critical diagnostics
//   }
// })();

// Default export
export default logger;
