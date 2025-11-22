# 🔄 Firestore Backup & Restore Guide

**Guía completa de respaldo y restauración para TuCitaSegura**

---

## 📋 Tabla de Contenidos

- [Overview](#overview)
- [Arquitectura de Backups](#arquitectura-de-backups)
- [Backups Automáticos](#backups-automáticos)
- [Backups Manuales](#backups-manuales)
- [Restore Procedures](#restore-procedures)
- [Monitoreo y Alertas](#monitoreo-y-alertas)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

---

## 🎯 Overview

El sistema de backups de TuCitaSegura protege todos los datos de Firestore con backups automáticos y manuales.

### Características

✅ **Backups automáticos programados** (diarios, semanales, mensuales)
✅ **Backups manuales on-demand** (GitHub Actions + API)
✅ **Retención automática** (lifecycle policies)
✅ **Verificación de integridad** (health checks)
✅ **Restore procedures documentados**
✅ **API de administración** (endpoints protegidos)
✅ **Monitoreo integrado** (Sentry + logs)

### Garantías

- **RPO (Recovery Point Objective)**: 24 horas máximo (backup diario)
- **RTO (Recovery Time Objective)**: 1-2 horas (restore completo)
- **Retención**: 7 días (daily), 30 días (weekly), 365 días (monthly)
- **Integridad**: Verificación automática post-backup

---

## 🏗 Arquitectura de Backups

### Diagrama de Flujo

```
┌─────────────────────────────────────────────────────────┐
│                  TRIGGERS                               │
├─────────────────────────────────────────────────────────┤
│  • Cron Schedule (daily/weekly/monthly)                 │
│  • Manual (GitHub Actions UI)                           │
│  • API Call (admin endpoint)                            │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│           GITHUB ACTIONS WORKFLOW                       │
│         (.github/workflows/backup-firestore.yml)        │
├─────────────────────────────────────────────────────────┤
│  1. Setup Cloud SDK                                     │
│  2. Authenticate with service account                   │
│  3. Determine backup type                               │
│  4. Create/verify Cloud Storage bucket                  │
│  5. Set lifecycle policies                              │
│  6. Trigger Firestore export                            │
│  7. Wait for completion                                 │
│  8. Verify backup integrity                             │
│  9. Create metadata file                                │
│  10. Cleanup old backups                                │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│              CLOUD STORAGE                              │
│        (gs://PROJECT_ID-backups/)                       │
├─────────────────────────────────────────────────────────┤
│  backups/                                               │
│  ├── daily/                                             │
│  │   ├── 20240115-020000/                               │
│  │   │   ├── overall_export_metadata                    │
│  │   │   ├── output-0                                   │
│  │   │   ├── ...                                        │
│  │   │   └── metadata.json                              │
│  │   └── ...                                            │
│  ├── weekly/                                            │
│  ├── monthly/                                           │
│  └── manual/                                            │
└─────────────────────────────────────────────────────────┘
```

### Componentes

**1. GitHub Actions Workflow**
- Archivo: `.github/workflows/backup-firestore.yml`
- Triggers: Schedule (cron) + manual
- Ejecuta: gcloud firestore export

**2. Backend API Service**
- Archivo: `backend/app/services/backup/firestore_backup_service.py`
- Funciones: Trigger backups, verificar estado, listar backups, health check
- Admin endpoints: `/admin/backups/*`

**3. Cloud Storage Bucket**
- Nombre: `{PROJECT_ID}-backups`
- Ubicación: us-central1
- Lifecycle policies: Auto-delete según tipo

**4. Restore Script**
- Archivo: `scripts/restore-firestore.sh`
- Uso: Restaurar desde cualquier backup
- Safety: Crea backup antes de restore

---

## 🤖 Backups Automáticos

### Configuración de Schedules

Los backups automáticos se ejecutan mediante GitHub Actions con cron schedules:

```yaml
schedule:
  # Daily backup - 2 AM UTC (todos los días)
  - cron: '0 2 * * *'

  # Weekly backup - 3 AM UTC (Domingos)
  - cron: '0 3 * * 0'

  # Monthly backup - 4 AM UTC (día 1 de cada mes)
  - cron: '0 4 1 * *'
```

### Política de Retención

| Tipo     | Frecuencia   | Retención | Espacio Estimado |
|----------|--------------|-----------|------------------|
| Daily    | Cada día     | 7 días    | ~7x DB size      |
| Weekly   | Domingos     | 30 días   | ~4x DB size      |
| Monthly  | Día 1 del mes| 365 días  | ~12x DB size     |
| Manual   | On-demand    | 30 días   | Variable         |

**Ejemplo**: Si tu DB es 500 MB, necesitas ~11.5 GB para todos los backups.

### Lifecycle Policies (Auto-cleanup)

El bucket tiene políticas de lifecycle automáticas:

```json
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {
          "age": 7,
          "matchesPrefix": ["backups/daily/"]
        }
      },
      {
        "action": {"type": "Delete"},
        "condition": {
          "age": 30,
          "matchesPrefix": ["backups/weekly/"]
        }
      },
      {
        "action": {"type": "Delete"},
        "condition": {
          "age": 365,
          "matchesPrefix": ["backups/monthly/"]
        }
      }
    ]
  }
}
```

### Verificar Backups Automáticos

**En GitHub Actions:**

1. Ve a tu repo en GitHub
2. Click en **Actions** tab
3. Select **Firestore Backup** workflow
4. Ver historial de ejecuciones

**Desde CLI:**

```bash
# Listar backups en Cloud Storage
gsutil ls gs://PROJECT_ID-backups/backups/daily/
gsutil ls gs://PROJECT_ID-backups/backups/weekly/
gsutil ls gs://PROJECT_ID-backups/backups/monthly/

# Ver tamaño total de backups
gsutil du -sh gs://PROJECT_ID-backups/
```

---

## 🔧 Backups Manuales

### Opción 1: GitHub Actions UI

1. Ve a tu repositorio en GitHub
2. Click en **Actions** tab
3. Select **Firestore Backup** en el menú lateral
4. Click en **Run workflow**
5. Selecciona:
   - Branch: `main`
   - Backup type: `manual`
6. Click **Run workflow**

**Resultado**: Backup manual creado en `gs://PROJECT_ID-backups/backups/manual/TIMESTAMP/`

### Opción 2: Admin API Endpoint

**Endpoint**: `POST /admin/backups/trigger`

**Autenticación**: Bearer token (admin only)

**Request**:
```bash
curl -X POST https://api.tucitasegura.com/admin/backups/trigger \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "backup_type": "manual",
    "collection_ids": null
  }'
```

**Response**:
```json
{
  "success": true,
  "operation_name": "operations/ASA5MjAtNzYxORAyNDQ...",
  "backup_type": "manual",
  "output_uri": "gs://PROJECT_ID-backups/backups/manual/20240115-143022",
  "timestamp": "2024-01-15T14:30:22.123456",
  "status": "in_progress",
  "message": "Backup manual started successfully"
}
```

### Opción 3: gcloud CLI

**Directo desde la terminal:**

```bash
# Set project
export PROJECT_ID="tu-cita-segura"

# Trigger backup
gcloud firestore export gs://${PROJECT_ID}-backups/backups/manual/$(date +%Y%m%d-%H%M%S) \
  --project="${PROJECT_ID}" \
  --async

# Check status
gcloud firestore operations list --project="${PROJECT_ID}"
```

### Backups Selectivos (Solo algunas colecciones)

**API Request**:
```bash
curl -X POST https://api.tucitasegura.com/admin/backups/trigger \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "backup_type": "manual",
    "collection_ids": ["users", "matches", "payments"]
  }'
```

**gcloud CLI**:
```bash
gcloud firestore export gs://bucket/path \
  --collection-ids=users,matches,payments \
  --project="${PROJECT_ID}"
```

---

## 🔄 Restore Procedures

### ⚠️ IMPORTANTE - Antes de Restaurar

1. **Verificar que necesitas restore**: ¿Seguro que quieres sobrescribir datos actuales?
2. **Identificar el backup correcto**: Timestamp, tipo, tamaño
3. **Notificar al equipo**: Restaurar causará downtime
4. **Crear backup de seguridad**: El script lo hace automáticamente
5. **Tener plan de rollback**: Por si algo sale mal

### Método 1: Script Automatizado (RECOMENDADO)

**Uso del script `restore-firestore.sh`:**

```bash
# 1. Listar backups disponibles
gsutil ls gs://PROJECT_ID-backups/backups/daily/

# 2. Ejecutar restore
./scripts/restore-firestore.sh gs://PROJECT_ID-backups/backups/daily/20240115-020000
```

**El script automáticamente:**
1. ✅ Verifica que el backup existe
2. ✅ Crea un backup de seguridad pre-restore
3. ✅ Pregunta confirmación
4. ✅ Ejecuta el restore
5. ✅ Espera a que complete
6. ✅ Verifica el resultado
7. ✅ Provee instrucciones de rollback

**Output esperado:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FIRESTORE RESTORE SCRIPT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ℹ️  Backup path: gs://PROJECT_ID-backups/backups/daily/20240115-020000

ℹ️  Detecting Firebase project...
✅ Using project from environment: tu-cita-segura

⚠️  WARNING: This will restore Firestore database from backup!
⚠️  This operation will OVERWRITE existing data if there are conflicts.

ℹ️  Project: tu-cita-segura
ℹ️  Backup: gs://PROJECT_ID-backups/backups/daily/20240115-020000

Are you sure you want to continue? (yes/no): yes

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. VERIFYING BACKUP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Backup path is accessible
✅ Found export metadata file
ℹ️  Backup size: 487M

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. CREATE PRE-RESTORE BACKUP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  Creating safety backup before restore...
✅ Safety backup initiated

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. RESTORE FIRESTORE DATABASE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Restore operation started
ℹ️  Waiting for restore to complete...
.........
✅ Restore completed successfully!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RESTORE COMPLETED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Método 2: gcloud CLI Manual

```bash
# Set variables
PROJECT_ID="tu-cita-segura"
BACKUP_PATH="gs://PROJECT_ID-backups/backups/daily/20240115-020000"

# 1. Create safety backup first
gcloud firestore export gs://${PROJECT_ID}-backups/backups/pre-restore/$(date +%Y%m%d-%H%M%S) \
  --project="${PROJECT_ID}" \
  --async

# 2. Wait for safety backup (optional but recommended)
gcloud firestore operations list --project="${PROJECT_ID}" --filter="done=false"

# 3. Perform restore
gcloud firestore import "${BACKUP_PATH}" \
  --project="${PROJECT_ID}" \
  --async

# 4. Monitor progress
gcloud firestore operations list --project="${PROJECT_ID}"

# 5. Check operation details
OPERATION="operations/ASA5MjAtNzYxORAyNDQ..."
gcloud firestore operations describe "${OPERATION}" --project="${PROJECT_ID}"
```

### Restore Selectivo (Solo algunas colecciones)

```bash
# Restore solo colecciones específicas
gcloud firestore import gs://bucket/path \
  --collection-ids=users,matches \
  --project="${PROJECT_ID}"
```

### Verificación Post-Restore

**Checklist después de restore:**

- [ ] Verificar en Firebase Console que los datos están correctos
- [ ] Ejecutar tests de la aplicación
- [ ] Verificar endpoints críticos (users, matches, payments)
- [ ] Revisar logs de la aplicación
- [ ] Monitorear errores en Sentry
- [ ] Verificar counts de documentos:

```javascript
// En Firebase Console > Firestore
db.collection('users').count()
db.collection('matches').count()
db.collection('payments').count()
```

### Rollback (Si el Restore Falló)

Si algo sale mal, puedes hacer rollback usando el backup de seguridad:

```bash
# El script te muestra el path del safety backup
SAFETY_BACKUP="gs://PROJECT_ID-backups/backups/pre-restore/20240115-143022"

# Restore desde el safety backup
./scripts/restore-firestore.sh "${SAFETY_BACKUP}"
```

---

## 📊 Monitoreo y Alertas

### Health Check Endpoint

**Endpoint**: `GET /admin/backups/health`

**Response**:
```json
{
  "status": "healthy",
  "checks": {
    "service_initialized": true,
    "bucket_accessible": true,
    "recent_backup_exists": true
  },
  "warnings": null,
  "errors": null,
  "project_id": "tu-cita-segura",
  "bucket": "tu-cita-segura-backups",
  "timestamp": "2024-01-15T14:30:22.123456"
}
```

**Estados posibles:**
- `healthy`: Todo funcionando correctamente
- `degraded`: Warnings pero funcional
- `unhealthy`: Errores críticos
- `error`: Servicio no disponible

### Listar Backups via API

**Endpoint**: `GET /admin/backups/list?backup_type=daily&limit=10`

**Response**:
```json
{
  "success": true,
  "count": 7,
  "backups": [
    {
      "path": "gs://PROJECT_ID-backups/backups/daily/20240115-020000",
      "type": "daily",
      "timestamp": "20240115-020000",
      "size_bytes": 510656780,
      "size_mb": 487.1,
      "metadata": {
        "timestamp": "20240115-020000",
        "type": "daily",
        "project_id": "tu-cita-segura",
        "git_sha": "4c0db15...",
        "triggered_by": "github-actions"
      }
    }
  ],
  "bucket": "tu-cita-segura-backups"
}
```

### Verificar Backup Integrity

**Endpoint**: `POST /admin/backups/verify?backup_path=gs://...`

**Response**:
```json
{
  "valid": true,
  "file_count": 23,
  "total_size_bytes": 510656780,
  "total_size_mb": 487.1,
  "has_metadata": true,
  "has_data_files": true,
  "files": [
    "backups/daily/20240115-020000/overall_export_metadata",
    "backups/daily/20240115-020000/output-0",
    "..."
  ]
}
```

### GitHub Actions Monitoring

**Ver status de backups:**

1. GitHub → Actions → Firestore Backup workflow
2. Revisar ejecuciones recientes
3. Verificar que no haya fallos

**Configurar notificaciones:**

1. GitHub Settings → Notifications
2. Enable "Actions" notifications
3. Recibirás email si un backup falla

### Alertas Proactivas

**Configurar alertas en Sentry** (cuando esté integrado):

```python
# backend/app/services/backup/alerts.py
if not recent_backup_exists:
    sentry_sdk.capture_message(
        "No recent backup found - data loss risk!",
        level="error"
    )
```

**Script de monitoreo** (ejecutar daily via cron):

```bash
#!/bin/bash
# Check if backup ran in last 48 hours

LATEST=$(gsutil ls gs://PROJECT_ID-backups/backups/daily/ | sort -r | head -1)
BACKUP_TIME=$(basename "$LATEST")

# Parse timestamp and check age
# Alert if > 48 hours old
```

---

## 🆘 Troubleshooting

### Backup Fails: "Permission denied"

**Error**:
```
ERROR: (gcloud.firestore.export) PERMISSION_DENIED: Missing or insufficient permissions
```

**Solución**:

1. Verificar que el service account tiene los permisos correctos:
   - `Cloud Datastore Import Export Admin`
   - `Storage Admin` (o al menos Storage Object Creator)

2. Re-generar service account key si es necesario:
   ```bash
   # Firebase Console → Settings → Service Accounts → Generate new private key
   ```

3. Actualizar secret en GitHub:
   - Settings → Secrets → `FIREBASE_SERVICE_ACCOUNT`

### Backup Fails: "Bucket not found"

**Error**:
```
ERROR: Bucket PROJECT_ID-backups not found
```

**Solución**:

El bucket se crea automáticamente en el primer backup. Si falla:

```bash
# Create bucket manually
PROJECT_ID="tu-cita-segura"
gsutil mb -p "${PROJECT_ID}" -l us-central1 "gs://${PROJECT_ID}-backups"

# Enable versioning
gsutil versioning set on "gs://${PROJECT_ID}-backups"
```

### Restore Fails: "Import operation failed"

**Error**:
```
ERROR: Import operation failed with error: Invalid backup format
```

**Causas posibles:**

1. **Backup corrupto**: Verificar con `/admin/backups/verify`
2. **Backup incompleto**: El export no terminó correctamente
3. **Versión incompatible**: Backup de versión antigua de Firestore

**Solución**:

1. Verificar backup:
   ```bash
   gsutil ls -lh gs://bucket/backup/path/
   # Debe tener overall_export_metadata y output-* files
   ```

2. Intentar con otro backup:
   ```bash
   gsutil ls gs://PROJECT_ID-backups/backups/daily/ | sort -r | head -5
   # Probar con el segundo o tercero más reciente
   ```

### Workflow Times Out

**Error**: GitHub Actions workflow timeout después de 6 horas

**Causas**:
- Database muy grande
- Export/import muy lento
- Problemas de red

**Solución**:

1. Aumentar timeout en workflow:
   ```yaml
   jobs:
     backup:
       timeout-minutes: 360  # 6 hours (default)
   ```

2. Para databases grandes (>10GB), considerar:
   - Usar Cloud Functions en lugar de GitHub Actions
   - Hacer backups incrementales
   - Exportar solo colecciones críticas

### "No space left" en Cloud Storage

**Error**: Bucket lleno, no se pueden crear más backups

**Solución**:

1. Verificar tamaño actual:
   ```bash
   gsutil du -sh gs://PROJECT_ID-backups/
   ```

2. Limpiar backups manuales antiguos:
   ```bash
   gsutil ls gs://PROJECT_ID-backups/backups/manual/ | head -n -5 | xargs gsutil -m rm -r
   ```

3. Ajustar lifecycle policies para retener menos tiempo

4. Verificar que las lifecycle policies están activas:
   ```bash
   gsutil lifecycle get gs://PROJECT_ID-backups/
   ```

### API Endpoint Returns 500

**Error**: `POST /admin/backups/trigger` devuelve 500

**Debugging**:

1. Revisar logs del backend:
   ```bash
   railway logs
   # O
   docker logs backend-container
   ```

2. Verificar que las dependencias están instaladas:
   ```bash
   pip install google-cloud-storage google-cloud-firestore-admin
   ```

3. Verificar que el service account está configurado:
   ```bash
   echo $FIREBASE_SERVICE_ACCOUNT | jq .
   ```

4. Verificar que el servicio se inicializó:
   ```python
   # Check logs para:
   # "Firestore backup service initialized successfully"
   ```

---

## 🎯 Best Practices

### DO ✅

1. **Test restore procedures regularly** (al menos monthly)
   ```bash
   # Crear proyecto de test y restaurar ahí
   gcloud firestore import gs://backup/path --project=test-project
   ```

2. **Monitor backup health proactively**
   - Setup alertas si no hay backup en 48 horas
   - Revisar GitHub Actions weekly

3. **Keep multiple backup types**
   - Daily: Para recovery rápido (last 24h)
   - Weekly: Para recovery de cambios recientes (last month)
   - Monthly: Para auditoría y compliance (last year)

4. **Document restore procedures**
   - Who can authorize restore
   - When to restore vs rollback code
   - Contact list for emergencies

5. **Verify backups periodically**
   ```bash
   # Monthly: Download y verificar un backup
   gsutil ls gs://bucket/backup/path/
   ```

6. **Use pre-restore backups**
   - El script siempre crea backup antes de restore
   - Permite rollback si algo sale mal

### DON'T ❌

1. **❌ Never delete backups manually** sin verificar retención policy

2. **❌ Never restore to production** sin:
   - Crear safety backup primero
   - Notificar al equipo
   - Tener plan de rollback
   - Verificar en staging first

3. **❌ Never assume backups work** sin testear restore

4. **❌ Never ignore backup failures** en GitHub Actions

5. **❌ Never use production service account** para backups de testing

6. **❌ Never restore partial data** sin entender consecuencias
   - Restoring solo "users" puede causar inconsistencias
   - Considerar foreign keys y relaciones

### Compliance & Security

**GDPR/Privacy:**
- Backups contienen PII (Personally Identifiable Information)
- Encriptar bucket: `gsutil encryption set ...`
- Limitar acceso: Solo admins con service account

**Retention Policy:**
- Legal requirement: Mantener backups X tiempo
- Balance: Costo de storage vs compliance

**Access Control:**
- Service account con minimal permissions
- Admin API protegido con Firebase Auth
- Logs de quién accede a backups

**Encryption:**
```bash
# Enable default encryption en bucket
gsutil encryption set -d \
  -k projects/PROJECT_ID/locations/global/keyRings/KEYRING/cryptoKeys/KEY \
  gs://PROJECT_ID-backups/
```

---

## 📚 Referencias

- [Firestore Export/Import Docs](https://firebase.google.com/docs/firestore/manage-data/export-import)
- [Cloud Storage Lifecycle](https://cloud.google.com/storage/docs/lifecycle)
- [gcloud firestore commands](https://cloud.google.com/sdk/gcloud/reference/firestore)
- [GitHub Actions Workflows](https://docs.github.com/en/actions/using-workflows)

---

## ✅ Checklist de Implementación

Antes de considerar backups "production-ready":

- [ ] GitHub Actions workflow creado (`.github/workflows/backup-firestore.yml`)
- [ ] Service account configurado con permisos correctos
- [ ] Secret `FIREBASE_SERVICE_ACCOUNT` en GitHub
- [ ] Cloud Storage bucket creado con lifecycle policies
- [ ] Backup service deployado en backend
- [ ] Admin API endpoints funcionando
- [ ] Restore script probado (`scripts/restore-firestore.sh`)
- [ ] Backup automático ejecutado al menos 1 vez exitosamente
- [ ] Health check endpoint verde
- [ ] Restore procedure probado en staging/test environment
- [ ] Documentación compartida con el equipo
- [ ] Alertas configuradas para backup failures
- [ ] Calendario de testing de restore procedures (monthly)

---

**¡IMPORTANTE!** 🚨

Los backups son tu última línea de defensa contra pérdida de datos. Un sistema de backups que nunca se ha probado es tan útil como no tener backups.

**Acción requerida**: Programa un restore drill mensualmente para verificar que todo funciona correctamente.

---

**Próximo paso**: Configurar secrets y ejecutar primer backup manual para verificar que todo funciona.
