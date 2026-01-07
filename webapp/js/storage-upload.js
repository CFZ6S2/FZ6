// Simplified photo upload directly to Firebase Storage
// Use this instead of API backend to avoid 500 errors

import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage, auth } from './firebase-config-env.js';

/**
 * Upload photo directly to Firebase Storage
 * @param {File} file - Photo file
 * @param {string} photoType - Type: 'avatar' or 'gallery_1', 'gallery_2', etc.
 * @returns {Promise<string>} - Download URL
 */
export async function uploadPhotoToStorage(file, photoType = 'avatar', overrideGender = null) {
  if (!auth.currentUser) {
    throw new Error('Usuario no autenticado');
  }

  const userId = auth.currentUser.uid;

  // Get user gender - try override first, then multiple sources
  let gender = overrideGender || 'masculino'; // use override or default

  // If no override provided, try to fetch
  if (!overrideGender) {
    try {
      // 1. Try Firestore first (more reliable, updated immediately)
      const { getDoc, doc } = await import('firebase/firestore');
      const { getDb } = await import('./firebase-config-env.js');
      const db = await getDb();
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists() && userDoc.data().gender) {
        gender = userDoc.data().gender;
        console.log('✅ Gender from Firestore:', gender);
      } else {
        // 2. Try custom claims as fallback
        const tokenResult = await auth.currentUser.getIdTokenResult();
        if (tokenResult.claims && tokenResult.claims.gender) {
          gender = tokenResult.claims.gender;
          console.log('✅ Gender from custom claims:', gender);
        } else {
          console.warn('⚠️ Gender not found, using default:', gender);
        }
      }
    } catch (e) {
      console.warn('⚠️ Could not get gender, using default:', e);
      // Continue with default gender
    }
  } else {
    console.log('✅ Using Provided Gender Override:', gender);
  }

  // Create path: /profile_photos/{gender}/{userId}/{photoType}_{timestamp}.jpg
  const timestamp = Date.now();
  const ext = file.name.split('.').pop() || 'jpg';
  const filename = `${photoType}_${timestamp}.${ext}`;
  const storagePath = `profile_photos/${gender}/${userId}/${filename}`;

  console.log(`📤 Uploading to Storage: ${storagePath}`);

  // Create storage reference
  const storageRef = ref(storage, storagePath);

  // Upload file
  try {
    const snapshot = await uploadBytes(storageRef, file);
    console.log('✅ Upload successful:', snapshot);

    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log('✅ Download URL:', downloadURL);

    return downloadURL;
  } catch (error) {
    console.error('❌ Upload error:', error);
    throw new Error(`Error al subir foto: ${error.message}`);
  }
}

/**
 * Helper to get user gender for storage path
 * @returns {Promise<string>} - 'masculino' or 'femenino'
 */
export async function getUserGender() {
  if (!auth.currentUser) {
    return 'masculino'; // default
  }

  // Try to get from custom claims first
  const tokenResult = await auth.currentUser.getIdTokenResult();
  if (tokenResult.claims.gender) {
    return tokenResult.claims.gender;
  }

  // Fallback to Firestore
  try {
    const { getDoc, doc } = await import('firebase/firestore');
    const { getDb } = await import('./firebase-config-env.js');
    const db = await getDb();
    const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
    if (userDoc.exists() && userDoc.data().gender) {
      return userDoc.data().gender;
    }
  } catch (e) {
    console.warn('Could not get gender from Firestore:', e);
  }

  return 'masculino'; // default fallback
}

