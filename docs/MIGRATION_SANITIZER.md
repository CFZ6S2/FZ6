# 🔄 Guía de Migración Rápida - Aplicar Sanitizer

## 📋 Archivos que Necesitan Sanitización

### Alta Prioridad (Contenido de Usuario)
1. ✅ **chat.html** - Mensajes de usuarios
2. ✅ **conversaciones.html** - Lista de chats
3. ✅ **buscar-usuarios.html** - Perfiles de usuarios
4. ⚠️ **perfil.html** - Biografía y datos de perfil
5. ⚠️ **cita-detalle.html** - Detalles de citas

### Media Prioridad (Contenido Dinámico)
6. ⚠️ **cuenta-pagos.html** - Información de transacciones
7. ⚠️ **admin/dashboard.html** - Panel administrativo
8. ⚠️ **concierge-dashboard.html** - Panel de concierge

---

## 🛠️ Pasos de Migración

### Paso 1: Agregar DOMPurify al HTML

En el `<head>` de cada archivo, después de Font Awesome:

```html
<!-- DOMPurify para sanitización XSS -->
<script src="https://cdn.jsdelivr.net/npm/dompurify@3.0.8/dist/purify.min.js"></script>
```

### Paso 2: Importar el Sanitizer

En el `<script type="module">`:

```html
<script type="module">
  import { sanitizer } from './js/sanitizer.js';

  // Tu código aquí...
</script>
```

### Paso 3: Reemplazar innerHTML

**Antes (Vulnerable):**
```javascript
messageDiv.innerHTML = userData.message;
```

**Después (Seguro):**
```javascript
// Opción 1: Solo texto (más seguro)
messageDiv.textContent = sanitizer.text(userData.message);

// Opción 2: HTML permitido (con sanitización)
messageDiv.innerHTML = sanitizer.html(userData.message);

// Opción 3: Usar helper
sanitizer.setHTML(messageDiv, userData.message);
```

---

## 🎯 Ejemplos por Tipo de Contenido

### Chat/Mensajes
```javascript
// ❌ ANTES
messageElement.innerHTML = message.text;

// ✅ AHORA
import { sanitizer } from './js/sanitizer.js';
sanitizer.setText(messageElement, message.text);
```

### Perfiles de Usuario
```javascript
// ❌ ANTES
bioDiv.innerHTML = userData.bio;

// ✅ AHORA
bioDiv.innerHTML = sanitizer.html(userData.bio, {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
  ALLOWED_ATTR: []
});
```

### Nombres/Títulos
```javascript
// ❌ ANTES
nameSpan.innerHTML = user.name;

// ✅ AHORA
nameSpan.textContent = sanitizer.text(user.name);
```

### URLs/Links
```javascript
// ❌ ANTES
linkElement.href = userData.website;

// ✅ AHORA
const safeUrl = sanitizer.url(userData.website);
if (safeUrl) {
  linkElement.href = safeUrl;
}
```

---

## 📝 Template de Migración

### Para chat.html:

```javascript
import { sanitizer } from './js/sanitizer.js';

function displayMessage(message) {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message';

  // ❌ NO HAGAS ESTO
  // messageDiv.innerHTML = `<strong>${message.sender}:</strong> ${message.text}`;

  // ✅ HAZ ESTO
  const senderSpan = document.createElement('strong');
  senderSpan.textContent = sanitizer.text(message.sender);

  const textSpan = document.createElement('span');
  textSpan.textContent = sanitizer.text(message.text);

  messageDiv.appendChild(senderSpan);
  messageDiv.appendChild(document.createTextNode(': '));
  messageDiv.appendChild(textSpan);

  return messageDiv;
}
```

---

## ⚡ Migración Rápida (Buscar y Reemplazar)

### 1. En VSCode:
```
Ctrl + Shift + H (Find and Replace in Files)
```

### 2. Buscar:
```regex
\.innerHTML\s*=\s*([^;]+);
```

### 3. Reemplazar con:
```javascript
.innerHTML = sanitizer.html($1);
```

**⚠️ ADVERTENCIA:** Revisa cada cambio manualmente. No todos los innerHTML necesitan HTML.

---

## 🧪 Testing

Después de cada cambio:

1. Abre la consola (F12)
2. Verifica que no hay errores
3. Prueba la funcionalidad
4. Intenta inyectar XSS:
   ```html
   <img src=x onerror="alert('XSS')">
   ```
5. Verifica que se sanitiza correctamente

---

## 📊 Priorización

### Urgente (Esta Semana)
- [ ] chat.html
- [ ] conversaciones.html
- [ ] buscar-usuarios.html

### Importante (Próxima Semana)
- [ ] perfil.html
- [ ] cita-detalle.html
- [ ] cuenta-pagos.html

### Cuando Sea Posible
- [ ] admin/dashboard.html
- [ ] concierge-dashboard.html
- [ ] Otros archivos con innerHTML

---

## ✅ Checklist por Archivo

Para cada archivo migrado:

- [ ] DOMPurify agregado al `<head>`
- [ ] Sanitizer importado
- [ ] Todos los innerHTML revisados
- [ ] innerHTML de usuario sanitizados
- [ ] innerHTML estáticos dejados como están (si son seguros)
- [ ] Probado en navegador
- [ ] Sin errores en consola
- [ ] XSS test pasado

---

**Creado:** 23 de Noviembre de 2025
**Autor:** TuCitaSegura Security Team
