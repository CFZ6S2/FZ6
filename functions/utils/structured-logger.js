// functions/utils/structured-logger.js
// Sistema de logs estructurados con sanitización de datos sensibles

/**
 * Niveles de severidad según Cloud Logging
 * https://cloud.google.com/logging/docs/reference/v2/rest/v2/LogEntry#logseverity
 */
const Severity = {
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
 * Patrones de datos sensibles que deben sanitizarse
 */
const SENSITIVE_PATTERNS = {
  // Tokens y credenciales
  accessToken: /access[_-]?token/i,
  refreshToken: /refresh[_-]?token/i,
  apiKey: /api[_-]?key/i,
  password: /password|passwd|pwd/i,
  secret: /secret/i,

  // Información financiera
  creditCard: /card[_-]?number|cc[_-]?number/i,
  cvv: /cvv|cvc|card[_-]?code/i,

  // Datos personales (GDPR)
  email: /email/i,
  phone: /phone|telefono|mobile/i,
  address: /address|direccion/i,

  // Identificadores sensibles
  ssn: /ssn|social[_-]?security/i,
  dni: /dni|nif|passport/i,

  // Headers sensibles
  authorization: /authorization/i,
  cookie: /cookie/i,

  // Datos de PayPal/Stripe
  paypalSecret: /paypal[_-]?secret/i,
  stripeSecret: /stripe[_-]?secret/i
};

/**
 * Campos que siempre deben redactarse completamente
 */
const REDACT_FIELDS = new Set([
  'password',
  'passwd',
  'pwd',
  'secret',
  'api_key',
  'apiKey',
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
  'cookie'
]);

/**
 * Campos que deben parcialmente enmascararse (mostrar solo últimos 4 caracteres)
 */
const MASK_FIELDS = new Set([
  'email',
  'phone',
  'telefono',
  'mobile',
  'cardNumber',
  'card_number',
  'accountNumber',
  'account_number'
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
  if (typeof value === 'string' && value.includes('@')) {
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
 * @param {number} depth - Profundidad actual (prevenir recursión infinita)
 * @returns {any} Objeto sanitizado
 */
function sanitizeObject(obj, depth = 0) {
  // Prevenir recursión infinita
  if (depth > 10) {
    return '[MAX_DEPTH_EXCEEDED]';
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
  const entry = {
    severity,
    message,
    timestamp: new Date().toISOString(),
    ...sanitizeObject(context)
  };

  // En Cloud Functions, usar console con JSON estructurado
  // Cloud Logging parseará automáticamente el JSON
  return entry;
}

/**
 * Logger estructurado
 */
class StructuredLogger {
  constructor(component = 'default') {
    this.component = component;
  }

  /**
   * Log de debug
   */
  debug(message, context = {}) {
    const entry = createLogEntry(Severity.DEBUG, message, {
      component: this.component,
      ...context
    });
    console.log(JSON.stringify(entry));
  }

  /**
   * Log de info
   */
  info(message, context = {}) {
    const entry = createLogEntry(Severity.INFO, message, {
      component: this.component,
      ...context
    });
    console.log(JSON.stringify(entry));
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
   * Log de error
   */
  error(message, error = null, context = {}) {
    const entry = createLogEntry(Severity.ERROR, message, {
      component: this.component,
      error: error ? {
        message: error.message,
        stack: error.stack,
        code: error.code,
        ...sanitizeObject(error)
      } : null,
      ...context
    });
    console.error(JSON.stringify(entry));
  }

  /**
   * Log de critical
   */
  critical(message, error = null, context = {}) {
    const entry = createLogEntry(Severity.CRITICAL, message, {
      component: this.component,
      error: error ? {
        message: error.message,
        stack: error.stack,
        code: error.code
      } : null,
      ...context
    });
    console.error(JSON.stringify(entry));
  }

  /**
   * Log de seguridad
   */
  security(event, context = {}) {
    const entry = createLogEntry(Severity.WARNING, `Security event: ${event}`, {
      component: this.component,
      eventType: 'security',
      event,
      ...context
    });
    console.warn(JSON.stringify(entry));
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
      durationMs,
      ...context
    });
    console.log(JSON.stringify(entry));
  }
}

/**
 * Helper para medir tiempo de ejecución
 */
class PerformanceTimer {
  constructor(logger, operation) {
    this.logger = logger;
    this.operation = operation;
    this.startTime = Date.now();
  }

  end(context = {}) {
    const duration = Date.now() - this.startTime;
    this.logger.performance(this.operation, duration, context);
    return duration;
  }
}

/**
 * Crear logger para componente específico
 */
function createLogger(component) {
  return new StructuredLogger(component);
}

module.exports = {
  StructuredLogger,
  PerformanceTimer,
  createLogger,
  sanitizeObject,
  Severity
};
