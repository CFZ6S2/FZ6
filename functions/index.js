// functions/index.js (Node 18)
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const stripe = require('stripe')(functions.config().stripe?.secret_key || process.env.STRIPE_SECRET_KEY);
const axios = require('axios');
const { createLogger, PerformanceTimer } = require('./utils/structured-logger');
const { verifyAppCheckHTTP } = require('./middleware/app-check');

// Inicializar logger
const logger = createLogger('functions-main');

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

exports.apiProxy = functions.https.onRequest(async (req, res) => {
  const timer = new PerformanceTimer(logger, 'apiProxy');
  const base = (functions.config()?.api?.base_url) || process.env.API_BASE_URL || 'https://t2c06-production.up.railway.app';
  const url = base + req.originalUrl;

  logger.debug('API proxy request', {
    method: req.method,
    path: req.originalUrl,
    url
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
    console.error(`[updateUserMembership] Error updating custom claims for ${userId}:`, error);
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
    console.error(`[updateUserInsurance] Error updating custom claims for ${userId}:`, error);
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
  console.log(`[logInsurance] Insurance logged for user ${userId}`);
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
  console.log(`[createUserNotification] Notification created for user ${userId}: ${notification.title}`);
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
  console.log(`[logFailedPayment] Failed payment logged for user ${userId}: ${paymentData.paymentId}`);
}

// ============================================================================
// 1) CUSTOM CLAIMS: Al crear el doc de usuario, fijamos displayName y claims
// ============================================================================
exports.onUserDocCreate = functions.firestore
  .document('users/{userId}')
  .onCreate(async (snap, ctx) => {
    const uid = ctx.params.userId;
    const data = snap.data() || {};
    const name = (data.name || data.alias || '').toString().slice(0, 100);
    const gender = ['masculino','femenino'].includes(data.gender) ? data.gender : null;
    const userRole = data.userRole || 'regular';

    console.log(`[onUserDocCreate] Setting claims for ${uid}: role=${userRole}, gender=${gender}`);

    // Display name en Auth
    try {
      await admin.auth().updateUser(uid, { displayName: name });
      console.log(`[onUserDocCreate] Updated displayName for ${uid}`);
    } catch (e) {
      console.error(`[onUserDocCreate] Error updating displayName:`, e);
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
      console.log(`[onUserDocCreate] Custom claims set for ${uid}`);
    } catch (e) {
      console.error(`[onUserDocCreate] Error setting custom claims:`, e);
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

    if (!roleChanged && !genderChanged) {
      console.log(`[onUserDocUpdate] No role/gender changes for ${uid}, skipping`);
      return null;
    }

    const newRole = after.userRole || 'regular';
    const newGender = ['masculino','femenino'].includes(after.gender) ? after.gender : null;

    console.log(`[onUserDocUpdate] Updating claims for ${uid}: role=${newRole}, gender=${newGender}`);

    try {
      const user = await admin.auth().getUser(uid);
      const oldClaims = user.customClaims || {};
      await admin.auth().setCustomClaims(uid, {
        ...oldClaims,
        role: newRole,
        gender: newGender
      });
      console.log(`[onUserDocUpdate] Claims updated for ${uid}`);
    } catch (e) {
      console.error(`[onUserDocUpdate] Error updating claims:`, e);
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

    console.log(`[syncChatACL] Conversation ${conversationId}: +${added.length} -${removed.length} participants`);

    if (added.length === 0 && removed.length === 0) {
      console.log(`[syncChatACL] No changes, skipping`);
      return null;
    }

    const bucket = admin.storage().bucket();

    try {
      await Promise.all([
        ...added.map(uid => {
          console.log(`[syncChatACL] Adding ACL for ${uid} in ${conversationId}`);
          return bucket.file(`chat_attachments/${conversationId}/__acl__/${uid}`).save('');
        }),
        ...removed.map(uid => {
          console.log(`[syncChatACL] Removing ACL for ${uid} in ${conversationId}`);
          return bucket.file(`chat_attachments/${conversationId}/__acl__/${uid}`).delete({ ignoreNotFound: true });
        }),
      ]);
      console.log(`[syncChatACL] ACL sync complete for ${conversationId}`);
    } catch (e) {
      console.error(`[syncChatACL] Error syncing ACL:`, e);
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
    console.log(`[updateUserClaims] Claims updated for ${userId}: role=${role}, gender=${gender}`);
    return { success: true, message: `Claims actualizados para ${userId}` };
  } catch (error) {
    console.error(`[updateUserClaims] Error:`, error);
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
    console.error(`[getUserClaims] Error:`, error);
    throw new functions.https.HttpsError('not-found', 'Usuario no encontrado');
  }
});

// ============================================================================
// 6) STRIPE WEBHOOK: Manejar eventos de Stripe (subscriptions y payments)
// ============================================================================
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = functions.config().stripe?.webhook_secret || process.env.STRIPE_WEBHOOK_SECRET;

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
    console.error('[handleSubscriptionUpdate] No userId in subscription metadata');
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

  console.log(`[handleSubscriptionUpdate] Subscription ${subscription.id} updated for user ${userId}: ${status}`);
}

/**
 * Manejar cancelación de suscripción
 */
async function handleSubscriptionCanceled(subscription) {
  const userId = subscription.metadata.userId;

  if (!userId) {
    console.error('[handleSubscriptionCanceled] No userId in subscription metadata');
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

  console.log(`[handleSubscriptionCanceled] Subscription ${subscription.id} canceled for user ${userId}`);
}

/**
 * Manejar pago exitoso (Insurance - one-time payment)
 */
async function handlePaymentSucceeded(paymentIntent) {
  const userId = paymentIntent.metadata.userId;
  const paymentType = paymentIntent.metadata.paymentType; // 'insurance' or 'membership'

  if (!userId) {
    console.error('[handlePaymentSucceeded] No userId in payment metadata');
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

    console.log(`[handlePaymentSucceeded] Insurance payment ${paymentIntent.id} succeeded for user ${userId}`);
  }
}

/**
 * Manejar fallo de pago
 */
async function handlePaymentFailed(paymentIntent) {
  const userId = paymentIntent.metadata.userId;

  if (!userId) {
    console.error('[handlePaymentFailed] No userId in payment metadata');
    return;
  }

  console.error(`[handlePaymentFailed] Payment ${paymentIntent.id} failed for user ${userId}`);

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

  console.log(`[handlePaymentFailed] Notification and failed payment record created for user ${userId}`);
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

  console.error(`[handleInvoicePaymentFailed] Invoice payment failed for user ${userId}`);

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

  console.log(`[handleInvoicePaymentFailed] Notification and failed payment record created for user ${userId}`);
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

  console.log(`[handleInvoicePaymentSucceeded] Invoice payment succeeded for user ${userId}`);

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
    const webhookId = functions.config().paypal?.webhook_id || process.env.PAYPAL_WEBHOOK_ID;

    if (!webhookId) {
      console.error('[verifyPayPalWebhookSignature] PayPal webhook ID not configured');
      console.error('Run: firebase functions:config:set paypal.webhook_id="YOUR_WEBHOOK_ID"');
      return false;
    }

    if (!transmissionId || !transmissionTime || !transmissionSig || !certUrl || !authAlgo) {
      console.error('[verifyPayPalWebhookSignature] Missing required headers');
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
    const paypalMode = functions.config().paypal?.mode || process.env.PAYPAL_MODE || 'sandbox';
    const paypalClientId = functions.config().paypal?.client_id || process.env.PAYPAL_CLIENT_ID;
    const paypalSecret = functions.config().paypal?.secret || process.env.PAYPAL_SECRET;

    if (!paypalClientId || !paypalSecret) {
      console.error('[verifyPayPalWebhookSignature] PayPal credentials not configured');
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
      console.error('[verifyPayPalWebhookSignature] Failed to get PayPal access token:', authResponse.status);
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
      console.error('[verifyPayPalWebhookSignature] Verification request failed:', verifyResponse.status);
      return false;
    }

    const verifyData = await verifyResponse.json();

    // Resultado de verificación
    if (verifyData.verification_status === 'SUCCESS') {
      console.log('[verifyPayPalWebhookSignature] Signature verified successfully');
      return true;
    } else {
      console.error('[verifyPayPalWebhookSignature] Signature verification failed:', verifyData.verification_status);
      return false;
    }
  } catch (error) {
    console.error('[verifyPayPalWebhookSignature] Error verifying signature:', error);
    return false;
  }
}

// ============================================================================
// 7) PAYPAL WEBHOOK: Manejar eventos de PayPal (subscriptions y payments)
// ============================================================================
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

/**
 * Manejar activación de suscripción PayPal
 */
async function handlePayPalSubscriptionActivated(subscription) {
  const userId = subscription.custom_id; // Debe incluirse al crear la suscripción

  if (!userId) {
    console.error('[handlePayPalSubscriptionActivated] No userId in custom_id');
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

  console.log(`[handlePayPalSubscriptionActivated] Subscription ${subscription.id} activated for user ${userId}`);
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
    console.error('[handlePayPalSubscriptionCanceled] No userId in custom_id');
    return;
  }

  await updateUserMembership(userId, 'canceled');

  const db = admin.firestore();
  await db.collection('subscriptions').doc(subscription.id).update({
    status: 'canceled',
    canceledAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  console.log(`[handlePayPalSubscriptionCanceled] Subscription ${subscription.id} canceled for user ${userId}`);
}

/**
 * Manejar pago completado PayPal (Insurance - one-time)
 */
async function handlePayPalPaymentCompleted(sale) {
  const userId = sale.custom; // Debe incluirse al crear el pago
  const paymentType = sale.description; // 'insurance' or 'membership'

  if (!userId) {
    console.error('[handlePayPalPaymentCompleted] No userId in custom field');
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

    console.log(`[handlePayPalPaymentCompleted] Insurance payment ${sale.id} completed for user ${userId}`);
  }
}

/**
 * Manejar fallo/reembolso de pago PayPal
 */
async function handlePayPalPaymentFailed(sale) {
  const userId = sale.custom;

  if (!userId) {
    console.error('[handlePayPalPaymentFailed] No userId in custom field');
    return;
  }

  console.error(`[handlePayPalPaymentFailed] Payment ${sale.id} failed for user ${userId}`);

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

  console.log(`[handlePayPalPaymentFailed] Notification and failed payment record created for user ${userId}`);
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

  const paypalMode = functions.config().paypal?.mode || process.env.PAYPAL_MODE || 'sandbox';
  const paypalClientId = functions.config().paypal?.client_id || process.env.PAYPAL_CLIENT_ID;
  const paypalSecret = functions.config().paypal?.secret || process.env.PAYPAL_SECRET;

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
    console.log(`[captureInsuranceAuthorization] Starting capture for authorization ${authorizationId}`);

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
    console.log(`[captureInsuranceAuthorization] Capture successful:`, captureData.id);

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

    console.log(`[captureInsuranceAuthorization] Completed successfully for appointment ${appointmentId}`);

    return {
      success: true,
      captureId: captureData.id,
      status: captureData.status,
      amount: 120,
      currency: 'EUR'
    };

  } catch (error) {
    console.error(`[captureInsuranceAuthorization] Error:`, error.response?.data || error.message);

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
    console.log(`[voidInsuranceAuthorization] Starting void for authorization ${authorizationId}, reason: ${reason}`);

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

    console.log(`[voidInsuranceAuthorization] Void successful for authorization ${authorizationId}`);

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

    console.log(`[voidInsuranceAuthorization] Completed successfully for user ${userId}`);

    return {
      success: true,
      status: 'voided',
      reason: reason
    };

  } catch (error) {
    console.error(`[voidInsuranceAuthorization] Error:`, error.response?.data || error.message);

    // Si el error es que la autorización ya expiró (esto es normal después de 29 días)
    if (error.response?.status === 422 || error.response?.data?.name === 'AUTHORIZATION_VOIDED') {
      console.log(`[voidInsuranceAuthorization] Authorization already voided or expired - updating user record`);

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
    console.error(`[getInsuranceAuthorizationStatus] Error:`, error.response?.data || error.message);
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

// Export notification functions
exports.onMatchCreated = notifications.onMatchCreated;
exports.onMatchAccepted = notifications.onMatchAccepted;
exports.onMessageCreated = notifications.onMessageCreated;
exports.onAppointmentConfirmed = notifications.onAppointmentConfirmed;
exports.sendAppointmentReminders = notifications.sendAppointmentReminders;
exports.onVIPEventPublished = notifications.onVIPEventPublished;
exports.onSOSAlert = notifications.onSOSAlert;
exports.sendTestNotification = notifications.sendTestNotification;

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
