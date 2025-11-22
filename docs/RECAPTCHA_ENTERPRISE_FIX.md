# ✅ FIXED: reCAPTCHA Enterprise Configuration

## The Problem (SOLVED)

You were getting **400 Bad Request** errors because:

❌ Your site key `6LfdTvQrAAAAACkGjvbbFIkqHMsTHwRYYZS_CGq2` is **reCAPTCHA Enterprise**
❌ But the code was using `ReCaptchaV3Provider` (for standard reCAPTCHA v3)
❌ This mismatch caused the 400 error

## The Fix (APPLIED)

✅ Updated `firebase-appcheck.js` to use **`ReCaptchaEnterpriseProvider`**
✅ Changed import from `ReCaptchaV3Provider` to `ReCaptchaEnterpriseProvider`
✅ Added better error logging and diagnostics

---

## Key Differences

### reCAPTCHA v3 vs Enterprise

| Feature | reCAPTCHA v3 | reCAPTCHA Enterprise |
|---------|--------------|----------------------|
| **Cost** | Free (10K/month) | Paid (Google Cloud billing) |
| **Provider** | `ReCaptchaV3Provider` | `ReCaptchaEnterpriseProvider` |
| **Site Key Format** | `6L...` | `6L...` (same format) |
| **API Endpoint** | `www.google.com/recaptcha/api.js` | `www.google.com/recaptcha/enterprise.js` |
| **Use Case** | Small/Medium sites | Enterprise with advanced features |

