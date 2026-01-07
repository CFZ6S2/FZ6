# Prompt Completo: TuCitaSegura - Webapp Completa de Citas Premium

## Contexto del Proyecto

Crea una **plataforma completa de citas premium** llamada "TuCitaSegura" con enfoque en relaciones serias, seguridad avanzada, verificación de identidad y sistema anti-plantón. La aplicación debe ser una Progressive Web App (PWA) completamente funcional con backend Firebase y diseño glassmorphism premium.

---

## Stack Tecnológico

### Frontend
- **HTML5 semántico** con estructura modular
- **CSS3** con TailwindCSS (configuración personalizada)
- **JavaScript vanilla ES6+** (módulos, sin frameworks)
- **Firebase SDK v12+** (Auth, Firestore, Storage, Functions, Messaging)
- **PWA** con Service Worker y manifest.json
- **i18n** multiidioma (ES, EN, PT, FR, DE)

### Backend
- **Firebase Authentication** (email/password, verificación)
- **Cloud Firestore** (base de datos NoSQL)
- **Cloud Storage** (imágenes y documentos)
- **Cloud Functions** (lógica de negocio, webhooks)
- **App Check** (protección anti-bot)
- **Firebase Messaging** (notificaciones push)

### Integraciones Externas
- **Google Maps API** (geolocalización y búsqueda)
- **Stripe** (pagos y suscripciones)
- **PayPal** (pagos alternativos)
- **reCAPTCHA Enterprise** (seguridad)

---

## Esquema de Datos Firestore (Modelo NoSQL)

Este es el corazón de la app. Estructura recomendada para soportar las features complejas:

### Colección `users`

```javascript
{
  uid: "user123", // ID del documento (mismo que Auth UID)
  
  basicInfo: {
    alias: "MaríaG",
    birthDate: Timestamp, // Para calcular edad (validar 18+)
    gender: "Female" | "Male",
    profession: "Dentista",
    municipality: "Madrid",
    description: "Texto largo mínimo 120 palabras...",
    civilStatus: "Libre como un Pájaro" | "Felizmente Separado..." | ...,
    avatar: "gs://bucket/avatars/user123.jpg",
    gallery: [
      "gs://bucket/gallery/user123_1.jpg",
      "gs://bucket/gallery/user123_2.jpg",
      // Máximo 5 fotos
    ],
    themeColor: "blue" | "purple" | "pink" | ... // 6 opciones
  },
  
  preferences: {
    ageRange: [25, 40], // [min, max]
    maxDistance: 50, // km
    genderInterest: "Male" // Solo género opuesto (enforced)
  },
  
  membership: {
    type: "free" | "premium",
    expiresAt: Timestamp | null,
    stripeSubscriptionId: "sub_xxx" | null,
    paypalSubscriptionId: "I-xxx" | null
  },
  
  verification: {
    email: true, // Siempre true si está en esta colección
    identity: "pending" | "verified" | "rejected",
    identityDocUrl: "gs://bucket/docs/user123_id.jpg" | null,
    identitySelfieUrl: "gs://bucket/docs/user123_selfie.jpg" | null,
    trustLevel: "bronze" | "silver" | "gold" | "platinum"
  },
  
  stats: {
    score: 95, // Score de compatibilidad promedio
    flakeCount: 0, // Contador de plantones
    matchesCount: 0,
    favoritesCount: 0,
    reportsReceived: 0,
    reportsMade: 0
  },
  
  location: {
    lat: 40.4168,
    lng: -3.7038,
    lastUpdated: Timestamp
  },
  
  referral: {
    code: "MARIA2024", // Código único de referido
    referredBy: "user456" | null, // UID del usuario que lo refirió
    referralsCount: 0 // Cuántos usuarios ha referido
  },
  
  createdAt: Timestamp,
  lastActive: Timestamp,
  isOnline: boolean
}
```

### Colección `conversations`

```javascript
{
  conversationId: "conv_user123_user456", // ID único
  
  participants: ["user123", "user456"], // Array de UIDs ordenado
  
  lastMessage: {
    text: "¿Te parece bien el viernes?",
    timestamp: Timestamp,
    sentBy: "user123",
    seenBy: ["user123"], // Array de UIDs que han visto
    type: "text" | "appointment_proposal"
  },
  
  appointmentProposal: {
    status: "none" | "pending" | "accepted" | "rejected" | "modified",
    proposedBy: "user123" | null,
    details: {
      date: Timestamp,
      time: "18:00",
      location: {
        name: "Café Central",
        lat: 40.4168,
        lng: -3.7038
      },
      message: "¿Te parece bien este lugar?"
    } | null
  },
  
  createdAt: Timestamp,
  updatedAt: Timestamp
}

// Subcolección: messages
conversations/{conversationId}/messages/{messageId}
{
  text: "Hola!",
  sentBy: "user123",
  timestamp: Timestamp,
  type: "text" | "appointment_proposal" | "system",
  seenBy: ["user123"],
  appointmentData: { ... } | null // Si type es appointment_proposal
}
```

### Colección `appointments` (Citas)

