import { auth, getDb } from './firebase-config-env.js';
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

class PresenceService {
    constructor() {
        this.HEARTBEAT_INTERVAL = 5 * 60 * 1000; // 5 minutes
        this.currentUser = null;
        this.isVisible = true;
        this.isActive = true;
        this.timer = null;
        this.init();
    }

    init() {
        // Listen for auth state
        onAuthStateChanged(auth, (user) => {
            if (user) {
                this.currentUser = user;
                this.startHeartbeat();
                // Update immediately on connect
                this.updatePresence('online');
            } else {
                this.stopHeartbeat();
                this.currentUser = null;
            }
        });

        // Visibility API
        document.addEventListener('visibilitychange', () => {
            this.isVisible = document.visibilityState === 'visible';
            if (this.isVisible && this.currentUser) {
                this.updatePresence('online');
            }
        });

        // Window unload (best effort disconnect)
        window.addEventListener('beforeunload', () => {
            if (this.currentUser) {
                // Warning: Async calls in beforeunload are not guaranteed. 
                // We depend on the backend cleanup job for reliable offline status.
                // However, we can try using navigator.sendBeacon if we had an API endpoint, 
                // but direct Firestore access is tricky here. 
                // We'll leave it as best effort or rely on the timeout.
            }
        });
    }

    startHeartbeat() {
        if (this.timer) clearInterval(this.timer);
        this.timer = setInterval(() => {
            if (this.currentUser && this.isVisible) {
                this.updatePresence('online');
            }
        }, this.HEARTBEAT_INTERVAL);
    }

    stopHeartbeat() {
        if (this.timer) clearInterval(this.timer);
        this.timer = null;
    }

    async updatePresence(status) {
        if (!this.currentUser) return;

        try {
            const db = await getDb();
            const userRef = doc(db, "users", this.currentUser.uid);
            await updateDoc(userRef, {
                isOnline: status === 'online',
                lastActivity: serverTimestamp(),
                lastSeen: serverTimestamp() // Legacy support if needed
            });
            console.log(`[Presence] Status updated: ${status}`);
        } catch (error) {
            console.error("[Presence] Error updating status:", error);
        }
    }
}

// Initialize singleton
const presenceService = new PresenceService();
export default presenceService;
