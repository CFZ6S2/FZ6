// functions/index.js (Node 18)
const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const fs = require('fs');

// CRITICAL FIX: Prevent crash if credential file is missing
if (process.env.GOOGLE_APPLICATION_CREDENTIALS && !fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
  console.warn(`⚠️ Warning: GOOGLE_APPLICATION_CREDENTIALS points to missing file: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}. Unsetting it.`);
  delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
}

// Leer secrets solo de env vars en deploy
const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecret ? require('stripe')(stripeSecret) : null;
const axios = require('axios');
const { createLogger, PerformanceTimer } = require('./utils/structured-logger');
const { verifyAppCheckHTTP } = require('./middleware/app-check');

// Inicializar logger
const logger = createLogger('functions-main');
const { sendEmail } = require('./utils/email');

admin.initializeApp();

// ============================================================================
// PAYPAL TOKEN CACHE
// ============================================================================
// Cache para tokens de PayPal para reducir llamadas a API
let paypalTokenCache = {
  token: null,
  expiresAt: null
};

logger.info('Cloud Functions initialized', {
  nodeVersion: process.version,
  environment: process.env.FUNCTION_TARGET || 'unknown'
});

// ============================================================================
// API ENDPOINTS (migrated from FastAPI backend)
// ============================================================================
const apiEndpoints = require('./api-endpoints');

// Export API functions
exports.apiHealth = apiEndpoints.apiHealth;
exports.apiPublic = apiEndpoints.apiPublic;
exports.apiProtected = apiEndpoints.apiProtected;
exports.apiUserProfile = apiEndpoints.apiUserProfile;
exports.apiUpload = apiEndpoints.apiUpload;
exports.apiModerateMessage = apiEndpoints.apiModerateMessage;
exports.apiOptional = apiEndpoints.apiOptional;

exports.apiProxy = functions.https.onRequest(async (req, res) => {
  const timer = new PerformanceTimer(logger, 'apiProxy');

  // Verificar App Check token opcionalmente (soft enforcement)
  const appCheckMiddleware = verifyAppCheckHTTP(false);
  await new Promise((resolve) => {
    appCheckMiddleware(req, res, () => {
      resolve();
    });
  });

  // Resolve conflict: prioritize functions.config or env var, fallback to Cloud Run
  const base = process.env.API_BASE_URL || 'https://tucitasegura-backend-tlmpmnvyda-uc.a.run.app';
  const url = base + req.originalUrl;

  logger.debug('API proxy request', {
    method: req.method,
    path: req.originalUrl,
    url,
    hasAppCheck: !!req.appCheckClaims
  });

  try {
    const headers = { ...req.headers };
    delete headers.host;
    const response = await axios({
      url,
      method: req.method,
      headers,
      data: req.body,
      timeout: 30000, // 30 segundos - previene requests que cuelgan indefinidamente
      validateStatus: () => true
    });
    Object.entries(response.headers || {}).forEach(([k, v]) => {
      if (typeof v === 'string') res.setHeader(k, v);
    });

    timer.end({ status: response.status });
    res.status(response.status).send(response.data);
  } catch (error) {
    logger.error('API proxy error', error, {
      method: req.method,
      path: req.originalUrl
    });
    timer.end({ status: 502, error: true });
    res.status(502).json({ error: 'proxy_error', detail: String(error.message || error) });
  }
});

// ============================================================================
// HELPER FUNCTIONS: Payment management
// ============================================================================

/**
 * Actualizar estado de membresía del usuario
 */
