// rate-limiter.js - Basic rate limiting for Cloud Functions
// Prevents spam and abuse

const admin = require('firebase-admin');

/**
 * Rate limiter configuration
 */
const RATE_LIMITS = {
  // Messages
  messages: {
    maxPerMinute: 10,
    maxPerHour: 100,
    maxPerDay: 500
  },
  // Date proposals
  dateProposals: {
    maxPerHour: 5,
    maxPerDay: 20
  },
  // Match requests
  matchRequests: {
    maxPerHour: 10,
    maxPerDay: 50
  },
  // Reports
  reports: {
    maxPerHour: 3,
    maxPerDay: 10
  },
  // Profile updates
  profileUpdates: {
    maxPerHour: 10,
    maxPerDay: 30
  }
};

/**
 * Check if user has exceeded rate limit
 * @param {string} userId - User ID
 * @param {string} action - Action type (messages, dateProposals, etc.)
 * @returns {Promise<{allowed: boolean, limit: number, current: number, resetAt: Date}>}
 */
async function checkRateLimit(userId, action) {
  const db = admin.firestore();
  const now = new Date();
  const limits = RATE_LIMITS[action];

  if (!limits) {
    throw new Error(`Unknown action type: ${action}`);
  }

  // Calculate time windows
  const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Query rate limit records
  const rateLimitRef = db.collection('rate_limits')
    .where('userId', '==', userId)
    .where('action', '==', action)
    .where('timestamp', '>', admin.firestore.Timestamp.fromDate(oneDayAgo));

  const snapshot = await rateLimitRef.get();

  // Count actions in each time window
  let countPerMinute = 0;
  let countPerHour = 0;
  let countPerDay = 0;

  snapshot.forEach(doc => {
    const timestamp = doc.data().timestamp.toDate();
    countPerDay++;
    if (timestamp > oneHourAgo) {
      countPerHour++;
      if (timestamp > oneMinuteAgo) {
        countPerMinute++;
      }
    }
  });

  // Check limits
  if (limits.maxPerMinute && countPerMinute >= limits.maxPerMinute) {
    return {
      allowed: false,
      limit: limits.maxPerMinute,
      current: countPerMinute,
      window: 'minute',
      resetAt: new Date(oneMinuteAgo.getTime() + 60 * 1000)
    };
  }

  if (limits.maxPerHour && countPerHour >= limits.maxPerHour) {
    return {
      allowed: false,
      limit: limits.maxPerHour,
      current: countPerHour,
      window: 'hour',
      resetAt: new Date(oneHourAgo.getTime() + 60 * 60 * 1000)
    };
  }

  if (limits.maxPerDay && countPerDay >= limits.maxPerDay) {
    return {
      allowed: false,
      limit: limits.maxPerDay,
      current: countPerDay,
      window: 'day',
      resetAt: new Date(oneDayAgo.getTime() + 24 * 60 * 60 * 1000)
    };
  }

  // Allowed - record this action
  await db.collection('rate_limits').add({
    userId,
    action,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    // TTL: Auto-delete after 25 hours (cleanup)
    expiresAt: admin.firestore.Timestamp.fromDate(new Date(now.getTime() + 25 * 60 * 60 * 1000))
  });

  return {
    allowed: true,
    limit: limits.maxPerDay,
    current: countPerDay + 1,
    window: 'day'
  };
}

/**
 * Middleware-style rate limiter for callable functions
 * @param {string} action - Action type
 * @returns {Function} Middleware function
 */
function rateLimitMiddleware(action) {
  return async (context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Must be authenticated'
      );
    }

    const userId = context.auth.uid;
    const check = await checkRateLimit(userId, action);

    if (!check.allowed) {
      const resetTime = check.resetAt.toLocaleTimeString('es-ES');
      throw new functions.https.HttpsError(
        'resource-exhausted',
        `Rate limit exceeded. You can perform this action ${check.limit} times per ${check.window}. ` +
        `Current: ${check.current}/${check.limit}. ` +
        `Reset at: ${resetTime}`,
        { limit: check.limit, current: check.current, resetAt: check.resetAt }
      );
    }

    return check;
  };
}

/**
 * Clean up expired rate limit records
 * Scheduled function to run daily
 */
async function cleanupExpiredRateLimits() {
  const db = admin.firestore();
  const now = admin.firestore.Timestamp.now();

  const expiredQuery = db.collection('rate_limits')
    .where('expiresAt', '<', now)
    .limit(500); // Batch delete

  const snapshot = await expiredQuery.get();

  if (snapshot.empty) {
    console.log('[cleanupExpiredRateLimits] No expired records to delete');
    return { deleted: 0 };
  }

  const batch = db.batch();
  snapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });

  await batch.commit();
  console.log(`[cleanupExpiredRateLimits] Deleted ${snapshot.size} expired records`);

  return { deleted: snapshot.size };
}

module.exports = {
  checkRateLimit,
  rateLimitMiddleware,
  cleanupExpiredRateLimits,
  RATE_LIMITS
};
