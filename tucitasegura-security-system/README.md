# TucitaSegura Security System

Sistema de seguridad independiente para gestión de teléfonos de emergencia con reCAPTCHA y Firestore.

## 🚀 Características

- **Gestión Segura de Teléfonos de Emergencia**: CRUD completo para números de emergencia
- **Autenticación y Autorización**: Control de acceso basado en roles (usuario/admin)
- **Validación reCAPTCHA**: Protección contra bots para acciones sensibles
- **Almacenamiento Seguro**: Firestore con subcolecciones privadas
- **API RESTful**: Endpoints bien documentados con FastAPI

## 📋 Requisitos

- Python 3.8+
- Firebase Project con Firestore
- Claves de reCAPTCHA v3

## 🛠️ Instalación

1. **Clonar el repositorio**:
   ```bash
   git clone https://github.com/tucitasegura/tucitasegura-security-system.git
   cd tucitasegura-security-system
   ```

2. **Configurar entorno virtual**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # Linux/Mac
   # o
   venv\\Scripts\\activate  # Windows
   ```

3. **Instalar dependencias**:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

4. **Configurar variables de entorno**:
   ```bash
   cp .env.example .env
   # Editar .env con tus credenciales
   ```

5. **Configurar Firebase**:
   - Crear proyecto en Firebase Console
   - Habilitar Firestore
   - Generar clave de servicio privada
   - Configurar reglas de seguridad (ver `firestore.rules.example`)

## ⚙️ Configuración

### Variables de Entorno

Crear archivo `.env` en la carpeta `backend/`:

```env
# Firebase Configuration
FIREBASE_PROJECT_ID=tu-proyecto-firebase
FIREBASE_PRIVATE_KEY_ID=tu-private-key-id
FIREBASE_PRIVATE_KEY=tu-private-key
FIREBASE_CLIENT_EMAIL=tu-client-email
FIREBASE_CLIENT_ID=tu-client-id
FIREBASE_CLIENT_X509_CERT_URL=tu-cert-url

# reCAPTCHA Configuration
RECAPTCHA_SECRET_KEY=tu-recaptcha-secret-key
RECAPTCHA_SITE_KEY=tu-recaptcha-site-key

# Server Configuration
PORT=8000
HOST=0.0.0.0
ENVIRONMENT=development
```

### Reglas de Seguridad de Firestore

Crear archivo `firestore.rules`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Reglas para usuarios
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // Subcolección privada - solo el usuario puede acceder
      match /private_info/{document} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
        
        // Admins pueden leer pero no escribir
        allow read: if request.auth != null && 
          request.auth.token.admin == true;
      }
    }
  }
}
```

## 🚀 Uso

### Iniciar el servidor

```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Documentación de la API

Una vez ejecutado, accede a:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 📚 Endpoints

### Teléfonos de Emergencia

#### Crear Teléfono de Emergencia
```http
POST /api/emergency/phones
Authorization: Bearer <token>
X-Recaptcha-Token: <recaptcha_token>  # Solo para usuarios no admin
Content-Type: application/json

{
  "phone_number": "+34123456789",
  "country_code": "+34",
  "is_primary": true,
  "label": "Teléfono personal",
  "notes": "Número de emergencia principal"
}
```

#### Obtener Teléfonos de Usuario
```http
GET /api/emergency/phones?user_id=<user_id>
Authorization: Bearer <token>
```

#### Obtener Teléfono Específico
```http
GET /api/emergency/phones/{phone_id}?user_id=<user_id>
Authorization: Bearer <token>
```

#### Actualizar Teléfono
```http
PUT /api/emergency/phones/{phone_id}
Authorization: Bearer <token>
X-Recaptcha-Token: <recaptcha_token>  # Solo para usuarios no admin
Content-Type: application/json

