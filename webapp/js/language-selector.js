/**
 * Componente selector de idioma para TuCitaSegura
 * Proporciona UI para cambiar entre idiomas soportados
 *
 * @author TuCitaSegura Team
 * @version 1.0.0
 */

class LanguageSelector {
  constructor(containerId = 'language-selector-container') {
    this.containerId = containerId;
    this.container = null;
    this.isOpen = false;

    // Esperar a que i18n esté inicializado
    this.waitForI18n().then(() => {
      this.init();
    });
  }

  /**
   * Esperar a que i18n esté disponible y inicializado
   */
  async waitForI18n() {
    let attempts = 0;
    const maxAttempts = 50; // 5 segundos máximo

    while (attempts < maxAttempts) {
      if (window.i18n && window.i18n.isInitialized) {
        console.log('[LanguageSelector] i18n is ready');
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }

    console.error('[LanguageSelector] i18n not available after timeout');
  }

  /**
   * Inicializar el selector
   */
  init() {
    // Esperar a que el DOM esté listo
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      this.setup();
    }
  }

  /**
   * Configurar el selector
   */
  setup() {
    this.container = document.getElementById(this.containerId);

    if (!this.container) {
      console.warn(`[LanguageSelector] Container #${this.containerId} not found`);
      return;
    }

    this.render();
    this.attachEvents();

    console.log('[LanguageSelector] ✅ Initialized');
  }

  /**
   * Renderizar el selector de idioma
   */
  render() {
    if (!this.container || !window.i18n) return;

    const languages = window.i18n.getAvailableLanguages();
    const current = languages.find(l => l.current) || languages[0];

    // Generar IDs únicos para cada instancia
    const toggleId = `language-toggle-${this.containerId}`;
    const dropdownId = `language-dropdown-${this.containerId}`;

    // Determinar si es móvil para usar fondo sólido
    const isMobile = this.containerId.includes('mobile');
    const bgClass = isMobile ? 'bg-black' : 'language-selector-glass';
    const dropdownBgClass = 'bg-slate-900 border border-white/20'; // Always opaque

    const html = `
      <style>
        .language-selector-glass {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }

        /* Fondo sólido para selector móvil */
        #language-selector-mobile .language-selector-glass {
          background: rgb(30, 41, 59);
          backdrop-filter: none;
          -webkit-backdrop-filter: none;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        #language-selector-mobile .language-option {
          background: transparent;
        }

        #language-selector-mobile .language-option:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .language-toggle-btn {
          position: relative;
          overflow: hidden;
        }

        .language-toggle-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
          transition: left 0.5s;
        }

        .language-toggle-btn:hover::before {
          left: 100%;
        }

        .language-option {
          position: relative;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .language-option::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          height: 100%;
          width: 3px;
          background: linear-gradient(180deg, #3b82f6, #8b5cf6);
          transform: scaleY(0);
          transition: transform 0.2s;
        }

        .language-option:hover::before {
          transform: scaleY(1);
        }

        .language-option:hover {
          transform: translateX(4px);
        }

        .language-flag {
          font-size: 1.75rem;
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
          transition: transform 0.2s;
        }

        .language-option:hover .language-flag {
          transform: scale(1.15);
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .language-dropdown-open {
          animation: slideDown 0.2s ease-out;
        }
      </style>

      <div class="relative language-selector">
        <button
          id="${toggleId}"
          class="language-toggle-btn ${bgClass} flex items-center gap-2 px-4 py-2.5 rounded-xl hover:shadow-lg transition-all duration-200"
          aria-label="Select language"
          aria-haspopup="true"
          aria-expanded="${this.isOpen}"
        >
          <span class="language-flag" role="img" aria-label="${current.name}">${current.flag}</span>
          <span class="hidden sm:inline text-sm font-semibold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">${current.code.toUpperCase()}</span>
          <i class="fas fa-chevron-down text-xs transition-transform duration-300 ${this.isOpen ? 'rotate-180 text-blue-400' : 'text-slate-400'}"></i>
        </button>

        <div
          id="${dropdownId}"
          class="${this.isOpen ? 'language-dropdown-open' : 'hidden'} absolute right-0 mt-3 w-64 ${dropdownBgClass} rounded-2xl shadow-2xl z-50 overflow-hidden"
          role="menu"
          aria-orientation="vertical"
        >
          <div class="p-2">
            <div class="text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-2 mb-1">
              <i class="fas fa-globe mr-2"></i>Seleccionar Idioma
            </div>
            ${languages.map(lang => `
              <button
                class="language-option w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-white/10 transition-all duration-200 ${lang.current ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 shadow-lg' : ''}"
                data-lang="${lang.code}"
                role="menuitem"
                ${lang.current ? 'aria-current="true"' : ''}
              >
                <span class="language-flag" role="img" aria-label="${lang.name}">${lang.flag}</span>
                <div class="flex-1 text-left">
                  <div class="text-sm font-semibold ${lang.current ? 'text-blue-300' : 'text-white'}">${lang.name}</div>
                  <div class="text-xs text-slate-400">${lang.code.toUpperCase()}</div>
                </div>
                ${lang.current ? `
                  <div class="flex items-center gap-1">
                    <div class="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                    <span class="text-xs font-medium text-green-400">Activo</span>
                  </div>
                ` : ''}
              </button>
            `).join('')}
          </div>

          <div class="px-4 py-3 bg-slate-900/50 border-t border-white/5">
            <p class="text-xs text-slate-400 text-center">
              <i class="fas fa-language mr-1"></i>
              ${languages.length} idiomas disponibles
            </p>
          </div>
        </div>
      </div>
    `;

    this.container.innerHTML = html;
  }

