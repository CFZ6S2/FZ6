/**
 * Smart Redirect System - Sistema inteligente de redirección después de login
 * Detecta el tipo de usuario y redirige a la página correcta
 */

class SmartRedirectManager {
    constructor() {
        this.userRoles = {
            ADMIN: 'admin',
            USER: 'user', 
            CESAR: 'cesar',
            SEARCH: 'search',
            DEFAULT: 'default'
        };
        
        this.redirectRoutes = {
            admin: '/webapp/admin/dashboard.html',
            user: '/webapp/user/dashboard.html',
            cesar: '/webapp/cesar/dashboard.html',
            search: '/webapp/search/dashboard.html',
            default: '/webapp/index.html'
        };
        
        this.fallbackRoute = '/webapp/index.html';
    }

    /**
     * Determina la redirección basada en el usuario autenticado
     */
    async determineRedirect(user) {
        console.log('🎯 Smart Redirect: Analizando usuario para redirección...');
        console.log('👤 Usuario completo:', user);
        console.log('📧 Email:', user.email);
        console.log('🆔 UID:', user.uid);
        console.log('👤 DisplayName:', user.displayName);
        console.log('🏷️ Claims:', user.claims);
        
        try {
            // 1. Detectar por email específico
            if (user.email) {
                const emailLower = user.email.toLowerCase();
                console.log('📧 Email en minúsculas:', emailLower);
                
                if (emailLower.includes('cesar')) {
                    console.log('✅ Detectado usuario Cesar por email - redirigiendo a dashboard Cesar');
                    console.log('🎯 Ruta Cesar:', this.redirectRoutes.cesar);
                    return this.redirectRoutes.cesar;
                }
                
                if (emailLower.includes('admin')) {
                    console.log('✅ Detectado usuario Admin por email - redirigiendo a dashboard Admin');
                    console.log('🎯 Ruta Admin:', this.redirectRoutes.admin);
                    return this.redirectRoutes.admin;
                }
                
                if (emailLower.includes('search')) {
                    console.log('✅ Detectado usuario Search por email - redirigiendo a dashboard Search');
                    console.log('🎯 Ruta Search:', this.redirectRoutes.search);
                    return this.redirectRoutes.search;
                }
            }
            
            // 2. Detectar por claims de Firebase
            if (user.claims) {
                if (user.claims.role === 'admin') {
                    console.log('✅ Detectado rol Admin por claims - redirigiendo a dashboard Admin');
                    return this.redirectRoutes.admin;
                }
                
                if (user.claims.role === 'search') {
                    console.log('✅ Detectado rol Search por claims - redirigiendo a dashboard Search');
                    return this.redirectRoutes.search;
                }
            }
            
            // 3. Detectar por UID o ID específico
            if (user.uid) {
                const uidLower = user.uid.toLowerCase();
                console.log('🆔 UID en minúsculas:', uidLower);
                
                if (uidLower.includes('cesar')) {
                    console.log('✅ Detectado usuario Cesar por UID - redirigiendo a dashboard Cesar');
                    return this.redirectRoutes.cesar;
                }
            }
            
            // 4. Detectar por displayName
            if (user.displayName) {
                const displayNameLower = user.displayName.toLowerCase();
                console.log('👤 DisplayName en minúsculas:', displayNameLower);
                
                if (displayNameLower.includes('cesar')) {
                    console.log('✅ Detectado usuario Cesar por displayName - redirigiendo a dashboard Cesar');
                    return this.redirectRoutes.cesar;
                }
            }
            
            // 5. Default - redirigir a página principal
            console.log('⚠️ Usuario estándar detectado - redirigiendo a dashboard principal');
            console.log('🎯 Ruta default:', this.redirectRoutes.default);
            return this.redirectRoutes.default;
            
        } catch (error) {
            console.warn('⚠️ Error en Smart Redirect, usando fallback:', error);
            console.log('🎯 Ruta fallback:', this.fallbackRoute);
            return this.fallbackRoute;
        }
    }

