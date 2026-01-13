// ===========================================================================
// Firebase Cloud Functions - Push Notifications
// ===========================================================================
// Sends push notifications for various events

const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const { createLogger } = require('./utils/structured-logger');
const { sendEmail } = require('./utils/email');
const { analyzeMessage, logSpamFlag, storeMessageHash } = require('./spam-detection');

// Initialize logger
const logger = createLogger('notifications');

/**
 * Send notification to user's devices
 */
async function sendNotificationToUser(userId, notification, data) {
  try {
    // Get user's FCM tokens
    const userDoc = await admin.firestore().collection('users').doc(userId).get();

    if (!userDoc.exists) {
      logger.warn('User not found for notification', { userId });
      return;
    }

    const userData = userDoc.data();
    const tokens = userData.fcmTokens || [];

    if (tokens.length === 0) {
      logger.debug('User has no FCM tokens', { userId });
      return;
    }

    // Prepare message
    const message = {
      notification: {
        title: notification.title,
        body: notification.body,
        icon: notification.icon || '/webapp/assets/icon-192x192.png'
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

    return response;
  } catch (error) {
    logger.error('Error sending notification', { userId, error: error.message });
    throw error;
  }
}

/**
 * Send match notification
 * Triggered when a new match is created
 */
exports.onMatchCreated = functions.firestore
  .document('matches/{matchId}')
  .onCreate(async (snap, context) => {
    try {
      const match = snap.data();
      const { senderId, receiverId, status } = match;

      // Only send notification for pending matches
      if (status !== 'pending') return;

      // Get sender info
      const senderDoc = await admin.firestore().collection('users').doc(senderId).get();
      if (!senderDoc.exists) return;

      const senderData = senderDoc.data();
      const senderName = senderData.alias || 'Alguien';

      // Send notification to receiver
      await sendNotificationToUser(
        receiverId,
        {
          title: '¡Nueva solicitud de match!',
          body: `${senderName} quiere conectar contigo`
        },
        {
          type: 'match',
          matchId: context.params.matchId,
          senderId: senderId,
          senderName: senderName
        }
      );

      logger.info('Match notification sent', { senderId, receiverId, matchId: context.params.matchId });

      // ✅ NEW: Send email notification to receiver
      const receiverDoc = await admin.firestore().collection('users').doc(receiverId).get();
      if (receiverDoc.exists) {
        const receiverData = receiverDoc.data();
        if (receiverData.email) {
          const receiverAlias = receiverData.alias || 'Usuario';
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
              <div style="background: #e91e63; padding: 20px; text-align: center;">
                <h2 style="color: white; margin: 0;">¡Nuevo Match! ❤️</h2>
              </div>
              <div style="padding: 30px;">
                <p style="font-size: 16px; color: #333;">Hola <strong>${receiverAlias}</strong>,</p>
                <p style="font-size: 16px; color: #333;">¡Tienes un nuevo match con <strong>${senderName}</strong> en TuCitaSegura!</p>
                <p style="font-size: 16px; color: #333;">Ahora podéis chatear y conoceros mejor.</p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="https://tucitasegura.com/webapp/chat.html?conversationId=${context.params.matchId}&userId=${senderId}" 
                     style="background: #e91e63; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(233, 30, 99, 0.2);">
                    Ir al Chat
                  </a>
                </div>
                
                <p style="color: #666; font-size: 14px; text-align: center;">
                  O copia este enlace: <br>
                  <a href="https://tucitasegura.com/webapp/chat.html" style="color: #e91e63;">https://tucitasegura.com/webapp/chat.html</a>
                </p>
              </div>
            </div>
          `;

          try {
            await sendEmail({
              to: receiverData.email,
              subject: `🥰 ¡Tienes un nuevo Match con ${senderName}!`,
              html: emailHtml,
              text: `Hola ${receiverAlias}, ¡Tienes un nuevo match con ${senderName}! Accede aquí: https://tucitasegura.com/webapp/chat.html`
            });
            logger.info('Match email sent', { receiverId, email: receiverData.email });
          } catch (emailError) {
            logger.error('Failed to send match email', { receiverId, error: emailError.message });
          }
        }
      }
    } catch (error) {
      logger.error('Error in onMatchCreated', { matchId: context.params.matchId, error: error.message });
    }
  });

/**
 * Send notification when match is accepted
 */
