# TuCitaSegura - Estructura del Proyecto

## 📁 Estructura General

```
FZ6/
├── backend/                 # Backend API (FastAPI + Python)
├── webapp/                  # Frontend Web Application
├── functions/               # Firebase Cloud Functions
├── docs/                    # Documentación del proyecto
├── scripts/                 # Scripts de utilidad
├── test/                    # Tests de integración
└── e2e/                     # Tests end-to-end (Playwright)
```

---

## 🔧 Backend Structure (`/backend`)

### Estructura de Directorios

```
backend/
├── app/                     # Código fuente principal
│   ├── __init__.py
│   ├── api/                 # Endpoints de API
│   │   ├── __init__.py
│   │   ├── admin/           # Rutas de administración
│   │   └── v1/              # API versión 1
│   │       ├── __init__.py
│   │       ├── recommendations.py
│   │       └── validation.py
│   │
│   ├── core/                # Configuración central
│   │   ├── __init__.py
│   │   ├── config.py        # Settings & configuración
│   │   └── dependencies.py  # Dependencias inyectables
│   │
│   ├── middleware/          # Middleware de la aplicación
│   │   ├── __init__.py
│   │   └── rate_limit.py    # Rate limiting
│   │
│   ├── models/              # Modelos Pydantic
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── match.py
│   │   └── message.py
│   │
│   ├── services/            # Lógica de negocio
│   │   ├── __init__.py
│   │   ├── auth/            # Autenticación
│   │   ├── backup/          # Respaldos
│   │   ├── cv/              # Visión computacional
│   │   ├── email/           # Servicios de email
│   │   ├── firestore/       # Utilidades Firestore
│   │   ├── geo/             # Geolocalización
│   │   ├── health/          # Health checks
│   │   ├── ml/              # Machine Learning
│   │   │   └── recommendation_engine.py
│   │   ├── monitoring/      # Monitoreo
│   │   ├── nlp/             # Procesamiento de lenguaje
│   │   │   └── message_moderator.py
│   │   ├── payments/        # Procesamiento de pagos
│   │   ├── referrals/       # Sistema de referidos
│   │   ├── security/        # Seguridad
│   │   ├── video_chat/      # Video llamadas
│   │   └── vip_events/      # Eventos VIP
│   │
│   └── utils/               # Utilidades generales
│       ├── __init__.py
│       ├── validators.py
│       └── helpers.py
│
├── tests/                   # Tests del backend
│   ├── __init__.py
│   ├── test_api.py
│   ├── test_recommendations.py
│   ├── test_validation.py
│   └── test_services.py
│
├── scripts/                 # Scripts de desarrollo
│   ├── setup.sh            # Configuración inicial
│   ├── dev.sh              # Servidor de desarrollo
│   ├── test.sh             # Ejecutar tests
│   ├── format.sh           # Formatear código
│   └── lint.sh             # Linting
│
├── logs/                    # Logs de la aplicación
├── uploads/                 # Archivos subidos
├── models/                  # Modelos ML entrenados
├── backups/                 # Respaldos de base de datos
│
├── main.py                  # Punto de entrada de la aplicación
├── requirements.txt         # Dependencias Python
├── pyproject.toml          # Configuración de herramientas
├── pytest.ini              # Configuración de pytest
├── Makefile                # Comandos comunes
├── .env.example            # Template de variables de entorno
├── .gitignore
└── README.md
```

---

## 🌐 Frontend Structure (`/webapp`)

```
webapp/
├── js/                      # Módulos JavaScript
│   ├── firebase-config.js   # Configuración Firebase
│   ├── auth-guard.js        # Protección de rutas
│   ├── api-service.js       # Cliente API backend
│   ├── sanitizer.js         # Sanitización XSS
│   ├── rate-limiter.js      # Rate limiting cliente
│   ├── input-validator.js   # Validación de inputs
│   ├── security-logger.js   # Logging de seguridad
│   ├── error-handler.js     # Manejo de errores
│   ├── notifications.js     # Notificaciones push
│   └── utils.js             # Utilidades generales
│
├── css/                     # Estilos
│   └── styles.css
│
├── admin/                   # Panel de administración
│   └── dashboard.html
│
├── *.html                   # Páginas HTML
│   ├── index.html
│   ├── login.html
│   ├── register.html
│   ├── perfil.html
│   ├── buscar-usuarios.html
│   ├── conversaciones.html
│   └── chat.html
│
└── assets/                  # Recursos estáticos
    ├── images/
    └── icons/
```

