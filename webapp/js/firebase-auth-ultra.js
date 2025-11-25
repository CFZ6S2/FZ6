// Ultra fallback for stubborn sign-in flows
// Provides retries and graceful errors to avoid breaking the UI when the network is flaky.

(function () {
  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 1500;

  async function ensureAuth() {
    const { auth } = await import('./firebase-config.js');
    const { setPersistence, browserLocalPersistence } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
    await setPersistence(auth, browserLocalPersistence).catch(() => {});
    return auth;
  }

  async function attemptSignIn(auth, email, password, attempt = 1) {
    const { signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      return { success: true, user: result.user, credential: result };
    } catch (error) {
      if (attempt < MAX_RETRIES && isRecoverable(error)) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * attempt));
        return attemptSignIn(auth, email, password, attempt + 1);
      }
      throw error;
    }
  }

  function isRecoverable(error) {
    if (!error || !error.code) return false;
    return [
      'auth/network-request-failed',
      'auth/internal-error',
      'auth/timeout',
      'auth/too-many-requests',
    ].includes(error.code);
  }

  async function loginUltra(email, password) {
    const auth = await ensureAuth();
    return attemptSignIn(auth, email, password);
  }

  window.authUltra = {
    login: loginUltra,
  };

  window.loginUltra = loginUltra;
})();
