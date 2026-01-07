// Script para ejecutar el anuncio de membresía gratuita beta
// Invoca la Cloud Function sendFreeMembershipAnnouncement

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Inicializar Firebase Admin
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'tucitasegura-129cc'
});

async function sendBetaAnnouncement() {
    console.log('🚀 Iniciando envío de anuncio de membresía gratuita beta...\n');

    try {
        // Obtener referencia a Firestore
        const db = admin.firestore();

        // Contar usuarios masculinos
        console.log('📊 Contando usuarios masculinos...');
        const maleUsers = await db.collection('users')
            .where('gender', '==', 'masculino')
            .get();

        const totalUsers = maleUsers.size;
        console.log(`✅ Encontrados ${totalUsers} usuarios masculinos\n`);

        if (totalUsers === 0) {
            console.log('⚠️  No hay usuarios masculinos en la base de datos');
            process.exit(0);
        }

        console.log('💌 Enviando notificaciones...');
        console.log('   - Push notifications (FCM)');
        console.log('   - In-app notifications (Firestore)\n');

        let pushSent = 0;
        let pushFailed = 0;
        let inAppCreated = 0;
        let inAppFailed = 0;

        // Mensaje del anuncio
        const announcement = {
            title: '🎉 Membresía Gratis Activada',
            body: 'Durante la fase beta, puedes chatear con todas las usuarias sin costo. ¡Aprovecha y encuentra tu match ideal!',
            type: 'announcement',
            icon: '/favicon.svg'
        };

        let count = 0;
        for (const doc of maleUsers.docs) {
            const userId = doc.id;
            const userData = doc.data();
            count++;

            // Progress indicator
            if (count % 10 === 0) {
                process.stdout.write(`   Procesando... ${count}/${totalUsers}\r`);
            }

            // 1. Send push notification (if user has FCM tokens)
            const tokens = userData.fcmTokens || [];
            if (tokens.length > 0) {
                try {
                    const message = {
                        notification: {
                            title: announcement.title,
                            body: announcement.body
                        },
                        data: {
                            type: announcement.type,
                            timestamp: new Date().toISOString()
                        },
                        tokens: tokens
                    };

                    const response = await admin.messaging().sendEachForMulticast(message);

                    if (response.successCount > 0) {
                        pushSent++;
                    } else {
                        pushFailed++;
                    }

                    // Remove invalid tokens
                    if (response.failureCount > 0) {
                        const validTokens = [];
                        response.responses.forEach((resp, idx) => {
                            if (resp.success) {
                                validTokens.push(tokens[idx]);
                            }
                        });

                        if (validTokens.length !== tokens.length) {
                            await doc.ref.update({ fcmTokens: validTokens });
                        }
                    }
                } catch (error) {
                    pushFailed++;
                    console.error(`   ⚠️  Error enviando push a ${userId}: ${error.message}`);
                }
            } else {
                pushFailed++; // No tokens = failed push
            }

            // 2. Create in-app notification
            try {
                await db.collection('notifications').add({
                    userId: userId,
                    type: announcement.type,
                    title: announcement.title,
                    body: announcement.body,
                    icon: announcement.icon,
                    read: false,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    data: {
                        action: 'open_search',
                        url: '/buscar-usuarios.html'
                    }
                });
                inAppCreated++;
            } catch (error) {
                inAppFailed++;
                console.error(`   ⚠️  Error creando notificación para ${userId}: ${error.message}`);
            }

            // Throttle: 100ms between users
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        console.log('\n\n✅ ¡Anuncio enviado exitosamente!\n');
        console.log('📊 RESULTADOS:');
        console.log('═'.repeat(50));
        console.log(`   Total usuarios:           ${totalUsers}`);
        console.log(`   Push notifications sent:  ${pushSent}`);
        console.log(`   Push notifications failed: ${pushFailed}`);
        console.log(`   In-app notifications:     ${inAppCreated}`);
        console.log(`   In-app failed:            ${inAppFailed}`);
        console.log('═'.repeat(50));
        console.log('\n💡 Verifica las notificaciones en:');
        console.log('   https://console.firebase.google.com/project/tucitasegura-129cc/firestore/data/notifications\n');

        process.exit(0);

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error(error);
        process.exit(1);
    }
}

// Ejecutar
console.log('═'.repeat(50));
console.log('   ANUNCIO DE MEMBRESÍA GRATUITA BETA');
console.log('═'.repeat(50));
console.log('');

sendBetaAnnouncement();
