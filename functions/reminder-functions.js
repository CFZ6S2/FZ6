// Reminder Email Functions - Append to end of functions/index.js

// ------------------------------------------------------------------
// 13. Scheduled: 1 Hour Profile Reminder
// ------------------------------------------------------------------
exports.scheduledProfileReminder1h = functions.pubsub
    .schedule('every 1 hours')
    .timeZone('Europe/Madrid')
    .onRun(async (context) => {
        logger.info('⏰ Running 1-hour profile reminder...');

        try {
            const db = admin.firestore();
            const oneHourAgo = admin.firestore.Timestamp.fromDate(new Date(Date.now() - 60 * 60 * 1000));

            // Query users created ~1 hour ago without alias
            const usersSnapshot = await db.collection('users')
                .where('createdAt', '>=', oneHourAgo)
                .where('alias', 'in', ['', 'Sin Alias'])
                .get();

            if (usersSnapshot.empty) {
                logger.info('No users to remind (1h)');
                return null;
            }

            const recipients = [];
            usersSnapshot.forEach(doc => {
                const user = doc.data();
                if (user.email && !user.reminderSent1h) {
                    recipients.push({ email: user.email, uid: doc.id });
                }
            });

            logger.info(`Sending 1h reminder to ${recipients.length} users`);

            const subject = '¡Completa tu perfil en TuCitaSegura! 🎯';
            const htmlBody = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #3b82f6;">¡Hola! 👋</h2>
          <p style="color: #333; line-height: 1.6;">
            Vemos que te registraste hace poco en <strong>TuCitaSegura</strong>, pero aún no has completado tu perfil.
          </p>
          <p style="color: #333; line-height: 1.6;">
            <strong>¡Completa tu perfil ahora para empezar a hacer matches!</strong>
          </p>
          <a href="https://tucitasegura.com/perfil.html" style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #06b6d4); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0;">
            Completar Mi Perfil
          </a>
          <p style="color: #666; font-size: 14px; line-height: 1.6;">
            Solo te tomará 2 minutos y podrás empezar a conocer gente increíble.
          </p>
        </div>
      `;

            for (const recipient of recipients) {
                await sendEmail({
                    to: recipient.email,
                    subject: subject,
                    html: htmlBody,
                    text: 'Completa tu perfil en TuCitaSegura para empezar a hacer matches. Visita: https://tucitasegura.com/perfil.html'
                });

                // Mark as sent
                await db.collection('users').doc(recipient.uid).update({
                    reminderSent1h: admin.firestore.FieldValue.serverTimestamp()
                });
            }

            logger.info(`✅ 1h reminders sent: ${recipients.length}`);
            return null;
        } catch (error) {
            logger.error('1h reminder error:', error);
            throw error;
        }
    });

// ------------------------------------------------------------------
// 14. Scheduled: 24 Hour Profile Reminder
// ------------------------------------------------------------------
exports.scheduledProfileReminder24h = functions.pubsub
    .schedule('every 6 hours')
    .timeZone('Europe/Madrid')
    .onRun(async (context) => {
        logger.info('⏰ Running 24-hour profile reminder...');

        try {
            const db = admin.firestore();
            const twentyFourHoursAgo = admin.firestore.Timestamp.fromDate(new Date(Date.now() - 24 * 60 * 60 * 1000));
            const twentyFiveHoursAgo = admin.firestore.Timestamp.fromDate(new Date(Date.now() - 25 * 60 * 60 * 1000));

            // Query users created ~24 hours ago without alias
            const usersSnapshot = await db.collection('users')
                .where('createdAt', '>=', twentyFiveHoursAgo)
                .where('createdAt', '<=', twentyFourHoursAgo)
                .where('alias', 'in', ['', 'Sin Alias'])
                .get();

            if (usersSnapshot.empty) {
                logger.info('No users to remind (24h)');
                return null;
            }

            const recipients = [];
            usersSnapshot.forEach(doc => {
                const user = doc.data();
                if (user.email && !user.reminderSent24h) {
                    recipients.push({ email: user.email, uid: doc.id });
                }
            });

            logger.info(`Sending 24h reminder to ${recipients.length} users`);

            const subject = '⏰ Te estás perdiendo conexiones increíbles';
            const htmlBody = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #f59e0b;">¡No te quedes fuera! ⏰</h2>
          <p style="color: #333; line-height: 1.6;">
            Han pasado 24 horas desde que te registraste en <strong>TuCitaSegura</strong> y aún no has completado tu perfil.
          </p>
          <p style="color: #333; line-height: 1.6;">
            <strong>Mientras tanto, otros usuarios están conociendo gente nueva cada día.</strong>
          </p>
          <a href="https://tucitasegura.com/perfil.html" style="display: inline-block; background: linear-gradient(135deg, #f59e0b, #ef4444); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0;">
            Completar Ahora
          </a>
          <p style="color: #666; font-size: 14px; line-height: 1.6;">
            ¿Necesitas ayuda? Contáctanos: <a href="mailto:n8659033@gmail.com">n8659033@gmail.com</a>
          </p>
        </div>
      `;

            for (const recipient of recipients) {
                await sendEmail({
                    to: recipient.email,
                    subject: subject,
                    html: htmlBody,
                    text: 'Te estás perdiendo conexiones increíbles. Completa tu perfil en TuCitaSegura: https://tucitasegura.com/perfil.html'
                });

                // Mark as sent
                await db.collection('users').doc(recipient.uid).update({
                    reminderSent24h: admin.firestore.FieldValue.serverTimestamp()
                });
            }

            logger.info(`✅ 24h reminders sent: ${recipients.length}`);
            return null;
        } catch (error) {
            logger.error('24h reminder error:', error);
            throw error;
        }
    });