exports.onMatchAccepted = functions.firestore
  .document('matches/{matchId}')
  .onUpdate(async (change, context) => {
    try {
      const before = change.before.data();
      const after = change.after.data();

      // Check if match was accepted
      if (before.status === 'pending' && after.status === 'accepted') {
        const { senderId, receiverId } = after;

        // Get receiver info (the one who accepted)
        const receiverDoc = await admin.firestore().collection('users').doc(receiverId).get();
        if (!receiverDoc.exists) return;

        const receiverData = receiverDoc.data();
        const receiverName = receiverData.alias || 'Alguien';

        // Notify the sender that their match was accepted
        await sendNotificationToUser(
          senderId,
          {
            title: '¡Match aceptado!',
            body: `${receiverName} aceptó tu solicitud. ¡Ya pueden chatear!`
          },
          {
            type: 'match_accepted',
            matchId: context.params.matchId,
            receiverId: receiverId,
            receiverName: receiverName
          }
        );

        logger.info('Match accepted notification sent', { senderId, receiverId, matchId: context.params.matchId });
      }
    } catch (error) {
      logger.error('Error in onMatchAccepted', { matchId: context.params.matchId, error: error.message });
    }
  });

/**
 * Send message notification
 * Triggered when a new message is created
 */
exports.onMessageCreated = functions.firestore
  .document('conversations/{conversationId}/messages/{messageId}')
  .onCreate(async (snap, context) => {
    try {
      const message = snap.data();
      const { senderId, text, type } = message;
      const conversationId = context.params.conversationId;
      const messageId = context.params.messageId;

      // ============================================
      // SPAM DETECTION - Check before processing
      // ============================================
      if (text && typeof text === 'string') {
        // Get message count in this conversation for context
        const messagesSnapshot = await admin.firestore()
          .collection('conversations')
          .doc(conversationId)
          .collection('messages')
          .where('senderId', '==', senderId)
          .limit(10)
          .get();

        const messageCount = messagesSnapshot.size;

        // Analyze for spam
        const spamAnalysis = await analyzeMessage(text, senderId, conversationId, messageCount);

        if (spamAnalysis.isSpam) {
          // Log the spam flag
          await logSpamFlag(senderId, conversationId, messageId, spamAnalysis);

          // If action is 'block', mark message as hidden and stop processing
          if (spamAnalysis.action === 'block') {
            await snap.ref.update({
              isHidden: true,
              spamScore: spamAnalysis.score,
              spamFlags: spamAnalysis.flags
            });
            logger.warn('Message blocked as spam', { senderId, conversationId, score: spamAnalysis.score });
            return; // Don't send notifications for blocked messages
          }

          // For 'flag' action, continue but mark the message
          await snap.ref.update({
            isFlagged: true,
            spamScore: spamAnalysis.score,
            spamFlags: spamAnalysis.flags
          });
        }

        // Store message hash for repetition detection
        await storeMessageHash(senderId, conversationId, text);
      }
      // ============================================

      // Get conversation to find receiver
      const conversationDoc = await admin.firestore()
        .collection('conversations')
        .doc(conversationId)
        .get();

      if (!conversationDoc.exists) return;

      const conversation = conversationDoc.data();
      const receiverId = conversation.participants.find(p => p !== senderId);

      if (!receiverId) return;

      // Get sender info
      const senderDoc = await admin.firestore().collection('users').doc(senderId).get();
      if (!senderDoc.exists) return;

      const senderData = senderDoc.data();
      const senderName = senderData.alias || 'Alguien';

      // Prepare notification based on message type
      let notificationBody = text;
      if (type === 'date_proposal') {
        notificationBody = '📅 Te propuso una cita';
      }

      // Send notification to receiver
      await sendNotificationToUser(
        receiverId,
        {
          title: senderName,
          body: notificationBody.substring(0, 100) // Truncate long messages
        },
        {
          type: 'message',
          conversationId: conversationId,
          senderId: senderId,
          senderName: senderName
        }
      );

      // ✅ NEW: Create in-app notification
      await admin.firestore().collection('notifications').add({
        userId: receiverId,
        type: 'message',
        title: senderName,
        message: notificationBody.substring(0, 100),
        actionUrl: `/chat.html?conversationId=${conversationId}&userId=${senderId}`,
        actionLabel: 'Ver Chat',
        data: {
          conversationId: conversationId,
          senderId: senderId,
          senderName: senderName
        },
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // ✅ NEW: Send email notification to female users
      // ✅ NEW: Send email notification to ALL users
      const receiverDoc = await admin.firestore().collection('users').doc(receiverId).get();
      if (receiverDoc.exists) {
        const receiverData = receiverDoc.data();
        // Check if user has email and notifications enabled (optional check, for now just email)
        if (receiverData.email) {
          const receiverAlias = receiverData.alias || 'Usuario';
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
              <div style="background: #e91e63; padding: 20px; text-align: center;">
                <h2 style="color: white; margin: 0;">💬 Nuevo Mensaje</h2>
              </div>
              <div style="padding: 30px;">
                <p style="font-size: 16px; color: #333;">Hola <strong>${receiverAlias}</strong>,</p>
                <p style="font-size: 16px; color: #333;">Tienes un mensaje de <strong>${senderName}</strong> en TuCitaSegura:</p>
                
                <blockquote style="background: #fdf2f8; padding: 15px; border-left: 4px solid #e91e63; margin: 20px 0; color: #555; font-style: italic;">
                  "${notificationBody.substring(0, 200)}${notificationBody.length > 200 ? '...' : ''}"
                </blockquote>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="https://tucitasegura.com/webapp/chat.html?conversationId=${conversationId}" 
                     style="background: #e91e63; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(233, 30, 99, 0.2);">
                    Responder Ahora
                  </a>
                </div>
                
                <p style="color: #666; font-size: 14px; text-align: center;">
                  Accede a tus mensajes aquí: <br>
                  <a href="https://tucitasegura.com/webapp/chat.html?conversationId=${conversationId}" style="color: #e91e63;">https://tucitasegura.com/webapp/chat.html</a>
                </p>
              </div>
            </div>
          `;

          try {
            await sendEmail({
              to: receiverData.email,
              subject: `💬 ${senderName} te ha enviado un mensaje`,
              html: emailHtml,
              text: `Hola ${receiverAlias}, tienes un mensaje de ${senderName}: "${notificationBody.substring(0, 50)}...". Responde aquí: https://tucitasegura.com/webapp/chat.html`
            });
            logger.info('Email notification sent to user', { receiverId, email: receiverData.email });
          } catch (emailError) {
            logger.error('Failed to send email notification', { receiverId, error: emailError.message });
          }
        }
      }

      logger.info('Message notification sent', { senderId, receiverId, conversationId });
    } catch (error) {
      logger.error('Error in onMessageCreated', { conversationId, error: error.message });
    }
  });

