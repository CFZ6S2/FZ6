# 🎩 Sistema Concierge - TuCitaSegura

## 📋 Resumen Ejecutivo

El **Sistema Concierge** es una nueva funcionalidad premium que permite a usuarios verificados (Concierges) publicar anuncios de **Eventos VIP** para seleccionar chicas interesadas. Este sistema crea un marketplace exclusivo donde:

- **Concierges** (rol de pago) publican eventos VIP
- **Mujeres** ven los anuncios y se postulan
- **Concierges** seleccionan a las candidatas de entre las aplicantes

---

## 👥 Roles de Usuario

### Estructura Actualizada de Roles

```javascript
// Campo en documento de usuario: userRole
userRole: "regular" | "admin" | "concierge"
```

#### 1. Regular (usuario normal)
- Hombres: pagan membresía + seguro
- Mujeres: gratis (temporalmente)
- Acceso a funcionalidades estándar

#### 2. Admin
- Acceso al panel de administración
- Gestión de usuarios y reportes
- Sin costo adicional (staff interno)

#### 3. Concierge (NUEVO - De Pago)
- **Costo:** €199/mes (suscripción exclusiva)
- Puede publicar eventos VIP
- Puede seleccionar candidatas
- Acceso a página de gestión de eventos
- Badge especial "Concierge Verificado 🎩"

---

## 💰 Modelo de Negocio Concierge

### Precios y Suscripción

```javascript
{
  plan: "concierge",
  price: 199,          // €199/mes
  currency: "EUR",
  includes: [
    "Publicación ilimitada de eventos VIP",
    "Acceso a base de datos de candidatas",
    "Sistema de selección y matching",
    "Soporte prioritario",
    "Badge verificado"
  ]
}
```

### Requisitos para ser Concierge

1. **Verificación de identidad** (KYC)
2. **Aprobación manual** por equipo de TuCitaSegura
3. **Pago mensual** de €199
4. **Aceptar términos** específicos de Concierge

---

## 🏗️ Arquitectura del Sistema

### Firestore Collections

#### Collection: `users` (actualizada)

```javascript
{
  uid: string,
  email: string,
  alias: string,
  gender: "masculino" | "femenino" | "otro",

  // NUEVO: Campo de rol
  userRole: "regular" | "admin" | "concierge",

  // NUEVO: Campos para concierge
  isConcierge: boolean,                    // Shortcut para verificación rápida
  conciergeStatus: "pending" | "approved" | "suspended",
  conciergeApprovedAt: Timestamp,
  conciergeSubscriptionId: string,         // Stripe subscription ID
  conciergeSubscriptionStatus: "active" | "canceled" | "expired",

  // Campos existentes
  hasActiveSubscription: boolean,
  hasAntiGhostingInsurance: boolean,
  // ... resto de campos
}
```

#### Collection: `vip_events` (nueva)

```javascript
{
  eventId: string,                         // Auto-generado
  conciergeId: string,                     // UID del concierge
  conciergeName: string,                   // Alias del concierge

  // Detalles del evento
  title: string,                           // "Cena VIP en Madrid"
  description: string,                     // Descripción detallada
  eventType: "dinner" | "party" | "travel" | "networking" | "other",

  // Fecha y ubicación
  eventDate: Timestamp,
  eventTime: string,                       // "20:00"
  location: {
    address: string,
    city: string,
    country: string,
    lat: number,
    lng: number
  },

  // Compensación y requisitos
  compensation: {
    amount: number,                        // Pago por asistencia
    currency: "EUR",
    type: "per_person" | "total"
  },

  spotsAvailable: number,                  // Cuántas chicas se necesitan
  spotsSelected: number,                   // Cuántas ya seleccionadas

  requirements: {
    minAge: number,
    maxAge: number,
    languages: string[],                   // ["español", "inglés"]
    dresscode: string,
    other: string
  },

  // Estado
  status: "draft" | "published" | "closed" | "completed" | "canceled",
  isActive: boolean,

  // Aplicaciones
  totalApplications: number,               // Total de aplicantes
  selectedApplicants: string[],            // Array de UIDs seleccionados

  // Metadata
  createdAt: Timestamp,
  publishedAt: Timestamp,
  updatedAt: Timestamp,
  expiresAt: Timestamp                     // Auto-cierra después del evento
}
```

#### Collection: `vip_applications` (nueva)

```javascript
{
  applicationId: string,                   // Auto-generado
  eventId: string,                         // ID del evento VIP
  userId: string,                          // UID de la chica
  userName: string,                        // Alias de la chica
  userPhoto: string,                       // URL de foto
  userAge: number,
  userCity: string,

  // Aplicación
  message: string,                         // Mensaje opcional al aplicar
  motivation: string,                      // Por qué quiere participar
  availability: boolean,                   // Confirma disponibilidad

  // Estado
  status: "pending" | "selected" | "rejected" | "withdrawn",

  // Metadata
  appliedAt: Timestamp,
  reviewedAt: Timestamp,
  selectedAt: Timestamp
}
```

