# 🚀 Cómo Desplegar la Página de Admin Login

## Pasos Rápidos (2 minutos)

### 1️⃣ Abre tu terminal en el proyecto

```powershell
# En Windows PowerShell
cd C:\Users\cesar\ruta\a\FZ6

# O en Mac/Linux
cd /ruta/a/FZ6
```

### 2️⃣ Pull los últimos cambios

```bash
git pull origin claude/create-admin-accounts-01LkTEd7vr1HCgfaW11nZbtv
```

### 3️⃣ Login a Firebase (solo la primera vez)

```bash
firebase login
```

Esto abrirá tu navegador para autenticarte con Google.

### 4️⃣ Desplegar solo Hosting

```bash
firebase deploy --only hosting
```

Espera 30-60 segundos mientras despliega.

### 5️⃣ ¡Listo! Accede a la página

Una vez completado, verás algo como:

```
✔  Deploy complete!

Project Console: https://console.firebase.google.com/project/tuscitasseguras-2d1a6/overview
Hosting URL: https://tuscitasseguras-2d1a6.web.app
```

**Entonces accede a:**
```
https://tuscitasseguras-2d1a6.web.app/webapp/admin-login.html
```

---

## 🔑 Credenciales de Administrador

Una vez que la página cargue:

**Emails:**
- cesar.herrera.rojo@gmail.com
- lacasitadebarajas@gmail.com
- gonzalo.hrrj@gmail.com

**Contraseña (para los 3):**
```
AdminTuCita2025!Seguro
```

---

## ⚡ Alternativa: Acceso Inmediato Sin Deploy

Si no quieres esperar al deploy, puedes abrir el archivo localmente:

**Windows:**
```powershell
start webapp\admin-login.html
```

**Mac/Linux:**
```bash
open webapp/admin-login.html
```

El archivo funcionará perfectamente desde `file://` porque solo usa Firebase Client SDK.

---

## 🆘 Troubleshooting

### Error: "firebase: command not found"

Instala Firebase CLI:
```bash
npm install -g firebase-tools
```

### Error: "Permission denied"

Ejecuta con privilegios de administrador o usa:
```bash
sudo firebase deploy --only hosting
```

### Error: "Failed to authenticate"

Ejecuta primero:
```bash
firebase login
firebase use tuscitasseguras-2d1a6
firebase deploy --only hosting
```

---

## 📝 Notas

- El deploy solo afecta a Hosting, no toca Functions ni Firestore
- Toma 30-60 segundos en desplegar
- La página bypasea Firebase App Check para permitir login durante throttling
- Una vez desplegado, estará disponible para siempre en esa URL

---

**¡Listo para desplegar!** 🚀
