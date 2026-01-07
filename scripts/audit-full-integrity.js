const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Credential Finder Logic
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
        if (credPath && fs.existsSync(credPath)) return credPath;
    }
    return null;
}

const credPath = findCredentials();
if (credPath) {
    admin.initializeApp({ credential: admin.credential.cert(require(credPath)) });
} else {
    admin.initializeApp({ projectId: "tucitasegura-129cc" });
}

const db = admin.firestore();

async function runAudit() {
    console.log('🔍 INICIANDO AUDITORÍA COMPLETA DEL SISTEMA...\n');

    try {
        const usersSnapshot = await db.collection('users').get();
        const totalUsers = usersSnapshot.size;

        const report = {
            total: totalUsers,
            byGender: { masculino: 0, femenino: 0, unspecified: 0 },
            byRole: { admin: 0, regular: 0, concierge: 0 },
            statsIntegrity: {
                resetCorrectly: 0,
                hasOldStats: 0,
                missingStats: 0
            },
            profileHealth: {
                complete: 0,
                missingAlias: 0,
                missingPhoto: 0,
                missingLocation: 0,
                zombies: 0 // No email or alias
            },
            storage: {
                hasGallery: 0,
                emptyGallery: 0
            }
        };

        usersSnapshot.forEach(doc => {
            const data = doc.data();

            // 1. Gender
            if (data.gender === 'masculino') report.byGender.masculino++;
            else if (data.gender === 'femenino') report.byGender.femenino++;
            else report.byGender.unspecified++;

            // 2. Role
            const role = data.role || data.userRole || 'regular';
            if (report.byRole[role] !== undefined) report.byRole[role]++;
            else report.byRole.regular++;

            // 3. Stats Check (Post-Reset)
            if (!data.stats) {
                report.statsIntegrity.missingStats++;
            } else {
                const s = data.stats;
                // Strict check for reset values
                if (s.completedDates === 0 && s.responseRate === 100 && s.rating === 5.0) {
                    report.statsIntegrity.resetCorrectly++;
                } else {
                    report.statsIntegrity.hasOldStats++;
                }
            }

            // 4. Profile Health
            const hasEmail = !!data.email;
            const hasAlias = !!data.alias;
            const hasPhoto = !!data.photoURL;
            const hasLocation = !!data.location;

            if (!hasEmail && !hasAlias) report.profileHealth.zombies++;
            if (!hasAlias) report.profileHealth.missingAlias++;
            if (!hasPhoto) report.profileHealth.missingPhoto++;
            if (!hasLocation) report.profileHealth.missingLocation++;

            if (hasEmail && hasAlias && hasPhoto && hasLocation) report.profileHealth.complete++;

            // 5. Gallery
            if (data.galleryPhotos && data.galleryPhotos.length > 0) report.storage.hasGallery++;
            else report.storage.emptyGallery++;
        });

        // OUTPUT REPORT
        console.log(`📊 TOTAL USUARIOS: ${report.total}`);
        console.log('='.repeat(40));

        console.log('\n👤 DISTRIBUCIÓN POR GÉNERO:');
        console.log(`   - Masculino: ${report.byGender.masculino} (${((report.byGender.masculino / totalUsers) * 100).toFixed(1)}%)`);
        console.log(`   - Femenino:  ${report.byGender.femenino}  (${((report.byGender.femenino / totalUsers) * 100).toFixed(1)}%)`);
        if (report.byGender.unspecified > 0) console.log(`   - ⚠️ Sin especificar: ${report.byGender.unspecified}`);

        console.log('\n📈 INTEGRIDAD DE ESTADÍSTICAS (Post-Reset):');
        console.log(`   - ✅ Reseteados Correctamente (0/100%/5.0★): ${report.statsIntegrity.resetCorrectly}`);
        if (report.statsIntegrity.hasOldStats > 0) console.log(`   - ⚠️ Datos Antiguos/Modificados: ${report.statsIntegrity.hasOldStats}`);
        if (report.statsIntegrity.missingStats > 0) console.log(`   - ❌ Sin Estadísticas: ${report.statsIntegrity.missingStats}`);

        console.log('\nnav❤️ SALUD DE PERFILES:');
        console.log(`   - Perfiles Completos: ${report.profileHealth.complete}`);
        console.log(`   - 📸 Sin Foto de Perfil: ${report.profileHealth.missingPhoto}`);
        console.log(`   - 🏷️ Sin Alias: ${report.profileHealth.missingAlias}`);
        console.log(`   - 📍 Sin Ubicación: ${report.profileHealth.missingLocation}`);

        if (report.profileHealth.zombies > 0) {
            console.log(`\n🧟 ZOMBIES DETECTADOS: ${report.profileHealth.zombies}`);
            console.log('   (Cuentas sin email ni alias, recomendada eliminación)');
        }

        console.log('\n🛡️ ROLES:');
        console.log(`   - Admins: ${report.byRole.admin}`);
        console.log(`   - Concierges: ${report.byRole.concierge}`);

        console.log('\n' + '='.repeat(40));
        console.log('✅ Auditoría Finalizada');
        process.exit(0);

    } catch (e) {
        console.error('Error Audit:', e);
        process.exit(1);
    }
}

runAudit();
