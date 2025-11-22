// ===========================================================================
// Firebase Cloud Functions - Push Notifications
// ===========================================================================
// Sends push notifications for various events

const functions = require('firebase-functions');
const admin = require('firebase-admin');

/**
 * Send notification to user's devices
 */
async function sendNotificationToUser(userId, notification, data) {
  try {
    // Get user's FCM tokens
    const userDoc = await admin.firestore().collection('users').doc(userId).get();

    if (!userDoc.exists) {
      console.log(`User ${userId} not found`);
      return;
    }

    const userData = userDoc.data();
    const tokens = userData.fcmTokens || [];

    if (tokens.length === 0) {
      console.log(`User ${userId} has no FCM tokens`);
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

    console.log(`Sent notification to ${response.successCount}/${tokens.length} devices`);

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
        console.log(`Removed ${tokensToRemove.length} invalid tokens`);
      }
    }

    return response;
  } catch (error) {
    console.error('Error sending notification:', error);
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

      console.log(`Match notification sent: ${senderId} → ${receiverId}`);
    } catch (error) {
      console.error('Error in onMatchCreated:', error);
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

        console.log(`Match accepted notification sent: ${receiverId} accepted ${senderId}`);
      }
    } catch (error) {
      console.error('Error in onMatchAccepted:', error);
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

      console.log(`Message notification sent: ${senderId} → ${receiverId}`);
    } catch (error) {
      console.error('Error in onMessageCreated:', error);
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

        console.log(`Appointment confirmation notifications sent for ${context.params.appointmentId}`);
      }
    } catch (error) {
      console.error('Error in onAppointmentConfirmed:', error);
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

      // Find appointments in the next hour
      const appointmentsSnapshot = await admin.firestore()
        .collection('appointments')
        .where('status', '==', 'confirmed')
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

          console.log(`Reminder sent for appointment ${doc.id}`);
        }
      }

      console.log(`Sent ${remindersSent} appointment reminders`);
      return null;
    } catch (error) {
      console.error('Error in sendAppointmentReminders:', error);
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

      console.log(`VIP event notification sent to ${notificationsSent} users`);
    } catch (error) {
      console.error('Error in onVIPEventPublished:', error);
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
      console.log(`SOS Alert from ${userName} (${userId}) at location:`, location);

      // Send notification to emergency contact (if configured)
      if (userData.emergencyContact) {
        // TODO: Implement emergency contact notification
      }

      return null;
    } catch (error) {
      console.error('Error in onSOSAlert:', error);
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
    console.error('Error sending test notification:', error);
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
