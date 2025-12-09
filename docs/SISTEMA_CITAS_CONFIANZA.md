# 📋 Sistema de Citas y Niveles de Confianza

## 🎯 Resumen

Se han implementado dos sistemas principales:

### 1. **Sistema de Disponibilidad de Citas para Mujeres** (3 estados)
- 🟢 **Verde**: Cita inmediata
- 🟡 **Amarillo**: Cita planeada
- 🔴 **Rojo**: No acepta citas

### 2. **Sistema de Niveles de Confianza para Hombres** (4 niveles)
- 🥇 **ORO**: Nivel inicial (todos empiezan aquí)
- 🥈 **PLATA**: Después de 1 cita fallida
- 🥉 **BRONCE**: Después de 2 citas fallidas
- 🚫 **NEGRO**: Baneado (desde BRONCE si siguen fallando)

**Bonus**: 3 citas satisfactorias consecutivas = Permiso para carnet de conductor

---

## 📁 Archivos Creados

### `webapp/js/constants.js` (Actualizado)
- `TRUST_LEVELS`: Niveles de confianza
- `TRUST_LEVEL_CONFIG`: Configuración visual de cada nivel
- `TRUST_LEVEL_RULES`: Reglas de actualización
- `APPOINTMENT_AVAILABILITY`: Estados de disponibilidad

### `webapp/js/trust-system.js` (Nuevo)
Sistema completo de gestión de niveles de confianza:
- `getTrustLevel(userId)` - Obtener nivel actual
- `getAppointmentStats(userId)` - Estadísticas de citas
- `handleFailedAppointment(userId, appointmentId)` - Procesar cita fallida
- `handleSuccessfulAppointment(userId, appointmentId)` - Procesar cita exitosa
- `hasDrivingLicensePermission(userId)` - Verificar permiso de carnet
- `initializeTrustLevel(userId, gender)` - Inicializar nivel (solo hombres)

### `webapp/js/appointment-availability.js` (Nuevo)
Sistema de disponibilidad de citas:
- `getAvailabilityStatus(userId)` - Obtener estado actual
- `updateAvailabilityStatus(userId, availability, gender)` - Actualizar estado
- `getAvailabilityConfig(status)` - Configuración visual
- `isAcceptingAppointments(userId)` - Verificar si acepta citas

---

## 🔧 Integración Pendiente

### 1. Agregar Selector en `perfil.html` (Para mujeres)

**Agregar en la sección de "Preferencias" o crear nueva sección:**

```html
<!-- Disponibilidad de Citas (Solo para mujeres) -->
<div id="appointmentAvailabilitySection" class="glass-strong rounded-2xl p-8 mb-6 hidden">
  <h3 class="text-2xl font-bold mb-6 flex items-center gap-3">
    <i class="fas fa-calendar-check text-pink-400"></i>
    Disponibilidad de Citas
  </h3>
  
  <div class="space-y-4">
    <label class="label">
      <i class="fas fa-info-circle text-pink-400 mr-2"></i>
      ¿Cómo quieres mostrar tu disponibilidad?
    </label>
    
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <!-- Verde - Inmediata -->
      <button type="button" 
              id="availabilityImmediate"
              class="availability-option bg-green-500 hover:bg-green-600 text-white p-4 rounded-xl border-2 border-transparent hover:border-green-300 transition"
              data-status="immediate">
        <div class="text-2xl mb-2">🟢</div>
        <div class="font-bold">Cita Inmediata</div>
        <div class="text-sm opacity-90">Disponible ahora</div>
      </button>
      
      <!-- Amarillo - Planeada -->
      <button type="button" 
              id="availabilityPlanned"
              class="availability-option bg-yellow-500 hover:bg-yellow-600 text-white p-4 rounded-xl border-2 border-transparent hover:border-yellow-300 transition"
              data-status="planned">
        <div class="text-2xl mb-2">🟡</div>
        <div class="font-bold">Cita Planeada</div>
        <div class="text-sm opacity-90">Con planificación</div>
      </button>
      
      <!-- Rojo - No acepta -->
      <button type="button" 
              id="availabilityNotAccepting"
              class="availability-option bg-red-500 hover:bg-red-600 text-white p-4 rounded-xl border-2 border-transparent hover:border-red-300 transition"
              data-status="not_accepting">
        <div class="text-2xl mb-2">🔴</div>
        <div class="font-bold">No Acepta Citas</div>
        <div class="text-sm opacity-90">No disponible</div>
      </button>
    </div>
  </div>
</div>
```

**En el JavaScript de perfil.html, agregar:**

```javascript
import { updateAvailabilityStatus, getAvailabilityStatus, getAvailabilityConfig } from './js/appointment-availability.js';
import { GENDERS } from './js/constants.js';

// En loadUserProfile(), después de cargar gender:
if (currentUserData?.gender === GENDERS.FEMALE) {
  document.getElementById('appointmentAvailabilitySection').classList.remove('hidden');
  const currentAvailability = await getAvailabilityStatus(currentUser.uid);
  selectAvailabilityOption(currentAvailability);
}

// Seleccionar opción visual
function selectAvailabilityOption(status) {
  document.querySelectorAll('.availability-option').forEach(btn => {
    btn.classList.remove('border-white', 'ring-4', 'ring-opacity-50');
    if (btn.dataset.status === status) {
      btn.classList.add('border-white', 'ring-4', 'ring-opacity-50');
    }
  });
}

// Event listeners para botones de disponibilidad
document.querySelectorAll('.availability-option').forEach(btn => {
  btn.addEventListener('click', async () => {
    const status = btn.dataset.status;
    const result = await updateAvailabilityStatus(
      currentUser.uid, 
      status, 
      currentUserData.gender
    );
    
    if (result.success) {
      selectAvailabilityOption(status);
      showToast(`Disponibilidad actualizada: ${result.config.label}`, 'success');
    } else {
      showToast('Error actualizando disponibilidad', 'error');
    }
  });
});
```

