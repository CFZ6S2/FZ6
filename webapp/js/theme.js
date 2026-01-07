/**
 * Theme System for TuCitaSegura
 * Allows users to customize the color scheme of the application
 */

// Available themes
export const themes = {
  purple: {
    name: 'Púrpura Pasión',
    icon: '💜',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    primary: '#667eea',
    secondary: '#764ba2',
    accent: '#ff0080',
    background: {
      start: 'rgba(120, 119, 198, 0.3)',
      middle: 'rgba(138, 43, 226, 0.3)',
      end: 'rgba(255, 0, 128, 0.2)'
    }
  },
  light: {
    name: 'Modo Claro',
    icon: '☀️',
    gradient: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    primary: '#667eea',
    secondary: '#764ba2',
    accent: '#ff0080',
    background: {
      start: 'rgba(255, 255, 255, 0.8)',
      middle: 'rgba(245, 247, 250, 0.8)',
      end: 'rgba(195, 207, 226, 0.6)'
    },
    isLight: true // Flag to identify light mode
  },
  blue: {
    name: 'Azul Profundo',
    icon: '💙',
    gradient: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', // Slate 900 to Slate 800 (Matte Dark)
    primary: '#3b82f6', // Keep primary buttons blue
    secondary: '#0f172a',
    accent: '#38bdf8',
    background: {
      start: 'rgba(15, 23, 42, 0.4)',
      middle: 'rgba(30, 41, 59, 0.3)',
      end: 'rgba(15, 23, 42, 0.2)'
    }
  },
  green: {
    name: 'Verde Natura',
    icon: '💚',
    gradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
    primary: '#11998e',
    secondary: '#38ef7d',
    accent: '#00d084',
    background: {
      start: 'rgba(17, 153, 142, 0.3)',
      middle: 'rgba(56, 239, 125, 0.3)',
      end: 'rgba(0, 208, 132, 0.2)'
    }
  },
  orange: {
    name: 'Naranja Solar',
    icon: '🧡',
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    primary: '#f093fb',
    secondary: '#f5576c',
    accent: '#ff6b6b',
    background: {
      start: 'rgba(240, 147, 251, 0.3)',
      middle: 'rgba(245, 87, 108, 0.3)',
      end: 'rgba(255, 107, 107, 0.2)'
    }
  },
  teal: {
    name: 'Turquesa Tropical',
    icon: '🩵',
    gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    primary: '#43e97b',
    secondary: '#38f9d7',
    accent: '#00d9a5',
    background: {
      start: 'rgba(67, 233, 123, 0.3)',
      middle: 'rgba(56, 249, 215, 0.3)',
      end: 'rgba(0, 217, 165, 0.2)'
    }
  },
  pink: {
    name: 'Rosa Romance',
    icon: '🩷',
    gradient: 'linear-gradient(135deg, #ff6a88 0%, #ff99ac 100%)',
    primary: '#ff6a88',
    secondary: '#ff99ac',
    accent: '#ff4d7d',
    background: {
      start: 'rgba(255, 106, 136, 0.3)',
      middle: 'rgba(255, 153, 172, 0.3)',
      end: 'rgba(255, 77, 125, 0.2)'
    }
  },
  dark: {
    name: 'Modo Oscuro',
    icon: '🌙',
    gradient: 'linear-gradient(135deg, #2d3748 0%, #1a202c 100%)',
    primary: '#4a5568',
    secondary: '#2d3748',
    accent: '#667eea',
    background: {
      start: 'rgba(45, 55, 72, 0.4)',
      middle: 'rgba(26, 32, 44, 0.4)',
      end: 'rgba(74, 85, 104, 0.3)'
    },
    isDark: true  // Flag to identify dark mode
  },
  red: {
    name: 'Rojo Pasión',
    icon: '❤️',
    gradient: 'linear-gradient(135deg, #eb3349 0%, #f45c43 100%)',
    primary: '#eb3349',
    secondary: '#f45c43',
    accent: '#ff0844',
    background: {
      start: 'rgba(235, 51, 73, 0.3)',
      middle: 'rgba(244, 92, 67, 0.3)',
      end: 'rgba(255, 8, 68, 0.2)'
    }
  },
  gold: {
    name: 'Dorado Elegante',
    icon: '⭐',
    gradient: 'linear-gradient(135deg, #f7971e 0%, #ffd200 100%)',
    primary: '#f7971e',
    secondary: '#ffd200',
    accent: '#ffaa00',
    background: {
      start: 'rgba(247, 151, 30, 0.3)',
      middle: 'rgba(255, 210, 0, 0.3)',
      end: 'rgba(255, 170, 0, 0.2)'
    }
  },
  violet: {
    name: 'Violeta Místico',
    icon: '🔮',
    gradient: 'linear-gradient(135deg, #5f2c82 0%, #49a09d 100%)',
    primary: '#5f2c82',
    secondary: '#49a09d',
    accent: '#8e44ad',
    background: {
      start: 'rgba(95, 44, 130, 0.3)',
      middle: 'rgba(73, 160, 157, 0.3)',
      end: 'rgba(142, 68, 173, 0.2)'
    }
  }
};

