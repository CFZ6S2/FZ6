# 🌍 Sistema de Internacionalización (i18n)

Sistema multilenguaje completo para TuCitaSegura.

## 📋 Características

- ✅ Auto-detección del idioma del navegador
- ✅ Selector de idioma en UI (banderas)
- ✅ Persistencia en localStorage
- ✅ Cambio dinámico sin recargar página
- ✅ Fallback automático a español
- ✅ Soporte para interpolación de variables
- ✅ SEO friendly (atributo `lang`)
- ✅ Caché de traducciones para mejor rendimiento

## 🗣️ Idiomas Soportados

| Idioma | Código | Estado |
|--------|--------|--------|
| Español | `es` | ✅ Completo |
| English | `en` | ✅ Completo |
| Português | `pt` | ✅ Completo |
| Deutsch | `de` | ✅ Completo |
| Français | `fr` | ✅ Completo |

## 📦 Estructura

```
webapp/i18n/
├── locales/          # Archivos de traducciones
│   ├── es.json      # Español ✅
│   ├── en.json      # Inglés ✅
│   ├── pt.json      # Portugués ✅
│   ├── de.json      # Alemán ✅
│   └── fr.json      # Francés ✅
├── i18n.js          # Motor principal de traducciones
└── README.md        # Este archivo
```

## 🚀 Uso

### 1. Inicialización Automática

El sistema se inicializa automáticamente al cargar la página:

```javascript
// Se detecta el idioma del navegador
// Se carga el idioma guardado (si existe)
// Se aplican las traducciones a la página
```

### 2. Uso en HTML

#### Texto simple:

```html
<h1 data-i18n="home.title">TuCitaSegura</h1>
<p data-i18n="home.subtitle">Texto por defecto</p>
```

#### Texto con HTML:

```html
<div data-i18n-html="welcome.message">
  Contenido con <strong>HTML</strong>
</div>
```

#### Atributos especiales:

```html
<!-- Placeholder -->
<input data-i18n-placeholder="auth.login.email" placeholder="Email">

<!-- Title -->
<button data-i18n-title="common.save" title="Guardar">
  <i class="fas fa-save"></i>
</button>

<!-- Alt -->
<img data-i18n-alt="profile.photo" alt="Foto de perfil" src="...">

<!-- Aria-label -->
<button data-i18n-aria="common.close" aria-label="Cerrar">
  <i class="fas fa-times"></i>
</button>
```

### 3. Uso en JavaScript

#### Obtener traducción:

```javascript
// Traducción simple
const text = window.i18n.t('common.welcome');
console.log(text); // "Bienvenido" (es) / "Welcome" (en)

// Con variables
const message = window.i18n.t('search.results', { count: 10 });
console.log(message); // "10 resultados encontrados"
```

#### Cambiar idioma:

```javascript
// Cambiar a inglés
await window.i18n.setLanguage('en');

// El cambio es automático en toda la página
```

#### Obtener idioma actual:

```javascript
const currentLang = window.i18n.getCurrentLanguage();
console.log(currentLang); // "es" o "en"
```

#### Escuchar cambios de idioma:

```javascript
window.addEventListener('languageChanged', (event) => {
  const lang = event.detail.lang;
  console.log('Idioma cambiado a:', lang);

  // Actualizar componentes dinámicos aquí
});
```

### 4. Selector de Idioma

El selector se renderiza automáticamente en el contenedor:

```html
<!-- Agregar en el header -->
<div id="language-selector-container"></div>
```

El componente `LanguageSelector` se inicializa automáticamente.

## 📝 Agregar Nuevas Traducciones

### Paso 1: Editar archivos JSON

**`webapp/i18n/locales/es.json`:**
```json
{
  "mySection": {
    "title": "Mi Título",
    "description": "Mi descripción"
  }
}
```

**`webapp/i18n/locales/en.json`:**
```json
{
  "mySection": {
    "title": "My Title",
    "description": "My description"
  }
}
```

### Paso 2: Usar en HTML

```html
<h2 data-i18n="mySection.title">Mi Título</h2>
<p data-i18n="mySection.description">Mi descripción</p>
```

## 🔧 Configuración Avanzada

### Cambiar idioma por defecto:

```javascript
// En i18n.js
this.defaultLanguage = 'en'; // Cambiar de 'es' a 'en'
```

### Agregar nuevo idioma:

1. Crear archivo `webapp/i18n/locales/fr.json`
2. Agregar código a la lista de idiomas soportados:

```javascript
// En i18n.js
this.supportedLanguages = ['es', 'en', 'pt', 'de', 'fr'];
```

### Interpolación de variables:

```json
{
  "greeting": "Hola {{name}}, tienes {{count}} mensajes"
}
```

```javascript
const text = window.i18n.t('greeting', {
  name: 'Juan',
  count: 5
});
// "Hola Juan, tienes 5 mensajes"
```

## 🎨 Personalizar Selector de Idioma

Editar `webapp/js/language-selector.js` para cambiar:

- Estilos CSS
- Posición del dropdown
- Animaciones
- Banderas personalizadas

## 📊 Estructura de Traducciones

Organización recomendada en archivos JSON:

```json
{
  "meta": {
    "language": "Nombre del idioma",
    "code": "es",
    "flag": "🇪🇸"
  },

  "common": {
    "welcome": "...",
    "login": "...",
    ...
  },

  "nav": { ... },
  "home": { ... },
  "auth": { ... },
  "profile": { ... },
  "errors": { ... },
  "success": { ... }
}
```

## 🐛 Debugging

### Ver traducciones cargadas:

```javascript
console.log(window.i18n.exportCurrentTranslations());
```

### Ver idioma detectado:

```javascript
console.log(window.i18n.detectBrowserLanguage());
```

### Limpiar caché:

```javascript
localStorage.removeItem('preferredLanguage');
location.reload();
```

## 🚀 Deploy

No requiere configuración adicional. Los archivos se sirven estáticamente.

Asegúrate de que los archivos JSON estén en:
```
https://tu-dominio.com/webapp/i18n/locales/es.json
https://tu-dominio.com/webapp/i18n/locales/en.json
https://tu-dominio.com/webapp/i18n/locales/pt.json
https://tu-dominio.com/webapp/i18n/locales/de.json
```

## 📈 Próximos Pasos

- [x] Español (es)
- [x] Inglés (en)
- [x] Portugués (pt)
- [x] Alemán (de)
- [x] Francés (fr)
- [ ] Sistema de traducción automática (Google Translate API)
- [ ] Panel admin para editar traducciones
- [ ] Soporte para plurales complejos
- [ ] RTL (Right-to-Left) para árabe/hebreo

## 📄 Licencia

Parte del proyecto TuCitaSegura - Todos los derechos reservados.

---

**Desarrollado por:** TuCitaSegura Team  
**Versión:** 1.0.0  
**Última actualización:** Enero 2026
