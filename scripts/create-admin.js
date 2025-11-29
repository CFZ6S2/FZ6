#!/usr/bin/env node
/**
 * Script para crear cuentas de administrador en TuCitaSegura
 *
 * Uso:
 *   node scripts/create-admin.js cesar.herrera.rojo@gmail.com
 *
 * Requisitos:
 *   - Firebase credentials configuradas (ver FIREBASE_KEY_SETUP.md)
 *   - Acceso a Firebase Admin SDK
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
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

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

async function createAdminUser(email, gender = 'masculino') {
  try {
    // Validar gender
    if (!['masculino', 'femenino'].includes(gender)) {
      log(`❌ Género inválido: ${gender}`, 'red');
      log('Debe ser "masculino" o "femenino"', 'yellow');
      process.exit(1);
    }

    // Inicializar Firebase Admin
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

    log(`\n✅ Credenciales encontradas: ${credPath}`, 'green');

    const serviceAccount = require(credPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });

    log(`\n🔍 Buscando usuario: ${email}`, 'blue');
    log(`👤 Género: ${gender}`, 'blue');

    // Buscar o crear usuario
    let user;
    let isNewUser = false;

    try {
      user = await admin.auth().getUserByEmail(email);
      log(`✅ Usuario encontrado: ${user.uid}`, 'green');
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        log('ℹ️  Usuario no existe, creando nuevo usuario...', 'yellow');

        // Crear nuevo usuario
        user = await admin.auth().createUser({
          email: email,
          emailVerified: true,
          displayName: 'Administrador',
          password: `Admin${Date.now()}!` // Contraseña temporal
        });

        isNewUser = true;
        log(`✅ Usuario creado: ${user.uid}`, 'green');
      } else {
        throw error;
      }
    }

    // Establecer custom claims como admin
    log('\n🔧 Configurando rol de administrador...', 'blue');
    await admin.auth().setCustomUserClaims(user.uid, {
      role: 'admin',
      gender: gender
    });
    log('✅ Custom claims configurados', 'green');

    // Crear/actualizar documento en Firestore
    log('\n💾 Actualizando Firestore...', 'blue');
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
      log('✅ Documento de Firestore creado', 'green');
    } else {
      await userRef.update({
        userRole: 'admin',
        gender: gender,
        lastActivity: admin.firestore.FieldValue.serverTimestamp()
      });
      log('✅ Documento de Firestore actualizado', 'green');
    }

    // Resumen
    log('\n' + '='.repeat(60), 'cyan');
    log('🎉 ¡ADMINISTRADOR CREADO EXITOSAMENTE!', 'green');
    log('='.repeat(60), 'cyan');
    log(`\n📧 Email: ${email}`, 'cyan');
    log(`🆔 UID: ${user.uid}`, 'cyan');
    log(`👤 Rol: admin`, 'cyan');
    log(`⚧️ Género: ${gender}`, 'cyan');

    if (isNewUser) {
      log('\n⚠️  IMPORTANTE:', 'yellow');
      log('Este es un usuario nuevo con contraseña temporal.', 'yellow');
      log('Para iniciar sesión:', 'yellow');
      log(`1. Ve a la página de login de TuCitaSegura`, 'cyan');
      log(`2. Click en "Olvidé mi contraseña"`, 'cyan');
      log(`3. Ingresa: ${email}`, 'cyan');
      log(`4. Revisa tu correo y establece una nueva contraseña`, 'cyan');
    } else {
      log('\n✅ Usuario existente promovido a admin', 'green');
      log('Puedes iniciar sesión con tu contraseña actual', 'green');
    }

    log('\n📝 Próximos pasos:', 'yellow');
    log('1. Inicia sesión en la webapp', 'cyan');
    log('2. Verifica que tengas acceso al panel de administración', 'cyan');
    log('3. Actualiza tu perfil si es necesario', 'cyan');
    log('');

    process.exit(0);

  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');

    if (error.code === 'auth/invalid-email') {
      log('\n⚠️  El email proporcionado no es válido', 'yellow');
    } else if (error.code === 'auth/email-already-exists') {
      log('\n⚠️  El email ya existe (esto no debería pasar)', 'yellow');
    }

    console.error('\nStack trace:', error);
    process.exit(1);
  }
}

// Main
const email = process.argv[2];
const gender = process.argv[3] || 'masculino';

if (!email) {
  log('❌ Error: Debes proporcionar un email', 'red');
  log('\nUso:', 'yellow');
  log('  node scripts/create-admin.js EMAIL [GENDER]', 'cyan');
  log('\nEjemplos:', 'yellow');
  log('  node scripts/create-admin.js cesar.herrera.rojo@gmail.com', 'cyan');
  log('  node scripts/create-admin.js cesar.herrera.rojo@gmail.com masculino', 'cyan');
  log('  node scripts/create-admin.js lacasitadebarajas@gmail.com femenino', 'cyan');
  process.exit(1);
}

// Validar email básico
if (!email.includes('@') || !email.includes('.')) {
  log(`❌ Email inválido: ${email}`, 'red');
  process.exit(1);
}

log('🚀 Iniciando creación de administrador...', 'blue');
createAdminUser(email, gender);
