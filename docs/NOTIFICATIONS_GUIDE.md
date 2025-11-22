# 🔔 Push Notifications System

**Technology:** Firebase Cloud Messaging (FCM)
**Browser Support:** Chrome, Firefox, Edge, Safari (iOS 16.4+)

---

## Setup

### 1. Get VAPID Key

1. Firebase Console → Cloud Messaging → Web Push Certificates
2. Click "Generate key pair"  
3. Copy key (starts with `BN...`)
4. Update in `webapp/js/notifications.js` line 11

### 2. Deploy Functions

```bash
cd functions
firebase deploy --only functions:onMatchCreated,functions:onMessageCreated,functions:onAppointmentConfirmed,functions:sendAppointmentReminders
```

---

## Integration (3 steps)

### Step 1: Import Module

```javascript
import { initializeNotifications } from './js/notifications.js';
await initializeNotifications();
```

### Step 2: Add Bell Icon

```html
<button onclick="showNotificationSettingsPrompt()" class="glass p-3 rounded-full">
  <i class="fas fa-bell"></i>
</button>
```

### Step 3: Test

```javascript
import { getFunctions, httpsCallable } from 'firebase/functions';
const test = httpsCallable(getFunctions(), 'sendTestNotification');
await test();
```

---

## Notification Types

| Trigger | Title | Function |
|---------|-------|----------|
| New match | ¡Nueva solicitud de match! | `onMatchCreated` |
| Match accepted | ¡Match aceptado! | `onMatchAccepted` |
| New message | {senderName} | `onMessageCreated` |
| Appointment confirmed | ✅ Cita confirmada | `onAppointmentConfirmed` |
| 1h before appointment | ⏰ Recordatorio | `sendAppointmentReminders` |
| VIP event | ✨ Nuevo Evento VIP | `onVIPEventPublished` |

---

## Troubleshooting

### Notifications not showing

1. Check permission: `console.log(Notification.permission)`
2. Check service worker: DevTools → Application → Service Workers
3. Verify VAPID key matches Firebase Console

### Tokens not saving

1. Check Firestore rules allow user updates
2. Verify in Firestore: `users/{userId}/fcmTokens`

### Functions not triggering

1. Check logs: `firebase functions:log`
2. Verify exports in `functions/index.js`
3. Check user has FCM tokens in Firestore

---

## Files Created

```
webapp/
├── firebase-messaging-sw.js  # Background notifications
├── js/notifications.js       # Foreground notifications  
└── example-notification-integration.html

functions/
├── notifications.js          # 8 Cloud Functions
└── index.js                  # Updated exports
```

---

## Quick Commands

```bash
# Deploy functions
firebase deploy --only functions

# Test locally
firebase emulators:start

# View logs
firebase functions:log --only onMatchCreated

# Check service worker
chrome://serviceworker-internals
```

**Setup Time:** 15 minutes  
**Delivery:** < 1 second  
**Browser Support:** 95%+
