// Direct script to send beta announcement notifications
// Runs directly from functions directory with existing credentials

const admin = require('firebase-admin');

// Initialize app (uses Application Default Credentials from environment)
try {
    admin.initializeApp();
} catch (e) {
    // Already initialized
}

const db = admin.firestore();

const ANNOUNCEMENT = {
    title: '🎉 Membresía Gratis Activada',
    body: 'Durante la fase beta, puedes chatear con todas las usuarias sin costo. ¡Aprovecha y encuentra tu match ideal!',
    type: 'announcement',
    icon: '/favicon.svg'
};

async function main() {
    console.log('\n' + '='.repeat(60));
    console.log('   ANUNCIO DE MEMBRESÍA GRATUITA BETA');
    console.log('='.repeat(60) + '\n');

    try {
        // 1. Get all male users
        console.log('📊 Buscando usuarios masculinos...');
        const usersSnapshot = await db.collection('users')
            .where('gender', '==', 'masculino')
            .get();

        console.log(`✅ Encontrados: ${usersSnapshot.size} usuarios\n`);

        if (usersSnapshot.size === 0) {
            console.log('⚠️  No hay usuarios masculinos para notificar\n');
            return;
        }

        console.log('💌 Creando notificaciones in-app...');

        let created = 0;
        let failed = 0;

        for (const userDoc of usersSnapshot.docs) {
            const userId = userDoc.id;

            try {
                await db.collection('notifications').add({
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

                created++;

                // Progress
                if (created % 5 === 0) {
                    process.stdout.write(`   Progreso: ${created}/${usersSnapshot.size}\r`);
                }

            } catch (error) {
                console.error(`   ⚠️  Error para usuario ${userId}:`, error.message);
                failed++;
            }

            // Small delay to avoid rate limits
            await new Promise(r => setTimeout(r, 50));
        }

        console.log(`   Progreso: ${created}/${usersSnapshot.size}`);
        console.log('');
        console.log('✅ ¡NOTIFICACIONES CREADAS EXITOSAMENTE!\n');
        console.log('='.repeat(60));
        console.log(`   Total usuarios:        ${usersSnapshot.size}`);
        console.log(`   Notificaciones creadas: ${created}`);
        console.log(`   Fallidas:              ${failed}`);
        console.log('='.repeat(60));
        console.log('');
        console.log('💡 Ver notificaciones en:');
        console.log('   https://console.firebase.google.com/project/tucitasegura-129cc/firestore/data/notifications');
        console.log('');
        console.log('🎉 ¡Usuarios masculinos ahora tienen acceso GRATIS!\n');

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error(error);
        throw error;
    }
}

// Run
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
