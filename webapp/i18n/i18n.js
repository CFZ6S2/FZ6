/**
 * Sistema de Internacionalización (i18n) para TuCitaSegura
 * Soporta: ES (Español), EN (English), FR (Français), PT (Português), DE (Deutsch)
 *
 * @author TuCitaSegura Team
 * @version 1.0.0
 */

class I18n {
  constructor() {
    this.currentLanguage = 'es';
    this.defaultLanguage = 'es';
    this.translations = {};
    this.supportedLanguages = ['es', 'en', 'fr', 'pt', 'de']; // ES, EN, FR, PT, DE
    this.isInitialized = false;

    // Cache de traducciones para mejor rendimiento
    this.cache = new Map();
  }

  /**
   * Inicializar sistema i18n
   * @returns {Promise<string>} Idioma configurado
   */
  async init() {
    if (this.isInitialized) {
      console.log('[i18n] Already initialized');
      return this.currentLanguage;
    }

    try {
      console.log('[i18n] Initializing...');

      // 1. Detectar idioma del navegador
      const browserLang = this.detectBrowserLanguage();
      console.log('[i18n] Browser language detected:', browserLang);

      // 2. Cargar idioma guardado en localStorage
      const savedLang = localStorage.getItem('preferredLanguage');
      console.log('[i18n] Saved language:', savedLang || 'none');

      // 3. Determinar idioma a usar (prioridad: guardado > navegador > default)
      const lang = savedLang || browserLang || this.defaultLanguage;

      // 4. Cargar traducciones
      await this.setLanguage(lang);

      this.isInitialized = true;
      console.log('[i18n] ✅ Initialized successfully with language:', this.currentLanguage);

      return this.currentLanguage;
    } catch (error) {
      console.error('[i18n] ❌ Initialization failed:', error);
      // Fallback a idioma por defecto
      await this.loadTranslations(this.defaultLanguage);
      this.currentLanguage = this.defaultLanguage;
      this.isInitialized = true;
      return this.defaultLanguage;
    }
  }

  /**
   * Detectar idioma del navegador
   * @returns {string} Código de idioma (es, en, etc.)
   */
  detectBrowserLanguage() {
    const browserLang = navigator.language || navigator.userLanguage || '';
    const langCode = browserLang.split('-')[0].toLowerCase(); // 'es-ES' -> 'es'

    // Verificar si está soportado
    if (this.supportedLanguages.includes(langCode)) {
      return langCode;
    }

    return this.defaultLanguage;
  }

  /**
   * Cambiar idioma
   * @param {string} lang - Código de idioma (es, en, etc.)
   * @returns {Promise<string>} Idioma configurado
   */
  async setLanguage(lang) {
    if (!this.supportedLanguages.includes(lang)) {
      console.warn(`[i18n] Language ${lang} not supported, falling back to ${this.defaultLanguage}`);
      lang = this.defaultLanguage;
    }

    try {
      // Cargar traducciones si no están en caché
      if (!this.translations[lang]) {
        await this.loadTranslations(lang);
      }

      this.currentLanguage = lang;
      localStorage.setItem('preferredLanguage', lang);

      // Limpiar caché de traducciones
      this.cache.clear();

      // Actualizar atributo lang del HTML
      document.documentElement.lang = lang;

      // Aplicar traducciones a la página actual
      this.translatePage();

      // Disparar evento personalizado
      window.dispatchEvent(new CustomEvent('languageChanged', {
        detail: { lang, translations: this.translations[lang] }
      }));

      console.log('[i18n] ✅ Language changed to:', lang);

      return lang;
    } catch (error) {
      console.error('[i18n] ❌ Error changing language:', error);
      throw error;
    }
  }

