# 🌟 TuCitaSegura - Plataforma de Citas

Una plataforma de citas con motor de recomendación inteligente, sistema de seguridad basado en Firebase y características premium.

> ⚠️ **Estado del Proyecto**: En desarrollo activo. Algunas características planificadas aún no están implementadas.
> Ver [AUDITORIA_APLICACION_Y_CARENCIAS.md](AUDITORIA_APLICACION_Y_CARENCIAS.md) para detalles completos del estado actual.

---

## ✅ Características Implementadas

### 🤖 Motor de Recomendaciones
- **Sistema Híbrido de Matching**: Combina múltiples algoritmos
  - Filtrado colaborativo (40%)
  - Filtrado basado en contenido (30%)
  - Proximidad geográfica (20%)
  - Patrones de comportamiento (10%)
- **Cálculo de Compatibilidad**: Score basado en intereses, metas, edad, educación y estilo de vida
- **Predicción de Éxito**: Estimación de probabilidad de match exitoso
- **Evaluación de Riesgos**: Análisis de factores de riesgo del perfil

### 🔒 Seguridad y Autenticación
- **Firebase Authentication**: Sistema completo de autenticación
- **Custom Claims**: Roles y permisos con Firebase
- **Firestore Rules**: Reglas de seguridad robustas (22k líneas)
  - Validación de edad (18+)
  - Verificación de email
  - Filtrado por género
  - Control de acceso basado en roles
- **App Check**: Protección contra bots y abuso

### 💳 Sistema de Pagos
- **PayPal Integration**: Pagos y suscripciones
  - Creación de órdenes
  - Captura de pagos
  - Validación de webhooks
  - Token caching
- **Sistema de Suscripciones**: Membresías premium con Firebase Claims

### 📱 Interfaz de Usuario
- **31 Páginas HTML** completamente funcionales:
  - Sistema de autenticación (login, registro, verificación)
  - Perfiles de usuario
  - Chat y conversaciones
  - Búsqueda de usuarios
  - Eventos VIP
  - Sistema de referidos
  - Dashboard de administración
- **Responsive Design**: Mobile-first con TailwindCSS
- **PWA**: Soporte para Progressive Web App

### 🔥 Firebase Integration
- **Firestore**: Base de datos en tiempo real
- **Storage**: Almacenamiento de archivos
- **Functions**: Cloud Functions para lógica de backend
- **Performance Monitoring**: Seguimiento de rendimiento
- **Analytics**: Análisis de uso

---

## 🚧 En Desarrollo / Planificado

Ver [AUDITORIA_APLICACION_Y_CARENCIAS.md](AUDITORIA_APLICACION_Y_CARENCIAS.md) para plan completo.

### Características Pendientes (Fase 2):
- ⏳ **Moderación de Mensajes NLP**: Detección de spam y contenido inapropiado
- ⏳ **Verificación de Fotos con CV**: Análisis facial y verificación de edad
- ⏳ **Detección de Fraude con ML**: Modelo de machine learning para detectar perfiles falsos
- ⏳ **Location Intelligence**: Integración con Google Maps API para puntos de encuentro

---

## 📱 Tecnología

### Frontend
- HTML5, CSS3, JavaScript ES6+
- TailwindCSS
- Firebase SDK (Auth, Firestore, Storage)
- WebRTC (para video chat)

### Backend
- FastAPI (Python)
- Firebase Admin SDK
- PayPal SDK
- scikit-learn (ML)

### Infrastructure
- **Frontend**: Vercel
- **Backend**: Railway
- **Database**: Firebase Firestore
- **Storage**: Firebase Storage
- **Functions**: Firebase Cloud Functions

---

## 🛠️ Instalación y Desarrollo

### Prerrequisitos
- Python 3.9+
- Node.js 18+ (para Firebase Functions)
- Cuenta de Firebase
- Cuenta de PayPal Developer (opcional)

### 1. Clonar Repositorio
```bash
git clone https://github.com/CFZ6S2/FZ6.git
cd FZ6
```

### 2. Configurar Firebase

