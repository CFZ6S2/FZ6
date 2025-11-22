# 🔐 Implementación de Autenticación Real con Firebase

**Fecha**: 22 de Noviembre de 2025
**Estado**: ✅ Implementado
**Versión**: 1.0.0

---

## 📋 Resumen de Cambios

Se ha implementado un **sistema de autenticación real** usando Firebase Authentication, reemplazando completamente el sistema mock anterior que usaba tokens hardcodeados.

### ⚠️ Vulnerabilidades Corregidas:

- ❌ **ANTES**: Tokens hardcodeados como `"admin_token_secreto"`
- ✅ **AHORA**: Verificación real de tokens JWT de Firebase
- ❌ **ANTES**: Cualquiera podía ser admin con el token correcto
- ✅ **AHORA**: Verificación de custom claims y roles

---

## 🏗️ Arquitectura

### Componentes Creados:

```
backend/app/
├── services/
│   └── auth/
│       ├── __init__.py
│       └── firebase_auth.py          # Servicio principal de autenticación
├── core/
│   └── dependencies.py               # Dependencias de FastAPI
├── models/
│   └── schemas.py                    # Modelo AuthenticatedUser
└── api/
    ├── emergency_phones.py           # ✅ Actualizado
    └── payments.py                    # ✅ Actualizado
```

---

## 🔧 Cómo Usar

### 1. Endpoint Básico con Autenticación

```python
from fastapi import APIRouter, Depends
from app.core.dependencies import get_current_user
from app.models.schemas import AuthenticatedUser

router = APIRouter()

@router.get("/protected")
async def protected_route(user: AuthenticatedUser = Depends(get_current_user)):
    """
    Este endpoint requiere autenticación.
    Solo usuarios con token válido de Firebase pueden acceder.
    """
    return {
        "message": f"Hello {user.email}",
        "user_id": user.uid,
        "role": user.role
    }
```

### 2. Endpoint que Requiere Email Verificado

```python
from app.core.dependencies import get_current_verified_user

@router.post("/send-message")
async def send_message(
    message: str,
    user: AuthenticatedUser = Depends(get_current_verified_user)
):
    """
    Solo usuarios con email verificado pueden enviar mensajes.
    """
    return {"status": "sent", "from": user.email}
```

### 3. Endpoint Solo para Administradores

```python
from app.core.dependencies import get_current_admin

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    admin: AuthenticatedUser = Depends(get_current_admin)
):
    """
    Solo administradores pueden eliminar usuarios.
    """
    # Código solo accesible por admins
    return {"deleted": user_id}
```

### 4. Endpoint Solo para Concierges

```python
from app.core.dependencies import get_current_concierge

@router.post("/vip-events")
async def create_vip_event(
    event_data: VIPEventCreate,
    concierge: AuthenticatedUser = Depends(get_current_concierge)
):
    """
    Solo concierges pueden crear eventos VIP.
    """
    return {"event_id": "123", "creator": concierge.uid}
```

### 5. Endpoint con Autenticación Opcional

```python
from app.core.dependencies import get_current_user_optional

@router.get("/public")
async def public_route(
    user: Optional[AuthenticatedUser] = Depends(get_current_user_optional)
):
    """
    Este endpoint es público pero puede personalizar la respuesta si hay usuario autenticado.
    """
    if user:
        return {"message": f"Welcome back {user.email}"}
    return {"message": "Welcome guest"}
```

---

## 🔑 Modelo AuthenticatedUser

```python
class AuthenticatedUser(BaseModel):
    """Usuario autenticado desde Firebase JWT"""
    uid: str                    # ID único del usuario
    email: str                  # Email del usuario
    email_verified: bool        # ¿Email verificado?
    role: str                   # 'admin', 'concierge', 'regular'
    custom_claims: Dict         # Custom claims completos

    @property
    def is_admin(self) -> bool:
        """True si el usuario es admin"""
        return self.role == "admin"

    @property
    def is_concierge(self) -> bool:
        """True si el usuario es concierge (o admin)"""
        return self.role in ["concierge", "admin"]

    @property
    def is_verified(self) -> bool:
        """True si el email está verificado"""
        return self.email_verified
```

