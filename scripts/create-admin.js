#!/usr/bin/env node
/**
 * Script para crear usuarios administradores
 *
 * Este script usa el Firebase Admin SDK para crear usuarios con rol 'admin'
 * sin necesidad de permisos previos.
 *
 * Uso:
 *   node scripts/create-admin.js <email> [password] [gender]
 *
 * Ejemplos:
 *   node scripts/create-admin.js admin@tucitasegura.com
 *   node scripts/create-admin.js cesar.herrera.rojo@gmail.com MySecurePass123! masculino
 *   node scripts/create-admin.js admin@example.com AdminPass456! femenino
 */

const path = require('path');
const fs = require('fs');

// Intentar cargar firebase-admin desde functions/node_modules
let admin;
try {
  admin = require('firebase-admin');
} catch (e) {
  // Intentar desde functions/node_modules
  const functionsAdminPath = path.join(__dirname, '../functions/node_modules/firebase-admin');
  if (fs.existsSync(functionsAdminPath)) {
    admin = require(functionsAdminPath);
  } else {
    console.error('❌ ERROR: firebase-admin no está instalado');
    console.error('');
    console.error('Por favor instala las dependencias:');
    console.error('  cd functions && npm install && cd ..');
    console.error('');
    console.error('O instala firebase-admin globalmente:');
    console.error('  npm install -g firebase-admin');
    process.exit(1);
  }
}

// Inicializar Firebase Admin
if (!admin.apps.length) {
  try {
    // Intentar leer .firebaserc para obtener el project ID
    const firebasercPath = path.join(__dirname, '../.firebaserc');
    let projectId = 'tuscitasseguras-2d1a6'; // Default

    if (fs.existsSync(firebasercPath)) {
      const firebaserc = JSON.parse(fs.readFileSync(firebasercPath, 'utf8'));
      projectId = firebaserc.projects?.default || projectId;
    }

    admin.initializeApp({
      projectId: projectId
    });
  } catch (error) {
    // Fallback a inicialización estándar
    admin.initializeApp();
  }
}

/**
 * Crear o actualizar usuario con rol admin
 */
