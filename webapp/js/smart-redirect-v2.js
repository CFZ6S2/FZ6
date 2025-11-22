/**
 * Smart Redirect System v2 - Sistema inteligente de redirección mejorado
 * Versión mejorada con detección más precisa y manejo de casos especiales
 */

class SmartRedirectManagerV2 {
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
        
        // Palabras clave específicas para evitar falsos positivos
        this.keywords = {
            cesar: ['cesar'], // Exactamente "cesar"
            admin: ['admin'], // Exactamente "admin"
            search: ['search'] // Exactamente "search"
        };
        
        // Emails específicos conocidos
        this.knownEmails = {
            cesar: [
                'cesar.rodriguez@email.com',
                'cesar@email.com',
                'rodriguez.cesar@email.com'
            ],
            admin: [
                'admin@tuscitasseguras.com',
                'administrator@tuscitasseguras.com'
            ]
        };
    }

    /**
     * Determina la redirección basada en el usuario autenticado - VERSIÓN MEJORADA
     */
    async determineRedirect(user) {
        console.log('🎯 Smart Redirect V2: Analizando usuario para redirección...');
        console.log('👤 Usuario completo:', user);
        console.log('📧 Email:', user.email);
        console.log('🆔 UID:', user.uid);
        console.log('👤 DisplayName:', user.displayName);
        console.log('🏷️ Claims:', user.claims);
        
        try {
            // 1. Detectar por emails conocidos específicos
            if (user.email) {
                const emailLower = user.email.toLowerCase().trim();
                console.log('📧 Email normalizado:', emailLower);
                
                // Verificar emails conocidos de Cesar
                if (this.knownEmails.cesar.some(email => emailLower === email)) {
                    console.log('✅ Detectado usuario Cesar por email conocido - redirigiendo a dashboard Cesar');
                    console.log('🎯 Ruta Cesar:', this.redirectRoutes.cesar);
                    return this.redirectRoutes.cesar;
                }
                
                // Verificar emails conocidos de Admin
                if (this.knownEmails.admin.some(email => emailLower === email)) {
                    console.log('✅ Detectado usuario Admin por email conocido - redirigiendo a dashboard Admin');
                    console.log('🎯 Ruta Admin:', this.redirectRoutes.admin);
                    return this.redirectRoutes.admin;
                }
            }
            
            // 2. Detectar por claims de Firebase (prioridad alta)
            if (user.claims && user.claims.role) {
                const role = user.claims.role.toLowerCase();
                console.log('🏷️ Role en claims:', role);
                
                if (role === 'cesar') {
                    console.log('✅ Detectado rol Cesar por claims - redirigiendo a dashboard Cesar');
                    return this.redirectRoutes.cesar;
                }
                
                if (role === 'admin') {
                    console.log('✅ Detectado rol Admin por claims - redirigiendo a dashboard Admin');
                    return this.redirectRoutes.admin;
                }
                
                if (role === 'search') {
                    console.log('✅ Detectado rol Search por claims - redirigiendo a dashboard Search');
                    return this.redirectRoutes.search;
                }
            }
            
            // 3. Detectar por email con análisis más preciso
            if (user.email) {
                const emailLower = user.email.toLowerCase();
                
                // Extraer el nombre de usuario del email (parte antes de @)
                const username = emailLower.split('@')[0];
                console.log('👤 Username extraído:', username);
                
                // Detectar Cesar - evitar falsos positivos
                if (this._containsExactKeyword(username, 'cesar') || 
                    this._containsExactKeyword(emailLower, 'cesar')) {
                    console.log('✅ Detectado usuario Cesar por análisis de email - redirigiendo a dashboard Cesar');
                    return this.redirectRoutes.cesar;
                }
                
                // Detectar Admin - evitar falsos positivos
                if (this._containsExactKeyword(username, 'admin') || 
                    this._containsExactKeyword(emailLower, 'admin')) {
                    console.log('✅ Detectado usuario Admin por análisis de email - redirigiendo a dashboard Admin');
                    return this.redirectRoutes.admin;
                }
                
                // Detectar Search - evitar falsos positivos
                if (this._containsExactKeyword(username, 'search') || 
                    this._containsExactKeyword(emailLower, 'search')) {
                    console.log('✅ Detectado usuario Search por análisis de email - redirigiendo a dashboard Search');
                    return this.redirectRoutes.search;
                }
            }
            
            // 4. Detectar por UID o ID específico
            if (user.uid) {
                const uidLower = user.uid.toLowerCase();
                console.log('🆔 UID en minúsculas:', uidLower);
                
                if (this._containsExactKeyword(uidLower, 'cesar')) {
                    console.log('✅ Detectado usuario Cesar por UID - redirigiendo a dashboard Cesar');
                    return this.redirectRoutes.cesar;
                }
                
                if (this._containsExactKeyword(uidLower, 'admin')) {
                    console.log('✅ Detectado usuario Admin por UID - redirigiendo a dashboard Admin');
                    return this.redirectRoutes.admin;
                }
                
                if (this._containsExactKeyword(uidLower, 'search')) {
                    console.log('✅ Detectado usuario Search por UID - redirigiendo a dashboard Search');
                    return this.redirectRoutes.search;
                }
            }
            
            // 5. Detectar por displayName
            if (user.displayName) {
                const displayNameLower = user.displayName.toLowerCase();
                console.log('👤 DisplayName en minúsculas:', displayNameLower);
                
                if (this._containsExactKeyword(displayNameLower, 'cesar')) {
                    console.log('✅ Detectado usuario Cesar por displayName - redirigiendo a dashboard Cesar');
                    return this.redirectRoutes.cesar;
                }
                
                if (this._containsExactKeyword(displayNameLower, 'admin')) {
                    console.log('✅ Detectado usuario Admin por displayName - redirigiendo a dashboard Admin');
                    return this.redirectRoutes.admin;
                }
                
                if (this._containsExactKeyword(displayNameLower, 'search')) {
                    console.log('✅ Detectado usuario Search por displayName - redirigiendo a dashboard Search');
                    return this.redirectRoutes.search;
                }
            }
            
            // 6. Default - redirigir a página principal
            console.log('⚠️ Usuario estándar detectado - redirigiendo a dashboard principal');
            console.log('🎯 Ruta default:', this.redirectRoutes.default);
            return this.redirectRoutes.default;
            
        } catch (error) {
            console.warn('⚠️ Error en Smart Redirect V2, usando fallback:', error);
            console.log('🎯 Ruta fallback:', this.fallbackRoute);
            return this.fallbackRoute;
        }
    }

    /**
     * Verifica si un texto contiene una palabra clave exacta (evita falsos positivos)
     */
    _containsExactKeyword(text, keyword) {
        if (!text || !keyword) return false;
        
        // Buscar la palabra clave como palabra completa, no como parte de otra palabra
        const regex = new RegExp(`\\b${keyword}\\b`, 'i');
        return regex.test(text);
    }

    /**
     * Ejecuta la redirección con animación y logging
     */
    async executeRedirect(user, delay = 2000) {
        try {
            const targetRoute = await this.determineRedirect(user);
            
            console.log('🚀 Smart Redirect V2: Preparando redirección...');
            console.log('📍 Ruta objetivo:', targetRoute);
            console.log('⏱️ Tiempo de espera:', delay + 'ms');
            
            // Mostrar mensaje de redirección
            this.showRedirectMessage(targetRoute, delay);
            
            // Esperar el tiempo especificado
            setTimeout(() => {
                console.log('🔄 Smart Redirect V2: Ejecutando redirección a:', targetRoute);
                
                // Guardar información de redirección en localStorage
                localStorage.setItem('lastRedirect', JSON.stringify({
                    user: user.email || user.uid,
                    route: targetRoute,
                    timestamp: new Date().toISOString(),
                    version: 'v2'
                }));
                
                // Ejecutar redirección
                window.location.href = targetRoute;
                
            }, delay);
            
        } catch (error) {
            console.error('❌ Error en Smart Redirect V2:', error);
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
                    <strong>🎯 Smart Redirect V2 activado</strong><br>
                    ${message}<br>
                    <small>Redirigiendo en ${delay/1000} segundos...</small>
                </div>
            `;
            statusElement.style.display = 'block';
        }
        
        // También mostrar en consola
        console.log('📢 Smart Redirect V2 Message:', message);
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
        console.log('🔍 Smart Redirect V2: Validando redirección actual...');
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
        
        return this._containsExactKeyword(email, 'search') || 
               this._containsExactKeyword(displayName, 'search') || 
               this._containsExactKeyword(uid, 'search') ||
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

    /**
     * Obtiene información de diagnóstico
     */
    getDiagnosticInfo() {
        return {
            routes: this.redirectRoutes,
            keywords: this.keywords,
            knownEmails: this.knownEmails,
            history: this.getRedirectHistory()
        };
    }
}

// Instancia global mejorada
const smartRedirectV2 = new SmartRedirectManagerV2();

// Funciones auxiliares para compatibilidad
function executeSmartRedirect(user, delay = 2000) {
    return smartRedirectV2.executeRedirect(user, delay);
}

function validateCurrentRedirect(user) {
    const currentPath = window.location.pathname;
    return smartRedirectV2.validateAndFixRedirect(currentPath, user);
}

function getSmartRedirectDiagnostic() {
    return smartRedirectV2.getDiagnosticInfo();
}

// Exportar para uso global
window.smartRedirectV2 = smartRedirectV2;
window.executeSmartRedirect = executeSmartRedirect;
window.validateCurrentRedirect = validateCurrentRedirect;
window.getSmartRedirectDiagnostic = getSmartRedirectDiagnostic;

console.log('🎯 Smart Redirect System V2 cargado exitosamente');