---

## 📱 Páginas del Sistema

### 1. `/webapp/concierge-dashboard.html`

**Acceso:** Solo usuarios con `userRole === "concierge"`

**Funcionalidades:**
- Ver todos mis eventos publicados
- Crear nuevo evento VIP
- Editar eventos existentes
- Ver aplicantes por evento
- Estadísticas (total aplicantes, eventos activos, etc.)

**Secciones:**
```
┌─────────────────────────────────────────────┐
│ 🎩 Panel Concierge                          │
├─────────────────────────────────────────────┤
│                                             │
│ [Crear Nuevo Evento VIP] +                 │
│                                             │
│ Eventos Activos (3)                         │
│ ┌─────────────────────────────────────┐    │
│ │ Cena VIP en Madrid                  │    │
│ │ 15 aplicantes | 3/5 seleccionadas   │    │
│ │ [Ver Aplicantes] [Editar]           │    │
│ └─────────────────────────────────────┘    │
│                                             │
│ Eventos Pasados (12)                        │
│ ...                                         │
└─────────────────────────────────────────────┘
```

### 2. `/webapp/eventos-vip.html`

**Acceso:** Solo mujeres (`gender === "femenino"`)

**Funcionalidades:**
- Ver todos los eventos VIP publicados
- Filtrar por ciudad, fecha, compensación
- Ver detalles de cada evento
- Aplicar a eventos
- Ver mis aplicaciones

**Secciones:**
```
┌─────────────────────────────────────────────┐
│ 💎 Eventos VIP Exclusivos                   │
├─────────────────────────────────────────────┤
│                                             │
│ [Filtros] Ciudad | Fecha | Compensación    │
│                                             │
│ ┌─────────────────────────────────────┐    │
│ │ 🍷 Cena VIP en Madrid                │    │
│ │ Publicado por: Carlos M. 🎩          │    │
│ │ Fecha: 15 Nov 2025, 20:00            │    │
│ │ Compensación: €300/persona           │    │
│ │ Plazas: 3/5 disponibles              │    │
│ │                                      │    │
│ │ [Ver Detalles] [Aplicar] ❤️         │    │
│ └─────────────────────────────────────┘    │
│                                             │
│ [Más eventos...]                            │
└─────────────────────────────────────────────┘
```

### 3. `/webapp/evento-detalle.html?eventId=xxx`

**Acceso:**
- **Concierge propietario:** Ve aplicantes y puede seleccionar
- **Mujeres:** Ven detalles del evento y pueden aplicar

**Vista para Concierge:**
```
┌─────────────────────────────────────────────┐
│ Cena VIP en Madrid                          │
│ 15 aplicantes | 3/5 seleccionadas           │
├─────────────────────────────────────────────┤
│                                             │
│ Aplicantes Pendientes (12)                  │
│                                             │
│ ┌─────────────────────────────────────┐    │
│ │ 👤 María, 28, Madrid                 │    │
│ │ "Me encantaría asistir..."           │    │
│ │ [Ver Perfil] [Seleccionar] ✅        │    │
│ └─────────────────────────────────────┘    │
│                                             │
│ Seleccionadas (3)                           │
│ ┌─────────────────────────────────────┐    │
│ │ ✅ Laura, 26, Madrid                 │    │
│ │ [Ver Perfil] [Quitar]                │    │
│ └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

**Vista para Mujer:**
```
┌─────────────────────────────────────────────┐
│ 🍷 Cena VIP en Madrid                       │
│ Publicado por: Carlos M. 🎩                 │
├─────────────────────────────────────────────┤
│                                             │
│ 📅 Fecha: Sábado 15 Nov, 20:00             │
│ 📍 Restaurante Botín, Madrid               │
│ 💰 Compensación: €300/persona              │
│ 👥 Plazas: 3/5 disponibles                 │
│                                             │
│ Descripción:                                │
│ "Cena elegante en el restaurante más..."   │
│                                             │
│ Requisitos:                                 │
│ • Edad: 25-35 años                         │
│ • Idiomas: Español, Inglés                 │
│ • Dresscode: Elegante                      │
│                                             │
│ [Aplicar a este Evento] ❤️                 │
└─────────────────────────────────────────────┘
```

---

## 🔐 Reglas de Seguridad y Validación

### Validaciones en Frontend

```javascript
// Verificar si usuario es concierge
function isConcierge(userData) {
  return userData.userRole === 'concierge' &&
         userData.conciergeStatus === 'approved' &&
         userData.conciergeSubscriptionStatus === 'active';
}