    /**
     * Ejecuta la redirección con animación y logging
     */
    async executeRedirect(user, delay = 2000) {
        try {
            const targetRoute = await this.determineRedirect(user);
            
            console.log('🚀 Smart Redirect: Preparando redirección...');
            console.log('📍 Ruta objetivo:', targetRoute);
            console.log('⏱️ Tiempo de espera:', delay + 'ms');
            
            // Mostrar mensaje de redirección
            this.showRedirectMessage(targetRoute, delay);
            
            // Esperar el tiempo especificado
            setTimeout(() => {
                console.log('🔄 Smart Redirect: Ejecutando redirección a:', targetRoute);
                
                // Guardar información de redirección en localStorage
                localStorage.setItem('lastRedirect', JSON.stringify({
                    user: user.email || user.uid,
                    route: targetRoute,
                    timestamp: new Date().toISOString()
                }));
                
                // Ejecutar redirección
                window.location.href = targetRoute;
                
            }, delay);
            
        } catch (error) {
            console.error('❌ Error en Smart Redirect:', error);
            console.log('🔄 Usando redirección de fallback...');
            
            setTimeout(() => {
                window.location.href = this.fallbackRoute;
            }, delay);
        }
    }

    /**
     * Muestra mensaje informativo de redirección
     */
    showRedirectMessage(route, delay) {
        const message = this.getRedirectMessage(route);
        
        // Si hay un elemento de estado en la página, usarlo
        const statusElement = document.getElementById('status');
        if (statusElement) {
            statusElement.innerHTML = `
                <div style="background: #d4edda; color: #155724; padding: 12px; border-radius: 8px; border: 1px solid #c3e6cb; margin-top: 15px;">
                    <strong>🎯 Redirección inteligente activada</strong><br>
                    ${message}<br>
                    <small>Redirigiendo en ${delay/1000} segundos...</small>
                </div>
            `;
            statusElement.style.display = 'block';
        }
        
        // También mostrar en consola
        console.log('📢 Smart Redirect Message:', message);
    }

    /**
     * Obtiene mensaje personalizado según la ruta
     */
    getRedirectMessage(route) {
        if (route.includes('cesar')) {
            return '🧑‍💼 Usuario Cesar detectado - Accediendo a dashboard especial...';
        } else if (route.includes('admin')) {
            return '👨‍💼 Panel de administración detectado - Accediendo a dashboard admin...';
        } else if (route.includes('search')) {
            return '🔍 Usuario de búsqueda detectado - Accediendo a dashboard de búsqueda...';
        } else if (route.includes('user')) {
            return '👤 Dashboard de usuario detectado - Accediendo a panel de usuario...';
        } else {
            return '🏠 Accediendo a la página principal...';
        }
    }

    /**
     * Verifica y corrige redirecciones problemáticas
     */
    validateAndFixRedirect(currentPath, user) {
        console.log('🔍 Smart Redirect: Validando redirección actual...');
        console.log('📍 Ruta actual:', currentPath);
        
        // Si estamos en una página de búsqueda inesperada
        if (currentPath.includes('search') && !this.shouldBeInSearch(user)) {
            console.log('⚠️ Detectada redirección incorrecta a búsqueda - corrigiendo...');
            this.executeRedirect(user, 0); // Redirigir inmediatamente
            return true;
        }
        
        return false;
    }

    /**
     * Determina si el usuario debería estar en búsqueda
     */
    shouldBeInSearch(user) {
        if (!user) return false;
        
        const email = user.email ? user.email.toLowerCase() : '';
        const displayName = user.displayName ? user.displayName.toLowerCase() : '';
        const uid = user.uid ? user.uid.toLowerCase() : '';
        
        return email.includes('search') || 
               displayName.includes('search') || 
               uid.includes('search') ||
               (user.claims && user.claims.role === 'search');
    }

    /**
     * Obtiene estadísticas de redirecciones anteriores
     */
    getRedirectHistory() {
        try {
            const history = localStorage.getItem('lastRedirect');
            return history ? JSON.parse(history) : null;
        } catch (error) {
            console.warn('⚠️ Error obteniendo historial de redirección:', error);
            return null;
        }
    }

    /**
     * Limpia el historial de redirecciones
     */
    clearRedirectHistory() {
        localStorage.removeItem('lastRedirect');
        console.log('🧹 Historial de redirección limpiado');
    }
}

// Instancia global
const smartRedirect = new SmartRedirectManager();

// Función auxiliar para redirección inteligente
function executeSmartRedirect(user, delay = 2000) {
    return smartRedirect.executeRedirect(user, delay);
}

// Función para validar redirección actual
function validateCurrentRedirect(user) {
    const currentPath = window.location.pathname;
    return smartRedirect.validateAndFixRedirect(currentPath, user);
}

// Exportar para uso global
window.smartRedirect = smartRedirect;
window.executeSmartRedirect = executeSmartRedirect;
window.validateCurrentRedirect = validateCurrentRedirect;