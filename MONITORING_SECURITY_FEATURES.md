# Monitoring, Security & Performance Features

Este documento describe todas las nuevas características de monitoreo, seguridad y rendimiento implementadas en TuCitaSegura.

## 📋 Índice

1. [Firebase App Check](#firebase-app-check)
2. [Logs Estructurados](#logs-estructurados)
3. [Performance Monitoring](#performance-monitoring)
4. [Tests E2E](#tests-e2e)
5. [Optimización de Imágenes](#optimización-de-imágenes)
6. [Health Checks](#health-checks)
7. [Índices de Firestore](#índices-de-firestore)

---

## 🔐 Firebase App Check

### Backend (Cloud Functions)

Firebase App Check está implementado en Cloud Functions para proteger contra tráfico no autorizado.

**Ubicación:** `functions/middleware/app-check.js`

#### Uso en Callable Functions

```javascript
const { requireAppCheck } = require('./middleware/app-check');

exports.myFunction = functions.https.onCall(async (data, context) => {
  // Verificar App Check (requerido)
  requireAppCheck(true)(context);

  // Tu código aquí...
});
```

#### Uso en HTTP Functions

```javascript
const { verifyAppCheckHTTP } = require('./middleware/app-check');

exports.myHttpFunction = functions.https.onRequest(async (req, res) => {
  // Middleware para verificar App Check
  await verifyAppCheckHTTP(true)(req, res, () => {
    // Tu código aquí...
  });
});
```

### Frontend

**Ubicación:** `webapp/js/firebase-appcheck.js`

El App Check ya está configurado en el frontend con reCAPTCHA Enterprise.

**Características:**
- Auto-inicialización en páginas
- Soporte para modo desarrollo con debug tokens
- Detección y limpieza de throttling
- Logs estructurados de eventos

---

## 📊 Logs Estructurados

### Backend (Cloud Functions)

**Ubicación:** `functions/utils/structured-logger.js`

Logger estructurado con sanitización automática de datos sensibles, compatible con Cloud Logging.

#### Uso Básico

```javascript
const { createLogger } = require('./utils/structured-logger');
const logger = createLogger('my-component');

// Diferentes niveles de log
logger.debug('Debug message', { data: 'value' });
logger.info('Info message', { userId: 'abc123' });
logger.warn('Warning message', { issue: 'something' });
logger.error('Error occurred', error, { context: 'details' });
logger.critical('Critical error', error);

// Logs especializados
logger.security('unauthorized_access', { userId, ip: '1.2.3.4' });
logger.audit('user_deleted', userId, { reason: 'requested' });
logger.performance('database_query', 150, { collection: 'users' });
```

#### Performance Tracking

```javascript
const { PerformanceTimer } = require('./utils/structured-logger');

const timer = new PerformanceTimer(logger, 'expensive_operation');
// ... operación ...
timer.end({ status: 'success', itemsProcessed: 100 });
```

#### Sanitización Automática

El logger sanitiza automáticamente:
- Contraseñas y secrets (redactados completamente)
- Emails (parcialmente enmascarados: `te****@example.com`)
- Números de teléfono (últimos 4 dígitos)
- Tokens y API keys
- Datos financieros (CVV, números de tarjeta)

### Frontend

**Ubicación:** `webapp/js/logger.js`

Logger mejorado con sanitización de datos sensibles.

```javascript
import { logger } from './logger.js';

logger.debug('User action', { userId, action: 'click' });
logger.info('Page loaded', { page: 'dashboard' });
logger.warn('Slow connection', { latency: 2000 });
logger.error('API error', error);
logger.security('failed_login', { attempts: 3 });
```

---

## ⚡ Performance Monitoring

**Ubicación:** `webapp/js/firebase-performance.js`

Firebase Performance Monitoring integrado con trazas personalizadas y métricas automáticas.

### Uso Básico

```javascript
import { startTrace, stopTrace, measureOperation } from './firebase-performance.js';

// Opción 1: Manual
const trace = startTrace('load_user_profile');
// ... operación ...
stopTrace(trace);

// Opción 2: Automática (recomendado)
const result = await measureOperation('fetch_appointments', async () => {
  return await fetchAppointments(userId);
}, { userId });
```

### Helpers Especializados

```javascript
import {
  measurePageLoad,
  measureAPICall,
  measureFirestoreOperation,
  measureAuth,
  measureImageLoad
} from './firebase-performance.js';

// Medir carga de página
const pageTrace = measurePageLoad('dashboard');
// ... cuando la página esté lista ...
stopTrace(pageTrace);

// Medir llamada a API
const apiTrace = measureAPICall('/api/users', 'GET');
// ... hacer request ...
stopTrace(apiTrace);

// Medir operación de Firestore
const firestoreTrace = measureFirestoreOperation('get', 'users');
const doc = await getDoc(userRef);
stopTrace(firestoreTrace);
```

### Core Web Vitals

Se monitorizan automáticamente:
- **FCP** (First Contentful Paint)
- **LCP** (Largest Contentful Paint)
- **FID** (First Input Delay)
- **CLS** (Cumulative Layout Shift)

Los datos se envían automáticamente a Firebase Performance.

---

## 🧪 Tests E2E

**Framework:** Playwright

**Ubicación:** `e2e/`

### Ejecutar Tests

```bash
# Todos los tests
npm run test:e2e

# Con UI interactiva
npm run test:e2e:ui

# En modo headed (ver navegador)
npm run test:e2e:headed

# Debug mode
npm run test:e2e:debug

# Ver reporte
npm run test:e2e:report
```

### Tests Implementados

#### 1. **Auth Tests** (`e2e/auth.spec.js`)
- Carga de página de login
- Validación de credenciales
- Redirección a registro
- Recuperación de contraseña
- Persistencia de sesión

#### 2. **Navigation Tests** (`e2e/navigation.spec.js`)
- Carga de página principal
- Recursos estáticos
- Enlaces de navegación
- Métricas de rendimiento
- Accesibilidad básica

#### 3. **Security Tests** (`e2e/security.spec.js`)
- Headers de seguridad
- Protección HTTPS
- Protección XSS
- Sanitización de datos
- Validación de formularios
- Protección contra bots

### Configuración

**Archivo:** `playwright.config.js`

**Navegadores soportados:**
- Chromium (Desktop)
- Firefox (Desktop)
- WebKit (Safari Desktop)
- Mobile Chrome
- Mobile Safari

### CI/CD

Los tests se ejecutan automáticamente en GitHub Actions:

**Archivo:** `.github/workflows/e2e-tests.yml`

---

## 🖼️ Optimización de Imágenes

**Ubicación:** `webapp/js/image-optimizer.js`

Sistema de lazy loading y optimización de imágenes con soporte WebP.

### Auto-inicialización

El sistema se inicializa automáticamente al cargar la página. Busca todas las imágenes con `data-src` o `data-srcset`.

### Uso Manual

```javascript
import { LazyImageLoader, createResponsiveImage } from './image-optimizer.js';

// Crear loader personalizado
const loader = new LazyImageLoader({
  rootMargin: '50px',
  threshold: 0.01
});

// Observar imágenes
const images = document.querySelectorAll('img[data-src]');
loader.observeAll(images);

// Crear imagen responsive
const img = createResponsiveImage({
  src: '/images/profile.jpg',
  alt: 'User profile',
  className: 'profile-img',
  widths: [320, 640, 960],
  sizes: '(max-width: 768px) 100vw, 50vw',
  lazy: true
});
```

### HTML para Lazy Loading

```html
<!-- Imagen simple con lazy loading -->
<img data-src="/images/photo.jpg"
     alt="Description"
     class="lazy-loading">

<!-- Imagen responsive con srcset -->
<img data-src="/images/photo.jpg"
     data-srcset="/images/photo-320.jpg 320w,
                  /images/photo-640.jpg 640w,
                  /images/photo-960.jpg 960w"
     sizes="(max-width: 768px) 100vw, 50vw"
     alt="Description"
     class="lazy-loading">
```

### Estilos CSS

**Archivo:** `webapp/css/lazy-loading.css`

```html
<!-- Incluir en tus páginas -->
<link rel="stylesheet" href="/webapp/css/lazy-loading.css">
```

Estados:
- `.lazy-loading` - Imagen cargando (blur effect)
- `.lazy-loaded` - Imagen cargada (fade in)
- `.lazy-error` - Error al cargar (greyscale)

---

## 🏥 Health Checks

**Ubicación:** `functions/health-check.js`

Endpoints de health check para monitoreo de servicios.

### Endpoints Disponibles

#### 1. Basic Health Check

```
GET https://your-project.cloudfunctions.net/health
```

Respuesta:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:00:00Z",
  "service": "cloud-functions",
  "version": "abc123"
}
```

#### 2. Detailed Health Check

```
GET https://your-project.cloudfunctions.net/healthDetailed
```

Verifica:
- ✅ Firestore connectivity
- ✅ Firebase Auth
- ✅ Cloud Storage

Respuesta:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:00:00Z",
  "checks": {
    "firestore": true,
    "auth": true,
    "storage": true
  },
  "durationMs": 145,
  "service": "cloud-functions",
  "version": "abc123"
}
```

#### 3. Readiness Check

```
GET https://your-project.cloudfunctions.net/ready
```

Para Kubernetes/orchestrators - verifica que el servicio está listo para recibir tráfico.

#### 4. Liveness Check

```
GET https://your-project.cloudfunctions.net/alive
```

Para Kubernetes/orchestrators - verifica que el servicio está vivo.

### Uso en Monitoreo

Configurar en tu sistema de monitoreo (Uptime Robot, Pingdom, etc.):

```yaml
# Ejemplo Kubernetes
livenessProbe:
  httpGet:
    path: /alive
    port: 8080
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /ready
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 5
```

---

## 🗄️ Índices de Firestore

**Ubicación:** `firestore.indexes.json`

### Nuevos Índices Agregados

#### 1. Failed Payments
```javascript
// Por usuario
db.collection('failed_payments')
  .where('userId', '==', userId)
  .orderBy('createdAt', 'desc')

// Por proveedor
db.collection('failed_payments')
  .where('provider', '==', 'stripe')
  .orderBy('createdAt', 'desc')
```

#### 2. Insurance Captures
```javascript
// Por ghoster
db.collection('insurance_captures')
  .where('ghosterId', '==', userId)
  .orderBy('capturedAt', 'desc')

// Por víctima
db.collection('insurance_captures')
  .where('victimId', '==', userId)
  .orderBy('capturedAt', 'desc')
```

#### 3. Payment Errors
```javascript
db.collection('payment_errors')
  .where('type', '==', 'insurance_capture')
  .orderBy('timestamp', 'desc')
```

#### 4. Users - Subscriptions & Insurance
```javascript
// Suscripciones activas por fecha
db.collection('users')
  .where('hasActiveSubscription', '==', true)
  .orderBy('subscriptionEndDate', 'asc')

// Usuarios con seguro
db.collection('users')
  .where('hasAntiGhostingInsurance', '==', true)
  .orderBy('insurancePurchaseDate', 'desc')
```

#### 5. Messages - Unread
```javascript
db.collection('messages')
  .where('conversationId', '==', conversationId)
  .where('read', '==', false)
  .orderBy('timestamp', 'desc')
```

### Desplegar Índices

```bash
npm run deploy:indexes
# o
firebase deploy --only firestore:indexes
```

---

## 📦 Instalación de Dependencias

```bash
# Instalar dependencias del proyecto
npm install

# Instalar dependencias de Cloud Functions
cd functions
npm install
cd ..

# Instalar Playwright browsers
npx playwright install
```

---

## 🚀 Deployment

### 1. Deploy Cloud Functions (con health checks)
```bash
npm run deploy:functions
```

### 2. Deploy Índices de Firestore
```bash
npm run deploy:indexes
```

### 3. Deploy Todo
```bash
npm run deploy:all
```

---

## 📊 Monitoreo en Producción

### Firebase Console

1. **Performance Monitoring**
   - Ir a Firebase Console → Performance
   - Ver trazas personalizadas
   - Analizar Core Web Vitals

2. **Cloud Logging**
   - Ir a Google Cloud Console → Logging
   - Filtrar por severity: `severity >= WARNING`
   - Buscar logs estructurados: `jsonPayload.component = "my-component"`

3. **App Check**
   - Ir a Firebase Console → App Check
   - Verificar métricas de requests
   - Configurar enforcement

### Alertas Recomendadas

```yaml
# Cloud Monitoring Alerts
1. Error Rate > 1% durante 5 minutos
2. P95 Latency > 2s durante 10 minutos
3. Health check fails durante 2 minutos
4. Failed payments > 10 en 1 hora
```

---

## 🔧 Troubleshooting

### App Check Throttling

Si ves errores de throttling en desarrollo:

```javascript
// En la consola del navegador
await window.clearAppCheckThrottle({ reload: true });
```

### Performance Traces No Aparecen

1. Verificar que Performance está habilitado en Firebase Console
2. Esperar 24-48h para que aparezcan datos iniciales
3. Verificar que las trazas se están parando correctamente

### Tests E2E Fallan

```bash
# Actualizar Playwright browsers
npx playwright install --with-deps

# Ejecutar en modo debug
npm run test:e2e:debug

# Ver el reporte HTML
npm run test:e2e:report
```

### Logs No Aparecen en Cloud Logging

1. Verificar formato JSON estructurado
2. Usar `console.log(JSON.stringify(logEntry))`
3. Esperar ~30 segundos para que aparezcan

---

## 📝 Checklist de Implementación

- [x] Firebase App Check en backend
- [x] Logs estructurados con sanitización
- [x] Performance Monitoring
- [x] Tests E2E con Playwright
- [x] Lazy loading de imágenes
- [x] Health checks completos
- [x] Índices compuestos de Firestore
- [x] CI/CD para tests E2E
- [x] Documentación completa

---

## 🤝 Contribuir

Al agregar nuevas funcionalidades:

1. ✅ Usar el logger estructurado
2. ✅ Agregar trazas de performance para operaciones lentas
3. ✅ Sanitizar datos sensibles en logs
4. ✅ Agregar tests E2E para flujos críticos
5. ✅ Usar lazy loading para imágenes
6. ✅ Crear índices de Firestore necesarios
7. ✅ Actualizar documentación

---

## 📚 Referencias

- [Firebase App Check](https://firebase.google.com/docs/app-check)
- [Firebase Performance](https://firebase.google.com/docs/perf-mon)
- [Cloud Logging](https://cloud.google.com/logging/docs)
- [Playwright](https://playwright.dev/)
- [Core Web Vitals](https://web.dev/vitals/)
- [Firestore Indexes](https://firebase.google.com/docs/firestore/query-data/indexing)

---

**Última actualización:** 2025-01-15
**Versión:** 1.0.0