async function updateUserMembership(userId, status, subscriptionData = {}) {
  const db = admin.firestore();
  const userRef = db.collection('users').doc(userId);

  const updateData = {
    hasActiveSubscription: status === 'active',
    subscriptionStatus: status,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  if (subscriptionData.subscriptionId) {
    updateData.subscriptionId = subscriptionData.subscriptionId;
  }
  if (subscriptionData.startDate) {
    updateData.subscriptionStartDate = subscriptionData.startDate;
  }
  if (subscriptionData.endDate) {
    updateData.subscriptionEndDate = subscriptionData.endDate;
  }

  await userRef.update(updateData);
  logger.info('User membership updated', { userId, status });

  // CRITICAL: Update custom claims for Firestore Rules
  // This allows Rules to check payment status without expensive get() calls
  try {
    const currentUser = await admin.auth().getUser(userId);
    const currentClaims = currentUser.customClaims || {};

    await admin.auth().setCustomClaims(userId, {
      ...currentClaims,
      hasActiveSubscription: status === 'active'
    });

    logger.info('Custom claims updated for subscription', { userId, hasActiveSubscription: status === 'active' });
  } catch (error) {
    logger.error('Error updating custom claims for subscription', { userId, error: error.message });
    // Don't throw - Firestore update succeeded, claims update is optimization
  }

  return updateData;
}

/**
 * Actualizar estado de seguro anti-plantón del usuario
 */
async function updateUserInsurance(userId, paymentData) {
  const db = admin.firestore();
  const userRef = db.collection('users').doc(userId);

  const updateData = {
    hasAntiGhostingInsurance: true,
    insurancePaymentId: paymentData.paymentId,
    insurancePurchaseDate: paymentData.purchaseDate || admin.firestore.FieldValue.serverTimestamp(),
    insuranceAmount: paymentData.amount || 120,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  await userRef.update(updateData);
  logger.info('User insurance activated', { userId, insuranceType: 'anti-ghosting' });

  // CRITICAL: Update custom claims for Firestore Rules
  // This allows Rules to check insurance status without expensive get() calls
  try {
    const currentUser = await admin.auth().getUser(userId);
    const currentClaims = currentUser.customClaims || {};

    await admin.auth().setCustomClaims(userId, {
      ...currentClaims,
      hasAntiGhostingInsurance: true
    });

    logger.info('Custom claims updated for insurance', { userId, hasAntiGhostingInsurance: true });
  } catch (error) {
    logger.error('Error updating custom claims for insurance', { userId, error: error.message });
    // Don't throw - Firestore update succeeded, claims update is optimization
  }

  return updateData;
}

/**
 * Registrar pago en colección de subscriptions
 */
async function logSubscription(userId, subscriptionData) {
  const db = admin.firestore();
  await db.collection('subscriptions').doc(subscriptionData.subscriptionId).set({
    userId,
    ...subscriptionData,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
  logger.info('Subscription payment logged', { userId, subscriptionId: subscriptionData.subscriptionId });
}

/**
 * Registrar pago de seguro en colección de insurances
 */
async function logInsurance(userId, insuranceData) {
  const db = admin.firestore();
  await db.collection('insurances').doc(insuranceData.paymentId).set({
    userId,
    ...insuranceData,
    isActive: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
  logger.info('Insurance logged', { userId, paymentId: insuranceData.paymentId });
}

/**
 * Crear notificación para el usuario
 * @param {string} userId - ID del usuario
 * @param {Object} notification - Datos de la notificación
 */
async function createUserNotification(userId, notification) {
  const db = admin.firestore();

  const notificationData = {
    userId,
    title: notification.title,
    message: notification.message,
    type: notification.type || 'info', // 'info', 'warning', 'error', 'success'
    read: false,
    actionUrl: notification.actionUrl || null,
    actionLabel: notification.actionLabel || null,
    metadata: notification.metadata || {},
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  };

  await db.collection('notifications').add(notificationData);
  logger.info('Notification created', { userId, title: notification.title, type: notification.type });
}

/**
 * Registrar pago fallido para análisis
 * @param {string} userId - ID del usuario
 * @param {Object} paymentData - Datos del pago fallido
 */
async function logFailedPayment(userId, paymentData) {
  const db = admin.firestore();

  const failedPaymentRecord = {
    userId,
    paymentId: paymentData.paymentId,
    provider: paymentData.provider || 'unknown', // 'stripe', 'paypal'
    type: paymentData.type || 'unknown', // 'subscription', 'insurance', 'one-time'
    amount: paymentData.amount || 0,
    currency: paymentData.currency || 'EUR',
    reason: paymentData.reason || 'unknown',
    errorCode: paymentData.errorCode || null,
    errorMessage: paymentData.errorMessage || null,
    metadata: paymentData.metadata || {},
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  };

  await db.collection('failed_payments').add(failedPaymentRecord);
  logger.warn('Failed payment logged', { userId, paymentId: paymentData.paymentId, provider: paymentData.provider, reason: paymentData.reason });
}

// ============================================================================
// REFERRAL SYSTEM HELPERS
// ============================================================================

function generateReferralCode(alias, uid) {
  const cleanAlias = (alias || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 6);
  const uidPart = uid.substring(0, 6).toUpperCase();
  return `${cleanAlias}${uidPart}`;
}

async function processReferralReward(userId, source = 'stripe') {
  const db = admin.firestore();
  const userRef = db.collection('users').doc(userId);
  const userDoc = await userRef.get();

  if (!userDoc.exists) return;
  const userData = userDoc.data();

  // Check if referred mechanism is used
  if (!userData.referredBy) return;

  logger.info('Processing referral for user', { userId, referredBy: userData.referredBy });

  // Find referrer
  const referrerQuery = await db.collection('users').where('referralCode', '==', userData.referredBy).limit(1).get();

  if (referrerQuery.empty) {
    logger.warn('Referrer not found for code', { code: userData.referredBy, refereeId: userId });
    return;
  }

  const referrerDoc = referrerQuery.docs[0];
  const referrerId = referrerDoc.id;
  const referrerData = referrerDoc.data();

  // Only reward if referrer is female? Plan says "Female users earn".
  // But maybe we should just apply rule generally in backend and let frontend filter visibility?
  // Plan: "Female users earn 10€". I'll check gender.
  if (referrerData.gender !== 'femenino') {
    logger.info('Referrer is not female, skipping reward', { referrerId, gender: referrerData.gender });
    return;
  }

  // Credit reward (10 EUR)
  const rewardAmount = 10;
  const currentBalance = referrerData.wallet?.balance || 0;
  const newBalance = currentBalance + rewardAmount;

  await db.collection('users').doc(referrerId).set({
    wallet: {
      balance: newBalance,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }
  }, { merge: true });

  // Log transaction
  await db.collection('referral_transactions').add({
    referrerId,
    refereeId: userId,
    amount: rewardAmount,
    currency: 'EUR',
    source,
    code: userData.referredBy,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });

  logger.info('Referral reward processed', { referrerId, refereeId: userId, amount: rewardAmount });

  // Send notification to referrer
  await createUserNotification(referrerId, {
    title: '¡Recompensa recibida!',
    message: `Has ganado ${rewardAmount}€ gracias a una suscripción de tu referido.`,
    type: 'success',
    actionUrl: '/webapp/perfil.html',
    actionLabel: 'Ver Monedero'
  });
}

/**
 * MIGRATION: Backfill referral codes for existing users
 * Call: /backfillReferralCodes?secret=MIGRATION_SECRET_2024
 */
exports.backfillReferralCodes = functions.https.onRequest(async (req, res) => {
  const secret = req.query.secret;
  if (secret !== 'MIGRATION_SECRET_2024') return res.status(403).send('Forbidden');

  const db = admin.firestore();
  const usersSnap = await db.collection('users').get();
  let updated = 0;
  const batches = [];
  let batch = db.batch();
  let count = 0;

  usersSnap.forEach(doc => {
    const data = doc.data();
    if (!data.referralCode) {
      const code = generateReferralCode(data.alias || data.name || 'User', doc.id);
      batch.update(doc.ref, { referralCode: code });
      count++;
      updated++;

      if (count >= 490) { // Safety margin < 500
        batches.push(batch);
        batch = db.batch();
        count = 0;
      }
    }
  });

  if (count > 0) batches.push(batch);

  await Promise.all(batches.map(b => b.commit()));

  logger.info(`Backfilled referral codes for ${updated} users`);
  res.json({ success: true, updated });
});

/**
 * ANNOUNCEMENT: Notify all female users about the new referral program
 * Call: /announceReferralFeature?secret=MIGRATION_SECRET_2024
 */
exports.announceReferralFeature = functions.https.onRequest(async (req, res) => {
  const secret = req.query.secret;
  if (secret !== 'MIGRATION_SECRET_2024') return res.status(403).send('Forbidden');

  const db = admin.firestore();
  // Query users where gender is female
  // Note: We need to handle potential different field names if schema wasn't strict before,
  // but based on register.js it should be 'gender': 'femenino' or basicInfo.gender.
  // Let's try to be broad or just iterate all and check.
  // Iterating all is safer if the dataset isn't huge yet (which it isn't, based on backfill).

  const usersSnap = await db.collection('users').get();
  let notified = 0;
  const batches = [];
  let batch = db.batch();
  let count = 0;

  usersSnap.forEach(doc => {
    const data = doc.data();
    // Check gender (support flat 'gender' or nested 'basicInfo.gender')
    const gender = data.gender || data.basicInfo?.gender;

    if (gender === 'femenino') {
      const userId = doc.id;
      const notificationRef = db.collection('notifications').doc();

      batch.set(notificationRef, {
        userId,
        title: '¡Nueva función: Invita y Gana! 🎁',
        message: 'Ahora puedes ganar 10€ por cada amigo que invites y se suscriba. ¡Toca aquí para ver tu código!',
        type: 'success',
        read: false,
        actionUrl: '/webapp/perfil.html',
        actionLabel: 'Ver mi Código',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      count++;
      notified++;

      if (count >= 490) {
        batches.push(batch);
        batch = db.batch();
        count = 0;
      }
    }
  });

  if (count > 0) batches.push(batch);

  await Promise.all(batches.map(b => b.commit()));

  logger.info(`Announced referral feature to ${notified} female users`);
  res.json({ success: true, notified });
});

// ============================================================================
// 1) CUSTOM CLAIMS: Al crear el doc de usuario, fijamos displayName y claims
// ============================================================================
exports.onUserDocCreate = functions.firestore
  .document('users/{userId}')
  .onCreate(async (snap, ctx) => {
    const uid = ctx.params.userId;
    const data = snap.data() || {};
    const name = (data.name || data.alias || '').toString().slice(0, 100);
    const gender = ['masculino', 'femenino'].includes(data.gender) ? data.gender : null;
    const userRole = data.userRole || 'regular';
    const referralCode = generateReferralCode(data.alias || 'User', uid);

    logger.info('Setting claims and referral code for new user', { uid, role: userRole, gender, referralCode });

    // Save referral code
    try {
      await snap.ref.update({ referralCode });
    } catch (e) {
      logger.error('Error saving referral code', { uid, error: e.message });
    }

    // Display name en Auth
    try {
      await admin.auth().updateUser(uid, { displayName: name });
      logger.info('Updated displayName for user', { uid, displayName: name });
    } catch (e) {
      logger.error('Error updating displayName', { uid, error: e.message });
    }

    // Claims iniciales (conservando otros si existieran)
    try {
      const user = await admin.auth().getUser(uid);
      const oldClaims = user.customClaims || {};
      await admin.auth().setCustomClaims(uid, {
        ...oldClaims,
        role: userRole,
        gender: gender
      });
      logger.info('Custom claims set for new user', { uid, role: userRole, gender });
    } catch (e) {
      logger.error('Error setting custom claims', { uid, error: e.message });
    }
  });

// ============================================================================
// 2) CUSTOM CLAIMS UPDATE: Propagar cambios de role/gender a claims
// ============================================================================
exports.onUserDocUpdate = functions.firestore
  .document('users/{userId}')
  .onUpdate(async (change, ctx) => {
    const uid = ctx.params.userId;
    const before = change.before.data();
    const after = change.after.data();

    // Solo actualizar claims si role o gender cambiaron
    const roleChanged = before.userRole !== after.userRole;
    const genderChanged = before.gender !== after.gender;
    const aliasChanged = before.alias !== after.alias;

    if (!roleChanged && !genderChanged && !aliasChanged) {
      // No changes, skip

      return null;
    }

    const newRole = after.userRole || 'regular';
    const newGender = ['masculino', 'femenino'].includes(after.gender) ? after.gender : null;

    logger.info('Updating claims for user', { uid, role: newRole, gender: newGender });

    try {
      const user = await admin.auth().getUser(uid);
      const oldClaims = user.customClaims || {};
      await admin.auth().setCustomClaims(uid, {
        ...oldClaims,
        role: newRole,
        gender: newGender
      });
      logger.info('Claims updated successfully', { uid, role: newRole, gender: newGender });
    } catch (e) {
      logger.error('Error updating claims on user update', { uid, error: e.message });
    }

    if (aliasChanged) {
      const newReferralCode = generateReferralCode(after.alias || 'User', uid);
      if (newReferralCode !== after.referralCode) {
        try {
          logger.info('Updating referral code due to alias change', { uid, newCode: newReferralCode });
          await change.after.ref.update({ referralCode: newReferralCode });
        } catch (e) {
          logger.error('Error updating referral code', { uid, error: e.message });
        }
      }
    }

    // 4) CLEANUP TRIGGER: Si el usuario fue marcado como borrado, eliminar Auth y Storage
    if (after.deleted === true && before.deleted !== true) {
      logger.info('User marked as deleted, initiating cleanup', { uid });

      try {
        // 1. Delete from Auth (Admin SDK bypasses requires-recent-login)
        await admin.auth().deleteUser(uid);
        logger.info('Auth user deleted by backend', { uid });
      } catch (e) {
        if (e.code === 'auth/user-not-found') {
          logger.info('Auth user already deleted', { uid });
        } else {
          logger.error('Error deleting Auth user', { uid, error: e.message });
        }
      }

      // 2. Delete Storage (Avatar & Gallery)
      // Note: We can only guess standard paths here. 
      // Ideally run a recursive delete tool or better path tracking.
      // Assuming paths: profile_photos/{gender}/{uid}/... + chat_attachments/...
      const bucket = admin.storage().bucket();
      const genders = ['masculino', 'femenino'];

      // Attempt to delete common paths
      for (const g of genders) {
        try {
          await bucket.deleteFiles({ prefix: `profile_photos/${g}/${uid}/` });
        } catch (e) { /* ignore */ }
      }

      // Delete ID Verification photos
      try {
        await bucket.deleteFiles({ prefix: `id_verification/${uid}/` });
      } catch (e) { /* ignore */ }

      logger.info('Cleanup tasks completed', { uid });

      // Optionally delete the Firestore doc entirely?
      // Keeping it as "deleted: true" is good for audit, but ensure it's filtered everywhere.
      return null;
    }

    return null;
  });

// ============================================================================
// 3) CHAT ACL: Sincroniza ACL de chats en Storage cuando cambian participantes
// ============================================================================
exports.syncChatACL = functions.firestore
  .document('conversations/{conversationId}')
  .onWrite(async (change, ctx) => {
    const conversationId = ctx.params.conversationId;
    const after = change.after.exists ? change.after.data() : null;
    const before = change.before.exists ? change.before.data() : null;

    const afterSet = new Set((after?.participants || []).map(String));
    const beforeSet = new Set((before?.participants || []).map(String));

    const added = [...afterSet].filter(x => !beforeSet.has(x));
    const removed = [...beforeSet].filter(x => !afterSet.has(x));

    logger.debug('Syncing chat ACL', { conversationId, added: added.length, removed: removed.length });

    if (added.length === 0 && removed.length === 0) {
      logger.debug('No ACL changes to sync', { conversationId });
      return null;
    }

    const bucket = admin.storage().bucket();

    try {
      await Promise.all([
        ...added.map(uid => {
          logger.debug('Adding ACL', { uid, conversationId });
          return bucket.file(`chat_attachments/${conversationId}/__acl__/${uid}`).save('');
        }),
        ...removed.map(uid => {
          logger.debug('Removing ACL', { uid, conversationId });
          return bucket.file(`chat_attachments/${conversationId}/__acl__/${uid}`).delete({ ignoreNotFound: true });
        }),
      ]);
      logger.info('ACL sync complete', { conversationId, added: added.length, removed: removed.length });
    } catch (e) {
      logger.error('Error syncing ACL', { conversationId, error: e.message });
    }

    return null;
  });

// ============================================================================
// 4) ADMIN: Función HTTP para actualizar claims manualmente (útil para testing)
// ============================================================================
exports.updateUserClaims = functions.https.onCall(async (data, context) => {
  // Solo admins pueden llamar esta función
  if (!context.auth || context.auth.token.role !== 'admin') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Solo administradores pueden actualizar custom claims'
    );
  }

  const { userId, role, gender } = data;

  if (!userId || !role || !gender) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Faltan parámetros requeridos: userId, role, gender'
    );
  }

  if (!['regular', 'admin', 'concierge'].includes(role)) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'role debe ser: regular, admin, o concierge'
    );
  }

  if (!['masculino', 'femenino'].includes(gender)) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'gender debe ser: masculino o femenino'
    );
  }

  try {
    await admin.auth().setCustomClaims(userId, { role, gender });
    logger.info('User claims updated', { userId, role, gender });
    return { success: true, message: `Claims actualizados para ${userId}` };
  } catch (error) {
    logger.error('Error updating user claims', { userId, error: error.message });
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// ============================================================================
// 5) UTILITY: Función HTTP para obtener claims de un usuario (debugging)
// ============================================================================
exports.getUserClaims = functions.https.onCall(async (data, context) => {
  // Solo usuarios autenticados pueden ver sus propios claims, admins pueden ver cualquiera
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Debes estar autenticado'
    );
  }

  const { userId } = data;
  const targetUserId = userId || context.auth.uid;

  // Si no eres admin y no es tu propio ID, denegar
  if (targetUserId !== context.auth.uid && context.auth.token.role !== 'admin') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Solo puedes ver tus propios claims'
    );
  }

  try {
    const user = await admin.auth().getUser(targetUserId);
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      customClaims: user.customClaims || {}
    };
  } catch (error) {
    logger.error('Error getting user claims', { targetUserId, error: error.message });
    throw new functions.https.HttpsError('not-found', 'Usuario no encontrado');
  }
});

