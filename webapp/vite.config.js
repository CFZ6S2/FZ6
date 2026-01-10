import { defineConfig } from 'vite';
import path from 'path';
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';

export default defineConfig(({ mode }) => {
    return {
        root: '.', // si tus archivos están en la raíz de webapp
        plugins: [
            ViteImageOptimizer({
                /* pass your config */
                png: { quality: 80 },
                jpeg: { quality: 80 },
                webp: { quality: 80 },
                avif: { quality: 70 },
            }),
        ],
        // OPTIMIZATION: Strip console logs in production
        esbuild: {
            drop: mode === 'production' ? ['console', 'debugger'] : [],
        },
        build: {
            outDir: 'dist',
            target: 'esnext', // Enable top-level await support
            // STRIP CONSOLE LOGS IN PRODUCTION
            minify: 'esbuild',
            modulePreload: {
                polyfill: false // Disable module preload polyfill to strictly lazy load
            },
            rollupOptions: {
                output: {
                    manualChunks: (id) => {
                        // Firebase App Check (Split this out specifically!)
                        if (id.includes('node_modules') && (id.includes('firebase/app-check') || id.includes('@firebase/app-check'))) {
                            return 'firebase-appcheck-vendor';
                        }
                        // Main Firebase Vendor Chunk (Auth, Firestore, etc.)
                        if (id.includes('node_modules') && id.includes('firebase')) {
                            return 'firebase-vendor';
                        }
                    }
                },
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
                    panel_concierge: path.resolve(__dirname, 'panel-concierge.html'),
                    conversaciones: path.resolve(__dirname, 'conversaciones.html'),
                    cuenta_pagos: path.resolve(__dirname, 'cuenta-pagos.html'),
                    evento_detalle: path.resolve(__dirname, 'evento-detalle.html'),
                    eventos_vip: path.resolve(__dirname, 'eventos-vip.html'),
                    favoritos: path.resolve(__dirname, 'favoritos.html'),
                    ocultos: path.resolve(__dirname, 'ocultos.html'),

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
                }
            }
        }
    };
});
