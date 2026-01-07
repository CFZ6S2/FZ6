const admin = require('firebase-admin');

// Initialize with Application Default Credentials
admin.initializeApp({
    projectId: 'tucitasegura-129cc'
});

const db = admin.firestore();

async function auditAllActivity() {
    console.log(`\n🔍 Auditoría COMPLETA de actividad (Users Collection)\n`);

    try {
        const usersSnapshot = await db.collection('users').get();

        let activityFound = false;

        usersSnapshot.forEach(doc => {
            const data = doc.data();
            const uid = doc.id;
            const email = data.email || 'No email';

            // Log ANY timestamp field related to emails or deletion
            const fieldsOfInterest = ['reminderSent1h', 'reminderSent24h', 'reminderSent3d', 'deletedAt', 'createdAt'];

            let userActivity = [];

            fieldsOfInterest.forEach(field => {
                if (data[field]) {
                    userActivity.push(`${field}: ${data[field].toDate().toLocaleString('es-ES')}`);
                }
            });

            if (data.deleted === true) {
                userActivity.push('STATUS: DELETED');
            }

            if (userActivity.length > 1 || (userActivity.length === 1 && !userActivity[0].startsWith('createdAt'))) {
                console.log(`👤 Usuario: ${email} (${uid})`);
                userActivity.forEach(a => console.log(`   - ${a}`));
                console.log('');
                activityFound = true;
            }
        });

        if (!activityFound) {
            console.log('❌ No se encontraron registros de emails enviados o cuentas borradas en ningún usuario.');
        }

    } catch (error) {
        console.error('Error auditando:', error);
    }
}

auditAllActivity();
