// demo-mode.js - Demo mode utilities for TuCitaSegura
// Provides functions to detect and handle demo users when Firebase is unavailable

/**
 * Check if current user is in demo mode
 * @returns {boolean} - True if demo mode is active
 */
export function isDemoMode() {
    return localStorage.getItem('isDemoMode') === 'true';
}

/**
 * Get current demo user data
 * @returns {Object|null} - Demo user data or null
 */
export function getDemoUser() {
    const demoUser = localStorage.getItem('demoUser');
    return demoUser ? JSON.parse(demoUser) : null;
}

/**
 * Get demo token
 * @returns {string|null} - Demo token or null
 */
export function getDemoToken() {
    return localStorage.getItem('demoToken');
}

/**
 * Clear demo mode data
 */
export function clearDemoMode() {
    localStorage.removeItem('isDemoMode');
    localStorage.removeItem('demoUser');
    localStorage.removeItem('demoToken');
}

/**
 * Initialize demo mode UI indicators
 */
export function initDemoModeUI() {
    if (isDemoMode()) {
        // Add demo mode banner
        const banner = document.createElement('div');
        banner.id = 'demo-mode-banner';
        banner.innerHTML = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                background: linear-gradient(45deg, #f59e0b, #ef4444);
                color: white;
                text-align: center;
                padding: 8px;
                font-size: 14px;
                font-weight: 600;
                z-index: 9999;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            ">
                🎯 MODO DEMO ACTIVO - Funcionalidad limitada
                <button onclick="window.exitDemoMode()" style="
                    margin-left: 10px;
                    background: white;
                    color: #f59e0b;
                    border: none;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 12px;
                    cursor: pointer;
                ">Salir</button>
            </div>
        `;
        document.body.appendChild(banner);
        
        // Add margin to prevent content overlap
        document.body.style.marginTop = '40px';
        
        // Add exit function to window
        window.exitDemoMode = function() {
            if (confirm('¿Salir del modo demo?')) {
                clearDemoMode();
                window.location.href = '/webapp/login.html';
            }
        };
    }
}

/**
 * Simulate Firebase auth state for demo users
 * @returns {Object} - Simulated auth state
 */
export function getDemoAuthState() {
    const demoUser = getDemoUser();
    if (!demoUser) return null;
    
    return {
        uid: demoUser.uid,
        email: demoUser.email,
        displayName: demoUser.displayName,
        emailVerified: false,
        isDemo: true,
        metadata: {
            creationTime: demoUser.createdAt,
            lastSignInTime: new Date().toISOString()
        }
    };
}

/**
 * Simulate Firebase Firestore operations for demo mode
 * @param {string} collection - Collection name
 * @param {Object} data - Data to save
 */
export function saveDemoData(collection, data) {
    const key = `demo_${collection}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    existing.push({
        ...data,
        id: Date.now().toString(),
        timestamp: new Date().toISOString()
    });
    localStorage.setItem(key, JSON.stringify(existing));
}

/**
 * Get demo data from localStorage
 * @param {string} collection - Collection name
 * @returns {Array} - Array of demo data
 */
export function getDemoData(collection) {
    const key = `demo_${collection}`;
    return JSON.parse(localStorage.getItem(key) || '[]');
}

/**
 * Initialize demo mode on page load
 */
export function initializeDemoMode() {
    if (isDemoMode()) {
        initDemoModeUI();
        console.log('🎯 Demo mode active - User:', getDemoUser()?.email);
    }
}

// Auto-initialize on script load
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', initializeDemoMode);
}