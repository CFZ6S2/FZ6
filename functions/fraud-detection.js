/**
 * Fraud Detection Service - Cloud Functions
 *
 * Servicio de detección de fraude para TuCitaSegura
 * Analiza perfiles de usuarios y comportamiento para identificar cuentas fraudulentas
 *
 * Features:
 * - Análisis multi-dimensional (perfil 25%, comportamiento 35%, red 20%, contenido 20%)
 * - Detección de emails temporales, bots, VPN/Proxy
 * - Risk scoring 0-100 con recomendaciones automáticas
 * - Integration con Firestore para almacenar resultados
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { createLogger } = require('./utils/structured-logger');

const logger = createLogger('fraud-detection');

// Patrones de fraude comunes
const SUSPICIOUS_PATTERNS = {
  emailTemporal: /(tempmail|10minutemail|mailinator|guerrillamail|throwaway|trashmail|fakeinbox|yopmail)\.(com|net|org|co\.uk)/i,
  phoneVOIP: /^\+?(1|44|34)[0-9]{9,11}$/,
  nameRepetitive: /(.)\1{2,}/,
  bioGeneric: /(looking for|seeking|want to meet|nice person|good heart)/i,
  locationVPN: /VPN|Proxy|Tor|Anonymous/i,
  multipleAccounts: /user[0-9]+|test[0-9]+|fake[0-9]+/i
};

// Umbrales de comportamiento
const THRESHOLDS = {
  maxMessagesPerHour: 50,
  maxLikesPerHour: 100,
  maxReports: 3,
  minProfileCompletion: 0.3,
  maxLoginLocations: 5,
  maxDevices: 3
};

// Umbrales de riesgo
const RISK_THRESHOLDS = {
  minimal: 0,
  low: 0.3,
  medium: 0.6,
  high: 0.8
};

/**
 * Analizar riesgo de fraude de un usuario
 * @param {string} userId - ID del usuario
 * @returns {Promise<Object>} Resultado del análisis
 */
async function analyzeUserFraud(userId) {
  logger.info('Starting fraud analysis', { userId });

  try {
    const db = admin.firestore();

    // Obtener datos del usuario
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      throw new Error('User not found');
    }

    const userData = userDoc.data();

    // Obtener historial del usuario
    const userHistory = await getUserHistory(userId);

    // Análisis multi-dimensional
    const scores = [];
    const indicators = [];

    // 1. Análisis de perfil (25%)
    const { score: profileScore, indicators: profileIndicators } = analyzeProfile(userData);
    scores.push(profileScore * 0.25);
    indicators.push(...profileIndicators);

    // 2. Análisis de comportamiento (35%)
    const { score: behaviorScore, indicators: behaviorIndicators } = analyzeBehavior(userHistory);
    scores.push(behaviorScore * 0.35);
    indicators.push(...behaviorIndicators);

    // 3. Análisis de red y dispositivos (20%)
    const { score: networkScore, indicators: networkIndicators } = analyzeNetwork(userData, userHistory);
    scores.push(networkScore * 0.20);
    indicators.push(...networkIndicators);

    // 4. Análisis de contenido (20%)
    const { score: contentScore, indicators: contentIndicators } = analyzeContent(userData);
    scores.push(contentScore * 0.20);
    indicators.push(...contentIndicators);

    // Calcular score total
    const totalScore = scores.reduce((a, b) => a + b, 0);
    const riskLevel = getRiskLevel(totalScore);
    const recommendations = generateRecommendations(indicators, totalScore);
    const confidence = calculateConfidence(userData, userHistory);

    const result = {
      userId,
      fraudScore: Math.round(totalScore * 100) / 100,
      riskLevel,
      indicators,
      recommendations,
      confidence: Math.round(confidence * 100) / 100,
      analyzedAt: admin.firestore.Timestamp.now(),
      details: {
        profileScore: Math.round(profileScore * 100) / 100,
        behaviorScore: Math.round(behaviorScore * 100) / 100,
        networkScore: Math.round(networkScore * 100) / 100,
        contentScore: Math.round(contentScore * 100) / 100
      }
    };

    // Guardar resultado en Firestore
    await db.collection('fraud_scores').doc(userId).set(result, { merge: true });

    logger.info('Fraud analysis completed', {
      userId,
      fraudScore: result.fraudScore,
      riskLevel,
      indicatorCount: indicators.length
    });

    return result;

  } catch (error) {
    logger.error('Error in fraud analysis', error, { userId });
    throw error;
  }
}