// Verificar si mujer puede ver eventos VIP
function canAccessVIPEvents(userData) {
  return userData.gender === 'femenino';
}

// Verificar si puede aplicar a evento
function canApplyToEvent(userData, event) {
  // Solo mujeres
  if (userData.gender !== 'femenino') return false;

  // Evento debe estar publicado
  if (event.status !== 'published') return false;

  // Debe haber plazas disponibles
  if (event.spotsSelected >= event.spotsAvailable) return false;

  // Verificar edad
  const userAge = calculateAge(userData.birthDate);
  if (userAge < event.requirements.minAge || userAge > event.requirements.maxAge) {
    return false;
  }

  return true;
}
```

### Firestore Security Rules

```javascript
// rules/firestore.rules

// VIP Events Collection
match /vip_events/{eventId} {
  // Cualquier mujer autenticada puede leer eventos publicados
  allow read: if request.auth != null &&
                 request.resource.data.status == 'published';

  // Solo concierges pueden crear eventos
  allow create: if request.auth != null &&
                   get(/databases/$(database)/documents/users/$(request.auth.uid)).data.userRole == 'concierge' &&
                   get(/databases/$(database)/documents/users/$(request.auth.uid)).data.conciergeStatus == 'approved';

  // Solo el concierge propietario puede actualizar/eliminar
  allow update, delete: if request.auth != null &&
                            resource.data.conciergeId == request.auth.uid;
}

// VIP Applications Collection
match /vip_applications/{applicationId} {
  // Concierge puede leer aplicaciones de sus eventos
  allow read: if request.auth != null &&
                 (resource.data.userId == request.auth.uid ||
                  get(/databases/$(database)/documents/vip_events/$(resource.data.eventId)).data.conciergeId == request.auth.uid);

  // Solo mujeres pueden crear aplicaciones
  allow create: if request.auth != null &&
                   get(/databases/$(database)/documents/users/$(request.auth.uid)).data.gender == 'femenino';

  // Solo la aplicante puede retirar su aplicación
  allow update: if request.auth != null &&
                   (resource.data.userId == request.auth.uid ||
                    get(/databases/$(database)/documents/vip_events/$(resource.data.eventId)).data.conciergeId == request.auth.uid);
}
```

---

## 🎯 Flujos de Usuario

### Flujo 1: Concierge Publica Evento

```
1. Concierge inicia sesión
2. Navega a /webapp/concierge-dashboard.html
3. Click "Crear Nuevo Evento VIP"
4. Completa formulario:
   - Título del evento
   - Descripción
   - Fecha y hora
   - Ubicación
   - Compensación
   - Requisitos (edad, idiomas, etc.)
   - Plazas disponibles
5. Click "Publicar Evento"
6. Sistema crea documento en vip_events
7. Evento aparece en eventos-vip.html para mujeres
8. Concierge recibe notificación cuando alguien aplica
```

### Flujo 2: Mujer Aplica a Evento

```
1. Mujer inicia sesión
2. Ve botón "Eventos VIP 💎" en página de búsqueda
3. Click en botón → va a /webapp/eventos-vip.html
4. Ve lista de eventos VIP disponibles
5. Click en "Ver Detalles" de un evento
6. Lee descripción, requisitos, compensación
7. Click "Aplicar a este Evento"
8. Modal: "¿Por qué quieres participar?"
9. Escribe mensaje opcional
10. Click "Enviar Aplicación"
11. Sistema crea documento en vip_applications
12. Concierge recibe notificación
13. Mujer ve "Aplicación enviada ✅" en su perfil
```

### Flujo 3: Concierge Selecciona Candidatas

```
1. Concierge recibe notificación de nueva aplicación
2. Navega a concierge-dashboard.html
3. Click en evento con aplicantes
4. Ve lista de todas las aplicantes:
   - Foto de perfil
   - Nombre, edad, ciudad
   - Mensaje de aplicación
5. Click "Ver Perfil" para ver perfil completo
6. Click "Seleccionar ✅" en candidatas elegidas
7. Sistema actualiza vip_applications (status: 'selected')
8. Sistema incrementa spotsSelected en vip_events
9. Candidata seleccionada recibe notificación
10. Si spotsSelected == spotsAvailable:
    - Evento se marca como 'closed'
    - No acepta más aplicaciones
```

---

## 🚀 Implementación Técnica

### Paso 1: Actualizar BUSINESS_RULES.md

Agregar sección de Concierge con precios y reglas.

### Paso 2: Crear Páginas

1. `webapp/concierge-dashboard.html`
2. `webapp/eventos-vip.html`
3. `webapp/evento-detalle.html`

### Paso 3: Actualizar Navegación

Agregar en `buscar-usuarios.html` (solo para mujeres):

```html
<a href="/webapp/eventos-vip.html"
   id="vipEventsBtn"
   class="hidden gradient-button px-6 py-3 rounded-lg">
  <i class="fas fa-gem mr-2"></i>
  Eventos VIP