  /**
   * Adjuntar event listeners
   */
  attachEvents() {
    const toggleId = `language-toggle-${this.containerId}`;
    const dropdownId = `language-dropdown-${this.containerId}`;

    const toggle = document.getElementById(toggleId);
    const dropdown = document.getElementById(dropdownId);
    const options = this.container.querySelectorAll('.language-option');

    if (!toggle || !dropdown) {
      console.warn('[LanguageSelector] Required elements not found');
      return;
    }

    // Toggle dropdown al hacer click en el botón
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleDropdown();
    });

    // Cerrar dropdown al hacer click fuera
    document.addEventListener('click', (e) => {
      if (!this.container.contains(e.target)) {
        this.closeDropdown();
      }
    });

    // Cerrar con tecla Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.closeDropdown();
        toggle.focus();
      }
    });

    // Cambiar idioma al seleccionar una opción
    options.forEach(option => {
      option.addEventListener('click', async (e) => {
        const lang = e.currentTarget.getAttribute('data-lang');
        await this.changeLanguage(lang);
      });

      // Soporte para teclado
      option.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const lang = e.currentTarget.getAttribute('data-lang');
          await this.changeLanguage(lang);
        }
      });
    });

    // Escuchar cambios de idioma externos
    window.addEventListener('languageChanged', () => {
      this.render();
      this.attachEvents();
    });
  }

  /**
   * Abrir/cerrar dropdown
   */
  toggleDropdown() {
    this.isOpen = !this.isOpen;
    const toggleId = `language-toggle-${this.containerId}`;
    const dropdownId = `language-dropdown-${this.containerId}`;
    const dropdown = document.getElementById(dropdownId);
    const toggle = document.getElementById(toggleId);

    if (dropdown && toggle) {
      dropdown.classList.toggle('hidden', !this.isOpen);
      toggle.setAttribute('aria-expanded', this.isOpen);

      // Rotar chevron
      const chevron = toggle.querySelector('.fa-chevron-down');
      if (chevron) {
        chevron.classList.toggle('rotate-180', this.isOpen);
      }
    }
  }

  /**
   * Cerrar dropdown
   */
  closeDropdown() {
    this.isOpen = false;
    const toggleId = `language-toggle-${this.containerId}`;
    const dropdownId = `language-dropdown-${this.containerId}`;
    const dropdown = document.getElementById(dropdownId);
    const toggle = document.getElementById(toggleId);

    if (dropdown && toggle) {
      dropdown.classList.add('hidden');
      toggle.setAttribute('aria-expanded', 'false');

      // Resetear chevron
      const chevron = toggle.querySelector('.fa-chevron-down');
      if (chevron) {
        chevron.classList.remove('rotate-180');
      }
    }
  }

  /**
   * Cambiar idioma
   * @param {string} lang - Código de idioma
   */
  async changeLanguage(lang) {
    if (!window.i18n) {
      console.error('[LanguageSelector] i18n not available');
      return;
    }

    const toggleId = `language-toggle-${this.containerId}`;
    const toggle = document.getElementById(toggleId);

    try {
      // Mostrar loading
      if (toggle) {
        toggle.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        toggle.disabled = true;
      }

      console.log('[LanguageSelector] Changing language to:', lang);

      // Cambiar idioma
      await window.i18n.setLanguage(lang);

      // Cerrar dropdown
      this.closeDropdown();

      // Re-renderizar selector
      this.render();
      this.attachEvents();

      // Mostrar notificación (opcional)
      this.showSuccessNotification(lang);

    } catch (error) {
      console.error('[LanguageSelector] Error changing language:', error);

      // Mostrar error
      this.showErrorNotification();

      // Restaurar selector
      this.render();
      this.attachEvents();
    }
  }

  /**
   * Mostrar notificación de éxito (opcional)
   * @param {string} lang - Código de idioma
   */
  showSuccessNotification(lang) {
    // Puedes implementar una notificación toast aquí
    console.log(`[LanguageSelector] ✅ Language changed to: ${lang}`);
  }

  /**
   * Mostrar notificación de error (opcional)
   */
  showErrorNotification() {
    // Puedes implementar una notificación toast de error aquí
    console.error('[LanguageSelector] ❌ Failed to change language');
  }

  /**
   * Destruir el selector (cleanup)
   */
  destroy() {
    if (this.container) {
      this.container.innerHTML = '';
    }

    // Remover event listeners globales
    // (En una implementación más compleja, guardarías referencias para removerlos)

    console.log('[LanguageSelector] Destroyed');
  }
}

// Auto-inicializar si el DOM está listo
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      // Inicializar selector para desktop
      window.languageSelector = new LanguageSelector('language-selector-container');
      // Inicializar selector para mobile
      window.languageSelectorMobile = new LanguageSelector('language-selector-mobile');
    });
  } else {
    // Inicializar selector para desktop
    window.languageSelector = new LanguageSelector('language-selector-container');
    // Inicializar selector para mobile
    window.languageSelectorMobile = new LanguageSelector('language-selector-mobile');
  }
}

// Exportar para módulos ES6
export default LanguageSelector;
