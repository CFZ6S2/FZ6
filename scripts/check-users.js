const admin = require('firebase-admin');
const serviceAccount = require('../functions/service-account.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

async function checkRecentUsers() {
    console.log('Checking recent users...');

    // List last 20 users
    const listUsersResult = await auth.listUsers(20);
    const users = listUsersResult.users.sort((a, b) => new Date(b.metadata.creationTime) - new Date(a.metadata.creationTime));

    console.log(`Found ${users.length} users. Checking top 5 most recent:`);

    for (const user of users.slice(0, 5)) {
        const docRef = db.collection('users').doc(user.uid);
        const docSnap = await docRef.get();

        console.log(`\nUID: ${user.uid}`);
        console.log(`Email: ${user.email}`);
        console.log(`Created: ${user.metadata.creationTime}`);
        console.log(`Firestore Doc Exists: ${docSnap.exists ? '✅ YES' : '❌ NO'}`);

        if (!docSnap.exists) {
            console.log('⚠️  ZOMBIE DETECTED: User has Auth but no Firestore profile.');
            // Optional: Delete user to allow re-registration
            await auth.deleteUser(user.uid);
            console.log('🗑️  Deleted zombie user to allow clean re-registration.');
        } else {
            const data = docSnap.data();
            console.log(`Role: ${data.userRole || 'MISSING'}`);
            console.log(`Gender: ${data.gender || 'MISSING'}`);
        }
    }
}

checkRecentUsers().catch(console.error);