/**
 * Obtener historial del usuario
 */
async function getUserHistory(userId) {
  const db = admin.firestore();

  try {
    const [messagesSnapshot, likesSnapshot, reportsSnapshot] = await Promise.all([
      db.collection('messages').where('senderId', '==', userId).get(),
      db.collection('likes').where('userId', '==', userId).get(),
      db.collection('reports').where('reportedUserId', '==', userId).get()
    ]);

    const messages = messagesSnapshot.docs.map(doc => doc.data());
    const likes = likesSnapshot.docs.map(doc => doc.data());
    const reports = reportsSnapshot.docs.map(doc => doc.data());

    return {
      messages,
      likes,
      reports_received: reports,
      login_sessions: [], // TODO: Implement login tracking
      devices: [], // TODO: Implement device tracking
      connections: [] // TODO: Implement connection tracking
    };
  } catch (error) {
    logger.error('Error getting user history', error, { userId });
    return {
      messages: [],
      likes: [],
      reports_received: [],
      login_sessions: [],
      devices: [],
      connections: []
    };
  }
}

/**
 * Analizar perfil del usuario
 */
function analyzeProfile(userData) {
  let score = 0;
  const indicators = [];

  // Verificar email temporal
  const email = userData.email || '';
  if (SUSPICIOUS_PATTERNS.emailTemporal.test(email)) {
    score += 0.3;
    indicators.push('Email temporal detectado');
  }

  // Verificar nombre sospechoso
  const name = userData.name || userData.displayName || '';
  if (name.length < 2 || name.length > 50) {
    score += 0.2;
    indicators.push('Nombre con longitud anormal');
  }

  if (SUSPICIOUS_PATTERNS.nameRepetitive.test(name)) {
    score += 0.25;
    indicators.push('Nombre con patrones repetitivos');
  }

  // Verificar edad
  const birthDate = userData.birthDate;
  if (birthDate) {
    try {
      const birthYear = parseInt(birthDate.split('-')[0]);
      const currentYear = new Date().getFullYear();
      const age = currentYear - birthYear;

      if (age < 18 || age > 80) {
        score += 0.3;
        indicators.push(`Edad sospechosa: ${age} años`);
      }
    } catch {
      score += 0.2;
      indicators.push('Formato de fecha inválido');
    }
  }

  // Verificar fotos
  const photos = userData.photos || [];
  if (!photos || photos.length === 0) {
    score += 0.15;
    indicators.push('Sin fotos de perfil');
  }

  // Verificar completitud del perfil
  const profileFields = ['bio', 'location', 'interests', 'occupation', 'education'];
  const completedFields = profileFields.filter(field => userData[field]).length;
  const completionRate = completedFields / profileFields.length;

  if (completionRate < THRESHOLDS.minProfileCompletion) {
    score += 0.2;
    indicators.push('Perfil incompleto');
  }

  return { score: Math.min(score, 1.0), indicators };
}

/**
 * Analizar comportamiento del usuario
 */
