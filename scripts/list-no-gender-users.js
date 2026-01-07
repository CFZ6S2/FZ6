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

async function listNoGenderUsers() {
    console.log('🔍 Buscando usuarios SIN GÉNERO...\n');

    try {
        const usersSnapshot = await db.collection('users').get();
        let found = 0;

        console.log('---------------------------------------------------------------------------------');
        console.log('| EMAIL                          | ALIAS                | UID                      |');
        console.log('---------------------------------------------------------------------------------');

        usersSnapshot.forEach(doc => {
            const data = doc.data();

            // Check if gender is missing or invalid
            if (!data.gender || (data.gender !== 'masculino' && data.gender !== 'femenino')) {
                const email = (data.email || 'Sin Email').padEnd(30).substring(0, 30);
                const alias = (data.alias || 'Sin Alias').padEnd(20).substring(0, 20);
                const uid = doc.id;

                console.log(`| ${email} | ${alias} | ${uid} |`);
                found++;
            }
        });

        console.log('---------------------------------------------------------------------------------');
        console.log(`\n❌ Total usuarios sin género válido: ${found}`);
        process.exit(0);

    } catch (e) {
        console.error('Error:', e);
        process.exit(1);
    }
}

listNoGenderUsers();
