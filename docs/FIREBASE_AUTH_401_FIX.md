# Firebase Authentication 401 Error Fix

**Error:** `POST https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=... 401 (Unauthorized)`

**Symptom:** User registration fails with `auth/network-request-failed` error

**Last Updated:** 2025-11-14

---

## Root Cause Analysis

The 401 Unauthorized error on Firebase Authentication's signUp endpoint is caused by **App Check enforcement being enabled** in Firebase Console while the application is not sending App Check tokens during development.

### Why This Happens

1. **App Check Import Disabled:** In `register.html`, the App Check import is commented out:
   ```javascript
   // TEMP DISABLED: import './js/firebase-appcheck.js';
   ```

2. **Development Mode:** Even if App Check were imported, `firebase-appcheck.js` is configured to NOT initialize App Check on localhost (lines 66-70):
   ```javascript
   } else if (isDevelopment) {
     console.log('⚠️  App Check DESACTIVADO en modo desarrollo');
     // No inicializar App Check en desarrollo
   }
   ```

3. **Firebase Console Enforcement:** If App Check enforcement is **Enforced** for Authentication in Firebase Console, all authentication requests MUST include a valid App Check token, even on localhost.

**Result:** Firebase rejects the signUp request with 401 because no App Check token is present.

---

## Solution Options

### Option 1: Disable App Check Enforcement (Recommended for Development)

This is the **quickest fix** for local development:

#### Steps:

1. **Go to Firebase Console:**
   ```
   https://console.firebase.google.com/project/tuscitasseguras-2d1a6/appcheck
   ```

2. **Navigate to App Check:**
   - Click on "App Check" in the left sidebar
   - Click on "APIs" tab

3. **Disable Authentication Enforcement:**
   - Find "Authentication" in the list
   - Click on "Authentication"
   - Change enforcement from **"Enforced"** to **"Unenforced"**
   - Click "Save"

4. **Verify Other Services:**
   Ensure these are also set to **"Unenforced"** during development:
   - ✅ Cloud Firestore → **Unenforced**
   - ✅ Cloud Storage → **Unenforced**
   - ✅ Authentication → **Unenforced** (just changed)

5. **Test:**
   - Clear browser cache (Ctrl + Shift + Delete)
   - Hard refresh (Ctrl + Shift + R)
   - Try registering a new user

**Note:** You can re-enable enforcement later for production, but you'll need to properly configure App Check with debug tokens for localhost.

---

### Option 2: Enable App Check with Debug Token (For Testing App Check)

If you want to test App Check functionality on localhost:

#### Steps:

1. **Enable App Check Import** in `register.html`:
   ```javascript
   // Change this:
   // TEMP DISABLED: import './js/firebase-appcheck.js';

   // To this:
   import './js/firebase-appcheck.js';
   ```

2. **Get Debug Token:**
   - Open browser console (F12)
   - Look for this message when the page loads:
     ```
     App Check debug token: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
     ```
   - Copy the token

3. **Register Debug Token in Firebase Console:**
   - Go to: https://console.firebase.google.com/project/tuscitasseguras-2d1a6/appcheck/apps
   - Click on your web app
   - Scroll to "App Check debug tokens"
   - Click "Add debug token"
   - Paste the token and give it a name (e.g., "Localhost Development")
   - Click "Save"

4. **Enable Enforcement:**
   - Go to App Check → APIs
   - Set Authentication to **"Enforced"**

5. **Test:**
   - Hard refresh (Ctrl + Shift + R)
   - Try registering a new user

**Limitations:**
- Debug tokens must be registered for each developer's machine
- Debug tokens expire and need to be renewed periodically

---

### Option 3: Production Setup (For Deployed Sites)

For production domains (e.g., `tuscitasseguras-2d1a6.web.app`):

1. **Ensure Domain is Configured:**
   Check that your domain is in `firebase-appcheck.js` ALLOWED_DOMAINS:
   ```javascript
   const ALLOWED_DOMAINS = [
     'localhost',
     '127.0.0.1',
     'tuscitasseguras-2d1a6.web.app',
     'tuscitasseguras-2d1a6.firebaseapp.com'
   ];
   ```

