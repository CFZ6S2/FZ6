// Simple proxy-based Firebase Auth fallback
// Provides a minimal login helper used by login.html when the main flow fails.

(function () {
  const state = { initialized: false, auth: null };

  async function ensureAuth() {
    if (state.initialized) return state.auth;

    try {
      const { auth } = await import('./firebase-config.js');
      state.auth = auth;
      state.initialized = true;
      return auth;
    } catch (error) {
      console.error('firebase-auth-proxy: unable to load auth instance', error);
      throw error;
    }
  }

  async function loginWithProxy(email, password) {
    const auth = await ensureAuth();
    const { signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
    const result = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: result.user, credential: result };
  }

  // Expose a tiny API expected by login.html
  window.authProxy = {
    login: loginWithProxy,
  };

  window.loginWithProxy = loginWithProxy;
})();
