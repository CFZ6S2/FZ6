// functions/middleware/app-check.js
// Middleware para verificar Firebase App Check en Cloud Functions

const { createLogger } = require('../utils/structured-logger');
const logger = createLogger('app-check-middleware');

/**
 * Middleware para verificar App Check token en callable functions
 * @param {boolean} required - Si es true, rechaza requests sin App Check
 *
 * DESHABILITADO TEMPORALMENTE (24h) - Solución de throttle
 */
function requireAppCheck(required = true) {
  return (context) => {
    // DESHABILITADO TEMPORALMENTE (24h)
    logger.info('🚨 App Check DESHABILITADO TEMPORALMENTE (24h) - Solución de throttle');
    return; // Permitir todas las requests sin validación

    /* CÓDIGO ORIGINAL COMENTADO - REACTIVAR DESPUÉS DE 24H
    // App Check data está disponible en context.app
    // https://firebase.google.com/docs/app-check/cloud-functions

    if (!context.app) {
      logger.security('app_check_missing', {
        userId: context.auth?.uid,
        required,
        ip: context.rawRequest?.ip
      });

      if (required) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'App Check verification failed. Please update your app.'
        );
      }

      // Si no es requerido, solo logear advertencia
      logger.warn('Request without App Check allowed (not enforced)', {
        userId: context.auth?.uid
      });
    } else {
      logger.debug('App Check verified', {
        userId: context.auth?.uid,
        appId: context.app.appId,
        alreadyConsumed: context.app.alreadyConsumed
      });
    }
    */
  };
}

/**
 * Middleware para verificar App Check en HTTP functions
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 * @param {boolean} required - Si es true, rechaza requests sin App Check
 *
 * DESHABILITADO TEMPORALMENTE (24h) - Solución de throttle
 */
function verifyAppCheckHTTP(required = true) {
  return async (req, res, next) => {
    // DESHABILITADO TEMPORALMENTE (24h)
    logger.info('🚨 App Check DESHABILITADO TEMPORALMENTE (24h) - Solución de throttle');
    return next(); // Permitir todas las requests sin validación

    /* CÓDIGO ORIGINAL COMENTADO - REACTIVAR DESPUÉS DE 24H
    // Obtener App Check token del header
    const appCheckToken = req.header('X-Firebase-AppCheck');

    if (!appCheckToken) {
      logger.security('app_check_missing_http', {
        path: req.path,
        method: req.method,
        ip: req.ip,
        required
      });

      if (required) {
        return res.status(401).json({
          error: 'unauthorized',
          message: 'App Check token missing'
        });
      }

      // Si no es requerido, continuar con advertencia
      logger.warn('HTTP request without App Check allowed (not enforced)', {
        path: req.path
      });
      return next();
    }

    try {
      // Verificar el token con Admin SDK
      const admin = require('firebase-admin');
      const appCheckClaims = await admin.appCheck().verifyToken(appCheckToken);

      logger.debug('App Check verified (HTTP)', {
        appId: appCheckClaims.app_id,
        path: req.path
      });

      // Agregar claims al request para uso posterior
      req.appCheckClaims = appCheckClaims;
      next();
    } catch (error) {
      logger.security('app_check_verification_failed', {
        path: req.path,
        error: error.message,
        ip: req.ip
      });

      if (required) {
        return res.status(401).json({
          error: 'unauthorized',
          message: 'Invalid App Check token'
        });
      }

      // Si no es requerido, continuar con advertencia
      logger.warn('Invalid App Check token but continuing (not enforced)', {
        path: req.path,
        error: error.message
      });
      next();
    }
    */
  };
}

module.exports = {
  requireAppCheck,
  verifyAppCheckHTTP
};
