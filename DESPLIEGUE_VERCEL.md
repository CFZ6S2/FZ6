# 🚀 Guía de Despliegue a Vercel - TuCitaSegura

## ✅ Estado Actual del Proyecto

### Firebase Configurado
- ✅ **Project ID:** tuscitasseguras-2d1a6
- ✅ **Authentication:** Email/Password habilitado
- ✅ **Firestore:** Base de datos configurada
- ✅ **Storage:** Almacenamiento de fotos configurado
- ✅ **Functions:** Cloud Functions desplegadas
- ✅ **Push Notifications:** VAPID key configurada

### Google Maps API
- ✅ **API Key:** AIzaSyAgFcoHwoBpo80rlEHL2hHVZ2DqtjWXh2s
- ✅ **APIs Habilitadas:** Maps JavaScript API, Geocoding API
- ⚠️ **IMPORTANTE:** Restringe la API Key a `tucitasegura.com` en Google Cloud Console

### Funcionalidades Implementadas
- ✅ Geolocalización con Google Maps
- ✅ 10 temas de color (incluyendo modo oscuro)
- ✅ Sistema de perfiles completo
- ✅ Chat en tiempo real
- ✅ Sistema de citas
- ✅ Verificación de identidad
- ✅ Notificaciones push

---

## 🌍 Pasos para Desplegar a Vercel

### 1. Preparación (YA HECHO ✅)

Los siguientes archivos ya están configurados:
- ✅ `vercel.json` - Configuración de rutas y headers
- ✅ `.vercelignore` - Archivos excluidos del deploy
- ✅ `webapp/js/firebase-config.js` - Firebase configurado
- ✅ `webapp/js/google-maps-config.js` - Google Maps configurado

### 2. Conectar con Vercel

#### Opción A: Desde GitHub (Recomendado)

1. **Haz push a GitHub:**
   ```bash
   git add vercel.json .vercelignore DESPLIEGUE_VERCEL.md
   git commit -m "feat: add Vercel deployment configuration"
   git push origin main
   ```

2. **Ve a Vercel:**
   - Entra a https://vercel.com
   - Click en "Add New Project"
   - Importa el repositorio `CFZ6S2/FZ6`
   - Configura:
     - **Framework Preset:** Other
     - **Root Directory:** `./` (raíz)
     - **Build Command:** (dejar vacío)
     - **Output Directory:** `webapp`

3. **Deploy:**
   - Click en "Deploy"
   - Espera 1-2 minutos
   - ✅ Tu app estará en: `https://tucitasegura.vercel.app`

#### Opción B: Desde CLI

```bash
# Instalar Vercel CLI (si no lo tienes)
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

### 3. Configurar Dominio Personalizado

Una vez desplegado en Vercel:

1. **En Vercel Dashboard:**
   - Ve a tu proyecto > Settings > Domains
   - Click en "Add Domain"
   - Ingresa: `tucitasegura.com`
   - Sigue las instrucciones para configurar DNS

2. **Configurar DNS (en tu proveedor de dominio):**
   ```
   Tipo: A
   Nombre: @
   Valor: 76.76.21.21

   Tipo: CNAME
   Nombre: www
   Valor: cname.vercel-dns.com
   ```

3. **Agregar dominio a Google Maps:**
   - Ve a: https://console.cloud.google.com/apis/credentials
   - Edita tu API Key "Browser"
   - En "Restricciones de sitio web HTTP" agrega:
     ```
     tucitasegura.com/*
     www.tucitasegura.com/*
     *.vercel.app/*
     ```

4. **Agregar dominio a Firebase:**
   - Ve a: https://console.firebase.google.com
   - Proyecto > Authentication > Settings > Authorized domains
   - Agrega: `tucitasegura.com` y `www.tucitasegura.com`

---

## 🔒 Checklist de Seguridad Pre-Deploy

Antes de hacer el deploy final, verifica:

### Google Maps API
- [ ] API Key restringida a tu dominio
- [ ] Solo APIs necesarias habilitadas (Maps JavaScript + Geocoding)
- [ ] Alertas de cuota configuradas en Google Cloud

### Firebase
- [ ] Reglas de seguridad de Firestore configuradas
- [ ] Reglas de Storage configuradas
- [ ] App Check habilitado (opcional pero recomendado)
- [ ] Dominio autorizado en Authentication

### Variables Sensibles
- [ ] No hay claves privadas en el código
- [ ] Archivos .env excluidos del repositorio
- [ ] VAPID private key solo en backend

---

## 🧪 Testing Post-Deploy

Después del deploy, prueba:

1. **Registro/Login:**
   - [ ] Crear cuenta nueva
   - [ ] Iniciar sesión
   - [ ] Cerrar sesión

2. **Perfil:**
   - [ ] Subir foto
   - [ ] Cambiar ubicación con mapa
   - [ ] Cambiar tema de color
   - [ ] Guardar cambios

3. **Geolocalización:**
   - [ ] Botón "Usar mi ubicación" funciona
   - [ ] Mapa de Google Maps se carga
   - [ ] Solo se muestra municipio

4. **Funcionalidades:**
   - [ ] Buscar usuarios
   - [ ] Enviar mensajes
   - [ ] Crear citas
   - [ ] Notificaciones push

---

## 📊 Monitoreo

### Vercel Analytics
En el dashboard de Vercel podrás ver:
- Visitantes
- Rendimiento
- Errores

### Firebase Console
Monitorea:
- Usuarios activos
- Uso de Firestore
- Llamadas a Functions
- Errores en Authentication

### Google Cloud Console
Verifica:
- Uso de Maps API
- Costos (deberías estar dentro del tier gratuito)

---

## 🆘 Troubleshooting

### Error: "Google Maps API Key inválida"
**Solución:**
1. Verifica que la key esté en `webapp/js/google-maps-config.js`
2. Asegúrate que el dominio esté autorizado en Google Cloud Console
3. Verifica que Maps JavaScript API y Geocoding API estén habilitadas

### Error: "Firebase: Permission denied"
**Solución:**
1. Revisa las reglas de Firestore
2. Verifica que el dominio esté autorizado en Firebase Authentication
3. Comprueba que el usuario esté autenticado

### La página no carga
**Solución:**
1. Verifica que `vercel.json` esté configurado correctamente
2. Comprueba los logs en Vercel Dashboard
3. Asegúrate que los archivos estén en la carpeta `webapp`

---

## 📞 Soporte

Si encuentras problemas:
1. Revisa los logs en Vercel Dashboard
2. Revisa la consola del navegador (F12)
3. Verifica Firebase Console para errores
4. Comprueba Google Cloud Console para límites de API

---

## ✅ Checklist Final

Antes de considerar el deploy completo:

- [ ] App desplegada en Vercel
- [ ] Dominio personalizado configurado
- [ ] SSL/HTTPS funcionando (automático en Vercel)
- [ ] Google Maps API restringida
- [ ] Firebase configurado y funcionando
- [ ] Testing completo realizado
- [ ] Monitoreo configurado

---

**¡Tu aplicación estará lista para producción!** 🎉
