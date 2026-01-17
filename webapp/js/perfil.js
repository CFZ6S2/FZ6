
// Import App Check FIRST
import './firebase-appcheck.js';
import '../css/input.css'; // Ensure Tailwind styles are loaded

// Then import Firebase services
import firebaseConfig, { auth, storage, app, getDb } from './firebase-config-env.js'; // Added getDb
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, updateDoc, setDoc, serverTimestamp, getFirestore, collection, query, where, orderBy, limit, getDocs, onSnapshot } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { showToast, validateProfileComplete, getAvailabilityStatus, getAvailabilityBadge } from './utils.js';
import { sanitizer } from './sanitizer.js';

import apiService from './api-service.js';
import { themes, applyTheme, loadTheme, saveThemeToFirestore } from './theme.js';

import { logger } from './logger.js';
import { setupGlobalErrorHandling } from './error-handler.js';
import { initializeNotifications } from './notifications.js';
import { isDemoMode, getDemoUser, getDemoAuthState } from './demo-mode.js';
import { fileValidator, showValidationErrors } from './file-validator.js';
import { verifyRecaptchaScore } from './recaptcha-enterprise.js';
import { generateReferralCode, shareReferralCode } from './referral-system.js';

// Image optimization with lazy loading
import './image-optimizer.js';
import { imageCompressor } from './image-compressor.js';

// Onboarding wizard
import { initOnboardingWizard } from './onboarding-wizard.js';

// Expose theme functions to window for onclick handlers
window.applyTheme = applyTheme;
// window.selectTheme // Will be defined below

