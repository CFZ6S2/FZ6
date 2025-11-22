# 🔥 Firebase Auth - Guía Rápida de Configuración

**Proyecto Firebase:** `tuscitasseguras-2d1a6`
**Status Actual:** ❌ Disabled (faltan credenciales)
**Tiempo estimado:** 5 minutos

---

## ⚡ Configuración en 3 Pasos

### PASO 1: Descargar Credenciales de Firebase

1. **Abre Firebase Console:**
   ```
   https://console.firebase.google.com/project/tuscitasseguras-2d1a6/settings/serviceaccounts/adminsdk
   ```

2. **Genera una nueva clave privada:**
   - Scroll hasta "Firebase Admin SDK"
   - Click en el botón **"Generate New Private Key"**
   - Confirma en el diálogo que aparece
   - Se descargará un archivo JSON automáticamente

3. **El archivo se verá así:**
   ```
   tuscitasseguras-2d1a6-firebase-adminsdk-xxxxx-xxxxxxxxxx.json
   ```

---

### PASO 2: Convertir a Base64

**¿Por qué Base64?** Railway no permite subir archivos directamente, así que codificamos el JSON en una variable de entorno.

#### En Linux/Mac (Terminal):

```bash
cat tuscitasseguras-2d1a6-firebase-adminsdk-*.json | base64 -w 0
```

#### En Windows (PowerShell):

```powershell
$bytes = [System.IO.File]::ReadAllBytes("tuscitasseguras-2d1a6-firebase-adminsdk-xxxxx.json")
[Convert]::ToBase64String($bytes)
```

#### Online (si prefieres):

1. Ve a: https://www.base64encode.org/
2. Pega el contenido COMPLETO del JSON
3. Click en "Encode"
4. Copia el resultado

**⚠️ IMPORTANTE:**
- El resultado será un string LARGO (3000+ caracteres)
- Cópialo COMPLETO (desde la primera letra hasta la última)
- NO debe tener saltos de línea

---

### PASO 3: Agregar en Railway

1. **Abre Railway Dashboard:**
   ```
   https://railway.app/project/7ee71fb2-9561-4ad5-a752-89bc0c048f96/service/6b934edf-957d-450e-9688-9b81f654a7f1
   ```

2. **Ve a la pestaña "Variables"**

3. **Click en "+ New Variable"**

4. **Agrega la variable:**
   ```
   Name:  FIREBASE_SERVICE_ACCOUNT_B64
   Value: <pega_aqui_el_string_base64_COMPLETO>
   ```

5. **Click en "Add"**

6. **Railway redesplegará automáticamente** (2-3 minutos)

---

## ✅ Verificación

### Espera que el deployment termine

En Railway Dashboard, verás:
```
Building...  →  Deploying...  →  SUCCESS ✅
```

### Prueba que Firebase está conectado

Abre la consola de tu navegador en https://tucitasegura.com y ejecuta:

```javascript
fetch('https://fz6-production.up.railway.app/security-info')
  .then(r => r.json())
  .then(d => {
    console.log('Firebase Auth:', d.firebase_auth);
    // Debe mostrar: "enabled" ✅
  });
```

**Resultado esperado:**
```json
{
  "firebase_auth": "enabled"  // ✅ Si ves esto, funcionó!
}
```

---

## 🐛 Troubleshooting

### "Firebase Auth: disabled" después de agregar la variable

1. **Verifica que el deployment terminó:**
   - Railway Dashboard → Deployments → Debe decir "SUCCESS"

2. **Verifica los logs:**
   - Railway Dashboard → Deployments → Latest → View Logs
   - Busca: `"Firebase Admin inicializado desde variable de entorno"`

3. **Verifica la variable:**
   - Railway Dashboard → Variables → FIREBASE_SERVICE_ACCOUNT_B64
   - Debe tener un valor LARGO (3000+ caracteres)
   - NO debe tener saltos de línea

### Error: "Error inicializando Firebase Admin"

Posibles causas:

1. **Base64 incorrecto:**
   - Asegúrate de copiar el string COMPLETO
   - No debe tener espacios ni saltos de línea

2. **JSON inválido:**
   - Vuelve a descargar el archivo de Firebase
   - Asegúrate de usar el archivo correcto (Admin SDK, no Web Config)

3. **Proyecto incorrecto:**
   - Verifica que sea del proyecto `tuscitasseguras-2d1a6`
   - En Firebase Console, verifica el Project ID

### Logs dicen "Credenciales de Firebase no encontradas"

Significa que:
- La variable `FIREBASE_SERVICE_ACCOUNT_B64` NO está configurada, o
- El nombre de la variable está mal escrito (debe ser EXACTAMENTE ese nombre)

**Solución:**
- Verifica en Railway Variables que exista `FIREBASE_SERVICE_ACCOUNT_B64`
- Si no existe, agrégala según PASO 3

---

## 📋 Checklist Final

Antes de continuar, verifica:

- [ ] Descargué el archivo JSON de Firebase Console
- [ ] Convertí el JSON a Base64 (sin saltos de línea)
- [ ] Agregué la variable `FIREBASE_SERVICE_ACCOUNT_B64` en Railway
- [ ] Railway redesplegó (muestra "SUCCESS")
- [ ] El endpoint `/security-info` muestra `firebase_auth: "enabled"`

---

## 🎯 Siguiente Paso

Una vez que Firebase Auth esté habilitado, podrás:

✅ Registrar usuarios
✅ Hacer login
✅ Autenticar requests con JWT tokens
✅ Usar Firebase Authentication en tu app

**Ver guía completa:** `RAILWAY_COMPLETE_SETUP.md`

---

**¿Necesitas ayuda?**
- Revisa los logs en Railway
- Verifica que el JSON es del proyecto correcto
- Asegúrate de que el Base64 no tenga saltos de línea
