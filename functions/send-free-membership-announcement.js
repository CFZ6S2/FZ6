// ===========================================================================
// Firebase Cloud Functions - Send Free Membership Announcement
// ===========================================================================
// Sends mass notification to all male users about free beta membership

const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const { createLogger } = require('./utils/structured-logger');

// Initialize logger
const logger = createLogger('free-membership-announcement');

// Announcement configuration
const ANNOUNCEMENT = {
    title: '🎉 Membresía Gratis Activada',
    body: 'Durante la fase beta, puedes chatear con todas las usuarias sin costo. ¡Aprovecha y encuentra tu match ideal!',
    type: 'announcement',
    priority: 'high',
    icon: '/favicon.svg'
};

/**
 * Send notification to user's devices (reusing from notifications.js)
 */
async function sendNotificationToUser(userId, notification, data) {
    try {
        // Get user's FCM tokens
        const userDoc = await admin.firestore().collection('users').doc(userId).get();

        if (!userDoc.exists) {
            logger.warn('User not found for notification', { userId });
            return { success: false, reason: 'user_not_found' };
        }

        const userData = userDoc.data();
        const tokens = userData.fcmTokens || [];

        if (tokens.length === 0) {
            logger.debug('User has no FCM tokens', { userId });
            return { success: false, reason: 'no_tokens' };
        }

        // Prepare message
        const message = {
            notification: {
                title: notification.title,
                body: notification.body,
                icon: notification.icon || '/favicon.svg'
            },
            data: data || {},
            tokens: tokens
        };

        // Send to all devices
        const response = await admin.messaging().sendEachForMulticast(message);

        logger.info('Notification sent to devices', {
            userId,
            successCount: response.successCount,
            totalDevices: tokens.length
        });

        // Remove invalid tokens
        if (response.failureCount > 0) {
            const tokensToRemove = [];

            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    tokensToRemove.push(tokens[idx]);
                }
            });

            if (tokensToRemove.length > 0) {
                const validTokens = tokens.filter(t => !tokensToRemove.includes(t));
                await admin.firestore().collection('users').doc(userId).update({
                    fcmTokens: validTokens
                });
                logger.info('Removed invalid FCM tokens', { userId, removedCount: tokensToRemove.length });
            }
        }

        return {
            success: true,
            successCount: response.successCount,
            failureCount: response.failureCount
        };
    } catch (error) {
        logger.error('Error sending notification', { userId, error: error.message });
        return { success: false, reason: 'error', error: error.message };
    }
}

/**
 * Create in-app notification in Firestore
 */
async function createInAppNotification(userId) {
    try {
        await admin.firestore().collection('notifications').add({
            userId: userId,
            type: ANNOUNCEMENT.type,
            title: ANNOUNCEMENT.title,
            body: ANNOUNCEMENT.body,
            icon: ANNOUNCEMENT.icon,
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            data: {
                action: 'open_search',
                url: '/buscar-usuarios.html'
            }
        });

        return { success: true };
    } catch (error) {
        logger.error('Error creating in-app notification', { userId, error: error.message });
        return { success: false, error: error.message };
    }
}

/**
 * Callable function to send free membership announcement
 * ADMIN ONLY
 */
exports.sendFreeMembershipAnnouncement = functions.https.onCall(async (data, context) => {
    // Check authentication and admin status
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'Must be authenticated to send announcements'
        );
    }

    const isAdmin = context.auth.token.role === 'admin' ||
        context.auth.uid === 'Y1rNgj4KYpWSFlPqgrpAaGuAk033';

    if (!isAdmin) {
        throw new functions.https.HttpsError(
            'permission-denied',
            'Only admins can send mass announcements'
        );
    }

    try {
        logger.info('Starting free membership announcement', { adminId: context.auth.uid });

        // Get all male users
        const maleUsersSnapshot = await admin.firestore()
            .collection('users')
            .where('gender', '==', 'masculino')
            .get();

        const totalUsers = maleUsersSnapshot.size;
        logger.info('Found male users', { count: totalUsers });

        let pushSent = 0;
        let pushFailed = 0;
        let inAppCreated = 0;
        let inAppFailed = 0;

        // Send notifications to all male users
        for (const doc of maleUsersSnapshot.docs) {
            const userId = doc.id;

            // Send push notification
            const pushResult = await sendNotificationToUser(
                userId,
                {
                    title: ANNOUNCEMENT.title,
                    body: ANNOUNCEMENT.body,
                    icon: ANNOUNCEMENT.icon
                },
                {
                    type: ANNOUNCEMENT.type,
                    timestamp: new Date().toISOString()
                }
            );

            if (pushResult.success) {
                pushSent++;
            } else {
                pushFailed++;
            }

            // Create in-app notification
            const inAppResult = await createInAppNotification(userId);

            if (inAppResult.success) {
                inAppCreated++;
            } else {
                inAppFailed++;
            }

            // Throttle: 100ms delay between users to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        const result = {
            success: true,
            totalUsers: totalUsers,
            pushNotifications: {
                sent: pushSent,
                failed: pushFailed
            },
            inAppNotifications: {
                created: inAppCreated,
                failed: inAppFailed
            },
            timestamp: new Date().toISOString()
        };

        logger.info('Free membership announcement completed', result);

        return result;
    } catch (error) {
        logger.error('Error sending free membership announcement', { error: error.message });
        throw new functions.https.HttpsError('internal', `Failed to send announcement: ${error.message}`);
    }
});

module.exports = {
    sendFreeMembershipAnnouncement: exports.sendFreeMembershipAnnouncement
};
