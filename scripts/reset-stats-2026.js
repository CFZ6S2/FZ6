
const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccountKey.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function resetStats() {
    console.log("🚀 Starting Global Stats Reset for 2026...");

    const usersRef = db.collection("users");
    const snapshot = await usersRef.get();

    if (snapshot.empty) {
        console.log("No matching documents.");
        return;
    }

    const batchSize = 500;
    let batch = db.batch();
    let count = 0;
    let totalUpdated = 0;

    for (const doc of snapshot.docs) {
        const userRef = usersRef.doc(doc.id);
        const data = doc.data();

        // Updates:
        // 1. completedDates -> 0
        // 2. stats.responseRate -> 0
        // 3. stats.rating -> null (remove)

        // We construct the update object carefully to respect nested fields
        // Using dot notation for nested fields ensures we don't overwrite the whole 'stats' map
        const updates = {
            "completedDates": 0,
            "stats.responseRate": 0,
            "stats.rating": admin.firestore.FieldValue.delete()
        };

        batch.update(userRef, updates);
        count++;

        if (count >= batchSize) {
            await batch.commit();
            totalUpdated += count;
            console.log(`✅ Committed batch of ${count} updates...`);
            batch = db.batch();
            count = 0;
        }
    }

    if (count > 0) {
        await batch.commit();
        totalUpdated += count;
        console.log(`✅ Committed final batch of ${count} updates.`);
    }

    console.log(`🎉 Operation Complete. Total users updated: ${totalUpdated}`);
}

resetStats().catch(console.error);
