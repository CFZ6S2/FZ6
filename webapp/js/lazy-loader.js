/**
 * Lazy Loading Utility for TuCitaSegura
 * Dynamically loads heavy modules only when needed
 * Improves initial page load performance
 */

import { createLogger } from './logger.js';

const logger = createLogger('lazy-loader');

// Cache for loaded modules
const moduleCache = new Map();

/**
 * Lazy load a JavaScript module
 * @param {string} modulePath - Path to the module
 * @param {string} moduleName - Name for logging/caching
 * @returns {Promise<any>} Loaded module
 */
export async function lazyLoadModule(modulePath, moduleName) {
  try {
    // Check cache first
    if (moduleCache.has(moduleName)) {
      logger.debug('Module loaded from cache', { moduleName });
      return moduleCache.get(moduleName);
    }

    logger.info('Lazy loading module', { moduleName, modulePath });
    const startTime = performance.now();

    // Dynamic import
    const module = await import(modulePath);

    const loadTime = performance.now() - startTime;
    logger.performance('Module loaded', loadTime, { moduleName });

    // Cache the module
    moduleCache.set(moduleName, module);

    return module;

  } catch (error) {
    logger.error('Error lazy loading module', error, { moduleName, modulePath });
    throw error;
  }
}

/**
 * Lazy load video chat module
 * Only loads when user initiates a video call
 * @returns {Promise<any>} Video chat module
 */
export async function lazyLoadVideoChat() {
  return lazyLoadModule('./video-chat.js', 'video-chat');
}

/**
 * Lazy load Stripe integration
 * Only loads on payment pages
 * @returns {Promise<any>} Stripe module
 */
export async function lazyLoadStripe() {
  return lazyLoadModule('./stripe-integration.js', 'stripe-integration');
}

/**
 * Lazy load PayPal integration
 * Only loads on payment pages
 * @returns {Promise<any>} PayPal module
 */
export async function lazyLoadPayPal() {
  return lazyLoadModule('./paypal-config.js', 'paypal-config');
}

/**
 * Lazy load badges system
 * Only loads when viewing profile or badges page
 * @returns {Promise<any>} Badges module
 */
export async function lazyLoadBadges() {
  return lazyLoadModule('./badges-system.js', 'badges-system');
}

/**
 * Preload module in background (low priority)
 * Uses requestIdleCallback if available
 * @param {Function} loader - Lazy loader function
 */
export function preloadModule(loader) {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      loader().catch(err => {
        logger.debug('Preload failed (non-critical)', { error: err.message });
      });
    });
  } else {
    // Fallback: load after a delay
    setTimeout(() => {
      loader().catch(err => {
        logger.debug('Preload failed (non-critical)', { error: err.message });
      });
    }, 2000);
  }
}

/**
 * Clear module cache (useful for development)
 */
export function clearModuleCache() {
  moduleCache.clear();
  logger.info('Module cache cleared');
}

/**
 * Get cache statistics
 * @returns {Object} Cache stats
 */
export function getCacheStats() {
  return {
    size: moduleCache.size,
    modules: Array.from(moduleCache.keys())
  };
}
