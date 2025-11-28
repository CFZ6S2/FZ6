# 🔍 Guía de Fraud Detection Service

**TuCitaSegura - Sistema de Detección de Fraude**

Documentación completa del servicio de detección de fraude integrado en Cloud Functions.

---

## 📋 Tabla de Contenidos

1. [Descripción General](#descripción-general)
2. [Arquitectura](#arquitectura)
3. [Funciones Disponibles](#funciones-disponibles)
4. [Uso desde Frontend](#uso-desde-frontend)
5. [Análisis Multi-Dimensional](#análisis-multi-dimensional)
6. [Niveles de Riesgo](#niveles-de-riesgo)
7. [Monitoreo y Alertas](#monitoreo-y-alertas)
8. [Admin Dashboard](#admin-dashboard)
9. [Seguridad](#seguridad)
10. [Testing](#testing)

---

## 🎯 Descripción General

El **Fraud Detection Service** analiza automáticamente nuevos usuarios y usuarios existentes para detectar comportamientos fraudulentos, cuentas falsas, bots y actividad sospechosa.

### Características Principales

- ✅ **Análisis automático** al crear usuario
- ✅ **Análisis manual** por admins
- ✅ **Análisis programado** diario de usuarios activos
- ✅ **Score de fraude** 0-100 con nivel de riesgo
- ✅ **Indicadores específicos** de fraude detectado
- ✅ **Recomendaciones automáticas** por nivel de riesgo
- ✅ **Almacenamiento en Firestore** de resultados
- ✅ **Alertas automáticas** para admins en casos de alto riesgo

---

## 🏗️ Arquitectura

### Componentes

```
┌─────────────────────────────────────────────────┐
│           FRAUD DETECTION SERVICE               │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌──────────────┐  ┌───────────────────────┐   │
│  │ Cloud        │  │ Firestore Triggers    │   │
│  │ Functions    │  │ - onUserCreate        │   │
│  │ - analyzeFraud│  │ - Auto-analyze       │   │
│  └──────────────┘  └───────────────────────┘   │
│                                                 │
│  ┌──────────────┐  ┌───────────────────────┐   │
│  │ Scheduled    │  │ Storage               │   │
│  │ - Daily 2AM  │  │ - fraud_scores        │   │
│  │ - Batch      │  │ - admin_notifications │   │
│  └──────────────┘  └───────────────────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │  Analysis Engine                        │   │
│  │  - Profile (25%)                        │   │
│  │  - Behavior (35%)                       │   │
│  │  - Network (20%)                        │   │
│  │  - Content (20%)                        │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

### Flujo de Datos

1. **Usuario se registra** → Firestore trigger `onUserCreatedAnalyzeFraud`
2. **Análisis automático** → Motor de análisis multi-dimensional
3. **Cálculo de score** → 0.0 - 1.0 (0% - 100%)
4. **Determinación de riesgo** → minimal, low, medium, high
5. **Almacenamiento** → Colección `fraud_scores`
6. **Alerta (si high risk)** → Notificación a admins
7. **Flag usuario** → Campo `needsReview` = true

---

## 🔧 Funciones Disponibles

### 1. `analyzeFraud` (HTTP Callable)

Analiza el riesgo de fraude de un usuario específico.

#### Permisos
- ✅ **Admins**: Pueden analizar cualquier usuario
- ✅ **Usuarios**: Solo pueden ver su propio análisis

#### Uso desde JavaScript

```javascript
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const analyzeFraud = httpsCallable(functions, 'analyzeFraud');

async function checkUserFraud(userId) {
  try {
    const result = await analyzeFraud({ userId });

    console.log('Fraud Score:', result.data.fraudScore);
    console.log('Risk Level:', result.data.riskLevel);
    console.log('Indicators:', result.data.indicators);
    console.log('Recommendations:', result.data.recommendations);

    return result.data;
  } catch (error) {
    console.error('Error analyzing fraud:', error);
    throw error;
  }
}

// Ejemplo de uso
const userId = 'abc123';
const fraudAnalysis = await checkUserFraud(userId);
```

#### Respuesta

```javascript
{
  userId: "abc123",
  fraudScore: 0.75,
  riskLevel: "high",
  indicators: [
    "Email temporal detectado",
    "Sin fotos de perfil",
    "Biografía genérica",
    "Perfil incompleto"
  ],
  recommendations: [
    "Suspender cuenta temporalmente",
    "Revisar manualmente todos los datos del usuario",
    "Verificar identidad con documentación oficial",
    "Solicitar verificación de email permanente"
  ],
  confidence: 0.68,
  analyzedAt: Timestamp,
  details: {
    profileScore: 0.85,
    behaviorScore: 0.70,
    networkScore: 0.50,
    contentScore: 0.95
  }
}
```

---

### 2. `onUserCreatedAnalyzeFraud` (Firestore Trigger)

Se ejecuta automáticamente cuando se crea un documento en `users/{userId}`.

#### Comportamiento

```javascript
// Firestore trigger - NO requiere llamada manual
// Se ejecuta automáticamente al crear usuario
exports.onUserCreatedAnalyzeFraud = functions.firestore
  .document('users/{userId}')
  .onCreate(async (snap, context) => {
    const userId = context.params.userId;
    const result = await analyzeUserFraud(userId);

    // Si riesgo alto, marcar para revisión
    if (result.riskLevel === 'high') {
      await updateUser(userId, {
        needsReview: true,
        reviewReason: 'high_fraud_risk',
        fraudScore: result.fraudScore
      });

      // Crear notificación para admins
      await createAdminNotification({
        type: 'fraud_alert',
        userId,
        fraudScore: result.fraudScore,
        riskLevel: result.riskLevel
      });
    }
  });
```

#### Acciones Automáticas

| Risk Level | Acción |
|------------|--------|
| **high** (≥0.8) | • Flag `needsReview: true`<br>• Notificación a admins<br>• Log de seguridad |
| **medium** (0.6-0.8) | • Log de auditoría<br>• Monitoreo incrementado |
| **low** (0.3-0.6) | • Solo almacenamiento del score |
| **minimal** (<0.3) | • Almacenamiento básico |

---

### 3. `scheduledFraudAnalysis` (Scheduled Function)

Análisis programado diario de usuarios activos.

#### Configuración

- **Horario**: 2:00 AM (Europe/Madrid)
- **Frecuencia**: Diaria
- **Batch size**: 100 usuarios por ejecución
- **Condición**: Usuarios activos sin análisis en los últimos 3 días

#### Cron Expression

```javascript
exports.scheduledFraudAnalysis = functions.pubsub
  .schedule('0 2 * * *') // Cron: 2 AM every day
  .timeZone('Europe/Madrid')
  .onRun(async (context) => {
    // Process active users...
  });
```

#### Monitoreo

Revisar logs en Firebase Console:
```bash
# Ver logs de análisis programado
gcloud functions logs read scheduledFraudAnalysis \
  --limit 50 \
  --format json
```

---

## 📊 Análisis Multi-Dimensional

El sistema analiza **4 dimensiones** con diferentes pesos:

### 1. Análisis de Perfil (25%)

Evalúa la información básica del perfil del usuario.

#### Indicadores

| Indicador | Peso | Descripción |
|-----------|------|-------------|
| Email temporal | 0.3 | Dominios: tempmail, guerrillamail, mailinator, etc. |
| Nombre sospechoso | 0.2-0.25 | Longitud anormal o patrones repetitivos |
| Edad sospechosa | 0.3 | <18 o >80 años |
| Sin fotos | 0.15 | No tiene fotos de perfil |
| Perfil incompleto | 0.2 | <30% de campos completados |

#### Ejemplo

```javascript
// Usuario con email temporal, sin fotos, perfil 20% completo
profileScore = 0.3 + 0.15 + 0.2 = 0.65
weightedScore = 0.65 * 0.25 = 0.1625 (16.25%)
```

---

### 2. Análisis de Comportamiento (35%)

Evalúa patrones de actividad del usuario.

#### Indicadores

| Indicador | Peso | Threshold |
|-----------|------|-----------|
| Exceso de mensajes | 0.4 | >50 mensajes/hora |
| Exceso de likes | 0.3 | >100 likes/hora |
| Múltiples reportes | 0.5 | ≥3 reportes recibidos |
| Mensajes duplicados | 0.35 | >70% duplicados |
| Respuestas muy rápidas | 0.25 | <2 segundos promedio |

#### Ejemplo

```javascript
// Usuario con 80 mensajes en 1h, 5 reportes
behaviorScore = 0.4 + 0.5 = 0.9
weightedScore = 0.9 * 0.35 = 0.315 (31.5%)
```

---

### 3. Análisis de Red (20%)

Evalúa dispositivos, ubicaciones y conexiones.

#### Indicadores

| Indicador | Peso | Threshold |
|-----------|------|-----------|
| Múltiples ubicaciones | 0.3 | >5 ubicaciones distintas |
| Múltiples dispositivos | 0.25 | >3 dispositivos |
| Uso de VPN/Proxy | 0.2 | Detectado en sesiones recientes |
| Conexiones sospechosas | 0.35 | >50% con usuarios reportados |

---

### 4. Análisis de Contenido (20%)

Evalúa la calidad del contenido del perfil.

#### Indicadores

| Indicador | Peso | Descripción |
|-----------|------|-------------|
| Biografía genérica | 0.2 | Frases comunes: "looking for", "nice person" |
| Enlaces en biografía | 0.15 | URLs, dominios web |
| Longitud anormal | 0.1 | <10 o >500 caracteres |
| Intereses genéricos | 0.15 | 100% intereses comunes |
| Fotos similares | 0.3 | <50% hashes únicos |

---

## 🚦 Niveles de Riesgo

### Minimal (0.0 - 0.29)

**Características:**
- Perfil completo y auténtico
- Comportamiento normal
- Sin indicadores de fraude

**Acciones:**
- ✅ Monitoreo normal
- ✅ Sin restricciones

---

### Low (0.30 - 0.59)

**Características:**
- Algunos indicadores menores
- Perfil parcialmente completo
- Comportamiento mayormente normal

**Recomendaciones:**
- ⚠️ Aumentar supervisión
- ⚠️ Verificar fotos del perfil
- ⚠️ Monitorear frecuencia de mensajes

---

### Medium (0.60 - 0.79)

**Características:**
- Múltiples indicadores de riesgo
- Comportamiento sospechoso
- Requiere revisión

**Recomendaciones:**
- 🟠 Monitorear actividad de cerca
- 🟠 Limitar interacciones temporales
- 🟠 Verificar información del perfil
- 🟠 Aplicar restricciones de mensajería

**Acciones automáticas:**
- Log de auditoría
- Seguimiento incrementado

---

### High (0.80 - 1.00)

**Características:**
- Alto nivel de indicadores de fraude
- Comportamiento claramente sospechoso
- Riesgo significativo

**Recomendaciones:**
- 🔴 Suspender cuenta temporalmente
- 🔴 Revisar manualmente todos los datos
- 🔴 Verificar identidad con documentación oficial
- 🔴 Investigar conexiones con otros usuarios reportados

**Acciones automáticas:**
- ✅ Flag `needsReview: true` en Firestore
- ✅ Notificación a admins en `admin_notifications`
- ✅ Log de seguridad
- ✅ Campo `reviewReason: 'high_fraud_risk'`

---

## 🔔 Monitoreo y Alertas

### Notificaciones Admin

Cuando se detecta un usuario de alto riesgo:

```javascript
// Documento creado automáticamente en admin_notifications
{
  type: 'fraud_alert',
  userId: 'abc123',
  fraudScore: 0.85,
  riskLevel: 'high',
  indicators: [
    "Email temporal detectado",
    "Sin fotos de perfil",
    "Exceso de mensajes: 75 en 1h"
  ],
  createdAt: Timestamp,
  read: false
}
```

### Consulta de Usuarios Flagged

```javascript
// Query para obtener usuarios que necesitan revisión
const flaggedUsers = await db.collection('users')
  .where('needsReview', '==', true)
  .where('reviewReason', '==', 'high_fraud_risk')
  .orderBy('updatedAt', 'desc')
  .get();

flaggedUsers.forEach(doc => {
  const user = doc.data();
  console.log(`User ${doc.id}: Score ${user.fraudScore}`);
});
```

---

## 👨‍💼 Admin Dashboard

### Interfaz Recomendada

```html
<!-- Admin Dashboard - Fraud Alerts Section -->
<div class="fraud-alerts">
  <h2>🔴 Alertas de Fraude</h2>

  <div id="fraudAlertsList">
    <!-- Populated dynamically -->
  </div>
</div>

<script type="module">
import { db } from './js/firebase-config.js';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';

// Listen to fraud alerts in real-time
const alertsQuery = query(
  collection(db, 'admin_notifications'),
  where('type', '==', 'fraud_alert'),
  where('read', '==', false),
  orderBy('createdAt', 'desc')
);

onSnapshot(alertsQuery, (snapshot) => {
  const alerts = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  renderFraudAlerts(alerts);
});

function renderFraudAlerts(alerts) {
  const container = document.getElementById('fraudAlertsList');

  if (alerts.length === 0) {
    container.innerHTML = '<p>No hay alertas pendientes</p>';
    return;
  }

  container.innerHTML = alerts.map(alert => `
    <div class="alert-card risk-${alert.riskLevel}">
      <div class="alert-header">
        <h3>Usuario: ${alert.userId}</h3>
        <span class="badge ${alert.riskLevel}">${alert.riskLevel}</span>
      </div>

      <div class="alert-body">
        <p><strong>Score:</strong> ${(alert.fraudScore * 100).toFixed(0)}%</p>

        <p><strong>Indicadores:</strong></p>
        <ul>
          ${alert.indicators.map(ind => `<li>${ind}</li>`).join('')}
        </ul>
      </div>

      <div class="alert-actions">
        <button onclick="reviewUser('${alert.userId}')">
          Revisar Usuario
        </button>
        <button onclick="markAsRead('${alert.id}')">
          Marcar como leído
        </button>
      </div>
    </div>
  `).join('');
}
</script>
```

---

## 🔒 Seguridad

### Control de Acceso

```javascript
// Solo admins pueden analizar otros usuarios
if (!isAdmin && userId !== context.auth.uid) {
  throw new functions.https.HttpsError(
    'permission-denied',
    'Only admins can analyze other users'
  );
}
```

### Firestore Security Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // fraud_scores - Solo lectura para el usuario, escritura solo para functions
    match /fraud_scores/{userId} {
      allow read: if request.auth != null &&
                     (request.auth.uid == userId ||
                      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.userRole == 'admin');
      allow write: if false; // Solo Cloud Functions pueden escribir
    }

    // admin_notifications - Solo admins
    match /admin_notifications/{notificationId} {
      allow read, write: if request.auth != null &&
                            get(/databases/$(database)/documents/users/$(request.auth.uid)).data.userRole == 'admin';
    }
  }
}
```

---

## 🧪 Testing

### Test Manual (Admin)

```javascript
// En la consola del navegador (como admin)
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const analyzeFraud = httpsCallable(functions, 'analyzeFraud');

// Analizar un usuario específico
const result = await analyzeFraud({ userId: 'test_user_123' });
console.log('Fraud Analysis:', result.data);
```

### Test Automatizado

```javascript
// functions/test/fraud-detection.test.js
const { expect } = require('chai');
const fraudDetection = require('../fraud-detection');

describe('Fraud Detection', () => {
  it('should detect temporary email', () => {
    const userData = {
      email: 'test@tempmail.com',
      name: 'Test User',
      photos: []
    };

    const { score, indicators } = fraudDetection._analyzeProfile(userData);

    expect(score).to.be.greaterThan(0.3);
    expect(indicators).to.include('Email temporal detectado');
  });

  it('should detect incomplete profile', () => {
    const userData = {
      email: 'test@gmail.com',
      name: 'Test',
      // Missing: bio, location, interests, occupation, education
    };

    const { score, indicators } = fraudDetection._analyzeProfile(userData);

    expect(indicators).to.include('Perfil incompleto');
  });
});
```

---

## 📈 Métricas y KPIs

### Métricas Recomendadas

```javascript
// Análisis de efectividad del sistema
const db = admin.firestore();

// 1. Usuarios por nivel de riesgo
const fraudScores = await db.collection('fraud_scores').get();
const riskDistribution = {
  minimal: 0,
  low: 0,
  medium: 0,
  high: 0
};

fraudScores.forEach(doc => {
  const level = doc.data().riskLevel;
  riskDistribution[level]++;
});

console.log('Risk Distribution:', riskDistribution);

// 2. Usuarios flagged pendientes de revisión
const flaggedCount = await db.collection('users')
  .where('needsReview', '==', true)
  .count()
  .get();

console.log('Users needing review:', flaggedCount.data().count);

// 3. Tasa de detección de fraude confirmado
// (Requiere tracking manual de falsos positivos/negativos)
```

---

## 🚀 Deployment

### Deploy a Firebase

```bash
# Deploy solo las funciones de fraud detection
firebase deploy --only functions:analyzeFraud,functions:onUserCreatedAnalyzeFraud,functions:scheduledFraudAnalysis

# Deploy todas las funciones
firebase deploy --only functions
```

### Verificar Deployment

```bash
# Listar funciones desplegadas
firebase functions:list

# Ver logs de fraud detection
firebase functions:log --only onUserCreatedAnalyzeFraud
```

---

## 📚 Referencias

- [Fraud Detection Service - Backend](/home/user/FZ6/backend/app/services/security/fraud_detector.py)
- [Cloud Functions Implementation](/home/user/FZ6/functions/fraud-detection.js)
- [IMPLEMENTACION_COMPONENTES_PROGRESO.md](/home/user/FZ6/IMPLEMENTACION_COMPONENTES_PROGRESO.md)

---

**Última actualización**: 27/11/2025
**Estado**: ✅ IMPLEMENTADO Y ACTIVADO
**Versión**: 1.0.0
