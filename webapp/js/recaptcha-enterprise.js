const SITE_KEY = (window.RECAPTCHA_SITE_KEY || '6LdSBCksAAAAAB5qyYtNf1ZOSt7nH4EvtaGTNT2t'); // Must match App Check key
const VERIFY_URL = 'https://us-central1-tucitasegura-129cc.cloudfunctions.net/verifyRecaptcha';

export async function verifyRecaptchaScore(action) {
  console.warn('🔓 reCAPTCHA Bypassed (Global Bypass Active). Resolving success.');
  return Promise.resolve({ success: true, score: 0.9, reason: 'bypass_active' });
  /*
  return new Promise((resolve) => {
    function run() {
      // Check if enterprise is ready
      if (!window.grecaptcha || !grecaptcha.enterprise) {
        setTimeout(run, 100);
        return;
      }

      grecaptcha.enterprise.ready(async () => {
        try {
          const token = await grecaptcha.enterprise.execute(SITE_KEY, { action });
          const resp = await fetch(VERIFY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, action })
          });
          const result = await resp.json();
          resolve(result);
        } catch (e) {
          resolve({ success: false, score: 0, reason: String(e) });
        }
      });
    }

    // Check if script is already present or loaded
    const existingScript = document.querySelector('script[src*="recaptcha/enterprise.js"]');

    if (typeof grecaptcha !== 'undefined' && grecaptcha.enterprise) {
      run();
    } else if (existingScript) {
      // Script exists but maybe not fully loaded
      existingScript.addEventListener('load', run);
      // Fallback check
      setTimeout(run, 1000);
    } else {
      const s = document.createElement('script');
      s.src = `https://www.google.com/recaptcha/enterprise.js?render=${SITE_KEY}`;
      s.async = true; s.defer = true;
      s.onload = run;
      document.head.appendChild(s);
    }
  });
  */
}

export const RecaptchaSiteKey = SITE_KEY;
