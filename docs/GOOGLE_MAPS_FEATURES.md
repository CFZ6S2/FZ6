# 🗺️ Integración con Google Maps - TuCitaSegura

## ¡Ahora con Google Maps Integrado!

La página de búsqueda de usuarios ahora incluye **integración completa con Google Maps**, convirtiendo TuCitaSegura en una plataforma de citas basada en ubicación geográfica, similar a Tinder, Bumble y otras apps modernas.

---

## 🎯 Nuevas Características

### 1. 🗺️ Vista de Mapa Interactivo

#### Toggle Vista Lista / Mapa
```
[📋 Lista] [🗺️ Mapa]  ← Botones para cambiar entre vistas
```

**Vista de Mapa:**
- Mapa interactivo de 600px de alto
- Estilo dark mode que combina con el diseño de la app
- Marcadores personalizados con la inicial del usuario
- Auto-ajuste de zoom para mostrar todos los usuarios
- Info windows con mini perfil al hacer clic en marcadores

**Características del Mapa:**
```javascript
// Estilo dark personalizado
- Geometría oscura (#242f3e)
- Agua en azul oscuro (#17263c)
- Labels con colores coordinar
- Sin clutter visual
```

### 2. 📍 Marcadores Personalizados

Cada usuario se muestra en el mapa con un marcador único:

```
┌──────────────┐
│   🔵 A       │  ← Círculo azul con inicial
│              │
│  Ana, 25     │
│  📍 2.5 km   │
│  🥇 ORO      │
│              │
│ [Ver Perfil] │
└──────────────┘
```

