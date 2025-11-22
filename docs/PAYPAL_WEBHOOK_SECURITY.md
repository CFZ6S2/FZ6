# PayPal Webhook Security Configuration

> **Status:** ✅ **IMPLEMENTED** (Code ready, configuration required)
> **Last Updated:** 2025-11-14
> **Affected File:** `functions/index.js`
> **Priority:** 🔴 **CRITICAL** - Required for production security

---

## Overview

**Security Enhancement:** PayPal webhook signature verification has been implemented to prevent fraudulent payment events.

**What Changed:**
- ✅ Added `verifyPayPalWebhookSignature()` function
- ✅ Webhook now verifies signature before processing events
- ✅ Unauthorized requests are rejected with 401 status
- ⚠️ **Requires configuration** to work

---

## Why This Matters

### Without Signature Verification (BEFORE) ❌

**Vulnerability:** Anyone could send fake requests to your webhook endpoint:

```bash
# Attacker sends fake event
curl -X POST https://your-app.com/paypalWebhook \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "BILLING.SUBSCRIPTION.ACTIVATED",
    "resource": {
      "id": "FAKE-123",
      "custom_id": "victim-user-id"
    }
  }'

# Result: Free membership activated! 💰 Loss
```

### With Signature Verification (AFTER) ✅

**Protection:** Only PayPal can send valid webhooks:

```javascript
// Webhook verifies signature
const isValid = await verifyPayPalWebhookSignature(req);

if (!isValid) {
  return res.status(401).json({ error: 'Unauthorized' });
}

// Attackers cannot forge PayPal's cryptographic signature
```

---

## Configuration Required

### Step 1: Get PayPal Credentials

#### 1.1 Log into PayPal Developer Dashboard

- **Sandbox:** https://developer.paypal.com/dashboard/applications/sandbox
- **Live:** https://developer.paypal.com/dashboard/applications/live

#### 1.2 Get Client ID & Secret

1. Click on your application
2. Copy **Client ID**
3. Reveal and copy **Secret**

#### 1.3 Get Webhook ID

1. Go to **Webhooks** section
2. Find your webhook endpoint (e.g., `https://your-app.cloudfunctions.net/paypalWebhook`)
3. Copy the **Webhook ID** (looks like `WH-xxxxx`)

**If webhook doesn't exist yet:**
1. Click **Add Webhook**
2. Enter URL: `https://YOUR_PROJECT.cloudfunctions.net/paypalWebhook`
3. Select events:
   - BILLING.SUBSCRIPTION.ACTIVATED
   - BILLING.SUBSCRIPTION.UPDATED
   - BILLING.SUBSCRIPTION.CANCELLED
   - BILLING.SUBSCRIPTION.SUSPENDED
   - PAYMENT.SALE.COMPLETED
   - PAYMENT.SALE.DENIED
   - PAYMENT.SALE.REFUNDED
4. Save and copy the Webhook ID

---

### Step 2: Configure Firebase Functions

#### Option A: Using Firebase CLI (Recommended for Production)

```bash
# Set PayPal credentials
firebase functions:config:set \
  paypal.mode="sandbox" \
  paypal.client_id="YOUR_PAYPAL_CLIENT_ID" \
  paypal.secret="YOUR_PAYPAL_SECRET" \
  paypal.webhook_id="YOUR_WEBHOOK_ID"

# For production, use:
firebase functions:config:set paypal.mode="live"

# Verify configuration
firebase functions:config:get

# Deploy functions
firebase deploy --only functions
```

#### Option B: Using Environment Variables (Local Development)

Create `/functions/.env` (already in .gitignore):

```bash
# PayPal Configuration
PAYPAL_MODE=sandbox
PAYPAL_CLIENT_ID=your_client_id_here
PAYPAL_SECRET=your_secret_here
PAYPAL_WEBHOOK_ID=WH-xxxxx

# For local testing
```

**IMPORTANT:** Never commit `.env` to Git!

---

### Step 3: Verify Configuration

#### 3.1 Check Logs

After deploying, check Firebase Functions logs:

```bash
firebase functions:log --only paypalWebhook
```

**Expected logs:**

✅ **If configured correctly:**
```
[paypalWebhook] Event received: BILLING.SUBSCRIPTION.ACTIVATED
[verifyPayPalWebhookSignature] Signature verified successfully
[paypalWebhook] Webhook signature verified - processing event
```

