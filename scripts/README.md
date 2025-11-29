# Scripts de Administración

Scripts utilitarios para gestionar usuarios administradores y otras tareas administrativas.

## 🔐 Crear Usuarios Administradores

### Opción 1: Script Node.js (Recomendado)

#### Instalación

```bash
# Desde la raíz del proyecto
cd functions
npm install
cd ..
```

#### Uso Básico - Un Admin a la Vez

```bash
# Crear admin con password auto-generado
node scripts/create-admin.js admin@tucitasegura.com

# Crear admin con password específico
node scripts/create-admin.js cesar.herrera.rojo@gmail.com MiPassword123!

# Crear admin femenina con password
node scripts/create-admin.js admin@example.com SecurePass456! femenino

# Listar todos los administradores
node scripts/create-admin.js --list

# Ver ayuda
node scripts/create-admin.js --help
```

#### Uso Batch - Crear Múltiples Admins

Si necesitas crear varios administradores de una vez:

```bash
# Crear los 3 administradores principales de TuCitaSegura
node scripts/create-admins-batch.js
```

Este script creará automáticamente:
- ✅ cesar.herrera.rojo@gmail.com (masculino)
- ✅ gonzalo.hrrj@gmail.com (masculino)
- ✅ lacasitadebarajas@gmail.com (masculino)

**Nota**: Si los usuarios ya existen, el script actualizará sus claims a admin sin crear usuarios duplicados.

#### Lo que hace el script:

1. ✅ Crea el usuario en Firebase Authentication (si no existe)
2. ✅ Establece custom claims: `{ role: 'admin', gender: 'masculino/femenino' }`
3. ✅ Crea/actualiza el documento en Firestore `/usuarios/{uid}`
4. ✅ Verifica el email automáticamente
5. ✅ Muestra las credenciales para iniciar sesión

#### Ejemplos de Salida

```bash
$ node scripts/create-admin.js cesar.herrera.rojo@gmail.com AdminPass123! masculino

🔧 Iniciando creación de usuario admin...
📧 Email: cesar.herrera.rojo@gmail.com
🔑 Password: ****** (personalizado)
👤 Gender: masculino

✓ Nuevo usuario creado: abc123xyz456
✓ Custom claims establecidos:
  - role: admin
  - gender: masculino

✓ Documento de usuario creado en Firestore

═══════════════════════════════════════════════════
✅ USUARIO ADMIN CREADO EXITOSAMENTE
═══════════════════════════════════════════════════
📧 Email: cesar.herrera.rojo@gmail.com
🆔 UID: abc123xyz456
👤 Rol: admin
⚧️  Género: masculino
═══════════════════════════════════════════════════

📝 Pasos siguientes:
  1. Inicia sesión en https://tucitasegura.com/webapp/login.html
  2. Completa tu perfil si es necesario
  3. Tendrás acceso completo de administrador
```

### Opción 2: Script Python

Si prefieres usar Python, también está disponible `firebase-token-builder.py`:

```bash
# Instalar dependencias
pip install firebase-admin

# Crear usuario admin
python scripts/firebase-token-builder.py create-user admin@example.com --role admin --password MyPass123!

# Ver ayuda
python scripts/firebase-token-builder.py --help
```

### Opción 3: Firebase Console

