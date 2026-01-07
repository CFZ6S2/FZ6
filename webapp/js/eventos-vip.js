import './firebase-appcheck.js';
import { auth, storage, getDb } from './firebase-config-env.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
    collection,
    query,
    where,
    orderBy,
    getDocs,
    doc,
    getDoc,
    Timestamp
} from 'firebase/firestore';
import { loadTheme } from './theme.js';
import './image-optimizer.js';

(async () => {
    const db = await getDb();



    let currentUser = null;
    let currentUserData = null;
    let allEvents = [];
    let myApplications = [];

    // Check authentication
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = '/login.html';
            return;
        }
        if (user) {
            currentUser = user;
            // inner import removed
            // db initialized in outer scope

            // Load user data
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
                currentUserData = { id: userDoc.id, ...userDoc.data() };

                // Load theme
                loadTheme(currentUserData);

                // Verificar que sea mujer
                if (currentUserData.gender !== 'femenino') {
                    showToast('Acceso denegado. Solo disponible para mujeres.', 'error');
                    setTimeout(() => {
                        window.location.href = '/perfil.html';
                    }, 2000);
                    return;
                }

                // Load events and applications
                await loadMyApplications();
                await loadVIPEvents();

                document.getElementById('loading').classList.add('hidden');
                document.getElementById('content').classList.remove('hidden');
            }
        }
    });

    // Load VIP Events
    async function loadVIPEvents() {
        try {
            const eventsQuery = query(
                collection(db, 'vip_events'),
                where('status', '==', 'published'),
                orderBy('eventDate', 'asc')
            );

            const eventsSnapshot = await getDocs(eventsQuery);
            allEvents = [];

            eventsSnapshot.forEach((eventDoc) => {
                const eventData = { id: eventDoc.id, ...eventDoc.data() };

                // Solo mostrar eventos futuros
                const eventDate = eventData.eventDate?.toDate();
                if (eventDate && eventDate > new Date()) {
                    allEvents.push(eventData);
                }
            });

            renderEvents(allEvents);

        } catch (error) {
            console.error('Error loading VIP events:', error);
            showToast('Error al cargar eventos VIP', 'error');
            document.getElementById('noEvents').classList.remove('hidden');
        }
    }

    // Load user's applications
    async function loadMyApplications() {
        try {
            const applicationsQuery = query(
                collection(db, 'vip_applications'),
                where('userId', '==', currentUser.uid),
                orderBy('appliedAt', 'desc')
            );

            const applicationsSnapshot = await getDocs(applicationsQuery);
            myApplications = [];

            for (const appDoc of applicationsSnapshot.docs) {
                const appData = { id: appDoc.id, ...appDoc.data() };

                // Get event details
                const eventDoc = await getDoc(doc(db, 'vip_events', appData.eventId));
                if (eventDoc.exists()) {
                    appData.eventData = { id: eventDoc.id, ...eventDoc.data() };
                    myApplications.push(appData);
                }
            }

            renderMyApplications();

        } catch (error) {
            console.error('Error loading applications:', error);
        }
    }

    // Render my applications
    function renderMyApplications() {
        const myApplicationsList = document.getElementById('myApplicationsList');
        const noApplications = document.getElementById('noApplications');

        if (myApplications.length === 0) {
            myApplicationsList.innerHTML = '';
            noApplications.classList.remove('hidden');
            return;
        }

        noApplications.classList.add('hidden');
        myApplicationsList.innerHTML = '';

        myApplications.forEach((app) => {
            const eventData = app.eventData;
            const eventDate = eventData.eventDate?.toDate();
            const formattedDate = eventDate ? eventDate.toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }) : 'Fecha no disponible';

            let statusBadge = '';
            let statusClass = '';

            if (app.status === 'pending') {
                statusBadge = '<span class="bg-yellow-500 px-3 py-1 rounded-full text-white text-xs font-bold">⏳ Pendiente</span>';
                statusClass = 'border-yellow-400';
            } else if (app.status === 'selected') {
                statusBadge = '<span class="bg-green-500 px-3 py-1 rounded-full text-white text-xs font-bold">✅ Seleccionada</span>';
                statusClass = 'border-green-400';
            } else if (app.status === 'rejected') {
                statusBadge = '<span class="bg-red-500 px-3 py-1 rounded-full text-white text-xs font-bold">❌ No Seleccionada</span>';
                statusClass = 'border-red-400';
            }

            // SECURITY: Sanitize event data to prevent XSS
            const safeTitle = sanitizer.text(eventData.title || 'Sin título');
            const safeCity = sanitizer.text(eventData.location?.city || 'Ciudad no disponible');
            const safeEventId = sanitizer.attribute(eventData.id || '');

            const appCard = document.createElement('div');
            appCard.className = `event-card p-4 border-l-4 ${statusClass}`;
            appCard.innerHTML = `
          <div class="flex justify-between items-start">
            <div class="flex-1">
              <h3 class="text-white font-bold text-lg mb-1">${safeTitle}</h3>
              <p class="text-white text-opacity-70 text-sm mb-2">
                <i class="fas fa-calendar mr-1"></i>${formattedDate}
              </p>
              <p class="text-white text-opacity-70 text-sm">
                <i class="fas fa-map-marker-alt mr-1"></i>${safeCity}
              </p>
            </div>
            <div class="text-right">
              ${statusBadge}
              <p class="text-white text-opacity-60 text-xs mt-2">
                Aplicado: ${app.appliedAt?.toDate().toLocaleDateString('es-ES')}
              </p>
            </div>
          </div>
          <div class="mt-3 pt-3 border-t border-white border-opacity-20">
            <button onclick="window.location.href='/evento-detalle.html?eventId=${safeEventId}'" class="text-white text-sm hover:text-purple-200 transition">
              Ver Detalles del Evento <i class="fas fa-arrow-right ml-1"></i>
            </button>
          </div>
        `;

            myApplicationsList.appendChild(appCard);
        });
    }

    // Render events
    function renderEvents(events) {
        const eventsList = document.getElementById('eventsList');
        const noEvents = document.getElementById('noEvents');

        if (events.length === 0) {
            eventsList.innerHTML = '';
            noEvents.classList.remove('hidden');
            return;
        }

        noEvents.classList.add('hidden');
        eventsList.innerHTML = '';

        events.forEach((event) => {
            const eventCard = createEventCard(event);
            eventsList.appendChild(eventCard);
        });
    }

    // Create event card
    function createEventCard(event) {
        const eventDate = event.eventDate?.toDate();
        const formattedDate = eventDate ? eventDate.toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }) : 'Fecha no disponible';

        const spotsLeft = event.spotsAvailable - (event.spotsSelected || 0);
        const hasApplied = myApplications.some(app => app.eventId === event.id);

        const eventTypeIcons = {
            dinner: '🍷',
            party: '🎉',
            travel: '✈️',
            networking: '🤝',
            other: '⭐'
        };

        const eventIcon = eventTypeIcons[event.eventType] || '⭐';

        const card = document.createElement('div');
        card.className = 'event-card p-6';
        card.innerHTML = `
        <div class="flex justify-between items-start mb-4">
          <span class="badge-vip px-3 py-1 rounded-full text-white text-xs font-bold">
            💎 VIP
          </span>
          ${hasApplied ? '<span class="bg-green-500 px-3 py-1 rounded-full text-white text-xs font-bold">✓ Aplicaste</span>' : ''}
        </div>

        <div class="mb-4">
          <h3 class="text-white font-bold text-xl mb-2">${eventIcon} ${event.title || 'Sin título'}</h3>
          <p class="text-white text-opacity-70 text-sm line-clamp-2">${event.description || 'Sin descripción'}</p>
        </div>

        <div class="space-y-2 mb-4">
          <div class="flex items-center text-white text-opacity-80 text-sm">
            <i class="fas fa-user-tie w-5"></i>
            <span class="badge-concierge px-2 py-1 rounded text-xs ml-2">🎩 ${event.conciergeName || 'Concierge'}</span>
          </div>

          <div class="flex items-center text-white text-opacity-80 text-sm">
            <i class="fas fa-calendar w-5"></i>
            <span class="ml-2">${formattedDate}</span>
          </div>

          <div class="flex items-center text-white text-opacity-80 text-sm">
            <i class="fas fa-map-marker-alt w-5"></i>
            <span class="ml-2">${event.location?.city || 'Ciudad no disponible'}</span>
          </div>

          <div class="flex items-center text-white text-opacity-80 text-sm">
            <i class="fas fa-euro-sign w-5"></i>
            <span class="ml-2 font-bold text-green-300">€${event.compensation?.amount || 0}/persona</span>
          </div>

          <div class="flex items-center text-white text-opacity-80 text-sm">
            <i class="fas fa-users w-5"></i>
            <span class="ml-2">${spotsLeft} ${spotsLeft === 1 ? 'plaza disponible' : 'plazas disponibles'}</span>
          </div>
        </div>

        <div class="pt-4 border-t border-white border-opacity-20">
          <button
            onclick="window.location.href='/evento-detalle.html?eventId=${event.id}'"
            class="w-full gradient-button px-4 py-3 rounded-lg text-white font-semibold">
            ${hasApplied ? 'Ver Mi Aplicación' : 'Ver Detalles y Aplicar'} <i class="fas fa-arrow-right ml-2"></i>
          </button>
        </div>
      `;

        return card;
    }

    // Apply filters
    document.getElementById('applyFilters').addEventListener('click', () => {
        const cityFilter = document.getElementById('filterCity').value;
        const typeFilter = document.getElementById('filterType').value;
        const compensationFilter = parseInt(document.getElementById('filterCompensation').value) || 0;

        let filteredEvents = allEvents.filter(event => {
            let match = true;

            if (cityFilter && event.location?.city !== cityFilter) {
                match = false;
            }

            if (typeFilter && event.eventType !== typeFilter) {
                match = false;
            }

            if (compensationFilter > 0 && (event.compensation?.amount || 0) < compensationFilter) {
                match = false;
            }

            return match;
        });

        renderEvents(filteredEvents);

        if (filteredEvents.length > 0) {
            showToast(`${filteredEvents.length} evento(s) encontrado(s)`, 'success');
        }
    });

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