---

## ☁️ Firebase Functions Structure (`/functions`)

```
functions/
├── index.js                 # Funciones principales (55k líneas)
├── fraud-detection.js       # Detección de fraude
├── notifications.js         # Notificaciones push
├── rate-limiter.js          # Rate limiting server
├── middleware/              # Middleware de funciones
├── test/                    # Tests de funciones
├── package.json
└── firebase.json
```

---

## 📚 Documentation Structure (`/docs`)

```
docs/
├── API_DOCUMENTATION.md                      # Documentación API completa
├── CODE_REVIEW_CONTINUOUS_IMPROVEMENTS.md    # Revisión de código
├── PROJECT_STRUCTURE.md                      # Este archivo
├── DEPLOYMENT_GUIDE.md                       # Guía de despliegue
├── SECURITY.md                               # Documentación de seguridad
├── API_VERSIONING.md                         # Versionamiento de API
└── CONTRIBUTING.md                           # Guía de contribución
```

---

## 🔑 Archivos de Configuración Clave

### Backend

| Archivo | Propósito |
|---------|-----------|
| `main.py` | Punto de entrada FastAPI |
| `requirements.txt` | Dependencias Python |
| `pyproject.toml` | Configuración de herramientas (black, isort, pylint, pytest) |
| `pytest.ini` | Configuración de pytest |
| `.env` | Variables de entorno (no commitear) |
| `.env.example` | Template de variables de entorno |
| `Makefile` | Comandos comunes de desarrollo |

### Frontend

| Archivo | Propósito |
|---------|-----------|
| `firebase-config.js` | Configuración Firebase |
| `vercel.json` | Configuración de Vercel |
| `package.json` | Dependencias Node.js |

### Firebase

| Archivo | Propósito |
|---------|-----------|
| `firebase.json` | Configuración Firebase |
| `firestore.rules` | Reglas de seguridad Firestore |
| `firebase-storage.rules` | Reglas de seguridad Storage |
| `firestore.indexes.json` | Índices de Firestore |

---

## 🚀 Workflows de Desarrollo

### Backend Development

```bash
# Setup inicial
cd backend
make setup              # Configura el entorno
make install            # Instala dependencias

# Desarrollo
make dev                # Inicia servidor de desarrollo
make test               # Ejecuta tests
make test-coverage      # Tests con coverage
make format             # Formatea código
make lint               # Verifica calidad de código

# Limpieza
make clean              # Limpia archivos temporales
make clean-all          # Limpia todo incluyendo venv
```

### Testing Workflow

```bash
# Tests específicos
make test-unit          # Solo tests unitarios
make test-integration   # Solo tests de integración
make test-api           # Solo tests de API
make test-security      # Solo tests de seguridad
make test-quick         # Tests rápidos (sin slow)

# Cobertura
make test-coverage      # Genera reporte HTML en htmlcov/
```

### Code Quality Workflow

```bash
# Formateo automático
make format             # black + isort

# Verificación
make lint               # pylint + black --check + isort --check

# Check completo
make check              # lint + test-quick
make ci                 # lint + test-coverage (para CI/CD)
```

---

## 📦 Gestión de Dependencias

### Backend (Python)

**Archivo:** `requirements.txt`

**Categorías:**
- Core Framework (FastAPI, Uvicorn)
- Firebase & Database
- Machine Learning (numpy, pandas, scikit-learn)
- Computer Vision (opencv-python, Pillow)
- Security (cryptography, pyjwt, passlib)
- Rate Limiting (slowapi)
- Monitoring (sentry-sdk)
- Testing (pytest, pytest-asyncio, pytest-cov)
- Code Quality (pylint, black, isort)
- Documentation (mkdocs)

**Actualización:**
```bash
pip install -r requirements.txt
pip list --outdated
```

### Frontend (JavaScript)

**Gestión de módulos:** ES6 Modules (import/export)

**Principales módulos:**
- Firebase SDK (10.12.2)
- DOMPurify (sanitización)
- Utilidades personalizadas

