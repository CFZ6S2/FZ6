
import { auth, app, getDb } from './firebase-config-env.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
    collection, query, where, getDocs, addDoc, serverTimestamp,
    orderBy, limit, getCountFromServer, doc, updateDoc, getDoc, arrayUnion
} from 'firebase/firestore';
import { showToast, formatDate } from './utils.js';

(async () => {
    let db;
    try {
        db = await getDb();
    } catch (e) {
        console.error('Firestore init error:', e);
        return;
    }

    let currentUser = null;

    // DOM Elements
    const kpiActiveEvents = document.getElementById('kpiActiveEvents');
    const kpiTotalApplicants = document.getElementById('kpiTotalApplicants');
    const recentEventsList = document.getElementById('recentEventsList');
    const createEventBtn = document.getElementById('createEventBtn');
    const viewCreateEvent = document.getElementById('view-create-event');
    const tabDashboard = document.getElementById('tab-dashboard');
    const createEventForm = document.getElementById('createEventForm');
    const cancelCreateBtn = document.getElementById('cancelCreateBtn');

    // Auth Guard
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = '/login.html';
            return;
        }

        currentUser = user;

        // CHECK ROLE
        try {
            const userDocSnap = await getDoc(doc(db, 'users', user.uid));
            if (!userDocSnap.exists()) {
                window.location.href = '/login.html';
                return;
            }

            const userData = userDocSnap.data();
            const role = userData.role || userData.userRole; // Handle both naming conventions if present

            // Allow 'concierge' OR 'admin'
            if (role !== 'concierge' && role !== 'admin') {
                showToast('⛔ Acceso denegado: Rol no autorizado', 'error');
                setTimeout(() => window.location.href = '/dashboard.html', 2000);
                return;
            }

            console.log('🎩 Concierge/Admin Logged In:', user.email, `(${role})`);

            // If Admin, maybe we want to see ALL events? 
            // For now, let's keep it simple: Admins see events they created OR all events (Super View).
            // User request: "Admin can enter". 
            // Implementation: Admin uses it as a Concierge for now.

            await loadDashboard();

        } catch (e) {
            console.error('Role check failed:', e);
        }
    });

    // --- Actions ---

    createEventBtn.addEventListener('click', () => {
        tabDashboard.classList.add('hidden');
        viewCreateEvent.classList.remove('hidden');
    });

    cancelCreateBtn.addEventListener('click', () => {
        viewCreateEvent.classList.add('hidden');
        tabDashboard.classList.remove('hidden');
    });

    createEventForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(createEventForm);
        const eventData = {
            title: formData.get('title'),
            description: formData.get('description'),
            eventType: formData.get('eventType'),
            eventDate: new Date(formData.get('eventDate')),
            location: {
                city: formData.get('locationCity'),
                // coords could be added here if using maps autocomplete
            },
            compensation: {
                amount: parseInt(formData.get('compensationAmount')) || 0,
                currency: 'EUR'
            },
            spotsAvailable: parseInt(formData.get('spotsAvailable')) || 1,
            spotsSelected: 0,
            status: 'published', // published, closed, completed
            conciergeId: currentUser.uid,
            conciergeName: currentUser.displayName || 'Concierge', // Ideally fetch from profile
            createdAt: serverTimestamp()
        };

        try {
            const btn = createEventForm.querySelector('button[type="submit"]');
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publicando...';
            btn.disabled = true;

            await addDoc(collection(db, 'vip_events'), eventData);

            showToast('Evento creado exitosamente', 'success');
            createEventForm.reset();
            viewCreateEvent.classList.add('hidden');
            tabDashboard.classList.remove('hidden');

            // Reload Dashboard
            await loadDashboard();

        } catch (error) {
            console.error('Error creating event:', error);
            showToast('Error al crear el evento', 'error');
        } finally {
            const btn = createEventForm.querySelector('button[type="submit"]');
            btn.innerHTML = '🚀 Publicar Evento';
            btn.disabled = false;
        }
    });

    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await signOut(auth);
        window.location.href = '/login.html';
    });

    // --- Loaders ---

    async function loadDashboard() {
        try {
            // 1. KPI: Active Events
            const qActive = query(
                collection(db, 'vip_events'),
                where('conciergeId', '==', currentUser.uid),
                where('status', '==', 'published')
            );
            const snapActive = await getCountFromServer(qActive);
            kpiActiveEvents.textContent = snapActive.data().count;

            // 2. Load Recent Events List
            const qRecent = query(
                collection(db, 'vip_events'),
                where('conciergeId', '==', currentUser.uid),
                orderBy('createdAt', 'desc'),
                limit(5)
            );
            const snapRecent = await getDocs(qRecent);

            recentEventsList.innerHTML = '';

            if (snapRecent.empty) {
                recentEventsList.innerHTML = `
                    <div class="text-center py-8 text-slate-500">
                        <i class="fas fa-calendar-times text-4xl mb-3 opacity-30"></i>
                        <p>No has creado eventos aún.</p>
                    </div>`;
                return;
            }

            snapRecent.forEach(doc => {
                const event = doc.data();
                const eventEl = document.createElement('div');
                eventEl.className = 'flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 hover:border-purple-500/30 transition-all';

                const dateStr = event.eventDate?.toDate ? formatDate(event.eventDate.toDate()) : 'Fecha pendiente';

                eventEl.innerHTML = `
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-900 to-slate-900 flex items-center justify-center border border-white/10">
                            ${getEventIcon(event.eventType)}
                        </div>
                        <div>
                            <h4 class="font-bold text-white">${event.title}</h4>
                            <div class="flex items-center gap-3 text-xs text-slate-400 mt-1">
                                <span><i class="fas fa-calendar mr-1"></i> ${dateStr}</span>
                                <span><i class="fas fa-map-marker-alt mr-1"></i> ${event.location?.city || 'Remoto'}</span>
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center gap-4">
                        <div class="text-right hidden md:block">
                            <span class="block text-2xl font-bold text-white leading-none">${event.spotsSelected || 0}/${event.spotsAvailable}</span>
                            <span class="text-xs text-slate-500 uppercase font-bold tracking-wider">Plazas</span>
                        </div>
                        <button class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                            <i class="fas fa-chevron-right text-sm"></i>
                        </button>
                    </div>
                `;
                recentEventsList.appendChild(eventEl);
            });

        } catch (error) {
            console.error('Dashboard load error:', error);
        }
    }

    // Event Details DOM
    const viewEventDetails = document.getElementById('view-event-details');
    const closeEventDetailsBtn = document.getElementById('closeEventDetailsBtn');
    const detailEventTitle = document.getElementById('detailEventTitle');
    const detailEventDate = document.getElementById('detailEventDate');
    const detailEventSpots = document.getElementById('detailEventSpots');
    const applicantsList = document.getElementById('applicantsList');
    const selectedList = document.getElementById('selectedList');

    let currentEventId = null;

    closeEventDetailsBtn.addEventListener('click', () => {
        viewEventDetails.classList.add('hidden');
        tabDashboard.classList.remove('hidden');
        loadDashboard(); // Refresh stats
    });

    // Make viewEventDetails available to global scope (for onclick)
    window.openEventDetails = async (eventId) => {
        currentEventId = eventId;
        tabDashboard.classList.add('hidden');
        viewEventDetails.classList.remove('hidden');

        // Load Event Data
        const eventDoc = await getDocs(query(collection(db, 'vip_events'), where('__name__', '==', eventId))); // Hacky getDoc
        // Better: use list from dashboard or fetch single
        // Since we are inside the module, let's fetch properly
        // For now, let's reload the event specifically
        // Note: 'getDoc' was not imported in the original write, adding fallback

        // ...Wait, I'll just re-fetch using query for simplicity or add getDoc import
        // Let's assume passed data or fetch
        // Fetching fresh to get applicants
        await loadEventDetails(eventId);
    };

    async function loadEventDetails(eventId) {
        // 1. Fetch Event Info
        // We'll rely on the query we likely have or just fetch it. 
        // Adding 'getDoc' and 'doc' to imports would be cleaner but let's use what we have
        // Actually, let's just use query by ID for safety if imports are missing
        // or just fetch all logic.

        // Re-implementing with proper fetch:
        // We need 'doc' and 'getDoc' from firestore. I will update imports in next step if needed. 
        // For now, let's assume we can fetch applications first.

        try {
            applicantsList.innerHTML = '<div class="text-center py-8"><i class="fas fa-spinner fa-spin"></i></div>';
            selectedList.innerHTML = '<div class="text-center py-8"><i class="fas fa-spinner fa-spin"></i></div>';

            // Get Applications
            const qApps = query(collection(db, 'vip_applications'), where('eventId', '==', eventId));
            const snapApps = await getDocs(qApps);

            const applicants = [];
            const selected = [];

            // Fetch User Profiles for each app
            // In a real app, optimize this (store summary in app or simple fetch)
            // Here we fetch user docs one by one

            for (const appDoc of snapApps.docs) {
                const appData = { id: appDoc.id, ...appDoc.data() };
                // Fetch User Data
                // (MVP: We use what's in appData if strictly needed, but better to get Profile)
                // appData should ideally contain snapshot of user. 
                // If not, we fetch 'users' collection. 

                // Let's assume we need to fetch user profile to get photo/alias
                const qUser = query(collection(db, 'users'), where('__name__', '==', appData.userId));
                const snapUser = await getDocs(qUser);
                if (!snapUser.empty) {
                    const userProfile = snapUser.docs[0].data();
                    appData.userProfile = userProfile;
                } else {
                    appData.userProfile = { alias: 'Usuario desconocido' };
                }

                if (appData.status === 'selected') {
                    selected.push(appData);
                } else {
                    applicants.push(appData);
                }
            }

            renderApplicants(applicants);
            renderSelected(selected);

            // Update Header Stats (Mock for now, would update from Event Doc)
            document.getElementById('applicantCountBadge').textContent = applicants.length;
            document.getElementById('selectedCountBadge').textContent = selected.length;

        } catch (e) {
            console.error('Error details:', e);
        }
    }

    function renderApplicants(list) {
        applicantsList.innerHTML = '';
        if (list.length === 0) {
            applicantsList.innerHTML = '<div class="text-slate-500 text-center text-sm">No hay candidatas pendientes.</div>';
            return;
        }

        list.forEach(app => {
            const card = document.createElement('div');
            card.className = 'glass p-3 rounded-xl flex items-center justify-between border border-white/5 hover:border-purple-500/50 transition';
            // Placeholder Avatar
            const photo = app.userProfile.photoURL || null;
            const avatar = photo ?
                `<img src="${photo}" class="w-10 h-10 rounded-full object-cover">` :
                `<div class="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">${(app.userProfile.alias || 'U')[0]}</div>`;

            card.innerHTML = `
                <div class="flex items-center gap-3">
                    ${avatar}
                    <div>
                        <h4 class="font-bold text-white text-sm">${app.userProfile.alias}</h4>
                        <p class="text-xs text-slate-400">${app.userProfile.age || '?'} años • ${app.userProfile.location?.city || '?'}</p>
                    </div>
                </div>
                <button onclick="window.selectCandidate('${app.id}')" class="bg-green-500/20 hover:bg-green-500 text-green-400 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition">
                    <i class="fas fa-check mr-1"></i> Elegir
                </button>
            `;
            applicantsList.appendChild(card);
        });
    }

    function renderSelected(list) {
        selectedList.innerHTML = '';
        if (list.length === 0) {
            selectedList.innerHTML = '<div class="text-slate-500 text-center text-sm">Ninguna seleccionada.</div>';
            return;
        }

        list.forEach(app => {
            const card = document.createElement('div');
            card.className = 'glass p-3 rounded-xl flex items-center justify-between border border-green-500/30 bg-green-500/10';
            const photo = app.userProfile.photoURL || null;
            const avatar = photo ?
                `<img src="${photo}" class="w-10 h-10 rounded-full object-cover">` :
                `<div class="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">${(app.userProfile.alias || 'U')[0]}</div>`;

            card.innerHTML = `
                 <div class="flex items-center gap-3">
                     ${avatar}
                     <div>
                         <h4 class="font-bold text-white text-sm">${app.userProfile.alias}</h4>
                         <p class="text-xs text-green-300"><i class="fas fa-check-circle"></i> Seleccionada</p>
                     </div>
                 </div>
             `;
            selectedList.appendChild(card);
        });
    }

    // SELECT CANDIDATE LOGIC
    window.selectCandidate = async (appId) => {
        if (!confirm('¿Confirmas que quieres seleccionar a esta candidata? Se le notificará inmediatamente.')) return;

        try {
            const appRef = doc(db, 'vip_applications', appId);
            await updateDoc(appRef, {
                status: 'selected',
                selectedAt: serverTimestamp()
            });

            // Update Event 'spotsSelected' count
            if (currentEventId) {
                const eventRef = doc(db, 'vip_events', currentEventId);
                const evSnap = await getDoc(eventRef);
                if (evSnap.exists()) {
                    const currentCount = evSnap.data().spotsSelected || 0;
                    await updateDoc(eventRef, { spotsSelected: currentCount + 1 });
                }
            }

            showToast('Candidata seleccionada', 'success');
            await loadEventDetails(currentEventId); // Reload UI

        } catch (e) {
            console.error('Error selecting candidate:', e);
            showToast('Error al seleccionar', 'error');
        }
    };


    function getEventIcon(type) {
        const icons = {
            dinner: '<i class="fas fa-glass-cheers text-pink-400"></i>',
            party: '<i class="fas fa-music text-purple-400"></i>',
            travel: '<i class="fas fa-plane text-blue-400"></i>',
            networking: '<i class="fas fa-handshake text-yellow-400"></i>',
            other: '<i class="fas fa-star text-white"></i>'
        };
        return icons[type] || icons['other'];
    }

})();
