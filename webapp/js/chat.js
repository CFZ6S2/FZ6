// External Imports
import './firebase-appcheck.js';
import { auth, getDb } from './firebase-config-env.js';
import { onAuthStateChanged } from "firebase/auth";
import {
    collection, query, orderBy, onSnapshot, doc, getDoc, updateDoc, addDoc,
    serverTimestamp, arrayUnion, where, limit, startAfter, getDocs, setDoc,
    deleteDoc, increment
} from "firebase/firestore";
import {
    showToast, calculateDistance, requireChatAccess, calculateAge,
    getReputationBadge, getAvailabilityStatus, getAvailabilityBadge
} from './utils.js';
import { sanitizer } from './sanitizer.js';
import { loadTheme } from './theme.js';
import { apiService } from './api-service.js';
import './image-optimizer.js';

// Google Maps Import (Moved from body)
import { GOOGLE_MAPS_API_KEY } from './google-maps-config-env.js';

(async () => {
    // Initialize Firestore lazily with fallback
    let db;
    try {
        db = await getDb();
        if (!db) throw new Error('getDb returned null');
    } catch (e) {
        console.error('⚠️ Firestore init failed in chat.js, using fallback:', e);
        const { getFirestore } = await import('firebase/firestore');
        const { app } = await import('./firebase-config-env.js');
        db = getFirestore(app);
    }
    window._debug_db = db;
    // Make functions globally available
    window.closeUserModal = function () {
        const modal = document.getElementById('userModal');
        if (modal) {
            modal.classList.add('opacity-0', 'pointer-events-none');
        }
    };

    window.viewUserProfile = function () {
        if (!otherUserData) return;
        const user = otherUserData;
        const modal = document.getElementById('userModal');

        // 1. AVATAR & COVER
        const modalAvatarContainer = document.getElementById('modalAvatarContainer');
        const avatarLetter = (user.alias || user.email || 'U').charAt(0).toUpperCase();

        const photoUrl = user.photoURL || (user.photos && user.photos.length > 0 ? user.photos[0] : null);

        if (photoUrl) {
            modalAvatarContainer.innerHTML = `<img src="${sanitizer.url(photoUrl)}" class="w-full h-full object-cover">`;
        } else {
            modalAvatarContainer.innerHTML = `<span class="text-5xl font-bold text-white">${avatarLetter}</span>`;
        }

        // Online Indicator
        const onlineInd = document.getElementById('modalOnlineIndicator');
        if (user.isOnline) onlineInd.classList.remove('hidden');
        else onlineInd.classList.add('hidden');

        // 2. NAME & INFO
        document.getElementById('modalName').textContent = user.alias || 'Usuario';

        // Verified Badge
        const verBadge = document.getElementById('modalVerifiedBadge');
        if (user.emailVerified) verBadge.classList.remove('hidden');
        else verBadge.classList.add('hidden');

        // Age
        const age = user.birthDate ? calculateAge(user.birthDate) : '?';
        document.getElementById('modalAge').innerHTML = `<i class="fas fa-birthday-cake mr-1 text-pink-400"></i><span>${age} años</span>`;

        // Distance
        const distEl = document.getElementById('modalDistance');
        let distanceVal = null;
        if (currentUserData && currentUserData.location && user.location) {
            distanceVal = calculateDistance(
                currentUserData.location.lat,
                currentUserData.location.lng,
                user.location.lat,
                user.location.lng
            );
        }

        if (distanceVal !== null) {
            distEl.classList.remove('hidden');
            distEl.querySelector('span').textContent = `${distanceVal.toFixed(1)} km`;
        } else {
            distEl.classList.add('hidden');
        }

        // Reputation / Status Badge
        const repCont = document.getElementById('modalReputationContainer');

        if (user.gender === 'femenino') {
            const availabilityStatus = getAvailabilityBadge(user.availabilityStatus || 'available');
            repCont.innerHTML = `<span class="badge ${availabilityStatus.color} text-xs py-0.5 px-2 rounded-full border"><i class="fas ${sanitizer.attribute(availabilityStatus.icon)}"></i> ${sanitizer.text(availabilityStatus.label)}</span>`;
        } else {
            const reputationBadge = getReputationBadge(user.reputation || 'ORO', user.completedDates || 0);
            repCont.innerHTML = `<span class="badge ${reputationBadge.color} text-xs py-0.5 px-2 rounded-full border">${sanitizer.text(reputationBadge.icon)} ${sanitizer.text(reputationBadge.label)}</span>
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

        // 4. STATS (Deterministic Mock for consistency with search)
        const userIdHash = user.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        document.getElementById('modalCitasCompletadas').textContent = (userIdHash % 20) + 5;

        // Calculate real compatibility if possible
        let compatibility = 0;
        if (currentUserData) {
            // compatibility = calculateCompatibility(currentUserData, user); // Deprecated
            compatibility = ((userIdHash * 7) % 40) + 60; // Mock fallback
        } else {
            compatibility = ((userIdHash * 7) % 40) + 60; // Mock fallback
        }
        // document.getElementById('modalCompatibilidad').textContent = `${compatibility}%`; // Deprecated element

        document.getElementById('modalRespuesta').textContent = `${((userIdHash * 13) % 30) + 65}%`;

        // 5. GALLERY
        const gallerySection = document.getElementById('modalGallerySection');
        const galleryGrid = document.getElementById('modalGalleryGrid');

        // Merge photos and galleryPhotos to be safe, filter nulls
        let displayPhotos = [];
        if (user.photos && Array.isArray(user.photos)) {
            displayPhotos = user.photos.filter(p => p);
        } else if (user.galleryPhotos && Array.isArray(user.galleryPhotos)) {
            displayPhotos = user.galleryPhotos.filter(p => p);
        }

        // Filter out main avatar if present (heuristic)
        if (user.photoURL) {
            displayPhotos = displayPhotos.filter(url => url !== user.photoURL);
        }

        if (displayPhotos.length > 0) {
            gallerySection.classList.remove('hidden');
            galleryGrid.innerHTML = displayPhotos.map(url => {
                const safeUrl = sanitizer.url(url);
                const attrUrl = sanitizer.attribute(safeUrl); // Safe for attribute injection
                return `
                  <div class="aspect-square rounded-lg overflow-hidden bg-white/5 border border-white/10 group cursor-pointer" onclick="window.open('${attrUrl}', '_blank')">
                      <img src="${safeUrl}" class="w-full h-full object-cover transition transform group-hover:scale-110">
                  </div>
              `;
            }).join('');
        } else {
            gallerySection.classList.add('hidden');
        }

        // 6. INTERESTS
        const interests = ['Música', 'Viajes', 'Deportes', 'Cine', 'Lectura', 'Baile', 'Cocina', 'Arte', 'Tecnología', 'Moda'];
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

        // Show Modal
        modal.classList.remove('opacity-0', 'pointer-events-none');
    };

    // Get URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const conversationId = urlParams.get('conversationId');
    const otherUserId = urlParams.get('userId');

    let currentUser = null;
    let currentUserData = null;
    let otherUserData = null;
    let messages = [];
    let selectedDate = null;
    let selectedTime = null;
    let currentMonth = new Date();

    // Redirect if missing params
    if (!conversationId || !otherUserId) {
        window.location.href = '/conversaciones.html';
    }

    // Auth State
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            const { getDb } = await import('./firebase-config-env.js');
            const db = await getDb();
            await loadUserData();

            // ✅ VALIDACIÓN: Verificar perfil completo + membresía (hombres) antes de permitir chat
            if (currentUserData && !requireChatAccess(currentUserData, window.location.href)) {
                // requireChatAccess redirige automáticamente:
                // - Hombres sin membresía → /webapp/suscripcion.html
                // - Perfil incompleto → /webapp/perfil.html
                return;
            }

            loadMessages();
        } else {
            window.location.href = '/login.html';
        }
    });

    // Load user data
    async function loadUserData() {
        try {
            // Load current user
            const currentUserDoc = await getDoc(doc(db, 'users', currentUser.uid));
            if (currentUserDoc.exists()) {
                currentUserData = { id: currentUserDoc.id, ...currentUserDoc.data() };

                // Load user theme
                loadTheme(currentUserData);
            }

            // Load other user
            const otherUserDoc = await getDoc(doc(db, 'users', otherUserId));
            if (otherUserDoc.exists()) {
                otherUserData = { id: otherUserDoc.id, ...otherUserDoc.data() };
                updateUserHeader();
                checkPaymentStatus();
            } else {
                showToast('Usuario no encontrado', 'error');
                setTimeout(() => window.location.href = '/conversaciones.html', 2000);
            }
        } catch (error) {
            console.error('Error loading user data:', error);
            showToast('Error al cargar datos', 'error');
        }
    }

    // Update user header
    function updateUserHeader() {
        const alias = otherUserData.alias || 'Usuario';
        document.getElementById('otherUserName').textContent = alias;
        document.getElementById('otherUserAvatar').textContent = alias.charAt(0).toUpperCase();

        // Online status
        if (otherUserData.isOnline) {
            document.getElementById('onlineIndicator').classList.remove('hidden');
        }

        // Verified badge
        if (otherUserData.emailVerified) {
            document.getElementById('verifiedBadge').classList.remove('hidden');
        }

        // Distance
        if (currentUserData.location && otherUserData.location) {
            const distance = calculateDistance(
                currentUserData.location.lat,
                currentUserData.location.lng,
                otherUserData.location.lat,
                otherUserData.location.lng
            );
            document.getElementById('distanceValue').textContent = distance.toFixed(1);
        }

        // Reputation (men)
        if (otherUserData.gender === 'masculino' && otherUserData.reputation) {
            const badge = document.getElementById('reputationBadge');
            const repColors = {
                'BRONCE': 'bg-gradient-to-r from-orange-700 to-orange-900',
                'PLATA': 'bg-gradient-to-r from-gray-400 to-gray-600',
                'ORO': 'bg-gradient-to-r from-yellow-400 to-yellow-600',
                'PLATINO': 'bg-gradient-to-r from-cyan-400 to-blue-500'
            };
            badge.className = `px-2 py-0.5 text-xs rounded-full font-bold ${repColors[otherUserData.reputation]}`;
            badge.textContent = otherUserData.reputation;
            badge.classList.remove('hidden');
        }

        // Availability (women)
        if (otherUserData.gender === 'femenino' && otherUserData.availability) {
            const badge = document.getElementById('availabilityBadge');
            const availColors = {
                'verde': 'bg-green-500',
                'amarillo': 'bg-yellow-500',
                'rojo': 'bg-red-500'
            };
            badge.className = `w-2 h-2 rounded-full ${availColors[otherUserData.availability]}`;
            badge.title = `Disponibilidad: ${otherUserData.availability}`;
            badge.classList.remove('hidden');
        }
    }

    // Check payment status
    function checkPaymentStatus() {
        /* PAYMENTS SUSPENDED check disabled
        const userMustPay = currentUserData.gender === 'masculino';
        const hasSubscription = currentUserData.hasActiveSubscription;

        if (userMustPay && !hasSubscription) {
            document.getElementById('paymentWarningChat').classList.remove('hidden');
            document.getElementById('sendButton').disabled = true;
            document.getElementById('messageInput').disabled = true;
        }
        */
        // Ensure chat inputs are enabled
        document.getElementById('paymentWarningChat').classList.add('hidden');
        document.getElementById('sendButton').disabled = false;
        document.getElementById('messageInput').disabled = false;
    }

    // Load messages
    function loadMessages() {
        const messagesRef = collection(db, 'conversations', conversationId, 'messages');
        const q = query(messagesRef, orderBy('timestamp', 'asc'));

        onSnapshot(q, (snapshot) => {
            const loadingEl = document.getElementById('loadingMessages');
            if (loadingEl) {
                loadingEl.classList.add('hidden');
            }

            messages = [];
            snapshot.forEach((doc) => {
                messages.push({ id: doc.id, ...doc.data() });
            });

            renderMessages();
            scrollToBottom();
            markAsRead();
        }, (error) => {
            console.error('Error loading messages:', error);
            showToast('Error al cargar mensajes', 'error');
        });
    }

    // Render messages
    function renderMessages() {
        const container = document.getElementById('messagesContainer');

        if (messages.length === 0) {
            container.innerHTML = `
          <div class="text-center py-8 text-slate-300">
            <i class="fas fa-comment-dots text-4xl mb-3 opacity-50"></i>
            <p>No hay mensajes aún. ¡Empieza la conversación!</p>
          </div>
        `;
            return;
        }

        // Sanitize and render messages
        const messagesHTML = messages.map(msg => {
            const isSent = msg.senderId === currentUser.uid;
            const timeStr = msg.timestamp ? new Date(msg.timestamp.toDate()).toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit'
            }) : '';

            // Check if it's a date proposal
            if (msg.type === 'date_proposal') {
                // Sanitize all user input fields
                const safeDate = sanitizer.text(msg.date || '');
                const safeTime = sanitizer.text(msg.time || '');
                const safePlace = sanitizer.text(msg.place || '');
                const safeMessage = sanitizer.text(msg.message || '');
                // Use attribute sanitizer for IDs used in onclick params
                const safeId = sanitizer.attribute(msg.id || '');
                const safeDateId = sanitizer.attribute(msg.dateId || ''); // New field

                return `
            <div class="flex ${isSent ? 'justify-end' : 'justify-start'}">
              <div class="max-w-[80%] glass-strong rounded-2xl p-4">
                <div class="flex items-center gap-2 mb-3 text-pink-400">
                  <i class="fas fa-calendar-heart"></i>
                  <span class="font-bold">Propuesta de Cita</span>
                </div>
                <div class="space-y-2 text-sm">
                  <p><i class="fas fa-calendar text-purple-400 w-5"></i> ${safeDate}</p>
                  <p><i class="fas fa-clock text-purple-400 w-5"></i> ${safeTime}</p>
                  <p><i class="fas fa-map-marker-alt text-purple-400 w-5"></i> ${safePlace}</p>
                  ${safeMessage ? `<p class="mt-3 text-slate-300">"${safeMessage}"</p>` : ''}
                </div>
                <div class="flex gap-2 mt-4">
                  ${!isSent && msg.status === 'pending' ? `
                    <button onclick="acceptDate('${safeId}', '${safeDateId}')" class="flex-1 bg-green-500 hover:bg-green-600 py-2 rounded-lg text-sm font-bold transition">
                      Aceptar
                    </button>
                    <button onclick="rejectDate('${safeId}', '${safeDateId}')" class="flex-1 bg-red-500 hover:bg-red-600 py-2 rounded-lg text-sm font-bold transition">
                      Rechazar
                    </button>
                  ` : ''}
                  ${msg.status === 'accepted' ? '<span class="text-green-400 text-sm"><i class="fas fa-check-circle"></i> Aceptada</span>' : ''}
                  ${msg.status === 'rejected' ? '<span class="text-red-400 text-sm"><i class="fas fa-times-circle"></i> Rechazada</span>' : ''}
                </div>
                <p class="text-xs text-slate-400 mt-2 text-right">${timeStr}</p>
              </div>
            </div>
          `;
            }

            // Regular message - sanitize text content
            const safeText = sanitizer.text(msg.text || '');
            return `
          <div class="flex ${isSent ? 'justify-end' : 'justify-start'}">
            <div class="max-w-[70%] ${isSent ? 'message-sent' : 'message-received'} rounded-2xl px-4 py-3">
              <p class="break-words">${safeText}</p>
              <p class="text-xs text-white/60 mt-1 text-right">${timeStr}</p>
            </div>
          </div>
        `;
        }).join('');

        container.innerHTML = messagesHTML;
    }

    // Escape HTML
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Scroll to bottom
    function scrollToBottom() {
        const container = document.getElementById('messagesContainer');
        setTimeout(() => {
            container.scrollTop = container.scrollHeight;
        }, 100);
    }

    // Mark messages as read
    async function markAsRead() {
        try {
            const conversationRef = doc(db, 'conversations', conversationId);
            await updateDoc(conversationRef, {
                [`participantsData.${currentUser.uid}.unreadCount`]: 0
            });
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    }

    // Send message
    window.sendMessage = async function () {
        const input = document.getElementById('messageInput');
        const text = input.value.trim();

        if (!text) return;

        // PAYMENTS DISABLED - Free chat until critical mass
        /*
        // Check payment - CRITICAL VALIDATION
        const userMustPay = currentUserData.gender === 'masculino';
        if (userMustPay && !currentUserData.hasActiveSubscription) {
            showToast('⚠️ Membresía requerida para enviar mensajes', 'error');
            if (confirm('Necesitas una membresía activa (€29.99/mes) para enviar mensajes.\n\n¿Deseas activar tu membresía ahora?')) {
                window.location.href = '/suscripcion.html';
            }
            return;
        }
        */

        try {
            // Disable input while processing
            input.disabled = true;

            // 1. Moderate Message (Call Backend with Fallback)
            const token = await auth.currentUser.getIdToken();
            apiService.setToken(token);

            try {
                const moderation = await apiService.moderateMessage(text);
                if (!moderation.is_safe) {
                    showToast(`🚫 Mensaje bloqueado: ${moderation.reasons[0] || 'Contenido inapropiado'}`, 'error');
                    input.disabled = false;
                    input.focus();
                    return;
                }
            } catch (modError) {
                console.warn('⚠️ Moderation API unreachable/failed. Allowing message as fallback.', modError);
                // Fallback: Proceed without moderation (or implement simple client-side check if needed)
            }

            // 2. Send via Firestore (Serverless Pattern)
            const messagesRef = collection(db, 'conversations', conversationId, 'messages');
            await addDoc(messagesRef, {
                text: text,
                senderId: currentUser.uid,
                timestamp: serverTimestamp(),
                read: false,
                type: 'text'
            });

            // 3. Update Conversation Metadata
            const conversationRef = doc(db, 'conversations', conversationId);
            await updateDoc(conversationRef, {
                lastMessage: text,
                lastMessageTimestamp: serverTimestamp(),
                [`participantsData.${otherUserId}.unreadCount`]: increment(1)
            });

            // Clear input
            input.value = '';
            input.style.height = 'auto';
            input.disabled = false;
            input.focus();

        } catch (error) {
            console.error('Error sending message:', error);
            input.disabled = false;
            showToast(`Error al enviar mensaje: ${error.message}`, 'error');
        }
    };

    // Auto-resize textarea
    document.getElementById('messageInput').addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });

    // Send on Enter (Shift+Enter for new line)
    document.getElementById('messageInput').addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Options menu
    window.showOptionsMenu = function () {
        document.getElementById('optionsMenu').classList.remove('opacity-0', 'pointer-events-none');
    };

    window.closeOptionsMenu = function () {
        document.getElementById('optionsMenu').classList.add('opacity-0', 'pointer-events-none');
    };
    // ==========================================================================
    // OPTIONS MENU ACTIONS
    // ==========================================================================

    window.hideConversation = async function () {
        if (!confirm('¿Estás seguro de que quieres ocultar esta conversación?')) return;

        try {
            const userRef = doc(db, 'users', currentUser.uid);
            await updateDoc(userRef, {
                hiddenConversations: arrayUnion(conversationId)
            });

            showToast('Conversación ocultada', 'success');
            setTimeout(() => window.location.href = '/conversaciones.html', 1000);
        } catch (error) {
            console.error('Error hiding conversation:', error);
            showToast('Error al ocultar conversación', 'error');
        }
    };

    // Report user
    window.reportUser = async function () {
        const reason = prompt('Por favor, indica el motivo del reporte:');
        if (!reason) return;

        try {
            await addDoc(collection(db, 'reports'), {
                reporterId: currentUser.uid,
                reportedId: otherUserId,
                reason: reason,
                createdAt: serverTimestamp(),
                status: 'pending'
            });

            showToast('Usuario reportado. Gracias.', 'success');
            closeOptionsMenu();
        } catch (error) {
            console.error('Error reporting user:', error);
            showToast('Error al reportar usuario', 'error');
        }
    };

    // Block user (Direct)
    window.blockUser = async function () {
        if (!confirm('¿Bloquear a este usuario? No podrá enviarte mensajes.')) return;

        try {
            const userRef = doc(db, 'users', currentUser.uid);
            await updateDoc(userRef, {
                blockedUsers: arrayUnion(otherUserId),
                hiddenConversations: arrayUnion(conversationId)
            });

            showToast('Usuario bloqueado', 'success');
            setTimeout(() => window.location.href = '/conversaciones.html', 1000);
        } catch (error) {
            console.error('Error blocking user:', error);
            showToast('Error al bloquear usuario', 'error');
        }
    };

    // Delete conversation
    window.deleteConversation = async function () {
        if (!confirm('¿Estás seguro de que quieres BORRAR esta conversación?\n\nEsta acción NO se puede deshacer.\nSe eliminarán todos los mensajes permanentemente.')) {
            return;
        }

        try {
            closeOptionsMenu();
            showToast('Borrando conversación...', 'info');

            // Delete all messages in subcollection
            const messagesRef = collection(db, 'conversations', conversationId, 'messages');
            const messagesSnapshot = await getDocs(messagesRef);

            const deletePromises = messagesSnapshot.docs.map(msgDoc => deleteDoc(msgDoc.ref));
            await Promise.all(deletePromises);

            // Delete the conversation document itself
            const conversationRef = doc(db, 'conversations', conversationId);
            await deleteDoc(conversationRef);

            showToast('Conversación eliminada', 'success');
            setTimeout(() => window.location.href = '/conversaciones.html', 1000);
        } catch (error) {
            console.error('Error deleting conversation:', error);
            showToast('Error al borrar conversación: ' + error.message, 'error');
        }
    };


    // Video call
    window.startVideoCall = function () {
        // PAYMENTS DISABLED - Free video calls until critical mass
        /*
        // Check membership - CRITICAL VALIDATION
        const userMustPay = currentUserData.gender === 'masculino';
        if (userMustPay && !currentUserData.hasActiveSubscription) {
            showToast('💳 Membresía Premium requerida para video llamadas', 'error');
            if (confirm('Para realizar video llamadas necesitas una Membresía Premium (€29.99/mes).\n\n¿Deseas suscribirte ahora?')) {
                window.location.href = '/suscripcion.html';
            }
            return;
        }
        */

        // Verificar soporte del navegador
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            showToast('Tu navegador no soporta video llamadas. Usa Chrome, Firefox o Edge.', 'error');
            return;
        }

        // Redirigir a página de video chat
        window.location.href = `/video-chat.html?conversationId=${conversationId}&remoteUserId=${otherUserId}&action=call`;
    };

    // Date proposal
    window.openDateProposal = function () {
        if (!currentUserData) {
            showToast('Cargando perfil... por favor espera un momento.', 'info');
            return;
        }

        // Check insurance - CRITICAL VALIDATION
        const userMustPay = currentUserData.gender === 'masculino';
        /* INSURANCE DISABLED
        if (userMustPay && !currentUserData.hasAntiGhostingInsurance) {
            showToast('🛡️ Seguro Anti-Plantón requerido para proponer citas', 'error');
            if (confirm('Para proponer y agendar citas necesitas contratar el Seguro Anti-Plantón (€120 pago único).\n\nEste seguro te protege en caso de plantones y es válido de por vida.\n\n¿Deseas contratar el seguro ahora?')) {
                window.location.href = '/seguro.html';
            }
            return;
        }
        */

        document.getElementById('insuranceWarning').classList.add('hidden');
        document.getElementById('dateProposalModal').classList.remove('opacity-0', 'pointer-events-none');
        renderCalendar();
        loadGoogleMapsScript(); // Load maps when modal opens
    };

    window.closeDateProposal = function () {
        document.getElementById('dateProposalModal').classList.add('opacity-0', 'pointer-events-none');
    };

    // Calendar functions
    // Calendar functions
    function renderCalendar() {
        const calendarContainer = document.getElementById('calendarDays');
        let calendarHTML = '';

        // Generate next 14 days
        const today = new Date();
        // Reset time to midnight for consistent comparison
        today.setHours(0, 0, 0, 0);

        const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

        for (let i = 0; i < 14; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);

            const dayName = dayNames[date.getDay()];
            const dayNumber = date.getDate();
            const monthName = monthNames[date.getMonth()];

            // Check if selected
            let isSelected = false;
            if (selectedDate) {
                isSelected = date.getDate() === selectedDate.getDate() &&
                    date.getMonth() === selectedDate.getMonth() &&
                    date.getFullYear() === selectedDate.getFullYear();
            }

            // Card Style
            const baseClasses = "flex-shrink-0 w-20 h-24 rounded-2xl flex flex-col items-center justify-center transition-all duration-300 cursor-pointer snap-start border border-white/10";
            const stateClasses = isSelected
                ? "bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg scale-105 border-transparent"
                : "glass hover:bg-white/20 text-white/80 hover:text-white";

            calendarHTML += `
            <div
                onclick="selectDate(${date.getFullYear()}, ${date.getMonth()}, ${dayNumber})"
                class="${baseClasses} ${stateClasses}"
            >
                <span class="text-xs font-medium uppercase mb-1 opacity-80">${dayName}</span>
                <span class="text-2xl font-bold mb-1">${dayNumber}</span>
                <span class="text-[10px] font-medium opacity-60">${monthName}</span>
            </div>
            `;
        }

        calendarContainer.innerHTML = calendarHTML;
    }

    // Month navigation functions removed as they are no longer needed
    // window.previousMonth = function () { ... };
    // window.nextMonth = function () { ... };

    window.selectTime = function (time) {
        selectedTime = time;
        updateDateSummary();
    };

    function updateDateSummary() {
        const place = document.getElementById('datePlace').value;

        if (selectedDate && selectedTime && place) {
            document.getElementById('submitDateProposal').disabled = false;
            document.getElementById('dateSummary').classList.remove('hidden');

            const dateStr = selectedDate.toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            document.getElementById('summaryDate').textContent = dateStr;
            document.getElementById('summaryTime').textContent = selectedTime;
            document.getElementById('summaryPlace').textContent = place;
        } else {
            document.getElementById('submitDateProposal').disabled = true;
            document.getElementById('dateSummary').classList.add('hidden');
        }
    }

    document.getElementById('datePlace').addEventListener('input', updateDateSummary);

    window.submitDateProposal = async function () {
        if (!currentUserData) {
            showToast('Error: Datos de usuario no cargados', 'error');
            return;
        }

        // Check insurance - DOUBLE VALIDATION (DISABLED)
        const userMustPay = currentUserData.gender === 'masculino';
        // ... (INSURANCE BLOCK COMMENTED OUT ABOVE)

        // Validate Date & Time
        if (!selectedDate || !selectedTime) {
            showToast('Por favor selecciona una fecha y hora', 'warning');
            return;
        }

        const place = document.getElementById('datePlace').value;
        const message = document.getElementById('dateMessage').value;

        if (!place) {
            showToast('Por favor indica un lugar', 'warning');
            return;
        }

        try {
            // 1. Create Date Document in 'dates' collection (Source of Truth)
            const datesRef = collection(db, 'dates');
            const dateDocRef = await addDoc(datesRef, {
                hostId: currentUser.uid,
                guestId: otherUserId,
                conversationId: conversationId,
                date: selectedDate.toLocaleDateString('es-ES'),
                time: selectedTime,
                timestamp: selectedDate, // Use actual date object for sorting
                dateTime: selectedDate, // redundant but useful
                place: place,
                coordinates: selectedPlaceCoordinates || null, // GPS coordinates for validation
                message: message,
                status: 'pending',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            // 2. Add date proposal message to chat with reference to dateId
            const messagesRef = collection(db, 'conversations', conversationId, 'messages');
            await addDoc(messagesRef, {
                senderId: currentUser.uid,
                type: 'date_proposal',
                dateId: dateDocRef.id, // Link to date doc
                date: selectedDate.toLocaleDateString('es-ES'),
                time: selectedTime,
                place: place,
                message: message,
                status: 'pending',
                timestamp: serverTimestamp()
            });

            // 3. Update conversation last message
            const conversationRef = doc(db, 'conversations', conversationId);
            await updateDoc(conversationRef, {
                lastMessage: '📅 Propuesta de cita',
                lastMessageTime: serverTimestamp(),
                lastMessageSenderId: currentUser.uid
            });

            closeDateProposal();
            showToast('Propuesta de cita enviada', 'success');

            // Reset form
            selectedDate = null;
            selectedTime = null;
            document.getElementById('datePlace').value = '';
            document.getElementById('dateMessage').value = '';
        } catch (error) {
            console.error('Error sending date proposal:', error);
            showToast('Error al enviar propuesta', 'error');
        }
    };

    // Google Maps Loader
    // Import moved to header

    let autocomplete;

    // Load Google Maps Script
    function loadGoogleMapsScript() {
        if (document.querySelector('script[src*="maps.googleapis.com"]')) {
            initAutocomplete(); // Already loaded
            return;
        }

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&callback=initAutocomplete`;
        script.async = true;
        script.defer = true;
        window.initAutocomplete = initAutocomplete; // Global callback
        document.head.appendChild(script);
    }

    // Initialize Autocomplete
    let selectedPlaceCoordinates = null; // Store coordinates from Places

    function initAutocomplete() {
        const region = 'es'; // Restrict to Spain if needed, or remove
        const input = document.getElementById('datePlace');

        if (!input) return;

        autocomplete = new google.maps.places.Autocomplete(input, {
            fields: ['formatted_address', 'name', 'geometry'],
            strictBounds: false,
        });

        autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            if (place.formatted_address) {
                input.value = place.name + (place.formatted_address ? `, ${place.formatted_address}` : '');
                updateDateSummary();
            }
            // Capture coordinates for date validation
            if (place.geometry && place.geometry.location) {
                selectedPlaceCoordinates = {
                    lat: place.geometry.location.lat(),
                    lng: place.geometry.location.lng()
                };
                console.log('📍 Place coordinates captured:', selectedPlaceCoordinates);
            } else {
                selectedPlaceCoordinates = null;
                console.warn('📍 No coordinates available for this place');
            }
        });

        console.log('📍 Google Places Autocomplete initialized');
    }

    // Custom Confirmation Modal Logic
    let pendingAction = null;

    window.openConfirmationModal = function (title, message, action) {
        document.getElementById('confirmTitle').textContent = title;
        document.getElementById('confirmMessage').textContent = message;
        document.getElementById('confirmationModal').classList.remove('hidden');
        pendingAction = action;
    };

    window.closeConfirmationModal = function () {
        document.getElementById('confirmationModal').classList.add('hidden');
        pendingAction = null;
    };

    const diffBtnCancel = document.getElementById('btnCancelConfirm');
    if (diffBtnCancel) diffBtnCancel.onclick = closeConfirmationModal;

    const diffBtnConfirm = document.getElementById('btnConfirmAction');
    if (diffBtnConfirm) diffBtnConfirm.onclick = async () => {
        if (pendingAction) await pendingAction();
        closeConfirmationModal();
    };

    // Accept/Reject date (Inline in chat)
    window.acceptDate = function (messageId, dateId) {
        openConfirmationModal(
            'Aceptar Cita',
            '¿Deseas aceptar esta cita y confirmar tu asistencia?',
            async () => {
                try {
                    // Update Message
                    const messageRef = doc(db, 'conversations', conversationId, 'messages', messageId);
                    await updateDoc(messageRef, { status: 'accepted' });

                    // Update Date Doc (if dateId is provided in HTML)
                    if (dateId) {
                        const dateRef = doc(db, 'dates', dateId);
                        await updateDoc(dateRef, { status: 'accepted', updatedAt: serverTimestamp() });
                    }

                    showToast('Cita aceptada', 'success');
                } catch (error) {
                    console.error('Error accepting date:', error);
                    showToast('Error al aceptar cita', 'error');
                }
            }
        );
    };

    window.rejectDate = function (messageId, dateId) {
        openConfirmationModal(
            'Rechazar Cita',
            '¿Estás seguro de que quieres rechazar esta propuesta?',
            async () => {
                try {
                    const messageRef = doc(db, 'conversations', conversationId, 'messages', messageId);
                    await updateDoc(messageRef, { status: 'rejected' });

                    if (dateId) {
                        const dateRef = doc(db, 'dates', dateId);
                        await updateDoc(dateRef, { status: 'rejected', updatedAt: serverTimestamp() });
                    }

                    showToast('Cita rechazada', 'info');
                } catch (error) {
                    console.error('Error rejecting date:', error);
                    showToast('Error al rechazar cita', 'error');
                }
            }
        );
    };

    // CRITICAL FIX: Force text color on mobile
    document.addEventListener('DOMContentLoaded', function () {
        const input = document.getElementById('messageInput');
        if (input) {
            input.style.setProperty('color', '#000000', 'important');
            input.style.setProperty('-webkit-text-fill-color', '#000000', 'important');
            input.style.setProperty('background-color', '#ffffff', 'important');
            input.style.setProperty('opacity', '1', 'important');
        }
    });

})();