// ============================================================================
// 6) ADMIN BOOTSTRAP: Crear el primer administrador (usar solo una vez)
// ============================================================================
exports.createFirstAdmin = functions.https.onRequest(async (req, res) => {
  // CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Solo se permite método POST' });
  }

  const { email, adminSecret, gender } = req.body;

  // Verificar secreto de admin (configura esto en Firebase Config o .env)
  // Verificar secreto de admin (configura esto en Firebase Config o .env)
  const expectedSecret = functions.config().admin?.bootstrap_secret || process.env.ADMIN_BOOTSTRAP_SECRET;

  if (!expectedSecret) {
    logger.error('createFirstAdmin: Admin secret not configured in backend');
    return res.status(500).json({ error: 'Configuración de servidor incompleta' });
  }

  if (!adminSecret || adminSecret !== expectedSecret) {
    logger.warn('createFirstAdmin: Invalid admin secret attempt', { email });
    return res.status(403).json({ error: 'Secreto de administrador inválido' });
  }

  if (!email) {
    return res.status(400).json({ error: 'Email es requerido' });
  }

  // Validar gender si se proporciona
  const userGender = gender || 'masculino';
  if (!['masculino', 'femenino'].includes(userGender)) {
    return res.status(400).json({ error: 'gender debe ser "masculino" o "femenino"' });
  }

  try {
    // Buscar o crear el usuario
    let user;
    try {
      user = await admin.auth().getUserByEmail(email);
      logger.info('createFirstAdmin: User found', { email, uid: user.uid });
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        // Crear nuevo usuario
        user = await admin.auth().createUser({
          email: email,
          emailVerified: true,
          displayName: 'Administrador',
          password: `Admin${Date.now()}!` // Contraseña temporal, se debe cambiar
        });
        logger.info('createFirstAdmin: User created', { email, uid: user.uid });
      } else {
        throw error;
      }
    }

    // Establecer custom claims como admin
    await admin.auth().setCustomUserClaims(user.uid, {
      role: 'admin',
      gender: userGender
    });

    // Crear/actualizar documento en Firestore
    const db = admin.firestore();
    const userRef = db.collection('users').doc(user.uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      await userRef.set({
        uid: user.uid,
        email: email,
        userRole: 'admin',
        gender: userGender,
        alias: 'Admin',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastActivity: admin.firestore.FieldValue.serverTimestamp(),
        hasActiveSubscription: false,
        subscriptionStatus: 'none'
      });
      logger.info('createFirstAdmin: Firestore document created', { uid: user.uid, gender: userGender });
    } else {
      await userRef.update({
        userRole: 'admin',
        gender: userGender,
        lastActivity: admin.firestore.FieldValue.serverTimestamp()
      });
      logger.info('createFirstAdmin: Firestore document updated', { uid: user.uid, gender: userGender });
    }

    logger.info('createFirstAdmin: SUCCESS', { email, uid: user.uid });

    return res.status(200).json({
      success: true,
      message: 'Administrador creado exitosamente',
      user: {
        uid: user.uid,
        email: user.email,
        role: 'admin'
      },
      note: user.providerData.length === 0
        ? 'Usuario creado con contraseña temporal. Usa "Olvidé mi contraseña" para establecer una nueva.'
        : 'Usuario existente ahora es admin. Usa tu contraseña actual para iniciar sesión.'
    });

  } catch (error) {
    logger.error('createFirstAdmin: Error', { email, error: error.message });
    return res.status(500).json({
      error: 'Error al crear administrador',
      details: error.message
    });
  }
});

// ============================================================================
// 7) STRIPE WEBHOOK: Manejar eventos de Stripe (subscriptions y payments)
// ============================================================================
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
  if (!stripe || !(functionsConfig?.stripe?.webhook_secret || process.env.STRIPE_WEBHOOK_SECRET)) {
    return res.status(503).json({ error: 'payments_disabled', provider: 'stripe' });
  }
  const sig = req.headers['stripe-signature'];
  const webhookSecret = functionsConfig?.stripe?.webhook_secret || process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
  } catch (err) {
    logger.error('Stripe webhook signature verification failed', err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const eventId = event.id;
  const eventType = event.type;

  logger.info('Stripe webhook received', {
    eventId,
    eventType,
    livemode: event.livemode
  });

  const db = admin.firestore();

  try {
    // ============================================================================
    // IDEMPOTENCIA: Verificar si ya procesamos este evento
    // ============================================================================
    const webhookRef = db.collection('processed_webhooks').doc(eventId);
    const webhookDoc = await webhookRef.get();

    if (webhookDoc.exists) {
      logger.info('Webhook already processed (duplicate)', {
        eventId,
        eventType,
        processedAt: webhookDoc.data().processedAt?.toDate()
      });
      return res.json({ received: true, duplicate: true });
    }

    // Procesar el evento
    switch (eventType) {
      // ========== SUBSCRIPTION EVENTS ==========
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionCanceled(event.data.object);
        break;

      // ========== PAYMENT EVENTS (Insurance - one-time) ==========
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;

      // ========== INVOICE EVENTS ==========
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object);
        break;

      default:
        logger.debug('Unhandled Stripe webhook event type', { eventType });
    }

    // Marcar como procesado DESPUÉS de procesamiento exitoso
    await webhookRef.set({
      eventId,
      eventType,
      provider: 'stripe',
      livemode: event.livemode,
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: event.created ? admin.firestore.Timestamp.fromMillis(event.created * 1000) : admin.firestore.FieldValue.serverTimestamp()
    });

    logger.info('Stripe webhook processed successfully', { eventId, eventType });
    res.json({ received: true });

  } catch (error) {
    logger.error('Error processing Stripe webhook', error, {
      eventId,
      eventType
    });
    // Retornar 200 para evitar reintentos infinitos en errores no críticos
    // Stripe reintentará automáticamente si es un error temporal (5xx)
    res.status(200).json({ received: true, error: error.message });
  }
});

/**
 * Manejar actualización de suscripción (created/updated)
 */
async function handleSubscriptionUpdate(subscription) {
  const userId = subscription.metadata.userId;

  if (!userId) {
    logger.error('No userId in subscription metadata', { subscriptionId: subscription.id });
    return;
  }

  const status = subscription.status; // active, past_due, canceled, etc.
  const subscriptionData = {
    subscriptionId: subscription.id,
    plan: subscription.metadata.plan || 'monthly',
    amount: subscription.items.data[0].price.unit_amount / 100,
    currency: subscription.currency.toUpperCase(),
    status: status,
    currentPeriodStart: admin.firestore.Timestamp.fromMillis(subscription.current_period_start * 1000),
    currentPeriodEnd: admin.firestore.Timestamp.fromMillis(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end
  };

  await updateUserMembership(userId, status, {
    subscriptionId: subscription.id,
    startDate: subscriptionData.currentPeriodStart,
    endDate: subscriptionData.currentPeriodEnd
  });

  await logSubscription(userId, subscriptionData);

  logger.info('Subscription updated', { subscriptionId: subscription.id, userId, status });

  // Process referral reward if active
  if (status === 'active') {
    try {
      await processReferralReward(userId, 'stripe');
    } catch (e) {
      logger.error('Error processing referral reward (Stripe)', { userId, error: e.message });
    }
  }
}

/**
 * Manejar cancelación de suscripción
 */
async function handleSubscriptionCanceled(subscription) {
  const userId = subscription.metadata.userId;

  if (!userId) {
    logger.error('No userId in subscription metadata', { subscriptionId: subscription.id });
    return;
  }

  await updateUserMembership(userId, 'canceled');

  // Actualizar log de subscription
  const db = admin.firestore();
  await db.collection('subscriptions').doc(subscription.id).update({
    status: 'canceled',
    canceledAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  logger.info('Subscription canceled', { subscriptionId: subscription.id, userId });
}

/**
 * Manejar pago exitoso (Insurance - one-time payment)
 */
async function handlePaymentSucceeded(paymentIntent) {
  const userId = paymentIntent.metadata.userId;
  const paymentType = paymentIntent.metadata.paymentType; // 'insurance' or 'membership'

  if (!userId) {
    logger.error('No userId in payment metadata', { paymentIntentId: paymentIntent.id });
    return;
  }

  if (paymentType === 'insurance') {
    const insuranceData = {
      paymentId: paymentIntent.id,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency.toUpperCase(),
      status: 'succeeded',
      paymentMethod: paymentIntent.payment_method_types[0] || 'card',
      purchaseDate: admin.firestore.Timestamp.now()
    };

    await updateUserInsurance(userId, insuranceData);
    await logInsurance(userId, insuranceData);

    logger.info('Insurance payment succeeded', { paymentIntentId: paymentIntent.id, userId, amount: insuranceData.amount });
  }
}

/**
 * Manejar fallo de pago
 */
async function handlePaymentFailed(paymentIntent) {
  const userId = paymentIntent.metadata.userId;

  if (!userId) {
    logger.error('No userId in payment metadata', { paymentIntentId: paymentIntent.id });
    return;
  }

  logger.warn('Payment failed', {
    paymentIntentId: paymentIntent.id,
    userId,
    errorCode: paymentIntent.last_payment_error?.code
  });

  // Registrar pago fallido
  await logFailedPayment(userId, {
    paymentId: paymentIntent.id,
    provider: 'stripe',
    type: paymentIntent.metadata.type || 'unknown',
    amount: paymentIntent.amount / 100, // Stripe usa centavos
    currency: paymentIntent.currency.toUpperCase(),
    reason: paymentIntent.status,
    errorCode: paymentIntent.last_payment_error?.code || null,
    errorMessage: paymentIntent.last_payment_error?.message || null,
    metadata: {
      customerId: paymentIntent.customer,
      paymentMethod: paymentIntent.payment_method
    }
  });

  // Notificar al usuario
  await createUserNotification(userId, {
    title: 'Problema con tu pago',
    message: 'No pudimos procesar tu pago. Por favor, verifica tu método de pago o intenta con otro.',
    type: 'error',
    actionUrl: '/webapp/cuenta-pagos.html',
    actionLabel: 'Actualizar método de pago',
    metadata: {
      paymentIntentId: paymentIntent.id,
      errorCode: paymentIntent.last_payment_error?.code
    }
  });

  logger.info('Payment failure notification sent', { userId, paymentIntentId: paymentIntent.id });
}

/**
 * Manejar fallo de pago de invoice (subscription renewal)
 */
async function handleInvoicePaymentFailed(invoice) {
  const subscriptionId = invoice.subscription;

  if (!subscriptionId) return;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const userId = subscription.metadata.userId;

  if (!userId) return;

  await updateUserMembership(userId, 'past_due');

  logger.warn('Invoice payment failed', { userId, invoiceId: invoice.id, subscriptionId });

  // Registrar pago fallido
  await logFailedPayment(userId, {
    paymentId: invoice.id,
    provider: 'stripe',
    type: 'subscription',
    amount: invoice.amount_due / 100,
    currency: invoice.currency.toUpperCase(),
    reason: 'invoice_payment_failed',
    errorCode: invoice.last_finalization_error?.code || null,
    errorMessage: invoice.last_finalization_error?.message || null,
    metadata: {
      subscriptionId: subscriptionId,
      attempt_count: invoice.attempt_count,
      next_payment_attempt: invoice.next_payment_attempt
    }
  });

  // Notificar al usuario
  await createUserNotification(userId, {
    title: 'Renovación de membresía fallida',
    message: `No pudimos procesar la renovación de tu membresía (€${(invoice.amount_due / 100).toFixed(2)}). Tu cuenta está en estado "vencido". Por favor, actualiza tu método de pago para mantener el acceso.`,
    type: 'error',
    actionUrl: '/webapp/cuenta-pagos.html',
    actionLabel: 'Actualizar método de pago',
    metadata: {
      invoiceId: invoice.id,
      subscriptionId: subscriptionId,
      attemptCount: invoice.attempt_count
    }
  });

  logger.info('Invoice payment failure notification sent', { userId, invoiceId: invoice.id });
}

/**
 * Manejar pago exitoso de invoice
 */
async function handleInvoicePaymentSucceeded(invoice) {
  const subscriptionId = invoice.subscription;

  if (!subscriptionId) return;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const userId = subscription.metadata.userId;

  if (!userId) return;

  logger.info('Invoice payment succeeded', { userId, invoiceId: invoice.id, subscriptionId });

  // La suscripción ya se actualizará con customer.subscription.updated
}

// ============================================================================
// PAYPAL HELPERS: Webhook signature verification
// ============================================================================

/**
 * Verificar firma de webhook de PayPal
 * @param {Object} req - Express request object
 * @returns {Promise<boolean>} - true si la firma es válida
 */
async function verifyPayPalWebhookSignature(req) {
  try {
    // PayPal webhook headers
    const transmissionId = req.headers['paypal-transmission-id'];
    const transmissionTime = req.headers['paypal-transmission-time'];
    const transmissionSig = req.headers['paypal-transmission-sig'];
    const certUrl = req.headers['paypal-cert-url'];
    const authAlgo = req.headers['paypal-auth-algo'];

    // PayPal webhook ID (debe configurarse en Firebase config)
    const webhookId = functionsConfig?.paypal?.webhook_id || process.env.PAYPAL_WEBHOOK_ID;

    if (!webhookId) {
      logger.error('PayPal webhook ID not configured');
      logger.error('Configuration', { message: 'Run: firebase functions:config:set paypal.webhook_id="YOUR_WEBHOOK_ID"' });
      return false;
    }

    if (!transmissionId || !transmissionTime || !transmissionSig || !certUrl || !authAlgo) {
      logger.error('Missing required PayPal webhook headers');
      return false;
    }

    // Construir request de verificación según documentación PayPal
    // https://developer.paypal.com/api/rest/webhooks/rest/#verify-webhook-signature
    const verifyRequest = {
      transmission_id: transmissionId,
      transmission_time: transmissionTime,
      transmission_sig: transmissionSig,
      cert_url: certUrl,
      auth_algo: authAlgo,
      webhook_id: webhookId,
      webhook_event: req.body
    };

    // PayPal API credentials
    const paypalMode = functionsConfig?.paypal?.mode || process.env.PAYPAL_MODE || 'sandbox';
    const paypalClientId = functionsConfig?.paypal?.client_id || process.env.PAYPAL_CLIENT_ID;
    const paypalSecret = functionsConfig?.paypal?.secret || process.env.PAYPAL_SECRET;

    if (!paypalClientId || !paypalSecret) {
      logger.error('PayPal credentials not configured');
      return false;
    }

    // Obtener access token de PayPal
    const authUrl = paypalMode === 'live'
      ? 'https://api-m.paypal.com/v1/oauth2/token'
      : 'https://api-m.sandbox.paypal.com/v1/oauth2/token';

    const authResponse = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${paypalClientId}:${paypalSecret}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });

    if (!authResponse.ok) {
      logger.error('Failed to get PayPal access token', { status: authResponse.status });
      return false;
    }

    const authData = await authResponse.json();
    const accessToken = authData.access_token;

    // Verificar firma del webhook
    const verifyUrl = paypalMode === 'live'
      ? 'https://api-m.paypal.com/v1/notifications/verify-webhook-signature'
      : 'https://api-m.sandbox.paypal.com/v1/notifications/verify-webhook-signature';

    const verifyResponse = await fetch(verifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(verifyRequest)
    });

    if (!verifyResponse.ok) {
      logger.error('PayPal verification request failed', { status: verifyResponse.status });
      return false;
    }

    const verifyData = await verifyResponse.json();

    // Resultado de verificación
    if (verifyData.verification_status === 'SUCCESS') {
      logger.debug('PayPal webhook signature verified successfully');
      return true;
    } else {
      logger.error('PayPal signature verification failed', { status: verifyData.verification_status });
      return false;
    }
  } catch (error) {
    logger.error('Error verifying PayPal webhook signature', { error: error.message });
    return false;
  }
}

