
const admin = require('firebase-admin');

// Initialize with Application Default Credentials
admin.initializeApp({
    projectId: 'tucitasegura-129cc'
});

const db = admin.firestore();

async function auditSearchVisibility() {
    console.log('\n🔍 Audit Search Visibility (Focus: Females/Missing Gender)\n');

    try {
        // Optimize: Query only for 'femenino' gender to avoid full collection scan.
        // Note: This optimization means we won't count 'missingGender' or total users globally.
        const usersSnapshot = await db.collection('users')
            .where('gender', '==', 'femenino')
            .get();

        let stats = {
            total: 0,
            visibleFemales: 0,
            hiddenFemales: 0,
            missingGender: 0,
            deleted: 0
        };

        console.log('--- HIDDEN/PROBLEM USERS (Scanning only Female users) ---');

        usersSnapshot.forEach(doc => {
            const data = doc.data();
            stats.total++;

            // 1. Check if deleted
            if (data.deleted === true || data.disabled === true) {
                stats.deleted++;
                return; // Expected to be hidden
            }

            // Gender check is implicit in the query now

            // 3. Check Visibility Flags
            if (data.isProfileHidden === true) {
                console.log(`❌ HIDDEN (isProfileHidden=true): ${data.email} (${doc.id})`);
                stats.hiddenFemales++;
                return;
            }

            // 4. Check critical fields for Frontend
            let issues = [];
            if (!data.birthDate) issues.push('Missing birthDate');
            // Frontend mocks location if missing, so not unique blocker, but good to note
            // if (!data.location) issues.push('Missing location');

            if (issues.length > 0) {
                console.log(`⚠️ VISIBLE BUT INCOMPLETE: ${data.email} (${doc.id}) -> ${issues.join(', ')}`);
            } else {
                stats.visibleFemales++;
            }
        });

        console.log('\n--- SUMMARY ---');
        console.log(`Total Users Scanned: ${stats.total}`);
        console.log(`✅ Visible Females: ${stats.visibleFemales}`);
        console.log(`❌ Hidden Females (isProfileHidden): ${stats.hiddenFemales}`);
        console.log(`❌ Missing Gender (Unknown): ${stats.missingGender}`);
        console.log(`🗑️ Deleted/Disabled: ${stats.deleted}`);
        console.log('----------------');

    } catch (error) {
        console.error('Error auditing:', error);
    }
}

auditSearchVisibility();
