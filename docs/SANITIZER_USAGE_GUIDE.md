# 🛡️ Guía de Uso del Sanitizer - Prevención de XSS

## 📋 Tabla de Contenidos

- [Introducción](#introducción)
- [Instalación](#instalación)
- [Uso Básico](#uso-básico)
- [Métodos Disponibles](#métodos-disponibles)
- [Ejemplos Prácticos](#ejemplos-prácticos)
- [Mejores Prácticas](#mejores-prácticas)
- [Solución de Problemas](#solución-de-problemas)

---

## Introducción

El módulo `sanitizer.js` proporciona protección contra ataques XSS (Cross-Site Scripting) al sanitizar todo contenido generado por usuarios antes de mostrarlo en la página.

### ¿Por qué es importante?

**Sin sanitización:**
```javascript
// ❌ PELIGRO: Vulnerable a XSS
const userMessage = '<img src=x onerror="alert(\'XSS\')">';
element.innerHTML = userMessage;
// Resultado: Se ejecuta código malicioso
```

**Con sanitización:**
```javascript
// ✅ SEGURO: XSS bloqueado
import { sanitizer } from './sanitizer.js';
element.innerHTML = sanitizer.html(userMessage);
// Resultado: <img src="x"> (sin onerror)
```

---

## Instalación

### 1. Cargar DOMPurify (Opcional pero Recomendado)

Añade esto en el `<head>` de tus archivos HTML:

```html
<!-- DOMPurify - Librería de sanitización XSS -->
<script src="https://cdn.jsdelivr.net/npm/dompurify@3.0.8/dist/purify.min.js"></script>
```

**Nota:** El sanitizer funciona sin DOMPurify, pero usa un fallback menos robusto (solo textContent).

### 2. Importar el Sanitizer

En tus archivos JavaScript:

```javascript
import { sanitizer } from './js/sanitizer.js';
```

O si necesitas la función de inicialización:

```javascript
import { sanitizer, initSanitizer } from './js/sanitizer.js';
```

---

## Uso Básico

### Reemplazar innerHTML (RECOMENDADO)

**Antes (Vulnerable):**
```javascript
// ❌ NO HAGAS ESTO
element.innerHTML = userData.bio;
```

**Después (Seguro):**
```javascript
// ✅ HAZ ESTO
element.innerHTML = sanitizer.html(userData.bio);
```

### Usar textContent para Texto Plano (MÁS SEGURO)

Si no necesitas HTML, usa textContent:

```javascript
// ✅ MEJOR OPCIÓN para texto plano
element.textContent = sanitizer.text(userData.message);
```

---

## Métodos Disponibles

### 1. `sanitizer.html(dirty, config)`

Sanitiza HTML permitiendo solo tags seguros.

**Parámetros:**
- `dirty` (string): HTML no confiable
- `config` (object, opcional): Configuración de DOMPurify

**Retorna:** String con HTML sanitizado

**Ejemplo:**
```javascript
const userBio = '<b>Hola</b> <script>alert("XSS")</script>';
const safe = sanitizer.html(userBio);
// Resultado: '<b>Hola</b> '
```

**Configuración personalizada:**
```javascript
const safe = sanitizer.html(dirty, {
  ALLOWED_TAGS: ['b', 'i', 'p'],
  ALLOWED_ATTR: ['class']
});
```

---

### 2. `sanitizer.text(dirty)`

Convierte a texto plano (sin HTML).

**Parámetros:**
- `dirty` (string): Texto no confiable

**Retorna:** String de texto plano

**Ejemplo:**
```javascript
const userInput = '<script>alert("XSS")</script>Hola';
const safe = sanitizer.text(userInput);
// Resultado: 'Hola'
```

**Cuándo usar:**
- Nombres de usuario
- Mensajes de chat
- Comentarios simples
- Cualquier texto que NO necesite formato HTML

---

### 3. `sanitizer.url(url)`

Valida y sanitiza URLs.

**Parámetros:**
- `url` (string): URL no confiable

**Retorna:** URL segura o `null` si es maliciosa

**Ejemplo:**
```javascript
// ✅ URL válida
const safe1 = sanitizer.url('https://example.com');
// Resultado: 'https://example.com'

// ❌ Protocolo peligroso
const safe2 = sanitizer.url('javascript:alert("XSS")');
// Resultado: null

// ❌ Data URI
const safe3 = sanitizer.url('data:text/html,<script>alert()</script>');
// Resultado: null
```

**Protocolos permitidos:**
- `http://`
- `https://`
- `mailto:`

---

### 4. `sanitizer.attribute(dirty)`

Sanitiza valores de atributos HTML.

**Parámetros:**
- `dirty` (string): Valor de atributo no confiable

**Retorna:** Valor sanitizado

**Ejemplo:**
```javascript
const className = sanitizer.attribute(userInput);
element.setAttribute('class', className);

const title = sanitizer.attribute(userData.title);
element.setAttribute('title', title);
```

---

### 5. `sanitizer.javascript(dirty)`

Sanitiza strings para contexto JavaScript (muy estricto).

**Parámetros:**
- `dirty` (string): String no confiable

**Retorna:** String sanitizado (solo alfanumérico y puntuación básica)

**Ejemplo:**
```javascript
const userId = sanitizer.javascript(userInput);
eval(`showUser("${userId}")`); // Aún peligroso, evita eval()
```

**⚠️ ADVERTENCIA:** Evita usar `eval()` completamente, incluso con sanitización.

---

### 6. `sanitizer.isPotentiallyMalicious(str)`

Detecta si un string contiene patrones peligrosos.

**Parámetros:**
- `str` (string): String a analizar

**Retorna:** `true` si es potencialmente malicioso

**Ejemplo:**
```javascript
if (sanitizer.isPotentiallyMalicious(userInput)) {
  console.warn('⚠️ Contenido sospechoso detectado');
  // Mostrar advertencia al usuario o rechazar input
}
```

**Patrones detectados:**
- `<script>`
- `javascript:`
- `on*=` (onclick, onerror, etc.)
- `<iframe>`
- `eval(`
- `<embed>`, `<object>`

---

### 7. `sanitizer.setHTML(element, html, config)`

Helper para establecer innerHTML de forma segura.

**Parámetros:**
- `element` (HTMLElement): Elemento objetivo
- `html` (string): HTML a establecer
- `config` (object, opcional): Configuración de DOMPurify

**Ejemplo:**
```javascript
const messageDiv = document.getElementById('user-message');
sanitizer.setHTML(messageDiv, userData.message);

// Equivalente a:
messageDiv.innerHTML = sanitizer.html(userData.message);
```

---

### 8. `sanitizer.setText(element, text)`

Helper para establecer textContent de forma segura.

**Parámetros:**
- `element` (HTMLElement): Elemento objetivo
- `text` (string): Texto a establecer

**Ejemplo:**
```javascript
const nameSpan = document.getElementById('user-name');
sanitizer.setText(nameSpan, userData.name);

// Equivalente a:
nameSpan.textContent = sanitizer.text(userData.name);
```

---

## Ejemplos Prácticos

### Ejemplo 1: Mostrar Perfil de Usuario

```javascript
import { sanitizer } from './js/sanitizer.js';

function displayUserProfile(userData) {
  // Nombre (solo texto)
  document.getElementById('user-name').textContent = sanitizer.text(userData.name);

  // Bio (permite HTML básico)
  const bioHTML = sanitizer.html(userData.bio, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: []
  });
  document.getElementById('user-bio').innerHTML = bioHTML;

  // Avatar (valida URL)
  const avatarURL = sanitizer.url(userData.avatar);
  if (avatarURL) {
    document.getElementById('user-avatar').src = avatarURL;
  }
}
```

---

### Ejemplo 2: Chat de Mensajes

```javascript
import { sanitizer } from './js/sanitizer.js';

function addChatMessage(message) {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'chat-message';

  // OPCIÓN 1: Solo texto (más seguro)
  messageDiv.textContent = sanitizer.text(message.text);

  // OPCIÓN 2: Permitir emojis y formato básico
  sanitizer.setHTML(messageDiv, message.text, {
    ALLOWED_TAGS: ['b', 'i', 'emoji'],
    ALLOWED_ATTR: ['data-emoji']
  });

  document.getElementById('chat-container').appendChild(messageDiv);
}
```

---

### Ejemplo 3: Formulario con Validación

```javascript
import { sanitizer } from './js/sanitizer.js';

document.getElementById('submit-btn').addEventListener('click', () => {
  const userInput = document.getElementById('description').value;

  // Detectar contenido malicioso
  if (sanitizer.isPotentiallyMalicious(userInput)) {
    alert('⚠️ Tu descripción contiene caracteres no permitidos');
    return;
  }

  // Sanitizar antes de guardar
  const safeDescription = sanitizer.html(userInput);

  // Guardar a Firestore
  firebase.firestore().collection('posts').add({
    description: safeDescription,
    createdAt: new Date()
  });
});
```

---

### Ejemplo 4: Lista de Usuarios

```javascript
import { sanitizer } from './js/sanitizer.js';

function renderUserList(users) {
  const container = document.getElementById('users-list');
  container.innerHTML = ''; // Limpiar

  users.forEach(user => {
    const userCard = document.createElement('div');
    userCard.className = 'user-card';

    // Usar helpers para seguridad
    userCard.innerHTML = `
      <h3>${sanitizer.text(user.name)}</h3>
      <p>${sanitizer.text(user.city)}</p>
      <a href="${sanitizer.url(user.website) || '#'}">Sitio web</a>
    `;

    container.appendChild(userCard);
  });
}
```

---

## Mejores Prácticas

### ✅ HACER:

1. **Sanitizar TODO contenido de usuarios**
   ```javascript
   // ✅ Siempre sanitiza
   element.innerHTML = sanitizer.html(userInput);
   ```

2. **Preferir textContent sobre innerHTML**
   ```javascript
   // ✅ Más seguro si no necesitas HTML
   element.textContent = sanitizer.text(userInput);
   ```

3. **Validar URLs antes de usarlas**
   ```javascript
   // ✅ Valida URLs
   const url = sanitizer.url(userInput);
   if (url) {
     window.location.href = url;
   }
   ```

4. **Usar configuraciones específicas**
   ```javascript
   // ✅ Solo permite lo que necesitas
   sanitizer.html(input, {
     ALLOWED_TAGS: ['p', 'br'],
     ALLOWED_ATTR: []
   });
   ```

5. **Sanitizar en el frontend Y backend**
   ```javascript
   // ✅ Doble capa de protección
   // Frontend: sanitizer.html()
   // Backend: Python bleach o similar
   ```

---

### ❌ NO HACER:

1. **Confiar en contenido de usuarios**
   ```javascript
   // ❌ NUNCA hagas esto
   element.innerHTML = userData.message;
   ```

2. **Usar eval() con contenido de usuarios**
   ```javascript
   // ❌ EXTREMADAMENTE PELIGROSO
   eval(userCode);
   ```

3. **Construir HTML manualmente con concatenación**
   ```javascript
   // ❌ Vulnerable a XSS
   element.innerHTML = '<div>' + userInput + '</div>';

   // ✅ Sanitiza primero
   element.innerHTML = '<div>' + sanitizer.text(userInput) + '</div>';
   ```

4. **Confiar solo en validación del frontend**
   ```javascript
   // ❌ Atacantes pueden bypassear el frontend
   // ✅ SIEMPRE valida también en el backend
   ```

---

## Solución de Problemas

### Problema: "DOMPurify no está cargado"

**Solución:**

1. Añade DOMPurify al HTML:
   ```html
   <script src="https://cdn.jsdelivr.net/npm/dompurify@3.0.8/dist/purify.min.js"></script>
   ```

2. O el sanitizer usará textContent como fallback (menos features)

---

### Problema: "Mi HTML se está eliminando"

**Causa:** DOMPurify elimina tags/atributos peligrosos por defecto.

**Solución:** Especifica qué tags quieres permitir:

```javascript
const safe = sanitizer.html(dirty, {
  ALLOWED_TAGS: ['b', 'i', 'p', 'a', 'br'],
  ALLOWED_ATTR: ['href', 'title']
});
```

---

### Problema: "Los emojis no funcionan"

**Causa:** Los emojis son texto normal, deberían funcionar.

**Solución:** Usa `sanitizer.text()` en lugar de `sanitizer.html()`:

```javascript
// ✅ Los emojis funcionan
element.textContent = sanitizer.text('Hola 👋 Mundo 🌍');
```

---

## Testing

### Test Manual en Consola

Abre la consola (F12) y prueba:

```javascript
// Test 1: XSS básico
sanitizer.html('<script>alert("XSS")</script>Hola');
// Esperado: 'Hola'

// Test 2: Evento malicioso
sanitizer.html('<img src=x onerror="alert(1)">');
// Esperado: '<img src="x">'

// Test 3: URL maliciosa
sanitizer.url('javascript:alert("XSS")');
// Esperado: null

// Test 4: Detección
sanitizer.isPotentiallyMalicious('<script>alert(1)</script>');
// Esperado: true
```

---

## Configuración Avanzada de DOMPurify

### Ejemplo: Permitir Embeds de YouTube

```javascript
const youtubeHTML = sanitizer.html(userInput, {
  ALLOWED_TAGS: ['iframe'],
  ALLOWED_ATTR: ['src', 'width', 'height', 'frameborder', 'allowfullscreen'],
  ALLOWED_URI_REGEXP: /^https:\/\/www\.youtube\.com\/embed\//
});
```

### Ejemplo: Permitir Solo Texto con Formato

```javascript
const formattedText = sanitizer.html(userInput, {
  ALLOWED_TAGS: ['b', 'i', 'u', 'strike', 'em', 'strong', 'br', 'p'],
  ALLOWED_ATTR: [],
  KEEP_CONTENT: true
});
```

---

## Referencias

- **DOMPurify Docs:** https://github.com/cure53/DOMPurify
- **OWASP XSS Guide:** https://owasp.org/www-community/attacks/xss/
- **CSP Guide:** https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP

---

**Última actualización:** 23 de Noviembre de 2025
**Autor:** TuCitaSegura Security Team
**Versión del Sanitizer:** 1.0.0