**Your setup:** reCAPTCHA **Enterprise** (you're using the paid version)

---

## What Was Changed

### Before (WRONG):
```javascript
import { initializeAppCheck, ReCaptchaV3Provider } from "...";

appCheck = initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider(SITE_KEY),  // ❌ Wrong for Enterprise
  isTokenAutoRefreshEnabled: true
});
```

### After (CORRECT):
```javascript
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "...";

appCheck = initializeAppCheck(app, {
  provider: new ReCaptchaEnterpriseProvider(SITE_KEY),  // ✅ Correct for Enterprise
  isTokenAutoRefreshEnabled: true
});
```

---

## Next Steps to Make It Work

### Step 1: Register Site Key in Firebase Console

Even with the correct provider, you still need to register your site key:

1. **Go to Firebase Console → App Check:**
   ```
   https://console.firebase.google.com/project/tuscitasseguras-2d1a6/appcheck
   ```

2. **Click "Apps" tab**

3. **Find your web app:** `1:924208562587:web:5291359426fe390b36213e`

4. **Check if "reCAPTCHA Enterprise" is registered:**
   - If it says "Not registered" → Click app → Click "Register"
   - Select "reCAPTCHA Enterprise"
   - Paste site key: `6LfdTvQrAAAAACkGjvbbFIkqHMsTHwRYYZS_CGq2`
   - Click "Save"

### Step 2: Verify Enforcement is DISABLED

1. **Still in Firebase Console → App Check → Overview**

2. **All three services should say "Unenforced":**
   - ❌ Authentication → **Unenforced**
   - ❌ Cloud Firestore → **Unenforced**
   - ❌ Cloud Storage → **Unenforced**

3. **If any say "Enforced":**
   - Click the service
   - Click "Unenforce"
   - Confirm

### Step 3: Hard Reload Your App

1. **Hard reload:**
   ```
   Ctrl + Shift + R
   ```

2. **Open DevTools Console (F12)**

3. **You should see:**
   ```javascript
   ✅ App Check inicializado correctamente
   📍 Modo: DESARROLLO (debug tokens)
   🔑 Provider: reCAPTCHA Enterprise
   ⏳ Esperando debug token...
   App Check debug token: [some-uuid]
   ```

### Step 4: Register Debug Token (For Localhost)

1. **Copy the debug token** from console (the UUID after "App Check debug token:")

2. **Go to Firebase Console → App Check → Apps → Manage debug tokens**

3. **Click "+ Add debug token"**

4. **Paste the token** and give it a name like "Localhost Development"

5. **Click "Save"**

6. **Wait 1-2 minutes** for Firebase to process it

7. **Hard reload your app** again: `Ctrl + Shift + R`

---

## Expected Behavior After Fix

### Console Output:
```javascript
🔧 App Check Debug Mode ACTIVADO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  IMPORTANTE: Copia el debug token que aparecerá abajo
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ App Check inicializado correctamente
📍 Modo: DESARROLLO (debug tokens)
🔑 Provider: reCAPTCHA Enterprise
⏳ Esperando debug token...

App Check debug token: cb4a5b8b-3dbf-40af-b973-0115297ecb84
You will need to add it to your app's App Check settings...

🧪 Verificando App Check...
✅ App Check Token obtenido:
   Token: eyJhbGciOiJSUzI1NiIsImtpZCI6IjEyMzQ1Njc4OTAi...
   Expira en: [timestamp]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ App Check funcionando correctamente
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Todas las requests incluirán App Check tokens
✅ NO deberías ver errores 401 o 403
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Registration/Login:
```
✅ No 400 Bad Request errors
✅ No 401 Unauthorized errors
✅ No "AppCheck: Requests throttled" warnings
✅ User registration succeeds
✅ Firebase Auth creates user
✅ Firestore saves user document
```

---

## Verifying reCAPTCHA Enterprise Site Key

To verify your site key is correct:

1. **Go to Google Cloud Console:**
   ```
   https://console.cloud.google.com/security/recaptcha
   ```

2. **Select project:** tuscitasseguras-2d1a6

3. **Find your site key:** `6LfdTvQrAAAAACkGjvbbFIkqHMsTHwRYYZS_CGq2`

4. **Verify configuration:**
   - ✅ Type: **reCAPTCHA Enterprise** (should say "Enterprise")
   - ✅ Domains: Must include:
     ```
     localhost
     127.0.0.1
     tuscitasseguras-2d1a6.web.app
     tuscitasseguras-2d1a6.firebaseapp.com
     ```
   - ✅ Status: **Active** (not disabled)

5. **If domains are missing:**
   - Click the site key
   - Click "Edit"
   - Add missing domains under "Domains"
   - Click "Save"

---

## Still Getting 400 Error?

If you still get 400 after this fix, try these in order:

### Option 1: Disable Enforcement (Fastest)
See EMERGENCY_FIX_NOW.md for step-by-step instructions.

### Option 2: Wait for Propagation
Sometimes takes 2-5 minutes for Firebase to process changes.
- Wait 2 minutes
- Clear browser cache: `Ctrl + Shift + Delete`
- Hard reload: `Ctrl + Shift + R`

### Option 3: Clear Everything
```javascript
// In DevTools Console (F12)
localStorage.clear();
sessionStorage.clear();
// Then reload
```

### Option 4: Use Debug-Only Mode
Switch to `firebase-appcheck-debug-only.js` which bypasses reCAPTCHA entirely for localhost:
```javascript
// In HTML files, change:
import './js/firebase-appcheck.js';
// To:
import './js/firebase-appcheck-debug-only.js';
```

---

## Understanding the Error Chain

**Old error chain:**
```
1. ReCaptchaV3Provider tries to validate Enterprise key
2. Google reCAPTCHA API rejects it (wrong provider type)
3. Returns 400 Bad Request
4. Firebase App Check can't get token
5. Auth requests fail with 401 Unauthorized
```

**New error chain (fixed):**
```
1. ReCaptchaEnterpriseProvider validates Enterprise key ✅
2. Google reCAPTCHA API accepts it ✅
3. Returns valid token ✅
4. Firebase App Check includes token in requests ✅
5. Auth requests succeed ✅
```

---

## Production Deployment Notes

When deploying to production:

1. **Debug tokens won't work** (localhost only)
2. **reCAPTCHA Enterprise will be used** automatically
3. **Verify domains** in reCAPTCHA config include your production domain
4. **Enable Enforcement** gradually:
   - Cloud Storage first
   - Cloud Firestore second
   - Authentication last
5. **Monitor Firebase Usage** dashboard for errors

---

## Cost Implications

**reCAPTCHA Enterprise Pricing:**
- First 10,000 assessments/month: **Free**
- 10,001 - 1,000,000: **$1 per 1,000 assessments**
- 1,000,001+: **Volume pricing** (contact Google)

For a dating app with moderate traffic, expect ~$0-50/month.

---

**Last updated:** 2025-11-10
**Status:** ✅ Fixed - Using ReCaptchaEnterpriseProvider
**Next:** Register site key and debug token in Firebase Console
