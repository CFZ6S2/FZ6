# TuCitaSegura - API Documentation

## Overview

TuCitaSegura Backend API v1.0.0 provides RESTful endpoints for the dating platform with Firebase authentication, intelligent recommendations, and comprehensive security features.

**Base URL:** `https://tucitasegura-api.railway.app` (Production)
**Base URL:** `http://localhost:8000` (Development)

**Interactive Docs:**
- Swagger UI: `/docs`
- ReDoc: `/redoc`

---

## Authentication

Most endpoints require Firebase authentication. Include the Firebase ID token in the Authorization header:

```
Authorization: Bearer <firebase-id-token>
```

### Getting a Token

Use Firebase Client SDK to get an ID token:

```javascript
const token = await firebase.auth().currentUser.getIdToken();
```

---

## Rate Limiting

All endpoints are rate-limited to prevent abuse:

| Endpoint Type | Rate Limit |
|--------------|------------|
| Authentication | 5 requests/minute |
| File Uploads | 10 requests/minute |
| Messaging | 20 requests/minute |
| Search | 30 requests/minute |
| General API | 100 requests/minute |
| Public | 200 requests/hour |

Rate limit information is included in response headers:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Time when limit resets

When rate limit is exceeded, you'll receive a `429 Too Many Requests` response.

---

## Endpoints

### Health & Status

#### `GET /`
Health check endpoint (public)

**Response:**
```json
{
  "status": "OK",
  "service": "TuCitaSegura API",
  "version": "1.0.0",
  "message": "Backend FZ6 operativo ✅"
}
```

#### `GET /health`
Detailed health check (public)

**Response:**
```json
{
  "status": "healthy",
  "service": "tucitasegura-api",
  "firebase": "connected",
  "environment": "production"
}
```

---

## Recommendations API

### `GET /api/v1/recommendations/`

Get personalized match recommendations for a user.

**Authentication:** Required
**Rate Limit:** 30/minute

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| user_id | string | Yes | - | Firebase user ID |
| limit | integer | No | 10 | Number of recommendations (1-50) |
| min_score | float | No | 0.5 | Minimum compatibility score (0.0-1.0) |

**Example Request:**
```bash
curl -X GET "https://api.tucitasegura.com/api/v1/recommendations/?user_id=abc123&limit=10&min_score=0.7" \
  -H "Authorization: Bearer <token>"
```

**Response:**
```json
{
  "success": true,
  "count": 10,
  "recommendations": [
    {
      "user_id": "user_xyz",
      "compatibility_score": 0.85,
      "distance_km": 5.2,
      "common_interests": ["travel", "music", "fitness"],
      "reasons": [
        "Alto nivel de compatibilidad (85%)",
        "Viven cerca (5.2 km)",
        "3 intereses en común"
      ],
      "recommended_at": "2025-11-28T10:30:00Z"
    }
  ],
  "generated_at": "2025-11-28T10:30:00Z"
}
```

---

### `POST /api/v1/recommendations/refresh`

Regenerate recommendations for a user (useful after profile updates).

**Authentication:** Required
**Rate Limit:** 10/minute

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| user_id | string | Yes | Firebase user ID |

**Example Request:**
```bash
curl -X POST "https://api.tucitasegura.com/api/v1/recommendations/refresh?user_id=abc123" \
  -H "Authorization: Bearer <token>"
```

**Response:**
```json
{
  "success": true,
  "message": "Recomendaciones actualizadas",
  "user_id": "abc123",
  "refreshed_at": "2025-11-28T10:30:00Z"
}
```

---

### `GET /api/v1/recommendations/compatibility/{user_id_1}/{user_id_2}`

Calculate compatibility score between two specific users.

**Authentication:** Required
**Rate Limit:** 30/minute

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| user_id_1 | string | First user's Firebase ID |
| user_id_2 | string | Second user's Firebase ID |

**Example Request:**
```bash
curl -X GET "https://api.tucitasegura.com/api/v1/recommendations/compatibility/user1/user2" \
  -H "Authorization: Bearer <token>"
```

**Response:**
```json
{
  "success": true,
  "user_id_1": "user1",
  "user_id_2": "user2",
  "compatibility_score": 0.78,
  "breakdown": {
    "interests": 0.85,
    "location": 0.92,
    "age_compatibility": 0.70,
    "lifestyle": 0.65
  },
  "common_interests": ["travel", "music"],
  "distance_km": 3.5,
  "calculated_at": "2025-11-28T10:30:00Z"
}
```

