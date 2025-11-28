/**
 * Client-Side Rate Limiter
 *
 * Provides basic rate limiting for form submissions and API calls
 * to prevent abuse and improve UX by preventing double-submissions.
 *
 * Note: This is CLIENT-SIDE ONLY protection. Server-side rate limiting
 * is still required for real security.
 *
 * Usage:
 * ```javascript
 * import { RateLimiter } from './rate-limiter.js';
 *
 * const loginLimiter = new RateLimiter({
 *   maxAttempts: 5,
 *   windowMs: 60000,  // 1 minute
 *   keyPrefix: 'login'
 * });
 *
 * if (loginLimiter.tryRequest('user@example.com')) {
 *   // Proceed with login
 * } else {
 *   const retryAfter = loginLimiter.getRetryAfter('user@example.com');
 *   alert(`Too many attempts. Try again in ${retryAfter}s`);
 * }
 * ```
 */

export class RateLimiter {
  /**
   * @param {Object} options
   * @param {number} options.maxAttempts - Maximum requests allowed in window
   * @param {number} options.windowMs - Time window in milliseconds
   * @param {string} options.keyPrefix - Prefix for localStorage keys
   */
  constructor({ maxAttempts = 5, windowMs = 60000, keyPrefix = 'rate_limit' } = {}) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
    this.keyPrefix = keyPrefix;
  }

  /**
   * Get the storage key for a given identifier
   * @private
   */
  _getKey(identifier) {
    return `${this.keyPrefix}_${identifier}`;
  }

  /**
   * Get attempt history from localStorage
   * @private
   */
  _getAttempts(identifier) {
    const key = this._getKey(identifier);
    const data = localStorage.getItem(key);

    if (!data) return [];

    try {
      const attempts = JSON.parse(data);
      const now = Date.now();

      // Filter out expired attempts
      return attempts.filter(timestamp => now - timestamp < this.windowMs);
    } catch (e) {
      return [];
    }
  }

  /**
   * Save attempts to localStorage
   * @private
   */
  _saveAttempts(identifier, attempts) {
    const key = this._getKey(identifier);
    localStorage.setItem(key, JSON.stringify(attempts));
  }

  /**
   * Check if request is allowed and record it
   * @param {string} identifier - Unique identifier (email, IP, user ID, etc.)
   * @returns {boolean} - True if request is allowed
   */
  tryRequest(identifier) {
    const attempts = this._getAttempts(identifier);

    if (attempts.length >= this.maxAttempts) {
      return false;
    }

    // Record this attempt
    attempts.push(Date.now());
    this._saveAttempts(identifier, attempts);

    return true;
  }

  /**
   * Get remaining attempts
   * @param {string} identifier
   * @returns {number}
   */
  getRemainingAttempts(identifier) {
    const attempts = this._getAttempts(identifier);
    return Math.max(0, this.maxAttempts - attempts.length);
  }

  /**
   * Get seconds until rate limit resets
   * @param {string} identifier
   * @returns {number} Seconds until retry allowed
   */
  getRetryAfter(identifier) {
    const attempts = this._getAttempts(identifier);

    if (attempts.length === 0) return 0;

    const oldestAttempt = Math.min(...attempts);
    const resetTime = oldestAttempt + this.windowMs;
    const now = Date.now();

    return Math.ceil(Math.max(0, resetTime - now) / 1000);
  }

  /**
   * Check if rate limited without recording attempt
   * @param {string} identifier
   * @returns {boolean}
   */
  isRateLimited(identifier) {
    const attempts = this._getAttempts(identifier);
    return attempts.length >= this.maxAttempts;
  }

  /**
   * Reset rate limit for identifier
   * @param {string} identifier
   */
  reset(identifier) {
    const key = this._getKey(identifier);
    localStorage.removeItem(key);
  }

  /**
   * Clear all rate limit data
   */
  clearAll() {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.keyPrefix)) {
        keys.push(key);
      }
    }
    keys.forEach(key => localStorage.removeItem(key));
  }
}

/**
 * Pre-configured rate limiters for common use cases
 */
export const RateLimiters = {
  // Login: 5 attempts per minute
  login: new RateLimiter({
    maxAttempts: 5,
    windowMs: 60000,
    keyPrefix: 'login'
  }),

  // Register: 3 attempts per 5 minutes
  register: new RateLimiter({
    maxAttempts: 3,
    windowMs: 300000,
    keyPrefix: 'register'
  }),

  // Password reset: 3 attempts per 15 minutes
  passwordReset: new RateLimiter({
    maxAttempts: 3,
    windowMs: 900000,
    keyPrefix: 'password_reset'
  }),

  // Message sending: 10 messages per minute
  sendMessage: new RateLimiter({
    maxAttempts: 10,
    windowMs: 60000,
    keyPrefix: 'send_message'
  }),

  // Match requests: 20 per hour
  sendMatch: new RateLimiter({
    maxAttempts: 20,
    windowMs: 3600000,
    keyPrefix: 'send_match'
  }),

  // Search: 30 per minute
  search: new RateLimiter({
    maxAttempts: 30,
    windowMs: 60000,
    keyPrefix: 'search'
  })
};

/**
 * Utility function to show rate limit error
 * @param {string} action - Action that was rate limited
 * @param {number} retryAfter - Seconds until retry allowed
 */
export function showRateLimitError(action, retryAfter) {
  const minutes = Math.floor(retryAfter / 60);
  const seconds = retryAfter % 60;

  let timeStr = '';
  if (minutes > 0) {
    timeStr = `${minutes} minuto${minutes > 1 ? 's' : ''}`;
    if (seconds > 0) {
      timeStr += ` y ${seconds} segundo${seconds > 1 ? 's' : ''}`;
    }
  } else {
    timeStr = `${seconds} segundo${seconds > 1 ? 's' : ''}`;
  }

  const message = `Demasiados intentos de ${action}. Por favor, espera ${timeStr} antes de intentar nuevamente.`;

  // Try to use existing toast function if available
  if (typeof window.showToast === 'function') {
    window.showToast(message, 'warning');
  } else {
    alert(message);
  }
}

export default RateLimiter;
