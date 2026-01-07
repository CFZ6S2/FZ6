const admin = require('firebase-admin');

admin.initializeApp({
    projectId: 'tucitasegura-129cc'
});

const db = admin.firestore();

async function checkCandidates() {
    console.log('🔍 Checking candidates for 3-day reminder (created 3-4 days ago)...');

    // Mimic the logic in scheduledProfileReminder3d
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);

    console.log(`Window: ${fourDaysAgo.toISOString()} to ${threeDaysAgo.toISOString()}`);

    try {
        const snapshot = await db.collection('users').get();

        let validCandidates = 0;

        snapshot.forEach(doc => {
            const data = doc.data();
            const createdAt = data.createdAt ? data.createdAt.toDate() : null;

            if (!createdAt) return;

            if (createdAt >= fourDaysAgo && createdAt <= threeDaysAgo) {
                const alias = data.alias || '';
                const isTarget = ['', 'Sin Alias'].includes(alias);

                console.log(`Found user in time window: ${doc.id} (${data.email})`);
                console.log(`   - Created: ${createdAt.toISOString()}`);
                console.log(`   - Alias: "${alias}"`);
                console.log(`   - Is Target (Incomplete): ${isTarget}`);

                if (isTarget) validCandidates++;
            }
        });

        console.log(`\nTotal valid candidates found: ${validCandidates}`);

    } catch (e) {
        console.error(e);
    }
}

checkCandidates();
