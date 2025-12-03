// Script one-time para actualizar custom claims de usuarios existentes
// Ejecutar: node scripts/update-existing-users.js

const admin = require('firebase-admin');

function initAdmin() {
  try {
    const json = process.env.SERVICE_ACCOUNT_JSON;
    if (json) {
      const creds = JSON.parse(json);
      admin.initializeApp({ credential: admin.credential.cert(creds) });
      console.log('✅ Firebase Admin initialized from SERVICE_ACCOUNT_JSON');
      return;
    }
  } catch (e) {
    console.warn('⚠️ Failed to parse SERVICE_ACCOUNT_JSON:', e.message);
  }

  try {
    admin.initializeApp({ credential: admin.credential.applicationDefault() });
    console.log('✅ Firebase Admin initialized with Application Default Credentials');
  } catch (e) {
    console.error('❌ Failed to initialize Firebase Admin. Set GOOGLE_APPLICATION_CREDENTIALS or SERVICE_ACCOUNT_JSON');
    process.exit(1);
  }
}

initAdmin();

const db = admin.firestore();

async function updateAllUsers() {
  console.log('🚀 Iniciando actualización de custom claims...\n');

  try {
    const usersSnapshot = await db.collection('users').get();
    console.log(`📊 Total de usuarios: ${usersSnapshot.size}\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const doc of usersSnapshot.docs) {
      const userData = doc.data();
      const userId = doc.id;

      const role = userData.userRole || 'regular';
      const gender = ['masculino', 'femenino'].includes(userData.gender)
        ? userData.gender
        : null;

      try {
        // Obtener claims actuales
        const user = await admin.auth().getUser(userId);
        const oldClaims = user.customClaims || {};

        // Solo actualizar si cambiaron
        if (oldClaims.role === role && oldClaims.gender === gender) {
          console.log(`⏭️  ${userId} (${userData.alias || userData.email}): Sin cambios`);
          continue;
        }

        // Setear nuevos claims
        await admin.auth().setCustomClaims(userId, {
          ...oldClaims,
          role: role,
          gender: gender
        });

        console.log(`✅ ${userId} (${userData.alias || userData.email}): role=${role}, gender=${gender}`);
        successCount++;
      } catch (error) {
        console.error(`❌ Error con ${userId}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📈 RESUMEN:');
    console.log(`   ✅ Exitosos: ${successCount}`);
    console.log(`   ❌ Errores: ${errorCount}`);
    console.log(`   ⏭️  Sin cambios: ${usersSnapshot.size - successCount - errorCount}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('✨ Proceso completado!');
    console.log('\n⚠️  IMPORTANTE: Los usuarios deben hacer logout/login o ejecutar:');
    console.log('   await auth.currentUser.getIdToken(true); // Forzar refresh\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  }
}

updateAllUsers();
