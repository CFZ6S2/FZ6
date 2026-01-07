const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp({
    projectId: 'tucitasegura-129cc'
});

async function listVerifiedUsers() {
    console.log('🔍 Checking email verification status...\n');

    const allUsers = [];
    const verified = [];
    const unverified = [];

    try {
        // List all users (paginated)
        let nextPageToken;

        do {
            const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);

            listUsersResult.users.forEach((userRecord) => {
                allUsers.push(userRecord);

                if (userRecord.emailVerified) {
                    verified.push({
                        uid: userRecord.uid,
                        email: userRecord.email,
                        displayName: userRecord.displayName || '(Sin nombre)',
                        createdAt: userRecord.metadata.creationTime
                    });
                } else {
                    unverified.push({
                        uid: userRecord.uid,
                        email: userRecord.email,
                        displayName: userRecord.displayName || '(Sin nombre)',
                        createdAt: userRecord.metadata.creationTime
                    });
                }
            });

            nextPageToken = listUsersResult.pageToken;
        } while (nextPageToken);

        // Summary
        console.log('📊 RESUMEN:');
        console.log(`   Total usuarios: ${allUsers.length}`);
        console.log(`   ✅ Verificados: ${verified.length} (${(verified.length / allUsers.length * 100).toFixed(1)}%)`);
        console.log(`   ❌ Sin verificar: ${unverified.length} (${(unverified.length / allUsers.length * 100).toFixed(1)}%)`);
        console.log();

        // List verified users
        if (verified.length > 0) {
            console.log('✅ USUARIOS VERIFICADOS:');
            console.log('─'.repeat(80));
            verified.forEach((user, i) => {
                console.log(`${i + 1}. ${user.displayName}`);
                console.log(`   Email: ${user.email}`);
                console.log(`   UID: ${user.uid}`);
                console.log(`   Creado: ${user.createdAt}`);
                console.log();
            });
        } else {
            console.log('⚠️  No hay usuarios con email verificado\n');
        }

        // List unverified users (summary)
        if (unverified.length > 0) {
            console.log(`\n❌ USUARIOS SIN VERIFICAR (${unverified.length}):`);
            console.log('─'.repeat(80));
            unverified.forEach((user, i) => {
                console.log(`${i + 1}. ${user.email} - ${user.displayName}`);
            });
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

// Run
listVerifiedUsers()
    .then(() => {
        console.log('\n✅ Completado');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Error fatal:', error);
        process.exit(1);
    });
