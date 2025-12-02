# Fixing Firebase App Check 403 Errors

## Problem Summary

The application is experiencing 403 Forbidden errors when trying to obtain Firebase App Check tokens:

```
POST https://content-firebaseappcheck.googleapis.com/v1/projects/tuscitasseguras-2d1a6/apps/1:924208562587:web:5291359426fe390b36213e:exchangeRecaptchaEnterpriseToken?key=AIzaSyAgFcoHwoBpo80rlEHL2hHVZ2DqtjWXh2s 403 (Forbidden)
```

### Root Cause

The reCAPTCHA Enterprise site key is **correctly configured in the code** but **NOT registered** in Firebase Console → App Check. This means Firebase doesn't recognize the site key as valid for this web app.

## Current Configuration Status

### ✅ Correctly Configured

1. **Frontend** (`webapp/js/firebase-appcheck.js`):
   - Site key: `6Lc4QBcsAAAAACFZLEgaTz3DuLGiBuXpScrBKt7w`
   - Using `ReCaptchaEnterpriseProvider` (correct)
   - Allowed domains include: `tucitasegura.com`, `www.tucitasegura.com`, `tuscitasseguras-2d1a6.web.app`

2. **Backend** (`functions/recaptcha-enterprise.js`):
   - Same site key configured: `6Lc4QBcsAAAAACFZLEgaTz3DuLGiBuXpScrBKt7w`
   - reCAPTCHA Enterprise client configured

3. **Google Cloud Console** (verified by user):
   - reCAPTCHA Enterprise key exists: `6Lc4QBcsAAAAACFZLEgaTz3DuLGiBuXpScrBKt7w`
   - Domains are authorized: `tucitasegura.com`, `www.tucitasegura.com`, etc.

### ❌ Missing Configuration

**Firebase Console → App Check registration** is missing. The site key needs to be registered for the web app in Firebase Console.

## Solution

### Option 1: Using Firebase Console (Recommended)

1. Navigate to [Firebase Console → App Check](https://console.firebase.google.com/project/tuscitasseguras-2d1a6/appcheck)

2. Find your web app in the list:
   - App ID: `1:924208562587:web:5291359426fe390b36213e`
   - Display name: Your web app name

3. Click **"Register"** or **"Manage"** next to your web app

4. Select **"reCAPTCHA Enterprise"** as the provider

5. Enter the site key:
   ```
   6Lc4QBcsAAAAACFZLEgaTz3DuLGiBuXpScrBKt7w
   ```

6. Click **"Save"**

7. **Important**: Set enforcement mode:
   - For testing: Choose "Not enforced" or "Unenforced"
   - For production: Choose "Enforced" only after testing works

8. Wait 2-3 minutes for changes to propagate

9. Clear browser cache and test in incognito mode

### Option 2: Using the Helper Script

Run the provided script:

```bash
./scripts/register-app-check.sh
```

This script will guide you through the registration process and open the Firebase Console for you.

## Verification Steps

After registering App Check in Firebase Console:

1. **Clear all App Check state**:
   ```bash
   # Open browser console and run:
   await window.clearAppCheckThrottle({ reload: false });
   ```

2. **Test in incognito mode**:
   - Open `https://tucitasegura.com` in incognito
   - Check browser console for App Check logs
   - Should see: "✅ App Check inicializado correctamente"
   - Should NOT see: 403 Forbidden errors

3. **Verify token exchange**:
   ```bash
   # In browser console:
   const token = await window.getAppCheckToken();
   console.log('Token:', token);
   ```
   - Should return a valid token
   - Should NOT throw 403 error

## Why the Error Persisted in Incognito Mode

The error persisted even in incognito mode because:

1. **It's not a browser cache issue** - it's a server-side configuration issue
2. Firebase servers reject the reCAPTCHA token because the site key is not registered
3. Clearing browser data doesn't help because the problem is on Firebase's servers

## Timeline of Changes

1. ✅ Updated site key in code: `6Lc4QBcsAAAAACFZLEgaTz3DuLGiBuXpScrBKt7w`
2. ✅ Deployed to production (verified in deployed files)
3. ✅ Verified GCP Console has correct site key and domains
4. ❌ **Missing**: Register site key in Firebase Console → App Check
5. 🔄 **Next**: Complete the registration to fix 403 errors

## Additional Notes

### App Check Enforcement

- **Development**: Keep App Check "Not enforced" or use debug tokens
- **Production**: Enable enforcement ONLY after verifying tokens work correctly

### Throttling

The 24-hour throttle is a client-side protection. Once Firebase Console is configured:
- The throttle will clear naturally
- You can manually clear it with `clearAppCheckThrottle()`
- New incognito sessions won't be throttled

### Debug Tokens (Development Only)

For local development, you can use App Check debug tokens:

1. Enable debug mode in `firebase-appcheck.js` by setting:
   ```javascript
   window.__FIREBASE_APPCHECK_DEBUG_TOKEN = true;
   ```

2. Check browser console for the debug token

3. Register it in Firebase Console → App Check → Debug tokens

## References

- [Firebase App Check Documentation](https://firebase.google.com/docs/app-check)
- [reCAPTCHA Enterprise with App Check](https://cloud.google.com/recaptcha-enterprise/docs/integrate-app-check)
- [App Check Web SDK Setup](https://firebase.google.com/docs/app-check/web/recaptcha-enterprise-provider)

## Contact

If issues persist after completing these steps, check:

1. Firebase Console audit logs for any errors
2. Google Cloud Console → reCAPTCHA Enterprise metrics
3. Browser network tab for detailed error messages
