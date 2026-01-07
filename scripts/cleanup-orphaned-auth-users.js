/**
 * Script para eliminar usuarios de Firebase Auth que NO tienen perfil en Firestore
 * 
 * Uso:
 * node scripts/cleanup-orphaned-auth-users.js
 */

const admin = require('firebase-admin');

// Inicializar Firebase Admin
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const auth = admin.auth();
const db = admin.firestore();

async function cleanupOrphanedUsers() {
    console.log('🔍 Buscando usuarios huérfanos (Auth sin Firestore)...\n');

    let orphanedUsers = [];
    let totalUsers = 0;
    let usersWithProfile = 0;

    try {
        // Listar TODOS los usuarios de Firebase Auth
        let listUsersResult = await auth.listUsers(1000);

        do {
            for (const userRecord of listUsersResult.users) {
                totalUsers++;

                // Verificar si existe el documento en Firestore
                const userDoc = await db.collection('users').doc(userRecord.uid).get();

                if (!userDoc.exists) {
                    // Usuario sin perfil en Firestore
                    orphanedUsers.push({
                        uid: userRecord.uid,
                        email: userRecord.email,
                        createdAt: userRecord.metadata.creationTime,
                        lastSignIn: userRecord.metadata.lastSignInTime
                    });

                    console.log(`❌ Usuario huérfano encontrado:`);
                    console.log(`   UID: ${userRecord.uid}`);
                    console.log(`   Email: ${userRecord.email}`);
                    console.log(`   Creado: ${userRecord.metadata.creationTime}`);
                    console.log(`   Último login: ${userRecord.metadata.lastSignInTime || 'Nunca'}\n`);
                } else {
                    usersWithProfile++;
                }
            }

            // Si hay más usuarios, continuar
            if (listUsersResult.pageToken) {
                listUsersResult = await auth.listUsers(1000, listUsersResult.pageToken);
            } else {
                break;
            }
        } while (listUsersResult.pageToken);

        // Resumen
        console.log('\n📊 RESUMEN:');
        console.log(`   Total usuarios en Auth: ${totalUsers}`);
        console.log(`   Con perfil en Firestore: ${usersWithProfile}`);
        console.log(`   Huérfanos (sin perfil): ${orphanedUsers.length}\n`);

        // Preguntar si quiere eliminarlos
        if (orphanedUsers.length === 0) {
            console.log('✅ No hay usuarios huérfanos para eliminar.');
            process.exit(0);
        }

        console.log('⚠️  ¿ELIMINAR ESTOS USUARIOS?\n');
        console.log('ATENCIÓN: Esta acción NO se puede deshacer.');
        console.log('Escribe "SI" para confirmar la eliminación:\n');

        // Esperar confirmación del usuario
        const readline = require('readline').createInterface({
            input: process.stdin,
            output: process.stdout
        });

        readline.question('> ', async (answer) => {
            if (answer.trim().toUpperCase() === 'SI') {
                console.log('\n🗑️  Eliminando usuarios huérfanos...\n');

                let deletedCount = 0;
                let failedCount = 0;

                for (const user of orphanedUsers) {
                    try {
                        await auth.deleteUser(user.uid);
                        console.log(`✅ Eliminado: ${user.email} (${user.uid})`);
                        deletedCount++;
                    } catch (error) {
                        console.error(`❌ Error eliminando ${user.email}:`, error.message);
                        failedCount++;
                    }
                }

                console.log(`\n✅ COMPLETADO:`);
                console.log(`   Eliminados: ${deletedCount}`);
                console.log(`   Fallidos: ${failedCount}`);
            } else {
                console.log('\n❌ Operación cancelada.');
            }

            readline.close();
            process.exit(0);
        });

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

// Ejecutar
cleanupOrphanedUsers();