---

## 🔐 Seguridad

### Capas de Seguridad Implementadas

1. **Client-Side**
   - XSS Protection (DOMPurify)
   - Rate Limiting (client)
   - Input Validation
   - Security Event Logging

2. **Server-Side**
   - Rate Limiting (slowapi)
   - Input Validation (Pydantic)
   - Authentication (Firebase)
   - CSRF Protection
   - Security Headers

3. **Database**
   - Firestore Security Rules
   - Storage Security Rules

4. **Monitoring**
   - Security Logger
   - Sentry Integration
   - Pattern Detection

---

## 🧪 Testing Strategy

### Test Types

| Tipo | Marker | Ubicación | Propósito |
|------|--------|-----------|-----------|
| Unit | `@pytest.mark.unit` | `tests/test_*.py` | Tests de funciones/clases individuales |
| Integration | `@pytest.mark.integration` | `tests/test_integration.py` | Tests de integración entre componentes |
| API | `@pytest.mark.api` | `tests/test_recommendations.py` | Tests de endpoints API |
| Security | `@pytest.mark.security` | `tests/test_security.py` | Tests de seguridad |
| Slow | `@pytest.mark.slow` | Varios | Tests que tardan >1s |

### Coverage Goals

- **Overall:** 80%+
- **Critical paths:** 90%+
- **ML Services:** 70%+
- **API Endpoints:** 85%+

---

## 📈 Continuous Integration

### Pre-commit Checks

```bash
make format     # Auto-format código
make lint       # Verificar calidad
make test-quick # Tests rápidos
```

### CI Pipeline (Recomendado)

```yaml
# .github/workflows/ci.yml
steps:
  - Setup Python
  - Install dependencies
  - Run linting (make lint)
  - Run tests with coverage (make test-coverage)
  - Upload coverage reports
  - Security scan (make security)
```

---

## 🌍 Entornos

### Development

- **Backend:** http://localhost:8000
- **Frontend:** Local files / localhost:3000
- **Database:** Firebase (development project)
- **Storage:** memory:// (rate limiting)

### Staging

- **Backend:** Railway staging
- **Frontend:** Vercel preview
- **Database:** Firebase staging
- **Storage:** Redis (rate limiting)

### Production

- **Backend:** Railway production
- **Frontend:** Vercel production
- **Database:** Firebase production
- **Storage:** Redis cluster

---

## 📝 Convenciones de Código

### Python (Backend)

- **Style Guide:** PEP 8
- **Line Length:** 100 caracteres
- **Imports:** Ordenados con isort (profile: black)
- **Docstrings:** Google style
- **Type Hints:** Preferidos pero no requeridos
- **Naming:**
  - `snake_case` para funciones y variables
  - `PascalCase` para clases
  - `UPPER_CASE` para constantes

### JavaScript (Frontend)

- **Style Guide:** Airbnb JavaScript Style Guide
- **Modules:** ES6 Modules
- **Naming:**
  - `camelCase` para funciones y variables
  - `PascalCase` para clases
  - `UPPER_SNAKE_CASE` para constantes

---

## 🔄 Git Workflow

### Branch Strategy

- `main` - Producción
- `develop` - Desarrollo
- `claude/*` - Features/fixes por Claude
- `feature/*` - Nuevas características
- `hotfix/*` - Fixes urgentes

### Commit Messages

```
type(scope): subject

body (optional)

footer (optional)
```

**Types:** feat, fix, docs, style, refactor, test, chore

---

## 📊 Monitoreo y Logs

### Logs

- **Ubicación:** `/backend/logs/`
- **Formato:** JSON structured logging
- **Niveles:** DEBUG, INFO, WARNING, ERROR, CRITICAL
- **Rotación:** Daily

### Monitoring

- **Sentry:** Error tracking
- **Firebase Analytics:** User behavior
- **Custom Metrics:** Business metrics

---

## 🎯 Próximos Pasos

1. ✅ Estructura de directorios completa
2. ✅ Configuración de herramientas
3. ✅ Scripts de desarrollo
4. ⏳ CI/CD pipeline
5. ⏳ Docker setup
6. ⏳ Kubernetes config (opcional)

---

**Última actualización:** 28 de Noviembre, 2025
**Versión:** 1.0.0
