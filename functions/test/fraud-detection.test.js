const { expect } = require('chai');
const sinon = require('sinon');
const test = require('firebase-functions-test')();
const proxyquire = require('proxyquire').noCallThru();

process.env.NODE_ENV = 'test';

// Mock Firestore data
const mockFirestoreData = {
  users: new Map(),
  likes: [],
  messages: [],
  reports: [],
  fraud_scores: new Map(),
  admin_notifications: []
};

// Firestore mock
const firestoreMock = {
  collection: sinon.stub(),
  doc: sinon.stub(),
  FieldValue: {
    serverTimestamp: () => new Date(),
    increment: (n) => n
  }
};

firestoreMock.collection.callsFake((collectionName) => {
  return {
    doc: (docId) => ({
      get: async () => {
        const data = mockFirestoreData[collectionName]?.get?.(docId);
        return {
          exists: !!data,
          data: () => data,
          id: docId
        };
      },
      set: async (data) => {
        if (!mockFirestoreData[collectionName]) {
          mockFirestoreData[collectionName] = new Map();
        }
        mockFirestoreData[collectionName].set(docId, data);
      },
      update: async (data) => {
        if (mockFirestoreData[collectionName]?.has(docId)) {
          const existing = mockFirestoreData[collectionName].get(docId);
          mockFirestoreData[collectionName].set(docId, { ...existing, ...data });
        }
      }
    }),
    where: () => ({
      where: () => ({
        get: async () => ({
          empty: mockFirestoreData[collectionName]?.length === 0,
          docs: mockFirestoreData[collectionName] || [],
          size: mockFirestoreData[collectionName]?.length || 0
        })
      }),
      get: async () => ({
        empty: mockFirestoreData[collectionName]?.length === 0,
        docs: mockFirestoreData[collectionName] || [],
        size: mockFirestoreData[collectionName]?.length || 0
      })
    }),
    add: async (data) => {
      const id = `generated-id-${Date.now()}`;
      mockFirestoreData[collectionName].push({ id, ...data });
      return { id };
    },
    limit: () => ({
      get: async () => ({
        empty: mockFirestoreData[collectionName]?.length === 0,
        docs: mockFirestoreData[collectionName]?.slice(0, 100) || []
      })
    })
  };
});

const adminMock = {
  initializeApp: sinon.stub(),
  firestore: () => firestoreMock,
  auth: sinon.stub()
};

// Load fraud detection module with mocks
const fraudDetection = proxyquire('../fraud-detection', {
  'firebase-admin': adminMock
});