</a>
```

```javascript
// Mostrar botón solo para mujeres
if (currentUserData.gender === 'femenino') {
  document.getElementById('vipEventsBtn').classList.remove('hidden');
}
```

### Paso 4: Firestore Indexes

Crear índices compuestos:

```
Collection: vip_events
- status ASC, eventDate ASC
- status ASC, location.city ASC, eventDate ASC

Collection: vip_applications
- eventId ASC, status ASC, appliedAt DESC
- userId ASC, status ASC, appliedAt DESC
```

---

## 📊 Métricas y Analytics

### KPIs del Sistema Concierge

```javascript
// 1. Concierges Activos
const activeConcierges = (conciergesWithActiveSubscription / totalConcierges) * 100;

// 2. Eventos Publicados por Mes
const eventsPerMonth = totalEventsPublished / monthsActive;

// 3. Tasa de Aplicación
const applicationRate = totalApplications / totalEventsPublished;

// 4. Tasa de Selección
const selectionRate = totalSelected / totalApplications;

// 5. Revenue Concierge
const conciergeRevenue = activeConcierges * 199; // €199/mes por concierge
```

### Eventos de Analytics

```javascript
// Evento: Concierge publica evento
analytics.logEvent('concierge_event_published', {
  concierge_id: uid,
  event_type: 'dinner',
  compensation: 300,
  spots: 5
});

// Evento: Mujer aplica a evento
analytics.logEvent('vip_event_application', {
  user_id: uid,
  event_id: eventId,
  user_age: 28
});

// Evento: Concierge selecciona candidata
analytics.logEvent('applicant_selected', {
  concierge_id: uid,
  event_id: eventId,
  applicant_id: applicantUid
});
```

---

## 💡 Consideraciones de Seguridad

### 1. Verificación de Concierges

- **KYC obligatorio** antes de aprobar cuenta
- **Revisión manual** de cada solicitud de concierge
- **Monitoreo** de comportamiento sospechoso
- **Sistema de reportes** para usuarias

### 2. Protección de Usuarias

- **Reportar concierge** si comportamiento inapropiado
- **Suspensión automática** si múltiples reportes
- **Verificación de eventos** (ubicaciones reales, compensación razonable)
- **Chat interno** para coordinación (no compartir teléfonos hasta selección)

### 3. Moderación de Contenido

- **Filtro de palabras** inapropiadas en descripciones
- **Revisión manual** de eventos con compensación > €1000
- **Límite de eventos** por concierge (máx. 10 activos simultáneamente)

---

## 🎨 Diseño UI/UX

### Badges y Distintivos

#### Badge Concierge
```html
<span class="bg-gradient-to-r from-amber-500 to-yellow-600 px-3 py-1 rounded-full text-white text-xs font-bold">
  🎩 Concierge Verificado
</span>
```

#### Badge Evento VIP
```html
<span class="bg-gradient-to-r from-purple-600 to-pink-600 px-3 py-1 rounded-full text-white text-xs font-bold">
  💎 Evento VIP
</span>
```

---

## 📋 Checklist de Implementación

### Fase 1: Backend y Estructura ✅
- [x] Diseñar esquema de Firestore
- [x] Documentar en CONCIERGE_SYSTEM.md
- [ ] Actualizar BUSINESS_RULES.md
- [ ] Crear índices en Firestore

### Fase 2: Páginas Frontend
- [ ] Crear concierge-dashboard.html
- [ ] Crear eventos-vip.html
- [ ] Crear evento-detalle.html
- [ ] Agregar botón en buscar-usuarios.html

### Fase 3: Funcionalidad
- [ ] Sistema de publicación de eventos
- [ ] Sistema de aplicaciones
- [ ] Sistema de selección
- [ ] Notificaciones

### Fase 4: Pagos
- [ ] Integrar suscripción Concierge (€199/mes)
- [ ] Verificación de estado de pago
- [ ] Webhooks de Stripe

### Fase 5: Seguridad
- [ ] Firestore Security Rules
- [ ] Verificación KYC para concierges
- [ ] Sistema de reportes
- [ ] Moderación de contenido

---

## 🎯 Conclusión

El **Sistema Concierge** añade una capa premium de monetización a TuCitaSegura, creando un marketplace exclusivo para eventos VIP. Este sistema:

✅ **Genera revenue adicional** (€199/mes por concierge)
✅ **Añade valor** para usuarias (oportunidades VIP)
✅ **Diferencia la plataforma** de competidores
✅ **Crea exclusividad** y prestigio
✅ **Escalable** y fácil de moderar

**Próximos Pasos:** Implementar páginas frontend y sistema de aplicaciones.
