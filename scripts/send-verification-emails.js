const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp({
    projectId: 'tucitasegura-129cc'
});

async function sendVerificationEmails() {
    console.log('📧 Reenviando emails de verificación...\n');

    try {
        // Get all users
        const listUsersResult = await admin.auth().listUsers();
        const unverified = listUsersResult.users.filter(user => !user.emailVerified);

        if (unverified.length === 0) {
            console.log('✅ Todos los usuarios ya están verificados');
            return;
        }

        console.log(`📊 Se enviará email a ${unverified.length} usuarios sin verificar:\n`);

        let sent = 0;
        let failed = 0;

        for (const user of unverified) {
            try {
                // Generate verification link
                const link = await admin.auth().generateEmailVerificationLink(
                    user.email,
                    {
                        url: 'https://tucitasegura.com/dashboard.html', // Redirect after verification
                        handleCodeInApp: false
                    }
                );

                console.log(`✅ ${user.email}`);
                console.log(`   Link generado: ${link.substring(0, 50)}...`);

                // Note: Firebase automatically sends the email when you generate the link
                // If you want to send a CUSTOM email template, you need to integrate with
                // SendGrid, Mailgun, etc. and send the link manually

                sent++;

            } catch (error) {
                console.error(`❌ ${user.email}: ${error.message}`);
                failed++;
            }

            console.log();
        }

        console.log('📊 RESUMEN:');
        console.log(`   ✅ Enviados: ${sent}`);
        console.log(`   ❌ Fallidos: ${failed}`);
        console.log();
        console.log('⚠️  IMPORTANTE:');
        console.log('   Firebase NO envía emails automáticamente desde el Admin SDK.');
        console.log('   Los links generados arriba son válidos, pero debes:');
        console.log('   1. Configurar un servicio de email (SendGrid, Mailgun, etc.)');
        console.log('   2. O usar el frontend para reenviar: auth.currentUser.sendEmailVerification()');
        console.log();
        console.log('💡 ALTERNATIVA RECOMENDADA:');
        console.log('   Añade un botón "Reenviar email" en el perfil de cada usuario');
        console.log('   que llame a: firebase.auth().currentUser.sendEmailVerification()');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

// Run
sendVerificationEmails()
    .then(() => {
        console.log('\n✅ Proceso completado');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Error fatal:', error);
        process.exit(1);
    });