function analyzeBehavior(userHistory) {
  let score = 0;
  const indicators = [];

  // Análisis de mensajes
  const messages = userHistory.messages || [];
  const oneHourAgo = new Date(Date.now() - 3600000);
  const recentMessages = messages.filter(msg => {
    const msgDate = msg.createdAt?.toDate?.() || new Date(msg.createdAt);
    return msgDate > oneHourAgo;
  });

  if (recentMessages.length > THRESHOLDS.maxMessagesPerHour) {
    score += 0.4;
    indicators.push(`Exceso de mensajes: ${recentMessages.length} en 1h`);
  }

  // Análisis de likes
  const likes = userHistory.likes || [];
  const recentLikes = likes.filter(like => {
    const likeDate = like.createdAt?.toDate?.() || new Date(like.createdAt);
    return likeDate > oneHourAgo;
  });

  if (recentLikes.length > THRESHOLDS.maxLikesPerHour) {
    score += 0.3;
    indicators.push(`Exceso de likes: ${recentLikes.length} en 1h`);
  }

  // Análisis de reportes
  const reports = userHistory.reports_received || [];
  if (reports.length >= THRESHOLDS.maxReports) {
    score += 0.5;
    indicators.push(`Múltiples reportes: ${reports.length}`);
  }

  // Análisis de mensajes duplicados
  if (messages.length > 0) {
    const messageTexts = messages.slice(-20).map(msg => msg.content || '');
    const uniqueTexts = new Set(messageTexts);
    const duplicateRatio = 1 - (uniqueTexts.size / messageTexts.length);

    if (duplicateRatio > 0.7) {
      score += 0.35;
      indicators.push('Mensajes duplicados frecuentes');
    }
  }

  return { score: Math.min(score, 1.0), indicators };
}

/**
 * Analizar red y dispositivos
 */
function analyzeNetwork(userData, userHistory) {
  let score = 0;
  const indicators = [];

  // Análisis de ubicaciones (si están disponibles)
  const loginSessions = userHistory.login_sessions || [];
  const uniqueLocations = new Set(
    loginSessions.map(session => {
      const loc = session.location || {};
      return `${loc.lat || 0},${loc.lng || 0}`;
    })
  );

  if (uniqueLocations.size > THRESHOLDS.maxLoginLocations) {
    score += 0.3;
    indicators.push(`Múltiples ubicaciones: ${uniqueLocations.size}`);
  }

  // Análisis de dispositivos
  const devices = userHistory.devices || [];
  if (devices.length > THRESHOLDS.maxDevices) {
    score += 0.25;
    indicators.push(`Múltiples dispositivos: ${devices.length}`);
  }

  // Verificar uso de VPN/Proxy (si la información está disponible)
  const recentSessions = loginSessions.slice(-10);
  const hasVPN = recentSessions.some(session => {
    const ipInfo = session.ip_info || {};
    return ipInfo.is_vpn || ipInfo.is_proxy;
  });

  if (hasVPN) {
    score += 0.2;
    indicators.push('Uso de VPN/Proxy detectado');
  }

  return { score: Math.min(score, 1.0), indicators };
}

/**
 * Analizar contenido del perfil
 */
function analyzeContent(userData) {
  let score = 0;
  const indicators = [];

  // Análisis de biografía
  const bio = userData.bio || '';
  if (bio) {
    if (SUSPICIOUS_PATTERNS.bioGeneric.test(bio)) {
      score += 0.2;
      indicators.push('Biografía genérica');
    }

    if (/http|www|\.com|\.net/i.test(bio)) {
      score += 0.15;
      indicators.push('Enlaces en biografía');
    }

    if (bio.length < 10 || bio.length > 500) {
      score += 0.1;
      indicators.push('Longitud de biografía anormal');
    }
  }

  // Análisis de intereses
  const interests = userData.interests || [];
  if (interests.length > 0) {
    const genericInterests = ['music', 'movies', 'travel', 'food', 'sports'];
    const genericCount = interests.filter(interest =>
      genericInterests.some(gen => interest.toLowerCase().includes(gen))
    ).length;

    if (genericCount === interests.length) {
      score += 0.15;
      indicators.push('Intereses demasiado genéricos');
    }
  }

  // Análisis de fotos
  const photos = userData.photos || [];
  if (photos.length > 0) {
    const photoHashes = photos.map(photo => photo.hash || '').filter(Boolean);
    const uniqueHashes = new Set(photoHashes);

    if (photoHashes.length > 0 && uniqueHashes.size < photoHashes.length * 0.5) {
      score += 0.3;
      indicators.push('Fotos muy similares');
    }
  }

  return { score: Math.min(score, 1.0), indicators };
}

