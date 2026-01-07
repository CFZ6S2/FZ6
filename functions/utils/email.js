const nodemailer = require('nodemailer');

// Initialize transporter just once (or per invocation)
// We rely on Firebase Environment Configuration:
// firebase functions:config:set smtp.host="smtp.example.com" smtp.port="465" smtp.user="user@example.com" smtp.pass="password"
// OR standard process.env variables if using dotenv

const functions = require('firebase-functions/v1');

const getTransporter = () => {
    // Priority: 1. Firebase Config (functions:config:set), 2. Environment Variables (.env)
    const config = functions.config().smtp || {};

    const host = config.host || process.env.SMTP_HOST;
    const port = config.port || process.env.SMTP_PORT || 465;
    const user = config.user || process.env.SMTP_USER;
    const pass = config.pass || process.env.SMTP_PASS;

    if (!host || !user || !pass) {
        console.warn('⚠️ SMTP Configuration missing. Email sending will be skipped.');
        // Log what we have for debugging (careful with pass)
        console.log('Debug Config:', { host, port, user, hasPass: !!pass });
        return null;
    }

    return nodemailer.createTransport({
        host: host,
        port: parseInt(port),
        secure: parseInt(port) === 465, // true for 465, false for other ports
        auth: {
            user: user,
            pass: pass,
        },
        tls: {
            rejectUnauthorized: false // Fix for shared hosting cert mismatch (loading.es)
        }
    });
};

/**
 * Send an email using configured SMTP transporter
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - HTML content
 * @param {string} text - Fallback text content
 */
async function sendEmail({ to, subject, html, text }) {
    const transporter = getTransporter();

    if (!transporter) {
        console.log(`[Mock Email] To: ${to} | Subject: ${subject}`);
        return { success: false, error: 'SMTP not configured' };
    }

    try {
        const config = functions.config().smtp || {};
        const senderEmail = config.user || process.env.SMTP_USER;

        const info = await transporter.sendMail({
            from: `TuCitaSegura <${senderEmail}>`,
            to,
            subject,
            text, // plain text body
            html, // html body
        });

        console.log(`✅ Email sent to ${to}: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error(`❌ Error sending email to ${to}:`, error);
        return { success: false, error: error.message };
    }
}

module.exports = { sendEmail };
