// test/integration.test.js
// Integration tests for complete payment flow:
// Webhook Event → Firestore Update → Rules Validation

const { readFileSync } = require('fs');
const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds
} = require('@firebase/rules-unit-testing');
const { setLogLevel } = require('firebase/firestore');

const PROJECT_ID = 'test-tucitasegura';
const RULES_PATH = './firestore.rules';

describe('Integration Tests - Complete Payment Flow', () => {
  let testEnv;

  beforeAll(async () => {
    setLogLevel('error');

    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: readFileSync(RULES_PATH, 'utf8'),
        host: 'localhost',
        port: 8080
      }
    });
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  describe('Membership Purchase Flow', () => {
    it('should complete full membership purchase flow for male user', async () => {
      const userId = 'male-user-001';

      // Step 1: Create male user WITHOUT membership
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('users').doc(userId).set({
          uid: userId,
          email: 'john@example.com',
          alias: 'John',
          gender: 'masculino',
          hasActiveSubscription: false,  // ❌ No membership yet
          hasAntiGhostingInsurance: false,
          createdAt: new Date()
        });
      });

      const user = testEnv.authenticatedContext(userId, {
        role: 'regular',
        gender: 'masculino'
      });

      // Step 2: User tries to send match → should FAIL
      const matchRef = user.firestore().collection('matches').doc();
      await assertFails(
        matchRef.set({
          senderId: userId,
          receiverId: 'female-user-001',
          status: 'pending',
          createdAt: new Date()
        })
      );

      // Step 3: Simulate Stripe webhook updating membership
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('users').doc(userId).update({
          hasActiveSubscription: true,  // ✅ Webhook activated membership
          subscriptionId: 'sub_stripe_123',
          subscriptionStatus: 'active',
          updatedAt: new Date()
        });
      });

      // Step 4: User tries again to send match → should SUCCEED
      const matchRef2 = user.firestore().collection('matches').doc();
      await assertSucceeds(
        matchRef2.set({
          senderId: userId,
          receiverId: 'female-user-001',
          status: 'pending',
          createdAt: new Date()
        })
      );

      // Step 5: User tries to send message → should SUCCEED
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('conversations').doc('conv1').set({
          participants: [userId, 'female-user-001'],
          createdAt: new Date()
        });
      });

      const messageRef = user.firestore()
        .collection('conversations').doc('conv1')
        .collection('messages').doc();

      await assertSucceeds(
        messageRef.set({
          senderId: userId,
          text: 'Hola!',
          createdAt: new Date()
        })
      );
    });

    it('should handle membership cancellation flow', async () => {
      const userId = 'male-user-002';

      // Step 1: Create user WITH membership
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('users').doc(userId).set({
          uid: userId,
          gender: 'masculino',
          hasActiveSubscription: true,  // ✅ Has membership
          subscriptionId: 'sub_stripe_456'
        });
      });

      const user = testEnv.authenticatedContext(userId, {
        role: 'regular',
        gender: 'masculino'
      });

      // Step 2: User can send match (has membership)
      const matchRef = user.firestore().collection('matches').doc();
      await assertSucceeds(
        matchRef.set({
          senderId: userId,
          receiverId: 'female-user-002',
          status: 'pending',
          createdAt: new Date()
        })
      );

      // Step 3: Simulate Stripe webhook for subscription canceled
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('users').doc(userId).update({
          hasActiveSubscription: false,  // ❌ Webhook canceled membership
          subscriptionStatus: 'canceled',
          updatedAt: new Date()
        });
      });

      // Step 4: User tries to send another match → should FAIL
      const matchRef2 = user.firestore().collection('matches').doc();
      await assertFails(
        matchRef2.set({
          senderId: userId,
          receiverId: 'female-user-003',
          status: 'pending',
          createdAt: new Date()
        })
      );
    });
  });

  describe('Insurance Purchase Flow', () => {
    it('should complete full insurance purchase flow for male user', async () => {
      const userId = 'male-user-003';

      // Step 1: Create user WITH membership but NO insurance
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('users').doc(userId).set({
          uid: userId,
          gender: 'masculino',
          hasActiveSubscription: true,     // ✅ Has membership
          hasAntiGhostingInsurance: false  // ❌ No insurance yet
        });
      });

      const user = testEnv.authenticatedContext(userId, {
        role: 'regular',
        gender: 'masculino'
      });

      // Step 2: User tries to create appointment → should FAIL (needs insurance)
      const appointmentRef = user.firestore().collection('appointments').doc();
      await assertFails(
        appointmentRef.set({
          participants: [userId, 'female-user-004'],
          date: '2024-12-25',
          time: '19:00',
          place: 'Café Central',
          status: 'pending',
          createdAt: new Date()
        })
      );

      // Step 3: Simulate Stripe webhook for insurance payment
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('users').doc(userId).update({
          hasAntiGhostingInsurance: true,  // ✅ Webhook activated insurance
          insurancePaymentId: 'pi_stripe_insurance_123',
          insuranceActivatedAt: new Date()
        });
      });

      // Step 4: User tries again to create appointment → should SUCCEED
      const appointmentRef2 = user.firestore().collection('appointments').doc();
      await assertSucceeds(
        appointmentRef2.set({
          participants: [userId, 'female-user-004'],
          date: '2024-12-25',
          time: '19:00',
          place: 'Café Central',
          status: 'confirmed',
          createdAt: new Date()
        })
      );
    });

    it('should require BOTH membership and insurance for appointments', async () => {
      const userId = 'male-user-004';

      // Scenario 1: Has insurance but NO membership
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('users').doc(userId).set({
          uid: userId,
          gender: 'masculino',
          hasActiveSubscription: false,   // ❌ NO membership
          hasAntiGhostingInsurance: true  // ✅ Has insurance
        });
      });

      const user = testEnv.authenticatedContext(userId, {
        role: 'regular',
        gender: 'masculino'
      });

      const appointmentRef = user.firestore().collection('appointments').doc();
      await assertFails(
        appointmentRef.set({
          participants: [userId, 'female-user-005'],
          date: '2024-12-26',
          time: '20:00',
          place: 'Restaurante',
          status: 'pending',
          createdAt: new Date()
        })
      );

      // Simulate webhook activating membership
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('users').doc(userId).update({
          hasActiveSubscription: true  // ✅ Now has membership
        });
      });

      // Now should succeed (has both)
      const appointmentRef2 = user.firestore().collection('appointments').doc();
      await assertSucceeds(
        appointmentRef2.set({
          participants: [userId, 'female-user-005'],
          date: '2024-12-26',
          time: '20:00',
          place: 'Restaurante',
          status: 'confirmed',
          createdAt: new Date()
        })
      );
    });
  });

  describe('PayPal Webhook Integration', () => {
    it('should activate membership from PayPal subscription', async () => {
      const userId = 'male-user-005';

      // Step 1: Create user without membership
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('users').doc(userId).set({
          uid: userId,
          gender: 'masculino',
          hasActiveSubscription: false
        });
      });

      const user = testEnv.authenticatedContext(userId, {
        role: 'regular',
        gender: 'masculino'
      });

      // Step 2: Cannot send match
      const matchRef = user.firestore().collection('matches').doc();
      await assertFails(
        matchRef.set({
          senderId: userId,
          receiverId: 'female-user-006',
          status: 'pending',
          createdAt: new Date()
        })
      );

      // Step 3: Simulate PayPal webhook (BILLING.SUBSCRIPTION.ACTIVATED)
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('users').doc(userId).update({
          hasActiveSubscription: true,  // ✅ PayPal activated
          subscriptionId: 'paypal_sub_I-123456',
          paymentProvider: 'paypal',
          subscriptionStatus: 'active'
        });
      });

      // Step 4: Now can send match
      const matchRef2 = user.firestore().collection('matches').doc();
      await assertSucceeds(
        matchRef2.set({
          senderId: userId,
          receiverId: 'female-user-006',
          status: 'pending',
          createdAt: new Date()
        })
      );
    });

    it('should handle PayPal payment refund', async () => {
      const userId = 'male-user-006';

      // Step 1: Create user WITH membership
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('users').doc(userId).set({
          uid: userId,
          gender: 'masculino',
          hasActiveSubscription: true,
          subscriptionId: 'paypal_sub_I-789012'
        });
      });

      const user = testEnv.authenticatedContext(userId, {
        role: 'regular',
        gender: 'masculino'
      });

      // Step 2: Can send match
      const matchRef = user.firestore().collection('matches').doc();
      await assertSucceeds(
        matchRef.set({
          senderId: userId,
          receiverId: 'female-user-007',
          status: 'pending',
          createdAt: new Date()
        })
      );

      // Step 3: Simulate PayPal webhook (PAYMENT.SALE.REFUNDED)
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('users').doc(userId).update({
          hasActiveSubscription: false,  // ❌ Refunded, membership canceled
          subscriptionStatus: 'refunded'
        });
      });

      // Step 4: Cannot send match anymore
      const matchRef2 = user.firestore().collection('matches').doc();
      await assertFails(
        matchRef2.set({
          senderId: userId,
          receiverId: 'female-user-008',
          status: 'pending',
          createdAt: new Date()
        })
      );
    });
  });

  describe('Female User Flow (No Payment Required)', () => {
    it('should allow female users full access without any payments', async () => {
      const userId = 'female-user-009';

      // Step 1: Create female user WITHOUT any payments
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('users').doc(userId).set({
          uid: userId,
          gender: 'femenino',
          hasActiveSubscription: false,    // ❌ No membership
          hasAntiGhostingInsurance: false  // ❌ No insurance
        });
      });

      const user = testEnv.authenticatedContext(userId, {
        role: 'regular',
        gender: 'femenino'
      });

      // Step 2: Can send match without membership
      const matchRef = user.firestore().collection('matches').doc();
      await assertSucceeds(
        matchRef.set({
          senderId: userId,
          receiverId: 'male-user-007',
          status: 'pending',
          createdAt: new Date()
        })
      );

      // Step 3: Can send message without membership
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('conversations').doc('conv2').set({
          participants: [userId, 'male-user-007'],
          createdAt: new Date()
        });
      });

      const messageRef = user.firestore()
        .collection('conversations').doc('conv2')
        .collection('messages').doc();

      await assertSucceeds(
        messageRef.set({
          senderId: userId,
          text: 'Hola!',
          createdAt: new Date()
        })
      );

      // Step 4: Can create appointment without insurance
      const appointmentRef = user.firestore().collection('appointments').doc();
      await assertSucceeds(
        appointmentRef.set({
          participants: [userId, 'male-user-007'],
          date: '2024-12-27',
          time: '18:00',
          place: 'Café',
          status: 'confirmed',
          createdAt: new Date()
        })
      );
    });
  });

  describe('Subscription Logs and Audit Trail', () => {
    it('should verify subscription logs are created after webhook', async () => {
      const userId = 'male-user-008';

      // Setup user
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('users').doc(userId).set({
          uid: userId,
          gender: 'masculino',
          hasActiveSubscription: false
        });
      });

      // Simulate webhook creating subscription log
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();

        // Update user
        await db.collection('users').doc(userId).update({
          hasActiveSubscription: true,
          subscriptionId: 'sub_test_999'
        });

        // Create subscription log (what webhook would do)
        await db.collection('subscriptions').add({
          userId: userId,
          subscriptionId: 'sub_test_999',
          plan: 'monthly',
          amount: 2999,
          currency: 'eur',
          status: 'active',
          provider: 'stripe',
          createdAt: new Date()
        });
      });

      // Verify log exists
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        const logs = await db.collection('subscriptions')
          .where('userId', '==', userId)
          .get();

        if (logs.empty) {
          throw new Error('Expected subscription log to exist');
        }

        const logData = logs.docs[0].data();
        if (logData.subscriptionId !== 'sub_test_999') {
          throw new Error('Subscription log data mismatch');
        }
      });
    });

    it('should verify insurance logs are created after payment', async () => {
      const userId = 'male-user-009';

      // Setup user
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('users').doc(userId).set({
          uid: userId,
          gender: 'masculino',
          hasActiveSubscription: true,
          hasAntiGhostingInsurance: false
        });
      });

      // Simulate webhook creating insurance log
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();

        // Update user
        await db.collection('users').doc(userId).update({
          hasAntiGhostingInsurance: true,
          insurancePaymentId: 'pi_insurance_999'
        });

        // Create insurance log (what webhook would do)
        await db.collection('insurances').add({
          userId: userId,
          paymentId: 'pi_insurance_999',
          amount: 12000,  // €120
          currency: 'eur',
          status: 'active',
          provider: 'stripe',
          activatedAt: new Date()
        });
      });

      // Verify log exists
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        const logs = await db.collection('insurances')
          .where('userId', '==', userId)
          .get();

        if (logs.empty) {
          throw new Error('Expected insurance log to exist');
        }

        const logData = logs.docs[0].data();
        if (logData.amount !== 12000) {
          throw new Error('Insurance log data mismatch');
        }
      });
    });
  });

  describe('Edge Cases and Error Recovery', () => {
    it('should handle webhook updating non-existent user gracefully', async () => {
      // This simulates webhook receiving event for user not yet created
      // The webhook should fail gracefully (handled in the webhook code)

      const userId = 'non-existent-user';
      const user = testEnv.authenticatedContext(userId, {
        role: 'regular',
        gender: 'masculino'
      });

      // User document doesn't exist, so getUserData() will fail
      const matchRef = user.firestore().collection('matches').doc();

      // Should fail because user document doesn't exist
      await assertFails(
        matchRef.set({
          senderId: userId,
          receiverId: 'female-user-010',
          status: 'pending',
          createdAt: new Date()
        })
      );
    });

    it('should handle payment status fields missing from user document', async () => {
      const userId = 'male-user-010';

      // Create user WITHOUT payment status fields
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('users').doc(userId).set({
          uid: userId,
          gender: 'masculino'
          // Missing: hasActiveSubscription, hasAntiGhostingInsurance
        });
      });

      const user = testEnv.authenticatedContext(userId, {
        role: 'regular',
        gender: 'masculino'
      });

      // Should fail (missing fields treated as false)
      const matchRef = user.firestore().collection('matches').doc();
      await assertFails(
        matchRef.set({
          senderId: userId,
          receiverId: 'female-user-011',
          status: 'pending',
          createdAt: new Date()
        })
      );
    });
  });
});