---

## 📡 Desde el Frontend

### 1. Obtener Token de Firebase

```javascript
// En el frontend (JavaScript)
import { getAuth } from 'firebase/auth';

const auth = getAuth();
const user = auth.currentUser;

if (user) {
    // Obtener token de ID
    const idToken = await user.getIdToken();

    // Hacer request al backend
    const response = await fetch('https://api.tucitasegura.com/api/emergency/phones', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json'
        }
    });

    const data = await response.json();
}
```

### 2. Refrescar Token Cuando Cambien Custom Claims

```javascript
// Después de que el backend actualice custom claims (ej: usuario se convierte en admin)
// Forzar refresh del token para obtener los nuevos claims
const idToken = await user.getIdToken(true);  // true = force refresh
```

### 3. Manejo de Errores de Autenticación

```javascript
async function makeAuthenticatedRequest(url, options = {}) {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
        throw new Error('No estás autenticado');
    }

    const idToken = await user.getIdToken();

    const response = await fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            'Authorization': `Bearer ${idToken}`
        }
    });

    if (response.status === 401) {
        // Token expirado o inválido
        console.error('Token inválido o expirado');
        // Redirigir a login
        window.location.href = '/login.html';
    }

    if (response.status === 403) {
        // Sin permisos
        console.error('No tienes permisos para esta acción');
    }

    return response.json();
}
```

---

## 🛡️ Verificación de Permisos

### Verificar Ownership de Recursos

```python
from app.services.auth.firebase_auth import firebase_auth_service

@router.get("/users/{user_id}/profile")
async def get_profile(
    user_id: str,
    user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Usuario solo puede ver su propio perfil (o admin puede ver cualquiera).
    """
    # Verificar que el usuario es dueño del recurso o es admin
    await firebase_auth_service.verify_resource_ownership(
        user.custom_claims,
        user_id,
        allow_admin=True
    )

    # Si llega aquí, tiene permiso
    return {"user_id": user_id, "profile": "..."}
```

---

## 🔐 Custom Claims

### Establecer Custom Claims (Backend)

```python
from app.services.auth.firebase_auth import firebase_auth_service

# Establecer rol de admin
await firebase_auth_service.set_custom_claims(
    uid="user123",
    claims={
        "role": "admin",
        "hasActiveSubscription": True,
        "hasAntiGhostingInsurance": True
    }
)
```

### Leer Custom Claims en Firestore Rules

```javascript
// firestore.rules
function isAdmin() {
    return request.auth.token.role == 'admin';
}

function hasActiveMembership() {
    return request.auth.token.hasActiveSubscription == true;
}

match /users/{userId} {
    allow delete: if isAdmin();
    allow create: if isAuthed() && hasActiveMembership();
}
```

---

## 📊 Códigos de Estado HTTP

| Código | Significado | Acción |
|--------|-------------|--------|
| `200` | OK | Request exitoso |
| `401` | Unauthorized | Token inválido/expirado - Redirigir a login |
| `403` | Forbidden | Sin permisos - Mostrar mensaje de error |
| `404` | Not Found | Recurso no encontrado |
| `500` | Internal Error | Error del servidor |

---

## 🧪 Testing

### Test de Endpoint con Autenticación

```python
import pytest
from firebase_admin import auth
from fastapi.testclient import TestClient

@pytest.fixture
def auth_headers(test_user_uid):
    """Crear headers con token válido para tests"""
    # Crear custom token para tests
    custom_token = auth.create_custom_token(test_user_uid)

    # En producción, el frontend intercambiará este token por un ID token
    # Para tests, simulamos el ID token
    return {
        "Authorization": f"Bearer {custom_token}"
    }

def test_protected_endpoint(client: TestClient, auth_headers):
    """Test de endpoint protegido"""
    response = client.get("/protected", headers=auth_headers)
    assert response.status_code == 200

def test_protected_endpoint_without_auth(client: TestClient):
    """Test sin autenticación debe fallar"""
    response = client.get("/protected")
    assert response.status_code == 401
```

---

## ⚡ Servicios Disponibles

