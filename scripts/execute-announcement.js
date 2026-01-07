const admin = require('firebase-admin');
let nodemailer;
try {
    nodemailer = require('nodemailer');
} catch (e) {
    // Try finding it in functions/node_modules
    try {
        nodemailer = require('../functions/node_modules/nodemailer');
    } catch (e2) {
        console.error('❌ Error: nodemailer not found. Please run "npm install nodemailer" in root or functions folder.');
        process.exit(1);
    }
}

// Initialize Firebase Admin with Default Credentials
if (!admin.apps.length) {
    try {
        admin.initializeApp();
        console.log('✅ Firebase Admin inicializado.');
    } catch (e) {
        console.error('❌ Error inicializando:', e.message);
        console.log('💡 TIP: Ejecuta "gcloud auth application-default login" si falla.');
        process.exit(1);
    }
}

// SMTP Config
const SMTP_CONFIG = {
    host: "mail.tucitasegura.com",
    port: 465,
    secure: true,
    auth: {
        user: "admin@tucitasegura.com",
        pass: "4*ll2w7U6"
    },
    tls: {
        rejectUnauthorized: false // Fix for shared hosting cert mismatch (loading.es)
    }
};

const transporter = nodemailer.createTransport(SMTP_CONFIG);

// Configures Announcement
const ANNOUNCEMENT = {
    title: '🎉 Membresía Gratis Activada',
    body: 'Durante la fase beta, puedes chatear con todas las usuarias sin costo. ¡Aprovecha y encuentra tu match ideal!',
    type: 'announcement',
    priority: 'high',
    icon: '/favicon.svg'
};

const EMAIL_HTML = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 20px; border-radius: 12px;">
    <div style="text-align: center; padding: 20px;">
        <h1 style="color: #0ea5e9;">🎉 ¡Membresía GRATIS!</h1>
    </div>
    <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        <p style="font-size: 18px; color: #334155;">¡Hola!</p>
        <p style="font-size: 16px; color: #475569;">
            Tenemos una excelente noticia para ti. Como parte de nuestro lanzamiento Beta, 
            hemos activado la <strong>Membresía Premium GRATUITA</strong> en tu cuenta.
        </p>
        <p style="font-size: 16px; color: #475569;">
            Ahora puedes:
        </p>
        <ul style="color: #475569;">
            <li>💌 Enviar "Me Gusta" ilimitados</li>
            <li>💬 Chatear con quien quieras</li>
            <li>👀 Ver quién visitó tu perfil</li>
        </ul>
        <div style="text-align: center; margin-top: 30px;">
            <a href="https://tucitasegura-129cc.web.app/buscar-usuarios.html" 
               style="background: linear-gradient(to right, #2563eb, #06b6d4); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
               Empezar a Conocer Gente
            </a>
        </div>
    </div>
    <p style="text-align: center; font-size: 12px; color: #94a3b8; margin-top: 20px;">
        TuCitaSegura 2025
    </p>
</div>
`;

async function sendEmail(to) {
    try {
        await transporter.sendMail({
            from: '"TuCitaSegura" <admin@tucitasegura.com>',
            to: to,
            subject: ANNOUNCEMENT.title,
            subject: ANNOUNCEMENT.title,
            text: `
¡Hola!

Tenemos una excelente noticia para ti. Como parte de nuestro lanzamiento Beta, hemos activado la Membresía Premium GRATUITA en tu cuenta.

Ahora puedes:
- Enviar "Me Gusta" ilimitados
- Chatear con quien quieras
- Ver quién visitó tu perfil

Entra ahora: https://tucitasegura-129cc.web.app/buscar-usuarios.html

TuCitaSegura 2025
            `,
            html: EMAIL_HTML
        });
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Send notification to user's devices
 */
async function sendNotificationToUser(userId, notification, data) {
    try {
        const userDoc = await admin.firestore().collection('users').doc(userId).get();
        if (!userDoc.exists) return { success: false, reason: 'user_not_found' };

        const userData = userDoc.data();
        const tokens = userData.fcmTokens || [];

        if (tokens.length === 0) return { success: false, reason: 'no_tokens' };

        const message = {
            notification: {
                title: notification.title,
                body: notification.body,
            },
            data: data || {},
            tokens: tokens
        };

        const response = await admin.messaging().sendEachForMulticast(message);
        return { success: true, count: response.successCount };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Main Execution Function
 */
async function run() {
    console.log('🚀 Iniciando Anuncio de Membresía Gratuita...');
    console.log(`📢 Título: "${ANNOUNCEMENT.title}"`);
    console.log(`✉️ Enviando también por Email...`);

    try {
        // Get all male users
        const snapshot = await admin.firestore()
            .collection('users')
            .where('gender', '==', 'masculino')
            .get();

        const totalUsers = snapshot.size;
        console.log(`👥 Usuarios masculinos encontrados: ${totalUsers}`);

        if (totalUsers === 0) {
            console.log('⚠️ No hay usuarios a quienes notificar.');
            process.exit();
        }

        let pushSent = 0;
        let inAppCreated = 0;
        let emailsSent = 0;

        console.log('📨 Enviando notificaciones...');

        for (const doc of snapshot.docs) {
            const userId = doc.id;
            const userData = doc.data();

            process.stdout.write(`   - Procesando ${userId}... `);

            // 1. Send Push
            const pushResult = await sendNotificationToUser(userId, ANNOUNCEMENT, {
                type: ANNOUNCEMENT.type,
                timestamp: new Date().toISOString()
            });

            if (pushResult.success) pushSent++;

            // 2. Create In-App Notification
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
            inAppCreated++;

            // 3. Send Email (if email exists)
            if (userData.email) {
                const emailResult = await sendEmail(userData.email);
                if (emailResult.success) {
                    emailsSent++;
                    process.stdout.write('📧 ');
                } else {
                    process.stdout.write(`❌(Email: ${emailResult.error}) `);
                }
            } else {
                process.stdout.write('⚠️(No Email) ');
            }

            console.log('✅');

            // Throttle slightly
            await new Promise(r => setTimeout(r, 100)); // Slightly slower for SMTP safety
        }

        console.log('\n✨ RESUMEN DE EJECUCIÓN (CON EMAILS) ✨');
        console.log(`👥 Total Usuarios: ${totalUsers}`);
        console.log(`📱 Push Enviados: ${pushSent}`);
        console.log(`🔔 Notificaciones In-App: ${inAppCreated}`);
        console.log(`📧 Correos Enviados: ${emailsSent}`);
        console.log('✅ Anuncio completado exitosamente.');

    } catch (error) {
        console.error('\n❌ ERROR FATAL:', error);
    }
    process.exit();
}

run();