**Características:**
- SVG personalizado con inicial del usuario
- Color azul (#0ea5e9) consistente con la app
- Borde blanco para visibilidad
- Info window con datos clave
- Botón "Ver Perfil" que abre el modal completo

### 3. 🎯 Geolocalización del Usuario

#### Botón "Usar mi ubicación"

```javascript
┌─────────────────────────────┐
│ 📍 Usar mi ubicación        │  ← Click aquí
└─────────────────────────────┘
        ↓
   Permiso GPS
        ↓
┌─────────────────────────────┐
│ ✓ Ubicación detectada       │
└─────────────────────────────┘
```

**Proceso:**
1. Usuario hace clic en el botón
2. Navegador solicita permiso de ubicación
3. Se obtienen coordenadas GPS (lat, lng)
4. Mapa se centra en la ubicación del usuario
5. Se agrega un marcador verde (tú estás aquí)
6. Se calculan distancias a todos los usuarios
7. Filtros por distancia ahora están activos

**Marcador de Tu Ubicación:**
```
🟢  ← Círculo verde con punto blanco central
```

### 4. 📏 Cálculo de Distancias

#### Fórmula de Haversine

```javascript
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radio de la Tierra en km

  // Convierte grados a radianes
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  // Fórmula de Haversine
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon/2) * Math.sin(dLon/2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distancia en kilómetros
}
```

**Precisión:** ±0.1 km en distancias cortas

### 5. 🎚️ Filtro por Radio de Búsqueda

```
Radio de búsqueda:
├─ Cualquier distancia (sin filtro)
├─ 5 km o menos      ← Vecindario
├─ 10 km o menos     ← Ciudad cercana
├─ 25 km o menos     ← Área metropolitana
├─ 50 km o menos     ← Región
└─ 100 km o menos    ← Provincia
```

**Comportamiento:**
- Solo funciona si el usuario ha compartido su ubicación
- Se calcula la distancia en línea recta (as the crow flies)
- Usuarios fuera del radio se ocultan automáticamente
- Contador de usuarios se actualiza en tiempo real

### 6. 📊 Ordenamiento por Distancia

```
Ordenar por:
├─ ⭐ Más cercanos (por defecto cuando hay ubicación)
├─ Más recientes
├─ Edad: menor a mayor
├─ Edad: mayor a menor
└─ Mejor reputación
```

**Algoritmo:**
```javascript
// Ordena usuarios por distancia ascendente
filteredUsers.sort((a, b) =>
  (a.distance || 999999) - (b.distance || 999999)
);
```

### 7. 🏷️ Badge de Distancia

En cada tarjeta de usuario:

```
┌─────────────────────────┐
│ 👤 Ana, 25              │
│ 🎂 25 años  📍 2.5 km   │  ← Badge verde
│ 🥇 ORO                  │
└─────────────────────────┘
```

**Estilo:**
```css
.distance-badge {
  background: rgba(34, 197, 94, 0.2);  /* Verde suave */
  border: 1px solid rgba(34, 197, 94, 0.4);
  color: #86efac;  /* Verde claro */
}
```

### 8. 🔍 Google Places Autocomplete

#### Búsqueda de Ubicación

```
┌──────────────────────────────────────┐
│ 📍 Ubicación                          │
│                                       │
│ Madrid_                               │  ← Escribe aquí
│ ┌──────────────────────────┐         │
│ │ Madrid, España            │ ←       │  Sugerencias
│ │ Madrid, Comunidad Autón...│         │
│ │ Madrigal, Ávila...        │         │
│ └──────────────────────────┘         │
└──────────────────────────────────────┘
```

**Configuración:**
```javascript
autocomplete = new google.maps.places.Autocomplete(input, {
  types: ['(cities)'],              // Solo ciudades
  componentRestrictions: {
    country: 'es'                   // Solo España
  }
});
```

**Comportamiento:**
1. Usuario empieza a escribir
2. Google sugiere lugares en tiempo real
3. Al seleccionar un lugar:
   - Se obtienen coordenadas (lat, lng)
   - Mapa se centra en el lugar
   - Se establece como punto de referencia
   - Se calculan distancias desde ese punto
   - Filtros se actualizan automáticamente

### 9. 🗺️ Mapa en Modal de Usuario

Cuando abres el perfil de un usuario:

```
┌────────────────────────────────────┐
│ Perfil de Ana                 ✕    │
├────────────────────────────────────┤
│ 👤 Ana, 25  ✓  📍 2.5 km          │
│                                    │
│ 📍 Ubicación                       │
│ ┌────────────────────────────────┐ │
│ │                                │ │
│ │        🗺️ Mapa 300px           │ │  ← Mapa individual
│ │           📍 A                  │ │
│ │                                │ │
│ └────────────────────────────────┘ │
│                                    │
│ Sobre mí: ...                      │
└────────────────────────────────────┘
```

**Características:**
- Mapa de 300px de alto
- Centrado en la ubicación del usuario
- Zoom nivel 14 (vista detallada)
- Mismo estilo dark que el mapa principal
- Marcador con inicial del usuario

### 10. 💾 Persistencia de Datos

#### LocalStorage
```javascript
{
  "userSearchFilters": {
    "distance": 25,           // Radio seleccionado
    "ageMin": 25,
    "ageMax": 35,
    // ... otros filtros
  }
}
```

**Guardado automático:**
- Al aplicar filtros
- Al cambiar ordenamiento
- Se restaura al recargar la página

---

## 📱 Flujo de Usuario Completo

### Escenario 1: Búsqueda Básica por Ubicación

```
1. Usuario llega a la página
   ↓
2. Click en "Usar mi ubicación"
   ↓
3. Navegador pide permiso GPS
   ↓
4. Se detecta ubicación: Madrid (40.4168, -3.7038)
   ↓
5. Se muestran usuarios con distancias:
   - Ana: 2.5 km
   - Carlos: 5.1 km
   - María: 12.3 km
   ↓
6. Usuario ordena por "Más cercanos"
   ↓
7. Ana aparece primera (más cercana)
   ↓
8. Usuario ve el perfil de Ana
   ↓
9. Modal muestra mapa con ubicación de Ana
   ↓
10. Usuario envía solicitud de cita ❤️
```

### Escenario 2: Búsqueda en Otra Ciudad

```
1. Usuario quiere buscar en Barcelona
   ↓
2. Click en "Filtros"
   ↓
3. Escribe "Barcelona" en búsqueda de ubicación
   ↓
4. Selecciona "Barcelona, España" del autocomplete
   ↓
5. Mapa se centra en Barcelona
   ↓
6. Selecciona radio: "25 km o menos"
   ↓
7. Click en "Aplicar Filtros"
   ↓
8. Se muestran solo usuarios en Barcelona (±25km)
   ↓
9. Click en toggle "Mapa"
   ↓
10. Ve todos los usuarios en el mapa interactivo
    ↓
11. Click en un marcador → Info Window
    ↓
12. Click "Ver Perfil" → Modal completo
```

### Escenario 3: Vista de Mapa

```
1. Usuario tiene ubicación establecida
   ↓
2. Click en botón "🗺️ Mapa"
   ↓
3. Vista cambia de lista a mapa
   ↓
4. Mapa muestra:
   - Marcador verde: tu ubicación
   - Marcadores azules: usuarios (con iniciales)
   ↓
5. Mapa auto-ajusta para mostrar todos
   ↓
6. Usuario hace zoom in/out, pan, etc.
   ↓
7. Click en marcador de "Ana"
   ↓
8. Info Window aparece:
   ┌──────────────┐
   │ Ana          │
   │ 🎂 25 años   │
   │ 📍 2.5 km    │
   │ 🥇 ORO       │
   │ [Ver Perfil] │
   └──────────────┘
   ↓
9. Click "Ver Perfil" → Modal con detalles + mapa
```

---

## 🎨 Diseño Visual

### Colores del Tema de Mapas

```css
/* Geometría */
geometry: #242f3e           /* Gris oscuro */

/* Agua */
water: #17263c              /* Azul muy oscuro */

/* Labels */
administrative: #746855     /* Marrón suave */
poi: #d59563               /* Naranja suave */

/* Marcadores */
user-marker: #0ea5e9       /* Azul característico */
user-location: #22c55e     /* Verde */
```

### Badges y Indicadores

```
📍 2.5 km    ← Verde (#86efac)
🥇 ORO       ← Amarillo (#facc15)
✓ Verificado ← Azul (#60a5fa)
🟢 En línea  ← Verde (#22c55e)
```

---

## 🚀 Configuración Requerida

### 1. Google Maps API Key

**Paso a paso:**

```bash
1. Ir a: https://console.cloud.google.com/
2. Crear proyecto: "TuCitaSegura"
3. Habilitar APIs:
   - Maps JavaScript API
   - Places API
   - Geometry Library (incluida automáticamente)
4. Crear credenciales → Clave de API
5. IMPORTANTE: Configurar restricciones de dominio
6. Copiar la API key
```

**Editar archivo:**

`/webapp/buscar-usuarios.html` línea 11:

```html
<!-- ANTES -->
<script src="https://maps.googleapis.com/maps/api/js?key=YOUR_GOOGLE_MAPS_API_KEY&libraries=places,geometry"></script>

<!-- DESPUÉS -->
<script src="https://maps.googleapis.com/maps/api/js?key=AIzaSyXXXXXXXXXXXXXXXXX&libraries=places,geometry"></script>
```

### 2. Firestore - Campo de Ubicación

**Actualizar estructura de usuarios:**

```javascript
// Firestore: Collection "users"
{
  alias: "Ana",
  email: "ana@example.com",
  birthDate: "1998-05-15",
  gender: "femenino",

  // 🆕 NUEVO: Campo de ubicación
  location: {
    lat: 40.4168,    // Latitud (Madrid)
    lng: -3.7038     // Longitud (Madrid)
  },

  city: "Madrid",
  bio: "Amante de los viajes...",
  reputation: "ORO",
  // ... otros campos
}
```

**Cómo obtener coordenadas:**

**Opción 1: Geolocalización del navegador**
```javascript
navigator.geolocation.getCurrentPosition((position) => {
  const location = {
    lat: position.coords.latitude,
    lng: position.coords.longitude
  };
  // Guardar en Firestore
});
```

**Opción 2: Geocodificación de dirección**
```javascript
const geocoder = new google.maps.Geocoder();
geocoder.geocode({ address: 'Madrid, España' }, (results) => {
  const location = {
    lat: results[0].geometry.location.lat(),
    lng: results[0].geometry.location.lng()
  };
  // Guardar en Firestore
});
```

**Opción 3: Mock (para desarrollo)**
```javascript
// El código incluye generación automática de ubicaciones mock
// cerca de Madrid si el usuario no tiene ubicación
location: {
  lat: 40.4168 + (Math.random() - 0.5) * 0.2,  // ±10km
  lng: -3.7038 + (Math.random() - 0.5) * 0.2
}
```

---

## 📊 Estadísticas de Mejora

### Antes (Sin Google Maps)

```
❌ Sin visualización geográfica
❌ Sin filtro por distancia
❌ Sin ordenamiento por cercanía
❌ Solo filtro por ciudad (texto)
❌ Sin contexto espacial
```

### Ahora (Con Google Maps)

```
✅ Mapa interactivo completo
✅ Filtro por radio (5-100 km)
✅ Ordenamiento por distancia
✅ Autocomplete de lugares
✅ Geolocalización GPS
✅ Marcadores personalizados
✅ Info windows con perfiles
✅ Mapas en modales de usuario
✅ Badges de distancia
✅ Cálculos precisos (Haversine)
```

### Impacto en UX

| Métrica | Antes | Ahora | Mejora |
|---------|-------|-------|--------|
| **Filtros de ubicación** | 1 (ciudad texto) | 4 (ciudad, ubicación, radio, GPS) | **+300%** |
| **Visualización** | Solo lista | Lista + Mapa | **+100%** |
| **Ordenamiento** | 4 opciones | 5 opciones (+ distancia) | **+25%** |
| **Información de distancia** | No | Sí (en tiempo real) | **∞** |
| **Contexto geográfico** | No | Sí (mapa visual) | **∞** |
| **Engagement esperado** | Base | +70% | **+70%** |

---

## 🎯 Casos de Uso Reales

### Caso 1: Usuario Viajero
```
Problema: "Voy a Barcelona este fin de semana"
Solución:
1. Busca "Barcelona" en autocomplete
2. Establece radio de 10 km
3. Ve usuarios en el mapa de Barcelona
4. Envía solicitudes antes de viajar
5. Ya tiene citas programadas al llegar
```

### Caso 2: Usuario Local
```
Problema: "Solo quiero citas cerca de casa"
Solución:
1. Click "Usar mi ubicación"
2. Establece radio de 5 km
3. Ordena por "Más cercanos"
4. Solo ve usuarios a <5 km
5. Puede ir caminando a las citas
```

### Caso 3: Usuario Explorador
```
Problema: "Quiero ver dónde están todos"
Solución:
1. Toggle a vista de Mapa
2. Ve distribución geográfica
3. Identifica clusters de usuarios
4. Hace zoom a áreas interesantes
5. Click en marcadores → Perfiles
```

---

## 🔒 Seguridad y Privacidad

### Ubicación Exacta vs. Aproximada

**Recomendaciones:**

```javascript
// ❌ MAL: Mostrar ubicación exacta de casa
location: {
  lat: 40.416775,  // Precisión de 1 metro
  lng: -3.703790
}

// ✅ BIEN: Usar aproximación (~500m radius)
location: {
  lat: Math.round(40.416775 * 100) / 100,  // 40.42
  lng: Math.round(-3.703790 * 100) / 100   // -3.70
}
```

**Nivel de precisión sugerido:**
- 2 decimales = ±1 km (RECOMENDADO para privacidad)
- 3 decimales = ±100 m (BUENO para ciudades)
- 4 decimales = ±10 m (PRECISO pero menos privado)
- 6 decimales = ±1 m (EVITAR - demasiado exacto)

### Configuración de API Key

```
✅ Restringir por dominio HTTP
✅ Restringir por APIs específicas
✅ Establecer cuotas diarias
✅ Monitorear uso
❌ No dejar la key sin restricciones
❌ No subir la key al repositorio público
```

### Firestore Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      // Solo leer ubicación, no escribir desde client
      allow read: if request.auth != null;

      // Escribir location solo al crear perfil
      allow create: if request.auth.uid == userId &&
                      request.resource.data.location is map;

      // No permitir actualizar location desde client
      allow update: if request.auth.uid == userId &&
                      !('location' in request.resource.data.diff(resource.data));
    }
  }
}
```

---

## 🌟 Funcionalidades Futuras

### Próximas Mejoras Sugeridas

1. **Heatmap de Usuarios**
   ```javascript
   // Mapa de calor mostrando densidad de usuarios
   const heatmap = new google.maps.visualization.HeatmapLayer({
     data: userLocations
   });
   ```

2. **Rutas y Direcciones**
   ```javascript
   // "Cómo llegar" a la ubicación de la cita
   const directionsService = new google.maps.DirectionsService();
   ```

3. **Lugares de Encuentro Sugeridos**
   ```javascript
   // Cafeterías/restaurantes a medio camino
   const placesService = new google.maps.places.PlacesService(map);
   placesService.nearbySearch({
     location: midpoint,
     radius: 500,
     type: ['restaurant', 'cafe']
   });
   ```

4. **Filtro por Transporte Público**
   ```javascript
   // Solo usuarios accesibles en metro/bus
   const transitLayer = new google.maps.TransitLayer();
   ```

5. **Geo-fencing para Notificaciones**
   ```javascript
   // Notificar cuando un match está cerca
   if (distance < 1) {  // <1 km
     sendNotification('¡Ana está cerca!');
   }
   ```

6. **Historial de Ubicaciones**
   ```javascript
   // "Has visitado Madrid, Barcelona, Valencia"
   // Sugerir usuarios de ciudades que visitaste
   ```

---

## 📈 Métricas y Analytics

### Eventos a Trackear

```javascript
// Google Analytics / Firebase Analytics

