// image-optimizer.js - WebP support and lazy loading utilities

import { logger } from './logger.js';

/**
 * Detectar soporte de WebP en el navegador
 * @returns {Promise<boolean>}
 */
export async function supportsWebP() {
  if (!window.createImageBitmap) return false;

  const webpData = 'data:image/webp;base64,UklGRh4AAABXRUJQVlA4TBEAAAAvAAAAAAfQ//73v/+BiOh/AAA=';

  try {
    const blob = await fetch(webpData).then(r => r.blob());
    const bitmap = await createImageBitmap(blob);
    return bitmap.width === 1;
  } catch {
    return false;
  }
}

/**
 * Convertir URL de imagen a formato WebP si es soportado
 * @param {string} url - URL original de la imagen
 * @param {boolean} forceWebP - Forzar conversión a WebP
 * @returns {Promise<string>} URL optimizada
 */
export async function getOptimizedImageUrl(url, forceWebP = false) {
  // Si no es una URL válida, retornar tal cual
  if (!url || typeof url !== 'string') {
    return url;
  }

  // Si es una imagen de Firebase Storage
  if (url.includes('firebasestorage.googleapis.com')) {
    const hasWebPSupport = await supportsWebP();

    if (hasWebPSupport || forceWebP) {
      // Agregar transformación para WebP
      // Firebase Storage no convierte automáticamente, pero podemos usar imgix o similar
      // Por ahora, solo retornamos la URL original
      // TODO: Implementar conversión serverless si es necesario
      return url;
    }
  }

  return url;
}

/**
 * Clase para manejar lazy loading de imágenes
 */
export class LazyImageLoader {
  constructor(options = {}) {
    this.options = {
      root: null,
      rootMargin: options.rootMargin || '50px',
      threshold: options.threshold || 0.01,
      loadingClass: options.loadingClass || 'lazy-loading',
      loadedClass: options.loadedClass || 'lazy-loaded',
      errorClass: options.errorClass || 'lazy-error'
    };

    this.observer = null;
    this.images = new Set();

    this.init();
  }

  /**
   * Inicializar Intersection Observer
   */
  init() {
    if (!('IntersectionObserver' in window)) {
      logger.warn('IntersectionObserver not supported, loading all images immediately');
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => this.handleIntersection(entries),
      {
        root: this.options.root,
        rootMargin: this.options.rootMargin,
        threshold: this.options.threshold
      }
    );

    logger.info('LazyImageLoader initialized');
  }

  /**
   * Manejar intersección de imágenes
   * @param {IntersectionObserverEntry[]} entries
   */
  handleIntersection(entries) {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        this.loadImage(entry.target);
      }
    });
  }

  /**
   * Cargar imagen
   * @param {HTMLImageElement} img - Elemento de imagen
   */
  async loadImage(img) {
    if (img.classList.contains(this.options.loadedClass)) {
      return;
    }

    img.classList.add(this.options.loadingClass);

    const src = img.dataset.src;
    const srcset = img.dataset.srcset;

    if (!src && !srcset) {
      logger.warn('Image has no data-src or data-srcset', img);
      this.observer?.unobserve(img);
      return;
    }

    try {
      // Obtener URL optimizada
      const optimizedSrc = src ? await getOptimizedImageUrl(src) : null;

      // Precargar la imagen
      await this.preloadImage(optimizedSrc || src);

      // Establecer src y srcset
      if (optimizedSrc) {
        img.src = optimizedSrc;
      }
      if (srcset) {
        img.srcset = srcset;
      }

      // Actualizar clases
      img.classList.remove(this.options.loadingClass);
      img.classList.add(this.options.loadedClass);

      // Dejar de observar esta imagen
      this.observer?.unobserve(img);
      this.images.delete(img);

      logger.debug('Image loaded:', src);
    } catch (error) {
      logger.error('Error loading image:', error, { src });
      img.classList.remove(this.options.loadingClass);
      img.classList.add(this.options.errorClass);
      this.observer?.unobserve(img);
      this.images.delete(img);
    }
  }

  /**
   * Precargar imagen para asegurar que se descargó
   * @param {string} src - URL de la imagen
   * @returns {Promise<void>}
   */
  preloadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = src;
    });
  }

  /**
   * Observar elemento de imagen
   * @param {HTMLImageElement|HTMLElement} element
   */
  observe(element) {
    if (!this.observer) {
      // Si no hay observer, cargar inmediatamente
      this.loadImage(element);
      return;
    }

    this.images.add(element);
    this.observer.observe(element);
  }

  /**
   * Observar múltiples imágenes
   * @param {NodeList|Array<HTMLElement>} elements
   */
  observeAll(elements) {
    elements.forEach((el) => this.observe(el));
  }

  /**
   * Dejar de observar elemento
   * @param {HTMLElement} element
   */
  unobserve(element) {
    if (this.observer) {
      this.observer.unobserve(element);
    }
    this.images.delete(element);
  }

  /**
   * Destruir el loader
   */
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.images.clear();
  }
}