/**
 * Send appointment confirmation notification
 * Triggered when appointment status changes to 'confirmed'
 */
exports.onAppointmentConfirmed = functions.firestore
  .document('appointments/{appointmentId}')
  .onUpdate(async (change, context) => {
    try {
      const before = change.before.data();
      const after = change.after.data();

      // Check if appointment was confirmed
      if (before.status !== 'confirmed' && after.status === 'confirmed') {
        const { participants, date, time, place } = after;

        // Send notification to both participants
        for (const userId of participants) {
          await sendNotificationToUser(
            userId,
            {
              title: '✅ Cita confirmada',
              body: `Tu cita está confirmada para ${date} a las ${time} en ${place}`
            },
            {
              type: 'appointment',
              appointmentId: context.params.appointmentId,
              date: date,
              time: time,
              place: place
            }
          );
        }

        logger.info('Appointment confirmation notifications sent', {
          appointmentId: context.params.appointmentId,
          participantsCount: participants.length
        });
      }
    } catch (error) {
      logger.error('Error in onAppointmentConfirmed', { appointmentId: context.params.appointmentId, error: error.message });
    }
  });

/**
 * Send appointment reminder
 * Scheduled Cloud Function (runs every hour)
 */
exports.sendAppointmentReminders = functions.pubsub
  .schedule('every 1 hours')
  .timeZone('Europe/Madrid')
  .onRun(async (context) => {
    try {
      const now = new Date();
      const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

      // Optimize: Filter by date to avoid full collection scan
      // We verify 'today' and 'tomorrow' to handle timezone rollovers
      const todayStr = now.toISOString().split('T')[0];
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      // Find appointments in the next hour (filtered by date)
      const appointmentsSnapshot = await admin.firestore()
        .collection('appointments')
        .where('status', '==', 'confirmed')
        .where('date', 'in', [todayStr, tomorrowStr])
        .get();

      let remindersSent = 0;

      for (const doc of appointmentsSnapshot.docs) {
        const appointment = doc.data();
        const { participants, date, time, place, reminderSent } = appointment;

        // Skip if reminder already sent
        if (reminderSent) continue;

        // Parse appointment datetime
        const appointmentDatetime = new Date(`${date}T${time}`);

        // Check if appointment is in the next hour
        if (appointmentDatetime >= now && appointmentDatetime <= oneHourLater) {
          // Send reminder to both participants
          for (const userId of participants) {
            // Get participant info
            const userDoc = await admin.firestore().collection('users').doc(userId).get();
            if (!userDoc.exists) continue;

            const userData = userDoc.data();
            const otherUserId = participants.find(p => p !== userId);

            // Get other participant info
            const otherUserDoc = await admin.firestore().collection('users').doc(otherUserId).get();
            const otherUserName = otherUserDoc.exists ? otherUserDoc.data().alias : 'tu cita';

            await sendNotificationToUser(
              userId,
              {
                title: '⏰ Recordatorio de cita',
                body: `Tu cita con ${otherUserName} es en 1 hora en ${place}`
              },
              {
                type: 'reminder',
                appointmentId: doc.id,
                priority: 'high'
              }
            );
          }

          // Mark reminder as sent
          await doc.ref.update({ reminderSent: true });
          remindersSent++;

          logger.debug('Appointment reminder sent', { appointmentId: doc.id });
        }
      }

      logger.info('Appointment reminders sent', { count: remindersSent });
      return null;
    } catch (error) {
      logger.error('Error sending appointment reminders', { error: error.message });
      throw error;
    }
  });

