# 🚀 Guía de Deployment a Loading.es

**Proyecto:** TuCitaSegura
**Dominio:** tucitasegura.com
**Hosting:** Loading.es
**Backend:** Firebase (Auth, Database, Storage)

---

## 📦 PASO 1: Descargar el Archivo ZIP

El archivo está listo en tu servidor:

```
tuscitasegura-loading.zip (254 KB)
```

**Descárgalo a tu computadora local.**

---

## 🌐 PASO 2: Acceder a Loading.es cPanel

1. **Abre el panel de control de loading.es:**
   ```
   https://cpanel.loading.es
   ```
   O el URL que te hayan dado

2. **Haz login** con tus credenciales de loading.es

---

## 📂 PASO 3: Ir al Administrador de Archivos

1. En cPanel, busca **"Administrador de archivos"** o **"File Manager"**

2. Click para abrir

3. Navega a la carpeta **`public_html`**
   - Esta es la carpeta raíz de tu sitio web
   - Si `tucitasegura.com` ya está configurado, puede estar en una subcarpeta

---

## 📤 PASO 4: Subir el ZIP

1. **Click en "Subir"** o **"Upload"** (arriba a la derecha)

2. **Selecciona el archivo:** `tuscitasegura-loading.zip`

3. **Espera** a que se suba completamente (254 KB, toma segundos)

4. **Cierra** la ventana de upload

---

## 📦 PASO 5: Descomprimir el ZIP

1. **En el File Manager**, busca `tuscitasegura-loading.zip`

2. **Click derecho** → **"Extract"** o **"Extraer"**

3. **Selecciona la carpeta destino:** `public_html`

4. **Click "Extract Files"**

5. **Verifica** que se crearon las carpetas:
   ```
   public_html/
   ├── index.html
   ├── webapp/
   │   ├── register.html
   │   ├── login.html
   │   ├── js/
   │   └── ...
   └── ...
   ```

6. **Elimina el ZIP** (ya no lo necesitas)

---

## 🌍 PASO 6: Configurar DNS (Si No Está Configurado)

Si `tucitasegura.com` aún no apunta a loading.es:

### Opción A: DNS de Loading.es

1. **Ve a la sección de dominios** en loading.es

2. **Añade** `tucitasegura.com` como dominio

3. Loading.es te dará **nameservers**, algo como:
   ```
   ns1.loading.es
   ns2.loading.es
   ```

4. **Ve al panel de tu registrador** (donde compraste tucitasegura.com)

5. **Cambia los nameservers** a los de loading.es

6. **Espera 24-48 horas** para propagación DNS

### Opción B: Solo Registro A

Si loading.es te dio una **IP fija**:

1. **Ve al panel DNS** de tu registrador

2. **Crea un registro A:**
   - Nombre: `@` (o en blanco)
   - Tipo: `A`
   - Valor: `IP de loading.es`
   - TTL: 3600

3. **Crea registro A para www:**
   - Nombre: `www`
   - Tipo: `A`
   - Valor: `IP de loading.es`
   - TTL: 3600

4. **Espera 1-4 horas** para propagación

---

## ✅ PASO 7: Probar el Sitio

### 7.1. Abrir el Sitio

```
https://tucitasegura.com
```

Si el DNS no está propagado aún, prueba con:
```
http://IP-DE-LOADING.es
```

### 7.2. Limpiar Navegador (IMPORTANTE)

**Antes de probar registro:**

1. **Modo incógnito:** `Ctrl + Shift + N`

2. **O limpia caché:** `Ctrl + Shift + Delete`
   - Cookies and site data
   - Cached files

3. **Cierra y reabre navegador**

### 7.3. Probar Registro

1. **Ve a:**
   ```
   https://tucitasegura.com/webapp/register.html
   ```

2. **Presiona F12** (Console)

3. **Verifica que NO hay:**
   - ❌ Errores de App Check
   - ❌ Errores 401
   - ❌ Errores 403

4. **Llena el formulario de registro**

5. **Click "Crear Cuenta"**

6. **✅ Debería funcionar SIN errores**

---

## 🔧 TROUBLESHOOTING

### Error: "Firebase is not defined"

**Causa:** Archivos no se subieron correctamente

**Solución:**
1. Verifica que `webapp/js/firebase-config.js` existe
2. Verifica que todos los archivos de `webapp/` están presentes

---

### Error: 401 o 403

**Causa:** Throttling guardado en tu navegador

**Solución:**
1. **Abre en modo incógnito:** `Ctrl + Shift + N`
2. **Ve a:** `https://tucitasegura.com/webapp/register.html`
3. **Prueba de nuevo**

---

### Sitio No Carga (404)

**Causa:** DNS no configurado o archivos en carpeta incorrecta

**Solución:**

1. **Verifica que `index.html` está en:**
   ```
   public_html/index.html
   ```
   No en:
   ```
   public_html/tuscitasegura/index.html  ❌
   ```

2. **Si el dominio tiene una carpeta específica:**
   - Busca en cPanel → Dominios → Ver configuración
   - Puede que `tucitasegura.com` apunte a `public_html/tucitasegura`
   - Sube los archivos ahí en vez de `public_html`

---

## 📋 CHECKLIST

Antes de declarar éxito, verifica:

- [ ] ✅ ZIP subido a loading.es
- [ ] ✅ ZIP extraído en la carpeta correcta
- [ ] ✅ `index.html` existe en la raíz
- [ ] ✅ Carpeta `webapp/` con todos los archivos
- [ ] ✅ DNS configurado (o usando IP temporal)
- [ ] ✅ Sitio carga en `tucitasegura.com`
- [ ] ✅ Console no muestra errores de App Check
- [ ] ✅ Registro de usuario funciona
- [ ] ✅ Login funciona
- [ ] ✅ No hay error 401

---

## 🎯 RESUMEN

**Hosting:** loading.es → `tucitasegura.com`
**Backend:** Firebase → Auth, Database, Storage
**Archivos:** HTML/CSS/JS en loading.es
**Conexión:** JavaScript se conecta a Firebase desde loading.es

**Ventajas:**
- ✅ Usas tu dominio principal
- ✅ Aprovechas Firebase (gratis hasta 50k usuarios)
- ✅ No reescribes código
- ✅ Escalable y seguro

---

## 🆘 AYUDA

Si tienes problemas:

1. **Verifica la estructura de archivos** en File Manager
2. **Mira la Console del navegador** (F12) para errores
3. **Usa modo incógnito** para evitar caché
4. **Espera propagación DNS** si acabas de cambiar

---

**¡Listo! Después de subir los archivos, tu sitio estará en tucitasegura.com!**
