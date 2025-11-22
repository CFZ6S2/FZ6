# 🔔 Firebase Cloud Messaging (FCM) - VAPID Key Setup

## ⚠️ CONFIGURATION REQUIRED

To enable push notifications in TuCitaSegura, you must configure the **VAPID public key** from Firebase Console.

---

## 📋 Step-by-Step Instructions

### 1. Access Firebase Console
```
https://console.firebase.google.com/project/tuscitasseguras-2d1a6/settings/cloudmessaging
```

Or navigate manually:
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **tuscitasseguras-2d1a6**
3. Click ⚙️ **Settings** (gear icon) → **Project settings**
4. Navigate to **Cloud Messaging** tab

### 2. Generate Web Push Certificate (VAPID Key)

1. Scroll down to **"Web Push certificates"** section
2. If no key pair exists:
   - Click **"Generate key pair"** button
   - Wait for generation (takes ~5 seconds)
3. Copy the **public key** that appears

**Example format:**
```
BNcX7hE9s9FhP3KJ8vL2mR4tY6uW8xZ0aB2cD4eF6gH8iJ0kL1mN3oP5qR7sT9uV1wX3yZ5aB7cD9eF1gH3iJ5kL
```

### 3. Update Firebase Configuration File

Open file: `webapp/js/firebase-config.js`

Find this line (around line 46):
```javascript
export const VAPID_PUBLIC_KEY = 'BNxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
```

Replace the placeholder value with your **actual VAPID public key**:
```javascript
export const VAPID_PUBLIC_KEY = 'BNcX7hE9s9FhP3KJ8vL2mR4tY6uW8xZ0aB2cD4eF6gH8iJ0kL1mN3oP5qR7sT9uV1wX3yZ5aB7cD9eF1gH3iJ5kL';
```

### 4. Save and Deploy

```bash
# Commit the change
git add webapp/js/firebase-config.js
git commit -m "config: Add Firebase Cloud Messaging VAPID public key"

# Deploy to hosting
firebase deploy --only hosting
```

---

## ✅ Verification

After configuration, test notifications:

### Test in Browser Console

```javascript
// 1. Import notification module
import { initializeNotifications } from './js/notifications.js';

// 2. Initialize
const result = await initializeNotifications();

// 3. Check result
console.log('Notifications initialized:', result);
// Should output: true (if successful)
```

### Expected Behavior

**If configured correctly:**
- ✅ Browser requests notification permission
- ✅ FCM token is generated and saved to Firestore
- ✅ Foreground messages are received and displayed
- ✅ Console shows: `FCM Token obtained: [first 20 chars]...`

**If NOT configured:**
- ❌ Error: `Messaging: We are unable to register the default service worker`
- ❌ Error: `Failed to get token`
- ⚠️ Check that VAPID key is correct and not placeholder

---

## 🔒 Security Notes

### Is it safe to include VAPID key in client code?

**YES** ✅ - The VAPID public key is designed to be public.

**Why it's safe:**
- It's a **public key** (not a secret)
- Used only for client-side messaging subscription
- Cannot be used to send notifications (that requires server-side Firebase Admin SDK)
- Similar to Firebase API keys - public by design

**Real security:**
- Firestore Security Rules control data access
- Firebase App Check prevents unauthorized app access
- Cloud Functions control who can send notifications

---

## 📚 Related Files

**Configuration:**
- `webapp/js/firebase-config.js` - VAPID key configuration
- `webapp/js/notifications.js` - Notifications client
- `webapp/firebase-messaging-sw.js` - Service worker for background messages

**Cloud Functions:**
- `functions/notifications.js` - Server-side notification triggers

**Documentation:**
- `NOTIFICATIONS_GUIDE.md` - Complete notifications guide
- `functions/README.md` - Cloud Functions documentation

---

## 🆘 Troubleshooting

### Error: "We are unable to register the default service worker"

**Cause:** Service worker not found or VAPID key invalid

**Fix:**
1. Verify `firebase-messaging-sw.js` exists in webapp root
2. Check VAPID key is correct (not placeholder)
3. Clear browser cache and reload

### Error: "Messaging: The notification permission was not granted"

**Cause:** User denied notification permission

**Fix:**
1. In browser settings, allow notifications for your domain
2. Chrome: Settings → Privacy → Site Settings → Notifications
3. Reload page and try again

### No token generated

**Cause:** VAPID key is still placeholder value

**Fix:**
1. Verify you replaced the placeholder in `firebase-config.js`
2. Check key starts with "BN" and is 88 characters
3. Reload page

---

## 📞 Additional Resources

**Firebase Documentation:**
- [Web Push Certificates](https://firebase.google.com/docs/cloud-messaging/js/client#access_the_registration_token)
- [FCM Setup](https://firebase.google.com/docs/cloud-messaging/js/client)

**TuCitaSegura Docs:**
- See `NOTIFICATIONS_GUIDE.md` for complete setup
- See `CLAUDE.md` section on Firebase integration

---

**Last Updated:** 2025-11-14
**Priority:** ⚠️ **REQUIRED** for push notifications
**Estimated Time:** 5 minutes