/**
 * Send VIP event notification
 * Triggered when a new VIP event is published
 */
exports.onVIPEventPublished = functions.firestore
  .document('vip_events/{eventId}')
  .onCreate(async (snap, context) => {
    try {
      const event = snap.data();
      const { title, date, location, conciergeId, status } = event;

      // Only send notification for published events
      if (status !== 'published') return;

      // Get all female users (VIP events are for women)
      const femaleUsersSnapshot = await admin.firestore()
        .collection('users')
        .where('gender', '==', 'femenino')
        .get();

      let notificationsSent = 0;

      // Send notification to all eligible women
      for (const doc of femaleUsersSnapshot.docs) {
        const userId = doc.id;

        await sendNotificationToUser(
          userId,
          {
            title: '✨ Nuevo Evento VIP',
            body: `${title} - ${date} en ${location}`
          },
          {
            type: 'vip_event',
            eventId: context.params.eventId,
            title: title,
            date: date
          }
        );

        notificationsSent++;

        // Add delay to avoid rate limits (100ms between notifications)
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      logger.info('VIP event notifications sent', {
        eventId: context.params.eventId,
        recipientsCount: notificationsSent
      });
    } catch (error) {
      logger.error('Error in onVIPEventPublished', { eventId: context.params.eventId, error: error.message });
    }
  });

/**
 * Send SOS alert notification
 * Triggered when user creates SOS alert
 */
exports.onSOSAlert = functions.firestore
  .document('sos_alerts/{alertId}')
  .onCreate(async (snap, context) => {
    try {
      const alert = snap.data();
      const { userId, appointmentId, location } = alert;

      // Get user info
      const userDoc = await admin.firestore().collection('users').doc(userId).get();
      if (!userDoc.exists) return;

      const userData = userDoc.data();
      const userName = userData.alias || 'Usuario';

      // Get appointment info
      const appointmentDoc = await admin.firestore()
        .collection('appointments')
        .doc(appointmentId)
        .get();

      if (!appointmentDoc.exists) return;

      const appointment = appointmentDoc.data();
      const otherUserId = appointment.participants.find(p => p !== userId);

      // TODO: Send notification to admin/support team
      // For now, log the alert
      logger.warn('SOS Alert triggered', {
        userId,
        userName,
        appointmentId,
        location,
        otherUserId
      });

      // Send notification to emergency contact (if configured)
      if (userData.emergencyContact) {
        // TODO: Implement emergency contact notification
      }

      return null;
    } catch (error) {
      logger.error('Error in onSOSAlert', { error: error.message });
    }
  });

/**
 * Callable function to send test notification
 * For testing purposes
 */
exports.sendTestNotification = functions.https.onCall(async (data, context) => {
  // Check authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Must be authenticated to send test notification'
    );
  }

  const userId = context.auth.uid;

  try {
    await sendNotificationToUser(
      userId,
      {
        title: '🧪 Notificación de prueba',
        body: 'Si ves esto, ¡las notificaciones funcionan correctamente!'
      },
      {
        type: 'test',
        timestamp: new Date().toISOString()
      }
    );

    return { success: true, message: 'Test notification sent' };
  } catch (error) {
    logger.error('Error sending test notification', { userId, error: error.message });
    throw new functions.https.HttpsError('internal', 'Failed to send test notification');
  }
});

module.exports = {
  onMatchCreated: exports.onMatchCreated,
  onMatchAccepted: exports.onMatchAccepted,
  onMessageCreated: exports.onMessageCreated,
  onAppointmentConfirmed: exports.onAppointmentConfirmed,
  sendAppointmentReminders: exports.sendAppointmentReminders,
  onVIPEventPublished: exports.onVIPEventPublished,
  onSOSAlert: exports.onSOSAlert,
  sendTestNotification: exports.sendTestNotification
};