// ============================================================================
// 7) PAYPAL WEBHOOK: Manejar eventos de PayPal (subscriptions y payments)
// ============================================================================
exports.paypalWebhook = functions.https.onRequest(async (req, res) => {
  return res.status(503).json({ error: 'payments_disabled', provider: 'paypal' });
});

// Legacy implementation retained for future enablement
/*
exports.paypalWebhook = functions.https.onRequest(async (req, res) => {
  const event = req.body;
  const eventId = event.id;
  const eventType = event.event_type;

  logger.info('PayPal webhook received', {
    eventId,
    eventType,
    resourceType: event.resource_type
  });

  const db = admin.firestore();

  try {
    // ⚠️ CRITICAL SECURITY: Verificar firma de PayPal webhook
    // https://developer.paypal.com/docs/api-basics/notifications/webhooks/notification-messages/#verify-webhook-signature
    const isValidSignature = await verifyPayPalWebhookSignature(req);

    if (!isValidSignature) {
      logger.error('PayPal webhook signature verification failed - potential fraud');
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid webhook signature'
      });
    }

    logger.info('PayPal webhook signature verified');

    // ============================================================================
    // IDEMPOTENCIA: Verificar si ya procesamos este evento
    // ============================================================================
    const webhookRef = db.collection('processed_webhooks').doc(`paypal_${eventId}`);
    const webhookDoc = await webhookRef.get();

    if (webhookDoc.exists) {
      logger.info('PayPal webhook already processed (duplicate)', {
        eventId,
        eventType,
        processedAt: webhookDoc.data().processedAt?.toDate()
      });
      return res.json({ received: true, duplicate: true });
    }

    // Procesar el evento
    switch (eventType) {
      // ========== SUBSCRIPTION EVENTS ==========
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
        await handlePayPalSubscriptionActivated(event.resource);
        break;

      case 'BILLING.SUBSCRIPTION.UPDATED':
        await handlePayPalSubscriptionUpdated(event.resource);
        break;

      case 'BILLING.SUBSCRIPTION.CANCELLED':
      case 'BILLING.SUBSCRIPTION.SUSPENDED':
        await handlePayPalSubscriptionCanceled(event.resource);
        break;

      // ========== PAYMENT EVENTS ==========
      case 'PAYMENT.SALE.COMPLETED':
        await handlePayPalPaymentCompleted(event.resource);
        break;

      case 'PAYMENT.SALE.DENIED':
      case 'PAYMENT.SALE.REFUNDED':
        await handlePayPalPaymentFailed(event.resource);
        break;

      default:
        logger.debug('Unhandled PayPal webhook event type', { eventType });
    }

    // Marcar como procesado DESPUÉS de procesamiento exitoso
    await webhookRef.set({
      eventId,
      eventType,
      provider: 'paypal',
      resourceType: event.resource_type,
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: event.create_time ? admin.firestore.Timestamp.fromDate(new Date(event.create_time)) : admin.firestore.FieldValue.serverTimestamp()
    });

    logger.info('PayPal webhook processed successfully', { eventId, eventType });
    res.json({ received: true });

  } catch (error) {
    logger.error('Error processing PayPal webhook', error, {
      eventId,
      eventType
    });
    // Retornar 200 para evitar reintentos infinitos en errores no críticos
    res.status(200).json({ received: true, error: error.message });
  }
});
*/

/**
 * Manejar activación de suscripción PayPal
 */
async function handlePayPalSubscriptionActivated(subscription) {
  const userId = subscription.custom_id; // Debe incluirse al crear la suscripción

  if (!userId) {
    logger.error('No userId in PayPal subscription custom_id', { subscriptionId: subscription.id });
    return;
  }

  const subscriptionData = {
    subscriptionId: subscription.id,
    plan: 'monthly',
    amount: parseFloat(subscription.billing_info?.last_payment?.amount?.value || 29.99),
    currency: subscription.billing_info?.last_payment?.amount?.currency_code || 'EUR',
    status: 'active',
    currentPeriodStart: admin.firestore.Timestamp.now(),
    currentPeriodEnd: admin.firestore.Timestamp.fromDate(new Date(subscription.billing_info.next_billing_time))
  };

  await updateUserMembership(userId, 'active', {
    subscriptionId: subscription.id,
    startDate: subscriptionData.currentPeriodStart,
    endDate: subscriptionData.currentPeriodEnd
  });

  await logSubscription(userId, subscriptionData);

  logger.info('PayPal subscription activated', { subscriptionId: subscription.id, userId });

  // Process referral reward
  try {
    await processReferralReward(userId, 'paypal');
  } catch (e) {
    logger.error('Error processing referral reward (PayPal)', { userId, error: e.message });
  }
}

/**
 * Manejar actualización de suscripción PayPal
 */
async function handlePayPalSubscriptionUpdated(subscription) {
  // Similar a activated
  await handlePayPalSubscriptionActivated(subscription);
}

/**
 * Manejar cancelación/suspensión de suscripción PayPal
 */