/**
 * Apply theme to the current page
 * @param {string} themeName - Name of the theme to apply
 */
export function applyTheme(themeName) {
  const theme = themes[themeName] || themes.purple;

  // Update CSS custom properties
  document.documentElement.style.setProperty('--theme-gradient', theme.gradient);
  document.documentElement.style.setProperty('--theme-primary', theme.primary);
  document.documentElement.style.setProperty('--theme-secondary', theme.secondary);
  document.documentElement.style.setProperty('--theme-accent', theme.accent);

  // Update body background gradient
  const style = document.createElement('style');
  style.id = 'theme-style';

  // Remove existing theme style
  const existingStyle = document.getElementById('theme-style');
  if (existingStyle) {
    existingStyle.remove();
  }

  // Check if dark mode
  const isDarkMode = theme.isDark || false;

  style.textContent = `
    /* Global Transitions */
    body, .glass, .glass-strong, input, textarea, select, label, h1, h2, h3, h4, h5, h6, .fas, .far, .fab {
      transition: background 0.5s ease, color 0.5s ease, border-color 0.5s ease, box-shadow 0.5s ease !important;
    }

    body {
      background: ${theme.gradient} !important;
      ${isDarkMode ? 'color: #e2e8f0 !important;' : ''}
    }

    body::before {
      background:
        radial-gradient(circle at 20% 50%, ${theme.background.start}, transparent 50%),
        radial-gradient(circle at 80% 80%, ${theme.background.middle}, transparent 50%),
        radial-gradient(circle at 40% 20%, ${theme.background.end}, transparent 50%) !important;
      transition: background 0.5s ease !important;
    }
    
    /* ... rest of styles ... */
    
    /* Omitted for brevity, but I will include the full necessary context below to be safe */
    
    .gradient-button {
      background: ${theme.gradient} !important;
    }

    .theme-gradient-bg {
      background: ${theme.gradient} !important;
    }

    .theme-primary {
      color: ${theme.primary} !important;
    }

    .theme-secondary {
      color: ${theme.secondary} !important;
    }

    .theme-accent {
      color: ${theme.accent} !important;
    }

    /* Loading overlay */
    .loading-overlay {
      background: ${theme.primary}f2 !important;
    }

    /* Navigation gradient icons */
    nav .bg-gradient-to-r {
      background: ${theme.gradient} !important;
    }

    /* Profile photo placeholder gradient */
    .bg-gradient-to-br.from-purple-500,
    .bg-gradient-to-r.from-purple-500 {
      background: ${theme.gradient} !important;
    }

    /* Hover effects */
    .gradient-button:hover {
      box-shadow: 0 10px 25px ${theme.primary}66 !important;
    }

    /* Dark mode specific adjustments */
    ${isDarkMode ? `
      .glass {
        background: rgba(45, 55, 72, 0.7) !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
        color: #e2e8f0 !important;
      }

      .glass h1, .glass h2, .glass h3, .glass h4, .glass h5, .glass h6 {
        color: #f7fafc !important;
      }

      .glass p, .glass span, .glass div {
        color: #e2e8f0 !important;
      }

      input, textarea, select {
        background: rgba(26, 32, 44, 0.6) !important;
        color: #e2e8f0 !important;
        border-color: rgba(255, 255, 255, 0.2) !important;
      }

      input::placeholder, textarea::placeholder {
        color: #a0aec0 !important;
      }

      .text-gray-600, .text-gray-700, .text-gray-800 {
        color: #cbd5e0 !important;
      }

      .bg-white {
        background: rgba(45, 55, 72, 0.6) !important;
        color: #e2e8f0 !important;
      }
    ` : ''}

    /* Light mode specific adjustments */
    ${theme.isLight ? `
      body {
        color: #1a202c !important;
      }
      
      .text-white {
        color: #1a202c !important;
      }
      
      .text-slate-300, .text-slate-200, .text-slate-400 {
        color: #4a5568 !important;
      }

      .glass {
        background: rgba(255, 255, 255, 0.85) !important;
        border: 1px solid rgba(226, 232, 240, 0.8) !important;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
        color: #1a202c !important;
      }
      
      .glass-strong {
        background: rgba(255, 255, 255, 0.95) !important;
        border: 1px solid rgba(203, 213, 224, 0.8) !important;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
      }

      input, textarea, select {
        background: #ffffff !important;
        color: #1a202c !important;
        border: 1px solid #cbd5e0 !important;
      }
      
      input:focus, textarea:focus, select:focus {
        border-color: #667eea !important;
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2) !important;
      }

      label, .label {
        color: #2d3748 !important;
      }
      
      h1, h2, h3, h4, h5, h6 {
        color: #1a202c !important;
      }
      
      /* Make icons visible on light bg */
      .fas, .far, .fab {
        color: inherit;
      }
      
      .text-white\/80 {
        color: #4a5568 !important;
      }
      
      /* Fix placeholder colors */
      ::placeholder {
        color: #a0aec0 !important;
      }
    ` : ''}
  `;

  document.head.appendChild(style);

  // Save to localStorage for instant loading
  localStorage.setItem('userTheme', themeName);

  // Dispatch event for UI sync
  document.dispatchEvent(new CustomEvent('themeChanged', {
    detail: { theme: themeName }
  }));
}