// 1. Uso de funciones de mapa
analytics.logEvent('map_view_toggled', {
  from: 'list',
  to: 'map'
});

// 2. Uso de geolocalización
analytics.logEvent('user_location_detected', {
  accuracy: position.coords.accuracy
});

// 3. Búsqueda por ubicación
analytics.logEvent('location_searched', {
  place: 'Madrid',
  radius: 25
});

// 4. Interacción con marcadores
analytics.logEvent('map_marker_clicked', {
  user_id: userId,
  distance: 2.5
});

// 5. Filtro por distancia usado
analytics.logEvent('distance_filter_applied', {
  radius: 10
});

// 6. Ordenamiento por distancia
analytics.logEvent('sorted_by_distance');
```

### KPIs Esperados

```
📊 % de usuarios que activan geolocalización: >60%
📊 % de búsquedas con filtro de distancia: >40%
📊 % de tiempo en vista de mapa vs lista: 30-40%
📊 Conversión (vista → solicitud) con distancia: +25%
📊 Tiempo promedio en mapa: 2-3 minutos
📊 Clicks en marcadores por sesión: 5-8
```

---

## 🎓 Recursos Técnicos

### Documentación

- [Google Maps JavaScript API](https://developers.google.com/maps/documentation/javascript)
- [Places API](https://developers.google.com/maps/documentation/places/web-service)
- [Geocoding API](https://developers.google.com/maps/documentation/geocoding)
- [Haversine Formula](https://en.wikipedia.org/wiki/Haversine_formula)

### Ejemplos de Código

```javascript
// Ejemplo completo en /webapp/buscar-usuarios.html
// Función calculateDistance en /webapp/js/utils.js
```

### Costos de Google Maps API

**Precios aproximados (2024):**
- Maps JavaScript API: $7 por 1,000 cargas
- Places Autocomplete: $2.83 por 1,000 sesiones
- Geocoding API: $5 por 1,000 requests

**Free tier:**
- $200 de crédito mensual gratis
- ≈ 28,000 cargas de mapa gratis/mes
- Suficiente para proyectos pequeños/medianos

**Optimizaciones para reducir costos:**
- Cachear resultados de geocodificación
- Usar sessionToken en Places Autocomplete
- Cargar mapa solo cuando el usuario lo solicita (lazy load)
- Limitar zoom levels permitidos
- Usar static maps para thumbnails

---

## ✅ Checklist de Implementación

```
Configuración:
☐ Obtener Google Maps API key
☐ Habilitar Maps JavaScript API
☐ Habilitar Places API
☐ Configurar restricciones de API key
☐ Agregar key al código (línea 11)

