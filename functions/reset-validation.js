const admin = require('firebase-admin');

// Initialize with application default credentials
admin.initializeApp({
    projectId: 'tucitasegura-129cc'
});

const db = admin.firestore();

async function resetValidation() {
    try {
        await db.collection('dates').doc('1Sx0lkDdd6Wsinsh6gSw').update({
            hostValidated: false,
            guestValidated: false,
            status: 'accepted',
            hostPin: admin.firestore.FieldValue.delete(),
            guestPin: admin.firestore.FieldValue.delete()
        });
        console.log('✅ Validación reseteada correctamente');
        process.exit(0);
    } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
}

resetValidation();
