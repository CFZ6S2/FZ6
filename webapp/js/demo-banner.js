// Demo Mode Banner System for TuCitaSegura
// This file handles demo mode UI indicators across all pages

(function() {
  'use strict';

  // Check if demo mode is active
  function isDemoMode() {
    return localStorage.getItem('demoMode') === 'true' || 
           new URLSearchParams(window.location.search).get('demo') === 'true';
  }

  // Get demo user data
  function getDemoUser() {
    try {
      return JSON.parse(localStorage.getItem('demoUser') || '{}');
    } catch (e) {
      return {};
    }
  }

  // Create demo banner
  function createDemoBanner() {
    const banner = document.createElement('div');
    banner.id = 'demo-mode-banner';
    banner.className = 'demo-banner';
    banner.innerHTML = `
      <div class="demo-banner-content">
        <div class="demo-banner-icon">
          <i class="fas fa-flask"></i>
        </div>
        <div class="demo-banner-text">
          <strong>Modo Demo Activado</strong>
          <span>Estás usando TuCitaSegura en modo demostración. Algunas funciones están limitadas.</span>
        </div>
        <div class="demo-banner-actions">
          <button id="demo-learn-more" class="demo-banner-btn demo-banner-btn-secondary">
            <i class="fas fa-info-circle"></i>
            Más Info
          </button>
          <button id="demo-exit" class="demo-banner-btn demo-banner-btn-primary">
            <i class="fas fa-sign-out-alt"></i>
            Salir Demo
          </button>
        </div>
      </div>
    `;
    return banner;
  }

  // Add demo styles
  function addDemoStyles() {
    if (document.getElementById('demo-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'demo-styles';
    styles.textContent = `
      .demo-banner {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: linear-gradient(135deg, #f59e0b, #d97706);
        color: white;
        z-index: 9999;
        padding: 12px 16px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        animation: slideDown 0.3s ease-out;
        border-bottom: 2px solid #f59e0b;
      }

      .demo-banner-content {
        max-width: 1200px;
        margin: 0 auto;
        display: flex;
        align-items: center;
        gap: 16px;
        flex-wrap: wrap;
        justify-content: space-between;
      }

      .demo-banner-icon {
        font-size: 24px;
        color: #fef3c7;
        animation: pulse 2s infinite;
      }

      .demo-banner-text {
        flex: 1;
        min-width: 200px;
      }

      .demo-banner-text strong {
        display: block;
        font-size: 16px;
        font-weight: 700;
        margin-bottom: 4px;
        color: #fff;
      }

      .demo-banner-text span {
        display: block;
        font-size: 14px;
        opacity: 0.9;
        line-height: 1.4;
      }

      .demo-banner-actions {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
      }

      .demo-banner-btn {
        padding: 8px 16px;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        gap: 6px;
        white-space: nowrap;
      }

      .demo-banner-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
      }

      .demo-banner-btn-primary {
        background: #dc2626;
        color: white;
      }

      .demo-banner-btn-primary:hover {
        background: #b91c1c;
      }

      .demo-banner-btn-secondary {
        background: rgba(255, 255, 255, 0.2);
        color: white;
        border: 1px solid rgba(255, 255, 255, 0.3);
      }

      .demo-banner-btn-secondary:hover {
        background: rgba(255, 255, 255, 0.3);
      }

      /* Demo mode indicators for specific elements */
      .demo-mode-indicator {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        background: #f59e0b;
        color: white;
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 600;
        margin-left: 8px;
      }

      .demo-mode-indicator i {
        font-size: 10px;
      }

      /* Demo limitations styling */
      .demo-limited {
        position: relative;
        opacity: 0.7;
        pointer-events: none;
      }

      .demo-limited::after {
        content: 'DEMO';
        position: absolute;
        top: 4px;
        right: 4px;
        background: #f59e0b;
        color: white;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 10px;
        font-weight: bold;
      }

      /* Adjust body padding when banner is shown */
      body.demo-mode-active {
        padding-top: 80px;
      }

      /* Responsive adjustments */
      @media (max-width: 768px) {
        .demo-banner-content {
          flex-direction: column;
          text-align: center;
          gap: 12px;
        }

        .demo-banner-actions {
          justify-content: center;
        }

        .demo-banner-text strong {
          font-size: 15px;
        }

        .demo-banner-text span {
          font-size: 13px;
        }
      }

      @keyframes slideDown {
        from {
          transform: translateY(-100%);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }

      @keyframes pulse {
        0%, 100% {
          transform: scale(1);
        }
        50% {
          transform: scale(1.1);
        }
      }
    `;
    document.head.appendChild(styles);
  }

  // Initialize demo banner
  function initDemoBanner() {
    if (!isDemoMode()) return;

    addDemoStyles();

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', showDemoBanner);
    } else {
      showDemoBanner();
    }
  }

  // Show demo banner
  function showDemoBanner() {
    const banner = createDemoBanner();
    document.body.appendChild(banner);
    document.body.classList.add('demo-mode-active');

    // Add event listeners
    document.getElementById('demo-learn-more').addEventListener('click', showDemoInfo);
    document.getElementById('demo-exit').addEventListener('click', exitDemoMode);
  }

  // Show demo information
  function showDemoInfo() {
    const demoUser = getDemoUser();
    alert(`🧪 Modo Demo - TuCitaSegura\n\n` +
          `✅ Funciones disponibles:\n` +
          `• Navegación completa\n` +
          `• Búsqueda de usuarios\n` +
          `• Ver perfiles\n` +
          `• Filtros avanzados\n` +
          `• Chat y mensajería\n` +
          `• Sistema de reputación\n\n` +
          `⚠️ Limitaciones:\n` +
          `• Datos almacenados localmente\n` +
          `• Sin persistencia en servidor\n` +
          `• Sin notificaciones reales\n` +
          `• Sin pagos reales\n\n` +
          `💡 Para usar todas las funciones, configura Firebase en producción.`);
  }

  // Exit demo mode
  function exitDemoMode() {
    if (confirm('¿Salir del modo demo? Se cerrará tu sesión actual.')) {
      localStorage.removeItem('demoMode');
      localStorage.removeItem('demoUser');
      localStorage.removeItem('demoData');
      window.location.href = '/webapp/login.html';
    }
  }

  // Add demo indicators to specific elements
  function addDemoIndicators() {
    if (!isDemoMode()) return;

    // Add indicators to payment-related elements
    const paymentElements = document.querySelectorAll('[href*="suscripcion"], [href*="seguro"], [href*="pagos"]');
    paymentElements.forEach(el => {
      if (!el.querySelector('.demo-mode-indicator')) {
        const indicator = document.createElement('span');
        indicator.className = 'demo-mode-indicator';
        indicator.innerHTML = '<i class="fas fa-flask"></i>DEMO';
        el.appendChild(indicator);
      }
    });

    // Add indicators to premium features
    const premiumElements = document.querySelectorAll('.fa-gem, .fa-crown, .fa-star');
    premiumElements.forEach(el => {
      if (el.closest('a, button') && !el.closest('a, button').querySelector('.demo-mode-indicator')) {
        const indicator = document.createElement('span');
        indicator.className = 'demo-mode-indicator';
        indicator.innerHTML = '<i class="fas fa-flask"></i>';
        el.closest('a, button').appendChild(indicator);
      }
    });
  }

  // Initialize on page load
  initDemoBanner();

  // Also run after DOM mutations (for SPA navigation)
  const observer = new MutationObserver(() => {
    if (isDemoMode() && !document.getElementById('demo-mode-banner')) {
      showDemoBanner();
    }
    addDemoIndicators();
  });

  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // Global functions for demo mode
  window.DemoMode = {
    isActive: isDemoMode,
    getUser: getDemoUser,
    exit: exitDemoMode,
    showInfo: showDemoInfo
  };

})();