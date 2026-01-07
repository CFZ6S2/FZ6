/**
 * Verificar qué usuarios específicos tienen perfil en Firestore
 */

const admin = require('firebase-admin');

admin.initializeApp({
    projectId: 'tucitasegura-129cc'
});

const db = admin.firestore();

// UIDs de los usuarios a verificar
const uids = [
    '1vF773vs19NvrBr7Y9h1nbOJN5h2',
    '2sKaK2gWUGNJa2Fm8h59j0xiqL33',
    'AuQaSwPp5BgdmOeeXJg0YBzh1cF2',
    'IPfwgIej73XAEvJ6SiEs1PwSdjz2',
    'KJWlWTSrJtN27nUqq7ZHxB6CVgJ3',
    'OuITu1NwfsgpGNhqGhpu19vGM4n2',
    'Tj4B6iejM2Oyh9BofJBsQ9ImWuk1',
    'Ub9L76U2ebNhMpYq7UpjI1NUx4B2',
    'Y1rNgj4KYpWSFlPqgrpAaGuAk033',
    'cUaEjMsEn6UcTXuhmSqEgE8ZLgv2',
    'cmHsYthpNhhZfHPhPpG6347ef4w2',
    'fcZP05ezwSfxDvtJECJ6cSCpmBV2',
    'fgzZITeCkcaxrXYG0KwgsDKsGMu2',
    'frefR5ZMLka3XAei5eMGWJGUJF63',
    'h32TRHIB7IftpVCHxnNSZC0y2Nf1',
    'h51WJI2tFgcTiOz6JhD6DgyM3fq2',
    'kGNeODGiqzQw54cAMOwiwCEEei72',
    'q78NS98HaAMstL1XicRltuyLpy22',
    'wjl9D7y9TLXAMQj41GqEJwULcxV2',
    'wy7uisnG1Qh6E9rINhqi6K0YXpW2',
    'xdbdkE7RlKOpHuzBAqyNhfFnSqH2'
];

async function checkProfiles() {
    console.log('🔍 Verificando perfiles en Firestore...\n');

    let withProfile = 0;
    let withoutProfile = 0;
    const orphaned = [];

    for (const uid of uids) {
        try {
            const doc = await db.collection('users').doc(uid).get();

            if (doc.exists) {
                const data = doc.data();
                console.log(`✅ ${uid} - ${data.alias || data.email || 'Sin alias'}`);
                withProfile++;
            } else {
                console.log(`❌ ${uid} - SIN PERFIL`);
                withoutProfile++;
                orphaned.push(uid);
            }
        } catch (error) {
            console.log(`⚠️  ${uid} - ERROR: ${error.message}`);
        }
    }

    console.log(`\n📊 RESUMEN:`);
    console.log(`   Total: ${uids.length}`);
    console.log(`   Con perfil: ${withProfile}`);
    console.log(`   Sin perfil: ${withoutProfile}\n`);

    if (orphaned.length > 0) {
        console.log('🗑️  Para eliminar usuarios sin perfil, ejecuta:\n');
        orphaned.forEach(uid => {
            console.log(`firebase auth:delete ${uid}`);
        });
        console.log('');
    }

    process.exit(0);
}

checkProfiles().catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
});
