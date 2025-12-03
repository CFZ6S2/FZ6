const SITE_KEY = (window.RECAPTCHA_SITE_KEY || '6LeKWiAsAAAAABCe8YQzXmO_dvBwAhOS-cQh_hzT');
const VERIFY_URL = 'https://us-central1-tucitasegura-129cc.cloudfunctions.net/verifyRecaptcha';

export async function verifyRecaptchaScore(action) {
  return new Promise((resolve) => {
    function run() {
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
    if (typeof grecaptcha === 'undefined' || !grecaptcha.enterprise) {
      const s = document.createElement('script');
      s.src = `https://www.google.com/recaptcha/enterprise.js?render=${SITE_KEY}`;
      s.async = true; s.defer = true;
      s.onload = run;
      document.head.appendChild(s);
    } else {
      run();
    }
  });
}

export const RecaptchaSiteKey = SITE_KEY;
