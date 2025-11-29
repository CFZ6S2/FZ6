#!/usr/bin/env node
/**
 * Script para crear TODOS los administradores de TuCitaSegura de una vez
 *
 * Lista de admins a crear:
 *   1. cesar.herrera.rojo@gmail.com (masculino)
 *   2. lacasitadebarajas@gmail.com (femenino)
 *   3. gonzalo.hrrj@gmail.com (masculino)
 *
 * Uso:
 *   node scripts/create-all-admins.js
 *
 * Requisitos:
 *   - Firebase credentials configuradas (ver FIREBASE_KEY_SETUP.md)
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Colores para output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Lista de admins a crear
const ADMINS = [
  { email: 'cesar.herrera.rojo@gmail.com', gender: 'masculino' },
  { email: 'lacasitadebarajas@gmail.com', gender: 'femenino' },
  { email: 'gonzalo.hrrj@gmail.com', gender: 'masculino' }
];

// Buscar archivo de credenciales
function findCredentials() {
  const possiblePaths = [
    process.env.FIREBASE_PRIVATE_KEY_PATH,
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
    path.join(__dirname, '..', 'backend', 'firebase-credentials.json'),
    path.join(__dirname, '..', 'backend', 'serviceAccountKey.json'),
    path.join(__dirname, '..', 'firebase-credentials.json'),
    './firebase-credentials.json',
    './serviceAccountKey.json'
  ];

  for (const credPath of possiblePaths) {
    if (credPath && fs.existsSync(credPath)) {
      return credPath;
    }
  }

  return null;
}

async function createAdmin(email, gender) {
  try {
    log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'cyan');
    log(`📧 Creando: ${email}`, 'blue');
    log(`👤 Género: ${gender}`, 'blue');
    log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'cyan');

    // Buscar o crear usuario
    let user;
    let isNewUser = false;

    try {
      user = await admin.auth().getUserByEmail(email);
      log(`  ✅ Usuario encontrado: ${user.uid}`, 'green');
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        log('  ℹ️  Usuario no existe, creando...', 'yellow');

        user = await admin.auth().createUser({
          email: email,
          emailVerified: true,
          displayName: 'Administrador',
          password: `Admin${Date.now()}!`
        });

        isNewUser = true;
        log(`  ✅ Usuario creado: ${user.uid}`, 'green');
      } else {
        throw error;
      }
    }

    // Establecer custom claims
    await admin.auth().setCustomUserClaims(user.uid, {
      role: 'admin',
      gender: gender
    });
    log('  ✅ Custom claims configurados', 'green');

    // Actualizar Firestore
    const db = admin.firestore();
    const userRef = db.collection('users').doc(user.uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      await userRef.set({
        uid: user.uid,
        email: email,
        userRole: 'admin',
        gender: gender,
        alias: 'Admin',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastActivity: admin.firestore.FieldValue.serverTimestamp(),
        hasActiveSubscription: false,
        subscriptionStatus: 'none'
      });
      log('  ✅ Documento de Firestore creado', 'green');
    } else {
      await userRef.update({
        userRole: 'admin',
        gender: gender,
        lastActivity: admin.firestore.FieldValue.serverTimestamp()
      });
      log('  ✅ Documento de Firestore actualizado', 'green');
    }

    log(`✅ ÉXITO: ${email}`, 'green');

    return { success: true, email, uid: user.uid, isNewUser };

  } catch (error) {
    log(`❌ ERROR: ${email}`, 'red');
    log(`   ${error.message}`, 'red');
    return { success: false, email, error: error.message };
  }
}

async function main() {
  try {
    // Buscar credenciales
    const credPath = findCredentials();

    if (!credPath) {
      log('❌ No se encontraron las credenciales de Firebase', 'red');
      log('\nPara obtener las credenciales:', 'yellow');
      log('1. Ve a: https://console.firebase.google.com/project/tuscitasseguras-2d1a6/settings/serviceaccounts/adminsdk', 'cyan');
      log('2. Click en "Generar nueva clave privada"', 'cyan');
      log('3. Guarda el archivo como: backend/firebase-credentials.json', 'cyan');
      log('\nO establece la variable de entorno:', 'yellow');
      log('   export FIREBASE_PRIVATE_KEY_PATH=/ruta/al/archivo.json', 'cyan');
      process.exit(1);
    }

    log(`✅ Credenciales encontradas: ${credPath}`, 'green');

    // Inicializar Firebase Admin
    const serviceAccount = require(credPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });

    log('\n═══════════════════════════════════════════════════════════', 'magenta');
    log(`🚀 Creando ${ADMINS.length} cuentas de administrador...`, 'blue');
    log('═══════════════════════════════════════════════════════════', 'magenta');

    const results = [];

    // Crear cada admin
    for (const { email, gender } of ADMINS) {
      const result = await createAdmin(email, gender);
      results.push(result);

      // Pequeña pausa entre requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Resumen
    log('\n═══════════════════════════════════════════════════════════', 'magenta');
    log('📊 RESUMEN', 'blue');
    log('═══════════════════════════════════════════════════════════', 'magenta');

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    log(`✅ Exitosos: ${successful.length}/${ADMINS.length}`, 'green');

    if (failed.length > 0) {
      log(`❌ Fallidos: ${failed.length}/${ADMINS.length}`, 'red');
      log('\nEmails fallidos:', 'red');
      failed.forEach(f => log(`  - ${f.email}: ${f.error}`, 'red'));
    }

    log('\n📝 Próximos pasos:', 'yellow');
    log('1. Cada admin debe ir a la página de login', 'cyan');
    log('2. Click en "Olvidé mi contraseña"', 'cyan');
    log('3. Ingresa su email respectivo', 'cyan');
    log('4. Revisa el correo y establece una nueva contraseña', 'cyan');

    log('\n📋 Lista de admins creados:', 'cyan');
    successful.forEach(r => {
      const admin = ADMINS.find(a => a.email === r.email);
      log(`  📧 ${r.email} (${admin.gender})`, 'cyan');
    });

    if (failed.length === 0) {
      log('\n🎉 ¡Todos los administradores creados exitosamente!', 'green');
      process.exit(0);
    } else {
      process.exit(1);
    }

  } catch (error) {
    log(`\n❌ Error fatal: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// Ejecutar
log('🚀 Iniciando creación de administradores...', 'blue');
main();