// ------------------------------------------------------------------
// 15. Scheduled: 3 Day Profile Reminder (Final Warning)
// ------------------------------------------------------------------
exports.scheduledProfileReminder3d = functions.pubsub
    .schedule('every 24 hours')
    .timeZone('Europe/Madrid')
    .onRun(async (context) => {
        logger.info('⏰ Running 3-day profile reminder...');

        try {
            const db = admin.firestore();
            const threeDaysAgo = admin.firestore.Timestamp.fromDate(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000));
            const fourDaysAgo = admin.firestore.Timestamp.fromDate(new Date(Date.now() - 4 * 24 * 60 * 60 * 1000));

            // Query users created ~3 days ago without alias
            const usersSnapshot = await db.collection('users')
                .where('createdAt', '>=', fourDaysAgo)
                .where('createdAt', '<=', threeDaysAgo)
                .where('alias', 'in', ['', 'Sin Alias'])
                .get();

            if (usersSnapshot.empty) {
                logger.info('No users to remind (3d)');
                return null;
            }

            const recipients = [];
            usersSnapshot.forEach(doc => {
                const user = doc.data();
                if (user.email && !user.reminderSent3d) {
                    recipients.push({ email: user.email, uid: doc.id });
                }
            });

            logger.info(`Sending 3d reminder to ${recipients.length} users`);

            const subject = '🚨 Última oportunidad - Tu cuenta será eliminada';
            const htmlBody = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #ef4444;">🚨 Última Oportunidad</h2>
          <p style="color: #333; line-height: 1.6;">
            Han pasado 3 días desde que te registraste en <strong>TuCitaSegura</strong> y tu perfil sigue incompleto.
          </p>
          <p style="color: #ef4444; font-weight: bold; line-height: 1.6;">
            ⚠️ Tu cuenta será eliminada automáticamente el próximo domingo si no completas tu perfil.
          </p>
          <a href="https://tucitasegura.com/perfil.html" style="display: inline-block; background: linear-gradient(135deg, #ef4444, #dc2626); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0;">
            Completar Perfil Ahora
          </a>
          <p style="color: #666; font-size: 14px; line-height: 1.6;">
            Si tienes problemas, contáctanos: <a href="mailto:n8659033@gmail.com">n8659033@gmail.com</a> o Telegram: <a href="https://t.me/pk13L4">@pk13L4</a>
          </p>
        </div>
      `;

            for (const recipient of recipients) {
                await sendEmail({
                    to: recipient.email,
                    subject: subject,
                    html: htmlBody,
                    text: 'ÚLTIMA OPORTUNIDAD: Tu cuenta en TuCitaSegura será eliminada si no completas tu perfil. Visita: https://tucitasegura.com/perfil.html'
                });

                // Mark as sent
                await db.collection('users').doc(recipient.uid).update({
                    reminderSent3d: admin.firestore.FieldValue.serverTimestamp()
                });
            }

            logger.info(`✅ 3d reminders sent: ${recipients.length}`);
            return null;
        } catch (error) {
            logger.error('3d reminder error:', error);
            throw error;
        }
    });
