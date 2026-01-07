const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp({
    projectId: 'tucitasegura-129cc'
});

const db = admin.firestore();

async function findOrphanedProfiles() {
    console.log('🔍 Buscando perfiles huérfanos (sin usuario en Auth)...\n');

    try {
        // 1. Get all UIDs from Authentication
        const authUsers = [];
        let nextPageToken;

        do {
            const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);
            listUsersResult.users.forEach(user => authUsers.push(user.uid));
            nextPageToken = listUsersResult.pageToken;
        } while (nextPageToken);

        const authUidsSet = new Set(authUsers);
        console.log(`✅ Usuarios en Authentication: ${authUsers.length}`);

        // 2. Get all documents from Firestore users collection
        const usersSnapshot = await db.collection('users').get();
        console.log(`✅ Perfiles en Firestore: ${usersSnapshot.size}`);
        console.log();

        // 3. Find orphaned profiles
        const orphaned = [];
        const valid = [];

        usersSnapshot.forEach(doc => {
            const uid = doc.id;
            const data = doc.data();

            if (!authUidsSet.has(uid)) {
                orphaned.push({
                    uid: uid,
                    alias: data.alias || '(Sin alias)',
                    email: data.email || '(Sin email)',
                    createdAt: data.createdAt?.toDate() || 'Desconocido'
                });
            } else {
                valid.push(uid);
            }
        });

        // 4. Report
        console.log('📊 RESUMEN:');
        console.log(`   ✅ Perfiles válidos (con Auth): ${valid.length}`);
        console.log(`   ❌ Perfiles huérfanos (sin Auth): ${orphaned.length}`);
        console.log();

        if (orphaned.length > 0) {
            console.log('❌ PERFILES HUÉRFANOS A ELIMINAR:');
            console.log('─'.repeat(80));
            orphaned.forEach((profile, i) => {
                console.log(`${i + 1}. ${profile.alias}`);
                console.log(`   Email: ${profile.email}`);
                console.log(`   UID: ${profile.uid}`);
                console.log(`   Creado: ${profile.createdAt}`);
                console.log();
            });

            // Ask for confirmation
            console.log('⚠️  ADVERTENCIA: Estos perfiles serán ELIMINADOS PERMANENTEMENTE');
            console.log('   Para eliminarlos, ejecuta:');
            console.log('   node scripts/delete-orphaned-profiles.js\n');

            // Save UIDs to file for deletion script
            const fs = require('fs');
            fs.writeFileSync(
                'scripts/orphaned-uids.json',
                JSON.stringify(orphaned.map(p => p.uid), null, 2)
            );
            console.log('✅ Lista guardada en scripts/orphaned-uids.json');

        } else {
            console.log('✅ No hay perfiles huérfanos. Todo está sincronizado correctamente.');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

// Run
findOrphanedProfiles()
    .then(() => {
        console.log('\n✅ Análisis completado');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Error fatal:', error);
        process.exit(1);
    });