---

### `POST /api/v1/recommendations/preferences/{user_id}`

Update user's search preferences.

**Authentication:** Required
**Rate Limit:** 10/minute

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| user_id | string | Firebase user ID |

**Request Body:**
```json
{
  "min_age": 25,
  "max_age": 35,
  "max_distance_km": 50,
  "gender_preference": "any",
  "relationship_goals": ["serious", "marriage"],
  "interests": ["travel", "music", "sports"]
}
```

**Field Validation:**
| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| min_age | integer | Yes | 18-100 |
| max_age | integer | Yes | 18-100 |
| max_distance_km | integer | Yes | 1-500 |
| gender_preference | string | Yes | "male", "female", or "any" |
| relationship_goals | array | No | List of strings |
| interests | array | No | List of strings |

**Response:**
```json
{
  "success": true,
  "message": "Preferencias actualizadas correctamente",
  "user_id": "abc123",
  "preferences": {
    "min_age": 25,
    "max_age": 35,
    "max_distance_km": 50,
    "gender_preference": "any",
    "relationship_goals": ["serious", "marriage"],
    "interests": ["travel", "music", "sports"]
  },
  "updated_at": "2025-11-28T10:30:00Z"
}
```

---

### `GET /api/v1/recommendations/stats/{user_id}`

Get recommendation statistics for a user.

**Authentication:** Required
**Rate Limit:** 30/minute

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| user_id | string | Firebase user ID |

**Example Request:**
```bash
curl -X GET "https://api.tucitasegura.com/api/v1/recommendations/stats/abc123" \
  -H "Authorization: Bearer <token>"
```

**Response:**
```json
{
  "success": true,
  "user_id": "abc123",
  "stats": {
    "total_recommendations": 45,
    "viewed": 32,
    "liked": 12,
    "matched": 5,
    "match_rate": 0.41,
    "average_compatibility_score": 0.73,
    "last_updated": "2025-11-28T10:30:00Z"
  }
}
```

---

## Validation API

Server-side input validation endpoints to ensure data integrity.

### `POST /api/v1/validation/email`

Validate email address format.

**Authentication:** Not required
**Rate Limit:** 100/minute

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "valid": true,
  "message": "Email válido",
  "details": {
    "email": "user@example.com"
  }
}
```

---

### `POST /api/v1/validation/password`

Validate password strength with detailed feedback.

**Authentication:** Not required
**Rate Limit:** 100/minute

**Request Body:**
```json
{
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "valid": true,
  "message": "Contraseña muy fuerte (score: 95/100)",
  "details": {
    "score": 95,
    "strength": "muy fuerte",
    "errors": [],
    "valid": true
  }
}
```

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- Special characters recommended for higher score

**Strength Levels:**
| Score | Strength |
|-------|----------|
| 90-100 | muy fuerte |
| 75-89 | fuerte |
| 50-74 | moderada |
| 0-49 | débil |

---

### `POST /api/v1/validation/phone`

Validate phone number format.

**Authentication:** Not required
**Rate Limit:** 100/minute

**Request Body:**
```json
{
  "phone": "+34612345678"
}
```

**Accepted Formats:**
- International: `+34612345678`
- National: `612345678`
- 9-15 digits total

---

### `POST /api/v1/validation/username`

Validate username format.

**Authentication:** Not required
**Rate Limit:** 100/minute

**Request Body:**
```json
{
  "username": "john_doe"
}
```

**Username Rules:**
- 3-30 characters
- Only letters, numbers, dots, hyphens, underscores
- Cannot start with dot or hyphen

---

### `POST /api/v1/validation/dni`

Validate Spanish DNI or NIE.

**Authentication:** Not required
**Rate Limit:** 100/minute

**Request Body:**
```json
{
  "dni": "12345678Z"
}
```

**Accepted Formats:**
- DNI: `12345678A` (8 digits + letter)
- NIE: `X1234567A`, `Y1234567A`, `Z1234567A`

**Response:**
```json
{
  "valid": true,
  "message": "DNI válido",
  "details": {
    "type": "DNI"
  }
}
```

---

### `POST /api/v1/validation/age`

Validate age from birthdate.

**Authentication:** Not required
**Rate Limit:** 100/minute

**Query Parameters:**
| Parameter | Type | Format | Description |
|-----------|------|--------|-------------|
| birthdate | string | YYYY-MM-DD | Date of birth |

**Example Request:**
```bash
curl -X POST "https://api.tucitasegura.com/api/v1/validation/age?birthdate=1990-01-01"
```

**Response:**
```json
{
  "valid": true,
  "message": "Edad: 35 años (válido)",
  "details": {
    "age": 35,
    "is_adult": true,
    "birthdate": "1990-01-01"
  }
}
```

---

### `POST /api/v1/validation/batch`

Validate multiple fields at once.

**Authentication:** Not required
**Rate Limit:** 100/minute

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "phone": "+34612345678",
  "username": "john_doe",
  "dni": "12345678Z"
}
```

