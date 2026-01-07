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

const UPDATES = [
    { email: 'nothere.m2@gmail.com', gender: 'femenino', notify: true },
    { email: 'garaoma19@gmail.com', gender: 'femenino', notify: false }
];

async function fixFemales() {
    console.log('\n🔧 Fixing Specific Female Profiles...\n');

    try {
        const emails = UPDATES.map(u => u.email);
        const usersSnapshot = await db.collection('users')
            .where('email', 'in', emails)
            .get();

        if (usersSnapshot.empty) {
            console.log('❌ No users found with these emails.');
            process.exit(0);
        }

        const batch = db.batch();
        let count = 0;

        usersSnapshot.forEach(doc => {
            const data = doc.data();
            const config = UPDATES.find(u => u.email === data.email);

            if (config) {
                console.log(`✅ Found: ${data.email} (${doc.id})`);
                console.log(`   - Old Gender: ${data.gender}`);
                console.log(`   - New Gender: ${config.gender}`);

                const userRef = db.collection('users').doc(doc.id);
                batch.update(userRef, {
                    gender: config.gender,
                    // Fix queries by ensuring stats exist too if missing, just in case
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });

                if (config.notify) {
                    console.log(`   📧 NOTIFY REQUESTED for ${data.email}.`);
                    // Since we can't send email easily from here without secrets,
                    // we'll simulate a notification by adding a system notification to the user's collection
                    // if that mechanism existed, otherwise just Log.
                    console.log(`      (Note: Automatic email sending not configured in this script. Please notify manually or via Admin Panel).`);
                }
                count++;
            }
        });

        if (count > 0) {
            await batch.commit();
            console.log(`\n🎉 Successfully updated ${count} profiles.`);
        }

        process.exit(0);

    } catch (error) {
        console.error('Error fixing users:', error);
        process.exit(1);
    }
}

fixFemales();
