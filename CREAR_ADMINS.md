# 🔐 Crear Cuentas de Administrador

## Instrucciones Rápidas

### 1. Pull los Cambios

```bash
git checkout claude/final-security-fixes-01BjGpKGPPPQ99KhLtREzxiA
git pull origin claude/final-security-fixes-01BjGpKGPPPQ99KhLtREzxiA
```

### 2. Crear las 3 Cuentas Admin

```bash
# Ejecutar desde la raíz del proyecto FZ6
node scripts/create-admins-batch.js
```

Este comando creará automáticamente los 3 administradores:

1. ✅ **cesar.herrera.rojo@gmail.com** (masculino, admin)
2. ✅ **gonzalo.hrrj@gmail.com** (masculino, admin)
3. ✅ **lacasitadebarajas@gmail.com** (femenino, admin)

---

## ⚡ Qué Hace el Script

### Para cada email:

1. Crea el usuario en Firebase Authentication (si no existe)
2. Establece custom claims: `{ role: 'admin', gender: 'masculino' }`
3. Crea/actualiza documento en Firestore: `/usuarios/{uid}`
4. Verifica el email automáticamente

### Si el usuario ya existe:

- Actualiza los custom claims a admin
- No crea duplicados
- Muestra advertencia en el resumen

---

## 📋 Ejemplo de Output

```bash
═══════════════════════════════════════════════════
  Creación de Administradores en Batch
  TuCitaSegura
═══════════════════════════════════════════════════

📋 Total de administradores a crear: 3

[1/3] Procesando: cesar.herrera.rojo@gmail.com
──────────────────────────────────────────────────
🔧 Iniciando creación de usuario admin...
📧 Email: cesar.herrera.rojo@gmail.com
🔑 Password: (auto-generado)
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

[2/3] Procesando: gonzalo.hrrj@gmail.com
...

[3/3] Procesando: lacasitadebarajas@gmail.com
...

═══════════════════════════════════════════════════
  RESUMEN DE CREACIÓN DE ADMINISTRADORES
═══════════════════════════════════════════════════

✅ Creados exitosamente (3):
   ✓ cesar.herrera.rojo@gmail.com
     UID: abc123xyz456
   ✓ gonzalo.hrrj@gmail.com
     UID: def456ghi789
   ✓ lacasitadebarajas@gmail.com
     UID: jkl789mno012

═══════════════════════════════════════════════════

📝 PASOS SIGUIENTES:

1. Los usuarios pueden iniciar sesión en:
   https://tucitasegura.com/webapp/login.html

2. Si no especificaste password, deben usar "Olvidé mi contraseña"
   para establecer su password inicial

3. Verificar permisos de admin en la consola del navegador:
   const token = await firebase.auth().currentUser.getIdTokenResult();
   console.log(token.claims.role); // Debe mostrar: "admin"

🎉 Proceso completado: 3/3 administradores listos
```

---

## 🔑 Establecer Contraseñas

Los usuarios creados necesitarán establecer su contraseña:

### Opción 1: Reseteo de Contraseña (Recomendado)

1. Ir a https://tucitasegura.com/webapp/login.html
2. Click en "¿Olvidaste tu contraseña?"
3. Ingresar su email
4. Revisar email de Firebase
5. Establecer nueva contraseña

### Opción 2: Crear con Password Específico

Si prefieres establecer passwords manualmente:

```bash
# Un admin a la vez con password
node scripts/create-admin.js cesar.herrera.rojo@gmail.com MiPassword123! masculino
node scripts/create-admin.js gonzalo.hrrj@gmail.com OtraPass456! masculino
node scripts/create-admin.js lacasitadebarajas@gmail.com Password789! femenino
```

---

## 🛡️ Permisos de Admin

Una vez creados, los admins tendrán:

### ✅ Firestore
- Leer, escribir, eliminar cualquier colección
- Gestionar usuarios, matches, citas
- Ver datos sensibles y logs

### ✅ Storage
- Acceso a todas las fotos y documentos
- Ver archivos privados de usuarios

### ✅ Cloud Functions
- Llamar funciones administrativas
- Actualizar custom claims de otros usuarios
- Analizar fraude y seguridad

### ✅ Dashboard Admin
- Panel de control en `/webapp/admin/dashboard.html`
- Estadísticas completas
- Gestión de reportes

---

## 🔍 Verificar Creación

### Listar todos los admins:

```bash
node scripts/create-admin.js --list
```

### Verificar en Firebase Console:

1. Ir a [Firebase Console - Authentication](https://console.firebase.google.com/project/tuscitasseguras-2d1a6/authentication/users)
2. Buscar los emails
3. Click en cada usuario
4. Verificar custom claims: `{ role: 'admin', gender: 'masculino' }`

### Verificar después de login:

```javascript
// En consola del navegador después de iniciar sesión
const user = firebase.auth().currentUser;
const token = await user.getIdTokenResult();

console.log('Email:', user.email);
console.log('Role:', token.claims.role);      // Debe ser: "admin"
console.log('Gender:', token.claims.gender);  // Debe ser: "masculino"
```

---

## 🚨 Troubleshooting

### Error: "Module not found"
```bash
cd functions
npm install
cd ..
node scripts/create-admins-batch.js
```

### Error: "Permission denied"
```bash
# Asegúrate de estar autenticado con Firebase
firebase login
```

### Los permisos no se reflejan
Los usuarios deben:
1. Cerrar sesión completamente
2. Iniciar sesión de nuevo
3. Los nuevos claims estarán activos

### Script no hace nada
```bash
# Verifica que estés en la raíz del proyecto
pwd  # Debe mostrar: .../FZ6

# Verifica que el script existe
ls -la scripts/create-admins-batch.js
```

---

## 📚 Documentación Completa

Para más opciones y detalles: `scripts/README.md`

Para crear admins individuales: `node scripts/create-admin.js --help`
