#!/usr/bin/env node
/**
 * Script para crear múltiples usuarios administradores en batch
 *
 * Uso:
 *   node scripts/create-admins-batch.js
 */

const { createAdminUser, admin } = require('./create-admin.js');

/**
 * Lista de admins a crear
 */
const ADMINS_TO_CREATE = [
  {
    email: 'cesar.herrera.rojo@gmail.com',
    gender: 'masculino',
    password: 'cesar123456' // Password temporal - cambiar después del primer login
  },
  {
    email: 'gonzalo.hrrj@gmail.com',
    gender: 'masculino',
    password: 'cesar123456' // Password temporal - cambiar después del primer login
  },
  {
    email: 'lacasitadebarajas@gmail.com',
    gender: 'femenino',
    password: 'cesar123456' // Password temporal - cambiar después del primer login
  }
];

/**
 * Crear todos los admins en la lista
 */
async function createAllAdmins() {
  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log('  Creación de Administradores en Batch');
  console.log('  TuCitaSegura');
  console.log('═══════════════════════════════════════════════════');
  console.log('');
  console.log(`📋 Total de administradores a crear: ${ADMINS_TO_CREATE.length}`);
  console.log('');

  const results = {
    success: [],
    errors: [],
    skipped: []
  };

  for (let i = 0; i < ADMINS_TO_CREATE.length; i++) {
    const adminData = ADMINS_TO_CREATE[i];

    console.log(`\n[${ i + 1}/${ADMINS_TO_CREATE.length}] Procesando: ${adminData.email}`);
    console.log('─'.repeat(50));

    try {
      const result = await createAdminUser(adminData.email, adminData.password, adminData.gender);
      results.success.push({
        email: adminData.email,
        uid: result.uid
      });
    } catch (error) {
      if (error.code === 'auth/email-already-exists') {
        console.log('⚠️  Usuario ya existe, actualizando claims...');
        try {
          // Intentar actualizar claims del usuario existente
          const user = await admin.auth().getUserByEmail(adminData.email);
          await admin.auth().setCustomUserClaims(user.uid, {
            role: 'admin',
            gender: adminData.gender
          });
          await admin.firestore().collection('usuarios').doc(user.uid).update({
            userRole: 'admin',
            gender: adminData.gender,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          results.skipped.push({
            email: adminData.email,
            reason: 'Ya existía, claims actualizados'
          });
          console.log('✓ Claims actualizados exitosamente');
        } catch (updateError) {
          results.errors.push({
            email: adminData.email,
            error: updateError.message
          });
        }
      } else {
        results.errors.push({
          email: adminData.email,
          error: error.message
        });
        console.error(`❌ Error: ${error.message}`);
      }
    }

    // Pequeña pausa entre creaciones
    if (i < ADMINS_TO_CREATE.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Resumen final
  console.log('');
  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log('  RESUMEN DE CREACIÓN DE ADMINISTRADORES');
  console.log('═══════════════════════════════════════════════════');
  console.log('');

  if (results.success.length > 0) {
    console.log(`✅ Creados exitosamente (${results.success.length}):`);
    results.success.forEach(adminInfo => {
      console.log(`   ✓ ${adminInfo.email}`);
      console.log(`     UID: ${adminInfo.uid}`);
    });
    console.log('');
  }

  if (results.skipped.length > 0) {
    console.log(`⚠️  Ya existían - Claims actualizados (${results.skipped.length}):`);
    results.skipped.forEach(adminInfo => {
      console.log(`   • ${adminInfo.email}`);
      console.log(`     ${adminInfo.reason}`);
    });
    console.log('');
  }

  if (results.errors.length > 0) {
    console.log(`❌ Errores (${results.errors.length}):`);
    results.errors.forEach(adminInfo => {
      console.log(`   ✗ ${adminInfo.email}`);
      console.log(`     Error: ${adminInfo.error}`);
    });
    console.log('');
  }

  console.log('═══════════════════════════════════════════════════');
  console.log('');
  console.log('📝 PASOS SIGUIENTES:');
  console.log('');
  console.log('1. Los usuarios pueden iniciar sesión en:');
  console.log('   https://tucitasegura.com/webapp/login.html');
  console.log('');
  console.log('2. Si no especificaste password, deben usar "Olvidé mi contraseña"');
  console.log('   para establecer su password inicial');
  console.log('');
  console.log('3. Verificar permisos de admin en la consola del navegador:');
  console.log('   const token = await firebase.auth().currentUser.getIdTokenResult();');
  console.log('   console.log(token.claims.role); // Debe mostrar: "admin"');
  console.log('');

  return results;
}

// Ejecutar
if (require.main === module) {
  createAllAdmins()
    .then(results => {
      const total = results.success.length + results.skipped.length + results.errors.length;
      const successful = results.success.length + results.skipped.length;

      if (results.errors.length === 0) {
        console.log(`🎉 Proceso completado: ${successful}/${total} administradores listos`);
        process.exit(0);
      } else {
        console.log(`⚠️  Proceso completado con errores: ${successful}/${total} exitosos`);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('');
      console.error('❌ ERROR FATAL:');
      console.error(error);
      process.exit(1);
    });
}

module.exports = { createAllAdmins, ADMINS_TO_CREATE };
