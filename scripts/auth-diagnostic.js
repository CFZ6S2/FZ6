// Quick diagnostic script to check user authentication status
// Run this in the browser console on buscar-usuarios.html

(async function diagnosticCheck() {
    console.log('🔍 Running Firebase Auth Diagnostic...');
    console.log('═'.repeat(50));

    try {
        // Get current user
        const auth = firebase.auth();
        const user = auth.currentUser;

        if (!user) {
            console.error('❌ No user logged in!');
            return;
        }

        console.log('✅ User logged in:', user.email);
        console.log('');

        // Check email verification
        console.log('📧 Email Verification Status:');
        console.log('  - Verified:', user.emailVerified ? '✅ YES' : '❌ NO');
        if (!user.emailVerified) {
            console.warn('  ⚠️ Email not verified! This will block match requests.');
            console.log('  💡 To verify: await firebase.auth().currentUser.sendEmailVerification()');
        }
        console.log('');

        // Get ID token with claims
        const tokenResult = await user.getIdTokenResult();
        const claims = tokenResult.claims;

        console.log('🎫 Custom Claims (from Firebase Auth Token):');
        console.log('  - Role:', claims.role || 'regular');
        console.log('  - Gender:', claims.gender || '❌ NOT SET');
        console.log('  - Email Verified (claim):', claims.email_verified ? '✅' : '❌');
        console.log('  - Has Membership:', claims.hasActiveSubscription ? '✅ YES' : '❌ NO');
        console.log('  - Has Insurance:', claims.hasAntiGhostingInsurance ? '✅ YES' : '❌ NO');
        console.log('');

        // Check permissions
        console.log('🔐 Permissions Analysis:');

        const isAdmin = claims.role === 'admin';
        const isMale = claims.gender === 'masculino';
        const isFemale = claims.gender === 'femenino';
        const hasMembership = claims.hasActiveSubscription === true;
        const hasInsurance = claims.hasAntiGhostingInsurance === true;

        console.log('  - Is Admin:', isAdmin ? '✅ YES (bypasses all checks)' : '❌ NO');

        if (!isAdmin) {
            const canSendMatch = user.emailVerified && (isFemale || (isMale && hasMembership));
            const canChat = canSendMatch; // Same requirements
            const canSchedule = user.emailVerified && (isFemale || (isMale && hasMembership && hasInsurance));

            console.log('  - Can Send Match:', canSendMatch ? '✅ YES' : '❌ NO');
            console.log('  - Can Chat:', canChat ? '✅ YES' : '❌ NO');
            console.log('  - Can Schedule Dates:', canSchedule ? '✅ YES' : '❌ NO');

            if (!canSendMatch) {
                console.log('');
                console.log('❌ CANNOT SEND MATCH REQUESTS');
                console.log('📋 Missing Requirements:');
                if (!user.emailVerified) {
                    console.log('  ❌ Email not verified');
                }
                if (!claims.gender) {
                    console.log('  ❌ Gender not set in custom claims');
                }
                if (isMale && !hasMembership) {
                    console.log('  ❌ Male user without active membership');
                }
            } else {
                console.log('');
                console.log('✅ USER CAN SEND MATCH REQUESTS');
            }
        }

        console.log('');
        console.log('═'.repeat(50));
        console.log('🎯 Recommendations:');

        if (!user.emailVerified) {
            console.log('  1. Verify email: await firebase.auth().currentUser.sendEmailVerification()');
        }

        if (!claims.gender || !hasMembership || !hasInsurance) {
            console.log('  2. Update custom claims using admin script:');
            console.log('     cd C:\\Users\\cesar\\FZ6');
            console.log('     node scripts/set-admin.js');
        }

        console.log('');
        console.log('✅ Diagnostic Complete!');

    } catch (error) {
        console.error('❌ Diagnostic Error:', error);
    }
})();
