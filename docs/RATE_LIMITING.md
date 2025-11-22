# Rate Limiting Implementation

> **Status:** ✅ **IMPLEMENTED** (Basic version)
> **Last Updated:** 2025-11-14
> **File:** `/functions/rate-limiter.js`
> **Priority:** 🟡 **IMPORTANT** - Prevents spam and abuse

---

## Overview

Basic rate limiting system to prevent spam, abuse, and DoS attacks. Implements time-based limits for critical operations.

**What it protects:**
- Message sending (spam prevention)
- Date proposals (abuse prevention)
- Match requests (spam prevention)
- User reports (abuse prevention)
- Profile updates (abuse prevention)

---

## How It Works

### Architecture

```
User Action
    ↓
Cloud Function
    ↓
Rate Limiter Check ← Firestore (rate_limits collection)
    ↓
✅ Allowed (count < limit)
    ↓
Perform Action + Record in rate_limits
    ↓
Auto-cleanup after 25 hours (TTL)
```

### Storage

Records stored in Firestore collection `rate_limits`:

```javascript
{
  userId: "user123",
  action: "messages",
  timestamp: Timestamp,
  expiresAt: Timestamp  // Auto-cleanup after 25 hours
}
```

---

## Configuration

### Current Limits

```javascript
const RATE_LIMITS = {
  // Messages: 10/min, 100/hour, 500/day
  messages: {
    maxPerMinute: 10,
    maxPerHour: 100,
    maxPerDay: 500
  },

  // Date proposals: 5/hour, 20/day
  dateProposals: {
    maxPerHour: 5,
    maxPerDay: 20
  },

  // Match requests: 10/hour, 50/day
  matchRequests: {
    maxPerHour: 10,
    maxPerDay: 50
  },

  // Reports: 3/hour, 10/day
  reports: {
    maxPerHour: 3,
    maxPerDay: 10
  },

  // Profile updates: 10/hour, 30/day
  profileUpdates: {
    maxPerHour: 10,
    maxPerDay: 30
  }
};
```

### Adjusting Limits

Edit `/functions/rate-limiter.js` and redeploy:

```bash
firebase deploy --only functions
```

---

## Usage

### Option 1: Direct Check

```javascript
const { checkRateLimit } = require('./rate-limiter');

async function sendMessage(userId, messageData) {
  // Check rate limit
  const check = await checkRateLimit(userId, 'messages');

  if (!check.allowed) {
    throw new Error(
      `Rate limit exceeded: ${check.current}/${check.limit} per ${check.window}. ` +
      `Reset at: ${check.resetAt}`
    );
  }

  // Proceed with action
  // ... send message
}
```

### Option 2: Middleware (Callable Functions)

```javascript
const functions = require('firebase-functions');
const { rateLimitMiddleware } = require('./rate-limiter');

exports.sendMessage = functions.https.onCall(async (data, context) => {
  // Apply rate limit
  await rateLimitMiddleware('messages')(context);

  // If we get here, rate limit passed
  // ... send message
});
```

---

## Integration Examples

### Example 1: Message Sending

```javascript
// functions/index.js

const { checkRateLimit } = require('./rate-limiter');

exports.sendMessageCallable = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const userId = context.auth.uid;

  // Check rate limit
  const rateCheck = await checkRateLimit(userId, 'messages');

  if (!rateCheck.allowed) {
    throw new functions.https.HttpsError(
      'resource-exhausted',
      `You can only send ${rateCheck.limit} messages per ${rateCheck.window}. ` +
      `Current: ${rateCheck.current}/${rateCheck.limit}. ` +
      `Try again at ${rateCheck.resetAt.toLocaleTimeString('es-ES')}`
    );
  }

  // Send message
  await db.collection('conversations').doc(data.conversationId)
    .collection('messages').add({
      senderId: userId,
      text: data.message,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

  return { success: true, rateLimit: rateCheck };
});
```

### Example 2: Date Proposals

```javascript
exports.proposeDateCallable = functions.https.onCall(async (data, context) => {
  const userId = context.auth.uid;

  // Check rate limit (stricter for date proposals)
  const rateCheck = await checkRateLimit(userId, 'dateProposals');

  if (!rateCheck.allowed) {
    throw new functions.https.HttpsError(
      'resource-exhausted',
      `Maximum ${rateCheck.limit} date proposals per ${rateCheck.window}`
    );
  }

  // Create date proposal
  // ...
});
```

