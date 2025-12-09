# 🔥 Cómo Habilitar y Verificar Cloud Firestore

## ✅ Verificación: Firestore está habilitado

La base de datos Firestore **SÍ existe** en tu proyecto:
- **Proyecto:** `tucitasegura-129cc`
- **Base de datos:** `(default)`

---

## 🔍 Verificar en Firebase Console

### 1. Abre Firestore Database

Ve a: https://console.firebase.google.com/project/tucitasegura-129cc/firestore

### 2. Verifica que veas la base de datos

Deberías ver:
- Una pantalla con pestañas: "Data", "Indexes", "Rules", "Usage"
- En la pestaña "Data", deberías ver colecciones como `users`, `messages`, etc.

---

## ⚠️ Si NO ves la base de datos o está vacía

### Paso 1: Verificar que Firestore esté en modo Native

1. Ve a: https://console.firebase.google.com/project/tucitasegura-129cc/firestore/databases
2. Verifica que estés usando **Cloud Firestore** (no Realtime Database)
3. Si ves un mensaje para crear la base de datos, haz clic en **"Create database"**

### Paso 2: Seleccionar modo

- **Selecciona:** "Start in **production mode**" (o "test mode" para desarrollo)
- Haz clic en **"Next"**
- Selecciona la ubicación: **us-central1** (o la más cercana)
- Haz clic en **"Enable"**

### Paso 3: Verificar reglas

Después de crear la base de datos, las reglas deberían estar en:
https://console.firebase.google.com/project/tucitasegura-129cc/firestore/rules

---

## 📊 Verificar que los datos se están guardando

### Opción 1: Firebase Console

1. Ve a: https://console.firebase.google.com/project/tucitasegura-129cc/firestore/data
2. Busca la colección **`users`**
3. Deberías ver documentos con IDs de usuarios
4. Haz clic en un documento para ver sus datos

### Opción 2: Verificar desde el código

Abre la consola del navegador (F12) cuando guardes el perfil y verifica los logs:
- `💾 Guardando perfil en Firestore: {...}`
- `✅ Perfil guardado exitosamente en Firestore`

---

## 🐛 Si no se guarda nada

### Posibles causas:

1. **Reglas de Firestore bloqueando:**
   - Verifica: https://console.firebase.google.com/project/tucitasegura-129cc/firestore/rules
   - Debe permitir `update` si el usuario está autenticado

2. **Usuario no autenticado:**
   - Verifica en la consola: `currentUser` debe existir
   - Verifica que el usuario haya iniciado sesión

3. **Error silencioso:**
   - Abre DevTools (F12) → Console
   - Intenta guardar el perfil
   - Busca errores en rojo

---

## 🛠️ Crear una colección de prueba

Si quieres verificar que Firestore funciona:

1. Ve a: https://console.firebase.google.com/project/tucitasegura-129cc/firestore/data
2. Haz clic en **"Start collection"**
3. Nombre de colección: `test`
4. Documento ID: `test1`
5. Agrega un campo:
   - Campo: `message`
   - Tipo: `string`
   - Valor: `Hello Firestore`
6. Haz clic en **"Save"**

Si puedes crear esto, Firestore está funcionando correctamente.

---

## 📋 Verificar reglas de Firestore

Las reglas actuales permiten:

```javascript
// Para usuarios autenticados:
allow update: if isAuthed() && uid() == userId && ...
```

**Verifica:**
1. Ve a: https://console.firebase.google.com/project/tucitasegura-129cc/firestore/rules
2. Asegúrate de que las reglas estén publicadas
3. Si las reglas son muy restrictivas, puedes usar temporalmente:
   ```javascript
   // SOLO PARA TESTING - NO EN PRODUCCIÓN
   allow read, write: if request.auth != null;
   ```

---

## ✅ Checklist Final

- [ ] Firestore está habilitado
- [ ] Puedes ver la base de datos en Firebase Console
- [ ] Las reglas permiten escritura para usuarios autenticados
- [ ] El usuario está autenticado cuando intenta guardar
- [ ] No hay errores en la consola del navegador

---

## 🔗 Enlaces Útiles

- **Firestore Console:** https://console.firebase.google.com/project/tucitasegura-129cc/firestore
- **Firestore Rules:** https://console.firebase.google.com/project/tucitasegura-129cc/firestore/rules
- **Firestore Usage:** https://console.firebase.google.com/project/tucitasegura-129cc/firestore/usage

