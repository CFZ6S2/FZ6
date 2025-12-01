/**
 * Sistema de protección de rutas para TuCitaSegura
 * Verifica que el usuario tenga email verificado y perfil completado
 * Integrado con backend FastAPI
 */

import { apiService, handleAPIError } from './api-service.js';
import { createLogger } from './logger.js';

const logger = createLogger('auth-guard');

class AuthGuard {
    constructor() {
        this.checkAuthStatus();
    }

    /**
     * Verifica el estado de autenticación del usuario
     */
    async checkAuthStatus() {
        try {
            const user = firebase.auth().currentUser;

            if (!user) {
                // No hay usuario autenticado
                this.redirectToLogin();
                return false;
            }

            // Obtener token con custom claims para verificar si es admin
            const tokenResult = await user.getIdTokenResult();
            const isAdmin = tokenResult.claims.role === 'admin';

            // ADMINS: Los administradores NO necesitan email verificado ni perfil completo
            if (isAdmin) {
                logger.info('Admin authenticated - bypassing profile checks', { uid: user.uid });
                return true;
            }

            // USUARIOS NORMALES: Verificar email verificado
            if (!user.emailVerified) {
                this.redirectToEmailVerification();
                return false;
            }

            // Verificar backend auth
            const backendAuth = await this.checkBackendAuth();
            if (!backendAuth) {
                return false;
            }

            // Verificar perfil completado
            const profileComplete = await this.checkProfileComplete(user.uid);
            if (!profileComplete) {
                this.redirectToCompleteProfile();
                return false;
            }

            return true;
            
        } catch (error) {
            logger.error('Error verificando autenticación', error);
            this.redirectToLogin();
            return false;
        }
    }

    /**
     * Verifica autenticación con backend
     */
    async checkBackendAuth() {
        try {
            const token = await AuthGuard.getAuthToken();
            apiService.setToken(token);
            
            // Verificar conexión con backend
            const isAvailable = await apiService.isBackendAvailable();
            if (!isAvailable) {
                logger.warn('Backend no disponible, usando solo Firebase');
                return true; // Permitir acceso con Firebase solo
            }

            // Verificar estado de autenticación en backend
            const authStatus = await apiService.checkAuthStatus();
            logger.debug('Backend auth status verified', { authStatus });
            
            return true;
            
        } catch (error) {
            if (error.message.includes('403')) {
                logger.error('Backend auth failed - access denied', error);
                return false;
            }

            logger.warn('Backend auth check failed, continuing with Firebase', error);
            return true; // Fallback a Firebase
        }
    }

    /**
     * Verifica si el perfil del usuario está completado
     */
    async checkProfileComplete(userId) {
        try {
            const userDoc = await firebase.firestore().collection('users').doc(userId).get();
            
            if (!userDoc.exists) {
                return false;
            }

            const userData = userDoc.data();
            
            // Verificar campos obligatorios
            const requiredFields = ['alias', 'birth_date', 'gender', 'city', 'profession', 'bio'];
            for (const field of requiredFields) {
                if (!userData[field]) {
                    return false;
                }
            }

            // Verificar bio tenga al menos 120 palabras
            if (userData.bio) {
                const wordCount = userData.bio.split(/\s+/).length;
                if (wordCount < 120) {
                    return false;
                }
            }

            // Verificar mínimo 3 fotos
            const photos = userData.photos || [];
            if (photos.length < 3) {
                return false;
            }

            return true;

        } catch (error) {
            logger.error('Error verificando perfil', error);
            return false;
        }
    }

    /**
     * Redirige al login
     */
    redirectToLogin() {
        const currentPage = window.location.pathname;
        if (!currentPage.includes('login.html') && !currentPage.includes('register.html')) {
            window.location.href = '/login.html?redirect=' + encodeURIComponent(currentPage);
        }
    }

    /**
     * Redirige a la verificación de email
     */
    redirectToEmailVerification() {
        const currentPage = window.location.pathname;
        if (!currentPage.includes('verify-email.html')) {
            window.location.href = '/verify-email.html?redirect=' + encodeURIComponent(currentPage);
        }
    }

    /**
     * Redirige a completar perfil
     */
    redirectToCompleteProfile() {
        const currentPage = window.location.pathname;
        if (!currentPage.includes('complete-profile.html')) {
            window.location.href = '/complete-profile.html?redirect=' + encodeURIComponent(currentPage);
        }
    }

    /**
     * Protege una página específica
     */
    static async protectPage() {
        const guard = new AuthGuard();
        return await guard.checkAuthStatus();
    }

    /**
     * Obtiene el token de autenticación para las peticiones al backend
     */
    static async getAuthToken() {
        try {
            const user = firebase.auth().currentUser;
            if (!user) {
                throw new Error('Usuario no autenticado');
            }
            
            // Forzar refresco del token
            const token = await user.getIdToken(true);
            return token;
            
        } catch (error) {
            logger.error('Error obteniendo token', error);
            throw error;
        }
    }
}

// Auto-proteger páginas que lo requieran
document.addEventListener('DOMContentLoaded', async () => {
    // Lista de páginas que requieren protección completa (email verificado + perfil completado)
    const protectedPages = [
        'video-chat.html',
        'perfil.html',
        'buscar-usuarios.html',
        'mensajes.html',
        'eventos-vip.html',
        'referidos.html'
    ];

    const currentPage = window.location.pathname;
    const pageName = currentPage.split('/').pop();

    if (protectedPages.includes(pageName)) {
        const isAuthenticated = await AuthGuard.protectPage();
        if (!isAuthenticated) {
            logger.info('Acceso denegado - redirigiendo', { page: pageName });
        }
    }
});

// Hacer disponible globalmente
window.AuthGuard = AuthGuard;