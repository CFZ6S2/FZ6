# 💳 PayPal Integration Documentation

Complete guide for integrating PayPal payments into TuCitaSegura for subscription and insurance payments.

## 📋 Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [PayPal Setup](#paypal-setup)
- [Payment Products](#payment-products)
- [Implementation Details](#implementation-details)
- [Testing](#testing)
- [Production Deployment](#production-deployment)
- [Webhook Integration](#webhook-integration)
- [Security Considerations](#security-considerations)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

TuCitaSegura uses PayPal for processing two types of payments:

1. **Monthly Subscription** (€29.99/month) - Recurring payment for premium membership
2. **Anti-Ghosting Insurance** (€120 one-time) - One-time payment for date insurance

### Payment Flow

```
User Action → PayPal Checkout → Payment Approval → Firestore Update → Success Modal → Redirect
```

---

## 📦 Prerequisites

Before implementing PayPal integration, ensure you have:

1. **PayPal Business Account**
   - Sign up at [paypal.com/business](https://www.paypal.com/business)
   - Complete business verification

2. **Firebase Project**
   - Firestore database configured
   - Authentication enabled
   - Security rules set up

3. **Client ID & Secret**
   - Obtain from PayPal Developer Dashboard
   - Keep credentials secure

---

## 🔧 PayPal Setup

### Step 1: Create PayPal App

1. Go to [developer.paypal.com](https://developer.paypal.com)
2. Navigate to **My Apps & Credentials**
3. Click **Create App**
4. Name it "TuCitaSegura"
5. Copy **Client ID** (you'll need this)

### Step 2: Create Subscription Plan

For the monthly subscription (€29.99/month):

1. Go to **Products & Services** in PayPal Dashboard
2. Click **Create Product**
   - Product name: "TuCitaSegura Premium Membership"
   - Product type: "Service"
3. Click **Create Plan**
   - Plan name: "Monthly Premium"
   - Billing cycle: Monthly
   - Price: €29.99
   - Trial period: Optional (e.g., 7 days free)
4. Copy the **Plan ID** (format: `P-xxxxxxxxxxxxx`)

### Step 3: Configure Payment Pages

Update the following files with your credentials:

#### `/webapp/suscripcion.html`

Replace line 16:
```html
<!-- Before -->
<script src="https://www.paypal.com/sdk/js?client-id=YOUR_PAYPAL_CLIENT_ID&vault=true&intent=subscription"></script>

<!-- After -->
<script src="https://www.paypal.com/sdk/js?client-id=YOUR_ACTUAL_CLIENT_ID&vault=true&intent=subscription"></script>
```

Replace line 294 in the JavaScript:
```javascript
// Before
'plan_id': 'YOUR_SUBSCRIPTION_PLAN_ID',

// After
'plan_id': 'P-xxxxxxxxxxxxx', // Your actual plan ID
```

#### `/webapp/seguro.html`

Replace line 16:
```html
<!-- Before -->
<script src="https://www.paypal.com/sdk/js?client-id=YOUR_PAYPAL_CLIENT_ID&currency=EUR"></script>

<!-- After -->
<script src="https://www.paypal.com/sdk/js?client-id=YOUR_ACTUAL_CLIENT_ID&currency=EUR"></script>
```

---

## 💰 Payment Products

### 1. Monthly Subscription (€29.99/month)

**File**: `/webapp/suscripcion.html`

**Features Unlocked**:
- Send match requests
- Unlimited chat access
- Advanced search filters
- Map view with geolocation
- Reputation system access
- Priority support

**Implementation**:
```javascript
createSubscription: function(data, actions) {
  return actions.subscription.create({
    'plan_id': 'YOUR_SUBSCRIPTION_PLAN_ID',
    'custom_id': currentUser.uid
  });
}
```

**Firestore Updates**:
```javascript
{
  hasActiveSubscription: true,
  subscriptionId: data.subscriptionID,
  subscriptionStartDate: serverTimestamp(),
  subscriptionEndDate: Date (current + 1 month),
  subscriptionStatus: 'active'
}
```

### 2. Anti-Ghosting Insurance (€120 one-time)

**File**: `/webapp/seguro.html`

**Features Unlocked**:
- Schedule unlimited dates
- Financial protection if stood up
- Real-time date verification
- Reputation protection
- Dedicated support

**Implementation**:
```javascript
createOrder: function(data, actions) {
  return actions.order.create({
    purchase_units: [{
      description: 'Seguro Anti-Plantón TuCitaSegura',
      amount: {
        currency_code: 'EUR',
        value: '120.00'
      },
      custom_id: currentUser.uid
    }]
  });
}
```

**Firestore Updates**:
```javascript
{
  hasAntiGhostingInsurance: true,
  insurancePaymentId: data.orderID,
  insurancePurchaseDate: serverTimestamp(),
  insuranceAmount: 120
}
```

---

## 🔨 Implementation Details

### Payment Validation Flow

The payment validation is implemented in `/webapp/buscar-usuarios.html`:

```javascript
function checkPaymentStatus() {
  // Gender-based payment rules
  const userMustPay = currentUserData.gender === 'masculino';

  if (!userMustPay) {
    return { canUse: true, reason: null };
  }

  // Check subscription
  if (!currentUserData.hasActiveSubscription) {
    return {
      canUse: false,
      reason: 'membership',
      title: 'Membresía Requerida',
      message: 'Para enviar solicitudes de cita necesitas una membresía activa.'
    };
  }

  // Check insurance (for scheduling dates)
  if (!currentUserData.hasAntiGhostingInsurance) {
    return {
      canUse: false,
      reason: 'insurance',
      title: 'Seguro Anti-Plantón Requerido',
      message: 'Para agendar citas debes contratar el seguro anti-plantón de 120€.'
    };
  }

  return { canUse: true, reason: null };
}
```

### Payment Modal System

When a user tries to perform a restricted action:

```javascript
function showPaymentRequiredModal(reason, title, message) {
  // Display modal with payment details
  // Redirect to appropriate payment page
  if (reason === 'membership') {
    window.location.href = '/webapp/suscripcion.html';
  } else if (reason === 'insurance') {
    window.location.href = '/webapp/seguro.html';
  }
}
```

### Error Handling

Both payment pages implement comprehensive error handling:

1. **onApprove**: Payment successful → Update Firestore
2. **onError**: PayPal error → Show error modal
3. **onCancel**: User cancelled → Show cancellation message

---

## 🧪 Testing

### Sandbox Testing

PayPal provides a sandbox environment for testing:

1. **Enable Sandbox Mode**
   ```html
   <script src="https://www.paypal.com/sdk/js?client-id=YOUR_SANDBOX_CLIENT_ID&vault=true&intent=subscription"></script>
   ```

2. **Create Test Accounts**
   - Go to [developer.paypal.com/developer/accounts](https://developer.paypal.com/developer/accounts)
   - Create a "Personal" account (buyer)
   - Create a "Business" account (seller)

3. **Test Payment Flow**
   - Use sandbox credentials to log in during checkout
   - Test cards are available at [developer.paypal.com/tools/sandbox/card-testing](https://developer.paypal.com/tools/sandbox/card-testing)

### Test Scenarios

| Scenario | Expected Behavior |
|----------|-------------------|
| Successful subscription | Firestore updated with `hasActiveSubscription: true` |
| Successful insurance payment | Firestore updated with `hasAntiGhostingInsurance: true` |
| Payment cancelled | Error modal shown, no Firestore update |
| Network error | Error modal shown, transaction logged |
| Already subscribed | User can still access page (no duplicate check yet) |

### Manual Testing Checklist

- [ ] Subscription page loads correctly
- [ ] Insurance page loads correctly
- [ ] PayPal button renders
- [ ] Can complete subscription purchase
- [ ] Can complete insurance purchase
- [ ] Firestore updates correctly on success
- [ ] Error modal shows on failure
- [ ] Success modal shows on completion
- [ ] Redirect to search page works
- [ ] Payment status banner updates in search page

---

## 🚀 Production Deployment

### Checklist Before Going Live

1. **Switch to Production Client ID**
   - Replace sandbox client ID with production client ID
   - Update in both `suscripcion.html` and `seguro.html`

2. **Update Subscription Plan ID**
   - Use production plan ID (not sandbox)
   - Verify pricing is correct (€29.99)

3. **Configure Return URLs**
   - Set return URL to your production domain
   - Set cancel URL to your production domain

4. **Enable HTTPS**
   - PayPal requires HTTPS in production
   - Ensure SSL certificate is valid

5. **Test with Real Payments**
   - Make test purchases with small amounts
   - Verify Firestore updates
   - Test refund process

6. **Set Up Email Notifications**
   - Configure PayPal IPN (Instant Payment Notification)
   - Set up order confirmation emails

---

## 🔔 Webhook Integration

For production, implement webhooks to handle subscription events:

### Recommended Webhooks

1. **BILLING.SUBSCRIPTION.ACTIVATED**
   - Triggered when subscription starts
   - Update Firestore: `hasActiveSubscription: true`

2. **BILLING.SUBSCRIPTION.CANCELLED**
   - Triggered when user cancels
   - Update Firestore: `subscriptionStatus: 'cancelled'`

3. **BILLING.SUBSCRIPTION.EXPIRED**
   - Triggered when subscription expires
   - Update Firestore: `hasActiveSubscription: false`

4. **PAYMENT.SALE.COMPLETED**
   - Triggered for one-time payments
   - Verify insurance payment

### Webhook Implementation (Node.js/Cloud Functions)

```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');

exports.paypalWebhook = functions.https.onRequest(async (req, res) => {
  const event = req.body;

  switch (event.event_type) {
    case 'BILLING.SUBSCRIPTION.ACTIVATED':
      await handleSubscriptionActivated(event);
      break;
    case 'BILLING.SUBSCRIPTION.CANCELLED':
      await handleSubscriptionCancelled(event);
      break;
    case 'BILLING.SUBSCRIPTION.EXPIRED':
      await handleSubscriptionExpired(event);
      break;
    case 'PAYMENT.SALE.COMPLETED':
      await handlePaymentCompleted(event);
      break;
  }

  res.status(200).send('OK');
});

async function handleSubscriptionActivated(event) {
  const userId = event.resource.custom_id;
  const subscriptionId = event.resource.id;

  await admin.firestore().collection('users').doc(userId).update({
    hasActiveSubscription: true,
    subscriptionId: subscriptionId,
    subscriptionStatus: 'active',
    subscriptionStartDate: admin.firestore.FieldValue.serverTimestamp()
  });
}

// Similar functions for other event types...
```

### Configure Webhooks in PayPal

1. Go to PayPal Developer Dashboard
2. Select your app
3. Add webhook URL: `https://your-domain.com/api/paypal-webhook`
4. Subscribe to events listed above
5. Copy webhook ID for verification

---

## 🔒 Security Considerations

### Client-Side Security

1. **Never Store Credentials Client-Side**
   - Client ID is safe to expose (public key)
   - Never expose secret key in JavaScript

2. **Validate User Authentication**
   - Always check Firebase auth before showing payment pages
   - Redirect unauthenticated users to login

3. **Prevent Duplicate Payments**
   ```javascript
   // Check if user already has subscription before showing PayPal button
   if (currentUserData.hasActiveSubscription) {
     showAlreadySubscribedMessage();
     return;
   }
   ```

### Server-Side Security (Recommended)

For production, implement server-side payment verification:

```javascript
// Cloud Function to verify PayPal payment
exports.verifyPayment = functions.https.onCall(async (data, context) => {
  // Ensure user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
  }

  const { orderID, subscriptionID } = data;

  // Verify with PayPal API
  const paypalResponse = await fetch(`https://api.paypal.com/v2/checkout/orders/${orderID}`, {
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`
    }
  });

  const orderData = await paypalResponse.json();

  // Verify amount and status
  if (orderData.status === 'COMPLETED' && orderData.purchase_units[0].amount.value === '120.00') {
    // Update Firestore
    await admin.firestore().collection('users').doc(context.auth.uid).update({
      hasAntiGhostingInsurance: true,
      insurancePaymentId: orderID,
      insurancePurchaseDate: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true };
  }

  throw new functions.https.HttpsError('invalid-argument', 'Payment verification failed');
});
```

### Best Practices

1. **Rate Limiting**: Implement rate limiting on payment endpoints
2. **Logging**: Log all payment attempts for audit trail
3. **Monitoring**: Set up alerts for failed payments
4. **PCI Compliance**: Never handle card data directly (PayPal handles this)
5. **GDPR Compliance**: Properly handle and store payment data

---

## 🐛 Troubleshooting

### Common Issues

#### 1. PayPal Button Doesn't Render

**Symptoms**: Empty PayPal button container

**Solutions**:
- Check console for JavaScript errors
- Verify Client ID is correct
- Ensure PayPal SDK loaded successfully
- Check if user is authenticated (button only renders after auth)

```javascript
// Add debug logging
console.log('PayPal SDK loaded:', typeof paypal !== 'undefined');
console.log('Current user:', currentUser);
```

#### 2. Payment Succeeds but Firestore Doesn't Update

**Symptoms**: PayPal payment completed but user still sees "Payment Required"

**Solutions**:
- Check browser console for Firestore errors
- Verify Firestore security rules allow writes
- Check if user UID matches document ID
- Verify Firebase config is correct

```javascript
// Add error handling
try {
  await updateDoc(userRef, {...});
  console.log('Firestore updated successfully');
} catch (error) {
  console.error('Firestore update failed:', error);
  // Show error to user
}
```

#### 3. Subscription Not Found Error

**Symptoms**: "Plan ID not found" error from PayPal

**Solutions**:
- Verify Plan ID is correct (format: `P-xxxxxxxxxxxxx`)
- Check if plan is active in PayPal dashboard
- Ensure using production plan ID in production

#### 4. Currency Mismatch

**Symptoms**: Payment amount shows in wrong currency

**Solutions**:
- Verify `currency=EUR` in PayPal SDK URL
- Check PayPal account currency settings
- Ensure plan is created with EUR currency

#### 5. CORS Errors

**Symptoms**: Browser blocks PayPal API calls

**Solutions**:
- PayPal SDK handles CORS automatically
- If using custom API calls, implement server-side proxy
- Don't make direct API calls from client-side

### Debug Mode

Enable PayPal debug mode for detailed logging:

```html
<script src="https://www.paypal.com/sdk/js?client-id=YOUR_CLIENT_ID&debug=true"></script>
```

### Support Resources

- **PayPal Developer Docs**: [developer.paypal.com/docs](https://developer.paypal.com/docs)
- **PayPal Community**: [paypal-community.com](https://www.paypal-community.com/)
- **Stack Overflow**: Tag `paypal` for community support

---

## 📊 Analytics and Monitoring

### Recommended Metrics

Track these KPIs for payment optimization:

1. **Conversion Rate**: (Payments completed / Payment page visits)
2. **Abandonment Rate**: (Payments cancelled / Payments initiated)
3. **Average Time to Complete**: Time from page load to payment
4. **Error Rate**: (Failed payments / Total attempts)
5. **Revenue Metrics**: MRR (Monthly Recurring Revenue), ARPU, Churn

### Google Analytics Integration

```javascript
// Track payment initiation
gtag('event', 'begin_checkout', {
  currency: 'EUR',
  value: 29.99,
  items: [{ id: 'membership', name: 'Premium Membership' }]
});

// Track payment success
gtag('event', 'purchase', {
  transaction_id: data.subscriptionID,
  value: 29.99,
  currency: 'EUR',
  items: [{ id: 'membership', name: 'Premium Membership', price: 29.99 }]
});
```

---

## 🔄 Future Enhancements

### Roadmap

1. **Gift Subscriptions**: Allow users to gift memberships
2. **Promotional Codes**: Implement discount codes
3. **Annual Plans**: Add yearly subscription with discount
4. **Bundle Pricing**: Membership + Insurance at reduced rate
5. **Payment Methods**: Add credit card direct payment (not just PayPal)
6. **Invoicing**: Generate PDF invoices for business users
7. **Refund Management**: Automated refund processing for cancellations

---

## 📞 Support

For implementation help:

1. **Technical Issues**: Check Firebase console logs
2. **PayPal Issues**: Contact PayPal Merchant Support
3. **Integration Help**: Refer to PayPal SDK documentation

---

## ✅ Deployment Checklist

Before deploying to production:

- [ ] Replace sandbox Client ID with production Client ID
- [ ] Update subscription Plan ID with production plan
- [ ] Test all payment flows in sandbox
- [ ] Configure webhook endpoints
- [ ] Set up error monitoring (e.g., Sentry)
- [ ] Implement server-side payment verification
- [ ] Add analytics tracking
- [ ] Configure email notifications
- [ ] Update privacy policy with payment terms
- [ ] Enable HTTPS on production domain
- [ ] Test with real payment (small amount)
- [ ] Document payment process for support team
- [ ] Set up refund policy and process
- [ ] Configure billing alerts in PayPal
- [ ] Add payment FAQ to help center

---

## 📝 License

This integration follows PayPal's terms of service and acceptable use policy. Ensure compliance with:

- PayPal User Agreement
- PayPal Acceptable Use Policy
- GDPR (for EU users)
- PSD2 Strong Customer Authentication (SCA)

---

**Last Updated**: 2025-11-07
**Version**: 1.0.0
**Author**: TuCitaSegura Development Team
