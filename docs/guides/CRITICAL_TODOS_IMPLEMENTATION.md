# 🔴 Critical TODOs Implementation Guide

This guide provides step-by-step instructions for implementing the high-priority TODOs identified in the codebase audit.

## Priority 1: Error Tracking with Sentry

**Status:** Ready to implement
**Impact:** High - Centralized error monitoring in production
**Effort:** Low (1-2 hours)

### Setup Instructions

1. **Create Sentry Account**
   ```bash
   # Visit https://sentry.io and create account
   # Create new project for TuCitaSegura
   ```

2. **Install Sentry SDK**
   ```bash
   npm install --save @sentry/browser @sentry/tracing
   ```

3. **Initialize in webapp**

   Create `webapp/js/sentry-init.js`:
   ```javascript
   import * as Sentry from "@sentry/browser";
   import { BrowserTracing } from "@sentry/tracing";

   Sentry.init({
     dsn: "YOUR_SENTRY_DSN_HERE",
     integrations: [new BrowserTracing()],
     environment: window.location.hostname === 'localhost' ? 'development' : 'production',
     tracesSampleRate: 0.1, // 10% of transactions
     beforeSend(event, hint) {
       // Filter out development errors
       if (window.location.hostname === 'localhost') {
         return null;
       }
       return event;
     }
   });

   export default Sentry;
   ```

4. **Update logger.js**

   The logger already has Sentry integration built-in (lines 250-257, 277-285, 301-310).
   Just add the import and it will work automatically:

   ```javascript
   // At top of logger.js
   import Sentry from './sentry-init.js';
   ```

5. **Configure Environment**
   ```javascript
   // .env or firebase config
   SENTRY_DSN=your_dsn_here
   SENTRY_ENVIRONMENT=production
   ```

**Verification:**
- Trigger an error and check Sentry dashboard
- Verify error contains proper context
- Test that local errors are filtered out

---

## Priority 2: SOS Alert Notifications to Admin

**Status:** Partially implemented
**Impact:** High - User safety feature
**Effort:** Medium (3-4 hours)

### Current State

`functions/notifications.js:426-434` logs SOS alerts but doesn't notify admin.

### Implementation Steps

1. **Create Admin Notification Function**

   Add to `functions/notifications.js`:
   ```javascript
   async function notifyAdminOfSOSAlert(alert) {
     const { userId, userName, appointmentId, location } = alert;

     // Option 1: Email via SendGrid
     const sgMail = require('@sendgrid/mail');
     sgMail.setApiKey(process.env.SENDGRID_API_KEY);

     await sgMail.send({
       to: 'admin@tucitasegura.com',
       from: 'alerts@tucitasegura.com',
       subject: '🚨 SOS ALERT - Immediate Action Required',
       html: `
         <h1>SOS Alert Triggered</h1>
         <p><strong>User:</strong> ${userName} (${userId})</p>
         <p><strong>Appointment:</strong> ${appointmentId}</p>
         <p><strong>Location:</strong> ${JSON.stringify(location)}</p>
         <p><strong>Time:</strong> ${new Date().toISOString()}</p>
         <p><a href="https://console.firebase.google.com/project/YOUR_PROJECT/firestore/data/appointments/${appointmentId}">
           View in Firebase Console
         </a></p>
       `
     });

     // Option 2: Slack webhook
     await axios.post(process.env.SLACK_WEBHOOK_URL, {
       text: `🚨 SOS ALERT: ${userName} triggered emergency alert`,
       blocks: [
         {
           type: "section",
           text: {
             type: "mrkdwn",
             text: `*SOS Alert*\n*User:* ${userName}\n*Appointment:* ${appointmentId}\n*Location:* ${JSON.stringify(location)}`
           }
         }
       ]
     });

     logger.warn('Admin notified of SOS alert', { userId, appointmentId });
   }
   ```

2. **Update onSOSAlert Function**

   Replace lines 426-434:
   ```javascript
   // Notify admin/support team
   await notifyAdminOfSOSAlert({
     userId,
     userName,
     appointmentId,
     location,
     otherUserId
   });
   ```

3. **Add Environment Variables**
   ```bash
   firebase functions:config:set sendgrid.api_key="YOUR_KEY"
   firebase functions:config:set slack.webhook_url="YOUR_URL"
   firebase functions:config:set admin.email="admin@tucitasegura.com"
   ```

**Verification:**
- Trigger test SOS alert from webapp
- Verify email/Slack notification received
- Check logs for successful delivery

---

## Priority 3: Emergency Contact Notifications

**Status:** TODO stub exists
**Impact:** High - User safety feature
**Effort:** Medium (2-3 hours)

### Implementation Steps

1. **Add Emergency Contact Field to User Profile**

   Update Firestore user document schema:
   ```javascript
   {
     emergencyContact: {
       name: string,
       phone: string,
       relationship: string,
       email: string (optional)
     }
   }
   ```

2. **Add UI for Emergency Contact**

   In profile settings page:
   ```html
   <div class="emergency-contact-section">
     <h3>Emergency Contact</h3>
     <input type="text" id="emergencyName" placeholder="Name">
     <input type="tel" id="emergencyPhone" placeholder="Phone">
     <select id="emergencyRelationship">
       <option>Partner</option>
       <option>Parent</option>
       <option>Sibling</option>
       <option>Friend</option>
     </select>
   </div>
   ```

