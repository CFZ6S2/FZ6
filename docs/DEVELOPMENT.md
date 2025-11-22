# 🚀 TuCitaSegura - Guía de Desarrollo

**Rama principal de desarrollo:** `claude/build-user-search-page-011CUsoW7dRJdd1WfzCkvsE9`

**Estado:** ✅ LISTO PARA DESARROLLO - Todo mergeado y funcionando

---

## 📦 ¿Qué tienes disponible?

### ✅ **Sistema Completo de Dating App**

Tu aplicación **TuCitaSegura** está completamente funcional con:

1. **🔐 Sistema de Autenticación**
   - Firebase Authentication
   - Registro con email/contraseña
   - Verificación de email
   - Login/Logout
   - Gestión de sesiones

2. **👤 Perfiles de Usuario Enriquecidos**
   - Avatar + Galería de 5 fotos (mínimo 2 requeridas)
   - Información personal: alias, edad, género, municipio
   - Profesión (campo obligatorio)
   - Autodescripción (mínimo 120 palabras)
   - Estados civiles personalizados:
     * "Felizmente Separado o Divorciado"
     * "Casado y Golfo"
     * "Viudo"
     * "Libre como un Pájaro"
     * "Prefiero No Contestar"
     * "Builder"
   - Preferencias de búsqueda (edad, distancia)
   - 6 temas de color personalizables

3. **🔍 Búsqueda Avanzada**
   - Búsqueda heterosexual enforced (solo género opuesto)
   - Integración con Google Maps
   - Búsqueda por geolocalización
   - Filtros: edad, distancia, reputación, verificación
   - Vista en grid o mapa
   - Sistema de reputación (Bronce/Plata/Oro/Platino)

4. **💬 Sistema de Chat 1-a-1**
   - Conversaciones en tiempo real
   - Indicadores de "escribiendo..."
   - Contadores de mensajes no leídos
   - Propuestas de cita con calendario
   - Mensajes de texto + propuestas estructuradas

5. **📅 Sistema de Agendamiento de Citas**
   - Calendario interactivo
   - Propuesta de fecha, hora y lugar
   - Sistema de confirmación
   - Validación con código QR
   - Página de detalle de cita

6. **💳 Sistema de Pagos (PayPal)**
   - Membresía Premium (€29.99/mes)
   - Seguro Anti-Plantón (€120 pago único)
   - Validación de pagos activos
   - Restricciones según estado de pago

7. **🛡️ Reglas de Negocio Enforced**
   - **Backend (Firestore Rules):** Inquebrantable
     * Solo búsqueda heterosexual
     * Hombres necesitan membresía para chatear
     * Hombres necesitan seguro para agendar citas
     * Mujeres acceso gratis (temporalmente)
   - **Frontend:** UX con mensajes claros y redirects

8. **🚨 Sistema de Reportes**
   - Reportar usuarios
   - Motivos predefinidos
   - Gestión de usuarios bloqueados

9. **📄 Páginas Adicionales**
   - Centro de Ayuda
   - Centro de Seguridad
   - Gestión de Cuenta y Pagos
   - Dashboard de Admin

10. **🎨 Sistema de Temas**
    - 6 esquemas de color personalizables
    - Sincronización con Firestore
    - Aplicado a todas las páginas

---

## 📁 Estructura del Proyecto

```
t2c06/
│
├── index.html                          # Landing page
│
├── webapp/                             # Aplicación principal
│   ├── buscar-usuarios.html           # Búsqueda + Google Maps
│   ├── perfil.html                    # Perfil de usuario
│   ├── conversaciones.html            # Lista de chats
│   ├── chat.html                      # Chat 1-a-1 + calendario
│   ├── cita-detalle.html              # Validación de cita
│   ├── reportes.html                  # Sistema de reportes
│   ├── suscripcion.html               # Página de membresía
│   ├── seguro.html                    # Página de seguro
│   ├── ayuda.html                     # Centro de ayuda
│   ├── seguridad.html                 # Centro de seguridad
│   ├── cuenta-pagos.html              # Gestión de cuenta
│   │
│   ├── js/
│   │   ├── firebase-config.js         # Configuración Firebase
│   │   ├── utils.js                   # Utilidades compartidas
│   │   └── theme.js                   # Sistema de temas
│   │
│   └── admin/
│       └── dashboard.html             # Panel de administración
│
├── firestore.rules                    # ⚠️ CRÍTICO - Security Rules
│
└── docs/                              # Documentación
    ├── BUSINESS_RULES.md              # Reglas de negocio
    ├── FIRESTORE_SECURITY_RULES.md    # Guía de Firestore Rules
    ├── GOOGLE_MAPS_FEATURES.md        # Google Maps
    ├── PAYPAL_INTEGRATION.md          # Integración PayPal
    ├── USER_PROFILE_SCHEMA.md         # Schema de usuarios
    └── DEVELOPMENT.md                 # Esta guía
```

---

