import './firebase-appcheck.js';
import { auth, storage, getDb } from './firebase-config-env.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
    collection,
    query,
    where,
    getDocs,
    addDoc,
    updateDoc,
    doc,
    getDoc,
    serverTimestamp
} from 'firebase/firestore';
import { loadTheme } from './theme.js';
import './image-optimizer.js';
import { sanitizer } from './sanitizer.js';

(async () => {
    const db = await getDb();



    let currentUser = null;
    let currentUserData = null;
    let eventData = null;
    let eventId = null;
    let applications = [];
    let currentTab = 'pending';

    // Get event ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    eventId = urlParams.get('eventId');

    if (!eventId) {
        alert('ID de evento no especificado');
        window.location.href = '/eventos-vip.html';
    }

    // Check authentication
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = '/login.html';
            return;
        }

        currentUser = user;
        // inner import removed
        // db initialized in outer scope

        // Load user data
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
            currentUserData = { id: userDoc.id, ...userDoc.data() };
            loadTheme(currentUserData);

            // Load event
            await loadEventDetails();

            document.getElementById('loading').classList.add('hidden');
            document.getElementById('content').classList.remove('hidden');
        }
    });

    // Load event details
    async function loadEventDetails() {
        try {
            // inner import removed
            // db initialized in outer scope
            const eventDoc = await getDoc(doc(db, 'vip_events', eventId));

            if (!eventDoc.exists()) {
                showToast('Evento no encontrado', 'error');
                setTimeout(() => window.location.href = '/eventos-vip.html', 2000);
                return;
            }

            eventData = { id: eventDoc.id, ...eventDoc.data() };

            // Render event details
            renderEventDetails();

            // Determine view
            const isConcierge = currentUserData.userRole === 'concierge' &&
                eventData.conciergeId === currentUser.uid;

            if (isConcierge) {
                // Show concierge view
                document.getElementById('conciergeView').classList.remove('hidden');
                await loadApplications();
            } else if (currentUserData.gender === 'femenino') {
                // Show applicant view
                document.getElementById('applicantView').classList.remove('hidden');
                await checkIfAlreadyApplied();
            } else {
                showToast('No tienes acceso a este evento', 'error');
                setTimeout(() => window.location.href = '/perfil.html', 2000);
            }

        } catch (error) {
            console.error('Error loading event:', error);
            showToast('Error al cargar evento', 'error');
        }
    }

    // Render event details
    function renderEventDetails() {
        const eventDate = eventData.eventDate?.toDate();
        const formattedDate = eventDate ? eventDate.toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }) : 'Fecha no disponible';

        const spotsLeft = eventData.spotsAvailable - (eventData.spotsSelected || 0);

        const eventTypeNames = {
            dinner: 'Cena',
            party: 'Fiesta',
            travel: 'Viaje',
            networking: 'Networking',
            other: 'Otro'
        };

        // SECURITY: Sanitize all user-provided data to prevent XSS
        const safeTitle = sanitizer.text(eventData.title || 'Sin título');
        const safeConcierge = sanitizer.text(eventData.conciergeName || 'Concierge');
        const safeCity = sanitizer.text(eventData.location?.city || 'N/A');
        const safeAddress = sanitizer.text(eventData.location?.address || '');
        const safeDescription = sanitizer.text(eventData.description || 'Sin descripción');
        const safeEventType = sanitizer.text(eventTypeNames[eventData.eventType] || 'Otro');

        document.getElementById('eventDetails').innerHTML = `
        <div class="flex justify-between items-start mb-6">
          <div class="flex-1">
            <h1 class="text-white text-3xl md:text-4xl font-bold mb-2">${safeTitle}</h1>
            <p class="text-white text-opacity-80">
              <i class="fas fa-user-tie mr-2"></i>
              Publicado por: <span class="font-semibold">${safeConcierge}</span>
              <span class="bg-gradient-to-r from-amber-500 to-yellow-600 px-2 py-1 rounded text-xs ml-2">🎩 Verificado</span>
            </p>
          </div>
          <span class="bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 rounded-full text-white font-bold">
            💎 VIP
          </span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div class="bg-white bg-opacity-10 rounded-lg p-4">
            <p class="text-white text-opacity-70 text-sm mb-1">Fecha y Hora</p>
            <p class="text-white font-semibold">
              <i class="fas fa-calendar mr-2"></i>${formattedDate}
            </p>
          </div>

          <div class="bg-white bg-opacity-10 rounded-lg p-4">
            <p class="text-white text-opacity-70 text-sm mb-1">Ubicación</p>
            <p class="text-white font-semibold">
              <i class="fas fa-map-marker-alt mr-2"></i>${safeCity}
            </p>
            <p class="text-white text-opacity-80 text-sm">${safeAddress}</p>
          </div>

          <div class="bg-white bg-opacity-10 rounded-lg p-4">
            <p class="text-white text-opacity-70 text-sm mb-1">Compensación</p>
            <p class="text-white font-bold text-2xl text-green-300">
              <i class="fas fa-euro-sign mr-2"></i>${eventData.compensation?.amount || 0}
            </p>
            <p class="text-white text-opacity-70 text-xs">por persona</p>
          </div>
        </div>

        <div class="bg-white bg-opacity-10 rounded-lg p-4 mb-6">
          <p class="text-white text-opacity-70 text-sm mb-2">Tipo de Evento</p>
          <p class="text-white font-semibold">${safeEventType}</p>
        </div>

        <div class="mb-6">
          <h3 class="text-white text-xl font-bold mb-3">Descripción</h3>
          <p class="text-white text-opacity-90 leading-relaxed">${safeDescription}</p>
        </div>

        <div class="mb-6">
          <h3 class="text-white text-xl font-bold mb-3">Requisitos</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div class="bg-white bg-opacity-10 rounded-lg p-3">
              <i class="fas fa-birthday-cake mr-2 text-purple-300"></i>
              <span class="text-white">Edad: ${eventData.requirements?.minAge || 18} - ${eventData.requirements?.maxAge || 99} años</span>
            </div>
            <div class="bg-white bg-opacity-10 rounded-lg p-3">
              <i class="fas fa-users mr-2 text-blue-300"></i>
              <span class="text-white">Plazas: ${spotsLeft} disponibles de ${eventData.spotsAvailable}</span>
            </div>
            ${eventData.requirements?.dresscode ? `
            <div class="bg-white bg-opacity-10 rounded-lg p-3">
              <i class="fas fa-tshirt mr-2 text-pink-300"></i>
              <span class="text-white">Vestimenta: ${eventData.requirements.dresscode}</span>
            </div>
            ` : ''}
            ${eventData.requirements?.other ? `
            <div class="bg-white bg-opacity-10 rounded-lg p-3 md:col-span-2">
              <i class="fas fa-info-circle mr-2 text-yellow-300"></i>
              <span class="text-white">${eventData.requirements.other}</span>
            </div>
            ` : ''}
          </div>
        </div>
      `;
    }

    // Check if user already applied
    async function checkIfAlreadyApplied() {
        try {
            const applicationsQuery = query(
                collection(db, 'vip_applications'),
                where('eventId', '==', eventId),
                where('userId', '==', currentUser.uid)
            );

            const applicationsSnapshot = await getDocs(applicationsQuery);

            if (!applicationsSnapshot.empty) {
                document.getElementById('alreadyApplied').classList.remove('hidden');
                document.getElementById('applicationForm').classList.add('hidden');
            }

        } catch (error) {
            console.error('Error checking application:', error);
        }
    }

    // Apply to event
    document.getElementById('applyForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        try {
            const userAge = calculateAge(currentUserData.birthDate);

            // Check age requirements
            if (userAge < eventData.requirements?.minAge || userAge > eventData.requirements?.maxAge) {
                showToast('No cumples con los requisitos de edad para este evento', 'error');
                return;
            }

            const application = {
                eventId: eventId,
                userId: currentUser.uid,
                userName: currentUserData.alias || currentUserData.email.split('@')[0],
                userPhoto: currentUserData.photoURL || '',
                userAge: userAge,
                userCity: currentUserData.city || 'No especificada',

                motivation: document.getElementById('motivation').value,
                availability: true,

                status: 'pending',

                appliedAt: serverTimestamp()
            };

            await addDoc(collection(db, 'vip_applications'), application);

            showToast('¡Aplicación enviada exitosamente!', 'success');

            document.getElementById('alreadyApplied').classList.remove('hidden');
            document.getElementById('applicationForm').classList.add('hidden');

        } catch (error) {
            console.error('Error applying to event:', error);
            showToast('Error al enviar aplicación: ' + error.message, 'error');
        }
    });

    // Load applications (concierge view)
    async function loadApplications() {
        try {
            const applicationsQuery = query(
                collection(db, 'vip_applications'),
                where('eventId', '==', eventId)
            );

            const applicationsSnapshot = await getDocs(applicationsQuery);
            applications = [];

            for (const appDoc of applicationsSnapshot.docs) {
                const appData = { id: appDoc.id, ...appDoc.data() };
                applications.push(appData);
            }

            updateApplicationCounts();
            renderApplications();

        } catch (error) {
            console.error('Error loading applications:', error);
            showToast('Error al cargar aplicantes', 'error');
        }
    }

    // Update application counts
    function updateApplicationCounts() {
        const pending = applications.filter(app => app.status === 'pending').length;
        const selected = applications.filter(app => app.status === 'selected').length;
        const rejected = applications.filter(app => app.status === 'rejected').length;

        document.getElementById('applicantsCount').textContent = applications.length;
        document.getElementById('pendingCount').textContent = pending;
        document.getElementById('selectedCount').textContent = selected;
        document.getElementById('rejectedCount').textContent = rejected;
    }

    // Render applications
    function renderApplications() {
        const applicantsList = document.getElementById('applicantsList');
        const noApplicants = document.getElementById('noApplicants');

        const filteredApps = applications.filter(app => app.status === currentTab);

        if (filteredApps.length === 0) {
            applicantsList.innerHTML = '';
            noApplicants.classList.remove('hidden');
            noApplicants.querySelector('p').textContent = `No hay aplicantes ${currentTab === 'pending' ? 'pendientes' : currentTab === 'selected' ? 'seleccionadas' : 'rechazadas'}`;
            return;
        }

        noApplicants.classList.add('hidden');
        applicantsList.innerHTML = '';

        filteredApps.forEach((app) => {
            const appCard = createApplicantCard(app);
            applicantsList.appendChild(appCard);
        });
    }

    // Create applicant card
    function createApplicantCard(app) {
        const appliedDate = app.appliedAt?.toDate();
        const formattedDate = appliedDate ? appliedDate.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }) : 'Fecha no disponible';

        // SECURITY: Sanitize user data to prevent XSS
        const safeName = sanitizer.text(app.userName || 'Usuario');
        const safeAge = sanitizer.text(String(app.userAge || ''));
        const safeCity = sanitizer.text(app.userCity || '');
        const safeMotivation = sanitizer.text(app.motivation || 'Sin mensaje');
        const safePhoto = app.userPhoto ? sanitizer.url(app.userPhoto) : null;
        const safeId = sanitizer.attribute(app.id || ''); // Sanitize for use in attributes
        const safeInitial = safeName.charAt(0).toUpperCase();

        const card = document.createElement('div');
        card.className = 'applicant-card p-6';
        card.innerHTML = `
        <div class="flex items-start space-x-4">
          <div class="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white text-2xl font-bold">
            ${safePhoto ? `<img src="${safePhoto}" class="w-full h-full rounded-full object-cover">` : safeInitial}
          </div>

          <div class="flex-1">
            <div class="flex justify-between items-start mb-2">
              <div>
                <h3 class="text-white font-bold text-xl">${safeName}</h3>
                <p class="text-white text-opacity-70 text-sm">
                  ${safeAge} años • ${safeCity}
                </p>
              </div>
              <span class="text-white text-opacity-60 text-xs">${formattedDate}</span>
            </div>

            <div class="bg-white bg-opacity-10 rounded-lg p-3 mb-4">
              <p class="text-white text-opacity-80 text-sm italic">"${safeMotivation}"</p>
            </div>

            ${app.status === 'pending' ? `
              <div class="flex space-x-3">
                <button data-app-id="${safeId}" data-action="select" class="applicant-action-btn flex-1 bg-green-500 hover:bg-green-600 px-4 py-2 rounded-lg text-white font-semibold transition">
                  <i class="fas fa-check mr-2"></i>Seleccionar
                </button>
                <button data-app-id="${safeId}" data-action="reject" class="applicant-action-btn flex-1 bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg text-white font-semibold transition">
                  <i class="fas fa-times mr-2"></i>Rechazar
                </button>
              </div>
            ` : app.status === 'selected' ? `
              <div class="flex items-center justify-between">
                <span class="bg-green-500 px-4 py-2 rounded-full text-white font-semibold">
                  <i class="fas fa-check-circle mr-2"></i>Seleccionada
                </span>
                <button data-app-id="${safeId}" data-action="unselect" class="applicant-action-btn text-white text-opacity-70 hover:text-opacity-100 text-sm transition">
                  <i class="fas fa-undo mr-1"></i>Quitar selección
                </button>
              </div>
            ` : `
              <div class="flex items-center justify-between">
                <span class="bg-red-500 px-4 py-2 rounded-full text-white font-semibold">
                  <i class="fas fa-times-circle mr-2"></i>Rechazada
                </span>
                <button data-app-id="${safeId}" data-action="reconsider" class="applicant-action-btn text-white text-opacity-70 hover:text-opacity-100 text-sm transition">
                  <i class="fas fa-undo mr-1"></i>Reconsiderar
                </button>
              </div>
            `}
          </div>
        </div>
      `;

        // SECURITY: Add event listeners using event delegation (safer than onclick)
        card.querySelectorAll('.applicant-action-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const action = e.currentTarget.dataset.action;
                const appId = e.currentTarget.dataset.appId;

                if (action === 'select') {
                    await selectApplicant(appId);
                } else if (action === 'reject') {
                    await rejectApplicant(appId);
                } else if (action === 'unselect') {
                    await unselectApplicant(appId);
                } else if (action === 'reconsider') {
                    await reconsiderApplicant(appId);
                }
            });
        });

        return card;
    }

    // Select applicant
    window.selectApplicant = async (applicationId) => {
        try {
            await updateDoc(doc(db, 'vip_applications', applicationId), {
                status: 'selected',
                selectedAt: serverTimestamp()
            });

            showToast('Candidata seleccionada', 'success');
            await loadApplications();

        } catch (error) {
            console.error('Error selecting applicant:', error);
            showToast('Error al seleccionar candidata', 'error');
        }
    };

    // Reject applicant
    window.rejectApplicant = async (applicationId) => {
        try {
            await updateDoc(doc(db, 'vip_applications', applicationId), {
                status: 'rejected',
                reviewedAt: serverTimestamp()
            });

            showToast('Candidata rechazada', 'success');
            await loadApplications();

        } catch (error) {
            console.error('Error rejecting applicant:', error);
            showToast('Error al rechazar candidata', 'error');
        }
    };

    // Unselect applicant
    window.unselectApplicant = async (applicationId) => {
        try {
            await updateDoc(doc(db, 'vip_applications', applicationId), {
                status: 'pending'
            });

            showToast('Selección removida', 'success');
            await loadApplications();

        } catch (error) {
            console.error('Error unselecting applicant:', error);
            showToast('Error al remover selección', 'error');
        }
    };

    // Reconsider applicant
    window.reconsiderApplicant = async (applicationId) => {
        try {
            await updateDoc(doc(db, 'vip_applications', applicationId), {
                status: 'pending'
            });

            showToast('Candidata reconsiderada', 'success');
            await loadApplications();

        } catch (error) {
            console.error('Error reconsidering applicant:', error);
            showToast('Error al reconsiderar candidata', 'error');
        }
    };

    // Tab switching
    document.getElementById('tabPending').addEventListener('click', () => {
        currentTab = 'pending';
        updateTabStyles();
        renderApplications();
    });

    document.getElementById('tabSelected').addEventListener('click', () => {
        currentTab = 'selected';
        updateTabStyles();
        renderApplications();
    });

    document.getElementById('tabRejected').addEventListener('click', () => {
        currentTab = 'rejected';
        updateTabStyles();
        renderApplications();
    });

    function updateTabStyles() {
        document.getElementById('tabPending').className = currentTab === 'pending' ?
            'px-6 py-2 rounded-lg text-white font-semibold bg-yellow-500 transition' :
            'px-6 py-2 rounded-lg text-white font-semibold bg-white bg-opacity-20 hover:bg-opacity-30 transition';

        document.getElementById('tabSelected').className = currentTab === 'selected' ?
            'px-6 py-2 rounded-lg text-white font-semibold bg-green-500 transition' :
            'px-6 py-2 rounded-lg text-white font-semibold bg-white bg-opacity-20 hover:bg-opacity-30 transition';

        document.getElementById('tabRejected').className = currentTab === 'rejected' ?
            'px-6 py-2 rounded-lg text-white font-semibold bg-red-500 transition' :
            'px-6 py-2 rounded-lg text-white font-semibold bg-white bg-opacity-20 hover:bg-opacity-30 transition';
    }

    // Calculate age
    function calculateAge(birthDate) {
        if (!birthDate) return 0;
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    }

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        try {
            await signOut(auth);
            window.location.href = '/login.html';
        } catch (error) {
            console.error('Error signing out:', error);
            showToast('Error al cerrar sesión', 'error');
        }
    });

    // Toast notification
    function showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toastMessage');
        const toastIcon = document.getElementById('toastIcon');

        toastMessage.textContent = message;

        if (type === 'success') {
            toastIcon.className = 'fas fa-check-circle text-green-400 text-2xl';
        } else if (type === 'error') {
            toastIcon.className = 'fas fa-exclamation-circle text-red-400 text-2xl';
        }

        toast.classList.remove('hidden');

        setTimeout(() => {
            toast.classList.add('hidden');
        }, 4000);
    }

    // Expose showToast globally for inline onclick handlers
    window.showToast = showToast;

})();