2. **Configure reCAPTCHA Enterprise:**
   - Go to: https://console.cloud.google.com/security/recaptcha?project=tuscitasseguras-2d1a6
   - Click on site key: `6LfdTvQrAAAAACkGjvbbFIkqHMsTHwRYYZS_CGq2`
   - Add your production domain to "Domains" list
   - Save and wait 2-3 minutes

3. **Enable Enforcement:**
   - Go to Firebase Console → App Check → APIs
   - Set all services to **"Enforced"**

4. **Deploy:**
   ```bash
   firebase deploy --only hosting
   ```

---

## Recommended Approach for This Project

### For Development (Now):
✅ **Use Option 1:** Disable App Check enforcement
- Fast
- No configuration needed
- Works immediately on all developer machines

### For Production (Later):
✅ **Use Option 3:** Full App Check with reCAPTCHA Enterprise
- Maximum security
- Bot protection
- Abuse prevention

---

## Verification Steps

After applying the fix, verify it worked:

1. **Clear Browser Data:**
   - Press Ctrl + Shift + Delete
   - Clear cached images and files
   - Close all browser tabs

2. **Hard Refresh:**
   - Press Ctrl + Shift + R

3. **Open Console:**
   - Press F12
   - Go to Console tab

4. **Check for Messages:**
   You should see one of:
   - ✅ `⚠️  App Check DESACTIVADO en modo desarrollo` (Option 1)
   - ✅ `✅ App Check inicializado correctamente` (Option 2/3)

5. **Test Registration:**
   - Fill out registration form
   - Submit
   - Should succeed without 401 error

---

## Additional Checks

### Check API Key Restrictions

The 401 error can also be caused by API key restrictions in Google Cloud Console:

1. **Go to Google Cloud Console:**
   ```
   https://console.cloud.google.com/apis/credentials?project=tuscitasseguras-2d1a6
   ```

2. **Find API Key:**
   - Look for: `AIzaSyAgFcoHwoBpo80rlEHL2hHVZ2DqtjWXh2s`
   - Click on the key

3. **Check Restrictions:**
   - **Application restrictions:** Should be "None" or include `localhost`
   - **API restrictions:** Should include "Identity Toolkit API"

4. **If Restricted:**
   - Add `localhost` to allowed referrers (HTTP referrers)
   - Or temporarily set to "None" for development

### Check Email/Password Provider

1. **Go to Firebase Console:**
   ```
   https://console.firebase.google.com/project/tuscitasseguras-2d1a6/authentication/providers
   ```

2. **Verify Email/Password is Enabled:**
   - Should show "Email/Password" as **Enabled**
   - If disabled, click on it and enable

---

## Files Modified

If you choose Option 2, you'll need to modify:

- `/webapp/register.html` - Uncomment App Check import (line 253)

---

## Related Documentation

- [APPCHECK_400_ERROR_FIX.md](./APPCHECK_400_ERROR_FIX.md) - App Check 400 errors
- [APP_CHECK_SETUP.md](./APP_CHECK_SETUP.md) - Complete App Check setup guide
- [FIREBASE_CONSOLE_STEPS.md](./FIREBASE_CONSOLE_STEPS.md) - Firebase configuration
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - General troubleshooting

---

## Quick Fix Command

```bash
# Option 1: Just tell the user to disable enforcement in console
# (No code changes needed)

# Option 2: Enable App Check import
sed -i 's|// TEMP DISABLED: import|import|g' webapp/register.html
```

---

## Summary

**Immediate Action Required:**

1. Go to Firebase Console → App Check → APIs
2. Set Authentication to **"Unenforced"**
3. Hard refresh browser (Ctrl + Shift + R)
4. Test registration

**Long-term (Production):**
- Re-enable enforcement
- Configure debug tokens for development
- Use reCAPTCHA Enterprise for production domains

---

**Status:** ✅ Solution ready to implement
**Priority:** 🔴 High (blocks user registration)
**Estimated Fix Time:** 2 minutes (Option 1)
