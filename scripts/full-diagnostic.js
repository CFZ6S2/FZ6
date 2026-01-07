/**
 * Test completo de acceso a Firestore
 */

const admin = require('firebase-admin');

admin.initializeApp({
    projectId: 'tucitasegura-129cc'
});

const db = admin.firestore();

async function fullDiagnostic() {
    console.log('🔍 DIAGNÓSTICO COMPLETO DE FIRESTORE\n');

    // 1. Verificar usuario específico
    const uid = 'Y1rNgj4KYpWSFlPqgrpAaGuAk033';
    console.log(`1️⃣ Verificando usuario: ${uid}`);

    try {
        const userDoc = await db.collection('users').doc(uid).get();

        if (userDoc.exists) {
            const data = userDoc.data();
            console.log('   ✅ DOCUMENTO EXISTE');
            console.log(`   📧 Email: ${data.email}`);
            console.log(`   👤 Alias: ${data.alias}`);
            console.log(`   ⚧ Gender: ${data.gender}`);
            console.log(`   🎭 Role: ${data.userRole}`);
            console.log();
        } else {
            console.log('   ❌ DOCUMENTO NO EXISTE!\n');
        }
    } catch (error) {
        console.log(`   ❌ ERROR: ${error.message}\n`);
    }

    // 2. Contar total de usuarios
    console.log('2️⃣ Contando usuarios totales...');
    try {
        const usersSnapshot = await db.collection('users').get();
        console.log(`   📊 Total usuarios en Firestore: ${usersSnapshot.size}`);

        if (usersSnapshot.size > 0) {
            console.log('   👥 Primeros 5 usuarios:');
            usersSnapshot.docs.slice(0, 5).forEach(doc => {
                const data = doc.data();
                console.log(`      - ${data.alias || data.email} (${doc.id.substring(0, 8)}...)`);
            });
        }
        console.log();
    } catch (error) {
        console.log(`   ❌ ERROR: ${error.message}\n`);
    }

    // 3. Verificar usuarios con género
    console.log('3️⃣ Verificando usuarios por género...');
    try {
        const maleQuery = await db.collection('users').where('gender', '==', 'masculino').get();
        const femaleQuery = await db.collection('users').where('gender', '==', 'femenino').get();

        console.log(`   👨 Hombres: ${maleQuery.size}`);
        console.log(`   👩 Mujeres: ${femaleQuery.size}`);
        console.log();
    } catch (error) {
        console.log(`   ❌ ERROR: ${error.message}\n`);
    }

    // 4. Verificar las reglas actuales
    console.log('4️⃣ Estado de las reglas:');
    console.log('   📜 Las reglas actuales deberían permitir:');
    console.log('      - Leer tu propio perfil: isAuthed() && userId == uid()');
    console.log('      - Ver perfiles del género opuesto (con custom claims)');
    console.log();

    process.exit(0);
}

fullDiagnostic().catch(err => {
    console.error('❌ Error fatal:', err);
    process.exit(1);
});