Crea un proyecto en [Firebase Console](https://console.firebase.google.com/) y descarga las credenciales.

**Frontend** - Edita `webapp/js/firebase-config.js`:
```javascript
export const firebaseConfig = {
    apiKey: "TU_API_KEY",
    authDomain: "tu-proyecto.firebaseapp.com",
    projectId: "tu-proyecto",
    storageBucket: "tu-proyecto.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef"
};
```

**Backend** - Crea `backend/.env`:
```env
FIREBASE_PROJECT_ID=tu-proyecto
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@tu-proyecto.iam.gserviceaccount.com
```

### 3. Instalar Dependencias

**Backend**:
```bash
cd backend
pip install -r requirements.txt
```

**Firebase Functions**:
```bash
cd functions
npm install
```

### 4. Iniciar Servidor Local

**Backend**:
```bash
cd backend
uvicorn main:app --reload --port 8000
```

**Frontend** (en otra terminal):
```bash
cd webapp
python -m http.server 8080
# Abrir http://localhost:8080
```

---

## 🚀 Despliegue a Producción

Ver guía completa en [deploy-phase1-production.sh](deploy-phase1-production.sh)

### Despliegue Automatizado

**Linux/Mac**:
```bash
./deploy-phase1-production.sh
```

**Windows**:
```powershell
.\deploy-phase1-production.ps1
```

### Despliegue Manual

**Frontend (Vercel)**:
```bash
npm install -g vercel
vercel --prod
```

**Backend (Railway)**:
```bash
# Conectar con GitHub y Railway automáticamente despliega
git push origin main
```

**Firebase (Firestore Rules, Functions)**:
```bash
firebase deploy --only firestore:rules
firebase deploy --only functions
firebase deploy --only storage
```

---

## 📋 Variables de Entorno Requeridas

Ver [SECRETS_REFERENCE.md](SECRETS_REFERENCE.md) para la guía completa.

### Firebase
```env
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=
```

### PayPal (Opcional)
```env
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_MODE=sandbox  # o 'live' para producción
```

### Backend
```env
CORS_ORIGINS=https://tu-dominio.com
ENVIRONMENT=production
```

---

## 🧪 Testing

### Tests del Backend
```bash
cd backend
pytest tests/
```

### Tests E2E (Playwright)
```bash
npm test
```

### Coverage
```bash
cd backend
pytest --cov=app tests/
```

> ⚠️ **Estado Actual**: Cobertura de tests ~20%. Objetivo: >80%

---

## 📚 Documentación

- **[API_ENDPOINTS.md](API_ENDPOINTS.md)** - Documentación completa de la API
- **[AUDITORIA_APLICACION_Y_CARENCIAS.md](AUDITORIA_APLICACION_Y_CARENCIAS.md)** - Auditoría completa del proyecto
- **[AUDITORIA_SEGURIDAD_2025.md](AUDITORIA_SEGURIDAD_2025.md)** - Análisis de seguridad
- **[CLEANUP_SUMMARY.md](CLEANUP_SUMMARY.md)** - Resumen de limpieza de código
- **[SECRETS_REFERENCE.md](SECRETS_REFERENCE.md)** - Referencia de variables de entorno

---

## 🔐 Seguridad

Este proyecto implementa múltiples capas de seguridad:

✅ **Implementado**:
- Firebase App Check (protección contra bots)
- Firestore Security Rules (control de acceso granular)
- Custom Claims (roles y permisos)
- CORS configurado correctamente
- Validación de webhooks PayPal

⚠️ **Pendiente** (Ver [AUDITORIA_SEGURIDAD_2025.md](AUDITORIA_SEGURIDAD_2025.md)):
- Rate limiting en endpoints
- Sanitización XSS en frontend
- Encriptación de datos sensibles
- Security event logging

---

## 🤝 Contribuir

1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/amazing-feature`)
3. Commit tus cambios (`git commit -m 'Add amazing feature'`)
4. Push a la rama (`git push origin feature/amazing-feature`)
5. Abre un Pull Request

Ver [PR_TEMPLATE.md](PR_TEMPLATE.md) para la plantilla de PR.

---

## 📊 Estado del Proyecto

**Última auditoría**: 28 de Noviembre de 2025

| Categoría | Puntuación | Estado |
|-----------|------------|--------|
| Servicios ML/AI | 4/10 | ⚠️ Parcial |
| Testing | 3/10 | ❌ Insuficiente |
| Seguridad | 5/10 | ⚠️ Requiere mejoras |
| Arquitectura | 7/10 | ✅ Buena |
| Deployment | 7/10 | ✅ Funcional |
| **Global** | **6.5/10** | ⚠️ En desarrollo |

**Tiempo estimado hasta v1.0**: 8-10 semanas con 2-3 desarrolladores

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

---

## 🙏 Agradecimientos

- Firebase por la infraestructura backend
- TailwindCSS por el framework CSS
- FastAPI por el framework web de Python
- La comunidad open source

---

**Made with ❤️ for secure dating**
