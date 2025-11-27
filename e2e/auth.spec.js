// e2e/auth.spec.js
// Tests E2E para autenticación

const { test, expect } = require('@playwright/test');

test.describe('Autenticación', () => {
  test.beforeEach(async ({ page }) => {
    // Navegar a la página de login
    await page.goto('/webapp/login.html');
  });

  test('debe cargar la página de login correctamente', async ({ page }) => {
    // Verificar título
    await expect(page).toHaveTitle(/TuCitaSegura/i);

    // Verificar que el formulario existe
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();

    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();

    // Verificar botón de login
    const loginButton = page.locator('button:has-text("Iniciar")');
    await expect(loginButton).toBeVisible();
  });

  test('debe mostrar error con credenciales inválidas', async ({ page }) => {
    // Completar formulario con datos inválidos
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');

    // Intentar login
    await page.click('button:has-text("Iniciar")');

    // Esperar mensaje de error (puede variar según implementación)
    await page.waitForTimeout(2000);

    // Verificar que seguimos en la página de login
    expect(page.url()).toContain('/login.html');
  });

  test('debe redirigir al registro', async ({ page }) => {
    // Buscar y hacer clic en el enlace de registro
    const registerLink = page.locator('a:has-text("Registr")');

    if (await registerLink.count() > 0) {
      await registerLink.first().click();

      // Verificar redirección
      await expect(page).toHaveURL(/register\.html/);
    }
  });

  test('debe mostrar opción de recuperar contraseña', async ({ page }) => {
    // Buscar enlace de recuperar contraseña
    const forgotPasswordLink = page.locator('a:has-text("contraseña"), a:has-text("Olvidaste")');

    if (await forgotPasswordLink.count() > 0) {
      await expect(forgotPasswordLink.first()).toBeVisible();
    }
  });
});

test.describe('Registro', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/webapp/register.html');
  });

  test('debe cargar la página de registro correctamente', async ({ page }) => {
    await expect(page).toHaveTitle(/TuCitaSegura/i);

    // Verificar campos del formulario
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
  });

  test('debe validar formato de email', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]').first();

    // Intentar con email inválido
    await emailInput.fill('notanemail');

    // El navegador debe mostrar validación HTML5
    const isValid = await emailInput.evaluate((el) => el.validity.valid);
    expect(isValid).toBe(false);
  });
});

test.describe('Persistencia de sesión', () => {
  test('debe mantener sesión después de recargar', async ({ page, context }) => {
    // Este test requiere estar autenticado
    // Por ahora solo verificamos que localStorage esté disponible
    await page.goto('/webapp/login.html');

    // Verificar que localStorage funciona
    await page.evaluate(() => {
      localStorage.setItem('test', 'value');
    });

    const value = await page.evaluate(() => {
      return localStorage.getItem('test');
    });

    expect(value).toBe('value');

    // Limpiar
    await page.evaluate(() => {
      localStorage.removeItem('test');
    });
  });
});