---

## Cleanup & Maintenance

### Automatic Cleanup

Records auto-expire after 25 hours via `expiresAt` field.

### Manual Cleanup (Optional)

Deploy scheduled function to clean up expired records:

```javascript
// functions/index.js

const { cleanupExpiredRateLimits } = require('./rate-limiter');

// Run daily at 3 AM
exports.cleanupRateLimits = functions.pubsub
  .schedule('0 3 * * *')
  .timeZone('Europe/Madrid')
  .onRun(async (context) => {
    const result = await cleanupExpiredRateLimits();
    console.log(`Cleaned up ${result.deleted} expired rate limit records`);
    return result;
  });
```

---

## Monitoring

### View Rate Limit Stats (Admin)

```javascript
// In admin dashboard
const db = admin.firestore();

// Get rate limit records for a user
const userRateLimits = await db.collection('rate_limits')
  .where('userId', '==', 'user123')
  .orderBy('timestamp', 'desc')
  .limit(100)
  .get();

userRateLimits.forEach(doc => {
  const data = doc.data();
  console.log(`${data.action} at ${data.timestamp.toDate()}`);
});

// Get users hitting rate limits
const recentLimits = await db.collection('rate_limits')
  .where('timestamp', '>', oneDayAgo)
  .get();

const userCounts = {};
recentLimits.forEach(doc => {
  const userId = doc.data().userId;
  userCounts[userId] = (userCounts[userId] || 0) + 1;
});

// Sort by count
const topUsers = Object.entries(userCounts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10);

console.log('Top 10 most active users:', topUsers);
```

---

## Limitations

### Current Implementation

**✅ Implemented:**
- Time-based limits (minute, hour, day)
- Multiple action types
- Auto-cleanup (TTL)
- Admin monitoring

**❌ Not Implemented:**
- IP-based rate limiting
- Distributed rate limiting (single-region only)
- Token bucket algorithm (uses simple counter)
- User-specific limits (VIP users, etc.)
- Real-time blocking (uses async checks)

### Firestore Costs

Each rate limit check does:
- 1 query to count recent actions
- 1 write to record new action
- **Cost:** ~$0.06 per 100k checks + ~$0.18 per 100k writes

**For 10,000 messages/day:**
- Reads: 10,000 × $0.06/100k = $0.006
- Writes: 10,000 × $0.18/100k = $0.018
- **Total:** ~$0.024/day = **~$0.72/month**

---

## Alternatives

### Option 1: Firebase App Check (Already Implemented ✅)

- Prevents bots and abuse
- No additional code needed
- Limitations: No per-user limits

### Option 2: Cloud Functions with Redis

**Pros:**
- Faster (in-memory)
- More sophisticated algorithms
- Lower cost at scale

**Cons:**
- Requires Redis server
- More complex setup
- Additional infrastructure

**Example:**
```javascript
const redis = require('redis');
const client = redis.createClient(process.env.REDIS_URL);

async function checkRateLimit(userId, action) {
  const key = `ratelimit:${action}:${userId}`;
  const count = await client.incr(key);

  if (count === 1) {
    await client.expire(key, 60); // 60 seconds
  }

  return count <= LIMITS[action].maxPerMinute;
}
```

### Option 3: Third-Party Services

- **Cloudflare Rate Limiting** ($$)
- **Kong API Gateway** (self-hosted)
- **Firebase Extensions** (marketplace)

---

## Deployment

### 1. Deploy Functions

```bash
cd functions

# Ensure rate-limiter.js is present
ls rate-limiter.js

# Deploy all functions
firebase deploy --only functions
```

### 2. Deploy Firestore Rules

```bash
# Deploy updated rules (includes rate_limits collection)
firebase deploy --only firestore:rules
```

### 3. Test Rate Limiting

```javascript
// Test script
const functions = require('firebase-functions-test')();
const { checkRateLimit } = require('./rate-limiter');

async function test() {
  const userId = 'test-user-123';

  // Send 11 messages (limit is 10/minute)
  for (let i = 0; i < 11; i++) {
    const check = await checkRateLimit(userId, 'messages');
    console.log(`Message ${i + 1}: ${check.allowed ? 'ALLOWED' : 'BLOCKED'}`);

    if (!check.allowed) {
      console.log(`Rate limit hit: ${check.current}/${check.limit} per ${check.window}`);
      break;
    }
  }
}

test();
```

