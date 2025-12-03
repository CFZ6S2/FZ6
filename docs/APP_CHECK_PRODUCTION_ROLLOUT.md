# App Check – Producción (Implementación y Operación)

## Proveedores
- Web: reCAPTCHA Enterprise (Site Key: 6LcIeB4sAAAAAIsW672Uvlem8ECauSVa2IwG1vfY)
- Android: Play Integrity (recomendado) / SafetyNet (legacy)
- iOS: App Attest (recomendado) / DeviceCheck

## Dominios permitidos (reCAPTCHA Enterprise)
- tuscitasseguras-2d1a6.web.app
- tuscitasseguras-2d1a6.firebaseapp.com
- tucitasegura.com
- www.tucitasegura.com

## Pasos de Configuración
1. Consola Firebase → App Check → Web App: seleccionar reCAPTCHA Enterprise y vincular la Site Key arriba.
2. Google Cloud Console → reCAPTCHA Enterprise → Site Keys: activar clave, agregar dominios exactos y habilitar API + billing.
3. Back-end (Cloud Functions): exigir App Check en endpoints HTTP y callable; configurar `APPCHECK_ENFORCE_PROXY=true` si aplica.
4. Front-end: importar `webapp/js/firebase-appcheck.js` antes de cualquier uso de Firebase; el header `X-Firebase-AppCheck` se adjunta automáticamente.

## Aplicación Forzosa
- Firebase Console → App Check → Enforcement: activar en Firestore y Storage cuando las verificaciones estén correctas.
- HTTP Proxy/Functions: habilitar enforcement vía env `APPCHECK_ENFORCE_PROXY=true`.

## Manejo de Errores
- Throttling 403: bloquear ~24h; limpiar en desarrollo con `clear-appcheck-throttle.html`; en producción usar navegador limpio.
- `recaptcha-error`: revisar tipo/estado de key, dominios y API habilitada.
- Fallback UI: mostrar aviso y deshabilitar acciones que requieran backend mientras se restaura App Check.

## Monitoreo y Alertas
- Cloud Logging: estructurar logs de fallos en Functions (monitoring endpoint).
- Cloud Monitoring: crear alertas por tasa de errores en `verifyRecaptcha`/proxy.

## Seguridad
- No commitear claves privadas; usar `.env`/Secrets Manager.
- Revisar `serviceaccountkey.json` y eliminar del repositorio.

## Pruebas
- `webapp/verify-appcheck.html`: validar token.
- `webapp/recaptcha-enterprise-test.html`: validar `execute()` de Enterprise.
- E2E: Auth/Firestore con App Check activo.

## Rollback
- Desactivar Enforcement en App Check para Firestore/Storage.
- Poner `APPCHECK_ENFORCE_PROXY=false` en proxy.
- Confirmar funcionamiento y reintentar activación tras corregir configuración.

## Verificación Final
- Token App Check obtenido en producción (sin `recaptcha-error`).
- Peticiones a backend con `X-Firebase-AppCheck` y sin 401/403.
- Firestore/Storage funcionan con enforcement activo.
