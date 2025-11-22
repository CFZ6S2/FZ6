# Fixing App Check 400 Bad Request Error

## Current Error

```
POST exchangeToken 400 (Bad Request)
AppCheck: Requests throttled due to 400 error
Firebase: Error (auth/firebase-app-check-token-is-invalid)
```

## What This Means

The **400 Bad Request** error means the reCAPTCHA site key is either:
1. ❌ Not registered in Firebase Console App Check
2. ❌ Not authorized for your current domain (localhost/127.0.0.1)
3. ❌ Wrong type (needs to be reCAPTCHA v3, not v2)
4. ❌ Not properly configured in Google reCAPTCHA Admin

---

## Fix Option 1: Verify reCAPTCHA Site Key Configuration

### Step 1: Verify Site Key in Firebase Console

**Current site key in code:**
```
6LfdTvQrAAAAACkGjvbbFIkqHMsTHwRYYZS_CGq2
```

1. Go to Firebase Console → App Check:
   ```
   https://console.firebase.google.com/project/tuscitasseguras-2d1a6/appcheck
   ```

2. Click **"Apps"** tab

3. Find your web app: `1:924208562587:web:5291359426fe390b36213e`

4. Check the **Provider** section:
   - Should say: "reCAPTCHA v3" or "reCAPTCHA Enterprise"
   - Should show site key: `6LfdTvQrAAAAACkGjvbbFIkqHMsTHwRYYZS_CGq2`

5. **If NOT registered:**
   - Click your app
   - Click "Register" under reCAPTCHA v3
   - Paste site key: `6LfdTvQrAAAAACkGjvbbFIkqHMsTHwRYYZS_CGq2`
   - Click "Save"

---

### Step 2: Verify Site Key in Google reCAPTCHA Admin

1. Go to Google reCAPTCHA Admin Console:
   ```
   https://www.google.com/recaptcha/admin
   ```

2. Look for site key `6LfdTvQrAAAAACkGjvbbFIkqHMsTHwRYYZS_CGq2`

3. **Verify Configuration:**
   - ✅ **Type:** Must be "reCAPTCHA v3" (NOT v2)
   - ✅ **Domains:** Must include:
     ```
     localhost
     127.0.0.1
     tuscitasseguras-2d1a6.web.app
     tuscitasseguras-2d1a6.firebaseapp.com
     ```
   - ✅ **Status:** Active (not disabled)

4. **If domains are missing:**
   - Click "Settings" (gear icon)
   - Add missing domains
   - Click "Save"

---

### Step 3: Verify Enforcement is DISABLED

Firebase Console → App Check → Overview:

**All three should say "Unenforced":**
- ❌ Authentication → **Unenforced**
- ❌ Cloud Firestore → **Unenforced**
- ❌ Cloud Storage → **Unenforced**

**If any say "Enforced":**
- Click the service
- Click "Unenforce"
- Confirm

---

## Fix Option 2: Create New reCAPTCHA Site Key

If the current site key doesn't work, create a new one:

### Step 1: Create reCAPTCHA v3 Site Key

1. Go to: https://www.google.com/recaptcha/admin/create

2. Fill in form:
   ```
   Label: TuCitaSegura Development
   reCAPTCHA type: reCAPTCHA v3
   Domains:
     localhost
     127.0.0.1
     tuscitasseguras-2d1a6.web.app
     tuscitasseguras-2d1a6.firebaseapp.com
   Owners: (your Google account)
   Accept reCAPTCHA Terms of Service: ✅
   Send alerts: ✅ (optional)
   ```

3. Click "Submit"

4. **Copy the Site Key** (starts with 6L...)

### Step 2: Update firebase-appcheck.js

Edit: `webapp/js/firebase-appcheck.js`

Replace line 4:
```javascript
// OLD:
const RECAPTCHA_V3_SITE_KEY = '6LfdTvQrAAAAACkGjvbbFIkqHMsTHwRYYZS_CGq2';

// NEW:
const RECAPTCHA_V3_SITE_KEY = 'YOUR_NEW_SITE_KEY_HERE';
```

### Step 3: Register New Site Key in Firebase Console

1. Firebase Console → App Check → Apps
2. Click your web app
3. Click "Register" under reCAPTCHA v3
4. Paste the NEW site key
5. Click "Save"

---

## Fix Option 3: Use Debug Token Only (No reCAPTCHA)

For localhost development, you can bypass reCAPTCHA entirely:

### Step 1: Modify firebase-appcheck.js

Edit: `webapp/js/firebase-appcheck.js`

Replace entire file with:

