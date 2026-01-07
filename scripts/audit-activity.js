const admin = require('firebase-admin');

// Initialize with Application Default Credentials
admin.initializeApp({
    projectId: 'tucitasegura-129cc'
});

const db = admin.firestore();

async function auditActivity() {
    const today = new Date();
    // Default to 'today' (start of day)
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    console.log(`\n🔍 Auditando actividad para: ${today.toLocaleDateString()}\n`);

    try {
        let sentEmails = [];
        let deletedUsers = [];

        // Optimize: Run separate queries for each event type instead of full scan
        const reminderFields = ['reminderSent1h', 'reminderSent24h', 'reminderSent3d'];

        // 1. Query Reminders
        const reminderPromises = reminderFields.map(async field => {
            const snapshot = await db.collection('users')
                .where(field, '>=', startOfDay)
                .where(field, '<=', endOfDay)
                .get();

            snapshot.forEach(doc => {
                const data = doc.data();
                sentEmails.push({
                    uid: doc.id,
                    email: data.email || 'No email',
                    alias: data.alias || 'No alias',
                    type: field,
                    time: data[field].toDate().toLocaleTimeString()
                });
            });
        });

        // 2. Query Deleted Users
        const deletedPromise = db.collection('users')
            .where('deletedAt', '>=', startOfDay)
            .where('deletedAt', '<=', endOfDay)
            .get()
            .then(snapshot => {
                snapshot.forEach(doc => {
                    const data = doc.data();
                    deletedUsers.push({
                        uid: doc.id,
                        email: data.email || 'No email',
                        alias: data.alias || 'No alias',
                        time: data.deletedAt.toDate().toLocaleTimeString()
                    });
                });
            });

        // Wait for all queries
        await Promise.all([...reminderPromises, deletedPromise]);


        // Filter for specific times requested (approximate)

        // Emails "a las 6" (assume 05:30 - 07:30 range to be safe)
        const emailsAt6 = sentEmails.filter(e => {
            const hour = parseInt(e.time.split(':')[0]); // Local time string
            // Assuming local time execution matches user's local time expectation
            return (hour >= 5 && hour <= 7) || (hour >= 17 && hour <= 19);
        });

        // Deleted "a las 18" (assume 17:30 - 18:30)
        const deletedAt18 = deletedUsers.filter(u => {
            const hour = parseInt(u.time.split(':')[0]);
            return hour >= 17 && hour <= 19;
        });

        console.log('📧 EMAILS ENVIADOS HOY (Filtrado ~06:00 o ~18:00):');
        if (emailsAt6.length === 0) {
            console.log('   (Ninguno encontrado en ese rango horario)');
            // Show all for debugging
            if (sentEmails.length > 0) {
                console.log('   Otros emails enviados hoy:', sentEmails.length);
                sentEmails.forEach(e => console.log(`   - ${e.time} | ${e.email} (${e.type})`));
            }
        } else {
            emailsAt6.forEach(e => {
                console.log(`   [${e.time}] ${e.email} (${e.alias}) - Tipo: ${e.type}`);
            });
        }
        console.log('');

        console.log('🗑️ CUENTAS BORRADAS HOY (Filtrado ~18:00):');
        if (deletedAt18.length === 0) {
            console.log('   (Ninguna encontrada en ese rango horario)');
            // Show all for debugging
            if (deletedUsers.length > 0) {
                console.log('   Otras cuentas borradas hoy:', deletedUsers.length);
                deletedUsers.forEach(u => console.log(`   - ${u.time} | ${u.email}`));
            }
        } else {
            deletedAt18.forEach(u => {
                console.log(`   [${u.time}] ${u.email} (${u.alias})`);
            });
        }

    } catch (error) {
        console.error('Error auditando:', error);
    }
}

auditActivity();
