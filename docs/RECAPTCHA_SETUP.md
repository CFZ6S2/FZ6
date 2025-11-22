# reCAPTCHA v3 Configuration Guide

## Overview

This application uses Google reCAPTCHA v3 for bot protection. reCAPTCHA v3 is invisible to users and returns a score (0.0-1.0) indicating the likelihood that a user is human.

## Features

✅ **Environment-aware configuration**:
- Production: Stricter validation (min score: 0.5)
- Development: Permissive validation (min score: 0.3)
- Test: Bypass validation if not configured

✅ **HTTP Timeouts**: 10-second timeout prevents indefinite hangs

✅ **Configurable thresholds**: Adjust min score via environment variables

✅ **Detailed logging**: Track validation results and scores

---

## Setup Instructions

### 1. Get reCAPTCHA Keys

1. Go to [Google reCAPTCHA Admin](https://www.google.com/recaptcha/admin/create)

2. **Register a new site**:
   - **Label**: TuCitaSegura Production (or your app name)
   - **reCAPTCHA type**: Select **reCAPTCHA v3**
   - **Domains**: Add your production domain(s):
     ```
     tucitasegura.com
     www.tucitasegura.com
     ```
   - **Accept terms** and click **Submit**

3. **Save your keys**:
   - **Site Key** (public): Used in frontend
   - **Secret Key** (private): Used in backend ⚠️ **KEEP SECRET**

### 2. Configure Backend

Add to your `.env` file:

```bash
# reCAPTCHA v3 Configuration
RECAPTCHA_SECRET_KEY=your_secret_key_here
RECAPTCHA_MIN_SCORE=0.5
ENVIRONMENT=production
```

**For Development**:
```bash
# Leave empty to bypass validation during development
RECAPTCHA_SECRET_KEY=
RECAPTCHA_MIN_SCORE=0.3
ENVIRONMENT=development
```

### 3. Configure Frontend

Add the site key to your frontend configuration:

**HTML (index.html)**:
```html
<script src="https://www.google.com/recaptcha/api.js?render=YOUR_SITE_KEY"></script>
```

**JavaScript**:
```javascript
// Execute reCAPTCHA on form submit
async function submitForm() {
    const token = await grecaptcha.execute('YOUR_SITE_KEY', {action: 'submit'});

    // Send token to backend
    const response = await fetch('/api/emergency/phones', {
        method: 'POST',
        headers: {
            'X-Recaptcha-Token': token,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
    });
}
```

---

## Score Interpretation

reCAPTCHA v3 returns a score between 0.0 and 1.0:

| Score Range | Interpretation | Action |
|-------------|---------------|--------|
| **0.9 - 1.0** | Definitely human | ✅ Allow |
| **0.7 - 0.9** | Likely human | ✅ Allow |
| **0.5 - 0.7** | Probably human | ✅ Allow (production default) |
| **0.3 - 0.5** | Suspicious | ⚠️ Allow with extra validation |
| **0.0 - 0.3** | Likely bot | ❌ Block or require 2FA |

### Recommended Thresholds

**Production**:
- **Standard security**: `RECAPTCHA_MIN_SCORE=0.5`
- **High security** (banking, sensitive data): `RECAPTCHA_MIN_SCORE=0.7`
- **Permissive** (public forms): `RECAPTCHA_MIN_SCORE=0.3`

**Development/Testing**:
- `RECAPTCHA_MIN_SCORE=0.3` or leave `RECAPTCHA_SECRET_KEY` empty

---

## Usage in Code

### Basic Validation

```python
from app.services.security.recaptcha_service import recaptcha_service

@router.post("/api/endpoint")
async def create_resource(request: Request):
    # Get token from header
    recaptcha_token = request.headers.get("X-Recaptcha-Token")

    if not recaptcha_token:
        raise HTTPException(status_code=400, detail="reCAPTCHA token required")

    # Validate (uses default min score from environment)
    is_human = await recaptcha_service.is_human(
        token=recaptcha_token,
        remote_ip=request.client.host
    )

    if not is_human:
        raise HTTPException(status_code=400, detail="reCAPTCHA validation failed")

    # Process request...
```

### Custom Threshold

```python
# Use stricter validation for sensitive operations
is_human = await recaptcha_service.is_human(
    token=recaptcha_token,
    remote_ip=request.client.host,
    min_score=0.7  # Stricter than default
)
```

### Get Full Result

```python
# Get detailed verification result
result = await recaptcha_service.verify_recaptcha(
    token=recaptcha_token,
    remote_ip=request.client.host
)

# result contains:
# {
#     "success": True,
#     "score": 0.9,
#     "action": "submit",
#     "challenge_ts": "2025-01-01T12:00:00Z",
#     "hostname": "tucitasegura.com"
# }

if result["success"] and result["score"] >= 0.5:
    # Allow request
    pass
```

---

## Testing

### Development Mode

When `RECAPTCHA_SECRET_KEY` is not configured:
- ✅ All validations automatically pass (bypass mode)
- ⚠️ Warning logged: "reCAPTCHA bypassed (not configured)"
- Score returned: 0.9 (high score)

### Testing with Real Keys

1. Create a **separate reCAPTCHA site** for testing
2. Add `localhost` and `127.0.0.1` to allowed domains
3. Use test keys in `.env.development`

### Monitoring Logs

```bash
# Check reCAPTCHA validation logs
grep "reCAPTCHA" backend/logs/app.log

# Example output:
# INFO: reCAPTCHA enabled - Environment: production, Min Score: 0.5
# WARNING: reCAPTCHA score too low: 0.3 < 0.5 (Environment: production)
# INFO: reCAPTCHA validated successfully - Score: 0.9
```

---

## Security Best Practices

### ✅ DO:

1. **Keep secret key secret**
   - Never commit to git
   - Use environment variables
   - Rotate periodically (every 6-12 months)

2. **Use different keys for environments**
   - Production keys for production only
   - Test keys for development/staging

3. **Monitor scores over time**
   - Track average scores
   - Investigate sudden drops
   - Adjust thresholds as needed

4. **Combine with rate limiting**
   - reCAPTCHA + rate limiting = better protection
   - Already implemented in this app

5. **Log validation failures**
   - Security logging captures reCAPTCHA failures
   - Review logs for patterns

### ❌ DON'T:

1. **Don't skip validation in production**
   - Always set `RECAPTCHA_SECRET_KEY` in production
   - System will log warnings if not configured

2. **Don't use same keys everywhere**
   - Different environments = different keys

3. **Don't set min score too low**
   - Production minimum: 0.5
   - Lower scores = more bots allowed

4. **Don't ignore low scores**
   - Log and investigate users with scores < 0.3
   - May indicate attack attempts

---

## Troubleshooting

### Issue: "reCAPTCHA validation failed"

**Possible causes**:
1. Token expired (valid for 2 minutes)
2. Token already used (one-time use)
3. Domain mismatch (token from different domain)
4. Network issues

**Solution**:
- Generate new token on each request
- Check domain configuration in Google Admin
- Review error codes in logs

### Issue: "Token timeout"

**Cause**: Google's API took > 10 seconds to respond

**Solution**:
- Network/firewall issue
- Check Google reCAPTCHA status page
- Retry request

### Issue: All users blocked in production

**Cause**: `RECAPTCHA_MIN_SCORE` set too high

**Solution**:
```bash
# Lower the threshold
RECAPTCHA_MIN_SCORE=0.5  # Instead of 0.7 or higher
```

### Issue: Bots getting through

**Cause**: `RECAPTCHA_MIN_SCORE` set too low

**Solution**:
```bash
# Raise the threshold
RECAPTCHA_MIN_SCORE=0.7  # Instead of 0.3 or 0.5
```

---

## Production Deployment Checklist

- [ ] reCAPTCHA site created in Google Admin
- [ ] Production domain(s) added to allowed domains
- [ ] `RECAPTCHA_SECRET_KEY` set in production environment
- [ ] `RECAPTCHA_MIN_SCORE` configured (recommended: 0.5)
- [ ] `ENVIRONMENT=production` set
- [ ] Frontend configured with site key
- [ ] Test token validation works
- [ ] Review logs for warnings
- [ ] Monitor scores in production
- [ ] Document key location (secret manager)

---

## Advanced Configuration

### Custom Actions

Different actions can have different thresholds:

```python
# Login action - stricter
if action == "login":
    min_score = 0.7
# Comment action - more permissive
elif action == "comment":
    min_score = 0.3
else:
    min_score = 0.5

is_human = await recaptcha_service.is_human(token, min_score=min_score)
```

### Integration with Security Logging

Failed reCAPTCHA validations are automatically logged:

```python
# Already integrated in emergency phones endpoints
# Check backend/app/api/emergency_phones.py for examples
```

### Rate Limiting Integration

Combine reCAPTCHA with rate limiting for maximum protection:

```python
@router.post("/api/sensitive-endpoint")
@limiter.limit("10/minute")  # Rate limit
async def endpoint(request: Request):
    # reCAPTCHA validation
    recaptcha_token = request.headers.get("X-Recaptcha-Token")
    is_human = await recaptcha_service.is_human(recaptcha_token)

    if not is_human:
        raise HTTPException(400, "Validation failed")

    # Process...
```

---

## Resources

- [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
- [reCAPTCHA v3 Documentation](https://developers.google.com/recaptcha/docs/v3)
- [Score Interpretation Guide](https://developers.google.com/recaptcha/docs/v3#interpreting_the_score)
- [Best Practices](https://developers.google.com/recaptcha/docs/v3#best_practices)

---

**Last Updated**: November 22, 2025
**Version**: 1.0
**Status**: Production Ready ✅
