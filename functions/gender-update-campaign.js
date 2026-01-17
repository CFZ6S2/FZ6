/**
 * Gender Update Campaign - Cloud Function
 * Sends email to users with missing gender to complete their profile or re-register
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
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; color: #333; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #3b82f6, #06b6d4); color: white; padding: 25px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 30px; }
        .content p { line-height: 1.6; color: #4b5563; }
        .alert { background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 4px; color: #7f1d1d; }
        .button-group { display: flex; flex-direction: column; gap: 15px; margin: 30px 0; text-align: center; }
        .btn { display: inline-block; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; transition: opacity 0.2s; }
        .btn:hover { opacity: 0.9; }
        .btn-primary { background: #3b82f6; color: white; }
        .btn-danger { background: white; color: #ef4444; border: 2px solid #ef4444; }
        .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⚠️ Acción Requerida: Tu Perfil</h1>
        </div>
        
        <div class="content">
            <p>Hola ${user.alias || 'usuario/a'},</p>
            
            <p>Hemos notado que <strong>tu perfil está incompleto</strong> (falta especificar tu género/sexo). Para asegurarnos de que tengas la mejor experiencia y encuentres lo que buscas, necesitamos que completes este dato.</p>
            
            <div class="alert">
                <strong>¿Por qué es importante?</strong><br>
                Sin este dato, tu perfil no aparece correctamente en las búsquedas y podrías perder oportunidades de conocer gente.
            </div>

            <p>Hemos lanzado un <strong>Nuevo Asistente de Registro</strong> que hace todo mucho más fácil. Tienes dos opciones:</p>
            
            <div class="button-group">
                <div>
                    <p><strong>Opción 1: Completar tu perfil ahora (Recomendado)</strong></p>
                    <a href="https://tucitasegura-129cc.web.app/perfil-asistido.html" class="btn btn-primary">
                        🚀 Completar Perfil con Asistente
                    </a>
                </div>

                <div style="margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
                    <p><strong>Opción 2: Empezar de cero</strong></p>
                    <p style="font-size: 14px;">Si prefieres, puedes borrar tu cuenta actual y volver a registrarte con el nuevo sistema.</p>
                    <a href="https://tucitasegura-129cc.web.app/borrar-cuenta.html" class="btn btn-danger">
                        🗑️ Borrar Cuenta y Re-registrarme
                    </a>
                </div>
            </div>
            
            <p>Si tienes alguna duda, responde a este correo.</p>
            <p>Saludos,<br>El equipo de TuCitaSegura</p>
        </div>
        
        <div class="footer">
            <p>Este es un mensaje de servicio relacionado con tu cuenta en TuCitaSegura.</p>
        </div>
    </div>
</body>
</html>
    `;
}

function generateEmailText(user) {
    return `
Hola ${user.alias || 'usuario/a'},

Hemos notado que tu perfil está incompleto (falta tu género).

Hemos lanzado un NUEVO ASISTENTE DE REGISTRO. Tienes dos opciones:

1. COMPLETAR TU PERFIL (Recomendado):
Entra aquí para usar el asistente: https://tucitasegura-129cc.web.app/perfil-asistido.html

2. EMPEZAR DE CERO:
Puedes borrar tu cuenta y volver a registrarte: https://tucitasegura-129cc.web.app/borrar-cuenta.html

Saludos,
El equipo de TuCitaSegura
    `;
}

/**
 * Cloud Function to update gender campaign
 * Call: POST /sendGenderUpdateCampaign with secret in body
 */
exports.sendGenderUpdateCampaign = functions
    .region('us-central1')
    .runWith({ timeoutSeconds: 540, memory: '512MB' })
    .https.onRequest(async (req, res) => {
        // Security check
        const secret = req.body?.secret || req.query?.secret;
        if (secret !== 'GENDER_UPDATE_2026') {
            return res.status(403).json({ error: 'Forbidden - Invalid secret' });
        }

        const dryRun = req.body?.dryRun === true || req.query?.dryRun === 'true';
        const limit = parseInt(req.body?.limit || req.query?.limit || 0);

        console.log(`⚠️ Gender Update Campaign - Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}, Limit: ${limit || 'none'}`);

        const db = admin.firestore();
        const usersRef = db.collection('users');
        let snapshot;

        // We can't query for "missing" fields easily in Firestore efficiently without a composite index or doing client-side filtering
        // So we will query all users and filtering (assuming dataset is < few thousands, otherwise we need paginated batching)
        // Optimizing: Query users created via 'form' or 'google' might be useful, but let's just grab all for now or check 'gender' == null?
        // Firestore doesn't support where('gender', '==', null) standardly for missing fields, only if explicitly null.
        // Best approach: Get all users, check if gender is falsy.

        snapshot = await usersRef.limit(1000).get(); // Limit to 1000 for safety in this run

        console.log(`📊 Scanned ${snapshot.size} total users`);

        let sent = 0;
        let failed = 0;
        let skipped = 0;
        const results = [];

        for (const doc of snapshot.docs) {
            const user = { id: doc.id, ...doc.data() };

            // Check if gender is missing or invalid
            const genderValid = user.gender === 'masculino' || user.gender === 'femenino';

            if (genderValid) {
                // Gender is fine, skip
                continue;
            }

            // Skip users without email
            if (!user.email) {
                skipped++;
                continue;
            }

            console.log(`🎯 Targeting ${user.email} (Gender: ${user.gender})`);

            if (dryRun) {
                console.log(`[DRY RUN] Would send to: ${user.email}`);
                results.push({ email: user.email, status: 'dry-run', reason: 'missing_gender' });
                sent++;
                continue;
            }

            // Send email
            try {
                const result = await sendEmail({
                    to: user.email,
                    subject: '⚠️ Acción Requerida: Completa tu perfil en TuCitaSegura',
                    html: generateEmailHTML(user),
                    text: generateEmailText(user),
                    replyTo: 'admin@tucitasegura.com'
                });

                if (result.success) {
                    console.log(`✅ Email sent to ${user.email}`);
                    sent++;
                    results.push({ email: user.email, status: 'sent' });
                } else {
                    console.error(`❌ Failed to send to ${user.email}: ${result.error}`);
                    failed++;
                    results.push({ email: user.email, status: 'failed', error: result.error });
                }
            } catch (error) {
                console.error(`❌ Exception sending to ${user.email}: ${error.message}`);
                failed++;
                results.push({ email: user.email, status: 'failed', error: error.message });
            }

            // Rate limiting
            await new Promise(r => setTimeout(r, 500));
        }

        // Log campaign
        const logData = {
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            campaign: 'gender-update-notification',
            dryRun,
            sent,
            failed,
            skipped
        };

        await db.collection('campaign_logs').add(logData);

        console.log(`📈 Campaign complete: Sent=${sent}, Failed=${failed}, Skipped=${skipped}`);

        res.json({
            success: true,
            dryRun,
            stats: { scanned: snapshot.size, sent, failed, skipped },
            results: results.slice(0, 50)
        });
    });
