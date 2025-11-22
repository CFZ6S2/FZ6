// functions/test/webhooks.test.js
const { expect } = require('chai');
const sinon = require('sinon');
const test = require('firebase-functions-test')();

// Mock Stripe
const stripeMock = {
  webhooks: {
    constructEvent: sinon.stub()
  },
  subscriptions: {
    retrieve: sinon.stub()
  }
};

// Stub global.fetch to satisfy PayPal OAuth and webhook signature verification
// First call: OAuth token; Second call: Verify webhook signature
const fetchStub = sinon.stub();
fetchStub.onFirstCall().resolves({
  ok: true,
  json: async () => ({ access_token: 'test-access-token' })
});
fetchStub.onSecondCall().resolves({
  ok: true,
  json: async () => ({ verification_status: 'SUCCESS' })
});
global.fetch = fetchStub;

// Prepare admin mock to avoid real initialization
const adminMock = {
  initializeApp: sinon.stub(),
  firestore: sinon.stub(),
  auth: sinon.stub()
};
// Provide FieldValue static methods needed by code under test
adminMock.firestore.FieldValue = {
  serverTimestamp: () => ({ __serverTimestamp__: true }),
  delete: () => ({ __delete__: true })
};
adminMock.firestore.Timestamp = {
  now: () => new Date(),
  fromDate: (d) => d,
  fromMillis: (ms) => new Date(ms)
};

// Load functions with mocked Stripe and Firebase Admin
const proxyquire = require('proxyquire').noCallThru();

// Ensure test environment for conditional exports
process.env.NODE_ENV = 'test';

// Configure PayPal env vars before loading functions
process.env.PAYPAL_WEBHOOK_ID = 'WH-TEST';
process.env.PAYPAL_CLIENT_ID = 'CLIENT-TEST';
process.env.PAYPAL_SECRET = 'SECRET-TEST';
process.env.PAYPAL_MODE = 'sandbox';
process.env.PAYPAL_SKIP_SIGNATURE_FOR_TESTS = '1';

const myFunctions = proxyquire('../index', {
  'stripe': () => stripeMock,
  'firebase-admin': adminMock
});

