# 🚀 Guía de Deployment - Fraud Detection System

## Preparación Completada ✅

Todo el código está listo para deployment:
- ✅ Cloud Functions exportadas en `functions/index.js`
- ✅ Índices de Firestore configurados en `firestore.indexes.json`
- ✅ Tests pasando (27/27)
- ✅ Código commiteado y pusheado

## 📋 Pasos para Desplegar

### 1. Autenticación Firebase

En tu máquina local, ejecuta:

```bash
firebase login
```

Esto abrirá un navegador para autenticarte con tu cuenta de Google asociada al proyecto `tuscitasseguras-2d1a6`.

### 2. Verificar Proyecto Activo

```bash
cd /ruta/a/FZ6
firebase use tuscitasseguras-2d1a6
```

### 3. Desplegar Índices de Firestore (PRIMERO)

**IMPORTANTE:** Despliega los índices ANTES de las funciones para evitar errores de consulta.

```bash
firebase deploy --only firestore:indexes
```

Esto creará los siguientes índices compuestos:
- `admin_notifications`: `type (asc) + createdAt (desc)`
- `admin_notifications`: `type (asc) + read (asc) + createdAt (desc)`
- `users`: `isActive (asc) + createdAt (desc)`

La creación de índices puede tardar varios minutos. Puedes monitorear el progreso en la consola de Firebase.

### 4. Desplegar Cloud Functions

Una vez que los índices estén listos:

```bash
# Opción 1: Desplegar solo las nuevas funciones de fraud detection
firebase deploy --only functions:analyzeFraud,functions:onUserCreatedAnalyzeFraud,functions:scheduledFraudAnalysis

# Opción 2: Desplegar todas las funciones
firebase deploy --only functions
```

## 🔍 Funciones Desplegadas

### 1. `analyzeFraud` (HTTP Callable)
- **Tipo:** HTTP Callable Function
- **Uso:** Análisis manual de fraude por admins
- **Autenticación:** Requiere usuario autenticado
- **Permisos:** Solo admins pueden analizar otros usuarios

**Llamada desde cliente:**
```javascript
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const analyzeFraud = httpsCallable(functions, 'analyzeFraud');

// Analizar usuario
const result = await analyzeFraud({ userId: 'user123' });
console.log(result.data); // { fraudScore, riskLevel, indicators, ... }
```

### 2. `onUserCreatedAnalyzeFraud` (Firestore Trigger)
- **Tipo:** Firestore onCreate Trigger
- **Activación:** Automática cuando se crea un usuario en `users/{userId}`
- **Acción:** Analiza el usuario y crea alerta si es de alto riesgo

**Comportamiento:**
- Ejecuta análisis completo del nuevo usuario
- Si `riskLevel === 'high'`:
  - Marca usuario con `needsReview: true`
  - Crea documento en `admin_notifications`
  - Incluye fraud score e indicadores

### 3. `scheduledFraudAnalysis` (Scheduled Function)
- **Tipo:** Cloud Scheduler (Pub/Sub trigger)
- **Programación:** Diariamente a las 2:00 AM (Europe/Madrid)
- **Acción:** Analiza usuarios activos en lotes

**Configuración del cron:**
```
0 2 * * *  (2 AM cada día)
```

## 📊 Verificación Post-Deployment

### 1. Verificar Funciones Desplegadas

```bash
firebase functions:list
```

Deberías ver:
- ✅ `analyzeFraud`
- ✅ `onUserCreatedAnalyzeFraud`
- ✅ `scheduledFraudAnalysis`

### 2. Ver Logs en Tiempo Real

```bash
# Ver logs de todas las funciones
firebase functions:log

# Ver logs de una función específica
firebase functions:log --only analyzeFraud
```

### 3. Verificar Índices de Firestore

