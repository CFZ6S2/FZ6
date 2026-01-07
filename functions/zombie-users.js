/**
 * Cloud Function para listar usuarios zombies
 * Callable function para uso desde admin panel
 */

const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const { sendEmail } = require('./utils/email');

exports.listZombieUsers = functions.https.onCall(async (data, context) => {
    // 1. Auth check
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }

    const userEmail = context.auth.token.email;
    const userUID = context.auth.uid;

    // Hardcoded whitelist for safety
    const adminEmails = ['cesar.herrera.rojo@gmail.com', 'admin@tucitasegura.com'];
    const adminUIDs = ['Y1rNgj4KYpWSFlPqgrpAaGuAk033'];

    const isAdmin = adminEmails.includes(userEmail) || adminUIDs.includes(userUID) || context.auth.token.role === 'admin';

    if (!isAdmin) {
        throw new functions.https.HttpsError('permission-denied', 'Only admins can access this');
    }

    try {
        console.log(`Listing zombie users requested by ${userEmail}`);

        const now = new Date();
        const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

        const usersSnapshot = await admin.firestore().collection('users').get();

        const zombies = [];

        usersSnapshot.forEach(doc => {
            const user = doc.data();
            const userId = doc.id;
            // Handle timestamps safely
            const createdAt = user.createdAt && user.createdAt.toDate ? user.createdAt.toDate() : null;
            const lastActivity = user.lastActivity && user.lastActivity.toDate ? user.lastActivity.toDate() : null;

            // Strict Zombie Criteria requested by user:
            // 1. Created > 7 days ago
            // 2. No alias (Incomplete profile)

            const isOldEnough = createdAt && createdAt < sevenDaysAgo;
            const noAlias = !user.alias || user.alias.trim() === '';
            const inactive = !lastActivity || lastActivity < thirtyDaysAgo; // Keep for reasons
            const emailNotVerified = !user.emailVerified; // Keep for reasons

            if (isOldEnough && noAlias) {
                const reasons = [];
                reasons.push('Perfil incompleto (Sin alias)');
                if (emailNotVerified) reasons.push('Email no verificado');
                if (inactive) reasons.push('Sin actividad reciente');

                zombies.push({
                    id: userId,
                    email: user.email || 'No email',
                    alias: user.alias || '(vacío)',
                    gender: user.gender || '?',
                    emailVerified: user.emailVerified || false,
                    createdAt: createdAt?.toISOString() || null,
                    lastActivity: lastActivity?.toISOString() || null,
                    reasons: reasons.join(', ')
                });
            }
        });

        // Sort by creation date (newest first)
        zombies.sort((a, b) => {
            if (!a.createdAt) return 1;
            if (!b.createdAt) return -1;
            return b.createdAt.localeCompare(a.createdAt);
        });

        console.log(`Found ${zombies.length} zombies out of ${usersSnapshot.size} users`);

        return {
            success: true,
            totalUsers: usersSnapshot.size,
            zombieCount: zombies.length,
            zombies: zombies
        };

    } catch (error) {
        console.error('Error listing zombie users:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Función para ELIMINAR usuarios zombies
 * - Envía email de notificación
 * - Borra de Firebase Auth (permite re-registro)
 * - Borra de Firestore
 */

exports.cleanupZombieUsers = functions.https.onCall(async (data, context) => {
    // 1. Auth Check (Solo Admins)
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }

    const userEmail = context.auth.token.email;
    const userUID = context.auth.uid;
    const adminEmails = ['cesar.herrera.rojo@gmail.com', 'admin@tucitasegura.com'];
    const adminUIDs = ['Y1rNgj4KYpWSFlPqgrpAaGuAk033'];
    const isAdmin = adminEmails.includes(userEmail) || adminUIDs.includes(userUID) || context.auth.token.role === 'admin';

    if (!isAdmin) {
        throw new functions.https.HttpsError('permission-denied', 'Only admins can execute cleanup');
    }

    // Si data.dryRun es true, solo simula y cuenta
    const dryRun = data.dryRun === true;

    try {
        console.log(`🧹 Zombie cleanup requested by ${userEmail} (DryRun: ${dryRun})`);

        const now = new Date();
        const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

        const usersSnapshot = await admin.firestore().collection('users').get();

        let processedCount = 0;
        let deletedCount = 0;
        let errors = [];

        // Email Template
        const emailSubject = "Aviso importante sobre su cuenta en TuCitaSegura";
        const emailHtml = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #e53e3e;">Notificación de baja de cuenta</h2>
        <p>Hola,</p>
        <p>Le informamos que su cuenta asociada a este correo ha sido eliminada de nuestra base de datos debido a que <strong>no se completó el registro del perfil en un plazo de 7 días</strong>.</p>
        <div style="background-color: #f7fafc; padding: 15px; border-left: 4px solid #3182ce; margin: 20px 0;">
          <p style="margin: 0;">Puede volver a registrarse en <strong><a href="https://tucitasegura.com">tucitasegura.com</a></strong> utilizando esta misma dirección de correo electrónico cuando desee completar su perfil.</p>
        </div>
        <p>Atentamente,<br>El equipo de seguridad de TuCitaSegura</p>
      </div>
    `;

        // Process users in parallel batches (limited concurrency ideally, but loop is fine for <1000)
        const promises = usersSnapshot.docs.map(async (doc) => {
            const user = doc.data();
            const userId = doc.id;
            const createdAt = user.createdAt && user.createdAt.toDate ? user.createdAt.toDate() : null;
            const lastActivity = user.lastActivity && user.lastActivity.toDate ? user.lastActivity.toDate() : null;

            const isOldEnough = createdAt && createdAt < sevenDaysAgo;
            const noAlias = !user.alias || user.alias.trim() === '';
            const inactive = !lastActivity || lastActivity < thirtyDaysAgo;

            // Same strict criteria
            if (isOldEnough && noAlias) {
                processedCount++;

                if (!dryRun) {
                    try {
                        // 1. Send Email (non-blocking, don't fail deletion if email fails)
                        if (user.email) {
                            await sendEmail({
                                to: user.email,
                                subject: emailSubject,
                                html: emailHtml,
                                text: "Su cuenta ha sido eliminada por perfil incompleto (>7 días). Puede registrarse nuevamente en tucitasegura.com cuando lo desee."
                            }).catch(e => console.error(`Failed to email ${user.email}:`, e));
                        }

                        // 2. Delete from Auth (if exists)
                        await admin.auth().deleteUser(userId).catch(e => {
                            // Ignore user-not-found error
                            if (e.code !== 'auth/user-not-found') console.error(`Auth delete error ${userId}:`, e);
                        });

                        // 3. Delete from Firestore (Soft delete or Hard delete? User asked for removal)
                        // "borrarlos de los usuarios y de la base de datos" -> Hard delete
                        await admin.firestore().collection('users').doc(userId).delete();

                        deletedCount++;
                        console.log(`✅ Deleted zombie user: ${user.email} (${userId})`);

                    } catch (err) {
                        console.error(`❌ Failed to process zombie ${userId}:`, err);
                        errors.push({ id: userId, error: err.message });
                    }
                } else {
                    // Dry run
                    deletedCount++; // Count as "would be deleted"
                }
            }
        });

        await Promise.all(promises);

        return {
            success: true,
            dryRun,
            processed: processedCount,
            deleted: deletedCount,
            errors: errors.length > 0 ? errors : null
        };

    } catch (error) {
        console.error('Error cleanup zombie users:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});