describe('Payment Webhooks', () => {
  let adminStub;
  let authStub;
  let setCustomClaimsStub;
  // Use a singleton Firestore stub across tests to ensure call tracking
  const firestoreSingleton = {
    collection: sinon.stub(),
    doc: sinon.stub(),
    get: sinon.stub(),
    set: sinon.stub().resolves(),
    update: sinon.stub().resolves(),
    add: sinon.stub().resolves({ id: 'test-added-doc' })
  };

  // Chain behavior: collection().doc() returns a lightweight reference that forwards to the singleton stubs
  firestoreSingleton.collection.callsFake(() => ({
    doc: firestoreSingleton.doc,
    update: firestoreSingleton.update,
    set: firestoreSingleton.set,
    get: firestoreSingleton.get,
    add: firestoreSingleton.add
  }));
  firestoreSingleton.doc.callsFake(() => ({
    update: firestoreSingleton.update,
    set: firestoreSingleton.set,
    get: firestoreSingleton.get,
    collection: () => ({
      add: firestoreSingleton.add,
      set: firestoreSingleton.set,
      update: firestoreSingleton.update,
      get: firestoreSingleton.get
    })
  }));

  before(() => {
    // Initialize Firebase Admin
    adminMock.initializeApp();

    // Configure PayPal env vars used in webhook verification
    process.env.PAYPAL_WEBHOOK_ID = 'WH-TEST';
    process.env.PAYPAL_CLIENT_ID = 'CLIENT-TEST';
    process.env.PAYPAL_SECRET = 'SECRET-TEST';
    process.env.PAYPAL_MODE = 'sandbox';
    process.env.PAYPAL_SKIP_SIGNATURE_FOR_TESTS = '1';
  });

  beforeEach(() => {
    // Reset all stubs
    sinon.reset();

    // Reset singleton stubs and use them for this test session
    firestoreSingleton.collection.resetHistory();
    firestoreSingleton.doc.resetHistory();
    firestoreSingleton.get.resetHistory();
    firestoreSingleton.set.resetHistory();
    firestoreSingleton.update.resetHistory();
    // Instrument update to observe calls during tests
    firestoreSingleton.update.callsFake(async (...args) => {
      // eslint-disable-next-line no-console
      console.log('[TEST] firestore.update called with', JSON.stringify(args[0] || {}));
      return Promise.resolve();
    });

    // Reapply chaining behavior after global sinon.reset()
    firestoreSingleton.collection.callsFake(() => ({
      doc: firestoreSingleton.doc,
      update: firestoreSingleton.update,
      set: firestoreSingleton.set,
      get: firestoreSingleton.get,
      add: firestoreSingleton.add
    }));
    firestoreSingleton.doc.callsFake(() => ({
      update: firestoreSingleton.update,
      set: firestoreSingleton.set,
      get: firestoreSingleton.get,
      collection: () => ({
        add: firestoreSingleton.add,
        set: firestoreSingleton.set,
        update: firestoreSingleton.update,
        get: firestoreSingleton.get
      })
    }));

    adminMock.firestore.returns(firestoreSingleton);
    adminStub = adminMock.firestore;
    setCustomClaimsStub = sinon.stub().resolves();
    adminMock.auth.returns({
      getUser: sinon.stub().resolves({ uid: 'test-user', customClaims: {} }),
      setCustomClaims: setCustomClaimsStub
    });
    authStub = adminMock.auth;

    // Reconfigure fetch stub for each test to avoid reset() side effects
    const fetchStub = sinon.stub();
    fetchStub.onFirstCall().resolves({
      ok: true,
      json: async () => ({ access_token: 'test-access-token' })
    });
    fetchStub.onSecondCall().resolves({
      ok: true,
      json: async () => ({ verification_status: 'SUCCESS' })
    });
    global.fetch = fetchStub;
  });

  afterEach(() => {
    adminMock.firestore.reset();
    adminMock.auth.reset();
  });

  after(() => {
    test.cleanup();
  });

  describe('Stripe Webhook', () => {
    describe('customer.subscription.created', () => {
      it('should activate membership when subscription is created', async () => {
        const subscriptionEvent = {
          id: 'sub_test123',
          object: 'subscription',
          status: 'active',
          metadata: {
            userId: 'user123',
            plan: 'monthly'
          },
          items: {
            data: [{
              price: {
                unit_amount: 2999 // €29.99
              }
            }]
          },
          currency: 'eur',
          current_period_start: 1700000000,
          current_period_end: 1702592000,
          cancel_at_period_end: false
        };

        stripeMock.webhooks.constructEvent.returns({
          type: 'customer.subscription.created',
          data: { object: subscriptionEvent }
        });

        // Mock request/response
        const req = {
          headers: { 'stripe-signature': 'test-sig' },
          rawBody: Buffer.from('test')
        };
        const res = {
          json: sinon.stub(),
          status: sinon.stub().returnsThis(),
          send: sinon.stub()
        };

        // Mock Firestore user doc
        firestoreSingleton.get.resolves({
          exists: true,
          data: () => ({ uid: 'user123', gender: 'masculino' })
        });

        // Call handler directly to bypass signature plumbing in unit test
        await myFunctions._testHandlers.handleSubscriptionUpdate(subscriptionEvent);

        // Assertions
        // Webhook response not used when calling handler directly

        // Verify membership activation via custom claims update
        expect(setCustomClaimsStub.called).to.be.true;

        // Verify subscription was logged
        expect(firestoreSingleton.set.called).to.be.true;
      });

      it('should reject webhook with invalid signature', async () => {
        stripeMock.webhooks.constructEvent.throws(new Error('Invalid signature'));

        const req = {
          headers: { 'stripe-signature': 'invalid-sig' },
          rawBody: Buffer.from('test')
        };
        const res = {
          json: sinon.stub(),
          status: sinon.stub().returnsThis(),
          send: sinon.stub()
        };

        await myFunctions.stripeWebhook(req, res);

        expect(res.status.calledWith(400)).to.be.true;
        expect(res.send.called).to.be.true;
      });

      it('should handle missing userId in metadata', async () => {
        const subscriptionEvent = {
          id: 'sub_test456',
          status: 'active',
          metadata: {}, // No userId
          items: { data: [{ price: { unit_amount: 2999 } }] },
          currency: 'eur',
          current_period_start: 1700000000,
          current_period_end: 1702592000
        };

        stripeMock.webhooks.constructEvent.returns({
          type: 'customer.subscription.created',
          data: { object: subscriptionEvent }
        });

        const req = {
          headers: { 'stripe-signature': 'test-sig' },
          rawBody: Buffer.from('test')
        };
        const res = {
          json: sinon.stub(),
          status: sinon.stub().returnsThis(),
          send: sinon.stub()
        };

        await myFunctions.stripeWebhook(req, res);

        // Should still return 200 but not update Firestore
        expect(res.json.calledWith({ received: true })).to.be.true;
        expect(firestoreSingleton.update.called).to.be.false;
      });
    });

    describe('customer.subscription.deleted', () => {
      it('should deactivate membership when subscription is canceled', async () => {
        const subscriptionEvent = {
          id: 'sub_test123',
          status: 'canceled',
          metadata: {
            userId: 'user123'
          }
        };
        // Call handler directly to bypass webhook signature plumbing
        await myFunctions._testHandlers.handleSubscriptionCanceled(subscriptionEvent);

        // Verify membership deactivation via custom claims update
        expect(setCustomClaimsStub.called).to.be.true;

        // Verify hasActiveSubscription was set to false
        const updateCall = firestoreSingleton.update.getCall(0);
        expect(updateCall.args[0].hasActiveSubscription).to.be.false;
        expect(updateCall.args[0].subscriptionStatus).to.equal('canceled');
      });
    });

    describe('payment_intent.succeeded', () => {
      it('should activate insurance when payment succeeds', async () => {
        const paymentIntent = {
          id: 'pi_test123',
          amount: 12000, // €120.00
          currency: 'eur',
          status: 'succeeded',
          payment_method_types: ['card'],
          metadata: {
            userId: 'user123',
            paymentType: 'insurance'
          }
        };
        // Call handler directly
        await myFunctions._testHandlers.handlePaymentSucceeded(paymentIntent);

        // Verify insurance activation
        expect(firestoreSingleton.update.called).to.be.true;
        const updateCall = firestoreSingleton.update.getCall(0);
        expect(updateCall.args[0].hasAntiGhostingInsurance).to.be.true;
        expect(updateCall.args[0].insurancePaymentId).to.equal('pi_test123');
        expect(updateCall.args[0].insuranceAmount).to.equal(120);
      });

      it('should not activate insurance for non-insurance payments', async () => {
        const paymentIntent = {
          id: 'pi_test456',
          amount: 2999,
          currency: 'eur',
          status: 'succeeded',
          metadata: {
            userId: 'user123',
            paymentType: 'other' // Not insurance
          }
        };

        // Call handler directly
        await myFunctions._testHandlers.handlePaymentSucceeded(paymentIntent);
        // Should not update insurance fields
        expect(firestoreSingleton.update.called).to.be.false;
      });

      it('should process a Stripe payment_intent only once when received twice', async () => {
        const evtId = 'evt_pi_dup_123';

        const paymentIntent = {
          id: 'pi_dup_123',
          amount: 12000,
          currency: 'eur',
          status: 'succeeded',
          payment_method_types: ['card'],
          metadata: { userId: 'user123', paymentType: 'insurance' }
        };

        // Mismo event.id en dos llamadas de firma
        stripeMock.webhooks.constructEvent
          .onFirstCall().returns({ type: 'payment_intent.succeeded', id: evtId, data: { object: paymentIntent } })
          .onSecondCall().returns({ type: 'payment_intent.succeeded', id: evtId, data: { object: paymentIntent } });

        const req = { headers: { 'stripe-signature': 't=123,v1=test' }, rawBody: Buffer.from('{}') };
        const res = { json: sinon.stub(), status: sinon.stub().returnsThis(), send: sinon.stub() };

        // Idempotencia: primera vez no existe, segunda ya existe
        firestoreSingleton.get.onFirstCall().resolves({ exists: false });
        firestoreSingleton.get.onSecondCall().resolves({ exists: true });

        const before = firestoreSingleton.update.callCount;
        await myFunctions.stripeWebhook(req, res);
        const afterFirst = firestoreSingleton.update.callCount;
        await myFunctions.stripeWebhook(req, res);
        const afterSecond = firestoreSingleton.update.callCount;

        expect(afterFirst).to.be.greaterThan(before);
        expect(afterSecond).to.equal(afterFirst);
      });
    });

    describe('invoice.payment_failed', () => {
      it('should mark subscription as past_due when invoice payment fails', async () => {
        const invoice = {
          id: 'in_test123',
          subscription: 'sub_test123',
          amount_due: 2999,
          currency: 'eur'
        };

        stripeMock.subscriptions.retrieve.resolves({
          id: 'sub_test123',
          metadata: { userId: 'user123' }
        });

        // Call handler directly
        await myFunctions._testHandlers.handleInvoicePaymentFailed(invoice);

        // Verify subscription status was updated to past_due
        expect(firestoreSingleton.update.called).to.be.true;
        const updateCall = firestoreSingleton.update.getCall(0);
        expect(updateCall.args[0].subscriptionStatus).to.equal('past_due');
        expect(updateCall.args[0].hasActiveSubscription).to.be.false;
      });

      it('should process an invoice.payment_failed only once when received twice', async () => {
        const evtId = 'evt_invoice_dup_123';

        const invoice = {
          id: 'in_dup_123',
          subscription: 'sub_dup_123',
          amount_due: 2999,
          currency: 'eur'
        };

        stripeMock.subscriptions.retrieve.resolves({ id: 'sub_dup_123', metadata: { userId: 'user123' } });

        stripeMock.webhooks.constructEvent
          .onFirstCall().returns({ type: 'invoice.payment_failed', id: evtId, data: { object: invoice } })
          .onSecondCall().returns({ type: 'invoice.payment_failed', id: evtId, data: { object: invoice } });

        const req = { headers: { 'stripe-signature': 't=123,v1=test' }, rawBody: Buffer.from('{}') };
        const res = { json: sinon.stub(), status: sinon.stub().returnsThis(), send: sinon.stub() };

        // Idempotencia: primera vez no existe, segunda ya existe
        firestoreSingleton.get.onFirstCall().resolves({ exists: false });
        firestoreSingleton.get.onSecondCall().resolves({ exists: true });

        const before = firestoreSingleton.update.callCount;
        await myFunctions.stripeWebhook(req, res);
        const afterFirst = firestoreSingleton.update.callCount;
        await myFunctions.stripeWebhook(req, res);
        const afterSecond = firestoreSingleton.update.callCount;

        expect(afterFirst).to.be.greaterThan(before);
        expect(afterSecond).to.equal(afterFirst);
      });
    });

    describe('idempotency - Stripe duplicate events', () => {
      it('should process a Stripe event only once when received twice', async () => {
        const evtId = 'evt_dup_123';

        const subscriptionEvent = {
          id: 'sub_test_dup',
          status: 'active',
          metadata: { userId: 'user123', plan: 'monthly' },
          items: { data: [{ price: { unit_amount: 2999 } }] },
          currency: 'eur',
          current_period_start: Math.floor(Date.now() / 1000),
          current_period_end: Math.floor(Date.now() / 1000) + 2592000,
          cancel_at_period_end: false
        };

        // Mock Stripe signature verification to return the same event id twice
        stripeMock.webhooks.constructEvent
          .onFirstCall().returns({ type: 'customer.subscription.created', id: evtId, data: { object: subscriptionEvent } })
          .onSecondCall().returns({ type: 'customer.subscription.created', id: evtId, data: { object: subscriptionEvent } });

        const req = {
          headers: { 'stripe-signature': 't=123,v1=test' },
          rawBody: Buffer.from('{}')
        };
        const res = { json: sinon.stub(), status: sinon.stub().returnsThis(), send: sinon.stub() };

        // Secuencia de lecturas Firestore:
        // 1) Comprobación de idempotencia del evento (no existe)
        // 2) Lectura del documento de usuario durante el procesamiento (existe)
        // 3) Segunda llamada: comprobación de idempotencia (existe)
        firestoreSingleton.get.onFirstCall().resolves({ exists: false });
        firestoreSingleton.get.onSecondCall().resolves({
          exists: true,
          data: () => ({ uid: 'user123', gender: 'masculino' })
        });
        firestoreSingleton.get.onThirdCall().resolves({ exists: true });

        const before = firestoreSingleton.update.callCount;
        await myFunctions.stripeWebhook(req, res);
        const afterFirst = firestoreSingleton.update.callCount;
        await myFunctions.stripeWebhook(req, res);
        const afterSecond = firestoreSingleton.update.callCount;

        // Debe haber una actualización tras la primera llamada
        expect(afterFirst).to.be.greaterThan(before);
        // La segunda llamada debe ser saltada por idempotencia
        expect(afterSecond).to.equal(afterFirst);
      });
    });
  });

  describe('PayPal Webhook', () => {
    describe('BILLING.SUBSCRIPTION.ACTIVATED', () => {
      it('should activate membership when PayPal subscription is activated', async () => {
        const event = {
          event_type: 'BILLING.SUBSCRIPTION.ACTIVATED',
          resource: {
            id: 'I-TEST123',
            custom_id: 'user123',
            billing_info: {
              last_payment: {
                amount: {
                  value: '29.99',
                  currency_code: 'EUR'
                }
              },
              next_billing_time: '2024-12-20T00:00:00Z'
            }
          }
        };

        const req = {
          body: event,
          headers: {
            'paypal-transmission-id': 'test-transmission-id',
            'paypal-transmission-time': '2025-01-01T00:00:00Z',
            'paypal-transmission-sig': 'test-signature',
            'paypal-cert-url': 'https://example.com/cert.pem',
            'paypal-auth-algo': 'SHA256withRSA'
          }
        };
        const res = {
          json: sinon.stub(),
          status: sinon.stub().returnsThis()
        };

        await myFunctions.paypalWebhook(req, res);

        expect(res.json.calledWith({ received: true })).to.be.true;

        // Verify membership activation
        expect(firestoreSingleton.update.called).to.be.true;
        const updateCall = firestoreSingleton.update.getCall(0);
        expect(updateCall.args[0].hasActiveSubscription).to.be.true;
        expect(updateCall.args[0].subscriptionId).to.equal('I-TEST123');
      });

      it('should handle missing custom_id gracefully', async () => {
        const event = {
          event_type: 'BILLING.SUBSCRIPTION.ACTIVATED',
          resource: {
            id: 'I-TEST456',
            // No custom_id
            billing_info: {
              last_payment: {
                amount: {
                  value: '29.99',
                  currency_code: 'EUR'
                }
              }
            }
          }
        };

        const req = {
          body: event,
          headers: {
            'paypal-transmission-id': 'test-transmission-id',
            'paypal-transmission-time': '2025-01-01T00:00:00Z',
            'paypal-transmission-sig': 'test-signature',
            'paypal-cert-url': 'https://example.com/cert.pem',
            'paypal-auth-algo': 'SHA256withRSA'
          }
        };
        const res = {
          json: sinon.stub(),
          status: sinon.stub().returnsThis()
        };

        await myFunctions.paypalWebhook(req, res);

        expect(res.json.calledWith({ received: true })).to.be.true;
        expect(firestoreSingleton.update.called).to.be.false;
      });
    });

    describe('PAYMENT.SALE.COMPLETED', () => {
      it('should activate insurance when PayPal payment completes', async () => {
        const event = {
          event_type: 'PAYMENT.SALE.COMPLETED',
          resource: {
            id: 'SALE-TEST123',
            custom: 'user123',
            description: 'insurance',
            amount: {
              total: '120.00',
              currency: 'EUR'
            }
          }
        };

        const req = {
          body: event,
          headers: {
            'paypal-transmission-id': 'test-transmission-id',
            'paypal-transmission-time': '2025-01-01T00:00:00Z',
            'paypal-transmission-sig': 'test-signature',
            'paypal-cert-url': 'https://example.com/cert.pem',
            'paypal-auth-algo': 'SHA256withRSA'
          }
        };
        const res = {
          json: sinon.stub(),
          status: sinon.stub().returnsThis()
        };

        await myFunctions.paypalWebhook(req, res);

        expect(res.json.calledWith({ received: true })).to.be.true;

        // Verify insurance activation
        expect(firestoreSingleton.update.called).to.be.true;
        const updateCall = firestoreSingleton.update.getCall(0);
        expect(updateCall.args[0].hasAntiGhostingInsurance).to.be.true;
        expect(updateCall.args[0].insurancePaymentId).to.equal('SALE-TEST123');
        expect(updateCall.args[0].insuranceAmount).to.equal(120);
      });
    });

    describe('PAYMENT.AUTHORIZATION.VOIDED', () => {
      it('should disable insurance when authorization is voided', async () => {
        const event = {
          event_type: 'PAYMENT.AUTHORIZATION.VOIDED',
          resource: {
            id: 'TOKEN-TEST123',
            custom: 'user123'
          }
        };

        const req = {
          body: event,
          headers: {
            'paypal-transmission-id': 'test-transmission-id',
            'paypal-transmission-time': '2025-01-01T00:00:00Z',
            'paypal-transmission-sig': 'test-signature',
            'paypal-cert-url': 'https://example.com/cert.pem',
            'paypal-auth-algo': 'SHA256withRSA'
          }
        };
        const res = {
          json: sinon.stub(),
          status: sinon.stub().returnsThis()
        };

        await myFunctions.paypalWebhook(req, res);

        expect(res.json.calledWith({ received: true })).to.be.true;

        // Verify insurance disabled for the user
        expect(firestoreSingleton.update.called).to.be.true;
        const updateCall = firestoreSingleton.update.getCall(0);
        expect(updateCall.args[0].hasAntiGhostingInsurance).to.be.false;
      });
    });

    describe('idempotency - PayPal duplicate events', () => {
      it('should process a PayPal event only once when received twice', async () => {
        process.env.PAYPAL_SKIP_SIGNATURE_FOR_TESTS = '1';
        const eventId = 'WH_EVT_DUP_123';

        const event = {
          id: eventId,
          event_type: 'BILLING.SUBSCRIPTION.ACTIVATED',
          resource: {
            id: 'I-DUP123',
            custom_id: 'user123',
            billing_info: {
              last_payment: { amount: { value: '29.99', currency_code: 'EUR' } }
            }
          }
        };

        const req = { body: event, headers: {} };
        const res = { json: sinon.stub(), status: sinon.stub().returnsThis() };

        // 1) Comprobación de idempotencia del evento (no existe)
        // 2) Segunda llamada: comprobación de idempotencia (existe)
        firestoreSingleton.get.onFirstCall().resolves({ exists: false });
        firestoreSingleton.get.onSecondCall().resolves({ exists: true });

        const before = firestoreSingleton.update.callCount;
        await myFunctions.paypalWebhook(req, res);
        const afterFirst = firestoreSingleton.update.callCount;
        await myFunctions.paypalWebhook(req, res);
        const afterSecond = firestoreSingleton.update.callCount;

        // Debe haber una actualización tras la primera llamada
        expect(afterFirst).to.be.greaterThan(before);
        // La segunda llamada debe ser saltada por idempotencia
        expect(afterSecond).to.equal(afterFirst);
      });
    });
  });
});
