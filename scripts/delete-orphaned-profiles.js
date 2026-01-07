const admin = require('firebase-admin');
const fs = require('fs');

// Initialize Firebase Admin
admin.initializeApp({
    projectId: 'tucitasegura-129cc'
});

const db = admin.firestore();

async function deleteOrphanedProfiles() {
    console.log('🗑️  Eliminando perfiles huérfanos...\n');

    try {
        // Read orphaned UIDs from file
        if (!fs.existsSync('scripts/orphaned-uids.json')) {
            console.error('❌ Error: No se encontró el archivo orphaned-uids.json');
            console.error('   Ejecuta primero: node scripts/find-orphaned-profiles.js');
            process.exit(1);
        }

        const orphanedUids = JSON.parse(fs.readFileSync('scripts/orphaned-uids.json', 'utf8'));

        if (orphanedUids.length === 0) {
            console.log('✅ No hay perfiles para eliminar');
            process.exit(0);
        }

        console.log(`⚠️  Se eliminarán ${orphanedUids.length} perfiles:`);
        orphanedUids.forEach((uid, i) => console.log(`   ${i + 1}. ${uid}`));
        console.log();

        // Delete profiles in batch
        const batch = db.batch();
        let deleted = 0;

        for (const uid of orphanedUids) {
            const docRef = db.collection('users').doc(uid);
            batch.delete(docRef);
            deleted++;
        }

        await batch.commit();

        console.log(`✅ Eliminados ${deleted} perfiles huérfanos de Firestore`);

        // Clean up the JSON file
        fs.unlinkSync('scripts/orphaned-uids.json');
        console.log('🧹 Archivo temporal eliminado');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

// Run
deleteOrphanedProfiles()
    .then(() => {
        console.log('\n✅ Limpieza completada');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Error fatal:', error);
        process.exit(1);
    });