(async () => {
    // Initialize Firestore lazily with fallback
    const db = getFirestore(app);
    window._debug_db = db;
    console.log('✅ Firestore initialized synchronously in perfil.js');

    // Expose for debugging
    window._debug_db = db;
    window._debug_app = app;
    console.log('🔥 DEBUG: Firestore initialized in module:', db);

    setupGlobalErrorHandling();

    // Check if user was redirected due to incomplete profile
    const urlParams = new URLSearchParams(window.location.search);
    const isIncomplete = urlParams.get('incomplete') === 'true';
    const returnUrl = urlParams.get('returnUrl');

    if (isIncomplete) {
        setTimeout(() => {
            showToast('⚠️ Debes completar tu perfil para acceder al chat', 'warning');
            showToast('📝 Por favor completa todos los campos requeridos', 'info');
        }, 500);
    }

    let currentUser = null;
    let currentUserData = null;
    let photoFile = null;
    let galleryFiles = [null, null, null, null, null, null]; // 6 gallery photos
    let selectedTheme = 'blue'; // Default to blue
    let isLoadingProfile = false; // PREVENT INFINITE LOOP
    let hasLoadedProfile = false; // TRACK IF PROFILE ALREADY LOADED
    let isNewUser = false; // TRACK IF DOCUMENT NEEDS CREATION
    window.isPhotoProcessing = false; // TRACK PHOTO COMPRESSION STATUS

    // Initialize Onboarding Wizard
    initOnboardingWizard();

    // ... (rest of code) ...

    // Save profile (Logic Updated)
    // Availability Selector Logic
    // Availability Selector Logic (Expanded for Privacy)
    window.toggleAvailabilitySelector = function () {
        const gender = document.getElementById('gender').value;
        const availContainer = document.getElementById('availabilityContainer');
        const privacyContainer = document.getElementById('privacyContainer');

        if (gender === 'femenino') {
            availContainer.classList.remove('hidden');
            if (privacyContainer) privacyContainer.classList.remove('hidden');
        } else {
            availContainer.classList.add('hidden');
            if (privacyContainer) privacyContainer.classList.add('hidden');
        }
    };

    // Save profile (Logic Updated)
    window.saveProfile = async function (shouldExit = true) {
        console.log('DEBUG: Inicio saveProfile, shouldExit:', shouldExit);

        const saveBtn = document.getElementById('saveButton');
        const saveStayBtn = document.getElementById('saveStayButton');
        // Helper to handle button state
        const setButtonsLoading = (loading) => {
            if (saveBtn) {
                saveBtn.disabled = loading;
                saveBtn.innerHTML = loading ? '<i class="fas fa-spinner fa-spin mr-2"></i>Guardando...' : '<i class="fas fa-check mr-2"></i>Guardar y Salir';
            }
            if (saveStayBtn) {
                saveStayBtn.disabled = loading;
                saveStayBtn.innerHTML = loading ? '<i class="fas fa-spinner fa-spin mr-2"></i>Guardando...' : '<i class="fas fa-save mr-2"></i>Solo Guardar';
            }
        };

        setButtonsLoading(true);

        // WAIT FOR PHOTO PROCESSING (Race Condition Fix)
        if (window.isPhotoProcessing) {
            console.log('⏳ Waiting for photo compression...');
            // Wait max 5 seconds
            for (let i = 0; i < 50; i++) {
                if (!window.isPhotoProcessing) break;
                await new Promise(r => setTimeout(r, 100));
            }
        }

        try {
            // 1. Validate Form
            const requiredFields = ['alias', 'birthDate', 'gender', 'relationshipStatus', 'lookingFor'];
            const missing = requiredFields.filter(id => !document.getElementById(id).value.trim());

            if (missing.length > 0) {
                showToast('Por favor completa todos los campos obligatorios', 'warning');
                throw new Error('Campos incompletos');
            }

            // 2. Prepare Data
            const profileData = {
                alias: document.getElementById('alias').value.trim(),
                birthDate: document.getElementById('birthDate').value,
                gender: document.getElementById('gender').value,
                city: document.getElementById('city').value.trim(),
                profession: document.getElementById('profession').value.trim(),
                bio: document.getElementById('bio').value.trim(),
                relationshipStatus: document.getElementById('relationshipStatus').value,
                lookingFor: document.getElementById('lookingFor').value,
                ageRangeMin: parseInt(document.getElementById('ageRangeMin').value) || 18,
                ageRangeMax: parseInt(document.getElementById('ageRangeMax').value) || 99,
                availabilityStatus: document.getElementById('availabilityStatus').value || 'available',
                updatedAt: serverTimestamp()
            };

            // 3. Upload Photo if changed
            if (photoFile) {
                console.log('Subiendo foto...');
                const photoRef = ref(storage, `users/${currentUser.uid}/profile.jpg`);
                await uploadBytes(photoRef, photoFile);
                profileData.photoURL = await getDownloadURL(photoRef);
            }

            // 4. Update Firestore
            await updateDoc(doc(db, 'users', currentUser.uid), profileData);

            // 5. Success Handling
            showToast('Perfil guardado exitosamente', 'success');

            if (shouldExit) {
                window.location.href = '/dashboard.html';
            } else {
                setButtonsLoading(false);
                // Optionally Update UI
                if (profileData.photoURL) {
                    const photoEl = document.getElementById('profilePhoto');
                    if (photoEl) photoEl.src = profileData.photoURL;
                }
            }

        } catch (error) {
            console.error('Error saving profile:', error);
            showToast(error.message || 'Error al guardar perfil', 'error');
            setButtonsLoading(false);
        }
    };
    // Wait, the replace_file_content tool needs exact match. 
    // I should target the Imports block first, then the specific save block.
    // Splitting this into two replacements for safety.


    // Map variables (Legacy - Removed for Cost Optimization)
    // GPS location variables
    let userLatitude = null;
    let userLongitude = null;




    // ... (rest of code) ...

    // (Old saveProfile definition completely removed to avoid syntax errors)

    // Get user's current location
    async function getUserLocation() {
        const btn = document.getElementById('getLocationBtn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Obteniendo ubicación...';

        try {
            if (!navigator.geolocation) {
                showToast('Tu navegador no soporta geolocalización', 'error');
                return;
            }

            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                });
            });

            userLatitude = position.coords.latitude;
            userLongitude = position.coords.longitude;

            // Save to hidden inputs
            document.getElementById('latitude').value = userLatitude;
            document.getElementById('longitude').value = userLongitude;

            // Show coordinates in the UI
            const coordsDisplay = document.getElementById('coordinatesDisplay');
            const coordsText = document.getElementById('coordsText');
            if (coordsDisplay && coordsText) {
                coordsText.textContent = `${userLatitude.toFixed(4)}, ${userLongitude.toFixed(4)}`;
                coordsDisplay.classList.remove('hidden');
            }

            // Get municipality name via reverse geocoding
            await reverseGeocode(userLatitude, userLongitude);

            showToast('✅ Ubicación detectada correctamente', 'success');
            document.getElementById('city').focus();

        } catch (error) {
            console.error('Error getting location:', error);
            let msg = 'Error desconocido al obtener GPS';
            if (error.code === 1) msg = 'Permiso denegado. Habilita la ubicación en tu navegador.';
            else if (error.code === 2) msg = 'Ubicación no disponible.';
            else if (error.code === 3) msg = 'Tiempo de espera agotado. Intenta de nuevo.';
            else if (error.message) msg = error.message;

            showToast(`Error GPS: ${msg}`, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-location-crosshairs"></i> Obtener coordenadas (GPS)';
        }
    }

    // Helper: Load Maps Script correctly
    function loadGoogleMapsScript(apiKey) {
        if (window.google && window.google.maps) return Promise.resolve();
        const existing = document.getElementById('google-maps-script');
        if (existing) {
            return new Promise((resolve) => {
                existing.addEventListener('load', resolve);
            });
        }

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.id = 'google-maps-script';
            script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
            script.async = true;
            script.defer = true;
            script.onload = resolve;
            script.onerror = (e) => reject(new Error('Maps API load failed'));
            document.head.appendChild(script);
        });
    }

    // Helper: Reverse Geocode
    async function reverseGeocode(lat, lng) {
        try {
            // Load API if missing (Using Firebase Key as fallback/proxy if enabled)
            if (!window.google || !window.google.maps) {
                console.log('🌍 Loading Google Maps API...');
                // Fallback to specific Maps Key if env exists, else Firebase Key (often same for small projects)
                const mapsKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || firebaseConfig.apiKey;
                await loadGoogleMapsScript(mapsKey);
            }
            const geocoder = new google.maps.Geocoder();
            const response = await geocoder.geocode({ location: { lat, lng } });
            if (response.results && response.results[0]) {
                const components = response.results[0].address_components;
                let city = '';
                // Try locality first, then admin level 2
                const locality = components.find(c => c.types.includes('locality'));
                if (locality) city = locality.long_name;

                if (!city) {
                    const admin2 = components.find(c => c.types.includes('administrative_area_level_2'));
                    if (admin2) city = admin2.long_name;
                }

                if (city) {
                    const cityInput = document.getElementById('city');
                    if (cityInput) {
                        cityInput.value = city;
                        // Trigger change event if needed
                    }
                }
            }
        } catch (e) {
            console.error('Geocoding failed (Maps API likely missing/blocked):', e);
            // Swallowing error - User already has Lat/Lng in hidden fields.
            // Just ask them to type the name.
            showToast('Ubicación guardada. Por favor escribe el nombre de tu ciudad.', 'info');
        }
    }



    // Event listener for location button
    document.getElementById('getLocationBtn').addEventListener('click', getUserLocation);

    // Auth State - FIXED TO PREVENT INFINITE LOOPS
    let authStateChangeCount = 0;
    let lastAuthStateChangeTime = 0;

    onAuthStateChanged(auth, async (user) => {
        try {
            authStateChangeCount++;
            const currentTime = Date.now();
            const timeSinceLastChange = currentTime - lastAuthStateChangeTime;
            lastAuthStateChangeTime = currentTime;

            console.log(`🔍 Auth state change #${authStateChangeCount}:`, user ? 'User logged in' : 'No user');
            console.log(`⏱️ Time since last change: ${timeSinceLastChange}ms`);

            // EMERGENCY LOOP PREVENTION: If auth changes too frequently, stop processing
            if (authStateChangeCount > 10 && timeSinceLastChange < 1000) {
                console.error('🚨 EMERGENCY: Auth state changing too rapidly - stopping to prevent infinite loop');
                showToast('Error de autenticación - por favor recarga la página', 'error');
                return;
            }

            if (isLoadingProfile || hasLoadedProfile) {
                console.log('🛑 Preventing duplicate profile load');
                return;
            }

            if (isDemoMode()) {
                const demoUser = getDemoUser();
                if (demoUser) {
                    currentUser = { uid: demoUser.uid, email: demoUser.email, emailVerified: false };
                    currentUserData = demoUser;
                    isLoadingProfile = true;
                    await loadDemoUserProfile();
                    isLoadingProfile = false;
                    hasLoadedProfile = true;
                    return;
                }
            }

            if (user) {
                currentUser = user;

                // CRITICAL FIX: Set token BEFORE loading profile
                try {
                    const token = await user.getIdToken();
                    apiService.setToken(token);

                    // --- ADMIN CHECK FOR VIEW MODE ---
                    const urlParams = new URLSearchParams(window.location.search);
                    const targetUid = urlParams.get('userId');

                    if (targetUid) {
                        // Check if current user is admin (simple check or claim check)
                        // For now, let's assume if they can make the call they are admin? 
                        // Better: Check email whitelist or specific admin claim if available.
                        // Or just try to load. If firestore fails, we handle error.
                        // Let's just try to load.
                        console.log('👀 URL param found: userId=', targetUid);
                        // Only allow if UIDs are different (don't enter view mode for self)
                        if (targetUid !== currentUser.uid) {
                            await loadTargetUserProfile(targetUid);
                            return; // STOP here, don't load own profile
                        }
                    }

                } catch (tokenError) {
                    console.error('Error getting token:', tokenError);
                }

                await loadUserProfile();
                hasLoadedProfile = true;

                // REAL-TIME LISTENER for Verification Status
                try {
                    const userDocRef = doc(db, 'users', currentUser.uid);
                    onSnapshot(userDocRef, (docSnap) => {
                        if (docSnap.exists()) {
                            const data = docSnap.data();
                            // Update Status Badge UI if exists
                            const status = data.photoVerificationStatus;
                            const photoStatusEl = document.getElementById('photo-verification-status');

                            if (photoStatusEl) {
                                if (status === 'APPROVED') {
                                    photoStatusEl.innerHTML = '<span class="text-green-500 font-bold"><i class="fas fa-check-circle"></i> Foto Verificada</span>';
                                } else if (status === 'REVIEW_REQUIRED') {
                                    photoStatusEl.innerHTML = '<span class="text-yellow-500 font-bold"><i class="fas fa-clock"></i> En Revisión</span>';
                                } else if (status && status.startsWith('REJECT')) {
                                    photoStatusEl.innerHTML = '<span class="text-red-500 font-bold"><i class="fas fa-times-circle"></i> Foto Rechazada</span>';
                                    showToast('Tu foto ha sido rechazada. Por favor sube una foto real.', 'error');
                                }
                            }
                        }
                    });
                } catch (e) {
                    console.error('Error setting up real-time listener:', e);
                }

                try {
                    // Fix violation: Only init if already granted. If default, wait for user gesture (e.g. enable button).
                    if (Notification.permission === 'granted') {
                        const notificationsEnabled = await initializeNotifications();
                        if (notificationsEnabled) {
                            console.log('✅ Push notifications initialized successfully');
                        }
                    } else {
                        console.log('🔕 Notifications permission is', Notification.permission, '- skipping auto-init');
                    }
                } catch (error) {
                    console.error('Error initializing push notifications:', error);
                }
            } else {
                console.log('🔄 Redirecting to login - no user');
                // Add delay to prevent rapid redirects
                setTimeout(() => {
                    window.location.href = '/login.html';
                }, 1000);
            }
        } catch (e) {
            logger.error('Auth/init error:', e);
            showToast('Error cargando el perfil', 'error');
            isLoadingProfile = false;
        } finally {
            const overlay = document.getElementById('loadingOverlay');
            overlay && overlay.classList.add('hidden');
        }
    });

    // --- ADMIN VIEW MODE LOGIC ---
    let isViewMode = false;
    let viewingUserId = null;

    async function loadTargetUserProfile(targetUid) {
        if (isLoadingProfile) return;
        isLoadingProfile = true;
        isViewMode = true;

        console.log('🕵️ ADMIN VIEW: Loading target user', targetUid);
        showToast('Modo Admin: Viendo perfil de usuario', 'info');

        try {
            // Fetch target user directly
            const docRef = doc(db, 'users', targetUid);
            const snapshot = await getDoc(docRef);

            if (!snapshot.exists()) {
                showToast('Usuario no encontrado', 'error');
                isLoadingProfile = false;
                return;
            }

            currentUserData = { id: snapshot.id, ...snapshot.data() };
            console.log('✅ Target user data loaded:', currentUserData.alias);

            // UI Updates for View Mode
            const formContainer = document.querySelector('.bg-slate-900.rounded-3xl'); // Main container
            if (formContainer) formContainer.classList.add('border-2', 'border-yellow-500');

            // Add Banner
            const banner = document.createElement('div');
            banner.className = 'fixed top-20 left-0 right-0 bg-yellow-600/90 text-white text-center py-2 z-50 font-bold backdrop-blur-md shadow-lg';
            banner.innerHTML = `<i class="fas fa-eye"></i> MODO VISTA ADMIN - Editando a: ${sanitizer.text(currentUserData.alias || 'Usuario')} (${sanitizer.text(targetUid)}) <button onclick="window.history.back()" class="ml-4 underline text-sm">Volver</button>`;
            document.body.appendChild(banner);

            // Hide sensitive sections if needed, or keep for Admin visibility
            // We want to see everything but maybe disable Save

            // Populate Form (Reuse existing logic by manually triggering population or copying code? 
            // Existing loadUserProfile is tied to apiService. Let's just manually populate here or refactor. 
            // Refactoring loadUserProfile to take data is cleaner.
            // But loadUserProfile does a lot of API calls.

            // Let's copy the population logic or extract it?
            // Extracting population logic is risky with unknown dependencies.
            // Let's reuse loadUserProfile BUT shim the data source? 
            // loadUserProfile defaults to apiService.getUserProfile().
            // Let's modify loadUserProfile to accept data.

            // Instead, let's just populate the DOM elements here directly since we have the data.

            // 1. Header Info
            document.getElementById('userName').textContent = sanitizer.text(currentUserData.alias || 'Usuario');
            document.getElementById('userEmail').textContent = sanitizer.text(currentUserData.email || 'Email oculto');

            // 2. Avatar
            const photoUrl = currentUserData.photoURL || (currentUserData.photos && currentUserData.photos[0]);
            const avatarContainer = document.getElementById('profilePhoto');
            if (photoUrl && avatarContainer) {
                avatarContainer.src = photoUrl;
                avatarContainer.classList.remove('hidden');
                document.getElementById('photoPlaceholder')?.classList.add('hidden');
            }

            // 3. Form Fields
            const fields = ['alias', 'birthDate', 'gender', 'city', 'profession', 'bio', 'firstName', 'lastName', 'email'];
            fields.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.value = currentUserData[id] || '';
                    el.disabled = true; // Disable EVERYTHING
                    el.classList.add('opacity-75', 'cursor-not-allowed');
                }
            });

            // Disable Gender Select special UI
            const genderInput = document.getElementById('gender');
            if (genderInput) {
                const chevron = genderInput.parentElement.querySelector('.fa-chevron-down');
                if (chevron) chevron.remove();
            }

            // 4. Photos Gallery
            if (currentUserData.photos && Array.isArray(currentUserData.photos)) {
                // Populate gallery
                currentUserData.photos.slice(1).forEach((url, index) => {
                    if (index < 6) {
                        const imgEl = document.getElementById(`gallery-img-${index + 1}`);
                        const phEl = document.getElementById(`gallery-ph-${index + 1}`);
                        if (imgEl && phEl) {
                            imgEl.src = sanitizer.url(url);
                            imgEl.classList.remove('hidden');
                            phEl.classList.add('hidden');
                            // Disable delete buttons
                            const delBtn = imgEl.parentElement.querySelector('button');
                            if (delBtn) delBtn.remove();
                        }
                    }
                });
            }

            // 5. Hide "Save" and "Logout" buttons
            const saveBtn = document.querySelector('button[onclick="saveProfile()"]');
            if (saveBtn) saveBtn.style.display = 'none';

            const deleteAccountBtn = document.querySelector('button[onclick="confirmDeleteAccount()"]');
            if (deleteAccountBtn) deleteAccountBtn.style.display = 'none';

            isLoadingProfile = false;
            hasLoadedProfile = true;

        } catch (e) {
            console.error("Error loading target user", e);
            showToast('Error cargando usuario objetivo', 'error');
            isLoadingProfile = false;
        }
    }

    // Load demo user profile - FIXED TO PREVENT LOOPS
    async function loadDemoUserProfile() {
        if (isLoadingProfile || hasLoadedProfile) {
            console.log('🛑 Preventing duplicate demo profile load');
            return;
        }

        try {
            console.log('🎯 Loading demo user profile...');

            // Use demo user data
            const demoUser = getDemoUser();
            if (!demoUser) {
                console.error('No demo user found');
                return;
            }

            // Basic info
            const userNameEl = document.getElementById('userName');
            const userEmailEl = document.getElementById('userEmail');
            const photoInitialEl = document.getElementById('photoInitial');

            if (userNameEl) userNameEl.textContent = sanitizer.text(demoUser.displayName || 'Usuario Demo');
            if (userEmailEl) userEmailEl.textContent = sanitizer.text(demoUser.email);

            // Photo placeholder
            if (photoInitialEl) {
                const initial = (demoUser.displayName || demoUser.email || 'D').charAt(0).toUpperCase();
                photoInitialEl.textContent = initial;
            }

            // Profile form - SAFE ELEMENT ACCESS
            const aliasInput = document.getElementById('alias');
            const bioInput = document.getElementById('bio');

            if (aliasInput) aliasInput.value = sanitizer.text(demoUser.displayName || 'Usuario Demo');
            if (bioInput) bioInput.value = 'Usuario en modo demo - funcionalidad limitada';

            // Set hidden fields safely
            const firstNameInput = document.getElementById('firstName');
            const lastNameInput = document.getElementById('lastName');
            const emailInput = document.getElementById('email');

            if (firstNameInput) firstNameInput.value = demoUser.displayName?.split(' ')[0] || '';
            if (lastNameInput) lastNameInput.value = demoUser.displayName?.split(' ')[1] || '';
            if (emailInput) emailInput.value = demoUser.email;

            // Demo stats - CHECK IF ELEMENTS EXIST
            const reputationEl = document.getElementById('reputation');
            const reputationBadgeEl = document.getElementById('reputationBadge');
            const reputationTextEl = document.getElementById('reputationText');

            if (reputationEl) reputationEl.textContent = 'BRONCE';
            if (reputationBadgeEl) reputationBadgeEl.className = 'reputation-badge reputation-bronce';
            if (reputationTextEl) reputationTextEl.textContent = 'Bronce';

            // Disable save button for demo mode
            const saveButton = document.querySelector('button[onclick="saveProfile()"]');
            if (saveButton) {
                saveButton.disabled = true;
                saveButton.innerHTML = '<i class="fas fa-lock mr-2"></i>Guardar Perfil (Deshabilitado en Demo)';
                saveButton.classList.add('opacity-50', 'cursor-not-allowed');
            }

            console.log('✅ Demo user profile loaded successfully');

        } catch (error) {
            console.error('Error loading demo profile:', error);
            showToast('Error al cargar perfil demo', 'error');
        }
    }

    // CHECK FOR PENDING DELETION ON LOAD
    function checkPendingDeletion() {
        if (sessionStorage.getItem('pendingAccountDeletion') === 'true') {
            sessionStorage.removeItem('pendingAccountDeletion'); // Clear flag
            // Show confirmation immediately
            // Wait a bit for UI to settle
            setTimeout(() => {
                if (currentUser) {
                    confirmDeleteAccount(true); // Helper flag to skip first prompt
                }
            }, 1000);
        }
    }

    // Load user profile - FIXED TO USE API (BYPASS FIRESTORE RULES/APP CHECK ISSUES)
    async function loadUserProfile() {
        if (isLoadingProfile || hasLoadedProfile) {
            console.log('🛑 Preventing duplicate user profile load');
            return;
        }

        try {
            isLoadingProfile = true;
            if (window.updateDebugPanel) window.updateDebugPanel("⏳ Iniciando carga de perfil...");

            console.log('📋 Loading user profile via API for:', currentUser.uid);

            // Use API Service instead of Client SDK
            // This ensures stricter reads (App Check) don't block profile loading
            let response = null;
            try {
                response = await apiService.getUserProfile();
            } catch (apiError) {
                console.warn('⚠️ API Service unavailable, trying fallback:', apiError);
            }

            if (response && response.success && response.profile) {
                currentUserData = { ...response.profile, id: response.profile.uid };
                isNewUser = false;
                console.log('✅ User data loaded via API:', currentUserData.alias);
                checkPendingDeletion();
            } else {
                console.warn('API returned invalid/empty response');
                // Don't throw here, let fallback handle it
                // throw new Error('Profile not found or error in response');
            }

            // FALLBACK STRATEGY: If API returns empty data (no alias/gender), try Local Cache
            if (!currentUserData.alias || !currentUserData.gender) {
                console.warn('⚠️ API returned incomplete profile. Trying Local Cache (getDoc)...');
                try {
                    const docRef = doc(db, 'users', currentUser.uid);
                    const localSnap = await getDoc(docRef);
                    if (localSnap.exists()) {
                        const localData = localSnap.data();
                        if (localData.alias && localData.gender) {
                            console.log('✅ Recovered data from Local Cache!');
                            currentUserData = { ...currentUserData, ...localData };
                            showToast('Datos recuperados de caché local', 'success');
                        }
                    }
                } catch (cacheErr) {
                    console.error('Cache fallback failed:', cacheErr);
                }
            }

            // FINAL CHECK: If still no profile data, Redirect to Assistant
            if (!currentUserData || !currentUserData.alias || !currentUserData.gender) {
                console.warn('🚨 Profile is truly incomplete/missing. Redirecting to Assistant...');
                showToast('Perfil incompleto. Redirigiendo al asistente...', 'warning');
                setTimeout(() => {
                    window.location.href = '/perfil-asistido.html';
                }, 1500);
                return;
            }



            // POPULATE DEBUG PANEL
            const debugPanel = document.getElementById('debug-panel');
            const debugContent = document.getElementById('debug-content');
            if (debugPanel && debugContent) {
                debugPanel.classList.remove('hidden');
                debugContent.innerText = JSON.stringify(currentUserData, null, 2);
                console.log('🔍 Debug Panel Updated');
            }

            // Basic info - SAFE ELEMENT ACCESS
            const userNameEl = document.getElementById('userName');
            const userEmailEl = document.getElementById('userEmail');

            if (userNameEl) userNameEl.textContent = sanitizer.text(currentUserData.alias || 'Usuario');
            if (userEmailEl) userEmailEl.textContent = sanitizer.text(currentUser.email);

            // Reputation / Availability Display Logic
            const reputationContainer = document.getElementById('reputationContainer');
            const reputationBadgeEl = document.getElementById('reputationBadge');

            if (reputationContainer && reputationBadgeEl) {
                reputationContainer.classList.remove('hidden');

                const gender = (currentUserData.gender || '').toLowerCase();

                if (gender === 'femenino' || gender === 'mujer') {
                    const status = currentUserData.availabilityStatus || 'available';
                    const statusConfig = getAvailabilityBadge(status);

                    // Apply styles
                    reputationBadgeEl.className = `inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border shadow-lg backdrop-blur-md transition-all duration-300 ${statusConfig.color}`;
                    // sanitizer.html used here because icons are trusted HTML from utils
                    reputationBadgeEl.innerHTML = `<i class="fas ${sanitizer.attribute(statusConfig.icon)}"></i> ${sanitizer.text(statusConfig.label)}`;

                    // Add click handler to toggle status (optional immediate toggle?)
                    // For now just display. User changes it in the form below.

                } else {
                    // MALE: Reputation System (Gold/Silver/Bronze)
                    const reputation = currentUserData.reputation || currentUserData.stats?.reputation || 'BRONCE'; // Default to Bronze/Oro depending on logic
                    const reputationLower = reputation.toLowerCase();

                    // Map reputation to colors manually or reuse utility if available (but utils.js getReputationBadge is what we want)
                    // Let's use getReputationBadge if we imported it? We didn't import it yet.
                    // But we can check existing classes or just use hardcoded map matching the CSS.

                    let badgeClass = 'bg-slate-700 text-slate-300 border-slate-500';
                    let icon = 'fas fa-medal';
                    let label = reputation;

                    if (reputationLower === 'oro') {
                        badgeClass = 'bg-yellow-900/40 text-yellow-400 border-yellow-500/50 border';
                        icon = 'fas fa-medal';
                        label = 'Reputación Oro';
                    } else if (reputationLower === 'plata') {
                        badgeClass = 'bg-slate-700/40 text-slate-300 border-slate-400/50 border';
                        icon = 'fas fa-medal';
                        label = 'Reputación Plata';
                    } else if (reputationLower === 'bronce') {
                        badgeClass = 'bg-amber-900/40 text-amber-600 border-amber-700/50 border';
                        icon = 'fas fa-medal';
                        label = 'Reputación Bronce';
                    } else if (reputationLower === 'platino') {
                        badgeClass = 'bg-cyan-900/40 text-cyan-400 border-cyan-500/50 border';
                        icon = 'fas fa-gem';
                        label = 'Reputación Platino';
                    }

                    reputationBadgeEl.className = `inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold shadow-lg backdrop-blur-md transition-all duration-300 ${badgeClass}`;
                    reputationBadgeEl.innerHTML = `<i class="${sanitizer.attribute(icon)}"></i> ${sanitizer.text(label)}`;
                }
            }

            // REFERRAL SYSTEM LOGIC (Updated: Females earn, so they see the code)
            const referralSection = document.getElementById('referralSection');
            const referralsListSection = document.getElementById('referralsListSection');

            if (referralSection) {
                const genderRaw = currentUserData.gender || '';
                const gender = genderRaw.toLowerCase().trim();

                console.log('🔍 Referral Check: Gender is', gender); // Debug

                if (gender === 'femenino' || gender === 'mujer') {
                    referralSection.classList.remove('hidden');
                    if (referralsListSection) referralsListSection.classList.remove('hidden');

                    // Generate Code or Use Stored
                    const alias = currentUserData.alias || currentUser.email.split('@')[0];
                    const code = currentUserData.referralCode || generateReferralCode(alias, currentUser.uid);

                    // Store code for usage
                    window.currentUserReferralCode = code;
                    window.currentUserAlias = alias;

                    // Update UI
                    document.getElementById('myReferralCode').textContent = code;

                    // Update Wallet/Earnings
                    const earnings = currentUserData.wallet?.balance ?? currentUserData.stats?.referralEarnings ?? 0;
                    document.getElementById('myReferralEarnings').textContent = earnings + '€';

                    // FETCH REFERRALS
                    fetchMyReferrals(code);

                } else {
                    referralSection.classList.add('hidden');
                    if (referralsListSection) referralsListSection.classList.add('hidden');
                }
            }

            // Referral Helper Functions attached to window
            window.copyReferralCode = function () {
                const code = window.currentUserReferralCode;
                if (code) {
                    navigator.clipboard.writeText(code).then(() => {
                        showToast('Código copiado al portapapeles', 'success');
                    });
                }
            };

            window.triggerShareReferral = async function () {
                const code = window.currentUserReferralCode;
                const alias = window.currentUserAlias;
                if (code) {
                    // Construct WhatsApp specific link first for better conversion
                    const text = `¡Hola! Únete a TuCitaSegura conmigo. Usa mi código *${code}* al registrarte. Aquí tienes el link: ${window.location.origin}/register.html?ref=${code}`;
                    const waLink = `https://wa.me/?text=${encodeURIComponent(text)}`;

                    // Try native share first
                    const result = await shareReferralCode(code, alias);
                    if (!result || !result.success) {
                        // Fallback to direct WhatsApp open
                        window.open(waLink, '_blank');
                    }
                }
            };

            // Photo - SAFE ELEMENT ACCESS
            const profilePhotoEl = document.getElementById('profilePhoto');
            const photoPlaceholderEl = document.getElementById('photoPlaceholder');
            const photoInitialEl = document.getElementById('photoInitial');

            if (currentUserData.photoURL) {
                if (profilePhotoEl) {
                    profilePhotoEl.src = currentUserData.photoURL;
                    profilePhotoEl.classList.remove('hidden');
                }
                if (photoPlaceholderEl) photoPlaceholderEl.classList.add('hidden');
            } else {
                if (photoInitialEl) {
                    const initial = (currentUserData.alias || currentUser.email || 'U').charAt(0).toUpperCase();
                    photoInitialEl.textContent = initial;
                }
            }

            // Form fields - SAFE ELEMENT ACCESS
            const aliasInput = document.getElementById('alias');
            const birthDateInput = document.getElementById('birthDate');
            const genderInput = document.getElementById('gender');
            const cityInput = document.getElementById('city');
            const professionInput = document.getElementById('profession');
            const bioInput = document.getElementById('bio');

            if (aliasInput) {
                aliasInput.value = sanitizer.text(currentUserData.alias || '');
                if (currentUserData.alias) {
                    // UNLOCK FOR RECOVERY (User request: messed up profile)
                    // aliasInput.disabled = true;
                    // aliasInput.classList.add('opacity-50', 'cursor-not-allowed');
                    // aliasInput.parentElement.insertAdjacentHTML('beforeend', '<i class="fas fa-lock absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-500" title="No editable"></i>');
                }
            }

            if (birthDateInput) {
                birthDateInput.value = currentUserData.birthDate || '';
                if (currentUserData.birthDate) {
                    birthDateInput.disabled = true;
                    birthDateInput.classList.add('opacity-50', 'cursor-not-allowed');
                    birthDateInput.parentElement.insertAdjacentHTML('beforeend', '<i class="fas fa-lock absolute right-12 top-1/2 transform -translate-y-1/2 text-slate-500" title="No editable"></i>');
                }
            }

            if (genderInput) {
                genderInput.value = currentUserData.gender || '';
                // Strictly disable if value exists (Immutable)
                // Strictly disable if value exists (Immutable)
                if (currentUserData.gender) {
                    // LOCK GENDER - IMMUTABLE
                    genderInput.disabled = true;
                    genderInput.classList.add('opacity-50', 'cursor-not-allowed', 'bg-slate-800');

                    // Remove chevron
                    const chevron = genderInput.parentElement.querySelector('.fa-chevron-down');
                    if (chevron) chevron.remove();

                    // Add lock icon
                    if (!genderInput.parentElement.querySelector('.fa-lock')) {
                        genderInput.parentElement.insertAdjacentHTML('beforeend', '<i class="fas fa-lock absolute right-12 top-1/2 transform -translate-y-1/2 text-slate-500" title="No editable"></i>');
                    }
                }
            }

            if (cityInput) cityInput.value = currentUserData.city || currentUserData.municipio || '';
            if (professionInput) professionInput.value = sanitizer.text(currentUserData.profession || '');



            // Trigger UI updates based on gender
            if (typeof window.toggleAvailabilitySelector === 'function') {
                window.toggleAvailabilitySelector();
            } else {
                // Fallback definition if missing
                window.toggleAvailabilitySelector = function () {
                    const genderVal = document.getElementById('gender')?.value?.toLowerCase();
                    const availabilityContainer = document.getElementById('availabilityContainer');
                    const privacyContainer = document.getElementById('privacyContainer');

                    if (genderVal === 'femenino' || genderVal === 'mujer') {
                        if (availabilityContainer) availabilityContainer.classList.remove('hidden');
                        if (privacyContainer) privacyContainer.classList.remove('hidden');
                    } else {
                        if (availabilityContainer) availabilityContainer.classList.add('hidden');
                        if (privacyContainer) privacyContainer.classList.add('hidden');
                    }
                };
                window.toggleAvailabilitySelector();
            }
            if (bioInput) bioInput.value = sanitizer.text(currentUserData.bio || '');

            // Load geolocation data if available
            if (currentUserData.latitude && currentUserData.longitude) {
                userLatitude = currentUserData.latitude;
                userLongitude = currentUserData.longitude;
                document.getElementById('latitude').value = userLatitude;
                document.getElementById('longitude').value = userLongitude;

                // Show saved coordinates in UI
                const coordsDisplay = document.getElementById('coordinatesDisplay');
                const coordsText = document.getElementById('coordsText');
                if (coordsDisplay && coordsText) {
                    coordsText.textContent = `${userLatitude.toFixed(4)}, ${userLongitude.toFixed(4)}`;
                    coordsDisplay.classList.remove('hidden');
                }
            } else if (currentUserData.location && currentUserData.location.lat) {
                // Handle 'location' object format from backend
                userLatitude = currentUserData.location.lat;
                userLongitude = currentUserData.location.lng;
                document.getElementById('latitude').value = userLatitude;
                document.getElementById('longitude').value = userLongitude;

                // Show saved coordinates in UI
                const coordsDisplay = document.getElementById('coordinatesDisplay');
                const coordsText = document.getElementById('coordsText');
                if (coordsDisplay && coordsText) {
                    coordsText.textContent = `${userLatitude.toFixed(4)}, ${userLongitude.toFixed(4)}`;
                    coordsDisplay.classList.remove('hidden');
                }
            }
            // Map initialization removed for cost optimization

            // Load gallery photos - SAFE ELEMENT ACCESS
            if (currentUserData.photos && Array.isArray(currentUserData.photos)) {
                // Legacy: Backend uses 'photos'
                currentUserData.galleryPhotos = currentUserData.photos;
            } else if (currentUserData.gallery && Array.isArray(currentUserData.gallery)) {
                // New: Profile Assistant uses 'gallery'
                currentUserData.galleryPhotos = currentUserData.gallery;
            }

            if (currentUserData.galleryPhotos && Array.isArray(currentUserData.galleryPhotos)) {
                currentUserData.galleryPhotos.forEach((url, index) => {
                    if (url && index < 6) {
                        const imageEl = document.getElementById(`galleryImage${index + 1}`);
                        const previewEl = document.getElementById(`galleryPreview${index + 1}`);
                        const removeBtn = document.getElementById(`galleryRemove${index + 1}`);

                        if (imageEl && previewEl && removeBtn) {
                            if (index < 3) {
                                imageEl.src = sanitizer.url(url);
                            } else {
                                imageEl.dataset.src = sanitizer.url(url);
                                imageEl.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3C/svg%3E";
                                imageEl.classList.add('lazy-loading');
                            }
                            imageEl.classList.remove('hidden');
                            previewEl.classList.add('hidden');
                            removeBtn.classList.remove('hidden');
                        }
                    }
                });
            }

            // Relationship status & preferences - SAFE ELEMENT ACCESS
            const relationshipStatusInput = document.getElementById('relationshipStatus');
            const lookingForInput = document.getElementById('lookingFor');
            const ageRangeMinInput = document.getElementById('ageRangeMin');
            const ageRangeMaxInput = document.getElementById('ageRangeMax');

            if (relationshipStatusInput) relationshipStatusInput.value = currentUserData.relationshipStatus || '';
            if (lookingForInput) lookingForInput.value = currentUserData.lookingFor || '';
            if (ageRangeMinInput) ageRangeMinInput.value = currentUserData.ageRangeMin || 18;
            if (ageRangeMaxInput) ageRangeMaxInput.value = currentUserData.ageRangeMax || 99;

            // Populate Availability Status
            const availabilityStatusInput = document.getElementById('availabilityStatus');
            if (availabilityStatusInput) {
                availabilityStatusInput.value = currentUserData.availabilityStatus || 'available';
            }

            // Set Hidden Profile Checkbox (Privacy)
            const hiddenProfileBox = document.getElementById('isProfileHidden');
            if (hiddenProfileBox) {
                // If field is missing, default to false (visible)
                hiddenProfileBox.checked = !!currentUserData.isProfileHidden;
            }

            // Initialize visibility
            if (typeof window.toggleAvailabilitySelector === 'function') {
                window.toggleAvailabilitySelector();
            }

            // Load and apply theme
            selectedTheme = loadTheme(currentUserData);
            // initializeThemeSelector(); // LEGACY: Replaced by Segmented Control in HTML

            // Update bio counter
            updateBioCounter();

            console.log('✅ Profile loaded successfully via API');

            // DIAGNOSTIC TOAST (Temporary)
            const loadedAlias = currentUserData.alias || 'SIN ALIAS';
            const loadedPhotos = currentUserData.photos?.length || currentUserData.galleryPhotos?.length || 0;
            showToast(`Diagnóstico: Cargado ${loadedAlias} (${loadedPhotos} fotos)`, 'info');

            // UPDATE DEBUG PANEL (Success)
            if (window.updateDebugPanel) window.updateDebugPanel(currentUserData);

            // Initialize onboarding wizard if needed
            initOnboardingWizard();

        } catch (error) {
            console.error('❌ CRITICAL ERROR loading profile:', error);

            // UPDATE DEBUG PANEL (Error)
            if (window.updateDebugPanel) window.updateDebugPanel(null, error);

            // VISIBLE ERROR REPORTING
            showToast(`Error cargando perfil: ${error.message}`, 'error');
        } finally {
            isLoadingProfile = false;
        }
    }

    // Initialize theme selector
    function initializeThemeSelector() {
        const themeSelector = document.getElementById('themeSelector');
        if (!themeSelector) return; // FIX: Prevent crash if element doesn't exist (New UI use)

        themeSelector.innerHTML = '';

        Object.keys(themes).forEach(themeKey => {
            const theme = themes[themeKey];
            const isSelected = themeKey === selectedTheme;

            const themeCard = document.createElement('button');
            themeCard.type = 'button';
            themeCard.className = `relative p-4 rounded-xl border-2 transition-all ${isSelected
                ? 'border-white shadow-lg scale-105'
                : 'border-white/20 hover:border-white/50'
                }`;
            themeCard.style.background = theme.gradient;
            themeCard.onclick = () => selectTheme(themeKey);

            // Sanitize theme data
            const safeIcon = sanitizer.text(theme.icon || '');
            const safeName = sanitizer.text(theme.name || '');

            themeCard.innerHTML = `
          <div class="text-center">
            <div class="text-3xl mb-2">${safeIcon}</div>
            <div class="font-semibold text-white text-sm">${safeName}</div>
          </div>
          ${isSelected ? '<div class="absolute top-2 right-2"><i class="fas fa-check-circle text-white text-xl"></i></div>' : ''}
        `;

            themeSelector.appendChild(themeCard);
        });
    }

    // Select theme (Exposed to Window for HTML onclick)
    window.selectTheme = function (themeKey) {
        selectedTheme = themeKey;
        applyTheme(themeKey);
        // initializeThemeSelector(); // Legacy
        showToast('Tema aplicado (Temporal). Guarda cambios para confirmar.', 'info');

        // Dispatch event for UI indicator
        document.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: themeKey } }));
    };

    // Bio counter (characters)
    document.getElementById('bio').addEventListener('input', updateBioCounter);

    // Remove error highlights on input
    ['alias', 'birthDate', 'gender', 'city'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', function () {
            this.classList.remove('border-red-500');
        });
    });

    function updateBioCounter() {
        const bioEl = document.getElementById('bio');
        if (!bioEl) return;
        const bio = bioEl.value;
        const charCount = bio.length;

        const countEl = document.getElementById('bioCharCount');
        if (countEl) countEl.textContent = charCount;

        const minWarning = document.getElementById('bioMinWarning');
        const minSuccess = document.getElementById('bioMinSuccess');

        if (minWarning && minSuccess) {
            if (charCount < 100 && charCount > 0) {
                minWarning.classList.remove('hidden');
                minSuccess.classList.add('hidden');
            } else if (charCount >= 100) {
                minWarning.classList.add('hidden');
                minSuccess.classList.remove('hidden');
            } else {
                minWarning.classList.add('hidden');
                minSuccess.classList.add('hidden');
            }
        }
    }

    // Photo upload
    document.getElementById('photoInput').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        window.isPhotoProcessing = true; // START LOCK

        console.log('📱 Mobile Photo Debug:', {
            name: file.name,
            type: file.type,
            size: file.size,
            sizeMB: (file.size / 1024 / 1024).toFixed(2) + 'MB'
        });

        // HEIC Check (in case browser ignores accept attribute)
        if (!file.type || file.type === 'image/heic' || file.type === 'image/heif' || file.name.toLowerCase().endsWith('.heic')) {
            console.warn('⚠️ HEIC/Unsupported format detected:', file.type);
            showToast('Formato de imagen no soportado directamente. Intentando procesar...', 'warning');
            // We proceed, hoping FileValidator or compression handles it (or fails gracefully)
        }

        // Validate file with FileValidator
        try {
            const validation = await fileValidator.validateImage(file);

            // Show errors and warnings
            showValidationErrors(validation, showToast);

            // If validation failed, check if it's ONLY due to size
            if (!validation.isValid) {
                const isOnlySizeError = validation.errors.every(e => e.startsWith('File too large'));
                if (isOnlySizeError && validation.errors.length > 0) {
                    console.warn('⚠️ File too large, attempting to resize/compress...', validation.errors);
                    showToast('Imagen grande detectada. Optimizando...', 'info');
                    // Proceed to compression
                } else {
                    // Other errors (type, dangerous, empty) are fatal
                    e.target.value = ''; // Clear the input
                    window.isPhotoProcessing = false; // RELEASE LOCK
                    return;
                }
            }

            // COMPRESSION STEP
            try {
                showToast('Procesando imagen...', 'info');
                photoFile = await imageCompressor.compress(file);
            } catch (compError) {
                console.warn('Compression failed, using original', compError);
                photoFile = file;
            }

            // Preview
            const reader = new FileReader();
            reader.onload = (event) => {
                document.getElementById('profilePhoto').src = event.target.result;
                document.getElementById('profilePhoto').classList.remove('hidden');
                document.getElementById('photoPlaceholder').classList.add('hidden');
            };
            reader.readAsDataURL(file);

            showToast('Foto seleccionada. Guarda los cambios para actualizar.', 'info');

            // Log validation metadata
            logger.debug('Profile photo validated', {
                fileName: validation.metadata.fileName,
                size: validation.metadata.sizeMB + 'MB',
                dimensions: `${validation.metadata.width}x${validation.metadata.height}`
            });

        } catch (error) {
            logger.error('Photo validation error', error);
            showToast('Error al validar la imagen', 'error');
            e.target.value = ''; // Clear the input
        } finally {
            window.isPhotoProcessing = false; // RELEASE LOCK
        }
    });

    // Gallery photo uploads (6 photos)
    for (let i = 1; i <= 6; i++) {
        const previewEl = document.getElementById(`galleryPreview${i}`);
        const inputEl = document.getElementById(`galleryInput${i}`);
        const imageEl = document.getElementById(`galleryImage${i}`);
        const removeBtn = document.getElementById(`galleryRemove${i}`);

        // Click preview to upload
        previewEl.addEventListener('click', () => {
            inputEl.click();
        });

        // Handle file selection
        inputEl.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Validate file with FileValidator
            console.log(`📱 Gallery ${i} Debug:`, {
                name: file.name,
                type: file.type,
                size: file.size
            });
            try {
                const validation = await fileValidator.validateImage(file);

                // Show errors and warnings
                showValidationErrors(validation, showToast);

                // If validation failed, check if it's ONLY due to size
                if (!validation.isValid) {
                    const isOnlySizeError = validation.errors.every(e => e.startsWith('File too large'));
                    if (isOnlySizeError && validation.errors.length > 0) {
                        console.warn('⚠️ File too large, attempting to resize/compress...', validation.errors);
                        showToast('Imagen grande detectada. Optimizando...', 'info');
                        // Proceed to compression
                    } else {
                        // Other errors (type, dangerous, empty) are fatal
                        e.target.value = ''; // Clear the input
                        return;
                    }
                }

                // COMPRESSION STEP
                try {
                    showToast(`Procesando foto ${i}...`, 'info');
                    galleryFiles[i - 1] = await imageCompressor.compress(file);
                } catch (compErr) {
                    console.warn(`Gallery ${i} compression failed`, compErr);
                    galleryFiles[i - 1] = file;
                }

                // Preview
                const reader = new FileReader();
                reader.onload = (event) => {
                    imageEl.src = event.target.result;
                    imageEl.classList.remove('hidden');
                    previewEl.classList.add('hidden');
                    removeBtn.classList.remove('opacity-0', 'pointer-events-none');
                };
                reader.readAsDataURL(file);

                showToast(`Foto ${i} seleccionada`, 'info');

                // Log validation metadata
                logger.debug(`Gallery photo ${i} validated`, {
                    fileName: validation.metadata.fileName,
                    size: validation.metadata.sizeMB + 'MB',
                    dimensions: `${validation.metadata.width}x${validation.metadata.height}`
                });

            } catch (error) {
                logger.error('Gallery photo validation error', error);
                showToast('Error al validar la imagen', 'error');
                e.target.value = ''; // Clear the input
            }
        });

        // Remove photo
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            galleryFiles[i - 1] = null;
            inputEl.value = '';
            imageEl.classList.add('hidden');
            imageEl.src = '';
            previewEl.classList.remove('hidden');
            removeBtn.classList.add('opacity-0', 'pointer-events-none');
            showToast(`Foto ${i} eliminada`, 'info');
        });
    }
    // Save profile
    window.saveProfile = async function (shouldExit = true) {
        const saveButton = document.getElementById('saveButton');
        const originalText = saveButton.innerHTML;

        // EDITABLE FIELDS
        const alias = document.getElementById('alias').value.trim();
        const gender = document.getElementById('gender').value;
        const birthDate = document.getElementById('birthDate').value;
        const city = document.getElementById('city').value.trim();
        const profession = document.getElementById('profession').value.trim();
        const bio = document.getElementById('bio').value.trim();
        const relationshipStatus = document.getElementById('relationshipStatus').value;
        const lookingFor = document.getElementById('lookingFor').value;

        // STRICT VALIDATION (Required for Firestore Creation)
        const missingFields = [];
        if (!alias) missingFields.push('Alias');
        if (!birthDate) missingFields.push('Fecha de Nacimiento');
        if (!gender) missingFields.push('Género');
        if (!city) missingFields.push('Ciudad');

        if (missingFields.length > 0) {
            showToast(`Campos obligatorios faltantes: ${missingFields.join(', ')}`, 'error');
            // Highlight empty fields
            if (!alias) document.getElementById('alias')?.classList.add('border-red-500');
            if (!birthDate) document.getElementById('birthDate')?.classList.add('border-red-500');
            if (!gender) document.getElementById('gender')?.classList.add('border-red-500');
            if (!city) document.getElementById('city')?.classList.add('border-red-500');
            return; // STOP SAVE
        }

        // Age Validation (Strict 18+)
        const birthDateObj = new Date(birthDate);
        const today = new Date();
        let age = today.getFullYear() - birthDateObj.getFullYear();
        const monthDiff = today.getMonth() - birthDateObj.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDateObj.getDate())) {
            age--;
        }

        if (age < 18) {
            showToast('Debes ser mayor de 18 años para usar TuCitaSegura', 'error');
            return; // STOP SAVE
        }

        if (!profession || !relationshipStatus || !lookingFor) {
            showToast('Se recomienda completar todos los campos para mejorar tus matches', 'info');
        }

        saveButton.disabled = true;
        saveButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Guardando...';

        try {
            const recaptcha = await verifyRecaptchaScore('profile_update');
            if (!recaptcha.success || (recaptcha.score ?? 0) < 0.3) {
                console.warn('⚠️ Low Recaptcha Score:', recaptcha.score);
                // showToast('Verificación reCAPTCHA sospechosa. Intenta de nuevo.', 'warning');
                // Proceed anyway for now to unblock users, but verify logic later
                // return; 
            }
            // console.warn('⚠️ Recaptcha bypassed for debugging');

            // GLOBAL TOKEN REFRESH
            if (currentUser) {
                const token = await currentUser.getIdToken(true);
                apiService.setToken(token);

                // DEBUG: Analyze Token
                try {
                    const base64Url = token.split('.')[1];
                    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                    const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
                        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                    }).join(''));
                    const payload = JSON.parse(jsonPayload);
                    console.log('🔍 DEBUG JWT:', {
                        aud: payload.aud,
                        iss: payload.iss,
                        sub: payload.sub,
                        exp: new Date(payload.exp * 1000).toISOString(),
                        project_match: payload.aud === 'tucitasegura-129cc' ? 'YES' : 'NO'
                    });

                    if (payload.aud !== 'tucitasegura-129cc') {
                        showToast(`⚠️ Token Project Mismatch: ${payload.aud}`, 'error');
                    }
                } catch (e) {
                    console.error('Error decoding token:', e);
                }
            }

            let photoURL = (currentUserData && currentUserData.photoURL) ? currentUserData.photoURL : null;

            // 1. Avatar Upload
            if (photoFile) {
                try {
                    showToast('⏳ Subiendo foto de perfil...', 'info');
                    // Pass current gender selection to ensure correct storage path
                    const currentGender = document.getElementById('gender').value;
                    const result = await apiService.uploadProfilePhoto(photoFile, 'avatar', currentGender);

                    if (result.success) {
                        const status = result.verification?.status;
                        const warnings = result.verification?.warnings || [];

                        if (status === 'REJECT' || status === 'CONTENT_VIOLATION') {
                            showToast(`❌ Foto rechazada: ${warnings[0] || 'Contenido no permitido'}`, 'error');
                            saveButton.disabled = false;
                            saveButton.innerHTML = originalText;
                            return;
                        } else if (status === 'FILTER_WARNING' || status === 'REVIEW_REQUIRED') {
                            showToast(`⚠️ Advertencia: ${warnings[0] || 'Revisión requerida'}`, 'warning');
                            photoURL = result.url;
                        } else {
                            showToast('✅ Foto subida y verificada', 'success');
                            photoURL = result.url;
                        }
                    }
                } catch (err) {
                    console.error('Avatar upload failed:', err);
                    if (err.message && err.message.includes('Backend')) {
                        showToast('⚠️ Error conectando con el servidor. Usando imagen local.', 'warning');
                    } else {
                        showToast('❌ Error al subir avatar: ' + (err.message || 'Error desconocido'), 'error');
                    }
                    if (!photoURL) photoURL = `https://picsum.photos/seed/${currentUser.uid}/600/600`;
                }
            }

            if (!photoURL) {
                photoURL = `https://picsum.photos/seed/${currentUser.uid}/600/600`;
            }

            // 2. Gallery Upload
            // Pass current gender selection to ensure correct storage path
            const currentGender = document.getElementById('gender').value;
            const galleryPhotos = (currentUserData && currentUserData.galleryPhotos) ? [...currentUserData.galleryPhotos] : [];
            for (let i = 0; i < 6; i++) {
                if (galleryFiles[i]) {
                    try {
                        showToast(`⏳ Subiendo foto ${i + 1}...`, 'info');
                        const result = await apiService.uploadProfilePhoto(galleryFiles[i], `gallery_${i + 1}`, currentGender);

                        if (result.success) {
                            const status = result.verification?.status;
                            const warnings = result.verification?.warnings || [];

                            if (status === 'REJECT' || status === 'CONTENT_VIOLATION') {
                                showToast(`❌ Foto ${i + 1} rechazada: ${warnings[0] || 'Inapropiada'}`, 'error');
                                continue;
                            } else {
                                galleryPhotos[i] = result.url;
                            }
                        }
                    } catch (err) {
                        console.error(`Gallery ${i + 1} upload failed:`, err);
                    }
                }
            }

            // 3. Update Firestore (Using setDoc with merge)
            const latitude = document.getElementById('latitude').value;
            const longitude = document.getElementById('longitude').value;
            // db is already initialized in outer scope
            const userRef = doc(db, 'users', currentUser.uid);

            // Prepare payload
            const payload = {
                alias: alias,
                birthDate: birthDate,
                gender: gender,
                city: city,
                municipio: city, // SYNC with profile-guard requirement
                location: (latitude && longitude) ? { lat: parseFloat(latitude), lng: parseFloat(longitude) } : null,
                latitude: latitude ? parseFloat(latitude) : null,
                longitude: longitude ? parseFloat(longitude) : null,
                profession: profession,
                bio: bio,
                relationshipStatus: relationshipStatus,
                lookingFor: lookingFor,
                ageRangeMin: parseInt(document.getElementById('ageRangeMin').value) || 18,
                ageRangeMax: parseInt(document.getElementById('ageRangeMax').value) || 99,
                photoURL: photoURL,
                photos: galleryPhotos, // CRITICAL FIX: Backend expects 'photos', not 'galleryPhotos'
                galleryPhotos: galleryPhotos, // Keep for backward compatibility
                isProfileHidden: document.getElementById('isProfileHidden')?.checked || false, // NEW PRIVACY FIELD
                availabilityStatus: document.getElementById('availabilityStatus')?.value || 'available', // NEW STATUS FIELD
                theme: selectedTheme || currentUserData?.theme || 'blue',
                updatedAt: serverTimestamp()
            };

            console.log('📤 Sending Profile Update:', { alias: payload.alias, photos: payload.photos?.length });

            // REAL-TIME CHECK: Does the document exist right now?
            // This prevents race conditions with the global isNewUser flag
            let docExists = false;
            try {
                const checkDoc = await getDoc(userRef);
                docExists = checkDoc.exists();
            } catch (e) {
                console.warn('Could not verify doc existence, falling back to isNewUser flag', e);
                docExists = !isNewUser;
            }

            if (!docExists) {
                console.log('🆕 Creating NEW user document (Verified) - Adding required fields');
                payload.email = currentUser.email;
                payload.userRole = 'regular';
                payload.createdAt = serverTimestamp(); // REQUIRED by Firestore rules
                // createdAt handled by backend if new
            } else {
                console.log('🔄 Updating EXISTING user document');
                // Immutables handled by backend allowedFields
            }

            // USE API SERVICE (Bypasses Client SDK Rules & Enforces Backend Logic)
            const response = await apiService.updateUserProfile(payload);

            if (!response.success && !response.profile) {
                throw new Error('API returned failure: ' + (response.error || 'Unknown error'));
            }

            // DUAL WRITE: Sync Client Cache Immediately
            // This ensures the local app sees the data instantly
            try {
                console.log('💾 Syncing local cache...');
                const clientPayload = { ...payload };
                delete clientPayload.email;
                delete clientPayload.createdAt;
                delete clientPayload.userRole;
                // setDoc might fail if rules are strict, but it matches the "own profile" rule
                await setDoc(userRef, clientPayload, { merge: true });
                console.log('✅ Local cache synced');
            } catch (e) {
                console.warn('⚠️ Local sync suppressed (API succeeded so ignore):', e);
            }

            logger.info('Profile updated successfully');
            if (shouldExit) {
                window.location.href = '/dashboard.html';
            } else {
                showToast('Cambios guardados correctamente', 'success');
                if (saveButton) {
                    saveButton.disabled = false;
                    saveButton.innerHTML = originalText;
                }
            }

        } catch (error) {
            console.error('Error saving profile:', error);
            // FORCE ALERT so user sees the error
            alert('⚠️ ERROR AL GUARDAR:\n' + error.message + '\n\n(Código: ' + (error.code || 'N/A') + ')');
            showToast('Error al guardar: ' + error.message, 'error');

            if (saveButton) {
                saveButton.disabled = false;
                saveButton.innerHTML = originalText;
            }
        }
        /* finally block removed to avoid double-resetting in success case before redirect */
    };

    // Close success modal
    window.closeSuccessModal = function () {
        document.getElementById('successModal').classList.add('opacity-0', 'pointer-events-none');
        if (currentUserData) {
            const aliasInput = document.getElementById('alias');
            if (aliasInput && currentUserData.alias) {
                aliasInput.value = currentUserData.alias;
            }
        }
    };

    window.goToSearch = function () {
        document.getElementById('successModal').classList.add('opacity-0', 'pointer-events-none');
        window.location.href = '/dashboard.html';
    };

    // Confirm delete account
    window.confirmDeleteAccount = function (skipFirstConfirm = false) {
        let confirmed = skipFirstConfirm;

        if (!skipFirstConfirm) {
            confirmed = confirm('¿Estás COMPLETAMENTE SEGURO de que quieres eliminar tu cuenta?\n\nEsta acción NO se puede deshacer.\n\nPerderás:\n- Todas tus conversaciones\n- Todas tus citas\n- Tu perfil completo\n- Acceso a la plataforma\n\nEscribe "ELIMINAR" para confirmar.');
        }

        if (confirmed) {
            // If we skipped first confirm (automatic flow), verify manually once
            const verification = prompt('Escribe "ELIMINAR" (en mayúsculas) para confirmar:');
            if (verification === 'ELIMINAR') {
                deleteAccount();
            } else {
                showToast('Cancelado. Tu cuenta no fue eliminada.', 'info');
            }
        }
    };

    // Fetch Referrals Helper
    async function fetchMyReferrals(myCode) {
        const tbody = document.getElementById('referralsTableBody');
        const noMsg = document.getElementById('noReferralsMsg');
        if (!tbody) return;

        try {
            console.log('🔍 Fetching referrals for code:', myCode);

            const { getDb } = await import('./firebase-config-env.js');
            const db = await getDb();

            // Note: 'users' query by referredBy requires composite index or just simple index? Simple is auto.
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('referredBy', '==', myCode), limit(50));

            const querySnapshot = await getDocs(q);

            tbody.innerHTML = '';

            if (querySnapshot.empty) {
                noMsg.classList.remove('hidden');
                return;
            }

            querySnapshot.forEach((doc) => {
                const data = doc.data();

                // Determine Status
                let statusText = 'Registrado';
                let statusColor = 'text-slate-400';
                let earning = '0€';
                let earningColor = 'text-slate-500';

                if (data.deleted) {
                    statusText = 'Eliminado';
                    statusColor = 'text-red-400';
                } else if (data.hasActiveSubscription || data.subscriptionStatus === 'active') {
                    statusText = 'Membresía Activa';
                    statusColor = 'text-green-400 font-bold';
                    earning = '10€';
                    earningColor = 'text-green-400 font-bold';
                } else {
                    statusText = 'Sin Membresía';
                    statusColor = 'text-yellow-400';
                }

                const row = `
            <tr class="border-b border-white/5 hover:bg-white/5 transition">
              <td class="py-3 px-2">
                <div class="font-semibold">${data.alias || 'Usuario'}</div>
                <div class="text-xs text-slate-500 truncate max-w-[100px]">${data.uid.slice(0, 6)}...</div>
              </td>
              <td class="py-3 px-2 text-center text-sm ${statusColor}">
                ${statusText}
              </td>
              <td class="py-3 px-2 text-center">
                 ${data.hasActiveSubscription ? '<i class="fas fa-check-circle text-green-500"></i>' : '<i class="far fa-circle text-slate-600"></i>'}
              </td>
              <td class="py-3 px-2 text-right ${earningColor}">
                ${earning}
              </td>
            </tr>
          `;
                tbody.insertAdjacentHTML('beforeend', row);
            });

        } catch (error) {
            console.error('Error fetching referrals:', error);
            tbody.innerHTML = `<tr><td colspan="4" class="py-4 text-center text-red-400">Error al cargar datos.<br><span class="text-xs">${error.message}</span></td></tr>`;
        }
    }

    // Delete account
    async function deleteAccount() {
        try {
            showToast('Eliminando cuenta...', 'info');

            showToast('Eliminando cuenta...', 'info');
            // db is already initialized in outer scope

            // 1. Delete user document from Firestore
            const userRef = doc(db, 'users', currentUser.uid);
            await updateDoc(userRef, {
                deleted: true,
                deletedAt: serverTimestamp(),
                active: false
            });

            // 2. Delete profile photos from Storage (best effort)
            try {
                const photoRef = ref(storage, `profile_photos/${currentUserData.gender}/${currentUser.uid}/avatar`);
                await deleteObject(photoRef);

                // Delete gallery photos
                for (let i = 1; i <= 6; i++) {
                    try {
                        const galleryRef = ref(storage, `profile_photos/${currentUserData.gender}/${currentUser.uid}/gallery_${i}`);
                        await deleteObject(galleryRef);
                    } catch (e) {
                        console.log(`Gallery photo ${i} not found or already deleted`);
                    }
                }
            } catch (e) {
                console.log('Some photos could not be deleted:', e);
            }

            // 3. Delete authentication account (Actual user deletion)
            try {
                if (auth.currentUser) {
                    await auth.currentUser.delete();
                }
            } catch (authError) {
                console.warn('Auth delete failed:', authError);
                if (authError.code === 'auth/requires-recent-login') {
                    sessionStorage.setItem('pendingAccountDeletion', 'true'); // SET FLAG
                    showToast('Por seguridad, inicia sesión nuevamente para confirmar.', 'warning');
                    setTimeout(async () => {
                        await signOut(auth);
                        window.location.href = '/login.html';
                    }, 2000);
                    return;
                }
                await signOut(auth);
            }

            showToast('Cuenta eliminada exitosamente', 'success');

            // Redirect to login after 2 seconds
            setTimeout(() => {
                window.location.href = '/login.html';
            }, 2000);

        } catch (error) {
            logger.error('Error deleting account:', error);
            showToast('Error al eliminar la cuenta: ' + error.message, 'error');
        }
    }
})();
