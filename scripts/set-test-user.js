const admin = require('firebase-admin');

// Initialize Firebase Admin with Default Credentials (requires 'gcloud auth application-default login')
if (!admin.apps.length) {
    try {
        admin.initializeApp();
        console.log('✅ Firebase Admin inicializado con Credenciales por Defecto.');
    } catch (e) {
        console.error('❌ Error inicializando Firebase Admin:', e.message);
        console.log('💡 TIP: Ejecuta "gcloud auth application-default login" si falla la autenticación.');
    }
}

const email = process.argv[2];

if (!email) {
    console.error('❌ Error: Por favor proporciona el email del usuario.');
    console.error('Uso: node scripts/set-test-user.js usuario@ejemplo.com');
    process.exit(1);
}

async function setTestUserClaims(email) {
    try {
        const user = await admin.auth().getUserByEmail(email);

        // Set verify email and premium claims
        await admin.auth().setCustomUserClaims(user.uid, {
            ...user.customClaims,
            email_verified: true,
            hasActiveSubscription: true,
            plan: 'premium', // Opcional, para UI
            gender: 'male'   // Asumimos hombre para test de pago, si es mujer igual funciona
        });

        // Force verify email flag in Auth User record as well
        await admin.auth().updateUser(user.uid, {
            emailVerified: true
        });

        console.log(`✅ ÉXITO: Usuario ${email} actualizado.`);
        console.log('   - Email Verificado: TRUE');
        console.log('   - Membresía Activa: TRUE');
        console.log('   - Plan: Premium');
        console.log('\n👉 Pide al usuario que haga LOGOUT y LOGIN para refrescar los permisos.');

    } catch (error) {
        console.error('❌ Error actualizando usuario:', error.message);
    }
    process.exit();
}

setTestUserClaims(email);
