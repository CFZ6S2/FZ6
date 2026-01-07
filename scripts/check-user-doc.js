/**
 * Verificar documento específico en Firestore
 */

const admin = require('firebase-admin');

admin.initializeApp({
    projectId: 'tucitasegura-129cc'
});

const db = admin.firestore();

async function checkUserDoc() {
    const uid = 'Y1rNgj4KYpWSFlPqgrpAaGuAk033';

    console.log(`🔍 Verificando documento para UID: ${uid}\n`);

    try {
        const docRef = db.collection('users').doc(uid);
        const doc = await docRef.get();

        if (doc.exists) {
            console.log('✅ DOCUMENTO EXISTE');
            const data = doc.data();
            console.log('\n📄 Datos del documento:');
            console.log(`   Alias: ${data.alias}`);
            console.log(`   Email: ${data.email}`);
            console.log(`   Gender: ${data.gender}`);
            console.log(`   User Role: ${data.userRole}`);
            console.log(`   Created At: ${data.createdAt?.toDate()}`);
            console.log('\n🔑 Campos importantes para las reglas:');
            console.log(`   ✓ userRole existe: ${!!data.userRole}`);
            console.log(`   ✓ gender existe: ${!!data.gender}`);
            console.log(`   ✓ email existe: ${!!data.email}`);
        } else {
            console.log('❌ DOCUMENTO NO EXISTE');
            console.log('\n💡 Posibles causas:');
            console.log('   1. El documento nunca se creó durante el registro');
            console.log('   2. El UID es diferente al ID del documento');
            console.log('   3. El documento está en otra colección');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    }

    process.exit(0);
}

checkUserDoc();
