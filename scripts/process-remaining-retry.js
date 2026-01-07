const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

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
        if (credPath && fs.existsSync(credPath)) return credPath;
    }
    return null;
}

const credPath = findCredentials();
if (credPath) {
    admin.initializeApp({ credential: admin.credential.cert(require(credPath)) });
} else {
    admin.initializeApp({ projectId: "tucitasegura-129cc" });
}

const db = admin.firestore();

const TO_DELETE = ['B@s.com'];
const TO_MALE = [
    'luisvargasvargas40@gmail.com',
    'xispas890@gmail.com',
    'martincremades01@gmail.com',
    'sergioveloza.107@gmail.com',
    'dani335valdemoro@gmail.com',
    'orioleonpujol@gmail.com',
    'aiudas@proton.me'
];

async function processUsersRetry() {
    console.log('\n🔧 Processing Users (Retry - Commit First)...\n');

    try {
        const batch = db.batch();
        let authToDelete = [];
        let countUpdates = 0;

        // 1. UPDATE MALES
        for (const email of TO_MALE) {
            const snap = await db.collection('users').where('email', '==', email).get();
            if (snap.empty) {
                console.log(`⚠️ User NOT FOUND: ${email}`);
                continue;
            }
            snap.forEach(doc => {
                batch.update(doc.ref, {
                    gender: 'masculino',
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                console.log(`📝 Batched Update (Masculino): ${email}`);
                countUpdates++;
            });
        }

        // 2. DELETE USERS
        for (const email of TO_DELETE) {
            const snap = await db.collection('users').where('email', '==', email).get();
            if (snap.empty) {
                console.log(`⚠️ User to delete NOT FOUND in Firestore: ${email}`);
                // Try finding by email in Auth?
                try {
                    const user = await admin.auth().getUserByEmail(email);
                    authToDelete.push(user.uid);
                    console.log(`   (Found in Auth though: ${user.uid})`);
                } catch (e) { console.log(`   (Not in Auth either)`); }
                continue;
            }
            snap.forEach(doc => {
                batch.delete(doc.ref);
                authToDelete.push(doc.id);
                console.log(`🗑️ Batched Delete: ${email}`);
            });
        }

        // 3. COMMIT BATCH
        if (countUpdates > 0 || authToDelete.length > 0) {
            console.log('💾 Committing Firestore changes...');
            await batch.commit();
            console.log('✅ Firestore updated.');
        }

        // 4. DELETE AUTH (After commit)
        for (const uid of authToDelete) {
            try {
                await admin.auth().deleteUser(uid);
                console.log(`👤 Auth User Deleted: ${uid}`);
            } catch (e) {
                console.error(`❌ Failed to delete Auth ${uid}: ${e.message}`);
            }
        }

        console.log('\n🎉 Finished.');
        process.exit(0);

    } catch (e) {
        console.error('CRITICAL ERROR:', e);
        process.exit(1);
    }
}

processUsersRetry();
