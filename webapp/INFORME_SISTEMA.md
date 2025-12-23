# Informe de Sistema: Emails y Borrados

Este documento detalla la implementación actual de los sistemas de envío de correos electrónicos y eliminación de datos en la aplicación **TuCitaSegura**.

## 1. Sistema de Envío de Correos (Emails)

El sistema utiliza una arquitectura híbrida, enviando correos tanto desde **Firebase Cloud Functions (Node.js)** como desde el **Backend Python**.

### A. Infraestructura
- **Transporte:** SMTP (Protocolo para transferencia simple de correo).
- **Librerías:**
  - `nodemailer` (Node.js)
  - `smtplib`, `email.mime` (Python)
- **Configuración:** Se utilizan variables de entorno (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`) o configuración de Firebase (`functions:config:set`) para las credenciales.

### B. Funciones y Disparadores (Triggers)

#### Desde Firebase Cloud Functions (`functions/reminder-functions.js`)
Se han implementado tareas programadas (CRON jobs) para la retención de usuarios:

1.  **Detección de Abandono (1 Hora):**
    *   **Trigger:** 1 hora después del registro si no tiene alias.
    *   **Acción:** Envía correo "¿Hola? Completa tu perfil".
2.  **Recordatorio (24 Horas):**
    *   **Trigger:** 24 horas después del registro si sigue incompleto.
    *   **Acción:** Envía correo "Te estás perdiendo conexiones".
3.  **Ultimátum (3 Días):**
    *   **Trigger:** 3 días tras registro.
    *   **Acción:** Envía advertencia "Tu cuenta será eliminada el domingo".

#### Desde Backend Python (`backend/app/services/email/email_service.py`)
Maneja correos transaccionales más complejos y confirmaciones de pagos:

1.  **Confirmación de Pago:** Detalles de la suscripción, monto y plan activado.
2.  **Cancelación de Suscripción:** Confirmación de baja y detalles de reembolso si aplica.
3.  **Verificación de Email:** Envío de enlaces mágicos o códigos para verificar la cuenta.

---

## 2. Sistema de Borrados y Eliminación de Datos

Actualmente se identifican dos áreas principales de eliminación: Cuentas de Usuario y Conversaciones.

### A. Eliminación de Cuenta de Usuario (`webapp/perfil.html`)
El usuario puede solicitar eliminar su propia cuenta. El flujo es el siguiente:

1.  **Confirmación de Seguridad:** Se solicita al usuario escribir "ELIMINAR" para confirmar.
2.  **Re-autenticación:** Si el login es antiguo, se pide volver a iniciar sesión (por seguridad de Firebase).
3.  **Proceso de Eliminación:**
    *   **Firestore:** Marca el documento del usuario como `{ deleted: true, active: false }`. *Nota: No borra el documento físicamente de inmediato, lo marca (Soft Delete).*
    *   **Storage:** Intenta eliminar la foto de perfil y la galería (`profile_photos/...`).
    *   **Authentication:** Elimina permanentemente al usuario de Firebase Auth.

### B. Limpieza Automática (Política de Retención)
*   **Usuarios Incompletos:** El correo de "3 días" menciona una eliminación automática el domingo. *Observación: Es necesario verificar si existe la función programada (`scheduledCleanup`) que ejecute esta eliminación física, o si actualmente es solo una advertencia.*

### C. Eliminación de Chats (`webapp/chat.html`)
*   **Borrar Conversación:** Existe la opción en el menú del chat.
    *   **Acción:** Elimina permanentemente el documento de la conversación (`conversations/{id}`) de Firestore.
    *   **Impacto:** Se pierden TODOS los mensajes para AMBOS usuarios participantes en esa conversación específica.
    *   **Archivos Adjuntos:** *Se debe verificar si elimina también la subcolección de mensajes o los archivos adjuntos en Storage.* (Verificado: `deleteDoc` en colección principal borra el documento referencia, pero en Firestore borrar un documento NO borra recursivamente sus subcolecciones automáticamente a menos que se use una Cloud Function específica para ello. **Posible acumulación de "mensajes huérfanos"**).

---

## Recomendaciones

1.  **Unificar Emails:** Centralizar la lógica de correos en un solo servicio (idealmente Python si el backend principal migra allí, o Node si se prefiere serverless puro) para evitar duplicidad de configuración SMTP.
2.  **Limpieza de Chats:** Implementar una Cloud Function `onDelete` para `conversations/{id}` que limpie recursivamente la subcolección `messages` y los archivos en Storage asociados, para evitar datos huérfanos.
3.  **Script de Limpieza:** Implementar el script real para borrar usuarios inactivos/incompletos si aún no existe, cumpliendo la promesa del correo de "Ultimátum".
