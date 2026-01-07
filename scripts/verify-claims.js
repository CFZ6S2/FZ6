/**
 * Verificar custom claims de un usuario
 */

const admin = require('firebase-admin');

admin.initializeApp({
    projectId: 'tucitasegura-129cc'
});

const auth = admin.auth();

async function checkClaims() {
    const uid = 'Y1rNgj4KYpWSFlPqgrpAaGuAk033';

    console.log(`🔍 Verificando custom claims para: ${uid}\n`);

    try {
        const user = await auth.getUser(uid);

        console.log(`📧 Email: ${user.email}`);
        console.log(`📅 Creado: ${user.metadata.creationTime}`);
        console.log(`🔐 Email verificado: ${user.emailVerified}\n`);

        console.log('🔑 Custom Claims:');
        if (user.customClaims && Object.keys(user.customClaims).length > 0) {
            console.log(JSON.stringify(user.customClaims, null, 2));
        } else {
            console.log('   ❌ NO HAY CUSTOM CLAIMS CONFIGURADOS');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    }

    process.exit(0);
}

checkClaims();
