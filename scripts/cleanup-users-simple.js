/**
 * Script para listar y eliminar usuarios huérfanos de Firebase Auth
 * (usuarios que no tienen perfil en Firestore)
 * 
 * Este script usa las credenciales por defecto de Firebase CLI
 * 
 * Uso:
 * 1. Asegúrate de estar autenticado: firebase login
 * 2. node scripts/cleanup-users-simple.js
 */

const admin = require('firebase-admin');

// Inicializar con credenciales por defecto (usa las de Firebase CLI)
// O usa las variables de entorno GOOGLE_APPLICATION_CREDENTIALS
admin.initializeApp({
    projectId: 'tucitasegura-129cc'
});

const auth = admin.auth();
const db = admin.firestore();

async function main() {
    console.log('🔍 Buscando usuarios en Firebase Auth...\n');

    try {
        const listResult = await auth.listUsers(1000);
        const users = listResult.users;

        console.log(`📊 Total usuarios en Auth: ${users.length}\n`);

        const orphanedUsers = [];

        for (const user of users) {
            const userDoc = await db.collection('users').doc(user.uid).get();

            if (!userDoc.exists) {
                orphanedUsers.push(user);
                console.log(`❌ SIN PERFIL:`);
                console.log(`   Email: ${user.email || 'Sin email'}`);
                console.log(`   UID: ${user.uid}`);
                console.log(`   Creado: ${user.metadata.creationTime}`);
                console.log(`   Último login: ${user.metadata.lastSignInTime || 'Nunca'}\n`);
            }
        }

        console.log(`\n📊 RESUMEN:`);
        console.log(`   Total usuarios: ${users.length}`);
        console.log(`   Con perfil: ${users.length - orphanedUsers.length}`);
        console.log(`   Sin perfil (huérfanos): ${orphanedUsers.length}\n`);

        if (orphanedUsers.length === 0) {
            console.log('✅ No hay usuarios huérfanos.\n');
            process.exit(0);
        }

        // Mostrar comandos para eliminar manualmente
        console.log('⚠️  Para eliminar estos usuarios, ejecuta:\n');
        orphanedUsers.forEach(user => {
            console.log(`firebase auth:delete ${user.uid}  # ${user.email || 'Sin email'}`);
        });
        console.log('\n');

    } catch (error) {
        console.error('❌ Error:', error.message);

        if (error.code === 'app/invalid-credential') {
            console.log('\n💡 SOLUCIÓN:');
            console.log('Este error significa que faltan credenciales de administrador.');
            console.log('\nOPCIÓN 1 - Descargar Service Account Key:');
            console.log('1. Ve a: https://console.firebase.google.com/project/tucitasegura-129cc/settings/serviceaccounts/adminsdk');
            console.log('2. Click en "Generate new private key"');
            console.log('3. Guarda el archivo como "serviceAccountKey.json" en C:\\Users\\cesar\\FZ6\\');
            console.log('4. Vuelve a ejecutar este script\n');
            console.log('\nOPCIÓN 2 - Usar Firebase CLI (MÁS FÁCIL):');
            console.log('Lista usuarios: firebase auth:export users.json --project tucitasegura-129cc');
            console.log('Eliminar: firebase auth:delete UID_DEL_USUARIO --project tucitasegura-129cc\n');
        }

        process.exit(1);
    }
}

main();
