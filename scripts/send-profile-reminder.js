
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// 1. Initialize Firebase
admin.initializeApp({
    projectId: 'tucitasegura-129cc'
});
const db = admin.firestore();

// 2. Load SMTP Config
const configPath = path.join(__dirname, '..', '.runtimeconfig.json');
let smtpConfig = null;

if (fs.existsSync(configPath)) {
    try {
        const fullConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        smtpConfig = fullConfig.smtp;
    } catch (e) {
        console.error('Error reading .runtimeconfig.json:', e.message);
    }
} else {
    console.warn('⚠️ .runtimeconfig.json not found. Run `firebase functions:config:get > .runtimeconfig.json`');
}

if (!smtpConfig || !smtpConfig.host) {
    console.error('❌ SMTP configuration missing.');
    process.exit(1);
}

const transporter = nodemailer.createTransport({
    host: smtpConfig.host,
    port: parseInt(smtpConfig.port || 465),
    secure: parseInt(smtpConfig.port || 465) === 465,
    auth: {
        user: smtpConfig.user,
        pass: smtpConfig.pass
    },
    tls: {
        rejectUnauthorized: false
    }
});

// 3. Email Content
const SUBJECT = '⚠️ Acción requerida: Completa tu perfil en TuCitaSegura';
const LINK = 'https://tucitasegura.com/webapp/perfil.html';

const HTML_TEMPLATE = (name) => `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #ff385c;">Hola, ${name || 'Usuario'}</h2>
    <p>Hemos notado que tu perfil en <strong>TuCitaSegura</strong> está incompleto (falta tu género).</p>
    <p>Para asegurar que aparezcas en las búsquedas y puedas conectar con otras personas, es <strong>obligatorio</strong> completar este campo.</p>
    <div style="text-align: center; margin: 30px 0;">
        <a href="${LINK}" style="background-color: #ff385c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
            Completar Mi Perfil Ahora
        </a>
    </div>
    <p>Si el botón no funciona, copia y pega este enlace:</p>
    <p><a href="${LINK}">${LINK}</a></p>
    <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
    <p style="color: #666; font-size: 12px;">TuCitaSegura Trust & Safety Team</p>
</div>
`;

// 4. Main Function
async function sendReminders() {
    const isDryRun = process.argv.includes('--dry-run');
    const isTest = process.argv.includes('--test');

    // Test mode: send only to developer/argument
    if (isTest) {
        const testEmail = process.argv[process.argv.indexOf('--test') + 1];
        if (!testEmail || testEmail.startsWith('-')) {
            console.error('❌ Provide an email for testing: node script.js --test <email>');
            process.exit(1);
        }
        console.log(`🧪 TESTING: Sending to ${testEmail}...`);
        await sendEmail(testEmail, 'Test User');
        return;
    }

    console.log(`\n📧 Profile Reminder Tool ${isDryRun ? '[DRY RUN]' : ''}\n`);

    try {
        const usersSnapshot = await db.collection('users').get();
        let targetUsers = [];

        usersSnapshot.forEach(doc => {
            const data = doc.data();
            // Filter logic same as check-missing-gender.js
            if (!data.gender) {
                targetUsers.push({
                    id: doc.id,
                    email: data.email,
                    name: data.alias || data.name || 'Usuario'
                });
            }
        });

        console.log(`Found ${targetUsers.length} users with missing gender.`);

        if (targetUsers.length === 0) return;

        console.log('--- List of Targets ---');
        targetUsers.forEach(u => console.log(`[${u.id}] ${u.email}`));
        console.log('-----------------------');

        if (isDryRun) {
            console.log('\n✅ Dry run complete. No emails sent.');
            console.log('Run without --dry-run to send.');
            return;
        }

        // Send logic
        console.log('\n🚀 Starting sending process...');
        let success = 0;
        let failed = 0;

        for (const user of targetUsers) {
            if (!user.email) {
                console.log(`Skipping ${user.id} (No email)`);
                continue;
            }

            const sent = await sendEmail(user.email, user.name);
            if (sent) success++;
            else failed++;

            // Throttle
            await new Promise(r => setTimeout(r, 500));
        }

        console.log(`\n🏁 Done. Success: ${success}, Failed: ${failed}`);

    } catch (e) {
        console.error('Fatal error:', e);
    }
}

async function sendEmail(to, name) {
    try {
        await transporter.sendMail({
            from: `TuCitaSegura <${smtpConfig.user}>`,
            to: to,
            subject: SUBJECT,
            html: HTML_TEMPLATE(name)
        });
        console.log(`✅ SENT: ${to}`);
        return true;
    } catch (e) {
        console.error(`❌ FAILED: ${to} - ${e.message}`);
        return false;
    }
}

sendReminders();
