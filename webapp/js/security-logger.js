/**
 * Security Event Logger
 *
 * Logs security-relevant events for monitoring and auditing.
 * Helps detect suspicious activity and potential attacks.
 *
 * Usage:
 * ```javascript
 * import { SecurityLogger } from './security-logger.js';
 *
 * SecurityLogger.logFailedLogin(email, reason);
 * SecurityLogger.logSuspiciousActivity('XSS attempt detected', data);
 * ```
 */

class SecurityEventLogger {
  constructor() {
    this.storageKey = 'security_events';
    this.maxEvents = 100; // Keep last 100 events
  }

  /**
   * Get all security events
   * @private
   */
  _getEvents() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error reading security events:', e);
      return [];
    }
  }

  /**
   * Save security events
   * @private
   */
  _saveEvents(events) {
    try {
      // Keep only last maxEvents
      const trimmed = events.slice(-this.maxEvents);
      localStorage.setItem(this.storageKey, JSON.stringify(trimmed));
    } catch (e) {
      console.error('Error saving security events:', e);
    }
  }

  /**
   * Log a security event
   * @private
   */
  _logEvent(type, severity, message, data = {}) {
    const event = {
      type,
      severity, // 'low', 'medium', 'high', 'critical'
      message,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      data
    };

    const events = this._getEvents();
    events.push(event);
    this._saveEvents(events);

    // Console log for development
    const emoji = {
      critical: '🚨',
      high: '⚠️',
      medium: '⚡',
      low: 'ℹ️'
    }[severity] || '📋';

    console.warn(`${emoji} SECURITY [${severity.toUpperCase()}]: ${message}`, data);

    // Could send to backend for server-side logging
    // this._sendToBackend(event);

    return event;
  }

  /**
   * Send event to backend (placeholder)
   * @private
   */
  _sendToBackend(event) {
    // TODO: Implement server-side logging
    // fetch('/api/security/log', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(event)
    // });
  }

  /**
   * Log failed login attempt
   */
  logFailedLogin(email, reason = 'Invalid credentials') {
    return this._logEvent(
      'FAILED_LOGIN',
      'medium',
      `Failed login attempt for ${email}`,
      { email, reason }
    );
  }

  /**
   * Log successful login
   */
  logSuccessfulLogin(userId, email) {
    return this._logEvent(
      'SUCCESSFUL_LOGIN',
      'low',
      `Successful login for ${email}`,
      { userId, email }
    );
  }

  /**
   * Log logout
   */
  logLogout(userId) {
    return this._logEvent(
      'LOGOUT',
      'low',
      'User logged out',
      { userId }
    );
  }

  /**
   * Log rate limit exceeded
   */
  logRateLimitExceeded(action, identifier) {
    return this._logEvent(
      'RATE_LIMIT_EXCEEDED',
      'high',
      `Rate limit exceeded for ${action}`,
      { action, identifier }
    );
  }

  /**
   * Log XSS attempt
   */
  logXSSAttempt(input, location) {
    return this._logEvent(
      'XSS_ATTEMPT',
      'critical',
      'Potential XSS attack detected',
      { input: input.substring(0, 200), location }
    );
  }

  /**
   * Log SQL injection attempt
   */
  logSQLInjectionAttempt(input, location) {
    return this._logEvent(
      'SQL_INJECTION_ATTEMPT',
      'critical',
      'Potential SQL injection detected',
      { input: input.substring(0, 200), location }
    );
  }

  /**
   * Log unauthorized access attempt
   */
  logUnauthorizedAccess(resource, userId = null) {
    return this._logEvent(
      'UNAUTHORIZED_ACCESS',
      'high',
      `Unauthorized access attempt to ${resource}`,
      { resource, userId }
    );
  }

  /**
   * Log session hijacking attempt
   */
  logSessionHijackAttempt(reason) {
    return this._logEvent(
      'SESSION_HIJACK_ATTEMPT',
      'critical',
      'Potential session hijacking detected',
      { reason }
    );
  }

  /**
   * Log CSRF attempt
   */
  logCSRFAttempt(action) {
    return this._logEvent(
      'CSRF_ATTEMPT',
      'high',
      'Potential CSRF attack detected',
      { action }
    );
  }

  /**
   * Log suspicious activity
   */
  logSuspiciousActivity(description, data = {}) {
    return this._logEvent(
      'SUSPICIOUS_ACTIVITY',
      'medium',
      description,
      data
    );
  }

  /**
   * Log data breach attempt
   */
  logDataBreachAttempt(dataType, method) {
    return this._logEvent(
      'DATA_BREACH_ATTEMPT',
      'critical',
      `Data breach attempt detected: ${dataType}`,
      { dataType, method }
    );
  }

  /**
   * Log password change
   */
  logPasswordChange(userId) {
    return this._logEvent(
      'PASSWORD_CHANGE',
      'medium',
      'Password changed',
      { userId }
    );
  }

  /**
   * Log email change
   */
  logEmailChange(userId, oldEmail, newEmail) {
    return this._logEvent(
      'EMAIL_CHANGE',
      'medium',
      'Email address changed',
      { userId, oldEmail, newEmail }
    );
  }

  /**
   * Log failed validation
   */
  logValidationFailure(field, value, reason) {
    return this._logEvent(
      'VALIDATION_FAILURE',
      'low',
      `Validation failed for ${field}`,
      { field, value: value?.substring(0, 50), reason }
    );
  }

  /**
   * Get events by type
   */
  getEventsByType(type) {
    const events = this._getEvents();
    return events.filter(e => e.type === type);
  }

  /**
   * Get events by severity
   */
  getEventsBySeverity(severity) {
    const events = this._getEvents();
    return events.filter(e => e.severity === severity);
  }

  /**
   * Get recent events (last N)
   */
  getRecentEvents(count = 10) {
    const events = this._getEvents();
    return events.slice(-count).reverse();
  }

  /**
   * Get events in time range
   */
  getEventsInRange(startDate, endDate) {
    const events = this._getEvents();
    return events.filter(e => {
      const timestamp = new Date(e.timestamp);
      return timestamp >= startDate && timestamp <= endDate;
    });
  }

  /**
   * Get events count by type
   */
  getEventStats() {
    const events = this._getEvents();
    const stats = {};

    events.forEach(event => {
      stats[event.type] = (stats[event.type] || 0) + 1;
    });

    return stats;
  }

  /**
   * Check for attack patterns
   * Returns true if suspicious pattern detected
   */
  detectAttackPattern() {
    const recentEvents = this.getRecentEvents(20);

    // Check for rapid failed logins (brute force)
    const recentFailedLogins = recentEvents.filter(
      e => e.type === 'FAILED_LOGIN' &&
      new Date(e.timestamp) > new Date(Date.now() - 300000) // Last 5 min
    );

    if (recentFailedLogins.length >= 5) {
      this._logEvent(
        'ATTACK_PATTERN_DETECTED',
        'critical',
        'Brute force attack pattern detected',
        { failedAttempts: recentFailedLogins.length }
      );
      return true;
    }

    // Check for XSS attempts
    const recentXSS = recentEvents.filter(e => e.type === 'XSS_ATTEMPT');
    if (recentXSS.length >= 3) {
      this._logEvent(
        'ATTACK_PATTERN_DETECTED',
        'critical',
        'Multiple XSS attempts detected',
        { attempts: recentXSS.length }
      );
      return true;
    }

    return false;
  }

  /**
   * Clear all security logs
   */
  clearLogs() {
    localStorage.removeItem(this.storageKey);
    console.log('Security logs cleared');
  }

  /**
   * Export logs as JSON
   */
  exportLogs() {
    const events = this._getEvents();
    const blob = new Blob([JSON.stringify(events, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `security-logs-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// Singleton instance
export const SecurityLogger = new SecurityEventLogger();

/**
 * Detect potentially malicious input
 */
export function detectMaliciousInput(input) {
  if (!input || typeof input !== 'string') return null;

  const patterns = {
    xss: /<script|javascript:|onerror=|onload=|<iframe/i,
    sql: /(\bUNION\b|\bSELECT\b.*\bFROM\b|\bDROP\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b)/i,
    path: /\.\.[\/\\]|~[\/\\]/,
    command: /[;&|`$()]/
  };

  for (const [type, pattern] of Object.entries(patterns)) {
    if (pattern.test(input)) {
      return type;
    }
  }

  return null;
}

/**
 * Monitor input fields for malicious content
 */
export function monitorInputSecurity(inputElement, fieldName) {
  if (!inputElement) return;

  inputElement.addEventListener('blur', function() {
    const value = this.value;
    const threat = detectMaliciousInput(value);

    if (threat) {
      SecurityLogger._logEvent(
        threat === 'xss' ? 'XSS_ATTEMPT' :
        threat === 'sql' ? 'SQL_INJECTION_ATTEMPT' :
        'SUSPICIOUS_ACTIVITY',
        'critical',
        `Malicious ${threat} pattern detected in ${fieldName}`,
        { field: fieldName, pattern: threat, value: value.substring(0, 100) }
      );

      // Optionally clear the field
      // this.value = '';
      // alert('Contenido sospechoso detectado y bloqueado');
    }
  });
}

export default SecurityLogger;
