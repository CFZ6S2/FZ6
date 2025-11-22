/**
 * Global Error Handler for TuCitaSegura
 *
 * Provides centralized error handling for:
 * - Uncaught JavaScript errors
 * - Unhandled promise rejections
 * - Firebase-specific errors
 * - Network errors
 *
 * Usage:
 *   import { setupGlobalErrorHandling } from './js/error-handler.js';
 *   setupGlobalErrorHandling();
 */

import { logger } from './logger.js';
import { showToast } from './utils.js';

// Track if error handling is already setup (prevent duplicate handlers)
let isSetup = false;

// Error count tracking (prevent error spam)
const errorTracker = {
  count: 0,
  lastError: null,
  lastErrorTime: 0,
  resetInterval: 60000 // Reset counter every minute
};

/**
 * Setup global error handling for the application
 * Should be called once at app initialization
 *
 * @example
 * // In your HTML file
 * import { setupGlobalErrorHandling } from './js/error-handler.js';
 * setupGlobalErrorHandling();
 */
export function setupGlobalErrorHandling() {
  if (isSetup) {
    logger.warn('Global error handling already setup');
    return;
  }

  logger.info('Setting up global error handling');

  // Handle uncaught JavaScript errors
  window.onerror = handleUncaughtError;

  // Handle unhandled promise rejections
  window.onunhandledrejection = handleUnhandledRejection;

  // Reset error counter periodically
  setInterval(() => {
    errorTracker.count = 0;
  }, errorTracker.resetInterval);

  isSetup = true;
  logger.info('Global error handling setup complete');
}

/**
 * Handle uncaught JavaScript errors
 *
 * @param {string} message - Error message
 * @param {string} source - Source file URL
 * @param {number} lineno - Line number
 * @param {number} colno - Column number
 * @param {Error} error - Error object
 * @returns {boolean} true to prevent default error handling
 */
function handleUncaughtError(message, source, lineno, colno, error) {
  // Log error details
  logger.error('Uncaught error:', {
    message,
    source,
    lineno,
    colno,
    error,
    stack: error?.stack
  });

  // Check if this is a duplicate error (prevent spam)
  if (isDuplicateError(message)) {
    logger.debug('Duplicate error suppressed');
    return true;
  }

  // Determine error category
  const category = categorizeError(message, error);

  // Handle based on category
  switch (category) {
    case 'firebase':
      handleFirebaseError(error);
      break;

    case 'network':
      handleNetworkError(error);
      break;

    case 'script':
      handleScriptError(message, source);
      break;

    default:
      handleGenericError(message);
  }

  // Prevent default browser error handling
  return true;
}

/**
 * Handle unhandled promise rejections
 *
 * @param {PromiseRejectionEvent} event - Rejection event
 */
function handleUnhandledRejection(event) {
  const reason = event.reason;

  logger.error('Unhandled promise rejection:', {
    reason,
    promise: event.promise,
    stack: reason?.stack
  });

  // Check for duplicate
  if (isDuplicateError(reason?.message || String(reason))) {
    logger.debug('Duplicate rejection suppressed');
    event.preventDefault();
    return;
  }

  // Categorize and handle
  const category = categorizeError(reason?.message, reason);

  switch (category) {
    case 'firebase':
      handleFirebaseError(reason);
      break;

    case 'network':
      handleNetworkError(reason);
      break;

    default:
      handleGenericRejection(reason);
  }

  // Prevent unhandled rejection warning in console
  event.preventDefault();
}

/**
 * Categorize error by type
 *
 * @param {string} message - Error message
 * @param {Error} error - Error object
 * @returns {string} Error category
 */
function categorizeError(message, error) {
  if (!message && !error) return 'unknown';

  const msg = (message || error?.message || '').toLowerCase();

  // Firebase errors
  if (
    msg.includes('firebase') ||
    msg.includes('firestore') ||
    msg.includes('auth/') ||
    error?.code?.startsWith('auth/') ||
    error?.code?.startsWith('firestore/')
  ) {
    return 'firebase';
  }

  // Network errors
  if (
    msg.includes('network') ||
    msg.includes('fetch') ||
    msg.includes('timeout') ||
    msg.includes('cors') ||
    error?.name === 'NetworkError'
  ) {
    return 'network';
  }

  // Script loading errors
  if (msg.includes('script') || msg.includes('loading chunk')) {
    return 'script';
  }

  return 'generic';
}

/**
 * Handle Firebase-specific errors
 *
 * @param {Error} error - Firebase error
 */
