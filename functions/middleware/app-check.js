// functions/middleware/app-check.js
// Middleware para verificar Firebase App Check en Cloud Functions

const { createLogger } = require('../utils/structured-logger');
const logger = createLogger('app-check-middleware');

// Lazy require to avoid heavyweight import at module load
function getFunctions() {
  return require('firebase-functions/v1');
}

/**
 * Extraer información de versión del cliente desde headers
 * @param {Object} request - Express/Functions request object
 * @returns {Object} Información del cliente
 */
function extractClientInfo(request) {
  const headers = request?.headers || {};
  const userAgent = headers['user-agent'] || headers['User-Agent'] || '';
  
  // Intentar extraer versión desde headers personalizados
  let clientVersion = headers['x-client-version'] || headers['X-Client-Version'] || 
                      headers['x-app-version'] || headers['X-App-Version'] || null;
  
  // Si no hay header personalizado, intentar extraer de User-Agent
  if (!clientVersion && userAgent) {
    // Buscar versión de Firebase SDK en User-Agent
    // Formato típico: "firebase-js/10.12.2"
    const firebaseMatch = userAgent.match(/firebase-js\/([\d.]+)/i);
    if (firebaseMatch) {
      clientVersion = `firebase-js/${firebaseMatch[1]}`;
    }
  }
  
  return {
    clientVersion: clientVersion || 'unknown',
    userAgent: userAgent.substring(0, 200), // Limitar longitud
    ip: request?.ip || request?.connection?.remoteAddress || 'unknown'
  };
}

/**
 * Detectar si la solicitud parece venir de una versión antigua del SDK
 * @param {string} userAgent - User-Agent header
 * @param {string} clientVersion - Versión del cliente
 * @returns {boolean} True si parece ser legacy
 */
function detectLegacySDK(userAgent, clientVersion) {
  if (!userAgent && !clientVersion) {
    // Sin información de versión, asumir legacy
    return true;
  }
  
  if (clientVersion && clientVersion !== 'unknown') {
    // Si la versión del cliente es muy antigua, marcar como legacy
    // Versiones anteriores a 1.0.0 o sin formato de versión
    if (clientVersion.startsWith('0.') || !clientVersion.includes('/')) {
      return true;
    }
    
    // Detectar versiones antiguas de Firebase SDK (v8 y anteriores)
    if (clientVersion.startsWith('firebase-js/')) {
      const versionMatch = clientVersion.match(/firebase-js\/(\d+)/);
      if (versionMatch && parseInt(versionMatch[1]) < 9) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Middleware para verificar App Check token en callable functions
 * @param {boolean} required - Si es true, rechaza requests sin App Check
 */
function requireAppCheck(required = true) {
  return (context) => {
    // App Check data está disponible en context.app
    // https://firebase.google.com/docs/app-check/cloud-functions

    const clientInfo = extractClientInfo(context.rawRequest);
    const isLegacy = detectLegacySDK(clientInfo.userAgent, clientInfo.clientVersion);
    
    if (!context.app) {
      logger.security('app_check_missing', {
        userId: context.auth?.uid,
        required,
        ip: clientInfo.ip,
        clientVersion: clientInfo.clientVersion,
        userAgent: clientInfo.userAgent,
        isLegacySDK: isLegacy,
        path: context.rawRequest?.path || 'callable',
        method: 'CALLABLE',
        timestamp: new Date().toISOString()
      });

      if (required) {
        throw new getFunctions().https.HttpsError(
          'failed-precondition',
          'App Check verification failed. Please update your app.'
        );
      }

      // Si no es requerido, solo logear advertencia con contexto completo
      logger.warn('Request without App Check allowed (not enforced)', {
        userId: context.auth?.uid,
        clientVersion: clientInfo.clientVersion,
        isLegacySDK: isLegacy,
        ip: clientInfo.ip
      });
    } else {
      logger.debug('App Check verified', {
        userId: context.auth?.uid,
        appId: context.app.appId,
        alreadyConsumed: context.app.alreadyConsumed,
        clientVersion: clientInfo.clientVersion,
        ip: clientInfo.ip
      });
    }
    
  };
}

/**
 * Middleware para verificar App Check en HTTP functions
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 * @param {boolean} required - Si es true, rechaza requests sin App Check
 */
function verifyAppCheckHTTP(required = true) {
  return async (req, res, next) => {
    // Extraer información del cliente
    const clientInfo = extractClientInfo(req);
    const isLegacy = detectLegacySDK(clientInfo.userAgent, clientInfo.clientVersion);
    
    // Obtener información de autenticación si está disponible
    const authHeader = req.header('Authorization') || req.header('authorization') || '';
    const hasAuth = authHeader.startsWith('Bearer ');
    
    // Obtener App Check token del header
    const appCheckToken = req.header('X-Firebase-AppCheck');

    if (!appCheckToken) {
      // Logging estructurado con contexto completo
      logger.security('app_check_missing_http', {
        event: 'app_check_missing',
        type: isLegacy ? 'legacy_request' : 'missing_token',
        path: req.path,
        method: req.method,
        ip: clientInfo.ip,
        clientVersion: clientInfo.clientVersion,
        userAgent: clientInfo.userAgent,
        hasAuth: hasAuth,
        isLegacySDK: isLegacy,
        required,
        timestamp: new Date().toISOString()
      });

      if (required) {
        return res.status(401).json({
          error: 'unauthorized',
          message: 'App Check token missing'
        });
      }

      // Si no es requerido, continuar con advertencia con contexto completo
      logger.warn('HTTP request without App Check allowed (not enforced)', {
        path: req.path,
        clientVersion: clientInfo.clientVersion,
        isLegacySDK: isLegacy,
        ip: clientInfo.ip
      });
      return next();
    }

    try {
      // Verificar el token con Admin SDK
      const admin = require('firebase-admin');
      const appCheckClaims = await admin.appCheck().verifyToken(appCheckToken);

      // Logging estructurado para solicitudes exitosas
      logger.debug('App Check verified (HTTP)', {
        event: 'app_check_verified',
        appId: appCheckClaims.app_id,
        path: req.path,
        method: req.method,
        clientVersion: clientInfo.clientVersion,
        ip: clientInfo.ip,
        hasAuth: hasAuth,
        timestamp: new Date().toISOString()
      });

      // Agregar claims al request para uso posterior
      req.appCheckClaims = appCheckClaims;
      next();
    } catch (error) {
      // Logging estructurado para tokens inválidos
      logger.security('app_check_verification_failed', {
        event: 'app_check_invalid',
        path: req.path,
        method: req.method,
        error: error.message,
        errorType: error.constructor?.name || 'Unknown',
        ip: clientInfo.ip,
        clientVersion: clientInfo.clientVersion,
        userAgent: clientInfo.userAgent,
        hasAuth: hasAuth,
        isLegacySDK: isLegacy,
        timestamp: new Date().toISOString()
      });

      if (required) {
        return res.status(401).json({
          error: 'unauthorized',
          message: 'Invalid App Check token'
        });
      }

      // Si no es requerido, continuar con advertencia con contexto completo
      logger.warn('Invalid App Check token but continuing (not enforced)', {
        path: req.path,
        error: error.message,
        clientVersion: clientInfo.clientVersion,
        isLegacySDK: isLegacy,
        ip: clientInfo.ip
      });
      next();
    }
    
  };
}

module.exports = {
  requireAppCheck,
  verifyAppCheckHTTP
};
