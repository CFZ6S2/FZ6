import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        'verify-appcheck': resolve(__dirname, 'verify-appcheck.html'),
        'admin-login': resolve(__dirname, 'admin-login.html'),
        'admin': resolve(__dirname, 'admin.html'),
        'verify-email': resolve(__dirname, 'verify-email.html'),
        'example-notification-integration': resolve(__dirname, 'example-notification-integration.html'),
        'register': resolve(__dirname, 'register.html'),
        'login': resolve(__dirname, 'login.html'),
        'clear-appcheck-throttle': resolve(__dirname, 'clear-appcheck-throttle.html'),
        'recaptcha-enterprise-test': resolve(__dirname, 'recaptcha-enterprise-test.html'),
        'clear-cache': resolve(__dirname, 'clear-cache.html'),
        'clear-appcheck': resolve(__dirname, 'clear-appcheck.html'),
        'video-chat': resolve(__dirname, 'video-chat.html'),
        'verificacion-identidad': resolve(__dirname, 'verificacion-identidad.html'),
        'suscripcion': resolve(__dirname, 'suscripcion.html'),
        'seguro': resolve(__dirname, 'seguro.html'),
        'seguridad': resolve(__dirname, 'seguridad.html'),
        'reportes': resolve(__dirname, 'reportes.html'),
        'referidos': resolve(__dirname, 'referidos.html'),
        'perfil': resolve(__dirname, 'perfil.html'),
        'membresia': resolve(__dirname, 'membresia.html'),
        'logros': resolve(__dirname, 'logros.html'),
        'eventos-vip': resolve(__dirname, 'eventos-vip.html'),
        'evento-detalle': resolve(__dirname, 'evento-detalle.html'),
        'ejemplo-con-appcheck': resolve(__dirname, 'ejemplo-con-appcheck.html'),
        'cuenta-pagos': resolve(__dirname, 'cuenta-pagos.html'),
        'conversaciones': resolve(__dirname, 'conversaciones.html'),
        'concierge-dashboard': resolve(__dirname, 'concierge-dashboard.html'),
        'cita-detalle': resolve(__dirname, 'cita-detalle.html'),
        'chat': resolve(__dirname, 'chat.html'),
        'buscar-usuarios': resolve(__dirname, 'buscar-usuarios.html'),
        'ayuda': resolve(__dirname, 'ayuda.html'),
        'favicon-tags': resolve(__dirname, 'favicon-tags.html'),
        'auth-methods-summary': resolve(__dirname, 'auth-methods-summary.html'),
      }
    }
  }
})
