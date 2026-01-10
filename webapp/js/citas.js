import './firebase-appcheck.js';
import { auth, getDb } from './firebase-config-env.js';
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  getDoc,
  updateDoc
} from "firebase/firestore";
import { showToast } from './utils.js';
import { loadTheme } from './theme.js';
import { sanitizer } from './sanitizer.js';

(async () => {
  // Initialize Firestore lazily with fallback
  let db;
  try {
    db = await getDb();
    if (!db) throw new Error('getDb returned null');
  } catch (e) {
    console.error('⚠️ Firestore init failed in citas.js, using fallback:', e);
    const { getFirestore } = await import('firebase/firestore');
    const { app } = await import('./firebase-config-env.js');
    db = getFirestore(app);
  }
  let currentUser = null;
  let currentUserData = null;
  let allDates = [];
  let filteredDates = [];
  let currentFilter = 'all';

  // Placeholder for updateUI, assuming it will be defined elsewhere or is a new function
  function updateUI(user) {
    // Example: Update user avatar/alias in header
    const userAliasElement = document.getElementById('userAlias');
    const userAvatarElement = document.getElementById('userAvatar');
    if (userAliasElement) userAliasElement.textContent = user.displayName || 'Usuario';
    if (userAvatarElement && user.photoURL) {
      userAvatarElement.innerHTML = `<img src="${user.photoURL}" alt="Avatar" class="w-full h-full rounded-full object-cover">`;
    } else if (userAvatarElement) {
      userAvatarElement.innerHTML = `<i class="fas fa-user"></i>`;
    }
  }

  // ... auth observer ...
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user;
      // const { getDb } = await import('./js/firebase-config-env.js');
      // const db = await getDb();
      updateUI(user);
      try {
        // Load user data first
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          currentUserData = { id: userDoc.id, ...userDoc.data() };
          loadTheme(currentUserData);
        }

        await loadAppointments(); // Pass db to loadAppointments

      } catch (e) {
        console.error("Error loading initial data:", e);
        document.getElementById('loadingState').classList.add('hidden');
        showToast(`Error cargando perfil: ${e.message}`, 'error');
      }
    } else {
      window.location.href = '/login.html';
    }
  });

  // Load Dates from Firestore
  async function loadAppointments() {
    const loadingState = document.getElementById('loadingState');
    if (loadingState) loadingState.classList.remove('hidden');
    try {
      const appointmentsRef = collection(db, 'dates'); // Changed to appointmentsRef, kept 'dates' collection name

      // Firestore doesn't support OR across different fields easily.
      // Query 1: User is host
      const googleQ1 = query(appointmentsRef, where('hostId', '==', currentUser.uid), orderBy('timestamp', 'desc'));
      // Query 2: User is guest
      const googleQ2 = query(appointmentsRef, where('guestId', '==', currentUser.uid), orderBy('timestamp', 'desc'));

      const [snap1, snap2] = await Promise.all([
        getDocs(googleQ1),
        getDocs(googleQ2)
      ]);

      const datesMap = new Map();

      snap1.forEach(doc => {
        datesMap.set(doc.id, { id: doc.id, ...doc.data() });
      });
      snap2.forEach(doc => {
        datesMap.set(doc.id, { id: doc.id, ...doc.data() });
      });

      allDates = Array.from(datesMap.values());

      // Sort merged results by timestamp desc
      allDates.sort((a, b) => {
        const tA = a.timestamp?.toMillis ? a.timestamp.toMillis() : 0;
        const tB = b.timestamp?.toMillis ? b.timestamp.toMillis() : 0;
        return tB - tA;
      });

      await enrichDatesWithUserData();
      applyFiltersAndRender();
      document.getElementById('loadingState').classList.add('hidden');

    } catch (error) {
      console.error('Error loading dates:', error);
      if (error.message.includes("index")) {
        console.warn("Index missing. You need to create a Firestore composite index.");
        showToast('Falta índice en Firestore. Revisa la consola.', 'warning');
      } else {
        showToast(`Error cargando citas: ${error.message}`, 'error');
      }
      document.getElementById('loadingState').classList.add('hidden');
    }
  }

  async function enrichDatesWithUserData() {
    const enriched = [];
    for (const date of allDates) {
      const isSentByMe = date.hostId === currentUser.uid;
      const otherUserId = isSentByMe ? date.guestId : date.hostId;

      let otherUser = { alias: 'Usuario', photoURL: null };
      try {
        const uSnap = await getDoc(doc(db, 'users', otherUserId));
        if (uSnap.exists()) {
          otherUser = uSnap.data();
        }
      } catch (e) { console.warn("Could not fetch date user", e); }

      enriched.push({
        ...date,
        isSentByMe,
        otherUser
      });
    }
    allDates = enriched;
  }

  function applyFiltersAndRender() {
    if (currentFilter === 'all') {
      filteredDates = allDates;
    } else {
      filteredDates = allDates.filter(d => d.status === currentFilter);
    }
    renderDates();
  }

  // Tab Listeners
  ['all', 'pending', 'accepted', 'rejected', 'completed'].forEach(status => {
    const btnId = 'filter' + status.charAt(0).toUpperCase() + status.slice(1);
    const btn = document.getElementById(btnId);
    if (btn) {
      btn.onclick = () => {
        currentFilter = status;
        document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active', 'bg-white/20', 'shadow-lg'));
        btn.classList.add('active', 'bg-white/20', 'shadow-lg');
        applyFiltersAndRender();
      };
    }
  });


  function renderDates() {
    const datesList = document.getElementById('datesList');
    const emptyState = document.getElementById('emptyState');

    if (filteredDates.length === 0) {
      datesList.innerHTML = '';
      if (allDates.length === 0) {
        emptyState.classList.remove('hidden');
      } else {
        emptyState.classList.add('hidden');
        datesList.innerHTML = `
            <div class="glass-strong rounded-2xl p-12 text-center text-slate-300">
              <i class="fas fa-filter text-4xl mb-4 opacity-50"></i>
              <p>No hay citas en esta categoría</p>
            </div>
          `;
      }
      return;
    }

    emptyState.classList.add('hidden');

    datesList.innerHTML = filteredDates.map(date => {
      const dateObj = date.timestamp?.toDate ? date.timestamp.toDate() : (new Date(date.createdAt || Date.now()));
      const displayDate = date.date || dateObj.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
      const displayTime = date.time || dateObj.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

      const safePlace = sanitizer.text(date.place || 'Ubicación por definir');
      const safeAlias = sanitizer.text(date.otherUser?.alias || 'Usuario');
      const safeMessage = sanitizer.text(date.message || '');
      const conversationId = date.conversationId || '#';
      const dateId = date.id;

      let statusClass = 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30';
      let statusText = 'Pendiente';
      let statusIcon = 'fa-clock';

      if (date.status === 'accepted') {
        statusClass = 'bg-green-500/20 text-green-300 border border-green-500/30';
        statusText = 'Aceptada';
        statusIcon = 'fa-check-circle';
      } else if (date.status === 'rejected') {
        statusClass = 'bg-red-500/20 text-red-300 border border-red-500/30';
        statusText = 'Rechazada';
        statusIcon = 'fa-times-circle';
      } else if (date.status === 'completed') {
        statusClass = 'bg-blue-500/20 text-blue-300 border border-blue-500/30';
        statusText = 'Completada';
        statusIcon = 'fa-flag-checkered';
      }

      return `
          <div class="glass-strong rounded-2xl p-6 relative group transition hover:bg-white/10">
            <div class="flex flex-col md:flex-row gap-4 items-start">
              
              <!-- Avatar -->
              <div class="flex-shrink-0">
                 ${date.otherUser.photoURL ?
          `<img src="${sanitizer.url(date.otherUser.photoURL)}" alt="${safeAlias}" class="w-16 h-16 rounded-full object-cover border-2 border-white/20">` :
          `<div class="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-xl font-bold border-2 border-white/20">
                    ${safeAlias.charAt(0).toUpperCase()}
                  </div>`
        }
              </div>

              <!-- Content -->
              <div class="flex-1 w-full">
                <div class="flex flex-wrap justify-between items-start mb-2 gap-2">
                  <div>
                    <h3 class="text-xl font-bold">${safeAlias}</h3>
                    <div class="flex items-center gap-2 mt-1">
                      <span class="px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 ${statusClass}">
                        <i class="fas ${statusIcon}"></i> ${statusText}
                      </span>
                      ${date.isSentByMe ?
          '<span class="text-xs text-slate-400 bg-white/5 px-2 py-0.5 rounded ml-2">Enviada por ti</span>' :
          '<span class="text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded ml-2">Recibida</span>'
        }
                    </div>
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-300 mb-4">
                  <div class="flex items-center gap-2">
                    <i class="fas fa-calendar text-purple-400 w-4"></i> ${displayDate}
                  </div>
                  <div class="flex items-center gap-2">
                    <i class="fas fa-clock text-blue-400 w-4"></i> ${displayTime}
                  </div>
                  <div class="flex items-center gap-2 sm:col-span-2">
                    <i class="fas fa-map-marker-alt text-red-400 w-4"></i> ${safePlace}
                  </div>
                </div>
                
                ${safeMessage ? `
                <div class="bg-black/20 rounded-lg p-3 text-sm text-slate-300 mb-4 italic">
                  "${safeMessage}"
                </div>` : ''}

                <!-- Actions -->
                <div class="flex gap-3">
                  <a href="/chat.html?conversation=${conversationId}" class="flex-1 glass hover:bg-white/20 py-2 rounded-lg text-center text-sm font-semibold transition">
                    <i class="fas fa-comments mr-2"></i>Chat
                  </a>
                  <a href="/cita-detalle.html?id=${dateId}" class="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 py-2 rounded-lg text-center text-sm font-semibold transition shadow-lg">
                    Ver Detalles
                  </a>
                </div>

              </div>
            </div>
          </div>
        `;
    }).join('');
  }
})();