async function createAdminUser(email, password = null, gender = 'masculino') {
  try {
    console.log('🔧 Iniciando creación de usuario admin...');
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Password: ${password ? '****** (personalizado)' : '(auto-generado)'}`);
    console.log(`👤 Gender: ${gender}`);
    console.log('');

    let user;
    let isNew = false;

    // Verificar si el usuario ya existe
    try {
      user = await admin.auth().getUserByEmail(email);
      console.log(`✓ Usuario existente encontrado: ${user.uid}`);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        // Crear nuevo usuario
        const userRecord = {
          email,
          emailVerified: true,
          displayName: email.split('@')[0]
        };

        if (password) {
          userRecord.password = password;
        }

        user = await admin.auth().createUser(userRecord);
        console.log(`✓ Nuevo usuario creado: ${user.uid}`);
        isNew = true;
      } else {
        throw error;
      }
    }

    // Validar género
    if (!['masculino', 'femenino'].includes(gender)) {
      console.warn(`⚠️  Género inválido '${gender}', usando 'masculino' por defecto`);
      gender = 'masculino';
    }

    // Establecer custom claims (rol admin)
    await admin.auth().setCustomUserClaims(user.uid, {
      role: 'admin',
      gender: gender
    });

    console.log('✓ Custom claims establecidos:');
    console.log('  - role: admin');
    console.log(`  - gender: ${gender}`);
    console.log('');

    // Crear/actualizar documento en Firestore
    const userDocRef = admin.firestore().collection('usuarios').doc(user.uid);
    const userDoc = await userDocRef.get();

    const userData = {
      email: user.email,
      displayName: user.displayName || email.split('@')[0],
      userRole: 'admin',
      gender: gender,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    if (!userDoc.exists) {
      userData.createdAt = admin.firestore.FieldValue.serverTimestamp();
      userData.profileComplete = false;
      await userDocRef.set(userData);
      console.log('✓ Documento de usuario creado en Firestore');
    } else {
      await userDocRef.update(userData);
      console.log('✓ Documento de usuario actualizado en Firestore');
    }

    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log('✅ USUARIO ADMIN CREADO EXITOSAMENTE');
    console.log('═══════════════════════════════════════════════════');
    console.log(`📧 Email: ${user.email}`);
    console.log(`🆔 UID: ${user.uid}`);
    if (isNew && !password) {
      console.log('🔑 Password: (Enviado al email o resetear con Firebase Console)');
    }
    console.log(`👤 Rol: admin`);
    console.log(`⚧️  Género: ${gender}`);
    console.log('═══════════════════════════════════════════════════');
    console.log('');
    console.log('📝 Pasos siguientes:');
    console.log('  1. Inicia sesión en https://tucitasegura.com/webapp/login.html');
    console.log('  2. Completa tu perfil si es necesario');
    console.log('  3. Tendrás acceso completo de administrador');
    console.log('');

    return {
      uid: user.uid,
      email: user.email,
      role: 'admin',
      gender: gender
    };

  } catch (error) {
    console.error('');
    console.error('❌ ERROR al crear usuario admin:');
    console.error(error.message);
    console.error('');
    if (error.code) {
      console.error(`Código de error: ${error.code}`);
    }
    throw error;
  }
}

/**
 * Listar todos los usuarios admin
 */
async function listAdminUsers() {
  console.log('🔍 Buscando usuarios administradores...');
  console.log('');

  const admins = [];
  let nextPageToken;

  do {
    const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);

    for (const user of listUsersResult.users) {
      const claims = user.customClaims || {};
      if (claims.role === 'admin') {
        admins.push({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          gender: claims.gender,
          emailVerified: user.emailVerified
        });
      }
    }

    nextPageToken = listUsersResult.pageToken;
  } while (nextPageToken);

  console.log(`✓ Encontrados ${admins.length} administradores:`);
  console.log('');

  if (admins.length === 0) {
    console.log('  (No hay administradores aún)');
  } else {
    admins.forEach((admin, index) => {
      console.log(`${index + 1}. ${admin.email}`);
      console.log(`   UID: ${admin.uid}`);
      console.log(`   Nombre: ${admin.displayName || '(sin nombre)'}`);
      console.log(`   Género: ${admin.gender || '(no configurado)'}`);
      console.log(`   Email verificado: ${admin.emailVerified ? '✓' : '✗'}`);
      console.log('');
    });
  }

  return admins;
}

/**
 * Main
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log('  Script de Creación de Administradores');
    console.log('  TuCitaSegura - Firebase Admin Management');
    console.log('═══════════════════════════════════════════════════');
    console.log('');
    console.log('USO:');
    console.log('  node scripts/create-admin.js <email> [password] [gender]');
    console.log('  node scripts/create-admin.js --list');
    console.log('');
    console.log('EJEMPLOS:');
    console.log('  # Crear admin con password auto-generado');
    console.log('  node scripts/create-admin.js admin@tucitasegura.com');
    console.log('');
    console.log('  # Crear admin con password específico');
    console.log('  node scripts/create-admin.js admin@example.com MySecurePass123!');
    console.log('');
    console.log('  # Crear admin con password y género');
    console.log('  node scripts/create-admin.js admin@example.com MyPass123! femenino');
    console.log('');
    console.log('  # Listar todos los administradores');
    console.log('  node scripts/create-admin.js --list');
    console.log('');
    console.log('PARÁMETROS:');
    console.log('  email     Email del usuario admin (requerido)');
    console.log('  password  Password (opcional, se auto-genera si no se proporciona)');
    console.log('  gender    masculino o femenino (opcional, default: masculino)');
    console.log('');
    console.log('OPCIONES:');
    console.log('  --list    Listar todos los usuarios administradores');
    console.log('  --help    Mostrar esta ayuda');
    console.log('');
    process.exit(0);
  }

  if (args[0] === '--list') {
    await listAdminUsers();
    process.exit(0);
  }

  const email = args[0];
  const password = args[1] || null;
  const gender = args[2] || 'masculino';

  // Validar email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.error('❌ Email inválido');
    process.exit(1);
  }

  await createAdminUser(email, password, gender);
  process.exit(0);
}

// Ejecutar si es el script principal
if (require.main === module) {
  main().catch((error) => {
    console.error('Error fatal:', error);
    process.exit(1);
  });
}

module.exports = { createAdminUser, listAdminUsers };
