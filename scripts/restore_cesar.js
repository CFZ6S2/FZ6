const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// 1. Initialize Firebase Admin
let serviceAccount;
const possiblePaths = [
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
    path.join(process.cwd(), 'serviceAccountKey.json'),
    path.join(process.cwd(), 'backend', 'serviceAccountKey.json'),
    path.join(__dirname, '../serviceAccountKey.json'),
    path.join(__dirname, '../backend/serviceAccountKey.json')
];

console.log('📂 CWD:', process.cwd());
console.log('🔎 Looking for credentials in:');
possiblePaths.forEach(p => console.log(`   - ${p}`));

for (const p of possiblePaths) {
    if (p && fs.existsSync(p)) {
        console.log(`✅ Found credentials at: ${p}`);
        serviceAccount = require(p);
        break;
    }
}

if (!serviceAccount) {
    console.warn('⚠️  Could not find serviceAccountKey.json. Trying Application Default Credentials...');
}

const config = serviceAccount ? { credential: admin.credential.cert(serviceAccount) } : { credential: admin.credential.applicationDefault() };

try {
    admin.initializeApp(config);
} catch (e) {
    console.error("Initialization Failed:", e);
    process.exit(1);
}

const db = admin.firestore();

async function restoreProfile() {
    try {
        console.log('🔍 Searching for user with alias "Marta23"...');
        const snapshot = await db.collection('users').where('alias', '==', 'Marta23').get();

        if (snapshot.empty) {
            console.log('❌ No user found with alias "Marta23". Searching with case-insensitive check is harder in generic script, checking known admin emails...');
            // Fallback: Check specific admin ID or Email if known, but for now just exit.
            return;
        }

        snapshot.forEach(async (doc) => {
            const data = doc.data();
            console.log(`✅ Found User: ${doc.id}`);
            console.log(`   Email: ${data.email}`);
            console.log(`   Current Alias: ${data.alias}`);
            console.log(`   Current Gender: ${data.gender}`);

            // Restore
            const updates = {
                alias: 'CesarFZ6',
                gender: 'masculino',
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            };

            await db.collection('users').doc(doc.id).update(updates);
            console.log('--------------------------------------------------');
            console.log('✅ RECOVERY SUCCESSFUL');
            console.log(`User ${doc.id} restored to:`);
            console.log(updates);
            console.log('--------------------------------------------------');
        });

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

restoreProfile();
