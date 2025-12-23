import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig(({ mode }) => {
    return {
        root: '.', // si tus archivos están en la raíz de webapp
        build: {
            outDir: 'dist',
            target: 'esnext', // Enable top-level await support
            rollupOptions: {
                input: {
                    main: path.resolve(__dirname, 'index.html'),
                    login: path.resolve(__dirname, 'login.html'),
                    dashboard: path.resolve(__dirname, 'dashboard.html'),

                    admin: path.resolve(__dirname, 'admin.html'),
                    admin_login: path.resolve(__dirname, 'admin-login.html'),

                    ayuda: path.resolve(__dirname, 'ayuda.html'),
                    buscar_usuarios: path.resolve(__dirname, 'buscar-usuarios.html'),
                    chat: path.resolve(__dirname, 'chat.html'),
                    citas: path.resolve(__dirname, 'citas.html'),
                    cita_detalle: path.resolve(__dirname, 'cita-detalle.html'),
                    concierge_dashboard: path.resolve(__dirname, 'concierge-dashboard.html'),
                    conversaciones: path.resolve(__dirname, 'conversaciones.html'),
                    cuenta_pagos: path.resolve(__dirname, 'cuenta-pagos.html'),
                    evento_detalle: path.resolve(__dirname, 'evento-detalle.html'),
                    eventos_vip: path.resolve(__dirname, 'eventos-vip.html'),

                    logros: path.resolve(__dirname, 'logros.html'),
                    membresia: path.resolve(__dirname, 'membresia.html'),
                    perfil: path.resolve(__dirname, 'perfil.html'),
                    referidos: path.resolve(__dirname, 'referidos.html'),
                    register: path.resolve(__dirname, 'register.html'),
                    reportes: path.resolve(__dirname, 'reportes.html'),
                    seguridad: path.resolve(__dirname, 'seguridad.html'),
                    seguro: path.resolve(__dirname, 'seguro.html'),
                    suscripcion: path.resolve(__dirname, 'suscripcion.html'),
                    verificacion_identidad: path.resolve(__dirname, 'verificacion-identidad.html'),
                    verify_email: path.resolve(__dirname, 'verify-email.html'),
                    video_chat: path.resolve(__dirname, 'video-chat.html'),
                    diagnostics: path.resolve(__dirname, 'diagnostics.html'),
                    test_firestore_minimal: path.resolve(__dirname, 'test-firestore-minimal.html'),

                    // Legal & Support
                    privacidad: path.resolve(__dirname, 'privacidad.html'),
                    terminos: path.resolve(__dirname, 'terminos.html'),
                    contacto: path.resolve(__dirname, 'contacto.html')
                }
            }
        },
        server: {
            port: 5173,
            hmr: false, // ⚠️ HMR desactivado temporalmente para pruebas de reCAPTCHA - reactivar con hmr: true
            proxy: {
                // Redirige llamadas /api/* a backend local
                '/api': {
                    target: 'http://127.0.0.1:5000',
                    changeOrigin: true,
                    secure: false,
                    // Rewrite path if needed (optional)
                    // rewrite: (path) => path.replace(/^\/api/, '') 
                }
            }
        }
    };
});
