# 🔑 Google Maps API Keys - Estado Actual

## Archivos de Configuración

### 1. Archivo Activo: `webapp/js/google-maps-config-env.js`
**Key actual:** `AIzaSyBvHTajBkXNlXnkFeN0zAVmfV00XjLT7cg`
- ✅ **Activa** (se importa en `perfil.html` y `buscar-usuarios.html`)
- Usa: `import.meta.env.VITE_GOOGLE_MAPS_API_KEY` o el fallback

### 2. Archivo Alternativo: `webapp/js/google-maps-config.js`
**Key:** `AIzaSyBvHTajBkXNlXnkFeN0zAVmfV00XjLT7cg` (misma que la activa)
- ✅ Usa la misma key del 3 de diciembre
- ⚠️ No se está usando actualmente (solo como fallback en algunos lugares)

---

## ✅ Key Activa (3 de diciembre)

**Key en uso:** `AIzaSyBvHTajBkXNlXnkFeN0zAVmfV00XjLT7cg`
- ✅ Configurada en `google-maps-config-env.js`
- ✅ Configurada en `google-maps-config.js` (consistencia)
- ✅ Key del 6 de diciembre eliminada

---

## Para Cambiar la Key

1. Abre: `webapp/js/google-maps-config-env.js`
2. Reemplaza la key en la línea 6
3. Ejecuta: `npm run build` y `firebase deploy --only hosting`

---

## Verificar en Google Cloud Console

1. Ve a: https://console.cloud.google.com/apis/credentials
2. Busca las keys y revisa:
   - **Fecha de creación**
   - **Restricciones de dominio**
   - **APIs habilitadas**