### 2. Actualizar `cita-detalle.html` para usar sistema de confianza

**Cuando se valida una cita exitosamente (línea ~790):**

```javascript
import { handleSuccessfulAppointment, handleFailedAppointment } from './js/trust-system.js';
import { GENDERS } from './js/constants.js';

// En la función de validación exitosa:
const conversationDoc = await getDoc(conversationRef);
const conversationData = conversationDoc.data();
const otherUserId = conversationData.members.find(id => id !== currentUser.uid);

// Si el otro usuario es hombre, actualizar su nivel de confianza
const otherUserDoc = await getDoc(doc(db, 'users', otherUserId));
const otherUserData = otherUserDoc.data();

if (otherUserData?.gender === GENDERS.MALE) {
  await handleSuccessfulAppointment(otherUserId, dateData.id || conversationData.id);
}
```

**Si la cita falla (no show, cancelación, etc.):**

```javascript
// Al marcar una cita como fallida:
if (otherUserData?.gender === GENDERS.MALE) {
  const result = await handleFailedAppointment(otherUserId, dateData.id || conversationData.id);
  
  if (result.wasBanned) {
    showToast('⚠️ El usuario ha sido baneado por múltiples citas fallidas', 'warning');
  } else {
    showToast(`Nivel de confianza actualizado: ${result.previousLevel} → ${result.newLevel}`, 'info');
  }
}
```

### 3. Mostrar indicadores en `buscar-usuarios.html`

**En la tarjeta de usuario, agregar:**

```javascript
import { getAvailabilityConfig } from './js/appointment-availability.js';
import { getTrustLevelConfig } from './js/trust-system.js';
import { GENDERS } from './js/constants.js';

// En la función que renderiza las tarjetas de usuarios:
function renderUserCard(userData) {
  let statusIndicator = '';
  
  // Para mujeres: mostrar disponibilidad
  if (userData.gender === GENDERS.FEMALE && userData.appointmentAvailability) {
    const availability = getAvailabilityConfig(userData.appointmentAvailability);
    statusIndicator = `
      <div class="flex items-center gap-2 ${availability.cssClass} px-3 py-1 rounded-full text-sm">
        <span>${availability.icon}</span>
        <span>${availability.label}</span>
      </div>
    `;
  }
  
  // Para hombres: mostrar nivel de confianza
  if (userData.gender === GENDERS.MALE && userData.trustLevel) {
    const trustConfig = getTrustLevelConfig(userData.trustLevel);
    statusIndicator = `
      <div class="flex items-center gap-2 ${trustConfig.bgColor} ${trustConfig.color} px-3 py-1 rounded-full text-sm border ${trustConfig.color.split(' ')[3]}">
        <span>${trustConfig.icon}</span>
        <span>${trustConfig.label}</span>
      </div>
    `;
  }
  
  // Agregar statusIndicator al HTML de la tarjeta
  return `
    <div class="user-card glass rounded-2xl p-6">
      ${statusIndicator}
      <!-- resto del contenido -->
    </div>
  `;
}
```

### 4. Inicializar nivel de confianza al registrar usuario

**En `register.html` o donde se crea el perfil inicial:**

```javascript
import { initializeTrustLevel } from './js/trust-system.js';

// Después de crear el usuario:
if (userData.gender === GENDERS.MALE) {
  await initializeTrustLevel(user.uid, userData.gender);
}
```

---

## 📊 Estructura de Datos en Firestore

### Campo en `users/{userId}`:

```javascript
{
  // Para hombres:
  trustLevel: 'ORO' | 'PLATA' | 'BRONCE' | 'NEGRO',
  appointmentsSuccessful: 0,
  appointmentsFailed: 0,
  consecutiveSuccessfulAppointments: 0,
  drivingLicensePermission: false,
  drivingLicenseEarnedAt: null,
  banned: false,
  bannedAt: null,
  bannedReason: null,
  
  // Para mujeres:
  appointmentAvailability: 'immediate' | 'planned' | 'not_accepting',
  appointmentAvailabilityUpdatedAt: timestamp
}
```

---

## ✅ Checklist de Implementación

- [x] Crear módulo `trust-system.js`
- [x] Crear módulo `appointment-availability.js`
- [x] Actualizar `constants.js` con configuraciones
- [ ] Agregar selector de disponibilidad en `perfil.html`
- [ ] Integrar `handleSuccessfulAppointment` en `cita-detalle.html`
- [ ] Integrar `handleFailedAppointment` en `cita-detalle.html`
- [ ] Mostrar indicadores en `buscar-usuarios.html`
- [ ] Inicializar nivel de confianza en registro
- [ ] Probar flujo completo

---

## 🧪 Pruebas Recomendadas

1. **Mujeres:**
   - Cambiar disponibilidad en perfil
   - Verificar que se actualiza en Firestore
   - Verificar que se muestra en buscar-usuarios

2. **Hombres:**
   - Verificar que inician en ORO
   - Marcar cita como fallida → debe bajar a PLATA
   - Marcar otra fallida → debe bajar a BRONCE
   - Marcar 3 exitosas → debe obtener permiso de carnet
   - Desde BRONCE, fallar otra → debe ir a NEGRO

---

## 📝 Notas

- El sistema de confianza solo aplica a hombres
- El sistema de disponibilidad solo aplica a mujeres
- Los niveles se actualizan automáticamente según las citas
- El permiso de carnet se otorga automáticamente con 3 citas exitosas

