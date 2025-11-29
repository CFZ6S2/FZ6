# 👤 Crear Cuentas de Administrador - TuCitaSegura

Este documento explica cómo crear cuentas de administrador para cesar.herrera.rojo@gmail.com (o cualquier otro email).

---

## 🎯 Métodos Disponibles

Hay **3 métodos** para crear una cuenta de administrador:

1. **[Método 1: Cloud Function HTTP](#método-1-cloud-function-http)** ⭐ **RECOMENDADO** - Más rápido, no requiere credenciales locales
2. **[Método 2: Script Node.js Local](#método-2-script-nodejs-local)** - Requiere credenciales de Firebase
3. **[Método 3: Python Script](#método-3-python-script)** - Requiere credenciales de Firebase

---

## 🚀 Método 1: Cloud Function HTTP (RECOMENDADO)

Este método usa una Cloud Function que ya está en el código y solo necesita ser desplegada.

### Paso 1: Configurar el Secreto de Admin

**Opción A: Usando Firebase CLI (Local)**

```bash
# Instalar Firebase CLI si no lo tienes
npm install -g firebase-tools

# Login a Firebase
firebase login

# Configurar el secreto
firebase functions:config:set admin.bootstrap_secret="TU_SECRETO_SEGURO_AQUI_123"

# Ejemplo:
firebase functions:config:set admin.bootstrap_secret="MiSecreto2025!XYZ"
```

**Opción B: Usando variable de entorno (Railway o similares)**

Si estás desplegando las Cloud Functions en Railway u otro servicio, configura la variable de entorno:

```env
ADMIN_BOOTSTRAP_SECRET=TU_SECRETO_SEGURO_AQUI_123
```

⚠️ **IMPORTANTE**: Guarda este secreto en un lugar seguro. Lo necesitarás para crear el admin.

### Paso 2: Desplegar la Cloud Function

```bash
# Asegúrate de estar en el directorio raíz del proyecto
cd /home/user/FZ6

# Desplegar SOLO la función createFirstAdmin
firebase deploy --only functions:createFirstAdmin
```

Si quieres desplegar todas las funciones:

```bash
firebase deploy --only functions
```

Espera a que el despliegue termine. Verás un URL como:
```
https://us-central1-tuscitasseguras-2d1a6.cloudfunctions.net/createFirstAdmin
```

### Paso 3: Llamar a la Cloud Function

**Opción A: Usando curl (Linux/Mac/Windows PowerShell)**

```bash
curl -X POST \
  https://us-central1-tuscitasseguras-2d1a6.cloudfunctions.net/createFirstAdmin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "cesar.herrera.rojo@gmail.com",
    "adminSecret": "TU_SECRETO_SEGURO_AQUI_123"
  }'
```

**Opción B: Usando JavaScript (desde el navegador o Node.js)**

```javascript
fetch('https://us-central1-tuscitasseguras-2d1a6.cloudfunctions.net/createFirstAdmin', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'cesar.herrera.rojo@gmail.com',
    adminSecret: 'TU_SECRETO_SEGURO_AQUI_123'
  })
})
.then(res => res.json())
.then(data => console.log(data))
.catch(err => console.error('Error:', err));
```

**Opción C: Usando Postman o Insomnia**

1. Método: `POST`
2. URL: `https://us-central1-tuscitasseguras-2d1a6.cloudfunctions.net/createFirstAdmin`
3. Headers: `Content-Type: application/json`
4. Body (raw JSON):
```json
{
  "email": "cesar.herrera.rojo@gmail.com",
  "adminSecret": "TU_SECRETO_SEGURO_AQUI_123"
}
```

### Paso 4: Verificar el Resultado

Si todo salió bien, recibirás una respuesta como:

```json
{
  "success": true,
  "message": "Administrador creado exitosamente",
  "user": {
    "uid": "abc123...",
    "email": "cesar.herrera.rojo@gmail.com",
    "role": "admin"
  },
  "note": "Usuario creado con contraseña temporal. Usa 'Olvidé mi contraseña' para establecer una nueva."
}
```

### Paso 5: Configurar Contraseña

1. Ve a la página de login: https://tuscitasseguras.web.app/login
2. Click en **"Olvidé mi contraseña"**
3. Ingresa: `cesar.herrera.rojo@gmail.com`
4. Revisa tu correo electrónico
5. Sigue el enlace y establece una nueva contraseña

### Paso 6: ¡Listo!

Inicia sesión y verifica que tienes acceso al panel de administración.

---

## 💻 Método 2: Script Node.js Local

Este método requiere que tengas las credenciales de Firebase descargadas localmente.

### Paso 1: Obtener Credenciales de Firebase

1. Ve a: https://console.firebase.google.com/project/tuscitasseguras-2d1a6/settings/serviceaccounts/adminsdk
2. Click en **"Generar nueva clave privada"**
3. Descarga el archivo JSON
4. Guárdalo como: `backend/firebase-credentials.json`

⚠️ **SEGURIDAD**: Este archivo contiene credenciales sensibles. NUNCA lo subas a Git.

### Paso 2: Instalar Dependencias

```bash
cd /home/user/FZ6/functions
npm install
```

### Paso 3: Ejecutar el Script

```bash
cd /home/user/FZ6
node scripts/create-admin.js cesar.herrera.rojo@gmail.com
```

### Paso 4: Verificar

El script mostrará el progreso y te dirá si fue exitoso. Sigue las instrucciones en pantalla.

---

## 🐍 Método 3: Python Script

Similar al Método 2 pero usando Python.

### Paso 1: Obtener Credenciales

(Mismo que Método 2, Paso 1)

### Paso 2: Instalar Dependencias

```bash
pip install firebase-admin
```

### Paso 3: Ejecutar el Script

```bash
cd /home/user/FZ6
python3 scripts/firebase-token-builder.py create-user cesar.herrera.rojo@gmail.com --role admin
```

---

## ✅ Verificación Final

Para verificar que el usuario es admin:

### Opción 1: Firebase Console

1. Ve a: https://console.firebase.google.com/project/tuscitasseguras-2d1a6/authentication/users
2. Busca: `cesar.herrera.rojo@gmail.com`
3. Click en el usuario
4. Ve a la pestaña **"Custom claims"**
5. Debe mostrar: `{"role":"admin","gender":"masculino"}`

### Opción 2: Firestore Console

1. Ve a: https://console.firebase.google.com/project/tuscitasseguras-2d1a6/firestore
2. Abre la colección `users`
3. Busca el documento con email `cesar.herrera.rojo@gmail.com`
4. Verifica que `userRole: "admin"`

### Opción 3: Webapp

1. Inicia sesión en: https://tuscitasseguras.web.app
2. Deberías ver opciones de administración en el menú
3. Deberías poder acceder a `/admin` o rutas similares

---

## 🔒 Seguridad

### ⚠️ IMPORTANTE: Eliminar la Cloud Function Después

Una vez que hayas creado tu(s) admin(s), **ES CRÍTICO** que elimines o deshabilites la función `createFirstAdmin`:

**Opción A: Eliminar la función**

```bash
firebase functions:delete createFirstAdmin
```

**Opción B: Comentar la exportación en `functions/index.js`**

```javascript
// ❌ Deshabilitar después de usar
// exports.createFirstAdmin = functions.https.onRequest(async (req, res) => {
//   ...
// });
```

Luego redesplegar:

```bash
firebase deploy --only functions
```

### Rotar el Secreto

Si sospechas que el secreto fue comprometido:

```bash
# Cambiar el secreto
firebase functions:config:set admin.bootstrap_secret="NUEVO_SECRETO_DIFERENTE"

# Redesplegar
firebase deploy --only functions:createFirstAdmin
```

---

## 🆘 Troubleshooting

### Error: "Secreto de administrador inválido"

**Solución**: Verifica que estés usando el secreto correcto. Debe coincidir exactamente con el que configuraste en `admin.bootstrap_secret`.

### Error: "Firebase credentials not found"

**Solución**:
- Asegúrate de que `backend/firebase-credentials.json` existe
- O configura: `export FIREBASE_PRIVATE_KEY_PATH=/ruta/al/archivo.json`

### Error: "Permission denied"

**Solución**: Verifica que la cuenta de servicio tenga los permisos correctos en Firebase.

### Error: "auth/invalid-email"

**Solución**: Verifica que el email sea válido y esté bien escrito.

### La función no existe o retorna 404

**Solución**:
- Verifica que desplegaste la función: `firebase deploy --only functions:createFirstAdmin`
- Verifica la URL de la función en Firebase Console

---

## 📚 Archivos Relacionados

- **Cloud Function**: `/home/user/FZ6/functions/index.js` (líneas 436-542)
- **Script Node.js**: `/home/user/FZ6/scripts/create-admin.js`
- **Script Python**: `/home/user/FZ6/scripts/firebase-token-builder.py`
- **Documentación Firebase**: `/home/user/FZ6/FIREBASE_KEY_SETUP.md`

---

## 📧 Crear Más Admins en el Futuro

Una vez que ya tengas un admin (por ejemplo, cesar.herrera.rojo@gmail.com), puedes crear más admins de forma segura usando la webapp o la Cloud Function `updateUserClaims`:

```javascript
// Desde la webapp como admin autenticado
const functions = firebase.functions();
const updateClaims = functions.httpsCallable('updateUserClaims');

await updateClaims({
  userId: 'uid_del_nuevo_admin',
  role: 'admin',
  gender: 'masculino'
});
```

---

**Creado**: 29 de noviembre de 2025
**Última actualización**: 29 de noviembre de 2025
**Versión**: 1.0
