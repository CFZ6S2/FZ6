# ⚡ Fix CORS Error - Railway Configuration

## 🎯 Tu Proyecto
**Project ID:** `9b0e7c49-30d2-46bf-b328-b1304ff4d3a6`

## 📝 Pasos para Configurar

### 1. Abre el Dashboard de Railway

Ve a: https://railway.app/project/9b0e7c49-30d2-46bf-b328-b1304ff4d3a6

### 2. Selecciona tu servicio backend
- En la vista del proyecto, haz clic en el servicio que corre el backend Python/FastAPI

### 3. Ve a la pestaña "Variables"
- Arriba verás pestañas: **Deployments**, **Variables**, **Settings**, etc.
- Haz clic en **Variables**

### 4. Agrega estas 3 variables CRÍTICAS

Haz clic en **"+ New Variable"** y agrega cada una:

#### Variable 1:
```
Name: ENVIRONMENT
Value: production
```

#### Variable 2:
```
Name: DEBUG
Value: false
```

#### Variable 3:
```
Name: CORS_ORIGINS
Value: https://tucitasegura.com,https://www.tucitasegura.com
```

⚠️ **IMPORTANTE:**
- NO pongas comillas en los valores
- Copia exactamente como está (incluyendo la coma entre las URLs)

### 5. Railway Redesplegará Automáticamente
- Después de agregar las variables, Railway iniciará un nuevo deployment
- Verás el progreso en la pestaña **Deployments**
- Espera 2-3 minutos hasta que veas **"SUCCESS"** en verde

### 6. Verifica que funcionó

Una vez que el deployment esté en SUCCESS:

1. Ve a: https://t2c06-production.up.railway.app/security-info
2. Deberías ver `"environment": "production"` en la respuesta

3. Abre tucitasegura.com y presiona F12 (consola del navegador)
4. El error CORS debería haber desaparecido

## 🧪 Test Rápido

En la consola del navegador de tucitasegura.com, ejecuta:

```javascript
fetch('https://t2c06-production.up.railway.app/health')
  .then(r => r.json())
  .then(d => console.log('✅ Backend conectado:', d))
  .catch(e => console.error('❌ Error:', e))
```

Si ves `✅ Backend conectado:` con datos, **¡funcionó!**

## ❓ Si Sigue sin Funcionar

1. Verifica que el deployment haya terminado (debe decir SUCCESS)
2. Verifica que las variables no tengan espacios extra
3. Verifica que CORS_ORIGINS tenga exactamente: `https://tucitasegura.com,https://www.tucitasegura.com`
4. Limpia la caché del navegador (Ctrl + Shift + R)

---

**¿Necesitas más ayuda?** Dime en qué paso te quedaste.