async function handlePayPalSubscriptionCanceled(subscription) {
  const userId = subscription.custom_id;

  if (!userId) {
    logger.error('No userId in PayPal subscription custom_id (cancel)', { subscriptionId: subscription.id });
    return;
  }

  await updateUserMembership(userId, 'canceled');

  const db = admin.firestore();
  await db.collection('subscriptions').doc(subscription.id).update({
    status: 'canceled',
    canceledAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  logger.info('PayPal subscription canceled', { subscriptionId: subscription.id, userId });
}

/**
 * Manejar pago completado PayPal (Insurance - one-time)
 */
async function handlePayPalPaymentCompleted(sale) {
  const userId = sale.custom; // Debe incluirse al crear el pago
  const paymentType = sale.description; // 'insurance' or 'membership'

  if (!userId) {
    logger.error('No userId in PayPal payment custom field', { saleId: sale.id });
    return;
  }

  if (paymentType === 'insurance') {
    const insuranceData = {
      paymentId: sale.id,
      amount: parseFloat(sale.amount.total),
      currency: sale.amount.currency,
      status: 'completed',
      paymentMethod: 'paypal',
      purchaseDate: admin.firestore.Timestamp.now()
    };

    await updateUserInsurance(userId, insuranceData);
    await logInsurance(userId, insuranceData);

    logger.info('PayPal insurance payment completed', { saleId: sale.id, userId, amount: insuranceData.amount });
  }
}

/**
 * Manejar fallo/reembolso de pago PayPal
 */
async function handlePayPalPaymentFailed(sale) {
  const userId = sale.custom;

  if (!userId) {
    logger.error('No userId in PayPal payment custom field (failed)', { saleId: sale.id });
    return;
  }

  logger.warn('PayPal payment failed', { saleId: sale.id, userId, reasonCode: sale.reason_code });

  // Registrar pago fallido
  await logFailedPayment(userId, {
    paymentId: sale.id,
    provider: 'paypal',
    type: 'sale',
    amount: parseFloat(sale.amount?.total || 0),
    currency: sale.amount?.currency || 'EUR',
    reason: sale.state || 'denied',
    errorCode: null,
    errorMessage: sale.reason_code || 'Payment denied or refunded',
    metadata: {
      createTime: sale.create_time,
      updateTime: sale.update_time,
      reasonCode: sale.reason_code
    }
  });

  // Notificar al usuario
  await createUserNotification(userId, {
    title: 'Problema con tu pago de PayPal',
    message: 'No pudimos procesar tu pago con PayPal. Por favor, verifica tu cuenta de PayPal o intenta con otro método de pago.',
    type: 'error',
    actionUrl: '/webapp/cuenta-pagos.html',
    actionLabel: 'Ver métodos de pago',
    metadata: {
      saleId: sale.id,
      reasonCode: sale.reason_code
    }
  });

  logger.info('PayPal payment failure notification sent', { userId, saleId: sale.id });
}

// ============================================================================
// PAYPAL AUTHORIZATION MANAGEMENT (Insurance Hold/Capture/Void)
// ============================================================================

/**
 * Helper: Obtener access token de PayPal con caché
 * Los tokens de PayPal duran ~9 horas. Cachear reduce llamadas a API.
 */
async function getPayPalAccessToken() {
  const now = Date.now();

  // Verificar si tenemos un token válido en caché
  if (paypalTokenCache.token && paypalTokenCache.expiresAt && paypalTokenCache.expiresAt > now) {
    logger.debug('Using cached PayPal token', {
      expiresIn: Math.round((paypalTokenCache.expiresAt - now) / 1000) + 's'
    });
    return paypalTokenCache.token;
  }

  logger.info('Fetching new PayPal access token');

  const paypalMode = functionsConfig?.paypal?.mode || process.env.PAYPAL_MODE || 'sandbox';
  const paypalClientId = functionsConfig?.paypal?.client_id || process.env.PAYPAL_CLIENT_ID;
  const paypalSecret = functionsConfig?.paypal?.secret || process.env.PAYPAL_SECRET;

  if (!paypalClientId || !paypalSecret) {
    throw new Error('PayPal credentials not configured');
  }

  const authUrl = paypalMode === 'live'
    ? 'https://api-m.paypal.com/v1/oauth2/token'
    : 'https://api-m.sandbox.paypal.com/v1/oauth2/token';

  const auth = Buffer.from(`${paypalClientId}:${paypalSecret}`).toString('base64');

  const response = await axios.post(authUrl, 'grant_type=client_credentials', {
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    timeout: 10000 // 10 segundos timeout
  });

  const accessToken = response.data.access_token;
  const expiresIn = response.data.expires_in || 32400; // Default: 9 horas (32400 segundos)

  // Guardar en caché con 5 minutos de margen de seguridad
  const safetyMargin = 300000; // 5 minutos en milisegundos
  paypalTokenCache.token = accessToken;
  paypalTokenCache.expiresAt = now + (expiresIn * 1000) - safetyMargin;

  logger.info('PayPal token cached', {
    expiresIn: expiresIn + 's',
    cacheExpiresAt: new Date(paypalTokenCache.expiresAt).toISOString()
  });

  return accessToken;
}

/**
 * Callable Function: Capturar autorización de seguro anti-plantón
 * Se llama cuando un usuario planta a otro en una cita
 *
 * @param {object} data - { authorizationId: string, appointmentId: string, reason: string }
 * @param {object} context - Firebase auth context
 */
exports.captureInsuranceAuthorization = functions.https.onCall(async (data, context) => {
  // 1. Verificar autenticación
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Must be authenticated to capture insurance authorization'
    );
  }

  const { authorizationId, appointmentId, victimUserId } = data;

  if (!authorizationId || !appointmentId || !victimUserId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'authorizationId, appointmentId, and victimUserId are required'
    );
  }

  try {
    logger.info('Starting insurance authorization capture', { authorizationId, appointmentId, victimUserId });

    const db = admin.firestore();

    // 2. Verificar que la cita existe y el usuario es parte de ella
    const appointmentDoc = await db.collection('appointments').doc(appointmentId).get();
    if (!appointmentDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Appointment not found');
    }

    const appointment = appointmentDoc.data();
    const participants = appointment.participants || [];

    // Verificar que victimUserId es parte de la cita
    if (!participants.includes(victimUserId)) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Victim user is not part of this appointment'
      );
    }

    // 3. Obtener access token de PayPal
    const accessToken = await getPayPalAccessToken();

    // 4. Capturar la autorización
    const paypalMode = functions.config().paypal?.mode || process.env.PAYPAL_MODE || 'sandbox';
    const captureUrl = paypalMode === 'live'
      ? `https://api-m.paypal.com/v2/payments/authorizations/${authorizationId}/capture`
      : `https://api-m.sandbox.paypal.com/v2/payments/authorizations/${authorizationId}/capture`;

    const captureResponse = await axios.post(
      captureUrl,
      {
        final_capture: true, // Esta es la captura final
        note_to_payer: 'Compensación por plantón en TuCitaSegura',
        soft_descriptor: 'TCS-PLANTON'
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    const captureData = captureResponse.data;
    logger.info('Insurance capture successful', { captureId: captureData.id, authorizationId });

    // 5. Obtener el usuario que plantó (quien tiene la autorización)
    const ghosterId = participants.find(uid => uid !== victimUserId);

    // 6. Actualizar Firestore - Usuario que plantó
    await db.collection('users').doc(ghosterId).update({
      insuranceStatus: 'captured',
      insuranceCaptureId: captureData.id,
      insuranceCaptureDate: admin.firestore.FieldValue.serverTimestamp(),
      insuranceCaptureReason: 'no_show',
      insuranceCaptureAppointmentId: appointmentId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // 7. Registrar la captura en colección de insurance_captures
    await db.collection('insurance_captures').add({
      ghosterId: ghosterId,
      victimId: victimUserId,
      appointmentId: appointmentId,
      authorizationId: authorizationId,
      captureId: captureData.id,
      amount: 120,
      currency: 'EUR',
      status: captureData.status,
      reason: 'no_show',
      capturedAt: admin.firestore.FieldValue.serverTimestamp(),
      paypalResponse: captureData
    });

    // 8. Actualizar el appointment con la información de captura
    await db.collection('appointments').doc(appointmentId).update({
      insuranceCaptured: true,
      insuranceCaptureId: captureData.id,
      ghosterId: ghosterId,
      victimId: victimUserId,
      capturedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // 9. Notificar a ambos usuarios
    await createUserNotification(ghosterId, {
      title: 'Cargo por plantón',
      message: 'Se han cobrado €120 de tu retención por no asistir a la cita confirmada. Tu reputación ha sido afectada.',
      type: 'warning',
      actionUrl: `/webapp/cita-detalle.html?id=${appointmentId}`,
      actionLabel: 'Ver detalles',
      metadata: {
        appointmentId,
        captureId: captureData.id
      }
    });

    await createUserNotification(victimUserId, {
      title: 'Compensación recibida',
      message: 'Tu cita no se presentó. Se ha procesado la compensación de €120 por el plantón.',
      type: 'success',
      actionUrl: `/webapp/cita-detalle.html?id=${appointmentId}`,
      actionLabel: 'Ver detalles',
      metadata: {
        appointmentId,
        captureId: captureData.id
      }
    });

    logger.info('Insurance authorization capture completed', { appointmentId, captureId: captureData.id, ghosterId, victimUserId });

    return {
      success: true,
      captureId: captureData.id,
      status: captureData.status,
      amount: 120,
      currency: 'EUR'
    };

  } catch (error) {
    logger.error('Error capturing insurance authorization', {
      authorizationId,
      appointmentId,
      error: error.response?.data || error.message
    });

    // Log del error
    const db = admin.firestore();
    await db.collection('payment_errors').add({
      type: 'insurance_capture',
      authorizationId,
      appointmentId,
      error: error.response?.data || error.message,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    throw new functions.https.HttpsError(
      'internal',
      `Failed to capture insurance authorization: ${error.response?.data?.message || error.message}`
    );
  }
});

/**
 * Callable Function: Liberar (void) autorización de seguro anti-plantón
 * Se llama cuando ambos usuarios llegan a la cita, o cuando se cancela la cuenta
 *
 * @param {object} data - { authorizationId: string, reason: 'successful_date' | 'account_cancelled' }
 * @param {object} context - Firebase auth context
 */
exports.voidInsuranceAuthorization = functions.https.onCall(async (data, context) => {
  // 1. Verificar autenticación
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Must be authenticated to void insurance authorization'
    );
  }

  const { authorizationId, userId, reason } = data;

  if (!authorizationId || !userId || !reason) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'authorizationId, userId, and reason are required'
    );
  }

  // Validar que el reason es correcto
  const validReasons = ['successful_date', 'account_cancelled', 'mutual_cancellation'];
  if (!validReasons.includes(reason)) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      `reason must be one of: ${validReasons.join(', ')}`
    );
  }

  try {
    logger.info('Starting insurance authorization void', { authorizationId, userId, reason });

    const db = admin.firestore();

    // 2. Verificar que el usuario existe y tiene esta autorización
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'User not found');
    }

    const userData = userDoc.data();
    if (userData.insuranceAuthorizationId !== authorizationId) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Authorization ID does not match user record'
      );
    }

    // 3. Obtener access token de PayPal
    const accessToken = await getPayPalAccessToken();

    // 4. Anular (void) la autorización
    const paypalMode = functions.config().paypal?.mode || process.env.PAYPAL_MODE || 'sandbox';
    const voidUrl = paypalMode === 'live'
      ? `https://api-m.paypal.com/v2/payments/authorizations/${authorizationId}/void`
      : `https://api-m.sandbox.paypal.com/v2/payments/authorizations/${authorizationId}/void`;

    const voidResponse = await axios.post(
      voidUrl,
      {},
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    logger.info('Insurance authorization void successful', { authorizationId, userId });

    // 5. Actualizar Firestore
    await db.collection('users').doc(userId).update({
      insuranceStatus: 'voided',
      insuranceVoidDate: admin.firestore.FieldValue.serverTimestamp(),
      insuranceVoidReason: reason,
      hasAntiGhostingInsurance: false, // Ya no tiene seguro activo
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // 6. Registrar el void en colección
    await db.collection('insurance_voids').add({
      userId: userId,
      authorizationId: authorizationId,
      reason: reason,
      voidedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // 7. Notificar al usuario
    let notificationMessage = '';
    if (reason === 'successful_date') {
      notificationMessage = 'Tu cita fue exitosa. La retención de €120 permanece activa para futuras citas.';
    } else if (reason === 'account_cancelled') {
      notificationMessage = 'Tu cuenta ha sido cancelada y la retención de €120 ha sido liberada.';
    } else if (reason === 'mutual_cancellation') {
      notificationMessage = 'La cita fue cancelada de mutuo acuerdo. La retención permanece activa.';
    }

    await createUserNotification(userId, {
      title: 'Retención de seguro actualizada',
      message: notificationMessage,
      type: 'info',
      actionUrl: '/webapp/cuenta-pagos.html',
      actionLabel: 'Ver estado de pago',
      metadata: {
        reason,
        authorizationId
      }
    });

    logger.info('Insurance authorization void completed', { userId, reason, authorizationId });

    return {
      success: true,
      status: 'voided',
      reason: reason
    };

  } catch (error) {
    logger.error('Error voiding insurance authorization', {
      authorizationId,
      userId,
      error: error.response?.data || error.message
    });

    // Si el error es que la autorización ya expiró (esto es normal después de 29 días)
    if (error.response?.status === 422 || error.response?.data?.name === 'AUTHORIZATION_VOIDED') {
      logger.info('Authorization already voided or expired - updating user record', { authorizationId, userId });

      const db = admin.firestore();
      await db.collection('users').doc(userId).update({
        insuranceStatus: 'expired',
        insuranceVoidDate: admin.firestore.FieldValue.serverTimestamp(),
        insuranceVoidReason: 'auto_expired',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return {
        success: true,
        status: 'expired',
        message: 'Authorization already voided or expired'
      };
    }

    // Log del error
    const db = admin.firestore();
    await db.collection('payment_errors').add({
      type: 'insurance_void',
      authorizationId,
      userId,
      error: error.response?.data || error.message,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    throw new functions.https.HttpsError(
      'internal',
      `Failed to void insurance authorization: ${error.response?.data?.message || error.message}`
    );
  }
});

/**
 * Callable Function: Obtener estado de autorización desde PayPal
 * Útil para verificar si la autorización sigue activa
 */
exports.getInsuranceAuthorizationStatus = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const { authorizationId } = data;

  if (!authorizationId) {
    throw new functions.https.HttpsError('invalid-argument', 'authorizationId is required');
  }

  try {
    const accessToken = await getPayPalAccessToken();

    const paypalMode = functions.config().paypal?.mode || process.env.PAYPAL_MODE || 'sandbox';
    const getUrl = paypalMode === 'live'
      ? `https://api-m.paypal.com/v2/payments/authorizations/${authorizationId}`
      : `https://api-m.sandbox.paypal.com/v2/payments/authorizations/${authorizationId}`;

    const response = await axios.get(getUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    return {
      success: true,
      status: response.data.status,
      amount: response.data.amount,
      createTime: response.data.create_time,
      expirationTime: response.data.expiration_time
    };

  } catch (error) {
    logger.error('Error getting insurance authorization status', {
      authorizationId,
      error: error.response?.data || error.message
    });
    throw new functions.https.HttpsError(
      'internal',
      `Failed to get authorization status: ${error.response?.data?.message || error.message}`
    );
  }
});

// ============================================================================
// PUSH NOTIFICATIONS
// ============================================================================
// Import notification functions from notifications.js

const notifications = require('./notifications');
const freeMembershipAnnouncement = require('./send-free-membership-announcement');

// Export notification functions
exports.onMatchCreated = notifications.onMatchCreated;
exports.onMatchAccepted = notifications.onMatchAccepted;
exports.onMessageCreated = notifications.onMessageCreated;
exports.onAppointmentConfirmed = notifications.onAppointmentConfirmed;
exports.sendAppointmentReminders = notifications.sendAppointmentReminders;
exports.onVIPEventPublished = notifications.onVIPEventPublished;
exports.onSOSAlert = notifications.onSOSAlert;
exports.sendTestNotification = notifications.sendTestNotification;
exports.sendFreeMembershipAnnouncement = freeMembershipAnnouncement.sendFreeMembershipAnnouncement;

// Admin functions
const zombieUsers = require('./zombie-users');
exports.listZombieUsers = zombieUsers.listZombieUsers;
exports.cleanupZombieUsers = zombieUsers.cleanupZombieUsers;

// ============================================================================
// FRAUD DETECTION
// ============================================================================
const fraudDetection = require('./fraud-detection');

exports.analyzeFraud = fraudDetection.analyzeFraud;
exports.onUserCreatedAnalyzeFraud = fraudDetection.onUserCreatedAnalyzeFraud;
exports.scheduledFraudAnalysis = fraudDetection.scheduledFraudAnalysis;

// ============================================================================
// HEALTH CHECKS
// ============================================================================
const healthCheck = require('./health-check');

exports.health = healthCheck.health;
exports.healthDetailed = healthCheck.healthDetailed;
exports.ready = healthCheck.ready;
exports.alive = healthCheck.alive;

// ============================================================================
// RECAPTCHA ENTERPRISE VERIFICATION
// ============================================================================
const recaptchaEnterprise = require('./recaptcha-enterprise');

exports.verifyRecaptcha = recaptchaEnterprise.verifyRecaptcha;
exports.verifyRecaptchaCallable = recaptchaEnterprise.verifyRecaptchaCallable;
exports.verifyRecaptchaV1 = recaptchaEnterprise.verifyRecaptchaV1;

// ============================================================================
// APPCHECK MONITORING: Recibir reportes de fallos desde frontend
// ============================================================================
exports.reportAppCheckFailure = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  try {
    const { errorCode, message, hostname, userAgent, path } = req.body || {};
    const db = admin.firestore();
    await db.collection('appcheck_failures').add({
      errorCode: errorCode || 'unknown',
      message: message || 'unknown',
      hostname: hostname || null,
      userAgent: userAgent || null,
      path: path || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    logger.warn('AppCheck failure reported', { errorCode, hostname, path });
    return res.status(200).json({ success: true });
  } catch (e) {
    logger.error('Error reporting AppCheck failure', { error: e.message });
    return res.status(500).json({ error: 'internal_error' });
  }
});

// ============================================================================
// 8) ADMIN ACTIONS: Toggle User Status (Ban/Unban)
// ============================================================================
exports.toggleUserStatus = functions.https.onCall(async (data, context) => {
  // 1. Verify Authentication & Admin Role
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Debes estar autenticado para realizar esta acción.'
    );
  }

  if (context.auth.token.role !== 'admin' && context.auth.uid !== 'Y1rNgj4KYpWSFlPqgrpAaGuAk033') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Acceso denegado: Solo administradores pueden realizar esta acción.'
    );
  }

  const { userId, disable } = data;

  if (!userId) {
    throw new functions.https.HttpsError('invalid-argument', 'Falta el userId.');
  }

  // 2. Perform Actions
  try {
    // A. Toggle Auth Status (Prevents login)
    await admin.auth().updateUser(userId, {
      disabled: disable
    });

    // B. Update Firestore (For UI reflection)
    // We update 'disabled' field and also 'status' for redundancy/clarity
    const userRef = admin.firestore().collection('users').doc(userId);
    await userRef.update({
      disabled: disable,
      accountStatus: disable ? 'suspended' : 'active',
      lastAdminUpdate: admin.firestore.FieldValue.serverTimestamp(),
      adminUpdateBy: context.auth.uid
    });

    // C. Log Action
    logger.info(`User ${userId} ${disable ? 'BANNED' : 'UNBANNED'} by ${context.auth.uid}`);

    return {
      success: true,
      message: `Usuario ${disable ? 'bloqueado' : 'desbloqueado'} exitosamente.`,
      userId: userId,
      disabled: disable
    };

  } catch (error) {
    logger.error('Error toggling user status:', error);
    throw new functions.https.HttpsError('internal', 'Error interno al actualizar estado del usuario.');
  }
});

// ============================================================================
// 9) REFERRAL ANNOUNCEMENT (Email + Notification)
// ============================================================================
exports.announceReferralFeature = functions.https.onRequest(async (req, res) => {
  // Check migration secret (Hardcoded for reliability if env missing)
  const secret = req.query.secret;
  // Previously process.env.MIGRATION_SECRET_2024
  if (secret !== 'MIGRATION_SECRET_2024') {
    return res.status(403).send('Forbidden');
  }

  const dryRun = req.query.dryRun === 'false' ? false : true;
  const db = admin.firestore();

  try {
    // Query users (Female only or all? User said females earn money, but usually everyone can refer.
    // However, the feature "Invita y Gana" is specifically for girls in the dashboard.
    // Let's target females as per previous context.)
    const snapshot = await db.collection('users')
      .where('gender', '==', 'femenino')
      // .limit(50) // Batching if needed
      .get();

    logger.info(`Found ${snapshot.size} female users for announcement. DryRun: ${dryRun}`);

    let emailsSent = 0;
    let notifsSent = 0;
    let missingEmail = 0;
    let smtpErrors = 0;
    let lastError = null;

    // Debug Config (Safe)
    const config = functions.config().smtp || {};
    const hasConfig = !!(config.host && config.user && config.pass);

    for (const doc of snapshot.docs) {
      const user = doc.data();
      const userId = doc.id;
      const email = user.email;

      if (!dryRun) {
        // 1. In-App Notification
        await createUserNotification(userId, {
          title: '¡Nueva función: Invita y Gana!',
          message: 'Gana 10€ por cada amigo que se suscriba con tu código. Toca para ver tu enlace.',
          type: 'success', // shows mostly green/happy
          actionUrl: '/webapp/dashboard.html',
          actionLabel: 'Ver mi código',
          metadata: { feature: 'referral_launch' }
        });
        notifsSent++;

        // 2. Email Notification
        if (email) {
          const emailHtml = `
            <h2>¡Hola ${user.alias || 'Usuaria'}! 🎁</h2>
            <p>Tenemos una gran noticia: acabamos de lanzar nuestro programa <strong>Invita y Gana</strong>.</p>
            <p>Ahora puedes ganar <strong>10€</strong> por cada amigo que se suscriba a TuCitaSegura usando tu código personal.</p>
            
            <div style="background-color: #fce4ec; padding: 20px; border-radius: 10px; text-align: center; margin: 20px 0;">
                <h3 style="color: #e91e63; margin: 0;">Tu Código: <strong>${user.referralCode || 'Entra para verlo'}</strong></h3>
            </div>

            <p>Entra en tu panel para copiar tu código y empezar a compartir.</p>
            
            <a href="https://tucitasegura-129cc.web.app/webapp/dashboard.html" style="background-color: #e91e63; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Ir a mi Dashboard</a>
            
            <p><small>Si no ves tu código, entra en el dashboard y se generará automáticamente.</small></p>
            `;

          const emailResult = await sendEmail({
            to: email,
            subject: '🎁 Nuevo: Gana 10€ invitando amigos',
            html: emailHtml,
            text: 'Nuevo programa Invita y Gana: Gana 10€ por cada amigo. Entra en tu dashboard para ver tu código.'
          });

          if (emailResult.success) {
            emailsSent++;
          } else {
            smtpErrors++;
            lastError = emailResult.error;
          }
        } else {
          missingEmail++;
        }
      }
    }

    return res.json({
      success: true,
      usersFound: snapshot.size,
      notificationsCreated: notifsSent,
      emailsSent: emailsSent,
      missingEmail: missingEmail,
      smtpErrors: smtpErrors,
      configLoaded: hasConfig,
      lastError: lastError,
      mode: dryRun ? 'DRY RUN (no actions taken)' : 'LIVE'
    });

  } catch (error) {
    logger.error('Error announcing feature:', error);
    return res.status(500).json({ error: error.message });
  }
});

// 10) SEND MARKETING EMAIL (Admin Only)
// ============================================================================
exports.sendMarketingEmail = functions.https.onCall(async (data, context) => {
  // 1. Verify Authentication & Admin Role
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
  }

  const callerUid = context.auth.uid;
  const callerToken = context.auth.token;

  const admins = ['admin@tucitasegura.com', 'cesar.herrera.rojo@gmail.com'];
  const adminUids = ['Y1rNgj4KYpWSFlPqgrpAaGuAk033'];

  if (callerToken.role !== 'admin' && !admins.includes(callerToken.email) && !adminUids.includes(callerUid)) {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can send campaigns.');
  }

  const { target, subject, body, dryRun } = data;

  if (!subject || !body) {
    throw new functions.https.HttpsError('invalid-argument', 'Subject and Body are required.');
  }

  const db = admin.firestore();
  let usersSnapshot;

  try {
    // 2. Query Target Users
    if (target === 'test_me') {
      // Send only to the caller (Admin)
      const userDoc = await db.collection('users').doc(callerUid).get();
      if (!userDoc.exists) throw new Error('Admin profile not found');
      // Create a fake snapshot structure with one doc
      usersSnapshot = { docs: [userDoc], size: 1 };
      logger.info(`Campaign Target: TEST (Admin: ${callerUid})`);
    } else if (target === 'all') {
      usersSnapshot = await db.collection('users').get();
      logger.info(`Campaign Target: ALL (${usersSnapshot.size} users)`);
    } else if (target === 'femenino' || target === 'masculino') {
      usersSnapshot = await db.collection('users').where('gender', '==', target).get();
      logger.info(`Campaign Target: ${target} (${usersSnapshot.size} users)`);
    } else {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid target.');
    }

    // 3. Send Emails
    let emailsSent = 0;
    let errors = 0;

    // Use a loop (for now sequential/simple parallel is fine for <100 users)
    // For production scaling, consider chunking or task queue.
    const promises = usersSnapshot.docs.map(async (doc) => {
      const user = doc.data();
      const email = user.email;

      if (!email) return; // Skip no email

      if (dryRun) {
        // Just simulate
        logger.info(`[DryRun] Would send to: ${email}`);
        emailsSent++;
        return;
      }

      // Construct HTML with simple template
      const fullHtml = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">${subject}</h2>
          <div style="color: #555; line-height: 1.6;">
            ${body.replace(/\n/g, '<br>')}
          </div>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            Enviado por el equipo de TuCitaSegura.<br>
            <a href="https://tucitasegura.com" style="color: #666;">Visitar web</a>
          </p>
        </div>
      `;

      const result = await sendEmail({
        to: email,
        subject: subject,
        html: fullHtml,
        text: body // Fallback text
      });

      if (result.success) {
        emailsSent++;
      } else {
        errors++;
        logger.error(`Failed to send to ${email}:`, result.error);
      }
    });

    await Promise.all(promises);

    return {
      success: true,
      usersFound: usersSnapshot.size,
      emailsSent: emailsSent,
      errors: errors,
      dryRun: dryRun
    };

  } catch (error) {
    logger.error('Campaign Error:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// 11) DELETE USER (Admin - Auth + Firestore)
// ============================================================================
exports.deleteUserComplete = functions.https.onCall(async (data, context) => {
  // 1. Verify Authentication & Admin Role
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
  }

  const callerUid = context.auth.uid;
  const callerToken = context.auth.token;
  const admins = ['admin@tucitasegura.com', 'cesar.herrera.rojo@gmail.com'];
  const adminUids = ['Y1rNgj4KYpWSFlPqgrpAaGuAk033'];

  if (callerToken.role !== 'admin' && !admins.includes(callerToken.email) && !adminUids.includes(callerUid)) {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can delete users.');
  }

  const { targetUserId } = data;
  if (!targetUserId) {
    throw new functions.https.HttpsError('invalid-argument', 'Target User ID is required.');
  }

  try {
    const db = admin.firestore();

    // 2. Delete from Auth
    try {
      await admin.auth().deleteUser(targetUserId);
      logger.info(`✅ Auth user ${targetUserId} deleted.`);
    } catch (authError) {
      if (authError.code === 'auth/user-not-found') {
        logger.warn(`⚠️ Auth user ${targetUserId} not found (might assume already deleted).`);
      } else {
        throw authError;
      }
    }

    // 3. Delete from Firestore (User Document)
    // We also set a 'deleted' flag in case we want soft-delete later or sync issues
    await db.collection('users').doc(targetUserId).delete();
    logger.info(`✅ Firestore doc ${targetUserId} deleted.`);

    return { success: true, message: `User ${targetUserId} fully deleted.` };
  } catch (error) {
    logger.error('Delete User Error:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// ------------------------------------------------------------------
// 8. Admin: Toggle User Verification (Manual)
// ------------------------------------------------------------------
exports.adminToggleVerification = functions.https.onCall(async (data, context) => {
  const callerUid = context.auth ? context.auth.uid : null;
  const callerToken = context.auth ? context.auth.token : null;

  // 1. Verify Admin Access
  const admins = ['admin@tucitasegura.com', 'cesar.herrera.rojo@gmail.com'];
  const adminUids = ['Y1rNgj4KYpWSFlPqgrpAaGuAk033'];

  if (!callerUid || !callerToken || (callerToken.role !== 'admin' && !admins.includes(callerToken.email) && !adminUids.includes(callerUid))) {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can perform this action.');
  }

  const { userId, status } = data; // status: true/false
  if (!userId) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing userId.');
  }

  try {
    // Update Firestore
    await admin.firestore().collection('users').doc(userId).update({
      phoneVerified: status,
      manualVerification: status // Optional flag to track manual overrides
    });

    logger.info(`✅ Admin toggled verification for ${userId} to ${status}`);
    return { success: true };
  } catch (error) {
    logger.error('Error toggling verification:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// ------------------------------------------------------------------
// 9. Admin: Manage Membership (Manual VIP)
// ------------------------------------------------------------------
exports.adminManageMembership = functions.https.onCall(async (data, context) => {
  const callerUid = context.auth ? context.auth.uid : null;
  const callerToken = context.auth ? context.auth.token : null;

  // 1. Verify Admin Access
  const admins = ['admin@tucitasegura.com', 'cesar.herrera.rojo@gmail.com'];
  const adminUids = ['Y1rNgj4KYpWSFlPqgrpAaGuAk033'];

  if (!callerUid || !callerToken || (callerToken.role !== 'admin' && !admins.includes(callerToken.email) && !adminUids.includes(callerUid))) {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can perform this action.');
  }

  const { userId, status } = data; // status: true/false (Grant VIP / Revoke)
  if (!userId) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing userId.');
  }

  try {
    const updates = {};
    if (status) {
      // GRANT VIP
      updates.subscriptionStatus = 'active';
      updates.plan = 'manual_vip'; // Distinct from 'premium' or 'basic'
      updates.subscriptionEndDate = admin.firestore.Timestamp.fromDate(new Date('2099-12-31')); // Forever until revoked
    } else {
      // REVOKE
      updates.subscriptionStatus = 'inactive';
      updates.plan = 'free';
      updates.subscriptionEndDate = admin.firestore.FieldValue.delete();
    }

    await admin.firestore().collection('users').doc(userId).update(updates);

    logger.info(`✅ Admin managed membership for ${userId}. VIP: ${status}`);
    return { success: true };
  } catch (error) {
    logger.error('Error managing membership:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// ------------------------------------------------------------------
// 10. Admin: Send Warning to Incomplete Registrations
// ------------------------------------------------------------------
exports.sendIncompleteRegistrationWarning = functions.https.onCall(async (data, context) => {
  const callerUid = context.auth ? context.auth.uid : null;
  const callerToken = context.auth ? context.auth.token : null;

  // 1. Verify Admin Access
  const admins = ['admin@tucitasegura.com', 'cesar.herrera.rojo@gmail.com'];
  const adminUids = ['Y1rNgj4KYpWSFlPqgrpAaGuAk033'];

  if (!callerUid || !callerToken || (callerToken.role !== 'admin' && !admins.includes(callerToken.email) && !adminUids.includes(callerUid))) {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can perform this action.');
  }

  const { dryRun = true } = data;

  try {
    const db = admin.firestore();

    // Query users without alias (alias is empty, null, or "Sin Alias")
    const usersSnapshot = await db.collection('users')
      .where('alias', 'in', ['', 'Sin Alias'])
      .get();

    const recipients = [];
    usersSnapshot.forEach(doc => {
      const user = doc.data();
      if (user.email) {
        recipients.push({
          email: user.email,
          alias: user.alias || 'Sin Alias'
        });
      }
    });

    logger.info(`Found ${recipients.length} users without alias`);

    if (dryRun) {
      return {
        success: true,
        dryRun: true,
        recipientsCount: recipients.length,
        recipients: recipients.map(r => r.email)
      };
    }

    // Send emails
    const subject = '⚠️ Acción requerida: Completa tu registro en TuCitaSegura';
    const htmlBody = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #ef4444;">⚠️ Acción requerida</h2>
        <p style="color: #333; line-height: 1.6;">
          Hola,
        </p>
        <p style="color: #333; line-height: 1.6;">
          Hemos detectado que tu cuenta en <strong>TuCitaSegura</strong> no se ha completado correctamente (falta el alias/nombre de usuario).
        </p>
        <p style="color: #ef4444; font-weight: bold; line-height: 1.6;">
          Tu cuenta será eliminada en las próximas horas si no completas el registro.
        </p>
        <p style="color: #333; line-height: 1.6;">
          Si tienes problemas para registrarte, contacta con:
        </p>
        <ul style="color: #333; line-height: 1.6;">
          <li>Email: <a href="mailto:admin@tucitasegura.com">admin@tucitasegura.com</a></li>
          <li>Telegram: <a href="https://t.me/pk13L4">@pk13L4</a></li>
        </ul>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #999; font-size: 12px; text-align: center;">
          Enviado por el equipo de TuCitaSegura.<br>
          <a href="https://tucitasegura.com" style="color: #666;">Visitar web</a>
        </p>
      </div>
    `;

    const textBody = `
Hola,

Hemos detectado que tu cuenta en TuCitaSegura no se ha completado correctamente (falta el alias/nombre de usuario).

Tu cuenta será eliminada en las próximas horas si no completas el registro.

Si tienes problemas para registrarte, contacta con:
- Email: admin@tucitasegura.com
- Telegram: @pk13L4

Saludos,
El equipo de TuCitaSegura
    `;

    let emailsSent = 0;
    let errors = 0;

    const promises = recipients.map(async (recipient) => {
      const result = await sendEmail({
        to: recipient.email,
        subject: subject,
        html: htmlBody,
        text: textBody
      });

      if (result.success) {
        emailsSent++;
      } else {
        errors++;
        logger.error(`Failed to send to ${recipient.email}:`, result.error);
      }
    });

    await Promise.all(promises);

    return {
      success: true,
      dryRun: false,
      recipientsCount: recipients.length,
      emailsSent: emailsSent,
      errors: errors
    };

  } catch (error) {
    logger.error('Incomplete Registration Warning Error:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});


// Reminder Email Functions - Append to end of functions/index.js

// ------------------------------------------------------------------
// 13. Scheduled: 1 Hour Profile Reminder
// ------------------------------------------------------------------
exports.scheduledProfileReminder1h = functions.pubsub
  .schedule('every 1 hours')
  .timeZone('Europe/Madrid')
  .onRun(async (context) => {
    logger.info('⏰ Running 1-hour profile reminder...');

    try {
      const db = admin.firestore();
      const oneHourAgo = admin.firestore.Timestamp.fromDate(new Date(Date.now() - 60 * 60 * 1000));

      // Query users created ~1 hour ago without alias
      const usersSnapshot = await db.collection('users')
        .where('createdAt', '>=', oneHourAgo)
        .where('alias', 'in', ['', 'Sin Alias'])
        .get();

      if (usersSnapshot.empty) {
        logger.info('No users to remind (1h)');
        return null;
      }

      const recipients = [];
      usersSnapshot.forEach(doc => {
        const user = doc.data();
        if (user.email && !user.reminderSent1h) {
          recipients.push({ email: user.email, uid: doc.id });
        }
      });

      logger.info(`Sending 1h reminder to ${recipients.length} users`);

      const subject = '¡Completa tu perfil en TuCitaSegura! 🎯';
      const htmlBody = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #3b82f6;">¡Hola! 👋</h2>
          <p style="color: #333; line-height: 1.6;">
            Vemos que te registraste hace poco en <strong>TuCitaSegura</strong>, pero aún no has completado tu perfil.
          </p>
          <p style="color: #333; line-height: 1.6;">
            <strong>¡Completa tu perfil ahora para empezar a hacer matches!</strong>
          </p>
          <a href="https://tucitasegura.com/perfil.html" style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #06b6d4); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0;">
            Completar Mi Perfil
          </a>
          <p style="color: #666; font-size: 14px; line-height: 1.6;">
            Solo te tomará 2 minutos y podrás empezar a conocer gente increíble.
          </p>
        </div>
      `;

      for (const recipient of recipients) {
        await sendEmail({
          to: recipient.email,
          subject: subject,
          html: htmlBody,
          text: 'Completa tu perfil en TuCitaSegura para empezar a hacer matches. Visita: https://tucitasegura.com/perfil.html'
        });

        // Mark as sent
        await db.collection('users').doc(recipient.uid).update({
          reminderSent1h: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      logger.info(`✅ 1h reminders sent: ${recipients.length}`);
      return null;
    } catch (error) {
      logger.error('1h reminder error:', error);
      throw error;
    }
  });

// ------------------------------------------------------------------
// 14. Scheduled: 24 Hour Profile Reminder
// ------------------------------------------------------------------
exports.scheduledProfileReminder24h = functions.pubsub
  .schedule('every 6 hours')
  .timeZone('Europe/Madrid')
  .onRun(async (context) => {
    logger.info('⏰ Running 24-hour profile reminder...');

    try {
      const db = admin.firestore();
      const twentyFourHoursAgo = admin.firestore.Timestamp.fromDate(new Date(Date.now() - 24 * 60 * 60 * 1000));
      const twentyFiveHoursAgo = admin.firestore.Timestamp.fromDate(new Date(Date.now() - 25 * 60 * 60 * 1000));

      // Query users created ~24 hours ago without alias
      const usersSnapshot = await db.collection('users')
        .where('createdAt', '>=', twentyFiveHoursAgo)
        .where('createdAt', '<=', twentyFourHoursAgo)
        .where('alias', 'in', ['', 'Sin Alias'])
        .get();

      if (usersSnapshot.empty) {
        logger.info('No users to remind (24h)');
        return null;
      }

      const recipients = [];
      usersSnapshot.forEach(doc => {
        const user = doc.data();
        if (user.email && !user.reminderSent24h) {
          recipients.push({ email: user.email, uid: doc.id });
        }
      });

      logger.info(`Sending 24h reminder to ${recipients.length} users`);

      const subject = '⏰ Te estás perdiendo conexiones increíbles';
      const htmlBody = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #f59e0b;">¡No te quedes fuera! ⏰</h2>
          <p style="color: #333; line-height: 1.6;">
            Han pasado 24 horas desde que te registraste en <strong>TuCitaSegura</strong> y aún no has completado tu perfil.
          </p>
          <p style="color: #333; line-height: 1.6;">
            <strong>Mientras tanto, otros usuarios están conociendo gente nueva cada día.</strong>
          </p>
          <a href="https://tucitasegura.com/perfil.html" style="display: inline-block; background: linear-gradient(135deg, #f59e0b, #ef4444); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0;">
            Completar Ahora
          </a>
          <p style="color: #666; font-size: 14px; line-height: 1.6;">
            ¿Necesitas ayuda? Contáctanos: <a href="mailto:n8659033@gmail.com">n8659033@gmail.com</a>
          </p>
        </div>
      `;

      for (const recipient of recipients) {
        await sendEmail({
          to: recipient.email,
          subject: subject,
          html: htmlBody,
          text: 'Te estás perdiendo conexiones increíbles. Completa tu perfil en TuCitaSegura: https://tucitasegura.com/perfil.html'
        });

        // Mark as sent
        await db.collection('users').doc(recipient.uid).update({
          reminderSent24h: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      logger.info(`✅ 24h reminders sent: ${recipients.length}`);
      return null;
    } catch (error) {
      logger.error('24h reminder error:', error);
      throw error;
    }
  });

// ------------------------------------------------------------------
// 15. Scheduled: Weekly Cleanup Warning (Tuesday 12:00)
// ------------------------------------------------------------------
exports.scheduledCleanupWarning = functions.pubsub
  .schedule('every tuesday 12:00')
  .timeZone('Europe/Madrid')
  .onRun(async (context) => {
    logger.info('⏰ Running weekly cleanup warning (Tuesday)...');

    try {
      const db = admin.firestore();
      // Buscar usuarios con más de 24h de antigüedad para evitar avisar a recién registrados hoy
      const oneDayAgo = admin.firestore.Timestamp.fromDate(new Date(Date.now() - 24 * 60 * 60 * 1000));

      const usersSnapshot = await db.collection('users')
        .where('createdAt', '<=', oneDayAgo)
        .where('alias', 'in', ['', 'Sin Alias'])
        .get();

      if (usersSnapshot.empty) {
        logger.info('No users to warn for cleanup');
        return null;
      }

      const recipients = [];
      usersSnapshot.forEach(doc => {
        const user = doc.data();
        if (user.email && !user.cleanupWarningSentAt) {
          recipients.push({ email: user.email, uid: doc.id });
        }
      });

      logger.info(`Sending cleanup warning to ${recipients.length} users`);

      const subject = '🚨 IMPORTANTE: Tu cuenta será eliminada mañana';
      const htmlBody = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #ef4444;">🚨 Aviso Final de Eliminación</h2>
          <p style="color: #333; line-height: 1.6;">
            Tu perfil en <strong>TuCitaSegura</strong> sigue incompleto.
          </p>
          <p style="color: #ef4444; font-weight: bold; line-height: 1.6;">
            ⚠️ Tu cuenta y todos tus datos serán eliminados permanentemente mañana Miércoles a las 06:00 AM.
          </p>
          <p style="color: #333; line-height: 1.6;">
            Para evitarlo, simplemente completa tu Alias en tu perfil ahora mismo.
          </p>
          <a href="https://tucitasegura.com/perfil.html" style="display: inline-block; background: linear-gradient(135deg, #ef4444, #dc2626); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0;">
            Salvar Mi Cuenta
          </a>
        </div>
      `;

      for (const recipient of recipients) {
        await sendEmail({
          to: recipient.email,
          subject: subject,
          html: htmlBody,
          text: 'AVISO FINAL: Tu cuenta será eliminada mañana miércoles a las 06:00 si no completas tu perfil. Entra en https://tucitasegura.com/perfil.html'
        });

        await db.collection('users').doc(recipient.uid).update({
          cleanupWarningSentAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      logger.info(`✅ Cleanup warnings sent: ${recipients.length}`);
      return null;
    } catch (error) {
      logger.error('Cleanup warning error:', error);
      throw error;
    }
  });

// ------------------------------------------------------------------
// 16. Scheduled: Weekly Cleanup Execution (Sunday 04:00)
// ------------------------------------------------------------------
exports.scheduledCleanupExecution = functions.pubsub
  .schedule('every sunday 04:00')
  .timeZone('Europe/Madrid')
  .onRun(async (context) => {
    logger.info('🗑️ Running weekly user cleanup (Wednesday)...');

    try {
      const db = admin.firestore();
      const storage = admin.storage();
      const auth = admin.auth();

      // Safety check: Only delete users created more than 48 hours ago
      // This prevents deleting someone who registered on Tuesday late afternoon
      const safetyThreshold = admin.firestore.Timestamp.fromDate(new Date(Date.now() - 48 * 60 * 60 * 1000));

      const usersSnapshot = await db.collection('users')
        .where('alias', 'in', ['', 'Sin Alias'])
        .where('createdAt', '<=', safetyThreshold)
        .get();

      if (usersSnapshot.empty) {
        logger.info('No users found for cleanup');
        return null;
      }

      let deletedCount = 0;
      const errors = [];

      const deletePromises = usersSnapshot.docs.map(async (doc) => {
        const uid = doc.id;
        const userData = doc.data();

        logger.info(`Deleting inactive user: ${uid} (${userData.email})`);

        try {
          // 1. Delete from Auth
          try {
            await auth.deleteUser(uid);
          } catch (e) {
            if (e.code !== 'auth/user-not-found') throw e;
          }

          // 2. Delete Profile Photos from Storage
          try {
            const bucket = storage.bucket();
            await bucket.deleteFiles({ prefix: `profile_photos/${uid}/` });
          } catch (e) {
            logger.warn(`Storage delete failed for ${uid}: ${e.message}`);
            // Continue, not fatal
          }

          // 3. Delete from Firestore (User Doc)
          // Note: Subcollections might remain unless we use recursive delete, 
          // but for "incomplete profiles" these are usually empty.
          await db.collection('users').doc(uid).delete();

          deletedCount++;

        } catch (error) {
          logger.error(`Failed to delete user ${uid}`, error);
          errors.push({ uid, error: error.message });
        }
      });

      await Promise.all(deletePromises);

      logger.info(`✅ Cleanup complete. Deleted: ${deletedCount}. Errors: ${errors.length}`);
      return null;

    } catch (error) {
      logger.error('Cleanup execution fatal error:', error);
      throw error;
    }
  });

// ============================================================================
// 7) RECURSIVE CHAT DELETION
// ============================================================================
exports.onConversationDelete = functions.firestore
  .document('conversations/{conversationId}')
  .onDelete(async (snap, context) => {
    const conversationId = context.params.conversationId;
    const db = admin.firestore();
    const bucket = admin.storage().bucket();

    logger.info(`🗑️ Recursive cleanup for conversation ${conversationId}`);

    try {
      // 1. Delete Subcollection 'messages'
      // Note: This requires listing and deleting in batches
      const messagesRef = db.collection('conversations').doc(conversationId).collection('messages');
      const messagesSnap = await messagesRef.limit(500).get(); // Batch size

      const batch = db.batch();
      let count = 0;
      messagesSnap.forEach(doc => {
        batch.delete(doc.ref);
        count++;
      });

      if (count > 0) {
        await batch.commit();
        logger.info(`Deleted ${count} messages for conversation ${conversationId}`);
        // If more than 500, we might need re-trigger or loop, but standard chats usually fit.
        // For robustness, could use recursive delete tool, but simple batch is often enough.
      }

      // 2. Delete Storage Attachments (Images/Audio)
      // Path: chat_attachments/{conversationId}/...
      await bucket.deleteFiles({ prefix: `chat_attachments/{conversationId}/` });
      logger.info(`Deleted storage files for conversation ${conversationId}`);

    } catch (error) {
      logger.error(`Error in recursive chat delete for ${conversationId}`, error);
    }
  });

// ============================================================================
// 8) ADMIN: RESET USER STATS (One-off)
// ============================================================================
exports.resetUserStats = functions.https.onCall(async (data, context) => {
  // Check if admin
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can reset stats');
  }

  const db = admin.firestore();
  logger.info('🔄 Admin initiated User Stats Reset...');

  try {
    const usersSnap = await db.collection('users').get();
    const batchSize = 500;
    let batch = db.batch();
    let count = 0;
    let total = 0;

    for (const doc of usersSnap.docs) {
      const user = doc.data();
      // Use set with merge true for safer deep merging and handling missing 'stats' parent
      const updates = {
        stats: {
          completedDates: 0,
          responseRate: 100
        }
      };

      // Remove legacy compatibility if exists
      if (user.compatibility !== undefined) {
        updates.compatibility = admin.firestore.FieldValue.delete();
      }

      // Check if we actually need to update (optimization)
      // Note: 'set' with merge will overwrite stats even if values are same, keeping it simple is better for robustness
      // But to be cleaner, we can check basic equality
      const currentStats = user.stats || {};
      const needsDateReset = currentStats.completedDates !== 0;
      const needsRateReset = currentStats.responseRate !== 100;
      const needsCompatDelete = user.compatibility !== undefined;
      const missingStats = !user.stats;

      if (needsDateReset || needsRateReset || needsCompatDelete || missingStats) {
        batch.set(doc.ref, updates, { merge: true });
        count++;
        total++;
      }

      if (count >= batchSize) {
        await batch.commit();
        batch = db.batch();
        count = 0;
      }
    }

    if (count > 0) {
      await batch.commit();
    }

    logger.info(`✅ Stats reset complete. Updated ${total} users.`);
    return { success: true, updated: total };

  } catch (error) {
    logger.error('Error resetting stats:', error);
    throw new functions.https.HttpsError('internal', 'Reset failed');
  }
});