❌ **If not configured:**
```
[verifyPayPalWebhookSignature] PayPal webhook ID not configured
Run: firebase functions:config:set paypal.webhook_id="YOUR_WEBHOOK_ID"
[paypalWebhook] Invalid webhook signature - potential fraud attempt
```

#### 3.2 Test with PayPal Sandbox

1. Go to PayPal Developer Dashboard
2. Navigate to **Webhooks** > Your webhook
3. Click **Webhook Events**
4. Click **Send Test Request**
5. Select event type (e.g., `BILLING.SUBSCRIPTION.ACTIVATED`)
6. Click **Send Request**

**Expected result:**
- Response: `200 OK` with `{"received": true}`
- Logs show signature verification success

#### 3.3 Test with cURL (Should Fail)

```bash
# This should be REJECTED (no valid signature)
curl -X POST https://YOUR_PROJECT.cloudfunctions.net/paypalWebhook \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "BILLING.SUBSCRIPTION.ACTIVATED",
    "resource": {"id": "test"}
  }'

# Expected response: 401 Unauthorized
```

---

## Security Features

### What the Code Does

1. **Extracts PayPal Headers:**
   ```javascript
   const transmissionId = req.headers['paypal-transmission-id'];
   const transmissionTime = req.headers['paypal-transmission-time'];
   const transmissionSig = req.headers['paypal-transmission-sig'];
   ```

2. **Calls PayPal Verification API:**
   ```javascript
   POST https://api-m.paypal.com/v1/notifications/verify-webhook-signature
   {
     "transmission_id": "...",
     "transmission_sig": "...",
     "webhook_event": { ... }
   }
   ```

3. **Checks Response:**
   ```javascript
   if (verifyData.verification_status === 'SUCCESS') {
     // Process event
   } else {
     // Reject as fraud
   }
   ```

### Attack Scenarios Prevented

| Attack | Prevention |
|--------|------------|
| Fake subscription activation | ✅ Signature verification fails |
| Replay attack | ✅ PayPal includes timestamp in signature |
| Man-in-the-middle | ✅ HTTPS + signature verification |
| Credential stuffing | ✅ No user credentials involved |
| API key theft | ⚠️ Rotate keys regularly |

---

## Troubleshooting

### Error: "PayPal webhook ID not configured"

**Cause:** Missing `paypal.webhook_id` in Firebase config

**Solution:**
```bash
firebase functions:config:set paypal.webhook_id="WH-xxxxx"
firebase deploy --only functions
```

### Error: "PayPal credentials not configured"

**Cause:** Missing `paypal.client_id` or `paypal.secret`

**Solution:**
```bash
firebase functions:config:set \
  paypal.client_id="YOUR_CLIENT_ID" \
  paypal.secret="YOUR_SECRET"
firebase deploy --only functions
```

### Error: "Failed to get PayPal access token: 401"

**Cause:** Invalid PayPal credentials

**Solution:**
1. Verify credentials in PayPal Developer Dashboard
2. Ensure you're using the correct mode (sandbox vs live)
3. Update Firebase config with correct credentials

### Error: "Verification request failed: 400"

**Cause:** Invalid webhook event format or webhook ID

**Solution:**
1. Verify webhook ID is correct
2. Ensure webhook is created in PayPal Developer Dashboard
3. Check that event format matches PayPal documentation

### Signature verification always fails in development

**Cause:** PayPal webhooks only verify requests from PayPal servers

**Solution:**
- Use PayPal Sandbox to send real test webhooks
- Don't test with cURL (it should fail)
- Use PayPal's "Send Test Request" feature in developer dashboard

---

## Configuration Checklist

Before going to production:

### PayPal Setup
- [ ] PayPal Developer account created
- [ ] Application created (sandbox & live)
- [ ] Client ID & Secret obtained
- [ ] Webhook endpoint created
- [ ] All event types subscribed
- [ ] Webhook ID obtained

### Firebase Configuration
- [ ] `paypal.mode` set (sandbox or live)
- [ ] `paypal.client_id` configured
- [ ] `paypal.secret` configured
- [ ] `paypal.webhook_id` configured
- [ ] Configuration verified with `firebase functions:config:get`

### Testing
- [ ] Functions deployed
- [ ] Test webhook sent from PayPal dashboard
- [ ] Signature verification succeeds in logs
- [ ] cURL test rejected with 401
- [ ] Subscription activation tested
- [ ] Payment completion tested

### Security
- [ ] Credentials not committed to Git
- [ ] `.env` in `.gitignore`
- [ ] Separate credentials for sandbox/production
- [ ] Webhook URL uses HTTPS
- [ ] Logs don't expose secrets