/**
 * Determinar nivel de riesgo
 */
function getRiskLevel(score) {
  if (score >= RISK_THRESHOLDS.high) return 'high';
  if (score >= RISK_THRESHOLDS.medium) return 'medium';
  if (score >= RISK_THRESHOLDS.low) return 'low';
  return 'minimal';
}

/**
 * Generar recomendaciones
 */
function generateRecommendations(indicators, score) {
  const recommendations = [];

  if (score >= 0.8) {
    recommendations.push(
      'Suspender cuenta temporalmente',
      'Revisar manualmente todos los datos del usuario',
      'Verificar identidad con documentación oficial',
      'Investigar conexiones con otros usuarios reportados'
    );
  } else if (score >= 0.6) {
    recommendations.push(
      'Monitorear actividad de cerca',
      'Limitar interacciones temporales',
      'Verificar información del perfil',
      'Aplicar restricciones de mensajería'
    );
  } else if (score >= 0.3) {
    recommendations.push(
      'Aumentar supervisión',
      'Verificar fotos del perfil',
      'Monitorear frecuencia de mensajes',
      'Verificar ubicación y dispositivos'
    );
  } else {
    recommendations.push(
      'Continuar monitoreo normal',
      'Verificar periódicamente',
      'Mantener alertas activas'
    );
  }

  // Recomendaciones específicas por indicadores
  if (indicators.some(ind => ind.includes('Email temporal'))) {
    recommendations.push('Solicitar verificación de email permanente');
  }

  if (indicators.some(ind => ind.includes('Múltiples reportes'))) {
    recommendations.push('Investigar reportes previos');
  }

  if (indicators.some(ind => ind.includes('VPN/Proxy'))) {
    recommendations.push('Solicitar desactivación de VPN para verificación');
  }

  return [...new Set(recommendations)]; // Remove duplicates
}

/**
 * Calcular confianza del análisis
 */
function calculateConfidence(userData, userHistory) {
  const confidenceFactors = [];

  // Datos del perfil
  let profileDataWeight = 0;
  if (userData.email) profileDataWeight += 1;
  if (userData.photos && userData.photos.length > 0) profileDataWeight += 1;
  if (userData.bio) profileDataWeight += 1;
  if (userData.birthDate) profileDataWeight += 1;
  confidenceFactors.push(Math.min(profileDataWeight / 4, 1.0));

  // Datos de comportamiento
  let behaviorDataWeight = 0;
  if (userHistory.messages && userHistory.messages.length > 0) behaviorDataWeight += 1;
  if (userHistory.likes && userHistory.likes.length > 0) behaviorDataWeight += 1;
  if (userHistory.login_sessions && userHistory.login_sessions.length > 0) behaviorDataWeight += 1;
  if (userHistory.reports_received !== undefined) behaviorDataWeight += 1;
  confidenceFactors.push(Math.min(behaviorDataWeight / 4, 1.0));

  // Datos de red
  let networkDataWeight = 0;
  if (userHistory.devices && userHistory.devices.length > 0) networkDataWeight += 1;
  if (userHistory.connections && userHistory.connections.length > 0) networkDataWeight += 1;
  confidenceFactors.push(Math.min(networkDataWeight / 2, 1.0));

  return confidenceFactors.reduce((a, b) => a + b, 0) / confidenceFactors.length;
}

// ============================================================================
// CLOUD FUNCTIONS EXPORTS
// ============================================================================

/**
 * HTTP Callable Function: Analizar fraude de usuario
 * Solo admins pueden llamar esta función
 */
exports.analyzeFraud = functions.https.onCall(async (data, context) => {
  // Verificar autenticación
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Must be authenticated to analyze fraud'
    );
  }

  // Solo admins pueden analizar fraude de otros usuarios
  const isAdmin = context.auth.token.role === 'admin';
  const { userId } = data;

  if (!userId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'userId is required'
    );
  }

  // Los usuarios solo pueden ver su propio análisis, admins pueden ver cualquiera
  if (!isAdmin && userId !== context.auth.uid) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only admins can analyze other users'
    );
  }

  try {
    const result = await analyzeUserFraud(userId);
    return result;
  } catch (error) {
    logger.error('Error in analyzeFraud function', error, { userId });
    throw new functions.https.HttpsError(
      'internal',
      `Error analyzing fraud: ${error.message}`
    );
  }
});