**Expected output:**
```
Message 1: ALLOWED
Message 2: ALLOWED
...
Message 10: ALLOWED
Message 11: BLOCKED
Rate limit hit: 10/10 per minute
```

---

## Troubleshooting

### Error: "Rate limit exceeded"

**Cause:** User performed too many actions in a short time

**Solution:**
- Wait for rate limit window to reset
- Adjust limits in `rate-limiter.js` if too strict
- Check for bugs causing repeated calls

### Error: "Unknown action type"

**Cause:** Action type not defined in `RATE_LIMITS`

**Solution:**
Add action type to `rate-limiter.js`:
```javascript
const RATE_LIMITS = {
  // ... existing limits
  newAction: {
    maxPerHour: 10,
    maxPerDay: 50
  }
};
```

### High Firestore Costs

**Cause:** Too many rate limit checks

**Solutions:**
1. Increase limits to reduce checks
2. Implement client-side throttling
3. Use Redis instead of Firestore
4. Cache rate limit status (e.g., "user can send 5 more messages")

---

## Best Practices

### ✅ DO

- Set limits based on normal user behavior
- Monitor rate limit hits in logs
- Adjust limits based on abuse patterns
- Inform users when they hit limits (UX)
- Use stricter limits for sensitive actions (reports, date proposals)

### ❌ DON'T

- Set limits too low (frustrates users)
- Rate limit admins/moderators
- Forget to clean up expired records
- Use rate limiting as primary security (defense in depth)
- Ignore rate limit violations (may indicate abuse)

---

## Migration from No Rate Limiting

### Phase 1: Deploy (No Enforcement)

```javascript
// Log only, don't block
const check = await checkRateLimit(userId, 'messages');
if (!check.allowed) {
  console.warn(`[RATE LIMIT] User ${userId} would be blocked: ${check.current}/${check.limit}`);
  // Don't throw error yet
}
// Continue with action
```

### Phase 2: Monitor (1-2 weeks)

- Check logs for rate limit violations
- Identify false positives
- Adjust limits based on real usage

### Phase 3: Enforce

```javascript
// Now block users
const check = await checkRateLimit(userId, 'messages');
if (!check.allowed) {
  throw new functions.https.HttpsError('resource-exhausted', 'Rate limit exceeded');
}
```

---

## Security Considerations

### Bypass Attempts

**Possible attacks:**
1. **Multiple accounts** - Create many accounts to bypass limits
   - **Mitigation:** IP-based rate limiting (not implemented)
   - **Mitigation:** Email verification required (✅ implemented)

2. **Clock manipulation** - Try to reset timers
   - **Mitigation:** Server-side timestamps (✅ implemented)

3. **Direct Firestore writes** - Bypass function checks
   - **Mitigation:** Firestore Rules block direct writes (✅ implemented)

### Data Privacy

- Rate limit records contain user IDs
- Auto-delete after 25 hours (GDPR compliance)
- Admin-only access (Firestore Rules)

---

## Future Enhancements

### Planned Features

- [ ] **IP-based rate limiting** (prevent multi-account abuse)
- [ ] **Token bucket algorithm** (burst allowance)
- [ ] **User tier limits** (VIP users get higher limits)
- [ ] **Real-time dashboard** (admin monitoring)
- [ ] **Automatic ban** (after X violations)
- [ ] **Redis integration** (better performance)

### Nice to Have

- [ ] GraphQL for rate limit queries
- [ ] Webhooks for rate limit violations
- [ ] Machine learning for anomaly detection
- [ ] User notifications when nearing limit

---

## Resources

### Documentation
- [Firebase Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Cloud Functions Best Practices](https://firebase.google.com/docs/functions/best-practices)
- [Rate Limiting Algorithms](https://en.wikipedia.org/wiki/Rate_limiting)

### Related Files
- `/functions/rate-limiter.js` - Implementation
- `/firestore.rules` - Security rules
- `/CLAUDE.md` - Development guide

---

**Document Status:** ✅ Complete
**Implementation Status:** ✅ Basic version deployed
**Production Ready:** ⚠️ Requires testing and monitoring
**Questions?** See troubleshooting section above
