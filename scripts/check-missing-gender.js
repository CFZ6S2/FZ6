
const admin = require('firebase-admin');

// Initialize with Application Default Credentials
admin.initializeApp({
    projectId: 'tucitasegura-129cc'
});

const db = admin.firestore();

async function checkMissingGender() {
    console.log('\n🔍 Check Missing Gender\n');

    try {
        const usersSnapshot = await db.collection('users').get();
        let found = false;

        usersSnapshot.forEach(doc => {
            const data = doc.data();
            if (!data.gender) {
                console.log(`❌ Missing gender: ${data.email || 'No email'} (${doc.id})`);
                console.log(`   - Data keys: ${Object.keys(data).join(', ')}`);
                console.log('---');
                found = true;
            }
        });

        if (!found) {
            console.log('✅ All users have a gender defined.');
        }

    } catch (error) {
        console.error('Error checking users:', error);
    }
}

checkMissingGender();