/**
 * Load theme from user data or localStorage
 * @param {Object} userData - User data from Firestore
 * @returns {string} Theme name
 */
export function loadTheme(userData = null) {
  // Priority: localStorage (immediate intent) > userData > default (blue)
  let themeName = 'blue';

  const localTheme = localStorage.getItem('userTheme');
  if (localTheme && themes[localTheme]) {
    themeName = localTheme;
  } else if (userData && userData.theme) {
    themeName = userData.theme;
  }

  applyTheme(themeName);
  return themeName;
}

/**
 * Load theme early (before Firebase loads) for instant visual feedback
 */
export function loadThemeEarly() {
  const localTheme = localStorage.getItem('userTheme');
  if (localTheme && themes[localTheme]) {
    applyTheme(localTheme);
  }
}

/**
 * Save theme to Firestore
 * @param {Object} db - Firestore database instance
 * @param {string} userId - User ID
 * @param {string} themeName - Theme name to save
 */
export async function saveThemeToFirestore(db, userId, themeName) {
  const { doc, updateDoc } = await import('firebase/firestore');

  try {
    await updateDoc(doc(db, 'users', userId), {
      theme: themeName,
      updatedAt: new Date()
    });

    // Also save to localStorage
    localStorage.setItem('userTheme', themeName);

    return true;
  } catch (error) {
    console.error('Error saving theme:', error);
    return false;
  }
}

// Auto-load theme on page load (from localStorage for instant feedback)
// Loading utility
export const loader = {
  show: () => {
    const overlay = document.querySelector('.loading-overlay');
    if (overlay) overlay.classList.remove('hidden');
    else console.warn('Loader overlay not found');
  },
  hide: () => {
    const overlay = document.querySelector('.loading-overlay');
    if (overlay) overlay.classList.add('hidden');
  }
};

if (typeof window !== 'undefined') {
  loadThemeEarly();
}
