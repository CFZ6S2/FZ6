// e2e/navigation.spec.js
// Tests E2E para navegación básica

const { test, expect } = require('@playwright/test');

test.describe('Navegación pública', () => {
  test('debe cargar la página principal', async ({ page }) => {
    await page.goto('/');

    // Verificar que la página carga
    await expect(page).toHaveTitle(/TuCitaSegura/i);

    // Verificar que no hay errores de consola críticos
    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.waitForTimeout(2000);

    // Permitir algunos errores conocidos (como Firebase en modo dev)
    const criticalErrors = errors.filter(err =>
      !err.includes('Firebase') &&
      !err.includes('App Check') &&
      !err.includes('CORS')
    );

    expect(criticalErrors.length).toBe(0);
  });

  test('debe cargar recursos estáticos correctamente', async ({ page }) => {
    const responses = [];

    page.on('response', (response) => {
      responses.push({
        url: response.url(),
        status: response.status()
      });
    });

    await page.goto('/');

    // Esperar a que carguen los recursos
    await page.waitForLoadState('networkidle');

    // Verificar que no hay errores 404 en recursos críticos
    const notFoundResources = responses.filter(r =>
      r.status === 404 &&
      (r.url.includes('.css') || r.url.includes('.js'))
    );

    expect(notFoundResources.length).toBe(0);
  });

  test('debe tener enlaces de navegación funcionales', async ({ page }) => {
    await page.goto('/');

    // Buscar enlaces comunes
    const loginLink = page.locator('a[href*="login"]');

    if (await loginLink.count() > 0) {
      await expect(loginLink.first()).toBeVisible();
    }
  });
});

test.describe('Rendimiento', () => {
  test('debe cargar la página en tiempo razonable', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const loadTime = Date.now() - startTime;

    // La página debe cargar en menos de 5 segundos
    expect(loadTime).toBeLessThan(5000);
  });

  test('debe tener métricas de rendimiento aceptables', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Obtener métricas de rendimiento
    const metrics = await page.evaluate(() => {
      const perfData = window.performance.timing;
      return {
        domContentLoaded: perfData.domContentLoadedEventEnd - perfData.navigationStart,
        windowLoad: perfData.loadEventEnd - perfData.navigationStart,
        domInteractive: perfData.domInteractive - perfData.navigationStart
      };
    });

    // Verificar que las métricas están en rangos aceptables
    expect(metrics.domContentLoaded).toBeLessThan(3000);
    expect(metrics.domInteractive).toBeLessThan(2000);
  });
});

test.describe('Accesibilidad básica', () => {
  test('debe tener estructura HTML semántica', async ({ page }) => {
    await page.goto('/');

    // Verificar que hay elementos semánticos
    const main = page.locator('main');
    const header = page.locator('header');
    const nav = page.locator('nav');

    // Al menos uno de estos debe existir
    const hasSemanticElements =
      (await main.count() > 0) ||
      (await header.count() > 0) ||
      (await nav.count() > 0);

    expect(hasSemanticElements).toBe(true);
  });

  test('las imágenes deben tener alt text', async ({ page }) => {
    await page.goto('/');

    const images = await page.locator('img').all();

    for (const img of images) {
      const alt = await img.getAttribute('alt');
      // El alt puede estar vacío para imágenes decorativas, pero debe existir
      expect(alt !== null).toBe(true);
    }
  });

  test('debe ser navegable con teclado', async ({ page }) => {
    await page.goto('/webapp/login.html');

    // Verificar que podemos navegar con Tab
    await page.keyboard.press('Tab');

    const focusedElement = await page.evaluate(() => {
      return document.activeElement?.tagName;
    });

    // Debe haber un elemento enfocado
    expect(focusedElement).toBeTruthy();
  });
});
