// Simple script to call listZombieUsers Cloud Function
const https = require('https');

const PROJECT_ID = 'tucitasegura-129cc';
const FUNCTION_URL = `https://us-central1-${PROJECT_ID}.cloudfunctions.net/listZombieUsers`;

// You'll need to get an auth token first
// Run: firebase login:ci
// Or use: gcloud auth print-identity-token

async function callZombieUsers() {
    console.log('⚠️ Esta función requiere autenticación.\n');
    console.log('Para obtener la lista, ve al Admin Panel:');
    console.log('https://tucitasegura-129cc.web.app/admin.html\n');
    console.log('O crea un botón que llame a la función desde el frontend.\n');
}

callZombieUsers();
