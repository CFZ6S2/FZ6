# 🚀 Guía de Deploy - TuCitaSegura

## 📋 Prerequisitos

Antes de hacer deploy, asegúrate de tener:

1. **Node.js instalado** (v14 o superior)
   ```bash
   node --version
   ```

2. **Firebase CLI instalado**
   ```bash
   npm install -g firebase-tools
   ```

3. **Cuenta de Firebase con acceso al proyecto** `tuscitasseguras-2d1a6`

---

## 🔐 Paso 1: Autenticación

### Primera vez

Si es tu primera vez haciendo deploy:

```bash
firebase login
```

Esto abrirá tu navegador para autenticarte con Google.

### Verificar autenticación

```bash
firebase projects:list
```

Deberías ver `tuscitasseguras-2d1a6` en la lista.

---

## 📦 Paso 2: Deploy

### Opción A: Usando el script (Recomendado)

```bash
./deploy.sh
```

### Opción B: Comando manual

```bash
firebase deploy --only hosting
```

---

## 🌐 Paso 3: Acceder a la Aplicación

Una vez completado el deploy, tu aplicación estará disponible en:

- **URL Principal:** https://tuscitasseguras-2d1a6.web.app
- **URL Alternativa:** https://tuscitasseguras-2d1a6.firebaseapp.com

---

## ⚠️ Configuración de App Check (IMPORTANTE)

En producción, App Check **ESTÁ ACTIVO**. Si ves errores 401 o problemas de autenticación:

### Solución:

1. Ve a Firebase Console:
   ```
   https://console.firebase.google.com/project/tuscitasseguras-2d1a6/appcheck
   ```

2. En la pestaña **"APIs"**, configura cada servicio en modo **"Unenforced"**:
   - ✅ Firebase Authentication → **Unenforced**
   - ✅ Cloud Firestore → **Unenforced**
   - ✅ Cloud Storage → **Unenforced**

3. Guarda los cambios y recarga la aplicación

---

## ✅ Verificación Post-Deploy

### 1. Verificar que la app carga

Abre: https://tuscitasseguras-2d1a6.web.app

### 2. Verificar notificaciones

1. Abre la aplicación
2. Inicia sesión o regístrate
3. Acepta los permisos de notificaciones cuando se solicite
4. Verifica en la consola del navegador (F12):
   ```
   ✅ Push notifications initialized successfully
   [notifications.js] FCM Token obtained: ...
   ```

### 3. Probar funcionalidades

- ✅ Registro de usuarios
- ✅ Login
- ✅ Edición de perfil
- ✅ Búsqueda de usuarios
- ✅ Chat
- ✅ Notificaciones push

---

## 🔔 Probar Notificaciones Push

### Desde Firebase Console

1. Ve a: https://console.firebase.google.com/project/tuscitasseguras-2d1a6/messaging

2. Click en **"New campaign"** → **"Firebase Notification messages"**

3. Llena el formulario:
   - **Title:** Prueba de notificación
   - **Text:** ¡Las notificaciones funcionan! 🎉

4. **Target:** All users

5. **Publish**

### Verificar que funciona

- **App abierta:** Deberías ver una notificación in-app
- **App cerrada:** Deberías recibir una notificación del sistema

---

## 🐛 Troubleshooting

### Error: "Firebase CLI not found"

```bash
npm install -g firebase-tools
```

### Error: "Not authenticated"

```bash
firebase login
firebase projects:list  # Verificar
```

### Error: 401 Unauthorized

- App Check Enforcement está activado
- Sigue las instrucciones en "Configuración de App Check" arriba

### Error: "Permission denied"

- Verifica que tienes acceso al proyecto en Firebase Console
- Contacta al owner del proyecto para que te añada como colaborador

---

## 📝 Comandos Útiles

```bash
# Ver estado del proyecto
firebase projects:list

# Deploy solo hosting
firebase deploy --only hosting

# Deploy todo (hosting + rules + functions)
firebase deploy

# Ver logs
firebase hosting:channel:list

# Ver dominios configurados
firebase hosting:sites:list
```

---

## 🔄 Actualizar la Aplicación

Cuando hagas cambios en el código:

1. **Guarda tus cambios:**
   ```bash
   git add .
   git commit -m "tu mensaje"
   git push
   ```

2. **Haz deploy:**
   ```bash
   ./deploy.sh
   ```

3. **Limpia caché del navegador:**
   - Ctrl + Shift + R (o Cmd + Shift + R en Mac)

---

## 📊 Estado de la Configuración Actual

| Componente | Estado |
|------------|--------|
| Firebase Hosting | ✅ Configurado |
| VAPID Keys | ✅ Configuradas |
| Service Worker | ✅ Desplegado |
| App Check | ⚠️ Activo (configurar en Unenforced) |
| Notificaciones | ✅ Listas |

---

## 💬 Soporte

Si tienes problemas:

1. Revisa los logs en Firebase Console
2. Verifica la consola del navegador (F12)
3. Consulta `TROUBLESHOOTING.md`
4. Abre un issue en el repositorio

---

**Última actualización:** 2025-11-14  
**Deploy listo para:** Producción 🚀
