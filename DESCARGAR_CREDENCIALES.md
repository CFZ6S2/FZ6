# 🔑 Descargar Credenciales de Firebase Admin

El script necesita credenciales de Firebase Admin SDK para crear usuarios. Sigue estos pasos:

## 📥 Paso 1: Descargar Service Account Key

### Opción A: Desde Firebase Console (Recomendado)

1. Ve a: https://console.firebase.google.com/project/tuscitasseguras-2d1a6/settings/serviceaccounts/adminsdk

2. Click en "**Generate new private key**" (Generar nueva clave privada)

3. Confirma en el diálogo que aparece

4. Se descargará un archivo JSON (ejemplo: `tuscitasseguras-2d1a6-firebase-adminsdk-xxxxx.json`)

5. **Renombra** el archivo a: `serviceAccountKey.json`

6. **Mueve** el archivo a la raíz del proyecto FZ6:
   ```
   C:\Users\cesar\Documents\GitHub\FZ6\serviceAccountKey.json
   ```

### Opción B: Desde Google Cloud Console

1. Ve a: https://console.cloud.google.com/iam-admin/serviceaccounts?project=tuscitasseguras-2d1a6

2. Busca la cuenta: `firebase-adminsdk-fbsvc@tuscitasseguras-2d1a6.iam.gserviceaccount.com`

3. Click en los tres puntos (⋮) → "Manage keys"

4. Click "Add Key" → "Create new key"

5. Selecciona "JSON" → "Create"

6. Renombra a `serviceAccountKey.json` y mueve a raíz del proyecto

---

## 🚀 Paso 2: Ejecutar el Script

Una vez que tengas el archivo `serviceAccountKey.json` en la raíz:

```powershell
# Desde C:\Users\cesar\Documents\GitHub\FZ6
node scripts/create-admins-batch.js
```

El script automáticamente encontrará y usará las credenciales.

---

## 🔒 Seguridad IMPORTANTE

### ⚠️ NUNCA commits el archivo de credenciales

El archivo `serviceAccountKey.json` ya está en `.gitignore`, pero verifica:

```powershell
# Verificar que está ignorado
git status
# No debe aparecer serviceAccountKey.json
```

Si aparece:
```powershell
# Agregar a .gitignore
echo serviceAccountKey.json >> .gitignore
git add .gitignore
git commit -m "chore: add serviceAccountKey.json to gitignore"
```

---

## ✅ Verificar que Funciona

Después de descargar las credenciales:

```powershell
# Test rápido
node scripts/create-admin.js --help
```

Deberías ver el menú de ayuda sin errores.

---

## 📋 Estructura Esperada

```
FZ6/
├── serviceAccountKey.json       ← Tu archivo aquí (NO commitear)
├── scripts/
│   ├── create-admin.js
│   └── create-admins-batch.js
├── .gitignore                   ← Debe incluir serviceAccountKey.json
└── README.md
```

---

## 🔍 Troubleshooting

### Error: "Credential implementation failed"

Significa que el archivo de credenciales no es válido o está en el lugar incorrecto.

**Solución:**
1. Re-descarga el service account key
2. Verifica que se llame exactamente `serviceAccountKey.json`
3. Verifica que esté en la raíz: `C:\Users\cesar\Documents\GitHub\FZ6\serviceAccountKey.json`

### Error: "Permission denied"

El archivo no tiene permisos de lectura.

**Solución:**
```powershell
# Windows: Click derecho → Properties → Security → asegura que tu usuario tenga "Read"
```

### Error: "File not found"

El archivo no está donde el script lo busca.

**Solución:**
```powershell
# Verificar ubicación
ls serviceAccountKey.json

# Debe mostrar el archivo
# Si no, muévelo a la raíz del proyecto
```

---

## 🎯 Alternativa: Usar Firebase CLI Credentials

Si no quieres descargar el service account key, puedes intentar usar las credenciales de Firebase CLI:

```powershell
# Asegúrate de estar logueado
firebase login

# Luego intenta ejecutar el script
# El script intentará usar Application Default Credentials
node scripts/create-admins-batch.js
```

**Nota**: Esto puede no funcionar siempre, el service account key es más confiable.

---

## 📚 Enlaces Útiles

- Firebase Console - Service Accounts: https://console.firebase.google.com/project/tuscitasseguras-2d1a6/settings/serviceaccounts/adminsdk
- Google Cloud IAM: https://console.cloud.google.com/iam-admin/serviceaccounts?project=tuscitasseguras-2d1a6
- Documentación de Admin SDK: https://firebase.google.com/docs/admin/setup
