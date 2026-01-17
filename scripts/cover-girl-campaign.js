/**
 * Cover Girl Email Campaign Script
 * Sends invitations to female users to be featured on the landing page
 * 
 * Usage: node scripts/cover-girl-campaign.js [--dry-run] [--limit=N]
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './functions/service-account-key.json';

try {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
} catch (e) {
    // Try alternative path
    try {
        const serviceAccount = require('../functions/service-account-key.json');
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } catch (e2) {
        // Already initialized or running in Firebase environment
        if (!admin.apps.length) {
            admin.initializeApp();
        }
    }
}

const db = admin.firestore();

// Email configuration (using nodemailer directly since this is a script)
const nodemailer = require('nodemailer');

// SMTP Config - set these in your environment
const SMTP_CONFIG = {
    host: process.env.SMTP_HOST || 'smtp.loading.es',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: true,
    auth: {
        user: process.env.SMTP_USER || 'noreply@tucitasegura.com',
        pass: process.env.SMTP_PASS
    }
};

const transporter = nodemailer.createTransport(SMTP_CONFIG);

// Parse command line arguments
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const limitArg = args.find(a => a.startsWith('--limit='));
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1]) : 0;

// Email template
function generateEmailHTML(user) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #ec4899, #8b5cf6); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; }
        .header p { margin: 10px 0 0; opacity: 0.9; }
        .content { padding: 30px; }
        .content h2 { color: #1e3a8a; margin-top: 0; }
        .content p { color: #475569; line-height: 1.6; }
        .highlight { background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0; }
        .benefits { list-style: none; padding: 0; }
        .benefits li { padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
        .benefits li:before { content: "💖 "; }
        .cta { text-align: center; margin: 30px 0; }
        .cta-btn { display: inline-block; background: linear-gradient(135deg, #ec4899, #8b5cf6); color: white; padding: 15px 40px; border-radius: 25px; text-decoration: none; font-weight: bold; font-size: 16px; }
        .footer { background: #1e293b; color: #94a3b8; padding: 20px; text-align: center; font-size: 12px; }
        .footer a { color: #60a5fa; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>💖 ¡Sé la imagen de TuCitaSegura!</h1>
            <p>Una invitación exclusiva para ti, ${user.alias || 'usuaria especial'}</p>
        </div>
        
        <div class="content">
            <h2>¡Hola ${user.alias || 'guapa'}!</h2>
            
            <p>Queremos invitarte a algo muy especial. Estamos buscando a mujeres reales de nuestra comunidad para ser <strong>la imagen de portada</strong> de TuCitaSegura.</p>
            
            <div class="highlight">
                <strong>¿Qué significa ser imagen de portada?</strong><br>
                Tu foto, tu nombre y tu ciudad aparecerán en la página principal de nuestra web, mostrando que TuCitaSegura está formada por personas reales como tú.
            </div>
            
            <p><strong>Lo que aparecerá en la portada:</strong></p>
            <ul class="benefits">
                <li>Tu foto de perfil (la que ya tienes subida)</li>
                <li>Tu alias: <strong>${user.alias || '(tu nombre)'}</strong></li>
                <li>Tu ciudad: <strong>${user.city || '(tu ciudad)'}</strong></li>
                <li>Tu biografía (parte de ella)</li>
            </ul>
            
            <p>La duración será variable según el interés de otras usuarias. ¡Podrías ser nuestra imagen durante semanas o incluso meses!</p>
            
            <div class="cta">
                <p><strong>¿Te interesa?</strong></p>
                <p>Simplemente responde a este email con un <strong>"¡Sí, quiero!"</strong> y nos pondremos en contacto contigo.</p>
            </div>
            
            <p>También puedes contactarnos por:</p>
            <ul>
                <li>Email: <a href="mailto:soporte@tucitasegura.com">soporte@tucitasegura.com</a></li>
                <li>Instagram: @tucitasegura</li>
            </ul>
            
            <p>¡Esperamos tu respuesta! 💕</p>
            <p><em>El equipo de TuCitaSegura</em></p>
        </div>
        
        <div class="footer">
            <p>Recibes este email porque eres usuaria de <a href="https://tucitasegura.com">TuCitaSegura.com</a></p>
            <p>Si no deseas recibir más emails, <a href="https://tucitasegura.com/perfil.html">gestiona tus preferencias</a></p>
        </div>
    </div>
</body>
</html>
    `;
}

function generateEmailText(user) {
    return `
¡Hola ${user.alias || 'usuaria'}!

Queremos invitarte a ser la IMAGEN DE PORTADA de TuCitaSegura.

Tu foto, tu nombre (${user.alias}) y tu ciudad (${user.city || 'tu ciudad'}) aparecerán en la página principal de nuestra web.

¿Te interesa? Simplemente responde a este email con un "¡Sí, quiero!"

También puedes contactarnos en:
- soporte@tucitasegura.com
- Instagram: @tucitasegura

¡Esperamos tu respuesta!
El equipo de TuCitaSegura
    `;
}

async function sendCampaignEmail(user) {
    const mailOptions = {
        from: '"TuCitaSegura" <noreply@tucitasegura.com>',
        replyTo: 'soporte@tucitasegura.com',
        to: user.email,
        subject: '💖 ¡Sé la imagen de TuCitaSegura!',
        html: generateEmailHTML(user),
        text: generateEmailText(user)
    };

    if (DRY_RUN) {
        console.log(`[DRY RUN] Would send to: ${user.email} (${user.alias})`);
        return { success: true, dryRun: true };
    }

    try {
        const result = await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent to ${user.email} (${user.alias}) - MessageID: ${result.messageId}`);
        return { success: true, messageId: result.messageId };
    } catch (error) {
        console.error(`❌ Failed to send to ${user.email}: ${error.message}`);
        return { success: false, error: error.message };
    }
}

async function runCampaign() {
    console.log('\n======================================');
    console.log('🌟 COVER GIRL EMAIL CAMPAIGN');
    console.log('======================================');
    console.log(`Mode: ${DRY_RUN ? '🔵 DRY RUN (no emails sent)' : '🔴 LIVE (sending emails)'}`);
    console.log(`Limit: ${LIMIT || 'No limit'}`);
    console.log('======================================\n');

    // Query female users (regardless of verification status)
    let query = db.collection('users')
        .where('gender', '==', 'femenino');

    if (LIMIT) {
        query = query.limit(LIMIT);
    }

    const snapshot = await query.get();

    console.log(`📊 Found ${snapshot.size} eligible female users\n`);

    if (snapshot.empty) {
        console.log('No users to email. Exiting.');
        return;
    }

    let sent = 0;
    let failed = 0;
    const results = [];

    for (const doc of snapshot.docs) {
        const user = { id: doc.id, ...doc.data() };

        // Skip users without photos
        if (!user.photoURL) {
            console.log(`⏭️ Skipping ${user.email || user.id} - No profile photo`);
            continue;
        }

        // Skip users without email
        if (!user.email) {
            console.log(`⏭️ Skipping ${user.id} - No email address`);
            continue;
        }

        const result = await sendCampaignEmail(user);
        results.push({ email: user.email, ...result });

        if (result.success) {
            sent++;
        } else {
            failed++;
        }

        // Rate limiting: wait 1 second between emails
        await new Promise(r => setTimeout(r, 1000));
    }

    console.log('\n======================================');
    console.log('📈 CAMPAIGN RESULTS');
    console.log('======================================');
    console.log(`✅ Sent: ${sent}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏭️ Skipped: ${snapshot.size - sent - failed}`);
    console.log('======================================\n');

    // Save campaign log
    const logData = {
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        campaign: 'cover-girl-invitation',
        totalUsers: snapshot.size,
        sent,
        failed,
        dryRun: DRY_RUN,
        results
    };

    if (!DRY_RUN) {
        await db.collection('campaign_logs').add(logData);
        console.log('📝 Campaign log saved to Firestore\n');
    }
}

// Run the campaign
runCampaign()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('Campaign failed:', err);
        process.exit(1);
    });