{
  "phone_number": "+34987654321",
  "is_primary": false
}
```

#### Eliminar Teléfono
```http
DELETE /api/emergency/phones/{phone_id}
Authorization: Bearer <token>
X-Recaptcha-Token: <recaptcha_token>  # Solo para usuarios no admin
```

#### Obtener Todos los Teléfonos (Admin)
```http
GET /api/emergency/admin/phones
Authorization: Bearer <admin_token>
```

## 🔐 Autenticación

### Tokens de Acceso

El sistema utiliza tokens Bearer para autenticación. Actualmente implementado:

- **Tokens de Administrador**: `admin_token_secreto`
- **Tokens de Usuario**: `user_token_<user_id>`

**TODO**: Integrar con Firebase Authentication para tokens JWT reales.

### Control de Acceso

- **Usuarios**: Solo pueden acceder a sus propios datos
- **Administradores**: Pueden acceder a todos los datos
- **reCAPTCHA**: Requerido para acciones sensibles de usuarios no admin

## 🛡️ Seguridad

### reCAPTCHA Integration

El sistema valida reCAPTCHA v3 para:
- Crear teléfonos de emergencia (usuarios)
- Actualizar teléfonos de emergencia (usuarios)  
- Eliminar teléfonos de emergencia (usuarios)

Los administradores están exentos de reCAPTCHA.

### Firestore Security

- **Subcolecciones Privadas**: `users/{uid}/private_info/`
- **Reglas de Seguridad**: Control de acceso por usuario
- **Datos Sensibles**: Solo accesibles por el usuario dueño
- **Acceso Admin**: Solo lectura para supervisión

## 🧪 Testing

### Pruebas Locales

```bash
# Ejecutar tests
python -m pytest tests/

# Ejecutar con coverage
python -m pytest tests/ --cov=app --cov-report=html
```

### Ejemplos de Uso

```python
import requests
import json

# Crear teléfono de emergencia
url = "http://localhost:8000/api/emergency/phones"
headers = {
    "Authorization": "Bearer user_token_123",
    "X-Recaptcha-Token": "fake_recaptcha_token",
    "Content-Type": "application/json"
}
data = {
    "phone_number": "+34123456789",
    "is_primary": True,
    "label": "Teléfono personal"
}

response = requests.post(url, headers=headers, json=data)
print(response.json())
```

## 📦 Estructura del Proyecto

```
tucitasegura-security-system/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── emergency_phones.py          # Endpoints de teléfonos
│   │   ├── models/
│   │   │   └── schemas.py                   # Modelos Pydantic
│   │   ├── services/
│   │   │   ├── firestore/
│   │   │   │   └── emergency_phones_service.py  # Servicio Firestore
│   │   │   └── security/
│   │   │       └── recaptcha_service.py     # Servicio reCAPTCHA
│   │   ├── core/
│   │   └── utils/
│   ├── tests/
│   ├── requirements.txt                     # Dependencias
│   ├── .env.example                         # Variables de entorno
│   └── main.py                              # App FastAPI
└── README.md
```

## 🚀 Despliegue

### Railway

1. Conectar repositorio a Railway
2. Configurar variables de entorno
3. Desplegar automáticamente

### Docker

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Manual

```bash
# Instalar dependencias
pip install -r requirements.txt

# Configurar entorno
export FIREBASE_PROJECT_ID=tu-proyecto
export RECAPTCHA_SECRET_KEY=tu-clave-secreta

# Ejecutar
uvicorn main:app --host 0.0.0.0 --port 8000
```

## 🤝 Contribución

1. Fork el proyecto
2. Crear feature branch (`git checkout -b feature/amazing-feature`)
3. Commit cambios (`git commit -m 'Add amazing feature'`)
4. Push al branch (`git push origin feature/amazing-feature`)
5. Abrir Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.

## 🆘 Soporte

Para soporte, contactar a:
- Email: soporte@tucitasegura.com
- Issues: https://github.com/tucitasegura/tucitasegura-security-system/issues

## 🔄 Roadmap

- [ ] Integración con Firebase Authentication
- [ ] Webhooks para notificaciones
- [ ] Dashboard de administración
- [ ] Tests completos
- [ ] Rate limiting
- [ ] Logging avanzado
- [ ] Métricas y monitoring