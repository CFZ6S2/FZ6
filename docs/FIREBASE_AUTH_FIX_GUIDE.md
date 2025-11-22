# Firebase Authentication Fix Guide

## Problem Identified

Your Firebase authentication is failing with a "404 Page not found" error from a Cloud Function. This happens because:

1. **App Check enforcement is likely enabled** in Firebase Console for Authentication
2. **Your client-side App Check is disabled** (which is correct for development)
3. **But Firebase Authentication is still trying to enforce App Check**, causing requests to be blocked

## Immediate Solution

### 1. Disable App Check Enforcement in Firebase Console

**URGENT: Go to Firebase Console and disable App Check enforcement:**

1. Go to [Firebase Console](https://console.firebase.google.com/project/tuscitasseguras-2d1a6/appcheck)
2. Click on **"App Check"** in the left menu
3. Go to **"Overview"** tab
4. For each service, set enforcement to **"Unenforced"**:
   - ✅ **Authentication** → **Unenforced**
   - ✅ **Cloud Firestore** → **Unenforced** 
   - ✅ **Cloud Storage** → **Unenforced**
   - ✅ **Cloud Functions** → **Unenforced**

### 2. Test the Fix

After disabling enforcement, test your authentication:

1. **Open the diagnostic page**: Go to `/webapp/test-auth.html`
2. **Test anonymous authentication**: Click "Test Anonymous Authentication"
3. **Test email authentication**: Use the manual login test

### 3. If Authentication Still Fails

If you still get errors, check these additional issues:

#### A. Check Firebase Auth Domain Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/project/tuscitasseguras-2d1a6/settings/general)
2. Scroll down to **"Your apps"** section
3. Click on the **"Web app"** (gear icon)
4. Under **"Authorized domains"**, make sure your domain is listed:
   - `localhost` (for local development)
   - `tuscitasseguras-2d1a6.web.app` (Firebase hosting)
   - `tuscitasseguras-2d1a6.firebaseapp.com` (Firebase hosting)
   - Your Vercel domain (if deployed)

#### B. Check Authentication Methods

1. Go to [Firebase Console](https://console.firebase.google.com/project/tuscitasseguras-2d1a6/authentication)
2. Click **"Sign-in method"** tab
3. Make sure **"Email/Password"** is **enabled**
4. Check that your test user exists or create one

#### C. Test with Demo Mode

Your app has a demo mode that bypasses authentication:

```javascript
// In your login.html, you can enable demo mode
// This will bypass Firebase authentication entirely
```

## Long-term Solution (Production)

When you're ready to deploy to production:

### 1. Set Up App Check Properly

1. **Get reCAPTCHA Enterprise keys** from Google Cloud Console
2. **Configure App Check** in Firebase Console
3. **Update your App Check configuration** to enable it in production
4. **Test thoroughly** before enabling enforcement

### 2. Monitor Authentication

Set up monitoring for authentication failures:

```javascript
// Add this to your error handling
if (error.code === 'auth/internal-error' && error.message.includes('Cloud Function')) {
  console.error('App Check enforcement issue detected');
  // Show user-friendly message
}
```

## Quick Test Commands

You can test authentication directly in the browser console:

```javascript
// Test basic Firebase connection
console.log('Firebase app:', firebase.app().name);

// Test anonymous authentication
firebase.auth().signInAnonymously()
  .then(user => console.log('Anonymous auth success:', user.uid))
  .catch(error => console.error('Anonymous auth failed:', error));
```

## Summary

The main issue is **App Check enforcement blocking authentication requests**. The immediate fix is to disable App Check enforcement in Firebase Console. Once disabled, your authentication should work normally.

**Next Steps:**
1. ✅ Disable App Check enforcement in Firebase Console
2. ✅ Test authentication using the diagnostic page
3. ✅ Verify your login.html works correctly
4. 🔄 Plan proper App Check setup for production (when ready)