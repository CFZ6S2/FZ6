import { auth, getDb } from './firebase-config-env.js';
import { collection, query, where, onSnapshot, doc, updateDoc, orderBy } from 'firebase/firestore';
import { showToast } from './utils.js';

let unsubscribe = null;

// Audio for notification sound
const notificationSound = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSl+zPDTgjMGHm7A7+OZRQ0PUZD');
notificationSound.volume = 0.4;

export async function initInAppNotifications(user) {
    if (unsubscribe) unsubscribe();

    if (!user) return;

    // Lazy load db
    const db = await getDb();

    // Query unread notifications
    const q = query(
        collection(db, 'notifications'),
        where('userId', '==', user.uid),
        where('read', '==', false),
        orderBy('createdAt', 'desc')
    );

    console.log('🔔 Initializing in-app notifications listener for:', user.uid);

    unsubscribe = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
            if (change.type === 'added') {
                const notif = change.doc.data();

                // Only show if created recently (avoid spamming old unread ones on reload)
                // Or checking metadata.shown? For now, we show all unread.

                // Play Sound
                try {
                    await notificationSound.play();
                } catch (e) { /* ignore autoplay blocks */ }

                // Custom Toast Logic for Notification
                showNotificationToast(change.doc.id, notif);
            }
        });
    }, (error) => {
        // Suppress benign network errors
        if (error.code === 'unavailable' || error.message.includes('offline')) {
            console.warn('🔕 Notification listener paused (offline).');
        } else {
            console.error('❌ Notification listener failed:', error);
        }
    });
}

function showNotificationToast(docId, notif) {
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 z-[100] animate-fade-in';
    toast.innerHTML = `
        <div class="glass-card p-4 rounded-xl shadow-2xl max-w-sm border-l-4 border-blue-500 bg-slate-900/95 backdrop-blur-xl">
            <div class="flex items-start gap-3">
                <div class="bg-blue-500/20 p-2 rounded-full text-blue-400">
                    <i class="fas fa-bell"></i>
                </div>
                <div class="flex-1">
                    <h4 class="font-bold text-white text-sm">${notif.title || 'Nueva Notificación'}</h4>
                    <p class="text-slate-300 text-xs mt-1 leading-relaxed">${notif.message}</p>
                    
                    ${notif.actionUrl ? `
                    <div class="mt-3 flex gap-2">
                        <button onclick="window.location.href='${notif.actionUrl}'" 
                            class="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1.5 rounded-lg transition">
                            ${notif.actionLabel || 'Ver'}
                        </button>
                        <button onclick="this.closest('.fixed').remove()" class="text-slate-400 hover:text-white text-xs px-2">
                            Cerrar
                        </button>
                    </div>
                    ` : ''}
                </div>
                <button onclick="this.closest('.fixed').remove()" class="text-slate-500 hover:text-white -mt-1">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(toast);

    // Auto mark as read? Or leave it unread until clicked?
    // Let's mark as read immediately to avoid re-showing
    markAsRead(docId);

    // Remove after 6s
    setTimeout(() => {
        if (toast && toast.parentNode) toast.remove();
    }, 8000);
}

async function markAsRead(docId) {
    try {
        const db = await getDb();
        await updateDoc(doc(db, 'notifications', docId), {
            read: true,
            readAt: new Date()
        });
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
}
