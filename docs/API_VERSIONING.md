# 🔄 API Versioning Strategy

## Overview

TuCitaSegura API implements URL-based versioning to ensure backwards compatibility and smooth transitions between API versions.

## Versioning Scheme

### URL Structure
```
https://api.tucitasegura.com/v{version}/{resource}
```

### Current Versions

| Version | Status | Base Path | Documentation |
|---------|--------|-----------|---------------|
| v1 | **Stable** | `/v1` | [Swagger Docs](/docs) |
| v2 | Planned | `/v2` | TBD |

## Version 1 (v1) - Current

### Status
- ✅ **Stable**: Production-ready
- ✅ **Supported**: Full support and bug fixes
- ❌ **Deprecated**: No
- 📅 **EOL Date**: TBD

### Features
- Payment processing (PayPal integration)
- Emergency phone management
- User authentication (Firebase)
- SOS alerts
- VIP events & concierge
- Subscriptions & insurance
- Matching system
- Real-time messaging

### Endpoints

#### Version Info
- `GET /v1` - API v1 root
- `GET /v1/info` - Detailed version information

#### Payments
- `POST /v1/api/payments/process-payment` - Process PayPal payment
- `GET /v1/api/payments/validate` - Validate payment status
- `POST /v1/api/payments/webhook` - PayPal webhook

#### Emergency Phones
- `GET /v1/api/emergency-phones` - List emergency contacts
- `POST /v1/api/emergency-phones` - Add emergency contact
- `PUT /v1/api/emergency-phones/{id}` - Update emergency contact
- `DELETE /v1/api/emergency-phones/{id}` - Delete emergency contact

### Migration from Legacy Endpoints

Legacy endpoints (without version prefix) are still supported but **deprecated**:

```bash
# Legacy (deprecated)
POST /api/payments/process-payment

# New (recommended)
POST /v1/api/payments/process-payment
```

**Action Required**: Update client applications to use versioned endpoints.

**Timeline**: Legacy endpoints will be removed in 6 months (Q2 2025).

## Versioning Best Practices

### For API Consumers

1. **Always specify version**: Use `/v1/` prefix in all API calls
2. **Monitor deprecation notices**: Check response headers for deprecation warnings
3. **Test before migration**: Use staging environment to test new versions
4. **Handle errors gracefully**: Implement proper error handling for version mismatches

### For API Developers

1. **Backwards compatibility**: Never break existing v1 endpoints
2. **Increment versions**: Create v2 for breaking changes
3. **Document changes**: Maintain changelog for each version
4. **Deprecation period**: Give 6 months notice before removing versions

## Version Lifecycle

### Stages

1. **Development** → In progress, not production-ready
2. **Beta** → Feature-complete, testing phase
3. **Stable** → Production-ready, full support
4. **Deprecated** → Supported but discouraged, migration recommended
5. **EOL** → No longer supported, removed from API

### Deprecation Process

1. **Announcement** (T-6 months)
   - Add deprecation notice to documentation
   - Include `Deprecation` header in API responses
   - Notify via email/blog post

2. **Migration Period** (6 months)
   - Provide migration guide
   - Support both old and new versions
   - Monitor usage metrics

3. **End of Life** (T-0)
   - Remove deprecated version
   - Return 410 Gone for old endpoints
   - Redirect to current version documentation

## Response Headers

### Version Information
```http
X-API-Version: 1.0.0
X-API-Version-Status: stable
```

### Deprecation Warning
```http
Deprecation: true
Sunset: Sat, 1 Jun 2025 23:59:59 GMT
Link: </v2/info>; rel="successor-version"
```

## Breaking Changes

Breaking changes require a new major version (v2, v3, etc.):

- Removing or renaming fields
- Changing data types
- Modifying authentication mechanism
- Altering error response format
- Changing rate limits significantly

## Non-Breaking Changes

These can be added to current version (v1.1, v1.2, etc.):

- Adding new optional fields
- Adding new endpoints
- Adding new query parameters (optional)
- Expanding enum values
- Improving performance

## Example: Version Check

```python
import httpx

response = httpx.get("https://api.tucitasegura.com/v1/info")
version_info = response.json()

print(f"Version: {version_info['version']}")
print(f"Status: {version_info['status']}")
print(f"Deprecated: {version_info['deprecated']}")

if version_info['deprecated']:
    print(f"⚠️ This version will be removed on {version_info['eol_date']}")
```

## Testing Different Versions

### cURL Examples

```bash
# V1 endpoint
curl -X POST https://api.tucitasegura.com/v1/api/payments/process-payment \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": 9.99, "currency": "EUR"}'

# Version info
curl https://api.tucitasegura.com/v1/info
```

### Python Example

```python
from httpx import AsyncClient

class TuCitaSeguraClient:
    def __init__(self, api_version: str = "v1"):
        self.base_url = f"https://api.tucitasegura.com/{api_version}"
        self.client = AsyncClient(base_url=self.base_url)

    async def process_payment(self, amount: float, currency: str):
        return await self.client.post(
            "/api/payments/process-payment",
            json={"amount": amount, "currency": currency}
        )

# Usage
client = TuCitaSeguraClient(api_version="v1")
await client.process_payment(9.99, "EUR")
```

## Changelog

### v1.0.0 (Current)
- Initial stable release
- PayPal payment processing
- Emergency phone management
- Firebase authentication
- Rate limiting & security features

### v2.0.0 (Planned - Q3 2025)
- GraphQL support
- Improved error responses
- Enhanced subscription management
- WebSocket real-time events
- Improved authentication flow

## Support

For questions about API versioning:
- **Documentation**: [/docs](/docs)
- **Support**: support@tucitasegura.com
- **GitHub Issues**: [Report Issue](https://github.com/tucitasegura/api/issues)

## References

- [Semantic Versioning](https://semver.org/)
- [REST API Versioning Best Practices](https://restfulapi.net/versioning/)
- [RFC 7231 - HTTP/1.1 Semantics](https://tools.ietf.org/html/rfc7231)
