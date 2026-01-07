const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Buscar archivo de credenciales
function findCredentials() {
    const possiblePaths = [
        process.env.FIREBASE_PRIVATE_KEY_PATH,
        process.env.GOOGLE_APPLICATION_CREDENTIALS,
        path.join(__dirname, '..', 'backend', 'firebase-credentials.json'),
        path.join(__dirname, '..', 'backend', 'serviceAccountKey.json'),
        path.join(__dirname, '..', 'firebase-credentials.json'),
        './firebase-credentials.json',
        './serviceAccountKey.json'
    ];

    for (const credPath of possiblePaths) {
        if (credPath && fs.existsSync(credPath)) {
            return credPath;
        }
    }

    return null;
}

const credPath = findCredentials();
if (credPath) {
    console.log(`✅ Credenciales encontradas: ${credPath}`);
    const serviceAccount = require(credPath);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
} else {
    console.warn('⚠️ No se encontraron credenciales explícitas. Intentando credenciales por defecto...');
    admin.initializeApp({
        projectId: "tucitasegura-129cc"
    });
}


const db = admin.firestore();

async function resetAllStats() {
    console.log('🔄 Starting Global Stats Reset...');

    try {
        const usersRef = db.collection('users');
        const snapshot = await usersRef.get();
        console.log(`📊 Found ${snapshot.size} users.`);

        const BATCH_SIZE = 400; // Limit is 500, keep safe
        let batch = db.batch();
        let count = 0;
        let totalUpdated = 0;

        for (const doc of snapshot.docs) {
            const userRef = usersRef.doc(doc.id);

            // Define reset state
            const resetData = {
                stats: {
                    completedDates: 0,
                    responseRate: 100, // 100%
                    rating: 5.0        // Max rating
                },
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            };

            batch.set(userRef, resetData, { merge: true });

            count++;
            totalUpdated++;

            if (count >= BATCH_SIZE) {
                await batch.commit();
                console.log(`💾 Saved batch: ${totalUpdated}/${snapshot.size}`);
                batch = db.batch();
                count = 0;
            }
        }

        if (count > 0) {
            await batch.commit();
            console.log(`💾 Saved final batch: ${totalUpdated}/${snapshot.size}`);
        }

        console.log('✅ Success! All stats reset.');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error during reset:', error);
        process.exit(1);
    }
}

resetAllStats();
