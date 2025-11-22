// test/firestore-rules.test.js
const { readFileSync } = require('fs');
const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds
} = require('@firebase/rules-unit-testing');
const { setLogLevel } = require('firebase/firestore');

const PROJECT_ID = 'test-tucitasegura';
const RULES_PATH = './firestore.rules';

describe('Firestore Security Rules - Payment Validation', () => {
  let testEnv;

  beforeAll(async () => {
    // Silence expected Firebase errors
    setLogLevel('error');

    // Load rules
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

  describe('matches collection - Payment validation', () => {
    it('should DENY male user without membership from creating match', async () => {
      const alice = testEnv.authenticatedContext('alice', {
        role: 'regular',
        gender: 'masculino'
      });

      // Create user document without membership
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('users').doc('alice').set({
          uid: 'alice',
          gender: 'masculino',
          hasActiveSubscription: false,  // ❌ No membership
          hasAntiGhostingInsurance: false
        });
      });

      const matchRef = alice.firestore().collection('matches').doc();

      // Should fail because male user needs membership
      await assertFails(
        matchRef.set({
          senderId: 'alice',
          receiverId: 'bob',
          status: 'pending',
          createdAt: new Date()
        })
      );
    });

    it('should ALLOW male user WITH membership to create match', async () => {
      const alice = testEnv.authenticatedContext('alice', {
        role: 'regular',
        gender: 'masculino'
      });

      // Create user document WITH membership
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('users').doc('alice').set({
          uid: 'alice',
          gender: 'masculino',
          hasActiveSubscription: true,  // ✅ Has membership
          hasAntiGhostingInsurance: false
        });
      });

      const matchRef = alice.firestore().collection('matches').doc();

      // Should succeed
      await assertSucceeds(
        matchRef.set({
          senderId: 'alice',
          receiverId: 'bob',
          status: 'pending',
          createdAt: new Date()
        })
      );
    });

    it('should ALLOW female user WITHOUT payment to create match', async () => {
      const carol = testEnv.authenticatedContext('carol', {
        role: 'regular',
        gender: 'femenino'
      });

      // Create user document without payments
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('users').doc('carol').set({
          uid: 'carol',
          gender: 'femenino',
          hasActiveSubscription: false,  // Women don't need this
          hasAntiGhostingInsurance: false
        });
      });

      const matchRef = carol.firestore().collection('matches').doc();

      // Should succeed (women can use for free)
      await assertSucceeds(
        matchRef.set({
          senderId: 'carol',
          receiverId: 'alice',
          status: 'pending',
          createdAt: new Date()
        })
      );
    });

    it('should ALLOW admin WITHOUT payment to create match', async () => {
      const adminUser = testEnv.authenticatedContext('admin', {
        role: 'admin',
        gender: 'masculino'
      });

      // Create admin user without payments
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('users').doc('admin').set({
          uid: 'admin',
          gender: 'masculino',
          userRole: 'admin',
          hasActiveSubscription: false,  // Admin doesn't need this
          hasAntiGhostingInsurance: false
        });
      });

      const matchRef = adminUser.firestore().collection('matches').doc();

      // Should succeed (admins bypass payment checks)
      await assertSucceeds(
        matchRef.set({
          senderId: 'admin',
          receiverId: 'bob',
          status: 'pending',
          createdAt: new Date()
        })
      );
    });
  });

  describe('conversations/messages collection - Payment validation', () => {
    it('should DENY male user without membership from sending message', async () => {
      const alice = testEnv.authenticatedContext('alice', {
        role: 'regular',
        gender: 'masculino'
      });

      // Setup: Create conversation and user without membership
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('conversations').doc('conv1').set({
          participants: ['alice', 'bob'],
          createdAt: new Date()
        });

        await context.firestore().collection('users').doc('alice').set({
          uid: 'alice',
          gender: 'masculino',
          hasActiveSubscription: false  // ❌ No membership
        });
      });

      const messageRef = alice.firestore()
        .collection('conversations').doc('conv1')
        .collection('messages').doc();

      // Should fail
      await assertFails(
        messageRef.set({
          senderId: 'alice',
          text: 'Hola!',
          createdAt: new Date()
        })
      );
    });

    it('should ALLOW male user WITH membership to send message', async () => {
      const alice = testEnv.authenticatedContext('alice', {
        role: 'regular',
        gender: 'masculino'
      });

      // Setup
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('conversations').doc('conv1').set({
          participants: ['alice', 'bob'],
          createdAt: new Date()
        });

        await context.firestore().collection('users').doc('alice').set({
          uid: 'alice',
          gender: 'masculino',
          hasActiveSubscription: true  // ✅ Has membership
        });
      });

      const messageRef = alice.firestore()
        .collection('conversations').doc('conv1')
        .collection('messages').doc();

      // Should succeed
      await assertSucceeds(
        messageRef.set({
          senderId: 'alice',
          text: 'Hola!',
          createdAt: new Date()
        })
      );
    });

    it('should ALLOW female user WITHOUT membership to send message', async () => {
      const carol = testEnv.authenticatedContext('carol', {
        role: 'regular',
        gender: 'femenino'
      });

      // Setup
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('conversations').doc('conv2').set({
          participants: ['carol', 'alice'],
          createdAt: new Date()
        });

        await context.firestore().collection('users').doc('carol').set({
          uid: 'carol',
          gender: 'femenino',
          hasActiveSubscription: false  // Women don't need this
        });
      });

      const messageRef = carol.firestore()
        .collection('conversations').doc('conv2')
        .collection('messages').doc();

      // Should succeed
      await assertSucceeds(
        messageRef.set({
          senderId: 'carol',
          text: 'Hola!',
          createdAt: new Date()
        })
      );
    });
  });

  describe('appointments collection - Payment validation (Membership + Insurance)', () => {
    it('should DENY male user without insurance from creating appointment', async () => {
      const alice = testEnv.authenticatedContext('alice', {
        role: 'regular',
        gender: 'masculino'
      });

      // Setup: User with membership but NO insurance
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('users').doc('alice').set({
          uid: 'alice',
          gender: 'masculino',
          hasActiveSubscription: true,     // ✅ Has membership
          hasAntiGhostingInsurance: false  // ❌ NO insurance
        });
      });

      const appointmentRef = alice.firestore().collection('appointments').doc();

      // Should fail (needs insurance too)
      await assertFails(
        appointmentRef.set({
          participants: ['alice', 'bob'],
          date: '2024-12-25',
          time: '19:00',
          place: 'Café Central',
          status: 'pending',
          createdAt: new Date()
        })
      );
    });

    it('should DENY male user without membership from creating appointment', async () => {
      const alice = testEnv.authenticatedContext('alice', {
        role: 'regular',
        gender: 'masculino'
      });

      // Setup: User with insurance but NO membership
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('users').doc('alice').set({
          uid: 'alice',
          gender: 'masculino',
          hasActiveSubscription: false,   // ❌ NO membership
          hasAntiGhostingInsurance: true  // ✅ Has insurance
        });
      });

      const appointmentRef = alice.firestore().collection('appointments').doc();

      // Should fail (needs membership too)
      await assertFails(
        appointmentRef.set({
          participants: ['alice', 'bob'],
          date: '2024-12-25',
          time: '19:00',
          place: 'Café Central',
          status: 'pending',
          createdAt: new Date()
        })
      );
    });

    it('should ALLOW male user WITH membership + insurance to create appointment', async () => {
      const alice = testEnv.authenticatedContext('alice', {
        role: 'regular',
        gender: 'masculino'
      });

      // Setup: User with BOTH membership AND insurance
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('users').doc('alice').set({
          uid: 'alice',
          gender: 'masculino',
          hasActiveSubscription: true,    // ✅ Has membership
          hasAntiGhostingInsurance: true  // ✅ Has insurance
        });
      });

      const appointmentRef = alice.firestore().collection('appointments').doc();

      // Should succeed (has both)
      await assertSucceeds(
        appointmentRef.set({
          participants: ['alice', 'bob'],
          date: '2024-12-25',
          time: '19:00',
          place: 'Café Central',
          status: 'pending',
          createdAt: new Date()
        })
      );
    });

    it('should ALLOW female user WITHOUT payments to create appointment', async () => {
      const carol = testEnv.authenticatedContext('carol', {
        role: 'regular',
        gender: 'femenino'
      });

      // Setup: Female user without any payments
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('users').doc('carol').set({
          uid: 'carol',
          gender: 'femenino',
          hasActiveSubscription: false,
          hasAntiGhostingInsurance: false
        });
      });

      const appointmentRef = carol.firestore().collection('appointments').doc();

      // Should succeed (women don't need payments)
      await assertSucceeds(
        appointmentRef.set({
          participants: ['carol', 'alice'],
          date: '2024-12-25',
          time: '19:00',
          place: 'Café Central',
          status: 'pending',
          createdAt: new Date()
        })
      );
    });

    it('should ALLOW admin WITHOUT payments to create appointment', async () => {
      const adminUser = testEnv.authenticatedContext('admin', {
        role: 'admin',
        gender: 'masculino'
      });

      // Setup: Admin without payments
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('users').doc('admin').set({
          uid: 'admin',
          gender: 'masculino',
          userRole: 'admin',
          hasActiveSubscription: false,
          hasAntiGhostingInsurance: false
        });
      });

      const appointmentRef = adminUser.firestore().collection('appointments').doc();

      // Should succeed (admin bypasses payment checks)
      await assertSucceeds(
        appointmentRef.set({
          participants: ['admin', 'bob'],
          date: '2024-12-25',
          time: '19:00',
          place: 'Café Central',
          status: 'confirmed',
          createdAt: new Date()
        })
      );
    });
  });

  describe('Edge cases and security', () => {
    it('should DENY unauthenticated users from creating matches', async () => {
      const unauthed = testEnv.unauthenticatedContext();
      const matchRef = unauthed.firestore().collection('matches').doc();

      await assertFails(
        matchRef.set({
          senderId: 'fake',
          receiverId: 'bob',
          status: 'pending'
        })
      );
    });

    it('should DENY users from creating matches with wrong senderId', async () => {
      const alice = testEnv.authenticatedContext('alice', {
        role: 'regular',
        gender: 'femenino'
      });

      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('users').doc('alice').set({
          uid: 'alice',
          gender: 'femenino'
        });
      });

      const matchRef = alice.firestore().collection('matches').doc();

      // Try to create match with different senderId
      await assertFails(
        matchRef.set({
          senderId: 'bob',  // ❌ Not alice
          receiverId: 'carol',
          status: 'pending'
        })
      );
    });

    it('should DENY users from accessing other users appointments', async () => {
      const alice = testEnv.authenticatedContext('alice', {
        role: 'regular',
        gender: 'femenino'
      });

      // Create appointment for Bob and Carol
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('appointments').doc('appt1').set({
          participants: ['bob', 'carol'],
          date: '2024-12-25',
          status: 'confirmed'
        });
      });

      const appointmentRef = alice.firestore().collection('appointments').doc('appt1');

      // Alice should NOT be able to read this appointment
      await assertFails(appointmentRef.get());
    });
  });
});
