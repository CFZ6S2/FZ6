// reCAPTCHA Enterprise Module - Clean Version
// Verifica tokens reCAPTCHA Enterprise con el backend

const SITE_KEY = (window.RECAPTCHA_SITE_KEY || import.meta.env.VITE_RECAPTCHA_SITE_KEY || '6LdSBCksAAAAAB5qyYtNf1ZOSt7nH4EvtaGTNT2t');
const VERIFY_URL = import.meta.env.VITE_VERIFY_RECAPTCHA_URL ||
  'https://verifyrecaptcha-tlmpmnvyda-uc.a.run.app';
const FALLBACK_VERIFY_URL = import.meta.env.VITE_VERIFY_RECAPTCHA_FALLBACK_URL ||
  'https://us-central1-tucitasegura-129cc.cloudfunctions.net/verifyRecaptchaV1';

/**
 * Ejecuta reCAPTCHA Enterprise y verifica el score con el backend
 * @param {string} action - Nombre de la acción (ej: 'login', 'register')
 * @returns {Promise<{success: boolean, score?: number, reason?: string}>}
 */
export async function verifyRecaptchaScore(action) {
  return new Promise((resolve) => {
    // 0. BYPASS IF DEBUG TOKEN EXISTS (Immediate Unlock)
    if (self.FIREBASE_APPCHECK_DEBUG_TOKEN) {
      console.warn('🛡️ Debug Token detectado in verifyRecaptchaScore - BYPASSING wait.');
      return resolve({ success: true, score: 1.0, action: action + '_debug_bypass', reason: 'debug_token' });
    }

    // wait for grecaptcha to be available (max 5s - reduced from 10s)
    let attempts = 0;
    const maxAttempts = 25; // 25 * 200ms = 5s

    const checkGrecaptcha = setInterval(async () => {
      attempts++;

      // Check if EITHER standard grecaptcha OR enterprise is ready
      // ReCaptchaEnterpriseProvider loads 'grecaptcha.enterprise'
      // ReCaptchaV3Provider loads 'grecaptcha'
      const g = window.grecaptcha;
      const isReady = (g && g.execute) || (g && g.enterprise && g.enterprise.execute);

      if (isReady) {
        clearInterval(checkGrecaptcha);

        try {
          let token;
          if (g.enterprise && g.enterprise.execute) {
            token = await g.enterprise.execute(SITE_KEY, { action });
          } else {
            token = await g.execute(SITE_KEY, { action });
          }

          // Intentar con URL primaria
          let resp = await fetch(VERIFY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, action })
          });

          if (!resp.ok && resp.status === 403) {
            console.warn('[reCAPTCHA] Primary verify 403, trying fallback...');
            resp = await fetch(FALLBACK_VERIFY_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token, action })
            });
          }

          const result = await resp.json();
          resolve(result);

        } catch (e) {
          console.error('[reCAPTCHA] Verification error:', e);
          // Fallback gracefully so user isn't blocked (e.g. if key is wrong type)
          resolve({ success: true, score: 1.0, action: 'fallback_error', reason: String(e) });
        }
      }

      // Timeout
      if (attempts >= maxAttempts) {
        clearInterval(checkGrecaptcha);
        console.warn('[reCAPTCHA] Timeout waiting for grecaptcha (Standard/Enterprise)');
        // Return fake success to not block user
        resolve({ success: true, score: 1.0, action: 'timeout_bypass' });
      }
    }, 200);
  });
}

export const RecaptchaSiteKey = SITE_KEY;
