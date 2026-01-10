import './firebase-appcheck.js';
import { auth, getDb } from './firebase-config-env.js';
import { onAuthStateChanged } from "firebase/auth";
import {
    collection, query, where, orderBy, onSnapshot, doc, getDoc, updateDoc, arrayUnion, getDocs, writeBatch
} from "firebase/firestore";
import { showToast, calculateDistance, canAccessChat } from './utils.js';
import { loadTheme } from './theme.js';
import { initializeNotifications } from './notifications.js';
import './image-optimizer.js';

(async () => {
    // Initialize Firestore lazily with fallback
    let db;
    try {
        db = await getDb();
        if (!db) throw new Error('getDb returned null');
    } catch (e) {
        console.error('⚠️ Firestore init failed in conversaciones.js, using fallback:', e);
        const { getFirestore } = await import('firebase/firestore');
        const { app } = await import('./firebase-config-env.js');
        db = getFirestore(app);
    }
    window._debug_db = db;
    let currentUser = null;
    let currentUserData = null;
    let conversations = [];
    let selectedConversationId = null;
    let selectedOtherUserId = null;

    // Auth State
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            // inner import removed
            // db initialized in outer scope
            await loadCurrentUserData();
            loadConversations();

            // Initialize push notifications
            try {
                const notificationsEnabled = await initializeNotifications();
                if (notificationsEnabled) {
                    console.log('✅ Push notifications initialized successfully');
                }
            } catch (error) {
                console.error('Error initializing push notifications:', error);
            }
        } else {
            window.location.href = '/login.html';
        }
    });

    // Load current user data
    async function loadCurrentUserData() {
        try {
            // inner import removed
            // db initialized in outer scope
            const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
            if (userDoc.exists()) {
                currentUserData = { id: userDoc.id, ...userDoc.data() };

                // Load user theme
                loadTheme(currentUserData);

                // Update UI
                const alias = currentUserData.alias || currentUser.email;
                document.getElementById('userAlias').textContent = alias;

                if (alias) {
                    document.getElementById('userAvatar').textContent = alias.charAt(0).toUpperCase();
                }

                // Check payment status
                checkPaymentStatus();
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }

    // Check payment status
    function checkPaymentStatus() {
        /* PAYMENTS SUSPENDED logic disabled
        const userMustPay = currentUserData.gender === 'masculino';

        if (userMustPay && !currentUserData.hasActiveSubscription) {
            document.getElementById('paymentWarning').classList.remove('hidden');
        }
        */
        // Ensure hidden
        const warn = document.getElementById('paymentWarning');
        if (warn) warn.classList.add('hidden');
    }

    // Load conversations
    async function loadConversations() {
        // inner import removed
        // db initialized in outer scope
        const q = query(
            collection(db, 'conversations'),
            where('participants', 'array-contains', currentUser.uid),
            orderBy('lastMessageTime', 'desc')
        );

        onSnapshot(q, async (snapshot) => {
            conversations = [];
            const loadingState = document.getElementById('loadingState');
            const emptyState = document.getElementById('emptyState');
            const conversationsList = document.getElementById('conversationsList');

            if (snapshot.empty) {
                loadingState.classList.add('hidden');
                emptyState.classList.remove('hidden');
                conversationsList.innerHTML = '';
                return;
            }

            loadingState.classList.add('hidden');
            emptyState.classList.add('hidden');

            for (const docSnap of snapshot.docs) {
                const conv = { id: docSnap.id, ...docSnap.data() };

                // Skip hidden conversations
                if (currentUserData.hiddenConversations?.includes(conv.id)) {
                    continue;
                }

                // Get other user ID
                const otherUserId = conv.participants.find(id => id !== currentUser.uid);

                // Get other user data
                const otherUserDoc = await getDoc(doc(db, 'users', otherUserId));
                if (otherUserDoc.exists()) {
                    conv.otherUser = { id: otherUserDoc.id, ...otherUserDoc.data() };

                    // Calculate distance
                    if (currentUserData.location && conv.otherUser.location) {
                        conv.distance = calculateDistance(
                            currentUserData.location.lat,
                            currentUserData.location.lng,
                            conv.otherUser.location.lat,
                            conv.otherUser.location.lng
                        );
                    }

                    conversations.push(conv);
                }
            }

            renderConversations();
        }, (error) => {
            console.error('Error loading conversations:', error);
            showToast('Error al cargar conversaciones', 'error');
        });
    }

    // Render conversations
    function renderConversations() {
        const conversationsList = document.getElementById('conversationsList');
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const filter = document.getElementById('filterSelect').value;

        let filtered = conversations;

        // Apply search filter
        if (searchTerm) {
            filtered = filtered.filter(conv =>
                conv.otherUser.alias?.toLowerCase().includes(searchTerm) ||
                conv.lastMessage?.toLowerCase().includes(searchTerm)
            );
        }

        // Apply status filter
        if (filter === 'unread') {
            filtered = filtered.filter(conv => conv.unreadCount > 0);
        } else if (filter === 'online') {
            filtered = filtered.filter(conv => conv.otherUser.isOnline);
        }

        if (filtered.length === 0) {
            conversationsList.innerHTML = `
          <div class="glass-strong rounded-2xl p-8 text-center">
            <i class="fas fa-search text-4xl text-white/50 mb-4"></i>
            <p class="text-lg text-slate-300">No se encontraron conversaciones</p>
          </div>
        `;
            return;
        }

        // Calculate 'now' once to prevent hydration mismatch across all conversations
        const now = new Date();

        conversationsList.innerHTML = filtered.map(conv => {
            const otherUser = conv.otherUser;
            // Sanitize user-provided data
            const alias = sanitizer.text(otherUser.alias || 'Usuario');
            const lastMessage = sanitizer.text(conv.lastMessage || 'Nueva conversación');
            const safeConvId = sanitizer.text(conv.id || '');
            const safeOtherUserId = sanitizer.text(otherUser.id || '');
            const isUnread = conv.lastMessageSenderId !== currentUser.uid && conv.unreadCount > 0;
            const isOnline = otherUser.isOnline;

            // Time ago
            let timeAgo = 'Hace tiempo';
            if (conv.lastMessageTime) {
                const messageTime = conv.lastMessageTime.toDate();
                const diffMs = now - messageTime;
                const diffMins = Math.floor(diffMs / 60000);
                const diffHours = Math.floor(diffMs / 3600000);
                const diffDays = Math.floor(diffMs / 86400000);

                if (diffMins < 1) timeAgo = 'Ahora';
                else if (diffMins < 60) timeAgo = `Hace ${diffMins}m`;
                else if (diffHours < 24) timeAgo = `Hace ${diffHours}h`;
                else timeAgo = `Hace ${diffDays}d`;
            }

            // Reputation badge (for men) - sanitize reputation value
            let reputationBadge = '';
            if (otherUser.gender === 'masculino' && otherUser.reputation) {
                const repColors = {
                    'BRONCE': 'from-orange-700 to-orange-900',
                    'PLATA': 'from-gray-400 to-gray-600',
                    'ORO': 'from-yellow-400 to-yellow-600',
                    'PLATINO': 'from-cyan-400 to-blue-500'
                };
                const safeReputation = sanitizer.text(otherUser.reputation);
                reputationBadge = `
            <span class="px-2 py-1 text-xs rounded-full bg-gradient-to-r ${repColors[otherUser.reputation]} text-white font-bold">
              ${safeReputation}
            </span>
          `;
            }

            // Availability badge (for women)
            let availabilityBadge = '';
            if (otherUser.gender === 'femenino' && otherUser.availability) {
                const availColors = {
                    'verde': 'bg-green-500',
                    'amarillo': 'bg-yellow-500',
                    'rojo': 'bg-red-500'
                };
                availabilityBadge = `
            <span class="w-3 h-3 rounded-full ${availColors[otherUser.availability]} inline-block" title="Disponibilidad"></span>
          `;
            }

            // Distance badge
            let distanceBadge = '';
            if (conv.distance !== undefined) {
                distanceBadge = `
            <span class="text-xs text-slate-400">
              <i class="fas fa-location-dot"></i> ${conv.distance.toFixed(1)} km
            </span>
          `;
            }

            return `
          <div class="glass-strong rounded-xl p-4 conversation-item cursor-pointer"
               onclick="openChat('${safeConvId}', '${safeOtherUserId}')"
               oncontextmenu="showContextMenu(event, '${safeConvId}', '${safeOtherUserId}'); return false;">
            <div class="flex items-center gap-4">
              <!-- Avatar -->
              <div class="relative flex-shrink-0">
                <div class="w-14 h-14 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center font-bold text-xl">
                  ${alias.charAt(0).toUpperCase()}
                </div>
                ${isOnline ? '<div class="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-slate-900 rounded-full"></div>' : ''}
              </div>

              <!-- Content -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between mb-1">
                  <div class="flex items-center gap-2">
                    <h3 class="font-bold text-lg truncate">${alias}</h3>
                    ${otherUser.emailVerified ? '<i class="fas fa-circle-check text-blue-400 text-sm"></i>' : ''}
                    ${reputationBadge}
                    ${availabilityBadge}
                  </div>
                  <span class="text-xs text-slate-400 flex-shrink-0">${timeAgo}</span>
                </div>
                <div class="flex items-center justify-between">
                  <p class="text-slate-300 text-sm truncate ${isUnread ? 'font-semibold' : ''}">
                    ${conv.lastMessageSenderId === currentUser.uid ? '<i class="fas fa-reply text-xs mr-1"></i>' : ''}
                    ${lastMessage}
                  </p>
                  ${distanceBadge}
                </div>
              </div>

              <!-- Unread badge -->
              ${isUnread ? `
                <div class="flex-shrink-0">
                  <div class="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-xs font-bold unread-badge">
                    ${conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                  </div>
                </div>
              ` : ''}
            </div>
          </div>
        `;
        }).join('');
    };

    // Open chat
    window.openChat = async function (conversationId, otherUserId) {
        // ✅ Validación pasada, abrir chat
        window.location.href = `/chat.html?conversationId=${conversationId}&userId=${otherUserId}`;
    };

    // Show context menu
    window.showContextMenu = function (event, conversationId, otherUserId) {
        event.preventDefault();
        selectedConversationId = conversationId;
        selectedOtherUserId = otherUserId;

        const menu = document.getElementById('contextMenu');
        menu.classList.remove('hidden');
        menu.style.left = event.pageX + 'px';
        menu.style.top = event.pageY + 'px';
    };

    // Hide context menu on click outside
    document.addEventListener('click', () => {
        document.getElementById('contextMenu').classList.add('hidden');
    });

    // Hide conversation
    window.hideConversation = async function () {
        try {
            const userRef = doc(db, 'users', currentUser.uid);
            await updateDoc(userRef, {
                hiddenConversations: arrayUnion(selectedConversationId)
            });

            currentUserData.hiddenConversations = currentUserData.hiddenConversations || [];
            currentUserData.hiddenConversations.push(selectedConversationId);

            renderConversations();
            showToast('Conversación ocultada', 'success');
        } catch (error) {
            console.error('Error hiding conversation:', error);
            showToast('Error al ocultar conversación', 'error');
        }
    };

    // Report user
    window.reportUser = function () {
        if (selectedOtherUserId) {
            window.location.href = `/ reportes.html ? type = user & userId=${selectedOtherUserId}`;
        }
    };

    // Block user
    window.blockUser = function () {
        const conv = conversations.find(c => c.id === selectedConversationId);
        if (conv) {
            document.getElementById('blockUserName').textContent = conv.otherUser.alias || 'Este usuario';
            document.getElementById('blockModal').classList.remove('opacity-0', 'pointer-events-none');
        }
    };

    window.closeBlockModal = function () {
        document.getElementById('blockModal').classList.add('opacity-0', 'pointer-events-none');
    };

    window.confirmBlock = async function () {
        try {
            const userRef = doc(db, 'users', currentUser.uid);
            await updateDoc(userRef, {
                blockedUsers: arrayUnion(selectedOtherUserId),
                hiddenConversations: arrayUnion(selectedConversationId)
            });

            currentUserData.blockedUsers = currentUserData.blockedUsers || [];
            currentUserData.blockedUsers.push(selectedOtherUserId);
            currentUserData.hiddenConversations = currentUserData.hiddenConversations || [];
            currentUserData.hiddenConversations.push(selectedConversationId);

            closeBlockModal();
            renderConversations();
            showToast('Usuario bloqueado', 'success');
        } catch (error) {
            console.error('Error blocking user:', error);
            showToast('Error al bloquear usuario', 'error');
        }
    };

    // Search and filter handlers
    document.getElementById('searchInput').addEventListener('input', renderConversations);
    document.getElementById('filterSelect').addEventListener('change', renderConversations);


})();