function handleFirebaseError(error) {
  const code = error?.code || '';
  const message = error?.message || '';

  logger.error('Firebase error:', { code, message });

  // User-friendly messages for common Firebase errors
  const userMessages = {
    'auth/network-request-failed': 'Error de conexión. Por favor, verifica tu internet.',
    'auth/too-many-requests': 'Demasiados intentos. Por favor, espera un momento.',
    'auth/user-not-found': 'Usuario no encontrado.',
    'auth/wrong-password': 'Contraseña incorrecta.',
    'auth/email-already-in-use': 'Este correo ya está registrado.',
    'auth/weak-password': 'La contraseña es muy débil.',
    'auth/invalid-email': 'Correo electrónico inválido.',
    'permission-denied': 'No tienes permisos para esta acción.',
    'unavailable': 'Servicio temporalmente no disponible. Intenta de nuevo.'
  };

  const userMessage = userMessages[code] || 'Error en la operación. Por favor, intenta de nuevo.';

  showToast(userMessage, 'error');
}

/**
 * Handle network errors
 *
 * @param {Error} error - Network error
 */
function handleNetworkError(error) {
  logger.error('Network error:', error);

  if (!navigator.onLine) {
    showToast('Sin conexión a internet. Verifica tu conexión.', 'error');
  } else {
    showToast('Error de red. Por favor, recarga la página.', 'error');
  }
}

/**
 * Handle script loading errors
 *
 * @param {string} message - Error message
 * @param {string} source - Script source
 */
function handleScriptError(message, source) {
  logger.error('Script error:', { message, source });

  showToast('Error cargando recursos. Por favor, recarga la página.', 'error');

  // Suggest page reload after 3 seconds
  setTimeout(() => {
    if (confirm('¿Deseas recargar la página para solucionar el problema?')) {
      window.location.reload();
    }
  }, 3000);
}

/**
 * Handle generic errors
 *
 * @param {string} message - Error message
 */
function handleGenericError(message) {
  logger.error('Generic error:', message);

  // Don't show toast for every generic error (can be noisy)
  // Only if error count is low
  if (errorTracker.count < 3) {
    showToast('Ha ocurrido un error. Si persiste, recarga la página.', 'warning');
  }
}

/**
 * Handle generic promise rejections
 *
 * @param {any} reason - Rejection reason
 */
function handleGenericRejection(reason) {
  logger.error('Generic rejection:', reason);

  // Only show toast if not too many errors
  if (errorTracker.count < 3) {
    showToast('Error procesando solicitud. Intenta de nuevo.', 'error');
  }
}

/**
 * Check if error is a duplicate (prevent spam)
 *
 * @param {string} errorMessage - Error message
 * @returns {boolean} true if duplicate
 */
function isDuplicateError(errorMessage) {
  const now = Date.now();
  const timeSinceLastError = now - errorTracker.lastErrorTime;

  // Consider duplicate if same message within 5 seconds
  if (
    errorTracker.lastError === errorMessage &&
    timeSinceLastError < 5000
  ) {
    errorTracker.count++;
    return true;
  }

  // Update tracker
  errorTracker.lastError = errorMessage;
  errorTracker.lastErrorTime = now;
  errorTracker.count++;

  return false;
}

/**
 * Manually report an error (for use in try/catch blocks)
 *
 * @param {Error} error - Error to report
 * @param {Object} context - Additional context
 *
 * @example
 * try {
 *   await someOperation();
 * } catch (error) {
 *   reportError(error, { operation: 'someOperation', userId: user.uid });
 *   showToast('Error en la operación', 'error');
 * }
 */
export function reportError(error, context = {}) {
  logger.error('Reported error:', {
    error,
    context,
    message: error?.message,
    stack: error?.stack
  });

  // Categorize and potentially send to error tracking service
  const category = categorizeError(error?.message, error);

  // TODO: Send to error tracking service (Sentry, LogRocket, etc.)
  // if (window.Sentry) {
  //   window.Sentry.captureException(error, { extra: context });
  // }
}

/**
 * Check if error handling is setup
 *
 * @returns {boolean} true if setup
 */
export function isErrorHandlingSetup() {
  return isSetup;
}

/**
 * Remove global error handlers (for cleanup/testing)
 * Use with caution - generally not needed in production
 */
export function teardownGlobalErrorHandling() {
  if (!isSetup) {
    logger.warn('Error handling not setup, nothing to teardown');
    return;
  }

  window.onerror = null;
  window.onunhandledrejection = null;
  isSetup = false;

  logger.info('Global error handling torn down');
}

// Export error tracker for debugging (development only)
if (typeof window !== 'undefined') {
  window.__errorTracker = errorTracker;
}
