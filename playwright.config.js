// playwright.config.js
// Configuración de Playwright para tests E2E

const { defineConfig, devices } = require('@playwright/test');

/**
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
  testDir: './e2e',

  // Timeout para cada test
  timeout: 30 * 1000,

  // Configuración de expect
  expect: {
    timeout: 5000
  },

  // Ejecutar tests en paralelo
  fullyParallel: true,

  // Fallar el build en CI si dejaste test.only en el código
  forbidOnly: !!process.env.CI,

  // Reintentar en CI
  retries: process.env.CI ? 2 : 0,

  // Workers en paralelo
  workers: process.env.CI ? 1 : undefined,

  // Reporter
  reporter: [
    ['html'],
    ['list'],
    ['junit', { outputFile: 'test-results/junit.xml' }]
  ],

  // Configuración compartida para todos los tests
  use: {
    // URL base para usar en tests
    baseURL: process.env.BASE_URL || 'http://localhost:8000',

    // Screenshot en fallo
    screenshot: 'only-on-failure',

    // Video en fallo
    video: 'retain-on-failure',

    // Traza en fallo
    trace: 'on-first-retry',

    // Navegador headless
    headless: true,

    // Viewport
    viewport: { width: 1280, height: 720 },

    // User agent
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  },

  // Configurar proyectos para diferentes navegadores
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // Tests en móvil
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  // Servidor de desarrollo
  webServer: process.env.CI ? undefined : {
    command: 'npm run serve',
    url: 'http://localhost:8000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
