const admin = require('firebase-admin');

admin.initializeApp({
    projectId: 'tucitasegura-129cc'
});

const db = admin.firestore();

async function checkTotalUsers() {
    try {
        const snap = await db.collection('users').count().get();
        console.log('Total users:', snap.data().count);

        // List top 5 most recent
        const recent = await db.collection('users')
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get();

        console.log('Recent users:');
        recent.forEach(d => console.log(`- ${d.id}: ${d.data().email} (Created: ${d.data().createdAt?.toDate()})`));

    } catch (e) {
        console.error(e);
    }
}

checkTotalUsers();