```javascript
{
  appointmentId: "appt_xxx",
  
  participants: ["user123", "user456"], // Ambos usuarios
  
  details: {
    date: Timestamp, // Fecha y hora combinadas
    location: {
      name: "Café Central",
      lat: 40.4168,
      lng: -3.7038,
      address: "Calle Gran Vía 1, Madrid"
    },
    type: "coffee" | "dinner" | "activity" | "other",
    notes: "Nos vemos en la entrada principal"
  },
  
  status: "pending" | "confirmed" | "cancelled" | "completed" | "no_show",
  
  antiFlakeInsurance: {
    active: true, // Si se activó el seguro
    amount: 120, // €120 por cita
    paidBy: "user123", // Quién pagó el seguro
    status: "held" | "refunded" | "penalized", // Estado del dinero
    refundedAt: Timestamp | null
  },
  
  qrCodes: {
    user123: "hash_abc123", // Código QR único para cada usuario
    user456: "hash_def456"
  },
  
  attendance: {
    user123: false, // Si escaneó su QR
    user456: false
  },
  
  validatedAt: Timestamp | null, // Cuando ambos escanearon
  cancelledBy: "user123" | null,
  cancellationReason: "Cambio de planes" | null,
  
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Colección `favorites`

```javascript
{
  favoriteId: "fav_xxx",
  userId: "user123", // Usuario que agregó a favoritos
  favoriteUserId: "user456", // Usuario favorito
  createdAt: Timestamp
}
```

### Colección `reports`

```javascript
{
  reportId: "report_xxx",
  reportedBy: "user123", // Usuario que reporta
  reportedUser: "user456", // Usuario reportado
  reason: "fake_profile" | "inappropriate_behavior" | "spam" | "other",
  description: "Descripción del problema...",
  evidence: [
    "gs://bucket/reports/report_xxx_1.jpg",
    // Capturas, etc.
  ],
  status: "pending" | "reviewed" | "action_taken" | "dismissed",
  adminNotes: "Notas del admin" | null,
  createdAt: Timestamp,
  reviewedAt: Timestamp | null,
  reviewedBy: "admin_uid" | null
}
```

### Colección `vip_events`

```javascript
{
  eventId: "event_xxx",
  title: "Cena VIP en Madrid",
  description: "Evento exclusivo para miembros VIP...",
  imageUrl: "gs://bucket/events/event_xxx.jpg",
  date: Timestamp,
  location: {
    name: "Restaurante XYZ",
    lat: 40.4168,
    lng: -3.7038,
    address: "Calle..."
  },
  price: 199, // €
  capacity: 50,
  attendees: ["user123", "user456"], // Array de UIDs
  createdBy: "concierge_uid",
  status: "upcoming" | "ongoing" | "completed" | "cancelled",
  createdAt: Timestamp
}
```

### Colección `notifications`

```javascript
{
  notificationId: "notif_xxx",
  userId: "user123", // Usuario destinatario
  type: "new_message" | "match" | "appointment_reminder" | "verification_approved" | ...,
  title: "Nuevo mensaje",
  body: "María te envió un mensaje",
  data: {
    conversationId: "conv_xxx" | null,
    appointmentId: "appt_xxx" | null,
    // Datos adicionales según el tipo
  },
  read: false,
  createdAt: Timestamp
}
```

### Colección `referrals`

```javascript
{
  referralId: "ref_xxx",
  referrerId: "user123", // Usuario que refirió
  referredId: "user456", // Usuario referido
  referralCode: "MARIA2024",
  status: "registered" | "verified" | "premium", // Estado del referido
  rewardEarned: false,
  rewardType: "free_month" | null,
  createdAt: Timestamp
}
```

### Colección `identity_verifications`

```javascript
{
  verificationId: "verif_xxx",
  userId: "user123",
  identityDocUrl: "gs://bucket/docs/user123_id.jpg",
  selfieUrl: "gs://bucket/docs/user123_selfie.jpg",
  status: "pending" | "approved" | "rejected",
  reviewedBy: "admin_uid" | null,
  reviewNotes: "Documento válido" | "Documento ilegible" | null,
  submittedAt: Timestamp,
  reviewedAt: Timestamp | null
}
```

### Colección `payments`

```javascript
{
  paymentId: "pay_xxx",
  userId: "user123",
  type: "membership" | "insurance" | "event",
  amount: 29.99, // €
  currency: "EUR",
  provider: "stripe" | "paypal",
  providerTransactionId: "txn_xxx",
  status: "pending" | "completed" | "failed" | "refunded",
  itemId: "sub_xxx" | "appt_xxx" | "event_xxx", // ID del item pagado
  createdAt: Timestamp,
  completedAt: Timestamp | null
}
```

### Índices de Firestore Requeridos

```javascript
// Para búsqueda de usuarios
users: [
  { fields: ["location.lat", "location.lng"], mode: "GEOHASH" },
  { fields: ["basicInfo.gender", "verification.trustLevel"], mode: "ASCENDING" },
  { fields: ["stats.score"], mode: "DESCENDING" }
]

// Para conversaciones
conversations: [
  { fields: ["participants", "updatedAt"], mode: "DESCENDING" }
]

