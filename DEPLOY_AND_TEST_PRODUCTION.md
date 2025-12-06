# Production Verification Tests

Based on `deploy-phase1-production.sh` recommendations.

## 1. Verify API Proxy & Timeout
- **Endpoint**: `/health` or `/api/health`
- **Expected**: 200 OK
- **Test**:
  ```bash
  curl -I https://tuscitasseguras-2d1a6.web.app/health
  ```

## 2. Verify PayPal Token Cache
- **Action**: Initiate a PayPal transaction (or mock if possible).
- **Log Check**: Look for "PayPal token cache hit" in logs.

## 3. Verify Stripe Webhook Idempotency
- **Action**: Send the same webhook event ID twice.
- **Expected**: Second request should be handled as duplicate (200 OK but skipped processing).

## 4. Verify Firestore Rules (Gender Filter)
- **Action**: Attempt to read profiles without custom claims.
- **Expected**: Permission Denied (if gender filter is active and user is not privileged).

## 5. Verify App Check
- **URL**: `https://tuscitasseguras-2d1a6.web.app/webapp/verify-appcheck.html`
- **Check**: Site Key should end in `...IrLK`.