**Response:**
```json
{
  "success": true,
  "all_valid": true,
  "results": {
    "email": {
      "valid": true,
      "message": "Email válido"
    },
    "password": {
      "score": 95,
      "strength": "muy fuerte",
      "errors": [],
      "valid": true
    },
    "phone": {
      "valid": true,
      "message": "Teléfono válido"
    },
    "username": {
      "valid": true,
      "message": "Username válido"
    },
    "dni": {
      "valid": true,
      "message": "DNI válido",
      "type": "DNI"
    }
  }
}
```

---

## Error Responses

All endpoints return consistent error responses:

### 400 Bad Request
```json
{
  "error": true,
  "status_code": 400,
  "message": "Invalid request parameters"
}
```

### 401 Unauthorized
```json
{
  "error": true,
  "status_code": 401,
  "message": "Invalid or missing authentication token"
}
```

### 422 Validation Error
```json
{
  "error": true,
  "status_code": 422,
  "message": "Validation error",
  "detail": [
    {
      "loc": ["body", "email"],
      "msg": "value is not a valid email address",
      "type": "value_error.email"
    }
  ]
}
```

### 429 Rate Limit Exceeded
```json
{
  "error": true,
  "status_code": 429,
  "message": "Demasiadas solicitudes. Por favor, intenta más tarde.",
  "detail": "Límite de 100/minute excedido",
  "retry_after": "60 seconds"
}
```

### 500 Internal Server Error
```json
{
  "error": true,
  "status_code": 500,
  "message": "Internal server error"
}
```

---

## Best Practices

### 1. Always Include Authentication
For protected endpoints, always include the Firebase token:
```javascript
const response = await fetch('/api/v1/recommendations/', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

### 2. Handle Rate Limits
Check rate limit headers and implement exponential backoff:
```javascript
if (response.status === 429) {
  const retryAfter = response.headers.get('Retry-After');
  await sleep(retryAfter * 1000);
  // Retry request
}
```

### 3. Validate Client-Side First
Use client-side validation before making API calls to reduce load:
```javascript
// Validate email format before API call
if (!isValidEmail(email)) {
  showError('Invalid email format');
  return;
}

// Then validate server-side for security
const response = await fetch('/api/v1/validation/email', {
  method: 'POST',
  body: JSON.stringify({ email })
});
```

### 4. Use Batch Validation
For forms with multiple fields, use batch validation:
```javascript
const response = await fetch('/api/v1/validation/batch', {
  method: 'POST',
  body: JSON.stringify({
    email: formData.email,
    password: formData.password,
    username: formData.username
  })
});
```

### 5. Cache Recommendations
Cache recommendation results to reduce API calls:
```javascript
const cacheKey = `recommendations_${userId}`;
const cached = localStorage.getItem(cacheKey);

if (cached && Date.now() - cached.timestamp < 300000) { // 5 minutes
  return cached.data;
}

const response = await fetch('/api/v1/recommendations/...');
localStorage.setItem(cacheKey, {
  data: await response.json(),
  timestamp: Date.now()
});
```

---

## Changelog

### v1.0.0 (2025-11-28)
- ✅ Initial API release
- ✅ Recommendations endpoints
- ✅ Validation endpoints
- ✅ Server-side rate limiting
- ✅ Firebase authentication
- ✅ Comprehensive error handling

---

## Support

For API issues or questions:
- GitHub Issues: https://github.com/CFZ6S2/FZ6/issues
- Email: support@tucitasegura.com
- Documentation: https://docs.tucitasegura.com
