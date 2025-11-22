// logger.js - Conditional logging system for production
// Only logs in development mode, silent in production

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
 * Logger object with conditional methods
 */
export const logger = {
  /**
   * Log debug information (only in development)
   * @param {...any} args - Arguments to log
   */
  debug(...args) {
    if (isDevelopment()) {
      console.log('[DEBUG]', ...args);
    }
  },

  /**
   * Log informational messages (only in development)
   * @param {...any} args - Arguments to log
   */
  info(...args) {
    if (isDevelopment()) {
      console.info('[INFO]', ...args);
    }
  },

  /**
   * Log warnings (always shown)
   * @param {...any} args - Arguments to log
   */
  warn(...args) {
    console.warn('[WARN]', ...args);
  },

  /**
   * Log errors (always shown)
   * @param {...any} args - Arguments to log
   */
  error(...args) {
    console.error('[ERROR]', ...args);
  },

  /**
   * Log success messages (only in development)
   * @param {...any} args - Arguments to log
   */
  success(...args) {
    if (isDevelopment()) {
      console.log('%c[SUCCESS]', 'color: green; font-weight: bold', ...args);
    }
  },

  /**
   * Log with custom styling (only in development)
   * @param {string} style - CSS style string
   * @param {...any} args - Arguments to log
   */
  styled(style, ...args) {
    if (isDevelopment()) {
      console.log(`%c${args[0]}`, style, ...args.slice(1));
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
   * Log table data (only in development)
   * @param {any} data - Data to display as table
   */
  table(data) {
    if (isDevelopment()) {
      console.table(data);
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
  }
};

// Default export
export default logger;
