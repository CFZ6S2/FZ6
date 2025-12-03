// functions/health-check.js
// Health check endpoints para monitoreo

const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const { createLogger } = require('./utils/structured-logger');

const logger = createLogger('health-check');

/**
 * Health check básico - verifica que la función está respondiendo
 */
exports.health = functions.https.onRequest(async (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'cloud-functions',
    version: process.env.K_REVISION || 'unknown'
  });
});

/**
 * Health check completo - verifica todos los servicios
 */
exports.healthDetailed = functions.https.onRequest(async (req, res) => {
  const startTime = Date.now();
  const checks = {
    firestore: false,
    auth: false,
    storage: false,
    timestamp: new Date().toISOString()
  };

  let overallStatus = 'healthy';
  const errors = [];

  // 1. Verificar Firestore
  try {
    const db = admin.firestore();
    const testDoc = await db.collection('_health_check').doc('test').get();
    checks.firestore = true;
    logger.debug('Firestore health check passed');
  } catch (error) {
    checks.firestore = false;
    overallStatus = 'unhealthy';
    errors.push({
      service: 'firestore',
      error: error.message
    });
    logger.error('Firestore health check failed', error);
  }

  // 2. Verificar Auth
  try {
    // Intentar listar un usuario (solo para verificar conectividad)
    await admin.auth().listUsers(1);
    checks.auth = true;
    logger.debug('Auth health check passed');
  } catch (error) {
    checks.auth = false;
    overallStatus = 'unhealthy';
    errors.push({
      service: 'auth',
      error: error.message
    });
    logger.error('Auth health check failed', error);
  }

  // 3. Verificar Storage
  try {
    const bucket = admin.storage().bucket();
    await bucket.getMetadata();
    checks.storage = true;
    logger.debug('Storage health check passed');
  } catch (error) {
    checks.storage = false;
    overallStatus = 'unhealthy';
    errors.push({
      service: 'storage',
      error: error.message
    });
    logger.error('Storage health check failed', error);
  }

  const duration = Date.now() - startTime;

  const response = {
    status: overallStatus,
    timestamp: checks.timestamp,
    checks,
    durationMs: duration,
    service: 'cloud-functions',
    version: process.env.K_REVISION || 'unknown'
  };

  if (errors.length > 0) {
    response.errors = errors;
  }

  const statusCode = overallStatus === 'healthy' ? 200 : 503;
  res.status(statusCode).json(response);

  logger.info('Health check completed', {
    status: overallStatus,
    durationMs: duration,
    checks
  });
});

/**
 * Readiness check - verifica que el servicio está listo para recibir tráfico
 */
exports.ready = functions.https.onRequest(async (req, res) => {
  // Verificar que servicios críticos están disponibles
  try {
    const db = admin.firestore();
    await db.collection('_health_check').doc('test').get();

    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Readiness check failed', error);
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

/**
 * Liveness check - verifica que el servicio está vivo
 */
exports.alive = functions.https.onRequest((req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString()
  });
});