/**
 * Inicializar lazy loading en toda la página
 * @param {Object} options - Opciones de configuración
 * @returns {LazyImageLoader}
 */
export function initLazyLoading(options = {}) {
  const loader = new LazyImageLoader(options);

  // Buscar todas las imágenes con data-src
  const lazyImages = document.querySelectorAll('img[data-src], img[data-srcset]');

  if (lazyImages.length > 0) {
    loader.observeAll(lazyImages);
    logger.info(`Lazy loading initialized for ${lazyImages.length} images`);
  }

  // Observar imágenes añadidas dinámicamente
  if ('MutationObserver' in window) {
    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) { // Element node
            // Verificar si el nodo es una imagen lazy
            if (node.matches && node.matches('img[data-src], img[data-srcset]')) {
              loader.observe(node);
            }
            // Buscar imágenes lazy dentro del nodo
            const lazyImgs = node.querySelectorAll?.('img[data-src], img[data-srcset]');
            if (lazyImgs && lazyImgs.length > 0) {
              loader.observeAll(lazyImgs);
            }
          }
        });
      });
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });

    logger.debug('MutationObserver set up for dynamic lazy images');
  }

  return loader;
}

/**
 * Generar srcset para imagen responsive
 * @param {string} baseUrl - URL base de la imagen
 * @param {number[]} widths - Anchos deseados
 * @returns {string} String de srcset
 */
export function generateSrcset(baseUrl, widths = [320, 640, 960, 1280, 1920]) {
  // Si la URL es de Firebase Storage, podríamos agregar parámetros de transformación
  // Por ahora, simplemente retornamos la URL base para cada ancho
  // TODO: Implementar transformaciones reales cuando tengamos un servicio de procesamiento

  return widths.map(width => `${baseUrl} ${width}w`).join(', ');
}

/**
 * Crear elemento de imagen responsive con lazy loading
 * @param {Object} options
 * @returns {HTMLImageElement}
 */
export function createResponsiveImage(options = {}) {
  const {
    src,
    alt = '',
    className = '',
    widths = [320, 640, 960, 1280, 1920],
    sizes = '100vw',
    lazy = true
  } = options;

  const img = document.createElement('img');
  img.alt = alt;

  if (className) {
    img.className = className;
  }

  if (lazy) {
    img.dataset.src = src;
    if (widths.length > 0) {
      img.dataset.srcset = generateSrcset(src, widths);
    }
    img.sizes = sizes;
    // Placeholder de baja calidad (opcional)
    img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"%3E%3C/svg%3E';
  } else {
    img.src = src;
    if (widths.length > 0) {
      img.srcset = generateSrcset(src, widths);
    }
    img.sizes = sizes;
  }

  return img;
}

// Auto-inicializar cuando el DOM esté listo
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.lazyImageLoader = initLazyLoading();
    });
  } else {
    window.lazyImageLoader = initLazyLoading();
  }
}

export default {
  supportsWebP,
  getOptimizedImageUrl,
  LazyImageLoader,
  initLazyLoading,
  generateSrcset,
  createResponsiveImage
};
