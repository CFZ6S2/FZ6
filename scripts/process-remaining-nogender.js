const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Credential Finder Logic
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

// CONFIGURATION
const TO_DELETE = ['B@s.com']; // Emails to delete
const TO_MALE = [
    'luisvargasvargas40@gmail.com',
    'xispas890@gmail.com',
    'martincremades01@gmail.com',
    'sergioveloza.107@gmail.com',
    'dani335valdemoro@gmail.com',
    'orioleonpujol@gmail.com',
    'aiudas@proton.me'
];
// 'animaochat@gmail.com' is ignored (kept as is)

async function processUsers() {
    console.log('\n🔧 Processing Remaining Users...\n');

    try {
        const batch = db.batch();
        let updateCount = 0;
        let deleteCount = 0;

        // 1. UPDATE MALES
        if (TO_MALE.length > 0) {
            // Firestore 'in' limit is 10, we have 7. Safe.
            const maleSnapshot = await db.collection('users').where('email', 'in', TO_MALE).get();
            maleSnapshot.forEach(doc => {
                const userRef = db.collection('users').doc(doc.id);
                batch.update(userRef, {
                    gender: 'masculino',
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                console.log(`✅ UPDATING to Masculino: ${doc.data().email}`);
                updateCount++;
            });
        }

        // 2. DELETE USERS
        if (TO_DELETE.length > 0) {
            const deleteSnapshot = await db.collection('users').where('email', 'in', TO_DELETE).get();
            // Loop to handle Auth deletion too if possible, but here we focus on Firestore first
            // Ideally we should delete from Auth too.

            for (const doc of deleteSnapshot.docs) {
                const uid = doc.id;
                const email = doc.data().email;

                // Add to batch for Firestore
                const userRef = db.collection('users').doc(uid);
                batch.delete(userRef);
                console.log(`🗑️ DELETING Firestore Doc: ${email}`);
                deleteCount++;

                // Attempt Auth Deletion
                try {
                    await admin.auth().deleteUser(uid);
                    console.log(`   - Auth User Deleted: ${uid}`);
                } catch (e) {
                    console.error(`   - Failed to delete Auth user ${uid}: ${e.message}`);
                }
            }
        }

        // COMMIT
        if (updateCount > 0 || deleteCount > 0) {
            await batch.commit();
            console.log(`\n🎉 DONE: ${updateCount} Updated, ${deleteCount} Deleted.`);
        } else {
            console.log('No actions needed.');
        }

        process.exit(0);

    } catch (e) {
        console.error('Error:', e);
        process.exit(1);
    }
}

processUsers();
