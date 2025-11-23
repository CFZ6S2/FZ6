/**
 * XSS Sanitization Module using DOMPurify
 * Provides safe methods to handle user-generated content and prevent XSS attacks
 *
 * Usage:
 *   import { sanitizer } from './sanitizer.js';
 *   element.innerHTML = sanitizer.html(userInput);
 *   element.textContent = sanitizer.text(userInput);
 */

import { logger } from './logger.js';

/**
 * Check if DOMPurify is loaded
 * @returns {boolean}
 */
function isDOMPurifyLoaded() {
  return typeof window.DOMPurify !== 'undefined';
}

/**
 * Sanitizer object with various sanitization methods
 */
export const sanitizer = {
  /**
   * Sanitize HTML content using DOMPurify
   * Falls back to textContent if DOMPurify is not loaded
   * @param {string} dirty - Untrusted HTML string
   * @param {Object} config - DOMPurify configuration options
   * @returns {string} - Sanitized HTML
   */
  html(dirty, config = {}) {
    if (!dirty) return '';

    if (isDOMPurifyLoaded()) {
      try {
        const defaultConfig = {
          ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'span'],
          ALLOWED_ATTR: ['href', 'title', 'class'],
          ALLOW_DATA_ATTR: false,
          SAFE_FOR_TEMPLATES: true,
          ...config
        };

        const clean = window.DOMPurify.sanitize(dirty, defaultConfig);
        logger.debug('[Sanitizer] HTML sanitizado:', dirty.length, 'chars');
        return clean;
      } catch (error) {
        logger.error('[Sanitizer] Error sanitizando HTML:', error);
        // Fallback to plain text
        return this.text(dirty);
      }
    } else {
      logger.warn('[Sanitizer] DOMPurify no está cargado, usando textContent como fallback');
      return this.text(dirty);
    }
  },

  /**
   * Sanitize to plain text only (no HTML)
   * Safest option - strips all HTML tags
   * @param {string} dirty - Untrusted string
   * @returns {string} - Plain text only
   */
  text(dirty) {
    if (!dirty) return '';

    // Create a temporary div to decode HTML entities and strip tags
    const temp = document.createElement('div');
    temp.textContent = dirty;
    const result = temp.textContent || temp.innerText || '';

    logger.debug('[Sanitizer] Texto sanitizado (sin HTML):', dirty.length, 'chars');
    return result;
  },

  /**
   * Sanitize URL to prevent javascript: and data: protocols
   * @param {string} url - Untrusted URL
   * @returns {string|null} - Safe URL or null if invalid
   */
  url(url) {
    if (!url) return null;

    try {
      const urlObj = new URL(url, window.location.origin);

      // Only allow http, https, and mailto
      const allowedProtocols = ['http:', 'https:', 'mailto:'];
      if (!allowedProtocols.includes(urlObj.protocol)) {
        logger.warn('[Sanitizer] Protocolo no permitido:', urlObj.protocol);
        return null;
      }

      logger.debug('[Sanitizer] URL sanitizada:', url);
      return urlObj.href;
    } catch (error) {
      logger.warn('[Sanitizer] URL inválida:', url, error);
      return null;
    }
  },

  /**
   * Sanitize for use in HTML attributes
   * @param {string} dirty - Untrusted attribute value
   * @returns {string} - Safe attribute value
   */
  attribute(dirty) {
    if (!dirty) return '';

    // Remove quotes, angle brackets, and other dangerous characters
    const safe = String(dirty)
      .replace(/[<>"'`]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');

    logger.debug('[Sanitizer] Atributo sanitizado:', dirty.length, 'chars');
    return safe;
  },

  /**
   * Sanitize for use in JavaScript context (very strict)
   * @param {string} dirty - Untrusted string
   * @returns {string} - Safe string for JS context
   */
  javascript(dirty) {
    if (!dirty) return '';

    // Only allow alphanumeric and basic punctuation
    const safe = String(dirty)
      .replace(/[^\w\s\-.,!?]/g, '')
      .substring(0, 1000); // Limit length

    logger.debug('[Sanitizer] String sanitizado para JS:', dirty.length, 'chars');
    return safe;
  },

  /**
   * Check if a string contains potential XSS
   * @param {string} str - String to check
   * @returns {boolean} - True if potentially malicious
   */
  isPotentiallyMalicious(str) {
    if (!str) return false;

    const dangerousPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe/gi,
      /eval\(/gi,
      /expression\(/gi,
      /<embed/gi,
      /<object/gi
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(str)) {
        logger.warn('[Sanitizer] Patrón peligroso detectado:', pattern);
        return true;
      }
    }

    return false;
  },

  /**
   * Safe innerHTML setter
   * Use this instead of element.innerHTML
   * @param {HTMLElement} element - Target element
   * @param {string} html - HTML content to set
   * @param {Object} config - DOMPurify config
   */
  setHTML(element, html, config = {}) {
    if (!element) {
      logger.error('[Sanitizer] Element es null');
      return;
    }

    const clean = this.html(html, config);
    element.innerHTML = clean;

    logger.debug('[Sanitizer] HTML establecido en', element.tagName);
  },

  /**
   * Safe textContent setter
   * Use this for plain text (recommended)
   * @param {HTMLElement} element - Target element
   * @param {string} text - Text content to set
   */
  setText(element, text) {
    if (!element) {
      logger.error('[Sanitizer] Element es null');
      return;
    }

    element.textContent = this.text(text);

    logger.debug('[Sanitizer] Texto establecido en', element.tagName);
  }
};

/**
 * Initialize sanitizer
 * Checks if DOMPurify is loaded and warns if not
 */
export function initSanitizer() {
  if (!isDOMPurifyLoaded()) {
    logger.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.warn('⚠️  DOMPurify no está cargado');
    logger.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.warn('');
    logger.warn('El sanitizador usará textContent como fallback.');
    logger.warn('Para máxima protección, carga DOMPurify:');
    logger.warn('');
    logger.warn('<script src="https://cdn.jsdelivr.net/npm/dompurify@3.0.8/dist/purify.min.js"></script>');
    logger.warn('');
    logger.warn('Agrega esto antes de tus scripts en el HTML.');
    logger.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  } else {
    logger.success('✅ Sanitizador inicializado con DOMPurify');
    logger.info(`📦 DOMPurify version: ${window.DOMPurify.version || 'unknown'}`);
  }
}

// Auto-initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSanitizer);
} else {
  initSanitizer();
}

export default sanitizer;