### FirebaseAuthService

Métodos disponibles en `firebase_auth_service`:

```python
# Verificar token
decoded_token = await firebase_auth_service.verify_token(token)

# Verificar email verificado
is_verified = await firebase_auth_service.verify_email_verified(decoded_token)

# Obtener rol
role = await firebase_auth_service.get_user_role(decoded_token)

# Verificar admin
await firebase_auth_service.verify_admin(decoded_token)

# Verificar concierge
await firebase_auth_service.verify_concierge(decoded_token)

# Verificar ownership
await firebase_auth_service.verify_resource_ownership(
    decoded_token,
    resource_user_id,
    allow_admin=True
)

# Obtener info de usuario
user_info = await firebase_auth_service.get_user_info(uid)

# Establecer custom claims
await firebase_auth_service.set_custom_claims(uid, {"role": "admin"})

# Revocar tokens de refresh (forzar re-autenticación)
await firebase_auth_service.revoke_refresh_tokens(uid)
```

---

## 🔄 Migración de Código Existente

### ANTES (Mock):

```python
async def verify_admin_access(credentials):
    token = credentials.credentials
    if token != "admin_token_secreto":  # ❌ INSEGURO
        raise HTTPException(403)
    return {"user_id": "admin", "is_admin": True}

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    user = Depends(verify_admin_access)  # ❌ Mock
):
    ...
```

### AHORA (Real):

```python
from app.core.dependencies import get_current_admin

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    admin: AuthenticatedUser = Depends(get_current_admin)  # ✅ Real
):
    # Solo admins reales pueden llegar aquí
    ...
```

---

## 📝 Checklist de Migración

Para migrar un endpoint existente:

- [ ] Importar `get_current_user` (o variante) de `app.core.dependencies`
- [ ] Importar `AuthenticatedUser` de `app.models.schemas`
- [ ] Agregar parámetro `user: AuthenticatedUser = Depends(get_current_user)` al endpoint
- [ ] Reemplazar referencias a `user_id` del parámetro con `user.uid`
- [ ] Eliminar funciones mock de verificación (ej: `verify_admin_access`)
- [ ] Actualizar docstring con requisitos de autenticación
- [ ] Agregar logging de seguridad
- [ ] Actualizar tests

---

## 🚨 Errores Comunes

### 1. Token Expirado

**Error**: `ExpiredIdTokenError`
**Solución**: El frontend debe refrescar el token automáticamente:

```javascript
auth.currentUser.getIdToken(true)  // Force refresh
```

### 2. Custom Claims No Actualizados

**Error**: Usuario pagó pero Firestore Rules dicen que no tiene membresía
**Solución**: Forzar refresh del token en el frontend después de cambios:

```javascript
// Después de pago exitoso
await user.getIdToken(true);  // Force refresh para obtener nuevos claims
```

### 3. Email No Verificado

**Error**: `HTTPException 403: "Debes verificar tu email"`
**Solución**: Enviar email de verificación:

```javascript
import { sendEmailVerification } from 'firebase/auth';
await sendEmailVerification(user);
```

---

## 📚 Referencias

- [Firebase Auth Documentation](https://firebase.google.com/docs/auth)
- [FastAPI Dependencies](https://fastapi.tiangolo.com/tutorial/dependencies/)
- [Custom Claims Best Practices](https://firebase.google.com/docs/auth/admin/custom-claims)

---

## ✅ Estado de Implementación

| Componente | Estado | Notas |
|------------|--------|-------|
| FirebaseAuthService | ✅ Completo | Servicio principal |
| Dependencies | ✅ Completo | get_current_user, get_current_admin, etc. |
| AuthenticatedUser Model | ✅ Completo | Con properties helper |
| emergency_phones.py | ✅ Migrado | Sin mocks |
| payments.py | ✅ Migrado | Sin mocks |
| Tests | ⏳ Pendiente | Crear tests unitarios |
| Frontend Integration | ⏳ Pendiente | Actualizar llamadas API |

---

**Última actualización**: 22 de Noviembre de 2025
**Autor**: Sistema de Auditoría Automatizado
**Versión del documento**: 1.0.0
