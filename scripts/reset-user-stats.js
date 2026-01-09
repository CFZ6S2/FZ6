const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase Admin
// Assuming this script is run from a context where admin is initialized or credentials are available
// If running locally, you might need to point to serviceAccountKey.json
const serviceAccount = require('../serviceAccountKey.json'); // Adjust path as needed

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = getFirestore();

async function resetUserStats() {
    console.log('🔄 Starting user stats reset...');
    try {
        const usersSnapshot = await db.collection('users').get();

        if (usersSnapshot.empty) {
            console.log('No users found.');
            return;
        }

        const batchSize = 500;
        let batch = db.batch();
        let count = 0;
        let totalUpdated = 0;

        for (const doc of usersSnapshot.docs) {
            const user = doc.data();
            const stats = user.stats || {};

            // Stats to reset
            // 1. Citas (completedDates) -> 0
            // 2. Respuesta (responseRate) -> 0 (or 100? User said "reseteamos". Usually 100 or null is better start, but 0 means no data yet or bad? 
            //    Common UI logic: if undefined -> 100%. If 0 -> 0%. 
            //    Let's set to null or remove the field so it falls back to default?
            //    User said "respuesta lo reseteamos". 
            //    Let's set responseRate to 100 (perfect start) or undefined.
            //    Actually, let's set it to undefined to let UI use default.
            //    Wait, "reseteamos citas y respuesta". 
            //    If I set completedDates to 0. 
            //    If I set responseRate to 100.

            // 3. Remove 'compatibility' if exists (it's usually calculated client-side, but just in case)

            let updates = {};
            let needsUpdate = false;

            // Update stats
            const newStats = {
                ...stats,
                completedDates: 0,
                responseRate: 100 // Reset to 100% or based on new logic? Let's go with 100 for "clean slate"
            };

            // Only update if changed
            if (stats.completedDates !== 0 || stats.responseRate !== 100) {
                updates['stats'] = newStats;
                needsUpdate = true;
            }

            // Remove root level compatibility if exists
            if (user.compatibility !== undefined) {
                updates['compatibility'] = admin.firestore.FieldValue.delete();
                needsUpdate = true;
            }

            if (needsUpdate) {
                batch.update(doc.ref, updates);
                count++;
                totalUpdated++;
            }

            if (count >= batchSize) {
                await batch.commit();
                console.log(`Commit batch of ${count} updates...`);
                batch = db.batch();
                count = 0;
            }
        }

        if (count > 0) {
            await batch.commit();
            console.log(`Commit final batch of ${count} updates...`);
        }

        console.log(`✅ Reset complete. Updated ${totalUpdated} users.`);

    } catch (error) {
        console.error('❌ Error resetting stats:', error);
    }
}

resetUserStats();