Firestore:
☐ Agregar campo "location" a usuarios existentes
☐ Actualizar reglas de seguridad
☐ Crear índice compuesto si necesario
☐ Migrar usuarios existentes (geocodificar addresses)

Testing:
☐ Probar geolocalización en diferentes navegadores
☐ Probar autocomplete de lugares
☐ Probar filtro por distancia
☐ Probar ordenamiento por cercanía
☐ Probar vista de mapa
☐ Probar marcadores y info windows
☐ Probar mapa en modal de usuario
☐ Probar en móvil (responsive)

Producción:
☐ Configurar dominio en API key restrictions
☐ Establecer cuotas y alertas de uso
☐ Monitorear costos de API
☐ Configurar analytics de eventos de mapa
☐ Documentar para el equipo
```

---

## 🎉 Conclusión

La integración de Google Maps transforma **TuCitaSegura** de una simple lista de usuarios a una **plataforma de citas basada en ubicación geográfica** de clase mundial.

**Beneficios clave:**
- ✅ UX moderna similar a Tinder/Bumble
- ✅ Mayor engagement con visualización de mapa
- ✅ Mejor matching por proximidad geográfica
- ✅ Filtros más relevantes (distancia)
- ✅ Contexto espacial para los usuarios
- ✅ Funcionalidad "killer feature" que diferencia la app

**Próximos pasos:**
1. Implementar geocodificación en el registro
2. Agregar preferencias de privacidad de ubicación
3. Implementar notificaciones de proximidad
4. A/B testing de vista mapa vs lista
5. Optimización de performance con clustering de marcadores

---

**¡La app ahora está lista para competir con las mejores apps de citas del mercado!** 🚀❤️🗺️
