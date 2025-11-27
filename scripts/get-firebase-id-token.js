#!/usr/bin/env node
/**
 * Get Firebase ID Token - Exchange custom token or sign in to get ID token
 * Author: Claude
 * Date: 2025-11-27
 *
 * This script helps you get a Firebase ID token for testing the backend API.
 *
 * Usage:
 *   # Sign in with email/password
 *   node get-firebase-id-token.js --email test@example.com --password TestPassword123!
 *
 *   # Exchange custom token for ID token
 *   node get-firebase-id-token.js --custom-token <token>
 *
 *   # Interactive mode
 *   node get-firebase-id-token.js
 */

const readline = require('readline');

// Firebase config for tuscitasseguras-2d1a6
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyAgFcoHwoBpo80rlEHL2hHVZ2DqtjWXh2s",
    authDomain: "tuscitasseguras-2d1a6.firebaseapp.com",
    projectId: "tuscitasseguras-2d1a6",
};

const API_KEY = FIREBASE_CONFIG.apiKey;

/**
 * Sign in with email and password
 */
async function signInWithEmailPassword(email, password) {
    const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            email,
            password,
            returnSecureToken: true,
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Authentication failed');
    }

    const data = await response.json();
    return data;
}

/**
 * Sign in with custom token
 */
async function signInWithCustomToken(customToken) {
    const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${API_KEY}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            token: customToken,
            returnSecureToken: true,
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Token exchange failed');
    }

    const data = await response.json();
    return data;
}

/**
 * Get user info from ID token
 */
async function getUserInfo(idToken) {
    const url = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${API_KEY}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            idToken,
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to get user info');
    }

    const data = await response.json();
    return data.users[0];
}

/**
 * Decode JWT (simple base64 decode, no verification)
 */
function decodeJWT(token) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) {
            return null;
        }

        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        return payload;
    } catch (e) {
        return null;
    }
}

/**
 * Print token info
 */
function printTokenInfo(authData) {
    console.log('\n✅ Authentication successful!\n');

    // Decode token to show info
    const decoded = decodeJWT(authData.idToken);

    if (decoded) {
        console.log('📋 Token Information:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`User ID:       ${decoded.user_id || decoded.uid}`);
        console.log(`Email:         ${decoded.email || 'N/A'}`);
        console.log(`Verified:      ${decoded.email_verified ? '✅' : '❌'}`);
        console.log(`Role:          ${decoded.role || 'regular'}`);
        console.log(`Issued at:     ${new Date(decoded.iat * 1000).toISOString()}`);
        console.log(`Expires at:    ${new Date(decoded.exp * 1000).toISOString()}`);

        if (decoded.subscription_tier) {
            console.log(`Subscription:  ${decoded.subscription_tier}`);
        }

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }

    console.log('\n🎫 ID Token (copy this):');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(authData.idToken);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    console.log('\n📝 How to use this token:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('1. Copy the ID token above');
    console.log('2. Use it in your API requests:');
    console.log('');
    console.log('   curl -H "Authorization: Bearer <ID_TOKEN>" \\');
    console.log('        http://127.0.0.1:8000/api/v1/auth/status');
    console.log('');
    console.log('3. Or use the test script:');
    console.log('   ./scripts/test-backend-with-token.sh');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (authData.refreshToken) {
        console.log('\n🔄 Refresh Token (save this):');
        console.log(authData.refreshToken.substring(0, 50) + '...');
    }
}

/**
 * Interactive prompt
 */
function prompt(question) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
}

/**
 * Interactive mode
 */
async function interactiveMode() {
    console.log('🔐 Firebase ID Token Generator');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('Choose authentication method:');
    console.log('1. Email/Password');
    console.log('2. Custom Token');
    console.log('');

    const choice = await prompt('Select option (1 or 2): ');

    if (choice === '1') {
        const email = await prompt('Email: ');
        const password = await prompt('Password: ');

        console.log('\n🔄 Signing in...');
        const authData = await signInWithEmailPassword(email, password);
        printTokenInfo(authData);

    } else if (choice === '2') {
        const customToken = await prompt('Custom Token: ');

        console.log('\n🔄 Exchanging custom token for ID token...');
        const authData = await signInWithCustomToken(customToken);
        printTokenInfo(authData);

    } else {
        console.log('❌ Invalid option');
        process.exit(1);
    }
}

/**
 * Main
 */
async function main() {
    const args = process.argv.slice(2);

    try {
        // Parse command line arguments
        let email, password, customToken;

        for (let i = 0; i < args.length; i++) {
            if (args[i] === '--email' && args[i + 1]) {
                email = args[i + 1];
                i++;
            } else if (args[i] === '--password' && args[i + 1]) {
                password = args[i + 1];
                i++;
            } else if (args[i] === '--custom-token' && args[i + 1]) {
                customToken = args[i + 1];
                i++;
            } else if (args[i] === '--help' || args[i] === '-h') {
                console.log('Usage:');
                console.log('  # Email/Password:');
                console.log('  node get-firebase-id-token.js --email test@example.com --password TestPassword123!');
                console.log('');
                console.log('  # Custom Token:');
                console.log('  node get-firebase-id-token.js --custom-token <token>');
                console.log('');
                console.log('  # Interactive:');
                console.log('  node get-firebase-id-token.js');
                process.exit(0);
            }
        }

        // Decide which mode to use
        if (customToken) {
            console.log('🔄 Exchanging custom token for ID token...');
            const authData = await signInWithCustomToken(customToken);
            printTokenInfo(authData);

        } else if (email && password) {
            console.log('🔄 Signing in with email/password...');
            const authData = await signInWithEmailPassword(email, password);
            printTokenInfo(authData);

        } else {
            // Interactive mode
            await interactiveMode();
        }

    } catch (error) {
        console.error(`\n❌ Error: ${error.message}`);

        if (error.message.includes('EMAIL_NOT_FOUND')) {
            console.error('\n💡 User not found. Create one with:');
            console.error('   python3 scripts/firebase-token-builder.py create-user test@example.com');
        } else if (error.message.includes('INVALID_PASSWORD')) {
            console.error('\n💡 Invalid password. Default test password: TestPassword123!');
        } else if (error.message.includes('INVALID_CUSTOM_TOKEN')) {
            console.error('\n💡 Invalid custom token. Generate one with:');
            console.error('   python3 scripts/firebase-token-builder.py generate-token test@example.com');
        }

        process.exit(1);
    }
}

// Check Node.js version
if (!global.fetch) {
    console.error('❌ This script requires Node.js 18+ (for native fetch support)');
    console.error('   Or install node-fetch: npm install node-fetch');
    process.exit(1);
}

// Run
main();