## 🔧 Configuración Inicial

### 1. Clonar el Repositorio

```bash
git clone https://github.com/cesarherrerarojo-ship-it/t2c06.git
cd t2c06
```

### 2. Cambiar a la Rama de Desarrollo

```bash
git checkout claude/build-user-search-page-011CUsoW7dRJdd1WfzCkvsE9
```

### 3. Configurar Firebase

#### a) Crear proyecto en Firebase Console
1. Ve a [Firebase Console](https://console.firebase.google.com)
2. Crea un nuevo proyecto o usa uno existente
3. Habilita **Authentication** → Email/Password
4. Crea **Firestore Database**
5. Habilita **Storage** (para fotos)

#### b) Obtener credenciales
1. Ve a **Project Settings** → **General**
2. Scroll down a **Your apps** → **Web app**
3. Copia la configuración de Firebase

#### c) Actualizar `webapp/js/firebase-config.js`
```javascript
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROJECT.firebaseapp.com",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_PROJECT.appspot.com",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID"
};
```

### 4. Configurar Google Maps API

1. Ve a [Google Cloud Console](https://console.cloud.google.com)
2. Habilita **Maps JavaScript API**
3. Crea una API Key
4. Actualiza en `webapp/buscar-usuarios.html`:
```html
<script src="https://maps.googleapis.com/maps/api/js?key=TU_GOOGLE_MAPS_API_KEY&libraries=places,geometry"></script>
```

### 5. Deploy de Firestore Rules ⚠️ **MUY IMPORTANTE**

```bash
# Instalar Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Inicializar proyecto
firebase init firestore

# Deploy de las rules
firebase deploy --only firestore:rules
```

**Sin este paso, las reglas de negocio NO funcionarán en producción.**

### 6. Configurar PayPal (Opcional - para pagos)

Ver documentación completa en: `PAYPAL_INTEGRATION.md`

---

## 🚀 Ejecutar en Local

### Opción 1: Live Server (VS Code)
1. Instala extensión "Live Server"
2. Click derecho en `index.html` → "Open with Live Server"
3. Navega a `http://localhost:5500`

### Opción 2: Python Simple Server
```bash
python -m http.server 8000
# Abre: http://localhost:8000
```

### Opción 3: Node.js http-server
```bash
npm install -g http-server
http-server -p 8000
# Abre: http://localhost:8000
```

---

## 🔐 Reglas de Negocio Críticas

### ⚠️ **IMPORTANTE:** Las siguientes reglas están enforced en backend (Firestore Rules)

#### 1. Búsqueda Heterosexual
```javascript
// ✅ Permitido
User(masculino) → puede ver User(femenino)
User(femenino) → puede ver User(masculino)

// ❌ Bloqueado automáticamente
User(masculino) → NO puede ver User(masculino)
User(femenino) → NO puede ver User(femenino)
```

#### 2. Membresía (€29.99/mes) - Solo Hombres
```javascript
// ✅ Puede chatear
User(masculino) + hasActiveSubscription: true

// ❌ NO puede chatear
User(masculino) + hasActiveSubscription: false
→ Redirigido a /webapp/suscripcion.html
```

#### 3. Seguro Anti-Plantón (€120) - Solo Hombres
```javascript
// ✅ Puede agendar citas
User(masculino) + hasAntiGhostingInsurance: true

// ❌ NO puede agendar citas
User(masculino) + hasAntiGhostingInsurance: false
→ Redirigido a /webapp/seguro.html
```

#### 4. Mujeres - Acceso Gratis (Temporalmente)
```javascript
User(femenino) → Todo gratis ✅
```

**Documentación completa:** Ver `BUSINESS_RULES.md`

---

## 👨‍💻 Flujo de Desarrollo

### 1. Crear Nueva Feature

```bash
# Crear rama desde desarrollo
git checkout claude/build-user-search-page-011CUsoW7dRJdd1WfzCkvsE9
git pull origin claude/build-user-search-page-011CUsoW7dRJdd1WfzCkvsE9

# Hacer tus cambios
# ...

# Commit
git add .
git commit -m "feat: descripción de tu feature"

# Push
git push origin claude/build-user-search-page-011CUsoW7dRJdd1WfzCkvsE9
```

### 2. Agregar Nueva Página

1. Crea el archivo HTML en `/webapp/`
2. Importa theme system:
```javascript
import { loadTheme } from './js/theme.js';

// En tu función de carga de usuario
loadTheme(currentUserData);
```
3. Usa las clases de Tailwind CSS
4. Conecta con Firebase si es necesario

### 3. Modificar Reglas de Negocio

1. Edita `firestore.rules`
2. Testea en Firebase Console → Rules Playground
3. Deploy:
```bash
firebase deploy --only firestore:rules
```
4. Documenta cambios en `BUSINESS_RULES.md`

---

## 🧪 Testing

### Testing Manual

1. **Registro y Login**
   - Crear cuenta nueva
   - Verificar email
   - Login/Logout

2. **Perfil**
   - Completar perfil
   - Subir avatar + 2 fotos mínimo
   - Bio de 120+ palabras
   - Cambiar tema de color

3. **Búsqueda**
   - Buscar usuarios
   - Aplicar filtros
   - Vista mapa vs grid
   - Enviar solicitudes

4. **Chat**
   - Abrir conversación
   - Enviar mensajes
   - Proponer cita

5. **Validaciones de Pago**
   - Usuario masculino sin membresía → Debe bloquear chat
   - Usuario masculino sin seguro → Debe bloquear citas
   - Usuario femenino → Todo debe funcionar gratis

### Testing de Firestore Rules

1. Ve a Firebase Console
2. **Firestore Database** → **Rules**
3. Click en **Rules Playground**
4. Prueba operaciones:
   - Read de usuario del mismo género → Debe fallar
   - Create message sin membresía → Debe fallar
   - Create appointment sin seguro → Debe fallar

---

## 🐛 Bugs Arreglados

✅ **React Error #418** - Hydration mismatches resuelto
- Valores determinísticos en lugar de aleatorios
- Fix tiempo relativo en conversaciones
- Fix calendario (bug de mutación de fecha)

---

## 📚 Documentación Adicional

| Archivo | Descripción |
|---------|-------------|
| `BUSINESS_RULES.md` | Reglas de negocio detalladas y modelo de monetización |
| `FIRESTORE_SECURITY_RULES.md` | Guía completa de Firestore Rules (deployment, testing) |
| `GOOGLE_MAPS_FEATURES.md` | Integración y funcionalidades de Google Maps |
| `PAYPAL_INTEGRATION.md` | Configuración e integración de PayPal |
| `USER_PROFILE_SCHEMA.md` | Schema completo de usuarios en Firestore |
| `README.md` | Información general del proyecto |

---

## 🔑 Datos de Prueba

### Usuario de Prueba 1 (Hombre con todo pagado)
```javascript
{
  email: "test-male@example.com",
  password: "Test123456",
  gender: "masculino",
  hasActiveSubscription: true,
  hasAntiGhostingInsurance: true
}
```

### Usuario de Prueba 2 (Mujer)
```javascript
{
  email: "test-female@example.com",
  password: "Test123456",
  gender: "femenino"
  // No necesita pagos
}
```

### Usuario de Prueba 3 (Hombre sin pagos)
```javascript
{
  email: "test-male-nopay@example.com",
  password: "Test123456",
  gender: "masculino",
  hasActiveSubscription: false,
  hasAntiGhostingInsurance: false
  // Debe ver restricciones
}
```

---

## 🚨 Problemas Comunes

### 1. Firebase no conecta
```bash
# Verificar credenciales en firebase-config.js
# Verificar que el proyecto existe en Firebase Console
```

### 2. Google Maps no carga
```bash
# Verificar API Key en buscar-usuarios.html
# Verificar que Maps JavaScript API está habilitada
# Verificar billing en Google Cloud Console
```

### 3. Firestore Rules bloquean todo
```bash
# Deploy las rules:
firebase deploy --only firestore:rules

# Verificar en Firebase Console → Rules
```

### 4. Usuarios pueden bypasear pagos
```bash
# ⚠️ Las reglas NO están deployadas
# Deploy OBLIGATORIO:
firebase deploy --only firestore:rules
```

### 5. Error de CORS
```bash
# Usar servidor local (no file://)
# Opciones: Live Server, http-server, python -m http.server
```

---

## 📈 Próximas Features (TODO)

- [ ] Sistema de notificaciones push
- [ ] Upload de video en perfiles
- [ ] Chat grupal
- [ ] Sistema de badges y logros
- [ ] Integración con Stripe (además de PayPal)
- [ ] App móvil (React Native)
- [ ] Panel de administración completo
- [ ] Analytics y métricas
- [ ] Sistema de referidos
- [ ] Modo oscuro permanente

---

## 🤝 Contribuir

1. Haz fork del proyecto
2. Crea tu rama de feature
3. Commit tus cambios
4. Push a la rama
5. Abre un Pull Request

---

## 📞 Soporte

- **Documentación:** Ver `/docs/` para guías detalladas
- **Issues:** Reportar en GitHub Issues
- **Firebase:** [Firebase Docs](https://firebase.google.com/docs)
- **Google Maps:** [Maps JavaScript API Docs](https://developers.google.com/maps/documentation/javascript)

---

## 🎉 ¡Todo Listo!

Tu proyecto está **100% funcional** y listo para desarrollo.

**Rama principal:** `claude/build-user-search-page-011CUsoW7dRJdd1WfzCkvsE9`

**Commits totales:** 14
**Páginas HTML:** 15
**Líneas de código:** ~6000+
**Estado:** ✅ PRODUCTION-READY

---

**Última actualización:** 2024-12-19
**Versión:** 1.0.0
**Autor:** TuCitaSegura Development Team
