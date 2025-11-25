#!/usr/bin/env node

/**
 * DELETE ALL USERS - USE WITH EXTREME CAUTION
 * This script will delete:
 * - All Firebase Auth users
 * - All Firestore user documents
 * - All profile photos from Storage
 */

const admin = require('firebase-admin');
const serviceAccount = require('../firebase-credentials.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'tuscitasseguras-2d1a6.firebasestorage.app'
});

const auth = admin.auth();
const db = admin.firestore();
const storage = admin.storage().bucket();

async function deleteAllUsers() {
  console.log('⚠️  WARNING: This will delete ALL users!');
  console.log('Starting in 5 seconds... Press Ctrl+C to cancel!');

  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log('\n🔥 Starting deletion process...\n');

  try {
    // 1. Get all Auth users
    console.log('📋 Fetching all Auth users...');
    const listUsersResult = await auth.listUsers();
    const users = listUsersResult.users;

    console.log(`Found ${users.length} users in Firebase Auth`);

    // 2. Delete each user
    for (const user of users) {
      try {
        console.log(`\n🗑️  Deleting user: ${user.email || user.uid}`);

        // Delete Firestore document
        try {
          await db.collection('users').doc(user.uid).delete();
          console.log('  ✅ Firestore document deleted');
        } catch (e) {
          console.log('  ⚠️  Firestore document not found or already deleted');
        }

        // Delete profile photos from Storage
        try {
          const prefix = `profile_photos/`;
          const [files] = await storage.getFiles({ prefix: `${prefix}${user.uid}` });

          for (const file of files) {
            await file.delete();
            console.log(`  ✅ Deleted: ${file.name}`);
          }
        } catch (e) {
          console.log('  ⚠️  Photos not found or already deleted');
        }

        // Delete Auth account
        await auth.deleteUser(user.uid);
        console.log('  ✅ Auth account deleted');

      } catch (error) {
        console.error(`  ❌ Error deleting user ${user.uid}:`, error.message);
      }
    }

    console.log('\n✅ Deletion process completed!');
    console.log(`Total users deleted: ${users.length}`);

  } catch (error) {
    console.error('❌ Fatal error:', error);
  }

  process.exit(0);
}

deleteAllUsers();
