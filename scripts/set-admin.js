const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// 1. Initialize Firebase Admin
let serviceAccount;

// Try to find credentials
const possiblePaths = [
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
    path.join(__dirname, '../serviceAccountKey.json'),
    path.join(__dirname, '../backend/serviceAccountKey.json'),
    path.join(__dirname, '../firebase-credentials.json')
];

for (const p of possiblePaths) {
    if (p && fs.existsSync(p)) {
        console.log(`✅ Found credentials at: ${p}`);
        serviceAccount = require(p);
        break;
    }
}

if (!serviceAccount) {
    console.error('❌ Error: Could not find serviceAccountKey.json or GOOGLE_APPLICATION_CREDENTIALS');
    console.log('   Please place standard firebase service account json in the root or set the env var.');
    process.exit(1);
}

try {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log('🔥 Firebase Admin Initialized');
} catch (e) {
    console.error('❌ Init Error:', e.message);
    process.exit(1);
}

// 2. Get User Email from Args
const email = process.argv[2];

if (!email) {
    console.log('Usage: node scripts/set-admin.js <email> [role]');
    console.log('Example: node scripts/set-admin.js user@example.com admin');
    process.exit(1);
}

const role = process.argv[3] || 'admin';

// 3. Set Custom Claims
async function setAdminRole(email, role) {
    try {
        const user = await admin.auth().getUserByEmail(email);

        // Merge with existing claims if needed, but here we just set role
        const currentClaims = user.customClaims || {};
        const newClaims = { ...currentClaims, role: role };

        await admin.auth().setCustomUserClaims(user.uid, newClaims);

        console.log('--------------------------------------------------');
        console.log(`✅ SUCCESS: Role '${role}' assigned to user: ${email}`);
        console.log(`🆔 UID: ${user.uid}`);
        console.log(`🔒 Claims:`, newClaims);
        console.log('--------------------------------------------------');
        console.log('⚠️  NOTE: The user must sign out and sign back in for changes to take effect.');

    } catch (error) {
        console.error('❌ Error assigning role:', error);
        if (error.code === 'auth/user-not-found') {
            console.error('   User not found. Check the email address.');
        }
    }
}

setAdminRole(email, role);
