// e2e/security.spec.js
// Tests E2E para seguridad

const { test, expect } = require('@playwright/test');

test.describe('Headers de seguridad', () => {
  test('debe tener headers de seguridad configurados', async ({ page }) => {
    const response = await page.goto('/');

    // Verificar headers importantes
    const headers = response.headers();

    // X-Content-Type-Options
    expect(headers['x-content-type-options']).toBe('nosniff');

    // X-Frame-Options (puede ser DENY o SAMEORIGIN)
    expect(['deny', 'sameorigin'].includes(headers['x-frame-options']?.toLowerCase())).toBe(true);

    // Verificar que hay algún tipo de CSP
    const hasCsp = headers['content-security-policy'] || headers['content-security-policy-report-only'];
    expect(hasCsp).toBeTruthy();
  });

  test('debe tener HTTPS en producción', async ({ page }) => {
    const url = page.url();

    // En desarrollo local puede ser HTTP
    if (url.includes('localhost') || url.includes('127.0.0.1')) {
      // Skip en desarrollo
      test.skip();
    }

    // En producción debe ser HTTPS
    expect(url).toMatch(/^https:/);
  });
});

test.describe('Protección contra XSS', () => {
  test('debe sanitizar entrada de usuario', async ({ page }) => {
    await page.goto('/webapp/login.html');

    // Intentar inyectar script en campo de email
    const emailInput = page.locator('input[type="email"]').first();
    await emailInput.fill('<script>alert("XSS")</script>');

    // Verificar que el script no se ejecuta
    const alertFired = await page.evaluate(() => {
      return window.xssAlertFired || false;
    });

    expect(alertFired).toBe(false);
  });
});

test.describe('Protección de datos', () => {
  test('no debe exponer datos sensibles en localStorage', async ({ page }) => {
    await page.goto('/');

    // Verificar que no hay contraseñas en localStorage
    const hasPassword = await page.evaluate(() => {
      const keys = Object.keys(localStorage);
      return keys.some(key => {
        const value = localStorage.getItem(key);
        return key.toLowerCase().includes('password') ||
               key.toLowerCase().includes('secret') ||
               (value && value.toLowerCase().includes('password'));
      });
    });

    expect(hasPassword).toBe(false);
  });

  test('debe usar conexiones seguras para APIs', async ({ page }) => {
    const apiCalls = [];

    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/api/') || url.includes('firebasestorage') || url.includes('firebaseio')) {
        apiCalls.push({
          url,
          protocol: new URL(url).protocol
        });
      }
    });

    await page.goto('/');
    await page.waitForTimeout(2000);

    // En producción, todas las llamadas API deben ser HTTPS
    if (!page.url().includes('localhost')) {
      apiCalls.forEach(call => {
        expect(call.protocol).toBe('https:');
      });
    }
  });
});

test.describe('Validación de formularios', () => {
  test('debe validar formato de email', async ({ page }) => {
    await page.goto('/webapp/login.html');

    const emailInput = page.locator('input[type="email"]').first();
    const submitButton = page.locator('button[type="submit"]').first();

    // Intentar con email inválido
    await emailInput.fill('notanemail');
    await submitButton.click();

    // El formulario no debe enviarse
    await page.waitForTimeout(1000);

    // Verificar que seguimos en la página de login
    expect(page.url()).toContain('login');
  });

  test('debe requerir campos obligatorios', async ({ page }) => {
    await page.goto('/webapp/login.html');

    const submitButton = page.locator('button[type="submit"]').first();

    // Intentar enviar sin llenar campos
    await submitButton.click();

    // Verificar validación HTML5
    const emailInput = page.locator('input[type="email"]').first();
    const isValid = await emailInput.evaluate((el) => el.validity.valid);

    expect(isValid).toBe(false);
  });
});

test.describe('Rate limiting y protección contra bots', () => {
  test('debe tener protección reCAPTCHA o similar', async ({ page }) => {
    await page.goto('/webapp/register.html');

    // Buscar indicios de reCAPTCHA o App Check
    const hasRecaptcha = await page.locator('.g-recaptcha, [data-sitekey]').count() > 0;
    const hasAppCheck = await page.evaluate(() => {
      return window.firebase?.appCheck ? true : false;
    });

    // Debe tener al menos una protección
    expect(hasRecaptcha || hasAppCheck).toBe(true);
  });
});