  /**
   * Cargar archivo de traducciones desde el servidor
   * @param {string} lang - Código de idioma
   * @returns {Promise<void>}
   */
  async loadTranslations(lang) {
    try {
      console.log(`[i18n] Loading translations for: ${lang}`);

      const response = await fetch(`/webapp/i18n/locales/${lang}.json`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to load ${lang}.json`);
      }

      const translations = await response.json();

      // Validar estructura básica
      if (!translations.meta || !translations.meta.code) {
        throw new Error(`Invalid translation file structure for ${lang}`);
      }

      this.translations[lang] = translations;
      console.log(`[i18n] ✅ Translations loaded for: ${lang}`);
    } catch (error) {
      console.error(`[i18n] ❌ Error loading translations for ${lang}:`, error);

      // Fallback a idioma por defecto si no es el que falló
      if (lang !== this.defaultLanguage && !this.translations[this.defaultLanguage]) {
        console.log(`[i18n] Attempting fallback to ${this.defaultLanguage}`);
        await this.loadTranslations(this.defaultLanguage);
      } else {
        throw error;
      }
    }
  }

  /**
   * Obtener traducción por clave
   * @param {string} key - Clave en formato "section.subsection.key"
   * @param {object} vars - Variables para interpolación {name: "value"}
   * @returns {string} Texto traducido
   */
  t(key, vars = {}) {
    // Verificar caché
    const cacheKey = `${this.currentLanguage}:${key}:${JSON.stringify(vars)}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const keys = key.split('.');
    let translation = this.translations[this.currentLanguage];

    // Navegar por el objeto de traducciones
    for (const k of keys) {
      if (translation && typeof translation === 'object' && translation[k] !== undefined) {
        translation = translation[k];
      } else {
        // Fallback a idioma por defecto
        translation = this.getFallbackTranslation(key);
        break;
      }
    }

    // Si no encontró traducción, devolver la clave
    if (typeof translation !== 'string') {
      console.warn(`[i18n] Translation not found for key: ${key}`);
      return key;
    }

    // Interpolar variables
    const result = this.interpolate(translation, vars);

    // Guardar en caché
    this.cache.set(cacheKey, result);

    return result;
  }

  /**
   * Obtener traducción de fallback (idioma por defecto)
   * @param {string} key - Clave de traducción
   * @returns {string|null} Traducción o null
   */
  getFallbackTranslation(key) {
    if (!this.translations[this.defaultLanguage]) {
      return null;
    }

    const keys = key.split('.');
    let translation = this.translations[this.defaultLanguage];

    for (const k of keys) {
      if (translation && typeof translation === 'object' && translation[k] !== undefined) {
        translation = translation[k];
      } else {
        return null;
      }
    }

    return typeof translation === 'string' ? translation : null;
  }

  /**
   * Interpolar variables en string
   * Ejemplo: "Hello {{name}}" + {name: "John"} = "Hello John"
   * @param {string} str - String con placeholders
   * @param {object} vars - Variables a interpolar
   * @returns {string} String interpolado
   */
  interpolate(str, vars) {
    if (!vars || Object.keys(vars).length === 0) {
      return str;
    }

    return str.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return vars[key] !== undefined ? String(vars[key]) : match;
    });
  }

  /**
   * Traducir toda la página actual usando atributos data-i18n
   */
  translatePage() {
    console.log('[i18n] Translating page...');

    // 1. Elementos con atributo data-i18n (texto)
    const elements = document.querySelectorAll('[data-i18n]');

    elements.forEach(element => {
      const key = element.getAttribute('data-i18n');
      if (!key) return;

      const translation = this.t(key);

      // Actualizar contenido según el tipo de elemento
      if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
        if (element.hasAttribute('placeholder')) {
          element.placeholder = translation;
        } else {
          element.value = translation;
        }
      } else {
        element.textContent = translation;
      }
    });

    // 2. Elementos con atributo data-i18n-html (permite HTML)
    const htmlElements = document.querySelectorAll('[data-i18n-html]');

    htmlElements.forEach(element => {
      const key = element.getAttribute('data-i18n-html');
      if (!key) return;

      const translation = this.t(key);
      element.innerHTML = translation;
    });

    // 3. Atributos especiales
    this.translateAttributes();

    console.log('[i18n] ✅ Page translated');
  }

  /**
   * Traducir atributos especiales (title, alt, aria-label, placeholder)
   */
  translateAttributes() {
    // Title
    const titleElements = document.querySelectorAll('[data-i18n-title]');
    titleElements.forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      el.title = this.t(key);
    });

    // Alt
    const altElements = document.querySelectorAll('[data-i18n-alt]');
    altElements.forEach(el => {
      const key = el.getAttribute('data-i18n-alt');
      el.alt = this.t(key);
    });

    // Aria-label
    const ariaElements = document.querySelectorAll('[data-i18n-aria]');
    ariaElements.forEach(el => {
      const key = el.getAttribute('data-i18n-aria');
      el.setAttribute('aria-label', this.t(key));
    });

    // Placeholder
    const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
    placeholderElements.forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      el.placeholder = this.t(key);
    });
  }

  /**
   * Obtener lista de idiomas soportados con metadata
   * @returns {Array<Object>} Lista de idiomas
   */
  getAvailableLanguages() {
    return this.supportedLanguages.map(code => {
      const meta = this.translations[code]?.meta || {};
      return {
        code,
        name: meta.language || code.toUpperCase(),
        flag: meta.flag || '🌐',
        current: code === this.currentLanguage
      };
    });
  }

  /**
   * Obtener idioma actual
   * @returns {string} Código de idioma actual
   */
  getCurrentLanguage() {
    return this.currentLanguage;
  }

  /**
   * Verificar si un idioma está soportado
   * @param {string} lang - Código de idioma
   * @returns {boolean}
   */
  isLanguageSupported(lang) {
    return this.supportedLanguages.includes(lang);
  }

  /**
   * Obtener metadata del idioma actual
   * @returns {Object} Metadata del idioma
   */
  getCurrentLanguageMeta() {
    return this.translations[this.currentLanguage]?.meta || {};
  }

  /**
   * Exportar traducciones actuales (útil para debugging)
   * @returns {Object} Traducciones del idioma actual
   */
  exportCurrentTranslations() {
    return this.translations[this.currentLanguage] || {};
  }
}

// Crear instancia global
const i18n = new I18n();

// Exponer globalmente
if (typeof window !== 'undefined') {
  window.i18n = i18n;
}

// Exportar para módulos ES6
export default i18n;
