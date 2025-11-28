# TuCitaSegura Backend API

Backend API para TuCitaSegura - Plataforma de citas premium con IA.

## 🚀 Quick Start

```bash
# Setup inicial
make setup

# Activar entorno virtual
source venv/bin/activate

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# Iniciar servidor de desarrollo
make dev
```

La API estará disponible en:
- **API:** http://localhost:8000
- **Docs:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

---

## 📋 Comandos Disponibles

```bash
make help              # Ver todos los comandos disponibles
make setup             # Configurar entorno de desarrollo
make dev               # Iniciar servidor de desarrollo
make test              # Ejecutar todos los tests
make test-coverage     # Tests con reporte de cobertura
make format            # Formatear código (black + isort)
make lint              # Verificar calidad de código
make clean             # Limpiar archivos temporales
```

---

## 🏗️ Estructura del Proyecto

```
backend/
├── app/                    # Código fuente
│   ├── api/v1/            # Endpoints API v1
│   ├── core/              # Configuración
│   ├── middleware/        # Middleware
│   ├── models/            # Modelos Pydantic
│   ├── services/          # Lógica de negocio
│   └── utils/             # Utilidades
├── tests/                 # Tests
├── scripts/               # Scripts de desarrollo
├── main.py               # Punto de entrada
├── requirements.txt      # Dependencias
└── Makefile              # Comandos comunes
```

Ver documentación completa: [PROJECT_STRUCTURE.md](../docs/PROJECT_STRUCTURE.md)

---

## 📦 Tecnologías

- **Framework:** FastAPI 0.109.0
- **Python:** 3.9+
- **Database:** Firebase Firestore
- **Auth:** Firebase Authentication
- **ML/AI:** scikit-learn, numpy, pandas
- **CV:** OpenCV, Pillow
- **Testing:** pytest, pytest-asyncio

---

## 🧪 Testing

```bash
# Todos los tests
make test

# Tests específicos
make test-unit           # Solo unit tests
make test-integration    # Solo integration tests
make test-api            # Solo API tests

# Con cobertura
make test-coverage       # Genera htmlcov/index.html
```

---

## 🎨 Code Quality

```bash
# Formatear código automáticamente
make format

# Verificar calidad
make lint

# Check completo (lint + tests rápidos)
make check
```

### Herramientas

- **black:** Formateo de código (100 chars)
- **isort:** Ordenamiento de imports
- **pylint:** Linting (score mínimo: 8.0)
- **pytest:** Testing framework

---

## 📚 API Documentation

### Endpoints Disponibles

#### Recommendations API (`/api/v1/recommendations/`)
- `GET /` - Obtener recomendaciones personalizadas
- `POST /refresh` - Regenerar recomendaciones
- `GET /compatibility/{id1}/{id2}` - Score de compatibilidad
- `POST /preferences/{id}` - Actualizar preferencias
- `GET /stats/{id}` - Estadísticas

#### Validation API (`/api/v1/validation/`)
- `POST /email` - Validar email
- `POST /password` - Validar contraseña (con scoring)
- `POST /phone` - Validar teléfono
- `POST /username` - Validar username
- `POST /dni` - Validar DNI/NIE español
- `POST /age` - Validar edad
- `POST /batch` - Validación por lotes

Ver documentación completa: [API_DOCUMENTATION.md](../docs/API_DOCUMENTATION.md)

---

## 🔐 Seguridad

### Implementado

- ✅ Rate Limiting (slowapi)
- ✅ Validación server-side (Pydantic)
- ✅ Firebase Authentication
- ✅ CORS configurado
- ✅ Security Headers
- ✅ Input Sanitization

### Rate Limits

| Endpoint Type | Limit |
|--------------|-------|
| Auth | 5/minute |
| Upload | 10/minute |
| Messaging | 20/minute |
| Search | 30/minute |
| API General | 100/minute |
| Public | 200/hour |

---

## 🌍 Variables de Entorno

Copiar `.env.example` a `.env` y configurar:

```bash
# Esenciales
ENVIRONMENT=development
FIREBASE_CREDENTIALS_PATH=./firebase-credentials.json
FIREBASE_PROJECT_ID=your-project-id

# APIs Externas
GOOGLE_MAPS_API_KEY=your-key
OPENAI_API_KEY=your-key

# Pagos
PAYPAL_CLIENT_ID=your-id
PAYPAL_CLIENT_SECRET=your-secret

# Seguridad
JWT_SECRET_KEY=your-secret-key
REDIS_URL=redis://localhost:6379

# Monitoring
SENTRY_DSN=your-sentry-dsn
```

---

## 🚢 Deployment

### Railway (Production)

```bash
# Deploy automático desde GitHub
git push origin main
```

### Local Production

```bash
make serve-prod
```

---

## 📈 Status

| Componente | Status | Coverage |
|-----------|--------|----------|
| API Endpoints | ✅ 12 endpoints | 85% |
| Validación | ✅ Completa | 90% |
| Rate Limiting | ✅ Implementado | - |
| Tests | ✅ 70+ casos | 80%+ |
| Documentación | ✅ Completa | - |

---

## 🤝 Contribuir

1. Fork el proyecto
2. Crear feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'feat: add AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

### Antes de PR

```bash
make format      # Formatear código
make lint        # Verificar calidad
make test        # Ejecutar tests
```

---

## 📝 License

Copyright © 2025 TuCitaSegura

---

## 📞 Soporte

- **Docs:** [/docs](../docs/)
- **API Docs:** http://localhost:8000/docs
- **Issues:** GitHub Issues
