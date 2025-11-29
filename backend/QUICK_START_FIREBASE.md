# 🚀 Inicio Rápido - Configuración Firebase

## 📍 Tu Situación Actual

Tienes el archivo: `C:\Users\cesar\Downloads\tuscitasseguras-2d1a6-firebase-adminsdk-fbsvc-f0911503af.json`

Necesitas configurarlo para **desarrollo local** Y **producción (Railway)**

---

## ⚡ Opción 1: Configuración Automática (Recomendada)

### 🪟 Windows - PowerShell

```powershell
# 1. Abre PowerShell en la carpeta backend
cd C:\Users\cesar\ruta\a\FZ6\backend

# 2. Ejecuta el script de configuración
.\setup-firebase-key.ps1
```

**El script hará automáticamente:**
- ✅ Copiar el archivo al proyecto
- ✅ Crear archivo `.env` con la configuración correcta
- ✅ Preparar el JSON para Railway (lo copia al portapapeles)
- ✅ Verificar que todo esté correcto

**Tiempo:** ~30 segundos

---

## 📋 Opción 2: Configuración Manual

### Paso 1: Copiar archivo al proyecto

```powershell
# Copia el archivo a la carpeta backend
Copy-Item "C:\Users\cesar\Downloads\tuscitasseguras-2d1a6-firebase-adminsdk-fbsvc-f0911503af.json" `
          -Destination "C:\Users\cesar\ruta\a\FZ6\backend\firebase-credentials.json"
```

### Paso 2: Crear archivo .env

Crea `backend/.env` con:

```env
ENVIRONMENT=development
GOOGLE_APPLICATION_CREDENTIALS=./firebase-credentials.json
FIREBASE_PROJECT_ID=tuscitasseguras-2d1a6
PORT=8000
```

### Paso 3: Configurar Railway

1. Abre el archivo JSON con Notepad
2. Elimina TODOS los saltos de línea (debe quedar en 1 sola línea)
3. Copia todo el contenido
4. Ve a https://railway.app → Tu proyecto → Variables
5. Crea `SERVICE_ACCOUNT_JSON` y pega el contenido
6. Guarda

**Tiempo:** ~5 minutos

---

## ✅ Verificar Configuración

### Opción A: Script de Verificación (Recomendado)

```bash
# En la carpeta backend
python verify-firebase-setup.py
```

Verá:
- ✅ Variables de entorno
- ✅ Archivo de credenciales
- ✅ Formato JSON válido
- ✅ Inicialización de Firebase
- ✅ Seguridad (.gitignore)

### Opción B: Verificación Manual

```bash
# Iniciar el servidor
cd backend
uvicorn main:app --reload
```

Deberías ver:
```
✅ Firebase Admin SDK initialized from file: ./firebase-credentials.json
```

O si es Railway:
```
✅ Firebase Admin SDK initialized from JSON variable
```

---

## 🔒 Seguridad - IMPORTANTE

### Después de configurar todo:

1. **Borrar archivo de descargas:**
   ```powershell
   Remove-Item "C:\Users\cesar\Downloads\tuscitasseguras-2d1a6-firebase-adminsdk-fbsvc-f0911503af.json"
   ```

2. **Eliminar claves antiguas en GCP:**
   - Ve a: https://console.cloud.google.com/iam-admin/serviceaccounts?project=tuscitasseguras-2d1a6
   - Selecciona `firebase-adminsdk-fbsvc@tuscitasseguras-2d1a6.iam.gserviceaccount.com`
   - Tab **CLAVES**
   - **CONSERVA** solo: `f0911503af` (la nueva)
   - **BORRA** las otras 9-10 claves

3. **Verificar .gitignore:**
   ```bash
   # Esto NO debe mostrar firebase-credentials.json
   git status
   ```

---

## 🆘 Problemas Comunes

### "No se puede ejecutar scripts en este sistema"

**Windows PowerShell - Error de política de ejecución:**

```powershell
# Permitir ejecución temporal (solo para esta sesión)
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

# Luego ejecuta el script
.\setup-firebase-key.ps1
```

### "Firebase credentials not found"

**Solución:**
- Verifica que `firebase-credentials.json` existe en `backend/`
- Verifica que `.env` tiene `GOOGLE_APPLICATION_CREDENTIALS=./firebase-credentials.json`
- Ejecuta `python verify-firebase-setup.py`

### "Invalid service account JSON" (Railway)

**Solución:**
- El JSON debe estar en **1 sola línea** (sin saltos)
- No debe tener espacios extra al inicio/final
- Debe empezar con `{` y terminar con `}`
- Usa el script PowerShell que lo hace automáticamente

---

## 📚 Más Información

- **Guía Completa:** [FIREBASE_KEY_SETUP.md](FIREBASE_KEY_SETUP.md)
- **Código de autenticación:** [auth_utils.py](auth_utils.py) (líneas 17-49)
- **Variables ejemplo:** [.env.example](.env.example)

---

## 📞 Ayuda

Si algo no funciona:

1. ✅ Ejecuta `python verify-firebase-setup.py`
2. ✅ Lee los mensajes de error
3. ✅ Consulta FIREBASE_KEY_SETUP.md
4. ✅ Revisa los logs del servidor

---

**¡Listo!** En menos de 1 minuto deberías tener Firebase configurado 🎉
