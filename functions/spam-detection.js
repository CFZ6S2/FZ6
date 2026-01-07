/**
 * Spam Detection Module
 * Analyzes chat messages for spam patterns
 */

const admin = require('firebase-admin');
const { createLogger } = require('./utils/structured-logger');

const logger = createLogger('spam-detection');

// ============================================================================
// SPAM PATTERNS
// ============================================================================

const SPAM_KEYWORDS = [
    'onlyfans', 'only fans', 'onlyfan',
    'whatsapp', 'whats app', 'wsp',
    'telegram', 'telegran',
    'bitcoin', 'crypto', 'btc', 'ethereum',
    'inversión', 'inversion', 'gana dinero',
    'escort', 'servicios', 'tarifas',
    'añádeme', 'agrégame', 'sigueme',
    'sugar daddy', 'sugardaddy',
    'webcam', 'videollamada privada'
];

const URL_REGEX = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/gi;
const PHONE_REGEX = /(\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// ============================================================================
// RATE LIMITING CONFIG
// ============================================================================

const RATE_LIMITS = {
    messagesPerMinute: 10,
    messagesPerHour: 50
};

// ============================================================================
// MAIN ANALYSIS FUNCTION
// ============================================================================

/**
 * Analyze a message for spam indicators
 * @param {string} text - Message text
 * @param {string} senderId - ID of sender
 * @param {string} conversationId - ID of conversation
 * @param {number} messageCount - Number of messages in this conversation by sender
 * @returns {Object} { isSpam: boolean, score: number, flags: string[], action: string }
 */
async function analyzeMessage(text, senderId, conversationId, messageCount = 0) {
    const flags = [];
    let score = 0;

    if (!text || typeof text !== 'string') {
        return { isSpam: false, score: 0, flags: [], action: 'allow' };
    }

    const lowerText = text.toLowerCase();

    // 1. Check for URLs (especially in early messages)
    const urls = text.match(URL_REGEX);
    if (urls) {
        if (messageCount < 5) {
            score += 40;
            flags.push(`URL in early message: ${urls[0]}`);
        } else {
            score += 10;
            flags.push(`Contains URL: ${urls[0]}`);
        }
    }

    // 2. Check for phone numbers (suspicious in early messages)
    const phones = text.match(PHONE_REGEX);
    if (phones) {
        if (messageCount < 5) {
            score += 30;
            flags.push(`Phone number in early message`);
        } else {
            score += 5;
            flags.push(`Contains phone number`);
        }
    }

    // 3. Check for email addresses
    const emails = text.match(EMAIL_REGEX);
    if (emails) {
        score += 20;
        flags.push(`Contains email: ${emails[0]}`);
    }

    // 4. Check for spam keywords
    for (const keyword of SPAM_KEYWORDS) {
        if (lowerText.includes(keyword)) {
            score += 25;
            flags.push(`Spam keyword: "${keyword}"`);
            break; // Only count once
        }
    }

    // 5. Check rate limiting
    const rateLimitResult = await checkRateLimit(senderId);
    if (rateLimitResult.exceeded) {
        score += 50;
        flags.push(`Rate limit exceeded: ${rateLimitResult.reason}`);
    }

    // 6. Check for message repetition across conversations
    const repetitionResult = await checkMessageRepetition(senderId, text);
    if (repetitionResult.isRepeated) {
        score += 60;
        flags.push(`Repeated message sent to ${repetitionResult.count} users`);
    }

    // Determine action based on score
    let action = 'allow';
    if (score >= 80) {
        action = 'block';
    } else if (score >= 40) {
        action = 'flag';
    }

    return {
        isSpam: score >= 40,
        score,
        flags,
        action
    };
}

// ============================================================================
// RATE LIMITING
// ============================================================================

async function checkRateLimit(senderId) {
    const db = admin.firestore();
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const oneHourAgo = now - 3600000;

    // Get recent messages from this sender
    const recentMessages = await db.collection('rate_limits')
        .doc(senderId)
        .get();

    if (!recentMessages.exists) {
        // First message, create rate limit doc
        await db.collection('rate_limits').doc(senderId).set({
            timestamps: [now],
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        return { exceeded: false };
    }

    const data = recentMessages.data();
    let timestamps = data.timestamps || [];

    // Clean old timestamps
    timestamps = timestamps.filter(t => t > oneHourAgo);

    // Add current timestamp
    timestamps.push(now);

    // Update doc
    await db.collection('rate_limits').doc(senderId).update({
        timestamps,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Check limits
    const lastMinute = timestamps.filter(t => t > oneMinuteAgo).length;
    const lastHour = timestamps.length;

    if (lastMinute > RATE_LIMITS.messagesPerMinute) {
        return { exceeded: true, reason: `${lastMinute} messages in last minute` };
    }

    if (lastHour > RATE_LIMITS.messagesPerHour) {
        return { exceeded: true, reason: `${lastHour} messages in last hour` };
    }

    return { exceeded: false };
}

// ============================================================================
// REPETITION DETECTION
// ============================================================================

async function checkMessageRepetition(senderId, text) {
    const db = admin.firestore();

    // Create a hash of the message for comparison
    const messageHash = simpleHash(text.toLowerCase().trim());

    // Check if this hash exists in recent messages
    const recentHashes = await db.collection('message_hashes')
        .where('senderId', '==', senderId)
        .where('hash', '==', messageHash)
        .where('timestamp', '>', new Date(Date.now() - 3600000)) // Last hour
        .get();

    const uniqueConversations = new Set();
    recentHashes.forEach(doc => {
        uniqueConversations.add(doc.data().conversationId);
    });

    return {
        isRepeated: uniqueConversations.size >= 3,
        count: uniqueConversations.size
    };
}

function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString(16);
}

// ============================================================================
// SPAM LOGGING
// ============================================================================

async function logSpamFlag(senderId, conversationId, messageId, analysis) {
    const db = admin.firestore();

    await db.collection('spam_flags').add({
        senderId,
        conversationId,
        messageId,
        score: analysis.score,
        flags: analysis.flags,
        action: analysis.action,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Update user's spam score
    const userRef = db.collection('users').doc(senderId);
    await userRef.update({
        spamScore: admin.firestore.FieldValue.increment(analysis.score),
        lastSpamFlag: admin.firestore.FieldValue.serverTimestamp()
    });

    logger.warn('Spam flagged', { senderId, score: analysis.score, flags: analysis.flags });
}

// ============================================================================
// STORE MESSAGE HASH (for repetition detection)
// ============================================================================

async function storeMessageHash(senderId, conversationId, text) {
    const db = admin.firestore();
    const hash = simpleHash(text.toLowerCase().trim());

    await db.collection('message_hashes').add({
        senderId,
        conversationId,
        hash,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
}

module.exports = {
    analyzeMessage,
    logSpamFlag,
    storeMessageHash
};
