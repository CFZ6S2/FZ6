const fetch = require('node-fetch'); // Needs node-fetch or native fetch in Node 18+

const email = process.argv[2] || 'cesar.herrera.rojo@gmail.com';
const secret = process.argv[3] || 'CHANGE_ME_IMMEDIATELY';

const projectId = 'tucitasegura-129cc';
const url = `https://us-central1-${projectId}.cloudfunctions.net/createFirstAdmin`;

async function main() {
    console.log(`🚀 Intentando hacer admin a: ${email}`);
    console.log(`🔑 Usando secreto: ${secret.replace(/./g, '*')}`);
    console.log(`🌐 Endpoint: ${url}`);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: email,
                adminSecret: secret,
                gender: 'masculino'
            })
        });

        const contentType = response.headers.get('content-type');
        let data;
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            data = await response.text();
        }

        if (response.ok) {
            console.log('✅ EXITO:', data);
        } else {
            console.error('❌ ERROR:', response.status, data);
            if (response.status === 403) {
                console.log('\n💡 PISTA: El secreto de administrador es incorrecto.');
                console.log('   Configúralo con: firebase functions:config:set admin.bootstrap_secret="TU_SECRETO"');
                console.log('   O pásalo como segundo argumento a este script.');
            }
        }
    } catch (e) {
        console.error('❌ Exception:', e.message);
    }
}

main();
