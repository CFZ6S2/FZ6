import './firebase-appcheck.js';
import { auth, storage, app, getDb } from './firebase-config-env.js';
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
    getFirestore, collection, query, where, getDocs, getDoc, addDoc, updateDoc, arrayUnion, deleteDoc,
    doc, orderBy, limit, serverTimestamp, startAfter, getCountFromServer
} from "firebase/firestore";
import { showToast, calculateAge, getReputationBadge, getAvailabilityStatus, calculateDistance, canAccessChat } from './utils.js';
import { loadTheme } from './theme.js';
import { getDownloadURL, ref } from "firebase/storage";
import { apiService } from './api-service.js';
import { isDemoMode, getDemoUser } from './demo-mode.js';
import { GOOGLE_MAPS_API_KEY, MAP_CONFIG } from './google-maps-config-env.js';
import './image-optimizer.js';
import { guardPage } from './profile-guard.js';
import { sanitizer } from './sanitizer.js';

(async () => {
    const db = getFirestore(app);
    window._debug_db = db;
    console.log('✅ Firestore initialized synchronously in buscar-usuarios.js');
    // Firestore imported from config

    // Define SUPER_USERS constant to fix ReferenceError
    const SUPER_USERS = ['cesar@tucitasegura.com', 'admin@tucitasegura.com', 'cesar.herrera.rojo@gmail.com'];

    // Setup global error handling
    window.onerror = function (message, source, lineno, colno, error) {
        console.error('Global Error:', message, error);
        // Suppress specific map errors or benign warnings
        if (message && message.includes('Google Maps')) return true;
        return false;
    };

    // Verificar perfil completo ANTES de cargar la página
    async function loadGoogleMaps() {
        try {
            // using outer scope for maps key
            if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === 'YOUR_GOOGLE_MAPS_API_KEY') {
                console.error('⚠️ Configure Google Maps API Key in /webapp/js/google-maps-config.js');
                return false;
            }
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,geometry&language=es&region=ES&loading=async`;
                script.async = true;
                script.onload = resolve;
                script.onerror = () => reject(new Error('Google Maps failed to load'));
                document.head.appendChild(script);
            });
            return true;
        } catch (e) {
            console.error('Error loading Google Maps API:', e);
            return false;
        }
    }

    // Verificar perfil completo ANTES de cargar la página
    // Verificar perfil completo ANTES de cargar la página
    // TEMPORARILY DISABLED BY USER REQUEST
    /*
    await guardPage({
      requireEmailVerification: true,
      requireCompleteProfile: true,
      silent: false
    });
    */
    await loadGoogleMaps();

    // DOM Elements
    const userGrid = document.getElementById('userGrid');
    const loading = document.getElementById('loading');
    const noResults = document.getElementById('noResults');
    const userCount = document.getElementById('userCount');
    const logoutBtn = document.getElementById('logoutBtn');
    const toggleFilters = document.getElementById('toggleFilters');
    const filtersPanel = document.getElementById('filtersPanel');
    const applyFilters = document.getElementById('applyFilters');
    const clearFilters = document.getElementById('clearFilters');
    const closeFilters = document.getElementById('closeFilters');
    const clearAllFilters = document.getElementById('clearAllFilters');
    const resetSearch = document.getElementById('resetSearch');
    const sortBy = document.getElementById('sortBy');
    // const userModal = document.getElementById('userModal'); // Duplicate
    const closeModal = document.getElementById('closeModal');
    const sendMatchBtn = document.getElementById('sendMatchBtn');
    const startChatBtn = document.getElementById('startChatBtn');
    const skipUserBtn = document.getElementById('skipUserBtn');
    const loadMoreContainer = document.getElementById('loadMoreContainer');
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    const activeFilters = document.getElementById('activeFilters');
    const filterChips = document.getElementById('filterChips');
    const viewList = document.getElementById('viewList');
    const viewMap = document.getElementById('viewMap'); // May be null if map removed
    const mapContainer = document.getElementById('mapContainer');
    const gridContainer = document.getElementById('gridContainer');
    const useMyLocation = document.getElementById('useMyLocation');
    const paymentModal = document.getElementById('paymentModal');
    const closePaymentModal = document.getElementById('closePaymentModal');
    const goToPaymentBtn = document.getElementById('goToPaymentBtn');
    const paymentStatusBanner = document.getElementById('paymentStatusBanner');
    const quickSearchBtn = document.getElementById('quickSearchBtn');
    const searchText = document.getElementById('searchText');

    // --- EVENT LISTENERS (Moved Up for Immediate Interaction) ---
    if (toggleFilters && filtersPanel) {
        toggleFilters.addEventListener('click', () => {
            console.log('🔘 Toggle filters clicked');
            filtersPanel.classList.toggle('hidden');
        });
    }

    if (applyFilters) {
        applyFilters.addEventListener('click', () => {
            saveFilters();
            applyFiltersAndSort();
            if (filtersPanel) filtersPanel.classList.add('hidden');
        });
    }

    if (clearFilters) {
        clearFilters.addEventListener('click', () => {
            const inputs = ['searchText', 'locationSearch', 'filterAgeMin', 'filterAgeMax', 'filterDistance', 'filterReputation'];
            inputs.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });

            const checks = ['filterVerified', 'filterOnline', 'filterFavorites'];
            checks.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.checked = false;
            });

            if (sortBy) sortBy.value = 'distance';
            localStorage.removeItem('userSearchFilters');
            applyFiltersAndSort();
        });
    }

    if (clearAllFilters) {
        clearAllFilters.addEventListener('click', () => {
            if (clearFilters) clearFilters.click();
        });
    }

    if (resetSearch) {
        resetSearch.addEventListener('click', () => {
            if (clearFilters) clearFilters.click();
        });
    }

    if (sortBy) {
        sortBy.addEventListener('change', () => {
            saveFilters();
            applyFiltersAndSort();
        });
    }
    // ------------------------------------------------------------

    // State
    let currentUser = null;
    let currentUserData = null;
    let selectedUser = null;
    let allUsers = [];
    let filteredUsers = [];
    let displayedUsers = [];
    let userMatches = [];
    let currentPage = 1; // Start at page 1
    let map = null;
    let markers = [];
    let userLocation = null;
    let autocomplete = null;
    let currentView = 'list';
    const USERS_PER_PAGE = 36;

    // Pagination Elements
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');
    const pageIndicator = document.getElementById('pageIndicator');
    const paginationContainer = document.getElementById('paginationContainer');

    async function fetchGlobalStats() {
        try {
            const usersRef = collection(db, 'users');

            // Count Men
            const qMen = query(usersRef, where('gender', '==', 'masculino'));
            const snapMen = await getCountFromServer(qMen);
            const countMen = snapMen.data().count;

            // Count Women
            const qWomen = query(usersRef, where('gender', '==', 'femenino'));
            const snapWomen = await getCountFromServer(qWomen);
            const countWomen = snapWomen.data().count;

            // Update UI
            const elMen = document.getElementById('globalStatsMen');
            const elWomen = document.getElementById('globalStatsWomen');

            if (elMen) elMen.textContent = `${countMen} Hombres`;
            if (elWomen) elWomen.textContent = `${countWomen} Mujeres`;

            // Update Mobile Stats
            const elMenMob = document.getElementById('globalStatsMenMobile');
            const elWomenMob = document.getElementById('globalStatsWomenMobile');
            if (elMenMob) elMenMob.textContent = `${countMen} Hombres`;
            if (elWomenMob) elWomenMob.textContent = `${countWomen} Mujeres`;

        } catch (error) {
            console.error('Error fetching global stats:', error);
        }
    }

    function initPagination() {
        if (prevPageBtn) {
            prevPageBtn.addEventListener('click', () => {
                if (currentPage > 1) {
                    currentPage--;
                    displayUsers();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
        }

        if (nextPageBtn) {
            nextPageBtn.addEventListener('click', () => {
                const totalPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE);
                if (currentPage < totalPages) {
                    currentPage++;
                    displayUsers();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
        }
    }

    function updatePaginationControls() {
        const totalPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE) || 1;

        if (pageIndicator) pageIndicator.textContent = `Página ${currentPage} de ${totalPages}`;

        if (prevPageBtn) {
            prevPageBtn.disabled = currentPage === 1;
            prevPageBtn.classList.toggle('opacity-50', currentPage === 1);
        }

        if (nextPageBtn) {
            nextPageBtn.disabled = currentPage >= totalPages;
            nextPageBtn.classList.toggle('opacity-50', currentPage >= totalPages);
        }

        if (paginationContainer) {
            // Only show pagination if we have results
            if (filteredUsers.length > USERS_PER_PAGE) {
                paginationContainer.classList.remove('hidden');
            } else {
                paginationContainer.classList.add('hidden');
            }
        }

        // Ensure loadMore is hidden
        if (loadMoreContainer) loadMoreContainer.classList.add('hidden');
    }

    // Initialize Google Maps
    function initMap() {
        const mapElement = document.getElementById('map');

        // Skip map initialization if element doesn't exist (map view removed)
        if (!mapElement || !window.google || !window.google.maps) {
            console.log('⚠️ Map view not available - element removed or Google Maps not loaded');
            return;
        }

        const mapOptions = {
            zoom: 12,
            center: { lat: 40.4168, lng: -3.7038 }, // Madrid default
            styles: [
                {
                    "featureType": "all",
                    "elementType": "geometry",
                    "stylers": [{ "color": "#242f3e" }]
                },
                {
                    "featureType": "all",
                    "elementType": "labels.text.stroke",
                    "stylers": [{ "lightness": -80 }]
                },
                {
                    "featureType": "administrative",
                    "elementType": "labels.text.fill",
                    "stylers": [{ "color": "#746855" }]
                },
                {
                    "featureType": "poi",
                    "elementType": "labels.text.fill",
                    "stylers": [{ "color": "#d59563" }]
                },
                {
                    "featureType": "water",
                    "elementType": "geometry",
                    "stylers": [{ "color": "#17263c" }]
                }
            ]
        };

        map = new google.maps.Map(mapElement, mapOptions);

        // Initialize autocomplete (New PlaceAutocompleteElement)
        const locationInput = document.getElementById('locationSearch');
        if (locationInput) {
            // Import libraries if needed (PlaceAutocompleteElement requires 'places')
            if (google.maps.importLibrary) {
                google.maps.importLibrary("places").then(() => {
                    // Create the new element
                    const autocompleteElement = new google.maps.places.PlaceAutocompleteElement({
                        componentRestrictions: { country: ['es'] },
                        locationBias: { radius: 100000, center: { lat: 40.4168, lng: -3.7038 } } // Bias to Madrid initially
                    });

                    // Style integration: Replace the input or append?
                    // The new element is a full web component. Replacing the input might break styling if container is small.
                    // Strategy: Hide original input, append new element to parent.
                    // Actually, simpler: Use the new element as the input replacement.

                    // We need to match styling. The new element is encapsulated.
                    // Let's replace the *input* node with the new element.
                    locationInput.parentNode.replaceChild(autocompleteElement, locationInput);

                    // Add ID for potential CSS referencing, though styles are internal
                    autocompleteElement.id = 'locationSearchElement';
                    autocompleteElement.classList.add('w-full', 'glass', 'text-black'); // Try to apply some classes

                    autocompleteElement.addEventListener('gmp-placeselect', async ({ place }) => {
                        await place.fetchFields({ fields: ['geometry', 'location'] });
                        if (place.geometry && place.geometry.location) {
                            userLocation = {
                                lat: place.geometry.location.lat(),
                                lng: place.geometry.location.lng()
                            };
                            if (map) {
                                map.setCenter(userLocation);
                                map.setZoom(12);
                            }
                            applyFiltersAndSort();
                        }
                    });
                }).catch(e => console.error("Failed to load places library for Autocomplete", e));
            } else {
                console.warn("Google Maps importLibrary not supported? Fallback or update SDK.");
            }
        }
    }

    // Add user markers to map
    function addMarkersToMap(users) {
        // Clear existing markers
        markers.forEach(marker => marker.setMap(null));
        markers = [];

        if (!map) return;

        users.forEach(user => {
            if (user.location && user.location.lat && user.location.lng) {
                const marker = new google.maps.Marker({
                    position: { lat: user.location.lat, lng: user.location.lng },
                    map: map,
                    title: user.alias || 'Usuario',
                    icon: {
                        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <circle cx="20" cy="20" r="18" fill="#0ea5e9" stroke="#fff" stroke-width="3" />
    <text x="20" y="26" font-size="16" font-weight="bold" text-anchor="middle" fill="#fff">
      ${(user.alias || 'U').charAt(0).toUpperCase()}
    </text>
  </svg>
  `),
                        scaledSize: new google.maps.Size(40, 40),
                        anchor: new google.maps.Point(20, 20)
                    }
                });

                const reputation = getReputationBadge(user.reputation || 'BRONCE');
                const distance = userLocation && user.location ?
                    calculateDistance(userLocation.lat, userLocation.lng, user.location.lat, user.location.lng) : null;

                const infoWindow = new google.maps.InfoWindow({
                    content: `
  <div class="map-info-window">
    <h3 style="font-weight: bold; margin-bottom: 8px;">${user.alias || 'Usuario'}</h3>
    <p style="font-size: 0.875rem; margin-bottom: 4px;">
      <i class="fas fa-birthday-cake"></i> ${user.age} años
    </p>
    ${distance ? `<p style="font-size: 0.875rem; margin-bottom: 8px; color: #86efac;">
      <i class="fas fa-route"></i> ${distance.toFixed(1)} km
    </p>` : ''}
    <p style="font-size: 0.875rem; margin-bottom: 8px;">${reputation.icon} ${reputation.label}</p>
    <button onclick="window.openUserModalFromMap('${user.id}')"
      style="background: linear-gradient(to right, #ec4899, #a855f7); color: white; padding: 8px 16px; border-radius: 8px; border: none; cursor: pointer; font-weight: 600; width: 100%;">
      Ver Perfil
    </button>
  </div>
  `
                });

                marker.addListener('click', () => {
                    infoWindow.open(map, marker);
                });

                markers.push(marker);
            }
        });

        // Fit bounds to show all markers
        if (markers.length > 0) {
            const bounds = new google.maps.LatLngBounds();
            markers.forEach(marker => bounds.extend(marker.getPosition()));
            map.fitBounds(bounds);
        }
    }

    // Make openUserModalFromMap available globally
    window.openUserModalFromMap = function (userId) {
        const user = allUsers.find(u => u.id === userId);
        if (user) {
            openUserModal(user);
        }
    };

    // Close filters on mobile
    if (closeFilters) {
        closeFilters.addEventListener('click', () => {
            filtersPanel.classList.add('hidden');
        });
    }

    // Quick Search Logic
    if (quickSearchBtn) {
        quickSearchBtn.addEventListener('click', () => {
            applyFiltersAndSort();
        });
    }

    if (searchText) {
        searchText.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                applyFiltersAndSort();
            }
        });
    }


    // View Toggles
    if (viewList && viewMap) {
        viewList.addEventListener('click', () => {
            viewList.classList.add('active');
            viewMap.classList.remove('active');
            document.getElementById('gridContainer').classList.remove('hidden');
            document.getElementById('mapContainer').classList.add('hidden');
        });

        viewMap.addEventListener('click', () => {
            viewMap.classList.add('active');
            viewList.classList.remove('active');
            document.getElementById('gridContainer').classList.add('hidden');
            document.getElementById('mapContainer').classList.remove('hidden');

            // Ensure map is handled correctly
            if (!map) {
                initMap();
            } else {
                // Trigger resize event to fix gray map issue
                google.maps.event.trigger(map, "resize");
            }

            // Add markers for filtered users
            addMarkersToMap(filteredUsers);
        });
    }

    // Get user's current location
    useMyLocation.addEventListener('click', () => {
        if (navigator.geolocation) {
            useMyLocation.disabled = true;
            useMyLocation.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Obteniendo...';

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    userLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };

                    if (map) {
                        map.setCenter(userLocation);
                        map.setZoom(14);

                        // Add marker for user location
                        new google.maps.Marker({
                            position: userLocation,
                            map: map,
                            icon: {
                                url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <circle cx="20" cy="20" r="18" fill="#22c55e" stroke="#fff" stroke-width="3" />
    <circle cx="20" cy="20" r="8" fill="#fff" />
  </svg>
  `),
                                scaledSize: new google.maps.Size(40, 40)
                            },
                            title: 'Tu ubicación'
                        });
                    }

                    showToast('Ubicación detectada', 'success');
                    applyFiltersAndSort();
                    useMyLocation.disabled = false;
                    useMyLocation.innerHTML = '<i class="fas fa-check mr-2"></i>Ubicación detectada';
                },
                (error) => {
                    console.error('Error getting location:', error);
                    showToast('No se pudo obtener tu ubicación', 'error');
                    useMyLocation.disabled = false;
                    useMyLocation.innerHTML = '<i class="fas fa-crosshairs mr-2"></i>Usar mi ubicación';
                }
            );
        } else {
            showToast('Geolocalización no soportada', 'error');
        }
    });

    // Auth Check
    onAuthStateChanged(auth, async (user) => {
        // Check for demo mode first
        if (isDemoMode()) {
            const demoAuth = getDemoUser();
            console.log('🎯 Demo mode active - bypassing Firebase auth');
            currentUser = { uid: demoAuth.uid, email: demoAuth.email, emailVerified: true };

            // Create mock user data for demo
            currentUserData = {
                id: demoAuth.uid,
                email: demoAuth.email,
                alias: 'Usuario Demo',
                gender: 'masculino',
                birthDate: '1990-01-01',
                reputation: 'BRONCE',
                hasActiveSubscription: false,
                hasAntiGhostingInsurance: false,
                location: { lat: 40.4168, lng: -3.7038 }
            };
            loadTheme(currentUserData);

            await loadUserMatches();
            initMap();
            await loadUsers();
            loadSavedFilters();
            updatePaymentStatusBanner();
            return;
        }

        const SUPER_USERS = ['gonzalo.hrrj@gmail.com', 'lacasitadebarajas@gmail.com', 'cesar.herrera.rojo@gmail.com', 'admin@tucitasegura.com'];
        const isDev = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
        if (!user) {
            window.location.href = '/login.html';
            return;
        }

        if (!user.emailVerified) {
            showToast('Verifica tu email primero', 'warning');
            if (!isDev && !SUPER_USERS.includes(user.email)) {
                window.location.href = '/perfil.html';
                return;
            }
        }

        currentUser = user;

        // Initialize API Service with token
        const token = await user.getIdToken();
        apiService.setToken(token);

        await loadCurrentUserData();
        loadTheme(currentUserData);

        // Load everything else
        await Promise.all([
            loadUserMatches(),
            loadUsers(), // Now includes fetching scores
            fetchGlobalStats()
        ]);

        initMap();
        initPagination();
        loadSavedFilters();
    });

    // Payment Validation Functions
    function checkPaymentStatus() {
        // ✅ ADMINS BYPASS ALL VALIDATIONS (including profile completion)
        if (SUPER_USERS.includes(currentUser.email)) {
            return { canUse: true, reason: null };
        }

        // ✅ PRIMERO: Validar perfil completo (TODOS los usuarios NO-ADMIN)
        // Keep profile validation? User only complained about payments.
        // But incomplete profile is useful to keep.
        const chatValidation = canAccessChat(currentUserData);
        if (!chatValidation.canAccess && chatValidation.reason === 'incomplete_profile') {
            return {
                canUse: false,
                reason: 'incomplete_profile',
                title: 'Perfil Incompleto',
                message: 'Debes completar tu perfil antes de enviar solicitudes de cita.'
            };
        }

        /* PAYMENTS DISABLED
        // Regla de negocio: Por ahora solo los hombres pagan
        const userMustPay = (currentUserData && currentUserData.gender === 'masculino');

        if (!userMustPay) {
            // Las mujeres pueden usar libremente (por ahora)
            // Pero ya validamos perfil completo arriba ✅
            return { canUse: true, reason: null };
        }

        // Verificar membresía activa
        if (!currentUserData || !currentUserData.hasActiveSubscription) {
            return {
                canUse: false,
                reason: 'membership',
                title: 'Membresía Requerida',
                message: 'Para enviar solicitudes de cita necesitas una membresía activa.'
            };
        }

        // Verificar seguro anti-plantón (120€)
        if (!currentUserData || !currentUserData.hasAntiGhostingInsurance) {
            return {
                canUse: false,
                reason: 'insurance',
                title: 'Seguro Anti-Plantón Requerido',
                message: 'Para agendar citas debes contratar el seguro anti-plantón de 120€.'
            };
        }
        */

        return { canUse: true, reason: null };
    }

    function showPaymentRequiredModal(reason, title, message) {
        const paymentModalTitle = document.getElementById('paymentModalTitle');
        const paymentModalMessage = document.getElementById('paymentModalMessage');
        const paymentDetails = document.getElementById('paymentDetails');
        const paymentBtnText = document.getElementById('paymentBtnText');

        paymentModalTitle.textContent = title;
        paymentModalMessage.textContent = message;

        if (reason === 'incomplete_profile') {
            // ✅ NUEVO: Caso de perfil incompleto
            paymentDetails.innerHTML = `
          <div class="space-y-4">
            <div class="space-y-2 text-sm">
              <div class="flex items-start gap-2">
                <i class="fas fa-user-check text-purple-400 mt-1"></i>
                <span>Completa tu nombre de usuario (alias)</span>
              </div>
              <div class="flex items-start gap-2">
                <i class="fas fa-venus-mars text-purple-400 mt-1"></i>
                <span>Indica tu género</span>
              </div>
              <div class="flex items-start gap-2">
                <i class="fas fa-camera text-purple-400 mt-1"></i>
                <span>Sube tu foto de perfil</span>
              </div>
              <div class="flex items-start gap-2">
                <i class="fas fa-images text-purple-400 mt-1"></i>
                <span>Agrega mínimo 2 fotos a tu galería</span>
              </div>
              <div class="flex items-start gap-2">
                <i class="fas fa-pen text-purple-400 mt-1"></i>
                <span>Escribe tu biografía (mínimo 120 caracteres)</span>
              </div>
              <div class="flex items-start gap-2">
                <i class="fas fa-map-marker-alt text-purple-400 mt-1"></i>
                <span>Indica tu ciudad</span>
              </div>
              <div class="flex items-start gap-2">
                <i class="fas fa-briefcase text-purple-400 mt-1"></i>
                <span>Completa tu profesión y preferencias</span>
              </div>
            </div>
            <div class="bg-purple-500/20 border border-purple-500/50 rounded-lg p-3 text-xs">
              <i class="fas fa-info-circle text-purple-400 mr-2"></i>
              Un perfil completo aumenta tus posibilidades de encontrar tu match ideal.
            </div>
          </div>
        `;
            paymentBtnText.textContent = 'Completar Perfil';
            goToPaymentBtn.onclick = () => window.location.href = '/webapp/perfil.html?incomplete=true&reason=chat';
        } else if (reason === 'membership') {
            paymentDetails.innerHTML = `
  <div class="space-y-4">
    <div class="flex items-center justify-between pb-3 border-b border-white/10">
      <span class="text-slate-400">Plan Mensual</span>
      <span class="text-2xl font-bold text-green-400">€29.99/mes</span>
    </div>
    <div class="space-y-2 text-sm">
      <div class="flex items-start gap-2">
        <i class="fas fa-check text-green-400 mt-1"></i>
        <span>Envía solicitudes de cita ilimitadas</span>
      </div>
      <div class="flex items-start gap-2">
        <i class="fas fa-check text-green-400 mt-1"></i>
        <span>Chat con todos tus matches</span>
      </div>
      <div class="flex items-start gap-2">
        <i class="fas fa-check text-green-400 mt-1"></i>
        <span>Filtros avanzados de búsqueda</span>
      </div>
      <div class="flex items-start gap-2">
        <i class="fas fa-check text-green-400 mt-1"></i>
        <span>Soporte prioritario</span>
      </div>
    </div>
  </div>
  `;
            paymentBtnText.textContent = 'Contratar Membresía';
            goToPaymentBtn.onclick = () => window.location.href = '/suscripcion.html';
        } else if (reason === 'insurance') {
            paymentDetails.innerHTML = `
  <div class="space-y-4">
    <div class="flex items-center justify-between pb-3 border-b border-white/10">
      <span class="text-slate-400">Pago Único</span>
      <span class="text-2xl font-bold text-blue-400">€120</span>
    </div>
    <div class="space-y-2 text-sm">
      <div class="flex items-start gap-2">
        <i class="fas fa-shield-check text-blue-400 mt-1"></i>
        <span><strong>Protección anti-plantón:</strong> Si tu cita no se presenta, recuperas tu dinero</span>
      </div>
      <div class="flex items-start gap-2">
        <i class="fas fa-shield-check text-blue-400 mt-1"></i>
        <span><strong>Verificación de identidad:</strong> Todas las citas están verificadas</span>
      </div>
      <div class="flex items-start gap-2">
        <i class="fas fa-shield-check text-blue-400 mt-1"></i>
        <span><strong>Seguridad garantizada:</strong> Sistema de reputación y valoraciones</span>
      </div>
      <div class="flex items-start gap-2">
        <i class="fas fa-shield-check text-blue-400 mt-1"></i>
        <span><strong>Reembolso automático:</strong> Si hay un plantón comprobado</span>
      </div>
    </div>
    <div class="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-3 text-xs">
      <i class="fas fa-info-circle text-yellow-400 mr-2"></i>
      Este seguro es obligatorio para agendar citas y garantiza la seriedad de ambas partes.
    </div>
  </div>
  `;
            paymentBtnText.textContent = 'Contratar Seguro';
            goToPaymentBtn.onclick = () => window.location.href = '/seguro.html';
        }

        paymentModal.classList.remove('opacity-0', 'pointer-events-none');
    }

    function updatePaymentStatusBanner() {
        if (SUPER_USERS.includes(currentUser.email)) {
            paymentStatusBanner.classList.add('hidden');
            return;
        }
        const userMustPay = (currentUserData && currentUserData.gender === 'masculino');

        if (!userMustPay) {
            paymentStatusBanner.classList.add('hidden');
            return;
        }

        const hasMembership = !!(currentUserData && currentUserData.hasActiveSubscription);
        const hasInsurance = !!(currentUserData && currentUserData.hasAntiGhostingInsurance);

        if (hasMembership && hasInsurance) {
            // Todo pago OK - mostrar badge de estado premium
            paymentStatusBanner.className = 'glass-strong rounded-2xl p-4 mb-6 border-2 border-green-500/50 bg-green-500/10';
            paymentStatusBanner.innerHTML = `
  <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
    <div>
      <h4 class="font-bold text-green-400 text-lg">Cuenta Premium Activa</h4>
      <p class="text-sm text-slate-300">Membresía y seguro anti-plantón activos</p>
    </div>
    <div class="flex flex-wrap gap-2">
      <span class="badge bg-green-500/20 border border-green-500/50 text-green-400 px-3 py-1">
        <i class="fas fa-crown mr-1"></i>Premium
      </span>
      <span class="badge bg-blue-500/20 border border-blue-500/50 text-blue-400 px-3 py-1">
        <i class="fas fa-shield-check mr-1"></i>Asegurado
      </span>
    </div>
  </div>
  `;
            paymentStatusBanner.classList.remove('hidden');
        } else {
            // Falta algún pago - mostrar advertencia
            paymentStatusBanner.className = 'glass-strong rounded-2xl p-4 mb-6 border-2 border-yellow-500/50 bg-yellow-500/10';

            const missingItems = [];
            if (!hasMembership) missingItems.push('Membresía mensual');
            if (!hasInsurance) missingItems.push('Seguro anti-plantón (€120)');

            paymentStatusBanner.innerHTML = `
  <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
    <div class="flex items-start gap-3">
      <i class="fas fa-exclamation-triangle text-yellow-400 text-2xl mt-1 md:mt-0"></i>
      <div>
        <h4 class="font-bold text-yellow-400 text-lg">Pagos Pendientes</h4>
        <p class="text-sm text-slate-300">Falta: ${missingItems.join(' y ')}</p>
      </div>
    </div>
    <button onclick="document.getElementById('paymentModal').classList.remove('opacity-0','pointer-events-none')"
      class="w-full md:w-auto bg-yellow-500 hover:bg-yellow-600 px-6 py-3 rounded-lg font-bold text-black transition shadow-lg shadow-yellow-500/20">
      <i class="fas fa-credit-card mr-2"></i>Completar Pagos
    </button>
  </div>
  `;
            paymentStatusBanner.classList.remove('hidden');
        }
    }

    async function loadCurrentUserData() {
        try {
            console.log('🔍 Loading current user data (Firestore)...');
            const docRef = doc(db, 'users', currentUser.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                currentUserData = { id: docSnap.id, ...docSnap.data() };
                console.log('✅ Firestore load success. Gender:', currentUserData.gender);
            } else {
                console.warn('⚠️ Firestore doc not found. Attempting API Fallback...');
                throw new Error('Firestore doc missing');
            }
        } catch (error) {
            console.warn('⚠️ Local load failed, trying API Backup:', error);
            // FALLBACK: Load from API (Bypasses Client Rules/Cache)
            try {
                const apiResp = await apiService.getUserProfile();
                if (apiResp && apiResp.success && apiResp.profile) {
                    currentUserData = { ...apiResp.profile, id: apiResp.profile.uid };
                    console.log('✅ API Fallback success! User loaded.');
                }
            } catch (apiErr) {
                console.error('❌ CRITICAL: Both Firestore and API failed to load user.', apiErr);
            }
        }

        if (currentUserData) {
            // Load user theme
            loadTheme(currentUserData);

            // Set user location if available
            if (currentUserData.location) {
                userLocation = currentUserData.location;
            }

            // Update payment status banner
            updatePaymentStatusBanner();

            // Show VIP Events button only for women
            if (currentUserData.gender === 'femenino') {
                const vipEventsBtn = document.getElementById('vipEventsBtn');
                if (vipEventsBtn) {
                    vipEventsBtn.classList.remove('opacity-0', 'pointer-events-none');
                }
            }

            // Show Concierge Panel button for authorized users
            if (currentUserData.role === 'admin' || currentUserData.role === 'concierge' || currentUserData.userRole === 'admin') {
                const conciergePanelBtn = document.getElementById('conciergePanelBtn');
                if (conciergePanelBtn) {
                    conciergePanelBtn.classList.remove('hidden');
                }
            }
        }
    }

    async function loadUserMatches() {
        try {
            const matchesRef = collection(db, 'matches');
            const q = query(matchesRef, where('senderId', '==', currentUser.uid));
            const querySnapshot = await getDocs(q);
            userMatches = querySnapshot.docs.map(doc => doc.data().receiverId);
        } catch (error) {
            console.error('Error loading matches:', error);
        }
    }

    async function loadUsers() {
        showLoading();
        try {
            // using outer db
            // db initialized in outer scope

            if (!currentUserData || !currentUserData.gender) {
                console.error('Error loading users: perfil no disponible');
                hideLoading();
                showToast('Tu perfil está incompleto. Redirigiendo al asistente...', 'warning');
                setTimeout(() => window.location.href = '/perfil-asistido.html', 1500);
                return;
            }

            // 1. Fetch users from Firestore (Base data)
            const usersRef = collection(db, 'users');
            const oppositeGender = currentUserData.gender === 'masculino' ? 'femenino' : 'masculino';
            const q = query(usersRef, where('gender', '==', oppositeGender));

            const querySnapshot = await getDocs(q);

            // 2. Fetch Recommendation Scores from Backend API
            let recommendationScores = {};
            try {
                // We ask for recommendations to get the scores
                const response = await apiService.getRecommendations({ limit: 50 });

                // Debug response
                console.log('🔮 Smart Recommendations:', response);

                // Handle structured response
                const recList = response.recommendations || (Array.isArray(response) ? response : []);

                if (Array.isArray(recList)) {
                    recList.forEach(rec => {
                        const uid = rec.user_id || rec.id;
                        if (uid) {
                            // Use compatibility_score (backend) or match_score (legacy)
                            recommendationScores[uid] = rec.compatibility_score || rec.match_score || rec.score || 0;
                        }
                    });
                    console.log('✅ Matches loaded:', Object.keys(recommendationScores).length);
                }
            } catch (apiError) {
                console.warn('Could not fetch recommendations:', apiError);
                // Non-critical, continue without scores
            }

            allUsers = [];

            querySnapshot.forEach((doc) => {
                if (doc.id !== currentUser.uid) {
                    const data = doc.data();

                    // 🛡️ ZOMBIE FILTER: Ignore banned, deleted, or HIDDEN users
                    if (data.disabled === true || data.deleted === true || data.isProfileHidden === true) return;

                    // 🛡️ USER BLOCK/HIDE FILTER
                    if (currentUserData.hiddenUsers && currentUserData.hiddenUsers.includes(doc.id)) return;
                    if (currentUserData.blockedUsers && currentUserData.blockedUsers.includes(doc.id)) return;

                    const age = data.birthDate ? calculateAge(data.birthDate) : null;

                    // Add mock location if not present (logic preserved)
                    /* MOCK LOCATION REMOVED - Preventing users from appearing in Madrid by default
                    if (!data.location) {
                        const userId = doc.id;
                        const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                        const latOffset = ((hash % 100) / 100 - 0.5) * 0.2;
                        const lngOffset = (((hash * 13) % 100) / 100 - 0.5) * 0.2;

                        data.location = {
                            lat: 40.4168 + latOffset,
                            lng: -3.7038 + lngOffset
                        };
                    }
                    */

                    // Attach Match Score
                    const matchScore = recommendationScores[doc.id] || 0; // Default 0 if not found

                    allUsers.push({
                        id: doc.id,
                        ...data,
                        age,
                        matchScore: matchScore
                    });
                }
            });

            applyFiltersAndSort();
        } catch (error) {
            console.error('Error loading users:', error);
            showToast(`Error: ${error.message}`, 'error');
            hideLoading();
        }
    }

    function applyFiltersAndSort() {
        const filters = getFilters();

        filteredUsers = allUsers.filter(user => {
            // Search text
            if (filters.searchText) {
                const searchLower = filters.searchText.toLowerCase();
                const matchesAlias = user.alias?.toLowerCase().includes(searchLower);
                const matchesBio = user.bio?.toLowerCase().includes(searchLower);
                if (!matchesAlias && !matchesBio) return false;
            }

            // Age filters
            if (filters.ageMin && (!user.age || user.age < filters.ageMin)) return false; if (filters.ageMax && (!user.age ||
                user.age > filters.ageMax)) return false;

            // Distance filter
            if (filters.distance && userLocation && user.location) {
                const dist = calculateDistance(
                    userLocation.lat, userLocation.lng,
                    user.location.lat, user.location.lng
                );
                if (dist > filters.distance) return false;
            }

            // Reputation filter
            if (filters.reputation) {
                const repLevels = { 'BRONCE': 1, 'PLATA': 2, 'ORO': 3, 'PLATINO': 4 };
                const userRep = repLevels[user.reputation || 'BRONCE'];
                const minRep = repLevels[filters.reputation];
                if (userRep < minRep) return false;
            }

            // Verified filter
            if (filters.verified && !user.emailVerified) return false;

            // Favorites filter
            if (filters.favorites && !userMatches.includes(user.id)) return false;

            // Online filter
            if (filters.online && !isUserOnline(user)) return false;

            return true;
        });

        // Calculate distances for all filtered users
        if (userLocation) {
            filteredUsers.forEach(user => {
                if (user.location) {
                    user.distance = calculateDistance(
                        userLocation.lat, userLocation.lng,
                        user.location.lat, user.location.lng
                    );
                }
            });
        }

        // Apply sorting
        const sort = filters.sortBy;

        if (sort === 'distance' && userLocation) {
            filteredUsers.sort((a, b) => (a.distance || 999999) - (b.distance || 999999));
        } else if (sort === 'age-asc') {
            filteredUsers.sort((a, b) => (a.age || 999) - (b.age || 999));
        } else if (sort === 'age-desc') {
            filteredUsers.sort((a, b) => (b.age || 0) - (a.age || 0));
        } else if (sort === 'reputation') {
            const repLevels = { 'BRONCE': 1, 'PLATA': 2, 'ORO': 3, 'PLATINO': 4 };
            filteredUsers.sort((a, b) => repLevels[b.reputation || 'BRONCE'] - repLevels[a.reputation || 'BRONCE']);
        } else {
            filteredUsers.sort((a, b) => {
                const dateA = a.createdAt?.toMillis?.() || 0;
                const dateB = b.createdAt?.toMillis?.() || 0;
                return dateB - dateA;
            });
        }

        currentPage = 1;
        displayedUsers = [];

        updateFilterChips(filters);

        if (currentView === 'map') {
            addMarkersToMap(filteredUsers);
        } else {
            displayUsers(); // Will update controls inside
        }

        updateUserCount();
        hideLoading();
    }

    function getFilters() {
        return {
            searchText: document.getElementById('searchText').value.trim(),
            ageMin: parseInt(document.getElementById('filterAgeMin').value) || null,
            ageMax: parseInt(document.getElementById('filterAgeMax').value) || null,
            distance: parseInt(document.getElementById('filterDistance').value) || null,
            reputation: document.getElementById('filterReputation').value,
            verified: document.getElementById('filterVerified').checked,
            favorites: document.getElementById('filterFavorites').checked,
            online: document.getElementById('filterOnline').checked,
            sortBy: sortBy.value
        };
    }

    function updateFilterChips(filters) {
        const chips = [];

        if (filters.searchText) chips.push({ text: `"${filters.searchText}"`, icon: 'search' });
        if (filters.ageMin) chips.push({ text: `Edad ≥ ${filters.ageMin}`, icon: 'birthday-cake' });
        if (filters.ageMax) chips.push({ text: `Edad ≤ ${filters.ageMax}`, icon: 'birthday-cake' });
        if (filters.distance) chips.push({ text: `≤ ${filters.distance} km`, icon: 'route' });
        if (filters.reputation) chips.push({ text: `${filters.reputation}+`, icon: 'star' });
        if (filters.verified) chips.push({ text: 'Verificados', icon: 'certificate' });
        if (filters.favorites) chips.push({ text: 'Mis Favoritos', icon: 'heart' });
        if (filters.online) chips.push({ text: 'En línea', icon: 'circle' });

        if (chips.length > 0) {
            filterChips.innerHTML = chips.map(chip => {
                const safeIcon = sanitizer.text(chip.icon || '');
                const safeText = sanitizer.text(chip.text || '');
                return `
      <span class="filter-chip">
        <i class="fas fa-${safeIcon}"></i>
        ${safeText}
      </span>
      `;
            }).join('');
            activeFilters.classList.remove('hidden');
        } else {
            activeFilters.classList.add('hidden');
        }
    }

    function displayUsers() {
        const startIdx = (currentPage - 1) * USERS_PER_PAGE;
        const endIdx = startIdx + USERS_PER_PAGE;
        const usersToDisplay = filteredUsers.slice(startIdx, endIdx);

        // Always clear container for pagination
        userGrid.innerHTML = '';
        displayedUsers = [];

        if (usersToDisplay.length === 0) {
            noResults.classList.remove('hidden');
            updatePaginationControls();
            return;
        }

        noResults.classList.add('hidden');

        usersToDisplay.forEach((user, index) => {
            displayedUsers.push(user);
            // First 12 images eager
            const isEager = index < 12;
            const card = createUserCard(user, isEager);
            userGrid.insertAdjacentHTML('beforeend', card);
        });

        // Update pagination buttons
        updatePaginationControls();
        attachCardListeners();
    }

    // Helper to determine real online status (10 min threshold)
    function isUserOnline(user) {
        if (!user.lastActivity) return false;

        // Handle Firestore Timestamp or Date object
        const lastActive = user.lastActivity.toDate ? user.lastActivity.toDate() : new Date(user.lastActivity);
        const now = new Date();
        const diffMinutes = (now - lastActive) / 1000 / 60;

        return diffMinutes < 10;
    }


    // Helper to get badge details for availability status (Women)
    function getAvailabilityBadge(status) {
        const badges = {
            'available': { color: 'bg-green-500/20 text-green-400 border border-green-500/50', icon: 'fa-check-circle', label: 'Disponible' },
            'busy': { color: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50', icon: 'fa-clock', label: 'Ocupada' },
            'offline': { color: 'bg-slate-500/20 text-slate-400 border border-slate-500/50', icon: 'fa-power-off', label: 'Desconectada' },
            'unavailable': { color: 'bg-red-500/20 text-red-400 border border-red-500/50', icon: 'fa-times-circle', label: 'No Disponible' },
            'planned': { color: 'bg-purple-500/20 text-purple-400 border border-purple-500/50', icon: 'fa-calendar-check', label: 'Con Cita' }
        };
        return badges[status] || badges['available'];
    }

    function createUserCard(user, isEager = false) {
        // Reputation (Men) & Availability (Women) Logic
        let reputationBadge = null;
        let availabilityStatus = null;

        if (user.gender === 'femenino') {
            availabilityStatus = getAvailabilityBadge(user.availabilityStatus || 'available');
        } else {
            // Men: Default ORO, check completedDates for Platinum
            // Assuming 'completedDates' is the field name. If not present, default 0.
            reputationBadge = getReputationBadge(user.reputation || 'ORO', user.completedDates || 0);
        }

        const avatarLetter = (user.alias || user.email || 'U').charAt(0).toUpperCase();
        const hasMatched = userMatches.includes(user.id);

        // DYNAMIC ONLINE CHECK
        const isOnline = isUserOnline(user);

        const distance = user.distance ? `<span class="distance-badge"><i class="fas fa-route"></i>${user.distance.toFixed(1)} km</span>` : '';

        // AVATAR LOGIC
        const photoUrl = user.photoURL || (user.photos && user.photos.length > 0 ? user.photos[0] : null);
        let avatarHtml;

        // BORDER COLOR based on status (Women) or default (Men)
        let borderClass = 'border-slate-800'; // Default
        if (availabilityStatus) {
            // Map status color to border class approximately
            if (user.availabilityStatus === 'unavailable') borderClass = 'border-red-500';
            else if (user.availabilityStatus === 'planned') borderClass = 'border-yellow-500';
            else borderClass = 'border-green-500';
        }

        if (photoUrl) {
            if (isEager) {
                avatarHtml = `<img src="${photoUrl}" alt="${user.alias}" class="w-full h-full object-cover rounded-full">`;
            } else {
                // Lazy load for performance
                avatarHtml = `<img data-src="${photoUrl}" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3C/svg%3E" alt="${user.alias}" class="w-full h-full object-cover rounded-full bg-slate-800">`;
            }
        } else {
            avatarHtml = `
              <div class="w-full h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center text-xl md:text-3xl font-bold text-white">
                ${avatarLetter}
              </div>`;
        }

        return `
        <div class="user-card glass rounded-2xl p-3 md:p-6 cursor-pointer relative group transition-all hover:bg-white/5" data-user-id="${user.id}">
          <div class="flex items-start gap-3 md:gap-4 mb-2 md:mb-4">
            <div class="relative">
              <div class="w-14 h-14 md:w-20 md:h-20 rounded-full flex-shrink-0 overflow-hidden border-2 ${borderClass}">
                ${avatarHtml}
              </div>
              <span class="absolute bottom-0 right-0 w-3 h-3 md:w-5 md:h-5 ${isOnline ? 'bg-green-500' : 'bg-slate-500'} border-2 md:border-4 border-slate-800 rounded-full z-10" title="${isOnline ? 'En línea' : 'Desconectado'}"></span>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-1 md:gap-2 mb-1">
                <h3 class="text-base md:text-xl font-bold truncate">${user.alias || 'Usuario'}</h3>
                ${user.emailVerified ? '<i class="fas fa-certificate text-blue-400 text-xs md:text-sm" title="Verificado"></i>' :
                ''}
              </div>
              <div class="flex flex-wrap gap-1 md:gap-2 mb-1 md:mb-2">
                <span class="badge bg-slate-700/50 text-[10px] md:text-xs px-1.5 md:px-3 py-0.5 md:py-1">
                  <i class="fas fa-birthday-cake mr-1"></i>
                  ${user.age} <span class="hidden md:inline">años</span>
                </span>
                ${user.city ? `<span class="badge bg-slate-700/50 text-[10px] md:text-xs px-1.5 md:px-3 py-0.5 md:py-1" title="${user.city}">
                  <i class="fas fa-map-marker-alt mr-1"></i>
                  <span class="truncate max-w-[80px] md:max-w-[120px] inline-block align-bottom">${user.city}</span>
                </span>` : ''}
                ${distance}
              </div>

              <!-- Match Score Badge Removed / Replaced with Rating if available -->
              ${user.stats && user.stats.rating ? `
              <div class="mb-1 md:mb-2 hidden md:block">
                <div class="flex items-center gap-2">
                   <div class="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden relative">
                     <div class="absolute inset-0 bg-yellow-400/20"></div>
                     <div class="h-full bg-yellow-400" style="width: ${(user.stats.rating / 5) * 100}%"></div>
                   </div>
                   <span class="text-xs font-bold text-yellow-400">★ ${user.stats.rating.toFixed(1)}</span>
                </div>
              </div>
               <!-- Mobile Rating -->
              <div class="md:hidden flex items-center gap-1">
                 <i class="fas fa-star text-yellow-500 text-xs"></i>
                 <span class="text-[10px] font-bold text-yellow-400">${user.stats.rating.toFixed(1)}</span>
              </div>
              ` : ''}


              <!-- Status / Reputation Badge -->
              ${availabilityStatus ? `
                <span class="${availabilityStatus.color} badge text-[10px] md:text-xs px-1.5 md:px-3 py-0.5 md:py-1">
                  <i class="fas ${availabilityStatus.icon}"></i> <span class="hidden md:inline">${availabilityStatus.label}</span>
                </span>
              ` : `
                <span class="${reputationBadge.color} badge text-[10px] md:text-xs px-1.5 md:px-3 py-0.5 md:py-1">
                  ${reputationBadge.icon} <span class="hidden md:inline">${reputationBadge.label}</span>
                  ${user.completedDates >= 5 ? '<i class="fas fa-crown ml-1 text-yellow-300" title="Usuario Experimentado"></i>' : ''}
                </span>
              `}
            </div>
          </div>

          <p class="text-xs md:text-sm text-slate-300 mb-3 md:mb-4 line-clamp-2 md:min-h-[40px] min-h-[32px]">
            ${user.bio || 'Sin descripción disponible'}
          </p>

          <div class="flex gap-2 items-center">
            <button
              class="view-profile-btn flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 px-2 md:px-4 py-2 md:py-2.5 rounded-lg font-semibold transition text-xs md:text-sm text-white shadow-lg">
              <i class="fas fa-eye mr-1 md:mr-2"></i>Ver
            </button>
            
            <div class="flex gap-1.5">
               <!-- MATCH BUTTON (Always Visible) -->
               ${hasMatched ?
                '<span class="w-8 h-8 md:w-10 md:h-10 bg-yellow-500/20 text-yellow-400 rounded-lg text-sm font-semibold border border-yellow-500/30 flex items-center justify-center" title="Match Enviado"><i class="fas fa-check"></i></span>'
                :
                `<button class="quick-match-btn quick-action-btn bg-pink-500 hover:bg-pink-600 text-white w-8 h-8 md:w-10 md:h-10 rounded-lg text-sm md:text-lg shadow-lg flex items-center justify-center transition-transform active:scale-95" title="Me gusta">
                   <i class="fas fa-heart"></i>
                 </button>`
            }

                <!-- HIDE BUTTON (Hidden on mobile) -->
                <button class="hide-user-btn hidden md:flex bg-slate-700 hover:bg-slate-600 text-slate-400 hover:text-white w-10 h-10 rounded-lg text-lg shadow-lg items-center justify-center transition-colors" title="Ocultar usuario (Podrás verlo en Ocultos)">
                  <i class="fas fa-eye-slash"></i>
                </button>

                <!-- BLOCK BUTTON (Hidden on mobile) -->
                <button class="block-user-btn hidden md:flex bg-slate-800 hover:bg-red-900/80 text-slate-500 hover:text-red-200 w-10 h-10 rounded-lg text-lg shadow-lg items-center justify-center transition-colors border border-slate-700 hover:border-red-500/50" title="Bloquear permanentemente">
                  <i class="fas fa-ban"></i>
                </button>
            </div>
          </div>
        </div>
              `;
    }

    function attachCardListeners() {
        document.querySelectorAll('.user-card').forEach(card => {
            const userId = card.dataset.userId;
            const user = displayedUsers.find(u => u.id === userId);

            // View Profile
            const viewBtn = card.querySelector('.view-profile-btn');
            if (viewBtn) {
                viewBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openUserModal(user);
                });
            }

            // Quick Match
            const quickMatchBtn = card.querySelector('.quick-match-btn');
            if (quickMatchBtn) {
                quickMatchBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    quickMatch(user);
                });
            }

            // Hide User
            const hideBtn = card.querySelector('.hide-user-btn');
            if (hideBtn) {
                hideBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    hideUserAction(user);
                });
            }

            // Block User
            const blockBtn = card.querySelector('.block-user-btn');
            if (blockBtn) {
                blockBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    blockUserAction(user);
                });
            }
        });
    }

    async function hideUserAction(user) {
        if (!confirm(`¿Ocultar a ${user.alias || 'este usuario'}? Podrás restaurarlo desde la sección "Ocultos".`)) return;

        try {
            const userRef = doc(db, 'users', currentUser.uid);
            await updateDoc(userRef, {
                hiddenUsers: arrayUnion(user.id)
            });

            // Update local state
            if (!currentUserData.hiddenUsers) currentUserData.hiddenUsers = [];
            currentUserData.hiddenUsers.push(user.id);

            // Remove from view
            removeUserFromView(user.id);
            showToast('Usuario oculto correctamente', 'success');

        } catch (error) {
            console.error('Error hiding user:', error);
            showToast('Error al ocultar usuario', 'error');
        }
    }

    async function blockUserAction(user) {
        if (!confirm(`¿BLOQUEAR a ${user.alias || 'este usuario'}? \n\n⚠️ ESTA ACCIÓN ES PERMANENTE. No podrás volver a ver a este usuario.`)) return;

        try {
            const userRef = doc(db, 'users', currentUser.uid);
            await updateDoc(userRef, {
                blockedUsers: arrayUnion(user.id)
            });

            // Update local state
            if (!currentUserData.blockedUsers) currentUserData.blockedUsers = [];
            currentUserData.blockedUsers.push(user.id);

            // Remove from view
            removeUserFromView(user.id);
            showToast('Usuario bloqueado permanentemente', 'success');

        } catch (error) {
            console.error('Error blocking user:', error);
            showToast('Error al bloquear usuario', 'error');
        }
    }

    function removeUserFromView(userId) {
        // Remove from UI
        const card = document.querySelector(`.user-card[data-user-id="${userId}"]`);
        if (card) {
            card.style.transition = 'all 0.3s ease';
            card.style.opacity = '0';
            card.style.transform = 'scale(0.9)';
            setTimeout(() => card.remove(), 300);
        }

        // Remove from lists
        allUsers = allUsers.filter(u => u.id !== userId);
        filteredUsers = filteredUsers.filter(u => u.id !== userId);
        displayedUsers = displayedUsers.filter(u => u.id !== userId);
        updateUserCount();
    }

    function openUserModal(user) {
        selectedUser = user;
        const avatarLetter = (user.alias || user.email || 'U').charAt(0).toUpperCase();

        // Reputation (Men) & Availability (Women) Logic
        let reputationBadge = null;
        let availabilityStatus = null;

        if (user.gender === 'femenino') {
            availabilityStatus = getAvailabilityStatus(user.availabilityStatus || 'available');
        } else {
            reputationBadge = getReputationBadge(user.reputation || 'ORO', user.completedDates || 0);
        }

        const hasMatched = userMatches.includes(user.id);

        // 1. AVATAR & COVER
        const modalAvatarContainer = document.getElementById('modalAvatarContainer');
        // Try to find photo
        const photoUrl = user.photoURL || (user.photos && user.photos.length > 0 ? user.photos[0] : null);

        if (photoUrl) {
            modalAvatarContainer.innerHTML = `<img src="${photoUrl}" class="w-full h-full object-cover">`;
        } else {
            modalAvatarContainer.innerHTML = `<span class="text-5xl font-bold text-white">${avatarLetter}</span>`;
        }

        // Online Indicator DYNAMIC CHECK
        const onlineInd = document.getElementById('modalOnlineIndicator');
        const isOnline = isUserOnline(user);

        onlineInd.classList.remove('hidden');

        if (isOnline) {
            onlineInd.classList.remove('bg-slate-500');
            onlineInd.classList.add('bg-green-500');
        } else {
            onlineInd.classList.remove('bg-green-500');
            onlineInd.classList.add('bg-slate-500');
        }


        // 2. NAME & INFO
        document.getElementById('modalName').textContent = user.alias || 'Usuario';

        // Verified Badge
        const verBadge = document.getElementById('modalVerifiedBadge');
        if (user.emailVerified) verBadge.classList.remove('hidden');
        else verBadge.classList.add('hidden');

        // Age
        document.getElementById('modalAge').innerHTML = `<i class="fas fa-birthday-cake mr-1 text-pink-400"></i><span>${user.age || '?'} años</span>`;

        // Distance
        const distEl = document.getElementById('modalDistance');
        if (user.distance) {
            distEl.classList.remove('hidden');
            distEl.querySelector('span').textContent = `${user.distance.toFixed(1)} km`;
        } else {
            distEl.classList.add('hidden');
        }

        // Reputation / Status Badge
        const repCont = document.getElementById('modalReputationContainer');
        if (availabilityStatus) {
            repCont.innerHTML = `<span class="badge ${availabilityStatus.color} text-xs py-0.5 px-2"><i class="fas ${availabilityStatus.icon}"></i> ${sanitizer.text(availabilityStatus.label)}</span>`;
        } else {
            repCont.innerHTML = `<span class="badge ${reputationBadge.color} text-xs py-0.5 px-2">${sanitizer.text(reputationBadge.icon)} ${sanitizer.text(reputationBadge.label)}</span>
              ${user.completedDates >= 5 ? '<i class="fas fa-crown ml-1 text-yellow-300" title="Usuario Experimentado"></i>' : ''}`;
        }


        // 3. BIO
        const bioEl = document.getElementById('modalBio');
        if (user.bio && user.bio.length > 0) {
            bioEl.textContent = `"${user.bio}"`;
            bioEl.classList.remove('text-slate-500', 'not-italic');
            bioEl.classList.add('text-slate-200', 'italic');
        } else {
            bioEl.textContent = "Este usuario prefiere mantener el misterio...";
            bioEl.classList.add('text-slate-500', 'not-italic');
            bioEl.classList.remove('text-slate-200', 'italic');
        }


        // 4. STATS (Real Data - Reset Enabled)
        // Using optional chaining to safely access nested stats (reset default to 0/5.0/100)
        const stats = user.stats || {};
        const datesCount = stats.completedDates || 0;
        const ratingVal = typeof stats.rating === 'number' ? stats.rating.toFixed(1) : '5.0'; // Default high or low? User asked to "start from today". Maybe 5.0 is nice start or N/A
        const respRate = stats.responseRate !== undefined ? stats.responseRate : 100;

        document.getElementById('modalCitasCompletadas').textContent = datesCount;
        document.getElementById('modalRespuesta').textContent = `${respRate}%`;


        // 5. GALLERY (Iterate user.photos)
        const gallerySection = document.getElementById('modalGallerySection');
        const galleryGrid = document.getElementById('modalGalleryGrid');

        if (user.photos && user.photos.length > 1) { // 1 is avatar, so more than 1
            gallerySection.classList.remove('hidden');
            galleryGrid.innerHTML = user.photos.slice(1).map(url => `
                    <div class="aspect-square rounded-lg overflow-hidden bg-white/5 border border-white/10 group cursor-pointer" onclick="window.open('${url}', '_blank')">
                       <img src="${url}" class="w-full h-full object-cover transition transform group-hover:scale-110">
                    </div>
                `).join('');
        } else {
            gallerySection.classList.add('hidden');
        }


        // 6. MAP - REMOVED FOR COST OPTIMIZATION
        // Map container element was removed from HTML, skip this section
        const modalMapContainer = document.getElementById('modalMapContainer');
        if (modalMapContainer && user.location && window.google && window.google.maps) {
            modalMapContainer.classList.remove('hidden');
            setTimeout(() => {
                const userModalMapEl = document.getElementById('userModalMap');
                if (userModalMapEl) {
                    const modalMap = new google.maps.Map(userModalMapEl, {
                        zoom: 13,
                        center: { lat: user.location.lat, lng: user.location.lng },
                        disableDefaultUI: true,
                        styles: map?.get('styles') || []
                    });
                    new google.maps.Marker({
                        position: { lat: user.location.lat, lng: user.location.lng },
                        map: modalMap
                    });
                }
            }, 100);
        }


        // 7. INTERESTS
        const interests = ['Música', 'Viajes', 'Deportes', 'Cine', 'Lectura', 'Baile', 'Cocina'];

        let userIdHash = 0;
        if (user.id) {
            for (let i = 0; i < user.id.length; i++) {
                userIdHash = ((userIdHash << 5) - userIdHash) + user.id.charCodeAt(i);
                userIdHash |= 0; // Convert to 32bit integer
            }
            userIdHash = Math.abs(userIdHash);
        }

        const interestCount = (userIdHash % 3) + 2;
        const startIndex = userIdHash % interests.length;
        const userInterests = [];
        for (let i = 0; i < interestCount; i++) { userInterests.push(interests[(startIndex + i) % interests.length]); }

        const interestsSec = document.getElementById('modalInterestsSection');
        if (userInterests.length > 0) {
            interestsSec.classList.remove('hidden');
            document.getElementById('modalInterests').innerHTML = userInterests.map(i =>
                `<span class="px-3 py-1 rounded-full bg-white/10 text-xs text-white border border-white/20">${i}</span>`
            ).join('');
        } else {
            interestsSec.classList.add('hidden');
        }


        // 8. BUTTON STATUS
        const matchedMsg = document.getElementById('alreadyMatchedMsg');

        if (hasMatched) {
            matchedMsg.classList.remove('hidden');
            sendMatchBtn.innerHTML = '<i class="fas fa-check"></i> <span>Enviado</span>';
            sendMatchBtn.classList.add('opacity-50', 'cursor-not-allowed'); // Keep as cursor-not-allowed for styling
        } else {
            matchedMsg.classList.add('hidden');
            sendMatchBtn.innerHTML = '<i class="fas fa-heart"></i> <span>Conectar</span>';
            sendMatchBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }

        userModal.classList.remove('opacity-0', 'pointer-events-none');
    }

    // Helper function to create conversation
    async function createConversation(otherUserId, otherUserData) {
        try {
            // Check if conversation already exists
            const convQuery = query(
                collection(db, 'conversations'),
                where('participants', 'array-contains', currentUser.uid)
            );
            const convSnapshot = await getDocs(convQuery);

            let conversationExists = false;
            convSnapshot.forEach((doc) => {
                const participants = doc.data().participants;
                if (participants.includes(otherUserId)) {
                    conversationExists = true;
                }
            });

            // Only create if doesn't exist
            if (!conversationExists) {
                await addDoc(collection(db, 'conversations'), {
                    participants: [currentUser.uid, otherUserId],
                    participantsData: {
                        [currentUser.uid]: {
                            alias: currentUserData.alias || currentUser.email,
                            gender: currentUserData.gender,
                            unreadCount: 0
                        },
                        [otherUserId]: {
                            alias: otherUserData.alias || otherUserData.email,
                            gender: otherUserData.gender,
                            unreadCount: 0
                        }
                    },
                    lastMessage: '',
                    lastMessageTime: serverTimestamp(),
                    lastMessageSenderId: '',
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });
                console.log('Conversation created successfully');
            }
        } catch (error) {
            console.error('Error creating conversation:', error);
        }
    }

    async function quickMatch(user) {
        if (userMatches.includes(user.id)) {
            showToast('Ya enviaste solicitud a este usuario', 'warning');
            return;
        }

        // ✅ VALIDACIÓN DE PAGOS
        const paymentStatus = checkPaymentStatus();
        if (!paymentStatus.canUse) {
            showPaymentRequiredModal(paymentStatus.reason, paymentStatus.title, paymentStatus.message);
            return;
        }

        try {
            await addDoc(collection(db, 'matches'), {
                senderId: currentUser.uid,
                senderName: currentUserData.alias || currentUser.email,
                receiverId: user.id,
                receiverName: user.alias || user.email,
                status: 'pending',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            // Create conversation automatically
            await createConversation(user.id, user);

            userMatches.push(user.id);
            showToast('¡Solicitud enviada!', 'success');

            const card = document.querySelector(`[data - user - id="${user.id}"]`);
            if (card) {
                card.outerHTML = createUserCard(user);
                attachCardListeners();
            }
        } catch (error) {
            console.error('Error sending match:', error);
            showToast('Error al enviar solicitud', 'error');
        }
    }

    function updateUserCount() {
        if (userCount) {
            userCount.textContent = filteredUsers.length;
        }
    }

    function showLoading() {
        loading.classList.remove('hidden');
        userGrid.innerHTML = '';
        noResults.classList.add('hidden');
    }

    function hideLoading() {
        loading.classList.add('hidden');
    }

    function saveFilters() {
        const filters = getFilters();
        localStorage.setItem('userSearchFilters', JSON.stringify(filters));
    }

    function loadSavedFilters() {
        try {
            const saved = localStorage.getItem('userSearchFilters');
            if (saved) {
                const filters = JSON.parse(saved);
                if (filters.ageMin) document.getElementById('filterAgeMin').value = filters.ageMin;
                if (filters.ageMax) document.getElementById('filterAgeMax').value = filters.ageMax;
                if (filters.distance) document.getElementById('filterDistance').value = filters.distance;
                if (filters.reputation) document.getElementById('filterReputation').value = filters.reputation;
                if (filters.verified) document.getElementById('filterVerified').checked = filters.verified;
                if (filters.online) document.getElementById('filterOnline').checked = filters.online;
                if (filters.sortBy) sortBy.value = filters.sortBy;
            }
        } catch (error) {
            console.error('Error loading saved filters:', error);
        }
    }

    // View Toggle
    viewList.addEventListener('click', () => {
        currentView = 'list';
        viewList.classList.add('active');
        if (viewMap) viewMap.classList.remove('active');
        if (mapContainer) mapContainer.classList.add('hidden');
        gridContainer.classList.remove('hidden');
        // loadMoreContainer.classList.remove('hidden'); // REMOVED
        updatePaginationControls();
    });

    // Only add event listener if viewMap element exists
    if (viewMap) {
        viewMap.addEventListener('click', () => {
            currentView = 'map';
            viewMap.classList.add('active');
            viewList.classList.remove('active');
            gridContainer.classList.add('hidden');
            loadMoreContainer.classList.add('hidden');
            if (mapContainer) mapContainer.classList.remove('hidden');

            if (map) {
                google.maps.event.trigger(map, 'resize');
                addMarkersToMap(filteredUsers);
            }
        });
    }



    let searchTimeout;
    document.getElementById('searchText').addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            applyFiltersAndSort();
        }, 500);
    });

    /* loadMoreBtn.addEventListener('click', () => {
        currentPage++;
        displayUsers();
    }); */

    closeModal.addEventListener('click', () => {
        userModal.classList.add('opacity-0', 'pointer-events-none');
    });

    skipUserBtn.addEventListener('click', () => {
        userModal.classList.add('opacity-0', 'pointer-events-none');
    });

    sendMatchBtn.addEventListener('click', async () => {
        if (!selectedUser || userMatches.includes(selectedUser.id)) return;

        // ✅ VALIDACIÓN DE PAGOS
        const paymentStatus = checkPaymentStatus();
        if (!paymentStatus.canUse) {
            userModal.classList.add('opacity-0', 'pointer-events-none'); // Cerrar modal de usuario
            showPaymentRequiredModal(paymentStatus.reason, paymentStatus.title, paymentStatus.message);
            return;
        }

        sendMatchBtn.disabled = true;
        sendMatchBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Enviando...';

        try {
            await addDoc(collection(db, 'matches'), {
                senderId: currentUser.uid,
                senderName: currentUserData.alias || currentUser.email,
                receiverId: selectedUser.id,
                receiverName: selectedUser.alias || selectedUser.email,
                status: 'pending',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            // Create conversation automatically
            await createConversation(selectedUser.id, selectedUser);

            userMatches.push(selectedUser.id);
            showToast('¡Solicitud enviada!', 'success');

            // Updates UI
            openUserModal(selectedUser);

            const card = document.querySelector(`[data-user-id="${selectedUser.id}"]`);
            if (card) {
                card.outerHTML = createUserCard(selectedUser);
                attachCardListeners();
            }
        } catch (error) {
            console.error('Error sending match:', error);
            showToast('Error al enviar solicitud', 'error');
        } finally {
            sendMatchBtn.disabled = false;
            sendMatchBtn.innerHTML = '<i class="fas fa-heart mr-2"></i>Enviar Solicitud de Cita';
        }
    });

    // START CHAT FUNCTION
    // Event listener already attached if element exists.
    if (startChatBtn) {
        startChatBtn.onclick = async () => {
            if (!selectedUser) return;
            await startChat(selectedUser);
        };
    }

    window.startChat = async function (user) {
        // 1. Validate Access
        const paymentStatus = checkPaymentStatus();
        if (!paymentStatus.canUse) {
            userModal.classList.add('opacity-0', 'pointer-events-none');
            showPaymentRequiredModal(paymentStatus.reason, paymentStatus.title, paymentStatus.message);
            return;
        }

        const btn = document.getElementById('startChatBtn') || document.createElement('button'); // Fallback
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        btn.disabled = true;

        try {
            // 2. Check for existing conversation
            const convQuery = query(
                collection(db, 'conversations'),
                where('participants', 'array-contains', currentUser.uid)
            );
            const convSnapshot = await getDocs(convQuery);

            let conversationId = null;
            convSnapshot.forEach(doc => {
                const data = doc.data();
                if (data.participants.includes(user.id)) {
                    conversationId = doc.id;
                }
            });

            // 3. Create if not exists
            if (!conversationId) {
                const newConv = await addDoc(collection(db, 'conversations'), {
                    participants: [currentUser.uid, user.id],
                    participantsData: {
                        [currentUser.uid]: {
                            alias: currentUserData.alias || currentUser.email,
                            gender: currentUserData.gender,
                            unreadCount: 0
                        },
                        [user.id]: {
                            alias: user.alias || user.email,
                            gender: user.gender,
                            unreadCount: 0
                        }
                    },
                    lastMessage: '',
                    lastMessageTime: serverTimestamp(),
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });
                conversationId = newConv.id;

                // Also ensure match exists implicitly?
                if (!userMatches.includes(user.id)) {
                    await addDoc(collection(db, 'matches'), {
                        senderId: currentUser.uid,
                        senderName: currentUserData.alias || currentUser.email,
                        receiverId: user.id,
                        receiverName: user.alias || user.email,
                        status: 'pending',
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp()
                    });
                    userMatches.push(user.id);
                }
            }

            // 4. Redirect
            window.location.href = `/chat.html?conversationId=${conversationId}&userId=${user.id}`;

        } catch (error) {
            console.error('Error starting chat:', error);
            showToast('Error al iniciar chat', 'error');
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    };

    logoutBtn.addEventListener('click', async () => {
        try {
            await signOut(auth);
            window.location.href = '/login.html';
        } catch (error) {
            console.error('Error signing out:', error);
        }
    });

    userModal.addEventListener('click', (e) => {
        if (e.target === userModal) {
            userModal.classList.add('opacity-0', 'pointer-events-none');
        }
    });

    // Payment Modal event listeners
    closePaymentModal.addEventListener('click', () => {
        paymentModal.classList.add('opacity-0', 'pointer-events-none');
    });

    paymentModal.addEventListener('click', (e) => {
        if (e.target === paymentModal) {
            paymentModal.classList.add('opacity-0', 'pointer-events-none');
        }
    });

})();
