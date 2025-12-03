// functions/recaptcha-enterprise.js
// Verificación de tokens de reCAPTCHA Enterprise

const functions = require('firebase-functions/v1');
const { RecaptchaEnterpriseServiceClient } = require('@google-cloud/recaptcha-enterprise');
const { createLogger } = require('./utils/structured-logger');

const logger = createLogger('recaptcha-enterprise');

// Cliente de reCAPTCHA Enterprise
const recaptchaClient = new RecaptchaEnterpriseServiceClient();

// Configuración del proyecto
const PROJECT_ID = 'tucitasegura-129cc';
const SITE_KEY = '6LdlmB8sAAAAAMHn-yHoJIAwg2iVQMIXCKtDq7eb';

/**
 * Verificar token de reCAPTCHA Enterprise
 * @param {string} token - Token de reCAPTCHA del cliente
 * @param {string} expectedAction - Acción esperada (ej: 'login', 'register', 'submit_form')
 * @param {string} recaptchaAction - Acción real del reCAPTCHA (puede diferir de expectedAction)
 * @returns {Promise<Object>} Resultado de la verificación
 */
async function verifyRecaptchaToken(token, expectedAction, recaptchaAction = null) {
  const timer = logger.startTimer();

  try {
    const projectPath = recaptchaClient.projectPath(PROJECT_ID);

    // Crear el assessment
    const request = {
      assessment: {
        event: {
          token: token,
          siteKey: SITE_KEY,
          expectedAction: expectedAction
        }
      },
      parent: projectPath
    };

    logger.debug('Creating reCAPTCHA assessment', {
      expectedAction,
      projectId: PROJECT_ID
    });

    const [response] = await recaptchaClient.createAssessment(request);

    // Verificar si el token es válido
    if (!response.tokenProperties.valid) {
      logger.warn('Invalid reCAPTCHA token', {
        invalidReason: response.tokenProperties.invalidReason,
        expectedAction
      });

      return {
        success: false,
        score: 0,
        reason: response.tokenProperties.invalidReason,
        action: response.tokenProperties.action
      };
    }

    // Obtener el score (0.0 - 1.0, donde 1.0 es muy probablemente humano)
    const score = response.riskAnalysis.score;
    const action = response.tokenProperties.action;

    // Verificar que la acción coincida
    const actionMatches = recaptchaAction ?
      action === recaptchaAction :
      action === expectedAction;

    if (!actionMatches) {
      logger.warn('reCAPTCHA action mismatch', {
        expected: recaptchaAction || expectedAction,
        actual: action,
        score
      });

      return {
        success: false,
        score,
        reason: 'ACTION_MISMATCH',
        action,
        expectedAction: recaptchaAction || expectedAction
      };
    }

    logger.info('reCAPTCHA verification successful', {
      score,
      action,
      expectedAction,
      duration: timer.end()
    });

    return {
      success: true,
      score,
      action,
      reasons: response.riskAnalysis.reasons || []
    };

  } catch (error) {
    logger.error('reCAPTCHA verification error', error, {
      expectedAction,
      duration: timer.end()
    });

    return {
      success: false,
      score: 0,
      reason: 'VERIFICATION_ERROR',
      error: error.message
    };
  }
}

/**
 * Cloud Function HTTP para verificar reCAPTCHA
 * Endpoint: /verifyRecaptcha
 * Method: POST
 * Body: { token: string, action: string }
 */
exports.verifyRecaptcha = functions.https.onRequest(async (req, res) => {
  // Solo permitir POST
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'method_not_allowed',
      message: 'Only POST requests are allowed'
    });
  }

  // CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  const { token, action } = req.body;

  // Validar parámetros
  if (!token) {
    logger.warn('Missing reCAPTCHA token in request', {
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    return res.status(400).json({
      error: 'missing_token',
      message: 'reCAPTCHA token is required'
    });
  }

  if (!action) {
    logger.warn('Missing action in request', {
      ip: req.ip
    });

    return res.status(400).json({
      error: 'missing_action',
      message: 'Action is required'
    });
  }

  logger.debug('Received reCAPTCHA verification request', {
    action,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });

  // Verificar el token
  const result = await verifyRecaptchaToken(token, action);

  // Threshold de score (0.5 es el estándar recomendado por Google)
  const SCORE_THRESHOLD = 0.5;

  if (result.success && result.score >= SCORE_THRESHOLD) {
    logger.info('reCAPTCHA verification passed', {
      score: result.score,
      action: result.action,
      ip: req.ip
    });

    return res.status(200).json({
      success: true,
      score: result.score,
      action: result.action
    });
  } else {
    logger.warn('reCAPTCHA verification failed', {
      score: result.score,
      reason: result.reason,
      action: result.action,
      ip: req.ip
    });

    return res.status(400).json({
      success: false,
      score: result.score,
      reason: result.reason,
      message: `Verification failed: ${result.reason || 'Low score'}`
    });
  }
});

/**
 * Cloud Function Callable para verificar reCAPTCHA
 * Más seguro que HTTP porque requiere autenticación de Firebase
 */
exports.verifyRecaptchaCallable = functions.https.onCall(async (data, context) => {
  const { token, action } = data;

  // Validar parámetros
  if (!token || !action) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Token and action are required'
    );
  }

  logger.debug('Callable reCAPTCHA verification', {
    action,
    userId: context.auth?.uid,
    ip: context.rawRequest?.ip
  });

  // Verificar el token
  const result = await verifyRecaptchaToken(token, action);

  const SCORE_THRESHOLD = 0.5;

  if (!result.success || result.score < SCORE_THRESHOLD) {
    logger.warn('reCAPTCHA verification failed (callable)', {
      score: result.score,
      reason: result.reason,
      userId: context.auth?.uid
    });

    throw new functions.https.HttpsError(
      'permission-denied',
      `reCAPTCHA verification failed: ${result.reason || 'Low score'}`,
      { score: result.score, reason: result.reason }
    );
  }

  logger.info('reCAPTCHA verification passed (callable)', {
    score: result.score,
    action: result.action,
    userId: context.auth?.uid
  });

  return {
    success: true,
    score: result.score,
    action: result.action
  };
});

module.exports = {
  verifyRecaptchaToken,
  verifyRecaptcha: exports.verifyRecaptcha,
  verifyRecaptchaCallable: exports.verifyRecaptchaCallable
};
