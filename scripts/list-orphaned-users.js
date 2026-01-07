/**
 * Script simple para listar usuarios huérfanos
 * Requiere: npm install firebase-admin (en el directorio scripts/)
 */

// Primero instalar dependencias:
// cd scripts && npm init -y && npm install firebase-admin

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const auth = admin.auth();
const db = admin.firestore();

async function listOrphanedUsers() {
    console.log('🔍 Listando usuarios...\n');

    const listUsersResult = await auth.listUsers();

    for (const user of listUsersResult.users) {
        const doc = await db.collection('users').doc(user.uid).get();

        if (!doc.exists) {
            console.log(`❌ SIN PERFIL - ${user.email} (UID: ${user.uid})`);
            console.log(`   Creado: ${user.metadata.creationTime}`);
            console.log(`   Para eliminar: firebase auth:delete ${user.uid}\n`);
        }
    }

    console.log('✅ Completado');
    process.exit(0);
}

listOrphanedUsers().catch(console.error);