/**
 * Firestore Trigger: Analizar fraude automáticamente al crear usuario
 * Se ejecuta después de que se crea el documento de usuario
 */
exports.onUserCreatedAnalyzeFraud = functions.firestore
  .document('users/{userId}')
  .onCreate(async (snap, context) => {
    const userId = context.params.userId;
    const userData = snap.data();

    logger.info('New user created, analyzing fraud', { userId });

    try {
      const result = await analyzeUserFraud(userId);

      // Si el riesgo es alto, marcar usuario para revisión
      if (result.riskLevel === 'high') {
        logger.security('High fraud risk detected', {
          userId,
          fraudScore: result.fraudScore,
          indicators: result.indicators
        });

        // Actualizar usuario con flag de revisión
        await admin.firestore().collection('users').doc(userId).update({
          needsReview: true,
          reviewReason: 'high_fraud_risk',
          fraudScore: result.fraudScore,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Crear notificación para admins
        await admin.firestore().collection('admin_notifications').add({
          type: 'fraud_alert',
          userId,
          fraudScore: result.fraudScore,
          riskLevel: result.riskLevel,
          indicators: result.indicators,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          read: false
        });

        logger.info('User flagged for review due to high fraud risk', { userId });
      } else if (result.riskLevel === 'medium') {
        logger.audit('Medium fraud risk detected', {
          userId,
          fraudScore: result.fraudScore
        });
      }

      return result;
    } catch (error) {
      logger.error('Error analyzing fraud for new user', error, { userId });
      // No lanzar error para no bloquear la creación del usuario
      return null;
    }
  });

/**
 * Scheduled Function: Analizar fraude de usuarios existentes periódicamente
 * Se ejecuta diariamente a las 2 AM
 */
exports.scheduledFraudAnalysis = functions.pubsub
  .schedule('0 2 * * *') // Cron: 2 AM daily
  .timeZone('Europe/Madrid')
  .onRun(async (context) => {
    logger.info('Starting scheduled fraud analysis');

    try {
      const db = admin.firestore();

      // Obtener usuarios activos que no han sido analizados recientemente
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      const usersSnapshot = await db.collection('users')
        .where('isActive', '==', true)
        .limit(100) // Procesar en lotes de 100
        .get();

      const results = [];
      let highRiskCount = 0;
      let mediumRiskCount = 0;

      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        const fraudScoreDoc = await db.collection('fraud_scores').doc(userId).get();

        // Solo analizar si no hay análisis o es antiguo
        if (!fraudScoreDoc.exists ||
            fraudScoreDoc.data().analyzedAt.toDate() < threeDaysAgo) {

          try {
            const result = await analyzeUserFraud(userId);
            results.push(result);

            if (result.riskLevel === 'high') {
              highRiskCount++;
            } else if (result.riskLevel === 'medium') {
              mediumRiskCount++;
            }
          } catch (error) {
            logger.error('Error analyzing user in scheduled job', error, { userId });
          }

          // Esperar 100ms entre análisis para no saturar
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      logger.info('Scheduled fraud analysis completed', {
        totalAnalyzed: results.length,
        highRiskCount,
        mediumRiskCount
      });

      return {
        success: true,
        analyzed: results.length,
        highRiskCount,
        mediumRiskCount
      };

    } catch (error) {
      logger.error('Error in scheduled fraud analysis', error);
      throw error;
    }
  });

// Export helper functions for testing
exports._analyzeUserFraud = analyzeUserFraud;
exports._analyzeProfile = analyzeProfile;
exports._analyzeBehavior = analyzeBehavior;
exports._analyzeNetwork = analyzeNetwork;
exports._analyzeContent = analyzeContent;