3. **Implement SMS Notification**

   Using Twilio in `functions/notifications.js`:
   ```javascript
   const twilio = require('twilio');
   const client = twilio(
     process.env.TWILIO_ACCOUNT_SID,
     process.env.TWILIO_AUTH_TOKEN
   );

   async function notifyEmergencyContact(userId, userName, location) {
     const userDoc = await admin.firestore()
       .collection('users')
       .doc(userId)
       .get();

     const emergencyContact = userDoc.data().emergencyContact;

     if (!emergencyContact || !emergencyContact.phone) {
       logger.warn('No emergency contact configured', { userId });
       return;
     }

     await client.messages.create({
       body: `Emergency alert: ${userName} has triggered an SOS alert at their date location. Location: ${JSON.stringify(location)}`,
       from: process.env.TWILIO_PHONE_NUMBER,
       to: emergencyContact.phone
     });

     logger.info('Emergency contact notified', { userId, contactPhone: emergencyContact.phone });
   }
   ```

4. **Update onSOSAlert**

   Add call to emergency contact notification:
   ```javascript
   // After admin notification
   if (userData.emergencyContact) {
     await notifyEmergencyContact(userId, userName, location);
   }
   ```

**Verification:**
- Add emergency contact in profile
- Trigger SOS alert
- Verify SMS received by emergency contact

---

## Priority 4: Server-Side Security Logging

**Status:** TODO stub exists
**Impact:** Medium-High - Audit trail
**Effort:** Medium (3-4 hours)

### Implementation Steps

1. **Create Security Events Collection**

   Firestore structure:
   ```javascript
   securityEvents/{eventId}
   {
     userId: string,
     event: string,
     severity: "low" | "medium" | "high" | "critical",
     metadata: object,
     ipAddress: string,
     userAgent: string,
     timestamp: timestamp
   }
   ```

2. **Create Cloud Function for Security Logging**

   `functions/security.js`:
   ```javascript
   const functions = require('firebase-functions');
   const admin = require('firebase-admin');
   const { createLogger } = require('./utils/structured-logger');

   const logger = createLogger('security');

   exports.logSecurityEvent = functions.https.onCall(async (data, context) => {
     if (!context.auth) {
       throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
     }

     const { event, severity, metadata } = data;
     const userId = context.auth.uid;

     const securityEvent = {
       userId,
       event,
       severity,
       metadata: metadata || {},
       ipAddress: context.rawRequest.ip,
       userAgent: context.rawRequest.headers['user-agent'],
       timestamp: admin.firestore.FieldValue.serverTimestamp()
     };

     await admin.firestore()
       .collection('securityEvents')
       .add(securityEvent);

     logger.security(event, { userId, severity, ...metadata });

     return { success: true };
   });
   ```

3. **Update webapp/js/security-logger.js**

   Replace line 90 TODO with:
   ```javascript
   // Send to Cloud Function for server-side logging
   if (severity === 'high' || severity === 'critical') {
     try {
       const logFunction = firebase.functions().httpsCallable('logSecurityEvent');
       await logFunction({ event, severity, metadata });
     } catch (error) {
       console.error('Failed to log security event server-side:', error);
     }
   }
   ```

4. **Add Security Dashboard Query**

   Admin dashboard query:
   ```javascript
   // Get recent high-severity events
   const recentAlerts = await db.collection('securityEvents')
     .where('severity', 'in', ['high', 'critical'])
     .orderBy('timestamp', 'desc')
     .limit(50)
     .get();
   ```

**Verification:**
- Trigger security event from webapp
- Check `securityEvents` collection
- Verify event appears in logs
- Test admin dashboard query

---

## Implementation Priority Order

1. **Sentry Integration** (1-2 hours) - Quick win, immediate value
2. **SOS Admin Alerts** (3-4 hours) - Safety critical
3. **Emergency Contacts** (2-3 hours) - Safety critical
4. **Security Logging** (3-4 hours) - Important for audit trail

**Total Effort:** 9-13 hours for all critical TODOs

---

## Dependencies to Install

```bash
# Sentry (frontend)
npm install --save @sentry/browser @sentry/tracing

# SendGrid (backend - for SOS emails)
cd functions && npm install --save @sendgrid/mail

# Twilio (backend - for emergency SMS)
cd functions && npm install --save twilio
```

## Environment Variables to Configure

```bash
# Sentry
SENTRY_DSN=https://xxx@sentry.io/xxx

# SendGrid
SENDGRID_API_KEY=SG.xxx

# Twilio
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+34xxx

# Slack (optional)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx

# Admin
ADMIN_EMAIL=admin@tucitasegura.com
```

---

## Testing Checklist

- [ ] Sentry captures errors in production
- [ ] SOS alerts reach admin via email/Slack
- [ ] Emergency contacts receive SMS
- [ ] Security events logged server-side
- [ ] All logging includes proper context
- [ ] No PII leakage in logs
- [ ] Development env doesn't trigger alerts

---

## Monitoring

After implementation, monitor:
- Sentry error rate and resolution time
- SOS alert response time
- Emergency contact delivery success rate
- Security events trends
- Cost of SMS/email services

---

**Questions?** Check the main TODO audit at `docs/reports/TODO_AUDIT.md`