---

## Migration Path

### Current State (Before This Update)

```javascript
// ❌ INSECURE: No verification
exports.paypalWebhook = functions.https.onRequest(async (req, res) => {
  const event = req.body;
  // Processes all events without verification
  switch (event.event_type) { ... }
});
```

### New State (After Configuration)

```javascript
// ✅ SECURE: Signature verification
exports.paypalWebhook = functions.https.onRequest(async (req, res) => {
  const isValid = await verifyPayPalWebhookSignature(req);
  if (!isValid) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  // Only processes verified events
  switch (event.event_type) { ... }
});
```

### Deployment Steps

1. **Configure credentials** (Step 2 above)
2. **Deploy functions:**
   ```bash
   cd functions
   npm install  # Ensure dependencies up to date
   cd ..
   firebase deploy --only functions
   ```
3. **Test with PayPal sandbox** (Step 3.2 above)
4. **Monitor logs** for first 24 hours
5. **Switch to live mode** when ready

---

## Monitoring & Alerts

### Set Up Alerts

In Firebase Console > Functions > paypalWebhook:

1. **Error Rate Alert:**
   - Trigger: Error rate > 5% for 5 minutes
   - Action: Email notification

2. **Unauthorized Attempts Alert:**
   - Create log-based metric for "Invalid webhook signature"
   - Trigger: > 10 unauthorized attempts in 1 hour
   - Action: Email notification + Slack (if integrated)

### Key Metrics to Monitor

```javascript
// Log metrics for monitoring
console.log('[paypalWebhook] Metrics:', {
  event_type: event.event_type,
  signature_valid: isValidSignature,
  timestamp: new Date().toISOString()
});
```

**Dashboard metrics:**
- Total webhook calls
- Signature verification success rate
- Unauthorized attempts (potential attacks)
- Processing errors

---

## Best Practices

### ✅ DO

- Rotate PayPal credentials every 6 months
- Use separate webhooks for sandbox and production
- Monitor unauthorized webhook attempts
- Log all webhook events (without sensitive data)
- Test signature verification in sandbox before production
- Use Firebase Functions config (not environment variables in production)

### ❌ DON'T

- Commit PayPal credentials to Git
- Share credentials across environments
- Skip signature verification "just for testing"
- Ignore webhook signature failures
- Use same webhook ID for multiple applications
- Log PayPal secrets in error messages

---

## Resources

### Official Documentation
- [PayPal Webhook Verification](https://developer.paypal.com/docs/api-basics/notifications/webhooks/notification-messages/#verify-webhook-signature)
- [PayPal REST API](https://developer.paypal.com/api/rest/)
- [Firebase Functions Config](https://firebase.google.com/docs/functions/config-env)

### TuCitaSegura Documentation
- `PAYPAL_INTEGRATION.md` - General PayPal integration
- `functions/index.js` - Implementation code
- `CLAUDE.md` - Development guide

### Support
- [PayPal Developer Forum](https://www.paypal-community.com/t5/Developer-Forums/ct-p/developer)
- [Stack Overflow - PayPal](https://stackoverflow.com/questions/tagged/paypal)

---

## Quick Reference Commands

```bash
# Configure PayPal (sandbox)
firebase functions:config:set \
  paypal.mode="sandbox" \
  paypal.client_id="YOUR_CLIENT_ID" \
  paypal.secret="YOUR_SECRET" \
  paypal.webhook_id="WH-xxxxx"

# Configure PayPal (production)
firebase functions:config:set paypal.mode="live"

# View configuration
firebase functions:config:get

# Deploy functions
firebase deploy --only functions

# View logs
firebase functions:log --only paypalWebhook

# Test webhook (from PayPal Dashboard)
# 1. Go to https://developer.paypal.com/dashboard
# 2. Webhooks > Your webhook > Send Test Request

# Verify deployment
curl https://YOUR_PROJECT.cloudfunctions.net/paypalWebhook
# Expected: 401 Unauthorized (no valid signature)
```

---

**Security Status:** 🔴 **CONFIGURATION REQUIRED**

The code is implemented and secure, but **will not work** until PayPal credentials are configured in Firebase Functions config.

**Next Steps:**
1. Follow Step 1-2 to configure credentials
2. Deploy functions
3. Test with PayPal sandbox
4. Monitor logs for signature verification

---

**Document Status:** ✅ Complete
**Implementation Status:** ✅ Code ready, ⚠️ Configuration pending
**Questions?** See troubleshooting section above
