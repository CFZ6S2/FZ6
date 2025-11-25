# Guía rápida: Conectar Firebase App Check

Esta guía resume cómo reactivar App Check en la app web y verificar que los tokens se envíen correctamente. El código vive en `webapp/js/firebase-appcheck.js`, que ahora inicializa App Check automáticamente en dominios permitidos y ofrece modo debug para no esperar 24h.

## 1) Revisa la clave de reCAPTCHA Enterprise
- Abre Firebase Console → **App Check → Apps**.
- Confirma que la **Site key** válida coincida con la constante `RECAPTCHA_ENTERPRISE_SITE_KEY` definida en `webapp/js/firebase-appcheck.js`.
- Si usas una nueva clave, actualiza la constante y despliega de nuevo la web.

## 2) Inicialización automática
- `webapp/js/firebase-appcheck.js` ya inicializa App Check en dominios permitidos y refresca tokens automáticamente.
- En desarrollo se desactiva por defecto, pero se puede forzar con un token de debug (ver paso 4) para evitar la espera de 24h.
- Mantén el orden de imports en cada HTML: **primero** `firebase-appcheck.js`, **después** `firebase-config.js`.

## 3) Habilita dominios permitidos
- Revisa el arreglo `ALLOWED_DOMAINS` en `webapp/js/firebase-appcheck.js`.
- Añade los dominios donde se servirá la web (producción y previsualizaciones) para que App Check solo se inicialice en hosts autorizados.

## 4) Modo debug para desarrollo (sin esperar 24h)
- Genera un token de debug en Firebase Console → App Check → Debug tokens (caduca cada ~24h).
- Inyéctalo sin redeploy: abre la web con `?appcheck_debug_token=<TOKEN>` o guárdalo en `localStorage` con la clave `APP_CHECK_DEBUG_TOKEN`.
- También puedes declararlo antes de importar `firebase-appcheck.js`:
  ```html
  <script>window.APP_CHECK_DEBUG_TOKEN = 'TU_TOKEN';</script>
  <script src="/js/firebase-appcheck.js" type="module"></script>
  ```
- El script lo persiste automáticamente en `localStorage` y avisa cuando caduque. Útil para QA sin el error de espera de 24h.

## 5) Verifica que App Check funciona
1. Despliega la web y abre `webapp/verify-appcheck.html` o `webapp/test-firebase.html`.
2. Pulsa "Obtener Token" y comprueba que el log muestre `✅ App Check Token obtenido`.
3. Si recibes errores 401/403, confirma que el dominio está en `ALLOWED_DOMAINS` y que el token de debug está registrado.

## 6) Activa enforcement cuando todo funcione
- En Firebase Console → App Check → Apps, cambia los servicios a **Enforced** para bloquear peticiones sin token.
- Verifica en la consola del navegador que el helper `window.getAppCheckToken()` devuelve un token válido después de la inicialización.