```javascript
import { initializeAppCheck, ReCaptchaV3Provider } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-check.js";
import app from './firebase-config.js';

const isDevelopment = location.hostname === "localhost" ||
                     location.hostname === "127.0.0.1" ||
                     location.hostname.includes("192.168.");

// ALWAYS use debug token in development
if (isDevelopment) {
  self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  console.log('🔧 App Check Debug Mode ACTIVADO');
  console.log('⚠️  Debug token será generado automáticamente');
}

let appCheck = null;

try {
  // Only initialize with reCAPTCHA in production
  if (!isDevelopment) {
    const RECAPTCHA_V3_SITE_KEY = '6LfdTvQrAAAAACkGjvbbFIkqHMsTHwRYYZS_CGq2';

    appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(RECAPTCHA_V3_SITE_KEY),
      isTokenAutoRefreshEnabled: true
    });
  } else {
    // In development, just set debug mode - token will be auto-generated
    console.log('📍 Modo desarrollo: usando debug token sin reCAPTCHA');

    // Initialize with a dummy provider (won't be used)
    appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider('6LfdTvQrAAAAACkGjvbbFIkqHMsTHwRYYZS_CGq2'),
      isTokenAutoRefreshEnabled: true
    });
  }

  window._appCheckInstance = appCheck;
  console.log('✅ App Check inicializado correctamente');

} catch (error) {
  console.error('❌ Error inicializando App Check:', error.message);
}

window.getAppCheckToken = async function() {
  if (!appCheck) return null;
  const { getToken } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-check.js");
  try {
    const result = await getToken(appCheck, false);
    return result;
  } catch (error) {
    console.error('Error getting App Check token:', error);
    return null;
  }
};

export { appCheck };
```

### Step 2: Register Debug Token in Firebase Console

You still need to register the debug token that appears in console:

1. Hard reload: `Ctrl + Shift + R`
2. Check console for: `App Check debug token: [TOKEN]`
3. Copy the token
4. Firebase Console → App Check → Apps → Manage debug tokens
5. Add the token
6. Reload app

---

## Quick Diagnostic Commands

### Check what's happening:

1. **Open verify-appcheck.html:**
   ```
   http://127.0.0.1:5500/webapp/verify-appcheck.html
   ```

2. **Check console for:**
   - What type of token is being requested?
   - Is debug mode active?
   - What's the exact error message?

3. **Run these in console:**
   ```javascript
   // Check if debug mode is active
   console.log('Debug mode:', self.FIREBASE_APPCHECK_DEBUG_TOKEN);

   // Check hostname
   console.log('Hostname:', location.hostname);

   // Try to get token manually
   await window.getAppCheckToken();
   ```

---

## Expected Behavior After Fix

### Console should show:
```javascript
🔧 App Check Debug Mode ACTIVADO
✅ App Check inicializado correctamente
📍 Modo: DESARROLLO (debug tokens)
App Check debug token: [some-uuid]
✅ App Check Token obtenido: eyJhbGc...
✅ App Check funcionando correctamente
```

### Should NOT show:
```javascript
❌ 400 Bad Request
❌ AppCheck: Requests throttled
❌ auth/firebase-app-check-token-is-invalid
```

---

## Root Cause Analysis

**400 Bad Request** means one of these is wrong:

| Issue | How to Check | How to Fix |
|-------|--------------|------------|
| Site key not registered in Firebase | Firebase Console → App Check → Apps | Click "Register" and add site key |
| Site key wrong type (v2 instead of v3) | Google reCAPTCHA Admin → Check type | Create new v3 site key |
| Domain not authorized | Google reCAPTCHA Admin → Domains | Add localhost, 127.0.0.1 |
| Site key doesn't exist | Google reCAPTCHA Admin → Search key | Create new site key |
| Wrong Firebase project | Firebase Console → Check project name | Use correct project |

---

## Recommended Immediate Action

**Try Fix Option 3 first** (Debug Token Only):

1. Update `firebase-appcheck.js` with the code from Option 3
2. Hard reload: `Ctrl + Shift + R`
3. Copy debug token from console
4. Register it in Firebase Console
5. Verify Enforcement is DISABLED
6. Reload and test

This bypasses reCAPTCHA entirely for localhost, which should eliminate the 400 error.

---

## If Still Getting 400 After All Fixes

The nuclear option - disable App Check temporarily:

### Step 1: Comment out App Check imports

In all HTML files, temporarily comment out:
```javascript
// import './js/firebase-appcheck.js';  // TEMPORARILY DISABLED
```

### Step 2: Disable Enforcement in Firebase Console

Verify all services are "Unenforced"

### Step 3: Test without App Check

Your app should work without App Check if Enforcement is disabled.

### Step 4: Re-enable later

Once you figure out the correct reCAPTCHA configuration, re-enable App Check.

---

**Last updated:** 2025-11-10
**Status:** Diagnosing 400 Bad Request on token exchange