1. Ve a [Firebase Console](https://console.firebase.google.com/project/tuscitasseguras-2d1a6/authentication/users)
2. Crea el usuario manualmente
3. Copia su UID
4. Ejecuta en la consola de Firebase Functions:

```javascript
const admin = require('firebase-admin');
admin.initializeApp();

// Reemplaza con el UID y datos del usuario
const userId = 'ABC123XYZ456';
await admin.auth().setCustomUserClaims(userId, { role: 'admin', gender: 'masculino' });
await admin.firestore().collection('usuarios').doc(userId).update({
  userRole: 'admin',
  gender: 'masculino'
});
console.log('Admin creado exitosamente');
```

## 🔍 Verificar Permisos de Admin

### Ver Custom Claims de un Usuario

```javascript
// En consola de Firebase o Cloud Functions
const admin = require('firebase-admin');
const user = await admin.auth().getUserByEmail('admin@tucitasegura.com');
console.log(user.customClaims);
// Output: { role: 'admin', gender: 'masculino' }
```

### Verificar desde el Frontend

```javascript
// En la consola del navegador después de iniciar sesión
const idTokenResult = await firebase.auth().currentUser.getIdTokenResult();
console.log('Role:', idTokenResult.claims.role);
console.log('Gender:', idTokenResult.claims.gender);
// Output: Role: admin, Gender: masculino
```

## 🛡️ Permisos de Administrador

Los usuarios con `role: 'admin'` tienen acceso completo:

### Firestore
- ✅ Leer, escribir y eliminar cualquier colección
- ✅ Gestionar usuarios, matches, citas
- ✅ Ver estadísticas y logs
- ✅ Acceder a datos sensibles

### Storage
- ✅ Ver todas las fotos de perfil
- ✅ Gestionar archivos de todos los usuarios
- ✅ Acceder a documentos privados

### Cloud Functions
- ✅ Llamar funciones administrativas
- ✅ Actualizar custom claims de otros usuarios
- ✅ Analizar fraude y seguridad
- ✅ Gestionar suscripciones y pagos

### Dashboard Admin
- ✅ Panel de control en `/webapp/admin/dashboard.html`
- ✅ Estadísticas de usuarios y actividad
- ✅ Gestión de reportes y moderación
- ✅ Configuración del sistema

## 📋 Roles Disponibles

El sistema soporta 3 roles:

| Rol | Descripción | Permisos |
|-----|-------------|----------|
| `regular` | Usuario estándar | Acceso básico, debe pagar membresía (masculino) |
| `admin` | Administrador | Acceso completo al sistema |
| `concierge` | Asistente/Moderador | Permisos especiales de gestión |

## 🚨 Seguridad

### Importante
- ⚠️ Solo crea admins de confianza
- ⚠️ Usa passwords fuertes (min 8 caracteres, mayúsculas, números, símbolos)
- ⚠️ No compartas las credenciales de admin
- ⚠️ Revisa regularmente la lista de admins con `--list`

### Revocar Permisos de Admin

```bash
# Opción 1: Con el script (próximamente)
node scripts/create-admin.js revoke admin@example.com

# Opción 2: Manualmente con Admin SDK
const admin = require('firebase-admin');
admin.initializeApp();

const userId = 'ABC123XYZ456';
await admin.auth().setCustomUserClaims(userId, { role: 'regular', gender: 'masculino' });
await admin.firestore().collection('usuarios').doc(userId).update({ userRole: 'regular' });
```

## 🐛 Troubleshooting

### Error: "ENOENT: no such file or directory"
```bash
# Asegúrate de estar en la raíz del proyecto
cd /path/to/FZ6
node scripts/create-admin.js ...
```

### Error: "auth/email-already-exists"
El usuario ya existe. El script lo detectará y solo actualizará los claims sin crear usuario nuevo.

### Error: "Permission denied"
Asegúrate de tener las credenciales de Firebase configuradas:
```bash
# Opción 1: Service Account Key
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/serviceAccountKey.json"

# Opción 2: Usar Firebase CLI (ya autenticado)
firebase login
```

### Los cambios no se reflejan
Después de cambiar custom claims, el usuario debe:
1. Cerrar sesión
2. Iniciar sesión nuevamente
3. El nuevo token incluirá los claims actualizados

## 📚 Documentación Adicional

- [Firebase Custom Claims](../docs/FIREBASE_CUSTOM_CLAIMS_SETUP.md)
- [Sistema de Roles](../docs/CLAUDE.md#roles-y-permisos)
- [Firestore Rules](../firestore.rules)
- [Storage Rules](../firebase-storage.rules)

## 🤝 Contacto

Si tienes problemas creando administradores:
1. Revisa los logs: `firebase functions:log`
2. Verifica las reglas de Firestore
3. Consulta la documentación de Firebase Auth
