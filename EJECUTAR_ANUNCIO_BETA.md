# Guía de Ejecución: Anuncio de Membresía Gratuita Beta

## 🎯 Objetivo

Enviar notificación masiva a todos los usuarios masculinos anunciando la membresía gratuita temporal durante la fase beta.

---

## ✅ Estado del Deployment

- **Firestore Rules:** ✅ Desplegadas (acceso gratuito activado)
- **Cloud Function:** ✅ Desplegada (`sendFreeMembershipAnnouncement`)
- **Webapp:** ✅ Desplegada (deployment anterior)

**Resultado:** Los usuarios masculinos ya pueden enviar matches y chatear SIN pago.

---

## 📱 Opción 1: Ejecutar desde Firebase Console (MÁS FÁCIL)

### Pasos:

1. **Abrir Firebase Console:**
   - Ve a: https://console.firebase.google.com/project/tucitasegura-129cc/functions

2. **Encontrar la Función:**
   - Busca: `sendFreeMembershipAnnouncement`
   - Click en los 3 puntos (⋮) → **Testing**

3. **Ejecutar:**
   - En el panel de testing, click **Test Function**
   - No necesitas pasar ningún parámetro (data: {})
   - Click **Test**

4. **Ver Resultados:**
   - La consola mostrará:
     ```json
     {
       "success": true,
       "totalUsers": X,
       "pushNotifications": {
         "sent": Y,
         "failed": Z
       },
       "inAppNotifications": {
         "created": Y,
         "failed": Z
       }
     }
     ```

---

## 💻 Opción 2: Ejecutar desde tu App (Código JavaScript)

Si quieres invocar la función desde tu código, puedes usar este snippet en la consola del navegador (en cualquier página autenticada como admin):

```javascript
// En la consola de buscar-usuarios.html o admin.html
const functions = firebase.functions();
const sendAnnouncement = functions.httpsCallable('sendFreeMembershipAnnouncement');

sendAnnouncement()
  .then((result) => {
    console.log('✅ Announcement sent!', result.data);
    alert(`Enviadas ${result.data.totalUsers} notificaciones`);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    alert(`Error: ${error.message}`);
  });
```

---

## 📊 Verificación

### 1. Verificar Notificaciones en Firestore

1. Abre: https://console.firebase.google.com/project/tucitasegura-129cc/firestore
2. Ve a colección: `notifications`
3. Filtra por:
   - `type == 'announcement'`
   - `createdAt` = fecha/hora reciente
4. **Esperado:** Deberías ver todas las notificaciones creadas

### 2. Verificar en la App Web

1. Login con una cuenta de usuario masculino
2. Debería aparecer notificación en la app
3. Intentar enviar un match request
4. **Esperado:** Debe funcionar SIN pedir pago

### 3. Verificar Logs en Firebase

1. Ve a: https://console.firebase.google.com/project/tucitasegura-129cc/functions/logs
2. Busca logs de: `sendFreeMembershipAnnouncement`
3. **Esperado:** Ver líneas como:
   - `Starting free membership announcement`
   - `Found male users: count X`
   - `Free membership announcement completed`

---

## 📝 Mensaje del Anuncio

**Título:** 🎉 Membresía Gratis Activada

**Cuerpo:** Durante la fase beta, puedes chatear con todas las usuarias sin costo. ¡Aprovecha y encuentra tu match ideal!

**Tipo:** Notificación push + notificación in-app

### Si Quieres Cambiar el Mensaje

Edita el archivo `C:\Users\cesar\FZ6\functions\send-free-membership-announcement.js`:

```javascript
// Líneas 14-19
const ANNOUNCEMENT = {
  title: '🎉 Tu Nuevo Título Aquí',
  body: 'Tu nuevo mensaje aquí...',
  type: 'announcement',
  priority: 'high',
  icon: '/favicon.svg'
};
```

Luego redeploy:
```bash
cd C:\Users\cesar\FZ6
firebase deploy --only functions:sendFreeMembershipAnnouncement
```

---

## ⚠️ IMPORTANTE: Revertir Cambios Cuando App Esté Lista

Cuando la app esté 100% funcional y quieras volver a cobrar:

### 1. Revertir Firestore Rules

Edita `C:\Users\cesar\FZ6\firestore.rules` (líneas 62-74):

```javascript
// RESTAURAR ESTO:
function canChat() {
  return isFemale() || (isMale() && hasActiveMembership()) || isAdmin();
}

function canSchedule() {
  return isFemale() || (isMale() && hasActiveMembership() && hasInsurance()) || isAdmin();
}
```

Luego deploy:
```bash
firebase deploy --only firestore:rules
```

### 2. (Opcional) Enviar Anuncio de Fin de Beta

Puedes crear otra función similar para anunciar el fin del período gratuito.

---

## 🐛 Troubleshooting

**"Permission denied" al ejecutar:**
- Asegúrate de estar autenticado como admin
- Tu cuenta debe tener custom claim `role: 'admin'`

**"No se enviaron notificaciones":**
- Verifica que haya usuarios con `gender === 'masculino'` en Firestore
- Revisa los logs de la función en Firebase Console

**"No aparecen las notificaciones en la app":**
- Verifica que el usuario tenga FCM tokens registrados
- Las notificaciones in-app siempre se crean en Firestore aunque no haya tokens

---

## ✅ Checklist Final

- [ ] Ejecutar la función `sendFreeMembershipAnnouncement`
- [ ] Verificar notificaciones en Firestore Console
- [ ] Probar con cuenta de usuario masculino
- [ ] Confirmar que pueden enviar matches sin pago
- [ ] Documentar cuántos usuarios fueron notificados

---

**¿Listo para enviar el anuncio?** 🚀

Ejecuta la función usando cualquiera de las opciones de arriba!