1. Ir a [Firebase Console](https://console.firebase.google.com/project/tuscitasseguras-2d1a6/firestore/indexes)
2. Verificar que los índices estén en estado **"Enabled"** (no "Building")

### 4. Probar Funciones

**Prueba 1: Trigger automático al crear usuario**
```javascript
// En la consola de Firebase o desde tu app
import { doc, setDoc } from 'firebase/firestore';

await setDoc(doc(db, 'users', 'test-user-123'), {
  nombre: 'Test User',
  email: 'test@tempmail.com', // Email temporal = alto riesgo
  createdAt: new Date(),
  isActive: true
});

// Verificar en admin_notifications si se creó una alerta
```

**Prueba 2: Llamada manual desde admin dashboard**
```javascript
// El dashboard ya tiene integrada la función
// Solo navega a /admin/dashboard.html
// Verifica que las alertas se cargan correctamente
```

## 🔐 Variables de Entorno

No hay variables de entorno adicionales requeridas. Las funciones usan:
- `admin.firestore()` - Auto-configurado en Cloud Functions
- `functions.config()` - No usado en estas funciones

## 💰 Estimación de Costos

### Cloud Functions
- **analyzeFraud**: ~0.4s ejecución, 256MB RAM
  - Costo: ~$0.0000004 por invocación
  - Estimado: 100 llamadas/día = $0.012/mes

- **onUserCreatedAnalyzeFraud**: Trigger por cada nuevo usuario
  - Estimado: 10 usuarios/día = $0.012/mes

- **scheduledFraudAnalysis**: 1 vez/día, procesa hasta 100 usuarios
  - Costo: ~$0.0003/día = $0.009/mes

**Total estimado: ~$0.033/mes** (insignificante)

### Firestore
- **Lecturas**: ~150 reads por análisis completo
- **Escrituras**: 2-3 writes por usuario de alto riesgo
- Estimado con 10 usuarios/día: $0.02/mes

**Costo total estimado: < $0.10/mes**

## 🚨 Troubleshooting

### Error: "PERMISSION_DENIED: Missing or insufficient permissions"
**Solución:** Verifica que las reglas de Firestore permitan que las Cloud Functions escriban en `admin_notifications`:

```javascript
// firestore.rules
match /admin_notifications/{notificationId} {
  allow read: if request.auth != null && request.auth.token.role == 'admin';
  allow write: if request.auth != null && request.auth.token.role == 'admin';
  // Permitir que Cloud Functions escriban (sin auth)
  allow create: if true;
}
```

### Error: "The query requires an index"
**Solución:** Espera a que los índices terminen de construirse en Firebase Console, o usa el link del error para crear el índice automáticamente.

### Función no se ejecuta en onCreate
**Solución:**
1. Verifica logs: `firebase functions:log --only onUserCreatedAnalyzeFraud`
2. Asegúrate que la colección sea exactamente `users` (no `Users`)
3. Verifica que el documento tenga los campos requeridos

### scheduledFraudAnalysis no se ejecuta
**Solución:**
1. Verifica en [Cloud Scheduler](https://console.cloud.google.com/cloudscheduler)
2. Asegúrate de tener Cloud Scheduler API habilitado
3. Verifica la zona horaria configurada

## 📱 Monitoreo en Producción

### Métricas Clave
- **Fraud alerts generados/día**: Ver en admin dashboard
- **Usuarios marcados como needsReview**: Query en Firestore
- **Tasa de falsos positivos**: Recopilar feedback de admins

### Logs Importantes
```bash
# Errores en fraud detection
firebase functions:log --only onUserCreatedAnalyzeFraud | grep ERROR

# Usuarios de alto riesgo detectados
firebase functions:log | grep "high_fraud_risk"

# Performance de análisis
firebase functions:log | grep "Analysis completed"
```

## 🔄 Actualizaciones Futuras

Para actualizar las funciones después de cambios en el código:

```bash
# 1. Hacer cambios en functions/fraud-detection.js
# 2. Ejecutar tests
cd functions
npm test

# 3. Si los tests pasan, desplegar
cd ..
firebase deploy --only functions:analyzeFraud,functions:onUserCreatedAnalyzeFraud,functions:scheduledFraudAnalysis
```

## ✅ Checklist de Deployment

- [ ] Autenticado con Firebase CLI
- [ ] Proyecto correcto seleccionado (tuscitasseguras-2d1a6)
- [ ] Índices de Firestore desplegados
- [ ] Índices en estado "Enabled" en consola
- [ ] Cloud Functions desplegadas
- [ ] Funciones visibles en `firebase functions:list`
- [ ] Prueba de función manual ejecutada
- [ ] Prueba de trigger onCreate ejecutada
- [ ] Admin dashboard cargando alertas correctamente
- [ ] Logs sin errores críticos
- [ ] Reglas de Firestore actualizadas si es necesario

## 🎉 Siguientes Pasos

Una vez desplegado:
1. Monitorear logs durante las primeras 24 horas
2. Revisar las primeras alertas en el admin dashboard
3. Ajustar umbrales de riesgo si hay muchos falsos positivos
4. Configurar notificaciones de admin (email/push) para alertas críticas
5. Implementar sistema de feedback para mejorar el algoritmo

---

**Proyecto:** TuCitaSegura
**Funciones:** Fraud Detection System
**Versión:** 1.0.0
**Fecha:** 2025-11-28