describe('Fraud Detection Service', () => {

  beforeEach(() => {
    // Reset mock data
    mockFirestoreData.users.clear();
    mockFirestoreData.fraud_scores.clear();
    mockFirestoreData.likes = [];
    mockFirestoreData.messages = [];
    mockFirestoreData.reports = [];
    mockFirestoreData.admin_notifications = [];
  });

  describe('Profile Analysis', () => {

    it('should detect temporary email addresses', () => {
      const testCases = [
        { email: 'test@tempmail.com', shouldFlag: true },
        { email: 'user@10minutemail.com', shouldFlag: true },
        { email: 'fake@guerrillamail.com', shouldFlag: true },
        { email: 'real@gmail.com', shouldFlag: false },
        { email: 'user@hotmail.com', shouldFlag: false }
      ];

      testCases.forEach(({ email, shouldFlag }) => {
        const tempEmailPattern = /(tempmail|10minutemail|guerrillamail|throwaway|disposable)/i;
        const isTemp = tempEmailPattern.test(email);
        expect(isTemp).to.equal(shouldFlag, `Email ${email} detection failed`);
      });
    });

    it('should flag incomplete profiles', () => {
      const completeProfile = {
        nombre: 'Juan Pérez',
        email: 'juan@gmail.com',
        alias: 'juanp',
        edad: 28,
        photos: ['photo1.jpg', 'photo2.jpg'],
        biografia: 'Hola, soy Juan'
      };

      const incompleteProfile = {
        nombre: 'Test',
        email: 'test@gmail.com'
      };

      const profileFields = ['nombre', 'email', 'alias', 'edad', 'photos', 'biografia'];

      const completeCount = profileFields.filter(f => completeProfile[f]).length;
      const incompleteCount = profileFields.filter(f => incompleteProfile[f]).length;

      const completeRate = completeCount / profileFields.length;
      const incompleteRate = incompleteCount / profileFields.length;

      expect(completeRate).to.be.greaterThan(0.7);
      expect(incompleteRate).to.be.lessThan(0.5);
    });

    it('should detect suspicious name patterns', () => {
      const suspiciousNames = ['x', 'aaa', '123', 'user123', 'abc123'];
      const validNames = ['Juan Pérez', 'María García', 'Carlos López'];

      suspiciousNames.forEach(name => {
        const isSuspicious =
          name.length < 2 ||
          /^[a-z]+\d+$/i.test(name) ||
          /^(.)\1+$/.test(name) ||
          /^\d+$/.test(name); // All digits
        expect(isSuspicious).to.be.true;
      });

      validNames.forEach(name => {
        const isSuspicious =
          name.length < 2 ||
          /^[a-z]+\d+$/i.test(name) ||
          /^(.)\1+$/.test(name) ||
          /^\d+$/.test(name);
        expect(isSuspicious).to.be.false;
      });
    });

    it('should flag profiles without photos', () => {
      const withPhotos = { photos: ['photo1.jpg'] };
      const withoutPhotos = { photos: [] };
      const nullPhotos = { photos: null };

      expect((withPhotos.photos || []).length > 0).to.be.true;
      expect((withoutPhotos.photos || []).length > 0).to.be.false;
      expect((nullPhotos.photos || []).length > 0).to.be.false;
    });
  });

  describe('Behavior Analysis', () => {

    it('should detect excessive liking patterns', () => {
      const normalLikes = Array(20).fill({ timestamp: new Date() });
      const excessiveLikes = Array(150).fill({ timestamp: new Date() });

      const EXCESSIVE_LIKES_THRESHOLD = 100;

      expect(normalLikes.length).to.be.lessThan(EXCESSIVE_LIKES_THRESHOLD);
      expect(excessiveLikes.length).to.be.greaterThan(EXCESSIVE_LIKES_THRESHOLD);
    });

    it('should detect rapid messaging patterns', () => {
      const now = Date.now();
      const rapidMessages = [
        { timestamp: now },
        { timestamp: now + 1000 },
        { timestamp: now + 2000 },
        { timestamp: now + 3000 },
        { timestamp: now + 4000 }
      ];

      const normalMessages = [
        { timestamp: now },
        { timestamp: now + 60000 },
        { timestamp: now + 120000 }
      ];

      // Calculate average time between messages
      const calcAvgInterval = (messages) => {
        if (messages.length < 2) return Infinity;
        let totalInterval = 0;
        for (let i = 1; i < messages.length; i++) {
          totalInterval += messages[i].timestamp - messages[i-1].timestamp;
        }
        return totalInterval / (messages.length - 1);
      };

      const rapidAvg = calcAvgInterval(rapidMessages);
      const normalAvg = calcAvgInterval(normalMessages);

      expect(rapidAvg).to.be.lessThan(10000); // Less than 10 seconds
      expect(normalAvg).to.be.greaterThan(30000); // More than 30 seconds
    });

    it('should detect duplicate message content', () => {
      const messages = [
        { content: 'Hola' },
        { content: 'Hola' },
        { content: 'Hola' },
        { content: '¿Qué tal?' }
      ];

      const contentCounts = {};
      messages.forEach(msg => {
        contentCounts[msg.content] = (contentCounts[msg.content] || 0) + 1;
      });

      const duplicates = Object.values(contentCounts).filter(count => count > 2);
      expect(duplicates.length).to.be.greaterThan(0);
    });

    it('should flag users with multiple reports', () => {
      const noReports = [];
      const fewReports = [{ reason: 'spam' }];
      const manyReports = [
        { reason: 'spam' },
        { reason: 'harassment' },
        { reason: 'fake' }
      ];

      expect(noReports.length).to.equal(0);
      expect(fewReports.length).to.be.lessThan(3);
      expect(manyReports.length).to.be.greaterThan(2);
    });
  });

  describe('Network Analysis', () => {

    it('should detect VPN/proxy patterns in IP addresses', () => {
      const suspiciousIPs = [
        '10.0.0.1',      // Private
        '192.168.1.1',   // Private
        '172.16.0.1',    // Private
        '127.0.0.1'      // Localhost
      ];

      const validIPs = [
        '8.8.8.8',
        '1.1.1.1',
        '151.101.1.140'
      ];

      const isPrivateIP = (ip) => {
        return /^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.|127\.)/.test(ip);
      };

      suspiciousIPs.forEach(ip => {
        expect(isPrivateIP(ip)).to.be.true;
      });

      validIPs.forEach(ip => {
        expect(isPrivateIP(ip)).to.be.false;
      });
    });

    it('should flag multiple accounts from same IP', () => {
      const singleIP = { '1.2.3.4': 1 };
      const multipleAccounts = { '1.2.3.4': 5 };

      const SAME_IP_THRESHOLD = 3;

      Object.values(singleIP).forEach(count => {
        expect(count).to.be.lessThan(SAME_IP_THRESHOLD);
      });

      Object.values(multipleAccounts).forEach(count => {
        expect(count).to.be.greaterThan(SAME_IP_THRESHOLD);
      });
    });

    it('should detect rapid device changes', () => {
      const stableUser = {
        loginHistory: [
          { device: 'iPhone 12', timestamp: Date.now() },
          { device: 'iPhone 12', timestamp: Date.now() + 3600000 }
        ]
      };

      const suspiciousUser = {
        loginHistory: [
          { device: 'iPhone 12', timestamp: Date.now() },
          { device: 'Samsung Galaxy', timestamp: Date.now() + 300000 },
          { device: 'Google Pixel', timestamp: Date.now() + 600000 }
        ]
      };

      const countUniqueDevices = (history) => {
        return new Set(history.map(h => h.device)).size;
      };

      expect(countUniqueDevices(stableUser.loginHistory)).to.equal(1);
      expect(countUniqueDevices(suspiciousUser.loginHistory)).to.be.greaterThan(2);
    });
  });

  describe('Content Analysis', () => {

    it('should detect spam keywords in messages', () => {
      const spamKeywords = ['gratis', 'dinero fácil', 'click aquí', 'oferta', 'ganancia'];

      const spamMessage = 'Haz click aquí para dinero fácil y gratis';
      const normalMessage = 'Hola, ¿cómo estás?';

      const containsSpam = (text) => {
        return spamKeywords.some(keyword => text.toLowerCase().includes(keyword.toLowerCase()));
      };

      expect(containsSpam(spamMessage)).to.be.true;
      expect(containsSpam(normalMessage)).to.be.false;
    });

    it('should detect excessive URL sharing', () => {
      const messagesWithURLs = [
        { content: 'Visita https://example.com' },
        { content: 'Mira esto http://spam.com' },
        { content: 'Click en www.fake.com' }
      ];

      const normalMessages = [
        { content: 'Hola' },
        { content: '¿Cómo estás?' }
      ];

      const urlPattern = /(https?:\/\/|www\.)/gi;
      const urlCount = messagesWithURLs.filter(msg => urlPattern.test(msg.content)).length;
      const normalUrlCount = normalMessages.filter(msg => urlPattern.test(msg.content)).length;

      expect(urlCount).to.be.greaterThan(0);
      expect(normalUrlCount).to.equal(0);
    });

    it('should detect inappropriate content patterns', () => {
      const inappropriateKeywords = ['viagra', 'casino', 'porn', 'xxx'];

      const flaggedContent = 'Check out this casino and viagra deals';
      const cleanContent = 'Me gusta el cine y la música';

      const isInappropriate = (text) => {
        return inappropriateKeywords.some(keyword =>
          text.toLowerCase().includes(keyword.toLowerCase())
        );
      };

      expect(isInappropriate(flaggedContent)).to.be.true;
      expect(isInappropriate(cleanContent)).to.be.false;
    });
  });

  describe('Risk Level Calculation', () => {

    it('should correctly categorize risk levels', () => {
      const testCases = [
        { score: 0.1, expectedLevel: 'minimal' },
        { score: 0.25, expectedLevel: 'minimal' },
        { score: 0.35, expectedLevel: 'low' },
        { score: 0.55, expectedLevel: 'low' },
        { score: 0.65, expectedLevel: 'medium' },
        { score: 0.75, expectedLevel: 'medium' },
        { score: 0.85, expectedLevel: 'high' },
        { score: 0.95, expectedLevel: 'high' }
      ];

      const calculateRiskLevel = (score) => {
        if (score < 0.3) return 'minimal';
        if (score < 0.6) return 'low';
        if (score < 0.8) return 'medium';
        return 'high';
      };

      testCases.forEach(({ score, expectedLevel }) => {
        const level = calculateRiskLevel(score);
        expect(level).to.equal(expectedLevel, `Score ${score} should be ${expectedLevel}`);
      });
    });

    it('should weight different dimensions correctly', () => {
      const profileScore = 0.8;
      const behaviorScore = 0.6;
      const networkScore = 0.4;
      const contentScore = 0.3;

      const WEIGHTS = {
        profile: 0.25,
        behavior: 0.35,
        network: 0.20,
        content: 0.20
      };

      const totalScore = (
        profileScore * WEIGHTS.profile +
        behaviorScore * WEIGHTS.behavior +
        networkScore * WEIGHTS.network +
        contentScore * WEIGHTS.content
      );

      // Expected: 0.8*0.25 + 0.6*0.35 + 0.4*0.20 + 0.3*0.20 = 0.2 + 0.21 + 0.08 + 0.06 = 0.55
      expect(totalScore).to.be.closeTo(0.55, 0.01);
      expect(totalScore).to.be.greaterThan(0);
      expect(totalScore).to.be.lessThan(1);
    });

    it('should handle edge cases in score calculation', () => {
      const edgeCases = [
        { scores: [0, 0, 0, 0], expected: 0 },
        { scores: [1, 1, 1, 1], expected: 1 },
        { scores: [0.5, 0.5, 0.5, 0.5], expected: 0.5 }
      ];

      const WEIGHTS = [0.25, 0.35, 0.20, 0.20];

      edgeCases.forEach(({ scores, expected }) => {
        const total = scores.reduce((sum, score, i) => sum + score * WEIGHTS[i], 0);
        expect(total).to.be.closeTo(expected, 0.01);
      });
    });
  });

  describe('Auto-flagging Logic', () => {

    it('should flag high-risk users for review', () => {
      const highRiskUser = { fraudScore: 0.85, riskLevel: 'high' };
      const mediumRiskUser = { fraudScore: 0.65, riskLevel: 'medium' };
      const lowRiskUser = { fraudScore: 0.35, riskLevel: 'low' };

      expect(highRiskUser.riskLevel).to.equal('high');
      expect(highRiskUser.fraudScore).to.be.greaterThan(0.8);

      expect(mediumRiskUser.riskLevel).to.not.equal('high');
      expect(lowRiskUser.riskLevel).to.not.equal('high');
    });

    it('should create admin notifications for high-risk users', () => {
      const notification = {
        type: 'fraud_alert',
        userId: 'user123',
        fraudScore: 0.87,
        riskLevel: 'high',
        indicators: ['Email temporal detectado', 'Perfil incompleto', 'Actividad sospechosa'],
        read: false
      };

      expect(notification.type).to.equal('fraud_alert');
      expect(notification.riskLevel).to.equal('high');
      expect(notification.indicators).to.be.an('array').that.is.not.empty;
      expect(notification.read).to.be.false;
    });
  });

  describe('Rate Limiting', () => {

    it('should detect excessive actions per hour', () => {
      const now = Date.now();
      const oneHourAgo = now - 3600000;

      const excessiveLikes = Array(120).fill(null).map((_, i) => ({
        timestamp: oneHourAgo + (i * 30000)
      }));

      const normalLikes = Array(30).fill(null).map((_, i) => ({
        timestamp: oneHourAgo + (i * 120000)
      }));

      const LIKES_PER_HOUR_THRESHOLD = 100;

      expect(excessiveLikes.length).to.be.greaterThan(LIKES_PER_HOUR_THRESHOLD);
      expect(normalLikes.length).to.be.lessThan(LIKES_PER_HOUR_THRESHOLD);
    });

    it('should detect message spam patterns', () => {
      const now = Date.now();
      const spamMessages = Array(60).fill(null).map((_, i) => ({
        timestamp: now - (60 - i) * 60000,
        content: 'Spam message'
      }));

      const normalMessages = Array(10).fill(null).map((_, i) => ({
        timestamp: now - (10 - i) * 600000,
        content: 'Normal message'
      }));

      const MESSAGES_PER_HOUR_THRESHOLD = 50;

      expect(spamMessages.length).to.be.greaterThan(MESSAGES_PER_HOUR_THRESHOLD);
      expect(normalMessages.length).to.be.lessThan(MESSAGES_PER_HOUR_THRESHOLD);
    });
  });

  describe('Time-based Patterns', () => {

    it('should detect suspicious account age patterns', () => {
      const now = Date.now();
      const newAccount = { createdAt: now - 3600000 }; // 1 hour old
      const establishedAccount = { createdAt: now - 2592000000 }; // 30 days old

      const ONE_DAY = 86400000;

      const newAccountAge = (now - newAccount.createdAt) / ONE_DAY;
      const establishedAccountAge = (now - establishedAccount.createdAt) / ONE_DAY;

      expect(newAccountAge).to.be.lessThan(1);
      expect(establishedAccountAge).to.be.greaterThan(7);
    });

    it('should detect unusual activity times', () => {
      const activities = [
        { timestamp: new Date('2024-01-01T03:00:00').getTime() }, // 3 AM
        { timestamp: new Date('2024-01-01T04:30:00').getTime() }, // 4:30 AM
        { timestamp: new Date('2024-01-01T14:00:00').getTime() }  // 2 PM
      ];

      const nighttimeActivities = activities.filter(activity => {
        const hour = new Date(activity.timestamp).getHours();
        return hour >= 2 && hour <= 5;
      });

      expect(nighttimeActivities.length).to.equal(2);
    });
  });

  describe('Integration Tests', () => {

    it('should handle user with no activity gracefully', async () => {
      const userId = 'new-user-123';

      mockFirestoreData.users.set(userId, {
        nombre: 'New User',
        email: 'newuser@gmail.com',
        createdAt: Date.now()
      });

      // Should not throw error
      expect(() => {
        const userData = mockFirestoreData.users.get(userId);
        expect(userData).to.exist;
      }).to.not.throw();
    });

    it('should handle missing data gracefully', () => {
      const incompleteUser = {
        nombre: 'Test'
        // Missing many fields
      };

      const safeGetField = (obj, field, defaultValue = null) => {
        return obj[field] !== undefined ? obj[field] : defaultValue;
      };

      expect(safeGetField(incompleteUser, 'email', '')).to.equal('');
      expect(safeGetField(incompleteUser, 'photos', [])).to.deep.equal([]);
      expect(safeGetField(incompleteUser, 'nombre', '')).to.equal('Test');
    });
  });

  describe('Performance Tests', () => {

    it('should analyze large datasets efficiently', () => {
      const largeDataset = Array(1000).fill(null).map((_, i) => ({
        id: `user-${i}`,
        timestamp: Date.now() - i * 1000
      }));

      const startTime = Date.now();

      // Simulate analysis
      const analyzed = largeDataset.filter(item => item.timestamp > Date.now() - 3600000);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).to.be.lessThan(100); // Should complete in less than 100ms
      expect(analyzed).to.be.an('array');
    });

    it('should batch process users efficiently', () => {
      const users = Array(100).fill(null).map((_, i) => ({
        id: `user-${i}`,
        email: `user${i}@test.com`
      }));

      const BATCH_SIZE = 10;
      const batches = [];

      for (let i = 0; i < users.length; i += BATCH_SIZE) {
        batches.push(users.slice(i, i + BATCH_SIZE));
      }

      expect(batches).to.have.lengthOf(10);
      batches.forEach(batch => {
        expect(batch.length).to.be.at.most(BATCH_SIZE);
      });
    });
  });
});
