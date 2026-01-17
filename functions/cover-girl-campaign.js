/**
 * Cover Girl Campaign - Cloud Function
 * Sends email invitations to female users to be featured on the landing page
 */
const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const { sendEmail } = require('./utils/email');

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
                <li>Email: <a href="mailto:admin@tucitasegura.com">admin@tucitasegura.com</a></li>
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
- admin@tucitasegura.com
- Instagram: @tucitasegura

¡Esperamos tu respuesta!
El equipo de TuCitaSegura
    `;
}

/**
 * Cloud Function to send cover girl campaign emails
 * Call: POST /sendCoverGirlCampaign with secret in body
 */
exports.sendCoverGirlCampaign = functions
    .region('us-central1')
    .runWith({ timeoutSeconds: 540, memory: '512MB' })
    .https.onRequest(async (req, res) => {
        // Security check
        const secret = req.body?.secret || req.query?.secret;
        if (secret !== 'COVER_GIRL_CAMPAIGN_2026') {
            return res.status(403).json({ error: 'Forbidden - Invalid secret' });
        }

        const dryRun = req.body?.dryRun === true || req.query?.dryRun === 'true';
        const limit = parseInt(req.body?.limit || req.query?.limit || 0);

        console.log(`🌟 Cover Girl Campaign - Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}, Limit: ${limit || 'none'}`);

        const db = admin.firestore();

        // Query female users with photos
        let query = db.collection('users').where('gender', '==', 'femenino');

        if (limit > 0) {
            query = query.limit(limit);
        }

        const snapshot = await query.get();
        console.log(`📊 Found ${snapshot.size} female users`);

        let sent = 0;
        let failed = 0;
        let skipped = 0;
        const results = [];

        for (const doc of snapshot.docs) {
            const user = { id: doc.id, ...doc.data() };

            // Skip users without photos
            if (!user.photoURL) {
                console.log(`⏭️ Skipping ${user.email || user.id} - No profile photo`);
                skipped++;
                continue;
            }

            // Skip users without email
            if (!user.email) {
                console.log(`⏭️ Skipping ${user.id} - No email address`);
                skipped++;
                continue;
            }

            if (dryRun) {
                console.log(`[DRY RUN] Would send to: ${user.email} (${user.alias})`);
                results.push({ email: user.email, alias: user.alias, status: 'dry-run' });
                sent++;
                continue;
            }

            // Send email
            try {
                const result = await sendEmail({
                    to: user.email,
                    subject: '💖 ¡Sé la imagen de TuCitaSegura!',
                    html: generateEmailHTML(user),
                    text: generateEmailText(user),
                    replyTo: 'admin@tucitasegura.com'
                });

                if (result.success) {
                    console.log(`✅ Email sent to ${user.email} (${user.alias})`);
                    sent++;
                    results.push({ email: user.email, alias: user.alias, status: 'sent' });
                } else {
                    console.error(`❌ Failed to send to ${user.email}: ${result.error}`);
                    failed++;
                    results.push({ email: user.email, alias: user.alias, status: 'failed', error: result.error });
                }
            } catch (error) {
                console.error(`❌ Exception sending to ${user.email}: ${error.message}`);
                failed++;
                results.push({ email: user.email, alias: user.alias, status: 'failed', error: error.message });
            }

            // Rate limiting: wait 500ms between emails
            await new Promise(r => setTimeout(r, 500));
        }

        // Log campaign
        const logData = {
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            campaign: 'cover-girl-invitation',
            dryRun,
            totalUsers: snapshot.size,
            sent,
            failed,
            skipped
        };

        await db.collection('campaign_logs').add(logData);

        console.log(`📈 Campaign complete: Sent=${sent}, Failed=${failed}, Skipped=${skipped}`);

        res.json({
            success: true,
            dryRun,
            stats: { total: snapshot.size, sent, failed, skipped },
            results: results.slice(0, 50) // Limit response size
        });
    });
