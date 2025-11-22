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

    const html = `
      <div class="relative language-selector">
        <button
          id="language-toggle"
          class="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-700/50 transition-colors duration-200"
          aria-label="Select language"
          aria-haspopup="true"
          aria-expanded="${this.isOpen}"
        >
          <span class="text-2xl" role="img" aria-label="${current.name}">${current.flag}</span>
          <span class="hidden md:inline text-sm font-medium">${current.code.toUpperCase()}</span>
          <i class="fas fa-chevron-down text-xs transition-transform duration-200 ${this.isOpen ? 'rotate-180' : ''}"></i>
        </button>

        <div
          id="language-dropdown"
          class="${this.isOpen ? '' : 'hidden'} absolute right-0 mt-2 w-52 bg-slate-800 rounded-lg shadow-xl border border-slate-700 z-50 overflow-hidden"
          role="menu"
          aria-orientation="vertical"
        >
          <div class="py-1">
            ${languages.map(lang => `
              <button
                class="language-option w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700/70 transition-colors duration-150 ${lang.current ? 'bg-slate-700/50' : ''}"
                data-lang="${lang.code}"
                role="menuitem"
                ${lang.current ? 'aria-current="true"' : ''}
              >
                <span class="text-2xl" role="img" aria-label="${lang.name}">${lang.flag}</span>
                <span class="flex-1 text-left text-sm font-medium">${lang.name}</span>
                ${lang.current ? '<i class="fas fa-check text-green-400 text-sm"></i>' : ''}
              </button>
            `).join('')}
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
    const toggle = document.getElementById('language-toggle');
    const dropdown = document.getElementById('language-dropdown');
    const options = document.querySelectorAll('.language-option');

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
    const dropdown = document.getElementById('language-dropdown');
    const toggle = document.getElementById('language-toggle');

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
    const dropdown = document.getElementById('language-dropdown');
    const toggle = document.getElementById('language-toggle');

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

    const toggle = document.getElementById('language-toggle');

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
      window.languageSelector = new LanguageSelector();
    });
  } else {
    window.languageSelector = new LanguageSelector();
  }
}

// Exportar para módulos ES6
export default LanguageSelector;
