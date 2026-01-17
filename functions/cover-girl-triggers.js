const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const { sendEmail } = require('./utils/email');

/**
 * Trigger: When config/coverGirl is updated
 * Checks if a new user is selected and sends a congratulatory email.
 */
exports.onCoverGirlUpdate = functions.firestore
    .document('config/coverGirl')
    .onWrite(async (change, context) => {
        const after = change.after.exists ? change.after.data() : null;
        const before = change.before.exists ? change.before.data() : null;

        // If deleted or no new data, do nothing
        if (!after) return null;

        // Check if userId changed (new cover girl selected)
        // Note: We compare userId. If it's the same user being updated (e.g. alias/photo), 
        // we might not want to spam them, ONLY when they are first selected.
        const newUserId = after.userId;
        const oldUserId = before ? before.userId : null;

        if (newUserId && newUserId !== oldUserId) {
            console.log(`🌟 New Cover Girl selected: ${newUserId}`);

            try {
                // Fetch user data for email
                const userDoc = await admin.firestore().collection('users').doc(newUserId).get();
                if (!userDoc.exists) {
                    console.warn(`User ${newUserId} not found, skipping email.`);
                    return null;
                }

                const userData = userDoc.data();
                const email = userData.email;
                const name = userData.alias || userData.displayName || 'Usuaria';

                if (!email) {
                    console.warn(`User ${newUserId} has no email, skipping.`);
                    return null;
                }

                // Prepare Email Content
                const subject = '¡Felicidades! Eres la nueva Chica de Portada ⭐';
                const html = `
                    <div style="font-family: Arial, sans-serif; color: #333; padding: 20px;">
                        <div style="text-align: center; margin-bottom: 20px;">
                          <h1 style="color: #db2777;">¡Felicidades, ${name}!</h1>
                        </div>
                        <p>Nos complace informarte que has sido seleccionada como la nueva <strong>Chica de Portada</strong> de TuCitaSegura.</p>
                        <p>Tu perfil ahora destaca en nuestra página principal, representando la calidad y seguridad de nuestra comunidad.</p>
                        
                        <div style="background-color: #fce7f3; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #fbcfe8;">
                            <p style="margin: 0; color: #be185d;"><strong>¿Qué significa esto?</strong></p>
                            <ul style="margin-top: 10px; color: #831843;">
                                <li>Mayor visibilidad en la plataforma.</li>
                                <li>Reconocimiento como perfil destacado y verificado.</li>
                                <li>Un estatus especial dentro de nuestra comunidad.</li>
                            </ul>
                        </div>

                        <p>¡Gracias por ser parte de TuCitaSegura!</p>
                        <p style="font-size: 12px; color: #666; margin-top: 30px;">
                            Atentamente,<br>
                            El equipo de TuCitaSegura
                        </p>
                    </div>
                `;

                // Send Email
                const result = await sendEmail({
                    to: email,
                    subject,
                    html,
                    text: `¡Felicidades ${name}! Has sido seleccionada como la nueva Chica de Portada de TuCitaSegura.`
                });

                if (result.success) {
                    console.log(`✅ Cover Girl notification sent to ${email}`);
                } else {
                    console.error(`❌ Failed to send notification: ${result.error}`);
                }

            } catch (error) {
                console.error('Error processing cover girl trigger:', error);
            }
        }

        return null;
    });
