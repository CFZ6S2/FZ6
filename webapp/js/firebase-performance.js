// Firebase Performance Monitoring Configuration
// Importar ANTES de otros módulos de Firebase en archivos HTML

import { getPerformance, trace } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-performance.js";
import app from './firebase-config-env.js';
import { logger } from './logger.js';

// ============================================================================
// INICIALIZAR FIREBASE PERFORMANCE MONITORING
// ============================================================================

let perf = null;

try {
  perf = getPerformance(app);
  logger.info('✅ Firebase Performance Monitoring initialized');
} catch (error) {
  logger.error('❌ Error initializing Performance Monitoring:', error);
}

// ============================================================================
// HELPERS PARA TRAZAS PERSONALIZADAS
// ============================================================================

/**
 * Crear y iniciar una traza personalizada
 * @param {string} name - Nombre de la traza
 * @returns {Trace|null} Objeto de traza o null si Performance no está disponible
 */
export function startTrace(name) {
  if (!perf) {
    logger.warn('Performance Monitoring not available');
    return null;
  }

  try {
    const customTrace = trace(perf, name);
    customTrace.start();
    logger.debug(`Performance trace started: ${name}`);
    return customTrace;
  } catch (error) {
    logger.error(`Error starting trace ${name}:`, error);
    return null;
  }
}

/**
 * Detener una traza personalizada
 * @param {Trace|null} trace - Objeto de traza
 */
export function stopTrace(trace) {
  if (!trace) return;

  try {
    trace.stop();
    logger.debug('Performance trace stopped');
  } catch (error) {
    logger.error('Error stopping trace:', error);
  }
}

/**
 * Agregar atributo a una traza
 * @param {Trace|null} trace - Objeto de traza
 * @param {string} name - Nombre del atributo
 * @param {string} value - Valor del atributo
 */
export function putTraceAttribute(trace, name, value) {
  if (!trace) return;

  try {
    trace.putAttribute(name, String(value));
  } catch (error) {
    logger.error(`Error adding attribute ${name} to trace:`, error);
  }
}

/**
 * Incrementar métrica de una traza
 * @param {Trace|null} trace - Objeto de traza
 * @param {string} name - Nombre de la métrica
 * @param {number} value - Valor a incrementar (default: 1)
 */
export function incrementTraceMetric(trace, name, value = 1) {
  if (!trace) return;

  try {
    trace.incrementMetric(name, value);
  } catch (error) {
    logger.error(`Error incrementing metric ${name}:`, error);
  }
}

/**
 * Helper para medir operaciones automáticamente
 * @param {string} name - Nombre de la operación
 * @param {Function} fn - Función a ejecutar
 * @param {Object} attributes - Atributos adicionales para la traza
 * @returns {Promise<any>} Resultado de la función
 */
export async function measureOperation(name, fn, attributes = {}) {
  const trace = startTrace(name);

  // Agregar atributos
  Object.entries(attributes).forEach(([key, value]) => {
    putTraceAttribute(trace, key, value);
  });

  const startTime = Date.now();

  try {
    const result = await fn();
    const duration = Date.now() - startTime;

    // Agregar métricas de éxito
    putTraceAttribute(trace, 'status', 'success');
    incrementTraceMetric(trace, 'success_count', 1);

    logger.debug(`Operation ${name} completed in ${duration}ms`);
    stopTrace(trace);

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;

    // Agregar métricas de error
    putTraceAttribute(trace, 'status', 'error');
    putTraceAttribute(trace, 'error_type', error.name || 'Unknown');
    incrementTraceMetric(trace, 'error_count', 1);

    logger.error(`Operation ${name} failed after ${duration}ms:`, error);
    stopTrace(trace);

    throw error;
  }
}

// ============================================================================
// TRAZAS AUTOMÁTICAS PARA OPERACIONES COMUNES
// ============================================================================

/**
 * Medir tiempo de carga de página
 */
export function measurePageLoad(pageName) {
  return startTrace(`page_load_${pageName}`);
}

/**
 * Medir llamada a API
 * @param {string} endpoint - Endpoint de la API
 * @param {string} method - Método HTTP
 */
export function measureAPICall(endpoint, method = 'GET') {
  const trace = startTrace('api_call');
  putTraceAttribute(trace, 'endpoint', endpoint);
  putTraceAttribute(trace, 'method', method);
  return trace;
}

/**
 * Medir operación de Firestore
 * @param {string} operation - Tipo de operación (get, set, update, delete, query)
 * @param {string} collection - Nombre de la colección
 */
export function measureFirestoreOperation(operation, collection) {
  const trace = startTrace(`firestore_${operation}`);
  putTraceAttribute(trace, 'collection', collection);
  putTraceAttribute(trace, 'operation', operation);
  return trace;
}

/**
 * Medir autenticación
 * @param {string} method - Método de autenticación (email, google, phone, etc.)
 */
export function measureAuth(method) {
  const trace = startTrace('auth_operation');
  putTraceAttribute(trace, 'method', method);
  return trace;
}

/**
 * Medir carga de imagen
 * @param {string} imageUrl - URL de la imagen
 */
export function measureImageLoad(imageUrl) {
  const trace = startTrace('image_load');
  putTraceAttribute(trace, 'url', imageUrl);
  return trace;
}

// ============================================================================
// MONITOREO AUTOMÁTICO DE RECURSOS
// ============================================================================

/**
 * Monitorear First Contentful Paint (FCP)
 */
function monitorFCP() {
  if (!window.PerformanceObserver) return;

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          logger.info('First Contentful Paint:', {
            value: entry.startTime,
            unit: 'ms'
          });
        }
      }
    });

    observer.observe({ entryTypes: ['paint'] });
  } catch (error) {
    logger.error('Error monitoring FCP:', error);
  }
}

/**
 * Monitorear Largest Contentful Paint (LCP)
 */
function monitorLCP() {
  if (!window.PerformanceObserver) return;

  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];

      logger.info('Largest Contentful Paint:', {
        value: lastEntry.startTime,
        unit: 'ms',
        element: lastEntry.element?.tagName
      });
    });

    observer.observe({ entryTypes: ['largest-contentful-paint'] });
  } catch (error) {
    logger.error('Error monitoring LCP:', error);
  }
}

/**
 * Monitorear First Input Delay (FID)
 */
function monitorFID() {
  if (!window.PerformanceObserver) return;

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const delay = entry.processingStart - entry.startTime;
        logger.info('First Input Delay:', {
          value: delay,
          unit: 'ms',
          eventType: entry.name
        });
      }
    });

    observer.observe({ entryTypes: ['first-input'] });
  } catch (error) {
    logger.error('Error monitoring FID:', error);
  }
}

/**
 * Monitorear Cumulative Layout Shift (CLS)
 */
function monitorCLS() {
  if (!window.PerformanceObserver) return;

  let clsScore = 0;

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          clsScore += entry.value;
        }
      }

      logger.info('Cumulative Layout Shift:', {
        value: clsScore,
        unit: 'score'
      });
    });

    observer.observe({ entryTypes: ['layout-shift'] });
  } catch (error) {
    logger.error('Error monitoring CLS:', error);
  }
}

// ============================================================================
// INICIALIZACIÓN AUTOMÁTICA
// ============================================================================

// Monitorear Core Web Vitals automáticamente
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    monitorFCP();
    monitorLCP();
    monitorFID();
    monitorCLS();
  });
}

// Exportar instancia de Performance
export { perf };
export default perf;
