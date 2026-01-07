/**
 * Configurar custom claims para un usuario
 */

const admin = require('firebase-admin');

admin.initializeApp({
    projectId: 'tucitasegura-129cc'
});

const auth = admin.auth();
const db = admin.firestore();

async function setCustomClaims() {
    const uid = 'Y1rNgj4KYpWSFlPqgrpAaGuAk033';

    console.log(`🔧 Configurando custom claims para: ${uid}\n`);

    try {
        // 1. Obtener datos del usuario desde Firestore
        const userDoc = await db.collection('users').doc(uid).get();

        if (!userDoc.exists) {
            console.log('❌ Usuario no existe en Firestore');
            process.exit(1);
        }

        const userData = userDoc.data();
        console.log(`👤 Usuario: ${userData.alias}`);
        console.log(`⚧ Gender: ${userData.gender}`);
        console.log(`🎭 Role: ${userData.userRole}\n`);

        // 2. Configurar custom claims
        const customClaims = {
            role: userData.userRole || 'regular',
            gender: userData.gender,
            hasActiveSubscription: userData.hasActiveSubscription || false,
            hasAntiGhostingInsurance: userData.hasAntiGhostingInsurance || false
        };

        console.log('🔑 Custom claims a configurar:');
        console.log(JSON.stringify(customClaims, null, 2));
        console.log();

        await auth.setCustomUserClaims(uid, customClaims);

        console.log('✅ Custom claims configurados correctamente!\n');
        console.log('⚠️  IMPORTANTE: El usuario debe hacer logout/login o esperar 1 hora');
        console.log('    para que los nuevos claims se apliquen.\n');
        console.log('💡 Solución rápida: Cerrar sesión y volver a iniciar');

    } catch (error) {
        console.error('❌ Error:', error);
    }

    process.exit(0);
}

setCustomClaims();
