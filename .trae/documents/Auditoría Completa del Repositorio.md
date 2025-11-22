## Alcance y Objetivos

* Auditar arquitectura, autenticación (Firebase), App Check/reCAPTCHA, endpoints backend, pagos (Stripe/PayPal), reglas de seguridad y variables.

* Identificar brechas y proponer mejoras listas para aplicar.

## Arquitectura

* Mapear carpetas principales y relación entre módulos: `backend` (FastAPI), `functions` (Cloud Functions), `webapp` (HTML/JS), reglas (`firestore.rules`, `firebase-storage.rules`).

* Documentar puntos de entrada: `backend/main.py`, `functions/index.js`, `webapp/js/*`.

## Autenticación y Claims

* Verificar flujos de login/registro en `webapp` y redirecciones con `onAuthStateChanged`.

* Confirmar uso de `context.auth` en funciones callable y sincronización de Custom Claims (`role`, `gender`, estados de pago/seguro).

* Detectar ausencia de verificación de ID token en backend Python y definir si es necesaria.

## App Check / reCAPTCHA

* Revisar `webapp/js/firebase-appcheck.js`: site key, dominios permitidos y comportamiento en desarrollo/producción.

* Inventariar páginas que importan/desactivan App Check; plan para habilitarlo de forma segura en producción.

* Evaluar necesidad de reCAPTCHA “visible” en login y validar en servidor (opcional).

## Backend API (FastAPI)

* Listar endpoints activos: salud, recomendaciones, verificación de foto, fraude, moderación, geolocalización, analytics, referidos, VIP events.

* Revisar CORS, dependencias y esquemas Pydantic (`backend/app/models/schemas.py`).

* Detectar dependencias externas (Google Maps, Firebase Admin, Stripe) y validar configuración.

## Pagos (Stripe/PayPal)

* Auditar webhooks: verificación de firma, idempotencia y actualización de Firestore.

* Revisar funciones callable para Vault de PayPal (crear/cobrar/eliminar token) y roles requeridos.

* Verificar metadatos necesarios (userId, tipos de pago) y coherencia en Firestore/claims.

## Reglas y Seguridad

* Revisar `firestore.rules` y `firebase-storage.rules`: autenticación, autorización por rol/género, membresía/seguro, verificación de email y ACLs.

* Probar escenarios críticos (chat, citas, adjuntos de chat) con claims y reglas.

## Variables y Configuración

* Auditar `backend/app/core/config.py`, `.env.example`, `functions.config` y usos de `process.env`.

* Enumerar claves necesarias (Stripe, PayPal, Google Maps, Sentry, OpenAI) y su estado.

## Pruebas y CI/CD

* Inventariar tests en `functions` (Mocha/Nyc) y `backend` (Pytest si aplica).

* Verificar workflows y sugerir linting (flake8/mypy/eslint) si no existe.

## Entregables

* Informe de hallazgos con rutas y líneas clave.

* Lista de acciones recomendadas por prioridad (habilitar App Check en producción, añadir `tucitasegura.com` a dominios, decidir verificación de ID token en backend, completar variables de entorno, endurecer reglas).

* Parches propuestos listos para aplicar (importar App Check donde falta, ajustes menores de sintaxis/seguridad, ejemplos de middleware si se requiere).

## Riesgos y Supuestos

* Supuesto: producción usa Cloud Functions para auth/pagos; backend Python para servicios avanzados.

* Riesgo: habilitar App Check sin dominios configurados puede causar 400; se planifica activación gradual.

## Siguiente Paso

* Confirmar que proceda con la ejecución de la auditoría detallada y, tras tu visto bueno, aplicar las mejoras y preparar los parches correspondientes.