// Para citas
appointments: [
  { fields: ["participants", "details.date"], mode: "ASCENDING" },
  { fields: ["status", "details.date"], mode: "ASCENDING" }
]
```

---

## Estructura de Archivos

```
/
├── index.html (Landing page premium)
├── manifest.json (PWA)
├── sw.js (Service Worker)
├── webapp/
│   ├── index.html
│   ├── login.html
│   ├── register.html
│   ├── verify-email.html
│   ├── perfil.html
│   ├── dashboard.html
│   ├── buscar-usuarios.html
│   ├── chat.html
│   ├── conversaciones.html
│   ├── video-chat.html
│   ├── citas.html
│   ├── cita-detalle.html
│   ├── favoritos.html
│   ├── membresia.html
│   ├── suscripcion.html
│   ├── seguro.html
│   ├── verificacion-identidad.html
│   ├── eventos-vip.html
│   ├── evento-detalle.html
│   ├── referidos.html
│   ├── logros.html
│   ├── cuenta-pagos.html
│   ├── reportes.html
│   ├── ayuda.html
│   ├── seguridad.html
│   ├── contacto.html
│   ├── privacidad.html
│   ├── terminos.html
│   ├── cookies.html
│   ├── admin.html
│   ├── admin-login.html
│   ├── concierge-dashboard.html
│   ├── diagnostics.html
│   ├── css/
│   │   ├── output.css (Tailwind compilado)
│   │   ├── input.css (Tailwind source)
│   │   ├── landing.css
│   │   └── lazy-loading.css
│   ├── js/
│   │   ├── firebase-config-env.js
│   │   ├── firebase-appcheck.js
│   │   ├── auth-guard.js
│   │   ├── profile-guard.js
│   │   ├── api-service.js
│   │   ├── dashboard-loader.js
│   │   ├── admin-dashboard.js
│   │   ├── video-chat.js
│   │   ├── stripe-integration.js
│   │   ├── notifications.js
│   │   ├── push-notifications.js
│   │   ├── trust-system.js
│   │   ├── badges-system.js
│   │   ├── referral-system.js
│   │   ├── appointment-availability.js
│   │   ├── storage-upload.js
│   │   ├── image-optimizer.js
│   │   ├── input-validator.js
│   │   ├── error-handler.js
│   │   ├── network-error-handler.js
│   │   ├── rate-limiter.js
│   │   ├── security-logger.js
│   │   ├── language-selector.js
│   │   ├── theme.js
│   │   ├── utils.js
│   │   └── constants.js
│   └── i18n/
│       ├── i18n.js
│       └── locales/
│           ├── es.json
│           ├── en.json
│           ├── pt.json
│           ├── fr.json
│           └── de.json
├── functions/
│   ├── index.js
│   ├── api-endpoints.js
│   ├── notifications.js
│   ├── health-check.js
│   ├── fraud-detection.js
│   ├── rate-limiter.js
│   └── recaptcha-enterprise.js
├── firebase.json
├── firestore.rules
├── storage.rules
└── database.rules.json
```

---

## 1. LANDING PAGE PREMIUM (index.html)

### Estilo Visual Glassmorphism
- Fondos con `backdrop-filter: blur(16px)`
- Tarjetas semitransparentes `rgba(255, 255, 255, 0.08)`
- Bordes sutiles `rgba(255, 255, 255, 0.12)`
- Sombras profundas `box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3)`
- Degradados azul-violeta `linear-gradient(135deg, #4A90E2, #9B59B6)`

### Secciones de la Landing

#### Header/Navegación
- Logo "TuCitaSegura" con icono corazón
- Menú: Inicio, Cómo Funciona, Testimonios, Comparativa, Contacto
- Selector de idioma (ES/EN/PT/FR/DE)
- Botones: "Iniciar Sesión" y "Registrarse" (CTA gradient)
- Sticky header con glassmorphism
- Menú hamburguesa responsive

#### Hero Section
- **Fondo de partículas animadas** (canvas ligero, ~50-100 partículas)
- **Efecto typing** en título principal que alterna:
  - "Reserva citas sin esperas"
  - "Reserva citas sin llamadas"
  - "Reserva citas 24/7"
- Subtítulo: "La plataforma más sencilla para gestionar tus citas. Olvídate de las esperas telefónicas."
- Botones: "Crear Cuenta Gratis" (principal) y "Ver Demo" (secundario)
- Mockup/imagen de la app flotante
- Animación de entrada suave

#### Sección Estadísticas (#estadisticas)
- 4 tarjetas glassmorphism con contadores animados:
  - "Usuarios Activos" → 10,000+ (animación de 0 a 10000)
  - "Citas Gestionadas" → 50,000+ (animación de 0 a 50000)
  - "Centros Asociados" → 500+ (animación de 0 a 500)
  - "Satisfacción" → 98% (animación de 0 a 98)
- Iconos Font Awesome para cada métrica
- Animación trigger con IntersectionObserver

#### Sección Cómo Funciona (#como-funciona)
- Título: "¿Cómo funciona TuCitaSegura?"
- 4 pasos en horizontal (desktop) con líneas conectores:
  1. **Regístrate** - Crea tu cuenta en segundos
  2. **Elige tu servicio** - Selecciona el tipo de cita que necesitas
  3. **Elige fecha y hora** - Disponibilidad en tiempo real
  4. **Confirma y recibe recordatorios** - Notificaciones automáticas
- Cada paso: icono circular numerado, título, descripción
- Layout vertical en móvil
- Animación de entrada escalonada

#### Sección Testimonios (#testimonios)
- Título: "Lo que dicen nuestros usuarios"
- 3-4 tarjetas de testimonios con:
  - Avatar/foto (o iniciales en círculo)
  - Nombre y rol (ej: "María González, Clínica Dental")
  - Texto del testimonio (2-3 frases)
  - Badge de verificación ✓
  - Rating con estrellas (4-5 estrellas)
- Efecto hover: levitación y sombra aumentada
- Animación de entrada al hacer scroll

#### Sección Comparativa (#comparativa)
- Título: "TuCitaSegura vs Otras Soluciones"
- Tabla comparativa glassmorphism con:
  - Filas: Recordatorios automáticos, Panel online, Soporte en español, Seguridad de datos, Sin costos ocultos, Integración fácil
  - Columnas: TuCitaSegura (✓ verde) vs Otros (✗ rojo o vacío)
- Destacar columna de TuCitaSegura con borde azul

#### Sección Precios
- **Membresía Premium**: €30/mes (+IVA)
  - Chat ilimitado
  - Envío de solicitudes
  - Filtros avanzados
  - Ver quién visitó tu perfil
  - **Mujeres: GRATIS para siempre**
- **Seguro Anti-Plantón**: €120/cita
  - 100% reembolsable si la cita es correcta
  - Penalización para quien falta
  - Sistema de reputación mejorado
  - Soporte prioritario

#### Sección Verificación
- "100% Usuarios Verificados y Reales"
- 3 tarjetas: Verificación de Email, Verificación de Identidad, Sistema de Reputación
- Badges: Perfiles Verificados, Cero Tolerancia a Fakes, Datos Protegidos

#### Footer
- 4 columnas: Brand, Legal, Compañía, Social
- Enlaces: Privacidad, Términos, Cookies, Ayuda, Contacto, Seguridad, Blog
- Redes sociales: Facebook, Instagram, Twitter
- Copyright: "© 2024 TuCitaSegura. Todos los derechos reservados."

### Animaciones
- **Scroll Reveal**: IntersectionObserver para fade-in/slide-up
- **Partículas**: Canvas con movimiento suave
- **Typing Effect**: JavaScript vanilla con loop infinito
- **Contadores**: Incremento gradual desde 0 hasta objetivo
- **Hover Effects**: Transform y sombras en tarjetas

---

## 2. SISTEMA DE AUTENTICACIÓN

### Página de Registro (register.html)
- Formulario con validación en tiempo real:
  - Email (validación de formato)
  - Contraseña (mínimo 8 caracteres, mayúscula, número)
  - Confirmar contraseña
  - Aceptar términos y condiciones (checkbox obligatorio)
  - reCAPTCHA Enterprise
- Diseño glassmorphism
- Mensajes de error claros
- Integración con Firebase Auth
- Redirección a verificación de email

### Página de Login (login.html)
- Formulario: Email y Contraseña
- Botón "¿Olvidaste tu contraseña?" (recuperación)
- Opción "Recordarme"
- Validación de email verificado
- Redirección según estado:
  - Email no verificado → verify-email.html
  - Perfil incompleto → perfil.html
  - Perfil completo → dashboard.html

### Verificación de Email (verify-email.html)
- Instrucciones claras
- Botón "Reenviar email de verificación"
- Detección automática cuando el usuario verifica
- Redirección automática a perfil.html

### Auth Guard (auth-guard.js)
- Protección de rutas privadas
- Verificación de sesión activa
- Redirección a login si no autenticado
- Manejo de tokens y refresh

---

## 3. PERFIL DE USUARIO (perfil.html)

### Información Básica
- **Avatar**: Upload con preview (mínimo 1, máximo 1 principal)
- **Galería**: 5 fotos adicionales (mínimo 2 requeridas, máximo 5)
- **Alias**: Nombre público (único, validación)
- **Edad**: Calculada desde fecha de nacimiento (18+)
- **Género**: Hombre/Mujer (obligatorio)
- **Municipio**: Selector con Google Maps autocomplete
- **Profesión**: Campo obligatorio con autocomplete

### Autodescripción
- Textarea con contador de palabras (mínimo 120 palabras)
- Validación en tiempo real
- Preview de cómo se verá

### Estado Civil
- Selector con opciones personalizadas:
  - "Felizmente Separado o Divorciado"
  - "Casado y Golfo"
  - "Viudo"
  - "Libre como un Pájaro"
  - "Prefiero No Contestar"
  - "Builder"

### Preferencias de Búsqueda
- Rango de edad (min/max)
- Distancia máxima (km)
- Solo género opuesto (enforced en backend)

### Personalización
- 6 temas de color para el perfil
- Guardado automático con debounce

### Validación
- Profile Guard: verifica que el perfil esté completo antes de acceder a otras páginas
- Indicadores visuales de campos obligatorios

---

## 4. DASHBOARD (dashboard.html)

### Vista Principal
- Saludo personalizado con alias
- Avatar clickeable (redirige a perfil)
- Estadísticas rápidas:
  - Matches pendientes
  - Mensajes no leídos
  - Citas próximas
  - Favoritos

### Tarjetas de Acceso Rápido
- "Buscar Usuarios" (glassmorphism, hover effect)
- "Mis Conversaciones"
- "Mis Citas"
- "Favoritos"
- "Mi Membresía"
- "Verificación de Identidad"

### Notificaciones
- Badge con contador
- Lista de notificaciones recientes
- Marcar como leído

### Actividad Reciente
- Últimos matches
- Últimos mensajes
- Próximas citas (próximas 7 días)

---

## 5. BÚSQUEDA DE USUARIOS (buscar-usuarios.html)

### Filtros Avanzados
- Rango de edad (slider)
- Distancia (km, con geolocalización)
- Reputación (Bronce/Plata/Oro/Platino)
- Verificación de identidad (checkbox)
- Solo usuarios online (checkbox)

### Vista de Resultados
- **Modo Grid**: Tarjetas glassmorphism con:
  - Foto principal
  - Alias y edad
  - Badge de reputación
  - Indicador de verificación
  - Botón "Ver Perfil"
- **Modo Mapa**: Google Maps con marcadores
  - Click en marcador muestra preview
  - Filtro de distancia visual

### Sistema de Matching
- Motor de recomendaciones híbrido:
  - Filtrado colaborativo (40%)
  - Filtrado basado en contenido (30%)
  - Proximidad geográfica (20%)
  - Patrones de comportamiento (10%)
- Score de compatibilidad visible
- Predicción de éxito de match

### Reglas de Búsqueda
- Solo género opuesto (enforced backend)
- Solo usuarios con perfil completo
- Solo usuarios verificados (opcional en filtros)

---

## 6. SISTEMA DE CHAT (chat.html, conversaciones.html)

### Lista de Conversaciones (conversaciones.html)
- Lista de chats activos
- Preview del último mensaje
- Contador de no leídos
- Indicador de "escribiendo..."
- Timestamp del último mensaje
- Badge de verificación del usuario
- Ordenado por actividad reciente

### Chat Individual (chat.html)
- Header con foto, alias y estado online
- Botón "Ver Perfil"
- Botón "Video Llamada" (si ambos tienen membresía premium)
- Área de mensajes con scroll automático
- Input de texto con:
  - Emojis picker
  - Botón "Enviar Propuesta de Cita"
  - Botón "Enviar"
- Indicador "escribiendo..."
- Timestamps relativos
- Mensajes propios a la derecha, ajenos a la izquierda

### Propuestas de Cita
- Modal con formulario:
  - Fecha (calendario)
  - Hora (selector)
  - Lugar (Google Maps autocomplete)
  - Mensaje opcional
- Envío como mensaje estructurado
- Notificación push al destinatario
- Botones: Aceptar/Rechazar/Modificar

### Tiempo Real
- Firestore listeners para mensajes
- Actualización automática
- Indicadores de lectura

---

## 7. VIDEO CHAT (video-chat.html)

### Funcionalidades WebRTC
- Video llamadas 1-a-1 P2P
- Audio bidireccional con cancelación de eco
- Compartir pantalla
- Controles: mute audio, toggle video, colgar
- Señalización via Firestore (sin servidor adicional)
- STUN servers: Google, Mozilla, Twilio
- Reconexión automática

### Interfaz
- Video local (espejo) pequeño, video remoto grande
- Botones de control flotantes
- Indicador de conexión
- Modal de llamada entrante (aceptar/rechazar)
- Historial de llamadas guardado

### Requisitos
- Solo disponible para usuarios con membresía premium
- Verificación de permisos de cámara/micrófono

---

## 8. SISTEMA DE CITAS (citas.html, cita-detalle.html)

### Lista de Citas (citas.html)
- Pestañas: Próximas, Pasadas, Pendientes
- Tarjetas con:
  - Foto del otro usuario
  - Fecha y hora
  - Lugar
  - Estado (Confirmada, Pendiente, Cancelada)
  - Botón "Ver Detalles"

### Detalle de Cita (cita-detalle.html)
- Información completa:
  - Usuario con quien es la cita
  - Fecha, hora, lugar (mapa)
  - Estado y acciones disponibles
- **Código QR** para validación:
  - Generación única por cita
  - Escaneo para confirmar asistencia
  - Validación de ambos usuarios
- Botones según estado:
  - Confirmar
  - Modificar
  - Cancelar
  - Reportar problema

### Calendario
- Vista mensual con citas marcadas
- Click en fecha muestra citas del día
- Integración con disponibilidad

### Notificaciones
- Recordatorio 24h antes
- Recordatorio 1h antes
- Notificación cuando se confirma/modifica

---

## 9. SISTEMA DE PAGOS Y SUSCRIPCIONES

### Membresía Premium (membresia.html, suscripcion.html)
- Plan: €29.99/mes (+IVA)
- **Mujeres: GRATIS para siempre** (detectado por género)
- Integración Stripe para suscripciones
- Integración PayPal como alternativa
- Página de checkout
- Gestión de suscripción activa
- Cancelación (puede cancelar cuando quiera)
- Renovación automática

### Seguro Anti-Plantón (seguro.html)
- Precio: €120 por cita
- 100% reembolsable si la cita es correcta
- Penalización para quien falta sin avisar
- Requiere membresía premium activa
- Pago único por cita
- Proceso de reembolso automático

### Cuenta y Pagos (cuenta-pagos.html)
- Historial de transacciones
- Métodos de pago guardados
- Facturas descargables
- Estado de suscripción
- Renovar/Cancelar suscripción

---

## 10. SISTEMA DE VERIFICACIÓN Y REPUTACIÓN

### Verificación de Identidad (verificacion-identidad.html)
- Upload de documento de identidad (DNI/Pasaporte)
- Selfie con documento
- Validación manual por admin (estado: Pendiente/Aprobado/Rechazado)
- Badge de verificación en perfil cuando aprobado
- Notificación cuando se aprueba/rechaza

### Sistema de Reputación (trust-system.js, badges-system.js)
- **Niveles**: Bronce, Plata, Oro, Platino
- **Factores**:
  - Comportamiento en citas
  - Feedback de otros usuarios
  - Tiempo en la plataforma
  - Verificaciones completadas
  - Historial de pagos
- Badge visible en perfil y búsquedas
- Beneficios por nivel (más visibilidad, etc.)

### Sistema de Logros (logros.html)
- Badges desbloqueables
- Progreso visible
- Recompensas por logros

---

## 11. EVENTOS VIP Y CONCIERGE

### Eventos VIP (eventos-vip.html, evento-detalle.html)
- Lista de eventos exclusivos
- Filtros: Fecha, Ubicación, Tipo
- Tarjetas con:
  - Imagen del evento
  - Fecha y hora
  - Ubicación
  - Precio
  - Cupos disponibles
- Detalle de evento:
  - Descripción completa
  - Lista de asistentes
  - Botón "Reservar" (solo miembros VIP)

### Concierge Dashboard (concierge-dashboard.html)
- Panel para rol Concierge (€199/mes)
- Gestión de eventos VIP
- Lista de miembros VIP
- Estadísticas de eventos
- Crear/editar eventos

---

## 12. SISTEMA DE REFERIDOS (referidos.html)

### Funcionalidad
- Código de referido único por usuario
- Compartir enlace/código
- Dashboard con:
  - Número de referidos
  - Estado de cada referido (registrado, verificado, premium)
  - Recompensas ganadas
- Sistema de recompensas (ej: 1 mes gratis por 3 referidos premium)

---

## 13. FAVORITOS (favoritos.html)

### Lista de Favoritos
- Grid de usuarios favoritos
- Tarjetas con foto, alias, badge de reputación
- Botón "Eliminar de favoritos"
- Botón "Enviar mensaje"
- Filtros: Ordenar por fecha agregado, reputación, etc.

---

## 14. REPORTES Y SEGURIDAD (reportes.html, seguridad.html)

### Reportes
- Formulario para reportar usuario
- Razones: Perfil falso, Comportamiento inapropiado, Spam, Otro
- Descripción del problema
- Evidencia (capturas, etc.)
- Procesamiento por admin

### Consejos de Seguridad (seguridad.html)
- Guía completa de seguridad
- Qué hacer y qué no hacer
- Cómo identificar perfiles falsos
- Contacto de emergencia

---

## 15. ADMINISTRACIÓN (admin.html, admin-login.html)

### Admin Dashboard
- Panel de control completo
- Estadísticas generales:
  - Usuarios totales, activos, premium
  - Citas totales, confirmadas
  - Ingresos
- Gestión de usuarios:
  - Lista con filtros
  - Ver/editar perfil
  - Banear/desbanear
  - Otorgar/quitar roles
- Gestión de verificaciones:
  - Lista de solicitudes pendientes
  - Aprobar/rechazar con motivo
- Gestión de reportes:
  - Lista de reportes
  - Acciones: Advertir, Banear, Ignorar
- Gestión de eventos VIP
- Logs de seguridad

### Custom Claims
- Roles: admin, concierge, user
- Permisos basados en roles
- Firestore rules que respetan claims

---

## 16. PÁGINAS LEGALES Y SOPORTE

### Privacidad (privacidad.html)
- Política de Privacidad completa en español (España)
- Secciones: Recopilación de datos, Uso de cookies, Derechos del usuario (RGPD), Seguridad, Contacto
- Diseño glassmorphism consistente

### Términos (terminos.html)
- Términos y Condiciones en español (España)
- Secciones: Aceptación de términos, Conducta del usuario, Responsabilidad, Cancelación, Modificaciones
- Diseño glassmorphism consistente

### Cookies (cookies.html)
- Política de Cookies
- Gestión de preferencias
- Banner de consentimiento

### Contacto (contacto.html)
- Formulario de contacto (solo visual, muestra mensaje de confirmación)
- Campos: Nombre, Email, Asunto, Mensaje
- Sección FAQ (3-4 preguntas comunes)
- Canales de soporte: Email, Teléfono genérico

### Ayuda (ayuda.html)
- Central de ayuda
- Categorías: Cuenta, Pagos, Seguridad, Citas, Técnico
- Búsqueda de artículos
- Formulario de contacto

---

## 17. PROGRESSIVE WEB APP (PWA)

### Manifest.json
- Nombre: "TuCitaSegura"
- Short name: "TuCita"
- Iconos: 192x192, 512x512
- Theme color: #0f172a
- Background color: #1e293b
- Display: standalone
- Start URL: /
- Orientación: portrait

### Service Worker (sw.js)
- Cache strategy: Network First, fallback Cache
- Offline support
- Actualización automática
- Notificaciones push

### Funcionalidades PWA
- Instalable en móvil/desktop
- Funciona offline (modo limitado)
- Notificaciones push
- Actualización en segundo plano

---

## 18. INTERNACIONALIZACIÓN (i18n)

### Idiomas Soportados
- Español (ES) - por defecto
- Inglés (EN)
- Portugués (PT)
- Francés (FR)
- Alemán (DE)

### Implementación
- Sistema i18n.js modular
- Archivos JSON por idioma en `webapp/i18n/locales/`
- Selector de idioma en header
- Persistencia de preferencia
- Traducción de toda la UI

---

## 19. SEGURIDAD Y VALIDACIONES

### Firestore Rules
- Validación de edad (18+)
- Verificación de email obligatoria
- Filtrado por género (solo opuesto)
- Control de acceso basado en roles
- Validación de datos en escritura
- Reglas robustas (22k+ líneas)

### Storage Rules
- Solo usuarios autenticados pueden subir
- Validación de tipo de archivo (imágenes)
- Límite de tamaño (5MB por imagen)
- Validación de dimensiones
- Paths seguros por usuario

### App Check
- Protección contra bots
- Validación de requests
- Rate limiting

### Validaciones Frontend
- Input validator (email, contraseña, etc.)
- Sanitización con DOMPurify
- Rate limiting en acciones críticas
- Security logger para eventos sospechosos

---

## 20. OPTIMIZACIONES Y PERFORMANCE

### Lazy Loading
- Imágenes con loading="lazy"
- Carga diferida de módulos JS
- IntersectionObserver para contenido below-fold

### Image Optimization
- Compresión automática
- Formatos WebP cuando soportado
- Thumbnails para galerías
- CDN para assets estáticos

### Network Optimization
- Service Worker caching
- Prefetch de recursos críticos
- Compresión de assets
- Minificación de CSS/JS

### Error Handling
- Error handler global
- Network error handler (retry automático)
- Mensajes de error user-friendly
- Logging de errores a Firebase

---

## 21. ANIMACIONES Y UX

### Animaciones CSS
- Transiciones suaves (0.3s ease)
- Hover effects en tarjetas
- Loading spinners
- Skeleton screens
- Fade in/out
- Slide animations

### Microinteracciones
- Feedback visual en clicks
- Animaciones de éxito/error
- Progress indicators
- Toast notifications

### Responsive Design
- Mobile-first approach
- Breakpoints: 375px, 768px, 1024px, 1920px
- Touch optimizations
- Menú hamburguesa en móvil
- Grid adaptativo

---

## 22. INTEGRACIONES Y APIS

### Google Maps
- Autocomplete para direcciones
- Geolocalización
- Mapas en búsqueda y citas
- Marcadores personalizados

### Stripe
- Checkout para suscripciones
- Webhooks para eventos
- Gestión de pagos recurrentes
- Facturación automática

### PayPal
- Integración alternativa
- Creación de órdenes
- Captura de pagos
- Validación de webhooks
- Token caching

### Firebase Functions
- Endpoints API
- Webhooks de pagos
- Notificaciones push
- Procesamiento de imágenes
- Validaciones de negocio

---

## 23. TESTING Y CALIDAD

### Validaciones
- Formularios con validación en tiempo real
- Mensajes de error claros
- Indicadores visuales de estado
- Confirmaciones para acciones destructivas

### Accesibilidad
- ARIA labels
- Navegación por teclado
- Contraste de colores (WCAG AA)
- Textos alternativos en imágenes
- Skip links

### Compatibilidad
- Navegadores modernos (Chrome, Firefox, Safari, Edge)
- iOS Safari
- Android Chrome
- PWA en todos los dispositivos

---

## 24. CONFIGURACIÓN Y DEPLOYMENT

### Firebase Config
- Proyecto: tuscitasseguras-2d1a6
- Configuración en firebase-config-env.js
- Variables de entorno para API keys

### Build Process
- TailwindCSS compilation
- Vite para desarrollo
- Minificación de producción
- Optimización de assets

### Deployment
- Firebase Hosting
- Cloud Functions deployment
- Firestore Rules deployment
- Storage Rules deployment

---

## 25. INSTRUCCIONES DE IMPLEMENTACIÓN

1. **Crear estructura de archivos** completa según el árbol de directorios
2. **Implementar landing page** con todas las secciones y animaciones
3. **Sistema de autenticación** completo (register, login, verify)
4. **Perfil de usuario** con todas las validaciones
5. **Dashboard** con estadísticas y acceso rápido
6. **Búsqueda y matching** con filtros avanzados
7. **Sistema de chat** en tiempo real
8. **Video chat** WebRTC
9. **Sistema de citas** con QR codes
10. **Pagos y suscripciones** (Stripe + PayPal)
11. **Verificación y reputación**
12. **Eventos VIP y Concierge**
13. **Sistema de referidos**
14. **Favoritos y reportes**
15. **Admin panel** completo
16. **Páginas legales** (privacidad, términos, cookies, contacto)
17. **PWA** con Service Worker
18. **i18n** multiidioma
19. **Seguridad** y validaciones
20. **Optimizaciones** de performance

---

## SIGUIENTE PASO INMEDIATO: Implementación del Registro

Para conectar la Landing con el backend y comenzar el flujo de usuario, el siguiente paso crítico es:

### Implementar `webapp/register.html` y `webapp/js/register.js`

#### Funcionalidades Requeridas:

1. **Formulario de Registro**:
   - Campo Email (validación de formato en tiempo real)
   - Campo Contraseña (mínimo 8 caracteres, al menos 1 mayúscula, 1 número)
   - Campo Confirmar Contraseña (debe coincidir)
   - Checkbox "Acepto los Términos y Condiciones" (obligatorio)
   - Checkbox "Acepto la Política de Privacidad" (obligatorio)
   - reCAPTCHA Enterprise (protección anti-bot)

2. **Validación de Edad**:
   - Campo Fecha de Nacimiento (selector de fecha)
   - Validación inmediata: debe ser mayor de 18 años
   - Mensaje de error claro si es menor de edad
   - Cálculo automático de edad desde fecha de nacimiento

3. **Integración Firebase Auth**:
   - Crear usuario con `createUserWithEmailAndPassword()`
   - Enviar email de verificación automáticamente
   - Manejo de errores (email ya existe, contraseña débil, etc.)

4. **Crear Documento en Firestore**:
   - Después de registro exitoso, crear documento en colección `users`
   - Estructura inicial:
     ```javascript
     {
       basicInfo: {
         birthDate: Timestamp, // Desde el formulario
         // Otros campos se completarán en perfil.html
       },
       preferences: {
         // Valores por defecto
       },
       membership: {
         type: "free"
       },
       verification: {
         email: false // Se actualizará cuando verifique
       },
       stats: {
         score: 0,
         flakeCount: 0
       },
       createdAt: Timestamp,
       lastActive: Timestamp
     }
     ```

5. **Generar Código de Referido**:
   - Si viene de un link de referido (query param `?ref=CODIGO`), guardar referencia
   - Generar código único para el nuevo usuario (ej: "USER2024ABC")
   - Guardar en campo `referral.code`

6. **Redirección Post-Registro**:
   - Si registro exitoso → Redirigir a `verify-email.html`
   - Si email ya verificado (raro pero posible) → Redirigir a `perfil.html`

7. **Diseño Glassmorphism**:
   - Formulario con estilo glassmorphism consistente
   - Animaciones de entrada suave
   - Mensajes de error/éxito con toast notifications
   - Loading state durante el registro

8. **Validaciones Frontend**:
   - Email: formato válido, no vacío
   - Contraseña: mínimo 8 caracteres, mayúscula, número
   - Confirmar contraseña: debe coincidir exactamente
   - Fecha de nacimiento: mayor de 18 años
   - Términos: ambos checkboxes deben estar marcados
   - reCAPTCHA: debe estar completado

9. **Manejo de Errores**:
   - Email ya registrado → "Este email ya está en uso"
   - Contraseña débil → "La contraseña debe tener al menos 8 caracteres, una mayúscula y un número"
   - Menor de edad → "Debes ser mayor de 18 años para registrarte"
   - Error de red → "Error de conexión. Por favor intenta de nuevo"
   - reCAPTCHA no completado → "Por favor completa la verificación"

10. **Integración con reCAPTCHA Enterprise**:
    - Cargar reCAPTCHA Enterprise en el formulario
    - Obtener token antes de enviar
    - Validar token en Cloud Function (opcional, pero recomendado)
    - Manejar errores de reCAPTCHA

#### Estructura del Código:

```javascript
// webapp/js/register.js
import { auth, db } from './firebase-config-env.js';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { inputValidator } from './input-validator.js';
import { errorHandler } from './error-handler.js';

class RegisterManager {
  constructor() {
    this.init();
  }

  init() {
    this.setupForm();
    this.setupValidations();
    this.setupRecaptcha();
  }

  setupForm() {
    // Event listeners para el formulario
  }

  async handleRegister(email, password, birthDate, termsAccepted) {
    // Validaciones
    // Crear usuario en Auth
    // Crear documento en Firestore
    // Enviar email de verificación
    // Redirigir
  }

  calculateAge(birthDate) {
    // Calcular edad desde fecha de nacimiento
  }

  generateReferralCode() {
    // Generar código único de referido
  }
}
```

Este paso conecta la Landing con el backend y permite que los usuarios comiencen su journey en la plataforma.

---

## NOTAS FINALES

- **Todo el contenido en español** (con soporte multiidioma)
- **Diseño glassmorphism consistente** en todas las páginas
- **Responsive mobile-first** en todos los componentes
- **Firebase como backend** principal
- **PWA completamente funcional**
- **Seguridad robusta** con validaciones múltiples
- **Performance optimizado** con lazy loading y caching
- **Código limpio y modular** con JavaScript ES6+
- **Sin frameworks** pesados (solo vanilla JS)
- **Documentación completa** en comentarios

---

## RESULTADO ESPERADO

Una **webapp completa de citas premium** con:
- ✅ Landing page impresionante con animaciones
- ✅ Sistema de autenticación robusto
- ✅ Perfiles enriquecidos
- ✅ Búsqueda y matching inteligente
- ✅ Chat y video chat en tiempo real
- ✅ Sistema de citas con QR
- ✅ Pagos y suscripciones
- ✅ Verificación y reputación
- ✅ Eventos VIP
- ✅ Admin panel
- ✅ PWA funcional
- ✅ Multiidioma
- ✅ Seguridad avanzada
- ✅ Performance optimizado

**Lista para producción** con todas las funcionalidades implementadas y probadas.


