# 🔑 Configuración de Clave Firebase Admin SDK

## 📍 Tu Archivo de Clave

**Ubicación actual**: `C:\Users\cesar\Downloads\tuscitasseguras-2d1a6-firebase-adminsdk-fbsvc-f0911503af.json`

**Cuenta de servicio**: `firebase-adminsdk-fbsvc@tuscitasseguras-2d1a6.iam.gserviceaccount.com`

---

## 🖥️ PASO 1: Configuración para Desarrollo Local

### 1.1 Copiar el archivo al proyecto

```powershell
# Desde PowerShell en Windows
Copy-Item "C:\Users\cesar\Downloads\tuscitasseguras-2d1a6-firebase-adminsdk-fbsvc-f0911503af.json" -Destination "C:\Users\cesar\ruta\a\FZ6\backend\firebase-credentials.json"
```

⚠️ **IMPORTANTE**: Reemplaza `C:\Users\cesar\ruta\a\FZ6` con la ruta real de tu proyecto

### 1.2 Verificar que el archivo NO se suba a Git

El archivo `.gitignore` ya está configurado para ignorar `firebase-credentials.json`:
```
# backend/.gitignore
firebase-credentials.json
```

### 1.3 Configurar variable de entorno local

Crea o edita `backend/.env` (para desarrollo local):

```env
# Firebase Admin SDK
GOOGLE_APPLICATION_CREDENTIALS=./firebase-credentials.json

# O alternativamente, usa el contenido del JSON directamente
# SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"tuscitasseguras-2d1a6",...}
```

---

## ☁️ PASO 2: Configuración para Railway (Producción)

### 2.1 Convertir JSON a una sola línea

**En PowerShell**:
```powershell
# Leer el archivo y convertir a una sola línea
$json = Get-Content "C:\Users\cesar\Downloads\tuscitasseguras-2d1a6-firebase-adminsdk-fbsvc-f0911503af.json" -Raw | ConvertFrom-Json | ConvertTo-Json -Compress
$json | Set-Clipboard
Write-Host "✅ JSON copiado al portapapeles"
```

**Alternativamente**, abre el archivo con Notepad y:
1. Elimina todos los saltos de línea
2. Debe quedar en una sola línea: `{"type":"service_account","project_id":"tuscitasseguras-2d1a6",...}`
3. Copia todo el contenido

### 2.2 Configurar en Railway

1. Ve a: https://railway.app (inicia sesión)
2. Selecciona tu proyecto backend
3. Ve a **Variables**
4. Busca o crea la variable: `SERVICE_ACCOUNT_JSON`
5. Pega el JSON de una sola línea
6. Guarda cambios
7. Railway redesplegará automáticamente

---

## 🔒 PASO 3: Borrar Claves Antiguas (Seguridad)

Una vez que la nueva clave esté funcionando:

1. Ve a: https://console.cloud.google.com/iam-admin/serviceaccounts?project=tuscitasseguras-2d1a6

2. Selecciona: `firebase-adminsdk-fbsvc@tuscitasseguras-2d1a6.iam.gserviceaccount.com`

3. Click en tab **CLAVES**

4. **CONSERVA** solo:
   - `f0911503af` (la nueva que acabas de descargar)

5. **BORRA** las otras 9-10 claves antiguas:
   - Click en "⋮" (tres puntos) → "Eliminar"
   - Confirma la eliminación

---

## ✅ PASO 4: Verificar que Funciona

### 4.1 Verificación Local

```bash
cd backend
python -c "from auth_utils import firebase_initialized; print('✅ Firebase inicializado' if firebase_initialized else '❌ Error')"
```

### 4.2 Verificación en Railway

1. Ve a tu Railway dashboard
2. Abre los logs del backend
3. Busca el mensaje: `✅ Firebase Admin SDK initialized from JSON variable`

### 4.3 Prueba de Endpoint Protegido

```bash
# Prueba un endpoint que requiere autenticación
curl https://tu-backend.railway.app/api/v1/validation/health
```

---

## 🗑️ PASO 5: Eliminar Archivo de Descargas

Una vez configurado:

```powershell
# Borrar el archivo de descargas (ya no lo necesitas)
Remove-Item "C:\Users\cesar\Downloads\tuscitasseguras-2d1a6-firebase-adminsdk-fbsvc-f0911503af.json"

# Vaciar papelera de reciclaje (opcional)
Clear-RecycleBin -Force
```

⚠️ **IMPORTANTE**: Solo borra el archivo después de verificar que todo funciona

---

## 🔄 Rotación de Claves (Futuro)

Debes rotar esta clave cada **90 días máximo**:

1. Crear nueva clave en GCP Console
2. Configurar la nueva clave en Railway Y local
3. Verificar que funciona
4. Borrar la clave antigua
5. Actualizar este documento con la nueva fecha

**Próxima rotación**: **27 de febrero de 2026**

---

## 🆘 Troubleshooting

### Error: "Firebase credentials not found"

**Solución**:
- Verifica que `SERVICE_ACCOUNT_JSON` está configurado en Railway
- O que `GOOGLE_APPLICATION_CREDENTIALS` apunta al archivo correcto en local

### Error: "Invalid service account JSON"

**Solución**:
- Asegúrate de que el JSON está en UNA sola línea (sin saltos)
- No debe tener espacios extra ni caracteres especiales
- Debe empezar con `{` y terminar con `}`

### Error: "Permission denied"

**Solución**:
- Verifica que la cuenta `firebase-adminsdk-fbsvc` tiene los roles correctos
- Revisa en: https://console.cloud.google.com/iam-admin/iam?project=tuscitasseguras-2d1a6

---

## 📚 Referencias

- **Backend**: `/home/user/FZ6/backend/auth_utils.py` (líneas 17-49)
- **Variables de entorno**: `/home/user/FZ6/backend/.env.example`
- **Documentación Firebase**: https://firebase.google.com/docs/admin/setup

---

**Creado**: 29 de noviembre de 2025
**Clave ID**: f0911503af
**Próxima revisión**: 27 de febrero de 2026
