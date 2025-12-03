// Script para listar usuarios con membresía activa
// Ejecutar: node scripts/list-active-members.js

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

async function listActiveMembers() {
  console.log('📋 Listando usuarios con membresía activa...\n');
  try {
    const usersRef = db.collection('users');

    const byFlagSnap = await usersRef.where('hasActiveSubscription', '==', true).get();
    const byStatusSnap = await usersRef.where('subscriptionStatus', '==', 'active').get();

    const resultsMap = new Map();

    for (const doc of byFlagSnap.docs) {
      resultsMap.set(doc.id, doc.data());
    }
    for (const doc of byStatusSnap.docs) {
      if (!resultsMap.has(doc.id)) {
        resultsMap.set(doc.id, doc.data());
      }
    }

    const rows = [];
    for (const [uid, data] of resultsMap.entries()) {
      rows.push({
        uid,
        email: data.email || '',
        alias: data.alias || '',
        gender: data.gender || '',
        hasActiveSubscription: !!data.hasActiveSubscription,
        subscriptionStatus: data.subscriptionStatus || 'unknown'
      });
    }

    rows.sort((a, b) => a.alias.localeCompare(b.alias));

    if (rows.length === 0) {
      console.log('⚠️ No hay usuarios con membresía activa.');
    } else {
      console.log(`✅ Encontrados ${rows.length} usuarios con membresía activa:\n`);
      for (const r of rows) {
        console.log(`- ${r.alias || r.email} [${r.uid}] | ${r.gender} | hasActive=${r.hasActiveSubscription} | status=${r.subscriptionStatus}`);
      }
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Error listando miembros activos:', err.message);
    process.exit(1);
  }
}

listActiveMembers();
