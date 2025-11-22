# 🌟 TuCitaSegura - Plataforma de Citas con IA

Una plataforma de citas inteligente con motor de recomendación ML, verificación de perfiles, moderación de contenido y sistema de seguridad avanzado.

## 🚀 Características Principales

### 🤖 Inteligencia Artificial
- **Motor de Recomendaciones ML**: Híbrido (colaborativo + basado en contenido + geográfico + conductual)
- **Moderación de Mensajes NLP**: Detección automática de spam, acoso y contenido inapropiado
- **Verificación de Fotos CV**: Detección de rostros, estimación de edad, filtros y análisis de contenido
- **Detección de Fraude**: Análisis multicapa de perfiles, comportamiento, red y contenido

### 🔒 Seguridad Avanzada
- **Verificación Multi-nivel**: Perfiles verificados con análisis de documentos
- **Anti-Ghosting Insurance**: Sistema de seguros con PayPal Vault
- **Autenticación Segura**: Firebase Auth con claims personalizados
- **Encriptación End-to-End**: Mensajes y videollamadas seguras

### 🎉 Características Sociales
- **Sistema de Referidos**: Recompensas por invitar amigos
- **Eventos VIP**: Eventos exclusivos para usuarios premium
- **Video Chat WebRTC**: Videollamadas con grabación y moderación
- **Geolocalización Inteligente**: Puntos de encuentro seguros y recomendados

### 📱 Tecnología
- **Frontend**: HTML5, CSS3, JavaScript ES6+, WebRTC
- **Backend**: FastAPI (Python), Firebase, Supabase
- **ML/AI**: scikit-learn, NLP, Computer Vision
- **Despliegue**: Vercel, Railway, Docker

## 🛠️ Instalación Rápida

### Opción 1: Modo Demo (Sin Firebase)
```bash
# Clonar repositorio
git clone https://github.com/tu-usuario/tucitasegura.git
cd tucitasegura

# Iniciar servidor local
python -m http.server 8080
# Abrir http://localhost:8080
```

### Opción 2: Desarrollo Completo
```bash
# Backend
pip install -r backend/requirements.txt
cd backend && uvicorn main:app --reload

# Frontend (en otra terminal)
python -m http.server 8080
```

## 🎯 Demo Mode Automático

TuCitaSegura incluye un **modo demo inteligente** que se activa automáticamente cuando:
- Firebase Auth no está configurado
- Falla la autenticación por problemas de dominio
- Se necesita desarrollo/testing sin dependencias externas

**Características del modo demo:**
- ✅ Usuarios demo almacenados en localStorage
- ✅ Todas las funciones ML/AI operativas
- ✅ Persistencia de datos local
- ✅ Indicadores visuales de modo demo

## 📊 Estado de los Servicios ML/AI

| Servicio | Estado | Rendimiento |
|----------|--------|-------------|
| ML Recommendations | ✅ Operativo | 0.00s avg |
| Message Moderation | ✅ Operativo | 0.002s avg |
| Fraud Detection | ✅ Operativo | 0.00s avg |
| Photo Verification | ✅ Demo Mode | - |
| Location Intelligence | ✅ Operativo | - |
| Referral System | ✅ Operativo | - |
| VIP Events | ✅ Operativo | - |
| Video Chat | ✅ Operativo | - |

## 🔧 API Endpoints

### Autenticación
- `POST /api/auth/register` - Registro de usuarios
- `POST /api/auth/login` - Inicio de sesión
- `POST /api/auth/logout` - Cierre de sesión

### Perfiles
- `GET /api/users/profile` - Obtener perfil
- `PUT /api/users/profile` - Actualizar perfil
- `POST /api/users/verify` - Verificar perfil

### Matching
- `GET /api/matches/recommendations` - Recomendaciones ML
- `POST /api/matches/like` - Dar like
- `POST /api/matches/dislike` - Dar dislike

### Mensajes
- `POST /api/messages/send` - Enviar mensaje
- `GET /api/messages/conversations` - Obtener conversaciones
- `POST /api/messages/moderate` - Moderar contenido

### Seguridad
- `POST /api/security/report` - Reportar usuario
- `POST /api/security/block` - Bloquear usuario
- `GET /api/security/fraud-check` - Análisis de fraude

## 🧪 Testing

```bash
# Tests unitarios
cd backend && python -m pytest tests/

# Tests de rendimiento
python -m pytest tests/performance_tests.py

# Tests de carga (Locust)
locust -f tests/locustfile.py --host=http://localhost:8000
```

## 🚀 Despliegue

### Vercel (Frontend)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/tu-usuario/tucitasegura)

### Railway (Backend)
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/tu-usuario/tucitasegura)

### Docker
```bash
docker build -t tucitasegura .
docker run -p 8000:8000 tucitasegura
```

## 📋 Variables de Entorno

```env
# Firebase
FIREBASE_PROJECT_ID=tu-proyecto
FIREBASE_PRIVATE_KEY=tu-clave-privada
FIREBASE_CLIENT_EMAIL=tu-email

# Supabase
SUPABASE_URL=tu-url
SUPABASE_KEY=tu-key

# OpenAI (para NLP)
OPENAI_API_KEY=tu-api-key

# PayPal (para seguros)
PAYPAL_CLIENT_ID=tu-client-id
PAYPAL_CLIENT_SECRET=tu-secret

# Google (para geolocalización)
GOOGLE_API_KEY=tu-api-key
```

## 🤝 Contribuir

1. Fork el repositorio
2. Crea tu rama (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 👥 Equipo

- **Desarrollo**: TuCitaSegura Team
- **ML/AI**: Especialistas en IA y seguridad
- **Diseño**: UX/UI Team

## 📞 Soporte

- 📧 Email: soporte@tucitasegura.com
- 💬 Discord: [TuCitaSegura Community](https://discord.gg/tucitasegura)
- 📱 WhatsApp: +1-555-TUCITA

---

⭐ **Si te gusta este proyecto, por favor dale una estrella!** ⭐

**Made with ❤️ by the TuCitaSegura Team**
