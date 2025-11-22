# 🔧 Console.log Migration Guide

## ⚠️ Issue Identified

**Audit finding:** 98 `console.log()` statements found in 20 HTML files

**Risk:** Information disclosure in production environment

**Solution:** Migrate to conditional logging system using `logger.js`

---

## 📋 Migration Steps

### 1. Understand the Logger System

The project already has a conditional logger in `webapp/js/logger.js`:

```javascript
// logger.js features:
- logger.debug()   // Only logs in development
- logger.info()    // Logs in development, important info in production
- logger.warn()    // Always logs warnings
- logger.error()   // Always logs errors
```

**When to use each:**
- `logger.debug()` - Development debugging (replaces most console.log)
- `logger.info()` - Important events (user login, data loaded)
- `logger.warn()` - Warnings (deprecated features, non-critical issues)
- `logger.error()` - Errors (caught exceptions, failed operations)

### 2. Import Logger in HTML Files

**BEFORE:**
```html
<script type="module">
  import { auth, db, storage } from './js/firebase-config.js';
  import { showToast } from './js/utils.js';

  console.log('User logged in:', user); // ❌ Always logs
</script>
```

**AFTER:**
```html
<script type="module">
  import { auth, db, storage } from './js/firebase-config.js';
  import { showToast } from './js/utils.js';
  import { logger } from './js/logger.js'; // ✅ Add this import

  logger.debug('User logged in:', user); // ✅ Only logs in dev
</script>
```

### 3. Migration Patterns

#### Pattern 1: Debug Information
```javascript
// BEFORE
console.log('Loading user data...');
console.log('User:', userData);

// AFTER
logger.debug('Loading user data...');
logger.debug('User:', userData);
```

#### Pattern 2: Important Events
```javascript
// BEFORE
console.log('User logged in successfully');

// AFTER
logger.info('User logged in successfully');
```

#### Pattern 3: Error Logging
```javascript
// BEFORE
console.error('Error loading profile:', error);

// AFTER
logger.error('Error loading profile:', error);
```

#### Pattern 4: Warnings
```javascript
// BEFORE
console.warn('No profile photo found');

// AFTER
logger.warn('No profile photo found');
```

---

## 🎯 Files to Migrate (20 files)

### High Priority (User-facing pages)
1. `webapp/login.html` (2 console.logs)
2. `webapp/register.html` (2 console.logs)
3. `webapp/perfil.html` (6 console.logs)
4. `webapp/buscar-usuarios.html` (10 console.logs)
5. `webapp/chat.html` (9 console.logs)
6. `webapp/conversaciones.html` (4 console.logs)

### Medium Priority (Features)
7. `webapp/cita-detalle.html` (4 console.logs)
8. `webapp/eventos-vip.html` (3 console.logs)
9. `webapp/evento-detalle.html` (9 console.logs)
10. `webapp/concierge-dashboard.html` (3 console.logs)
11. `webapp/reportes.html` (5 console.logs)
12. `webapp/suscripcion.html` (5 console.logs)
13. `webapp/seguro.html` (5 console.logs)
14. `webapp/cuenta-pagos.html` (4 console.logs)
15. `webapp/ayuda.html` (1 console.log)
16. `webapp/seguridad.html` (4 console.logs)

### Low Priority (Admin & Testing)
17. `webapp/admin/dashboard.html` (6 console.logs)
18. `webapp/verify-appcheck.html` (8 console.logs)
19. `webapp/ejemplo-con-appcheck.html` (6 console.logs)
20. `webapp/example-notification-integration.html` (2 console.logs)

**Total:** 98 console.logs across 20 files

---

## 🔍 Find & Replace Strategy

### Step 1: Find all console.log statements
```bash
grep -n "console\.log" webapp/*.html webapp/admin/*.html
```

### Step 2: Categorize by type

**Debug (most common - ~70%):**
```javascript
console.log('Data loaded:', data);
console.log('Current user:', user);
console.log('Processing...');
```
→ Replace with `logger.debug()`

**Info (~20%):**
```javascript
console.log('Login successful');
console.log('Profile updated');
console.log('Payment completed');
```
→ Replace with `logger.info()`

**Error (~5%):**
```javascript
console.error('Error:', error);
```
→ Replace with `logger.error()` (already correct pattern)

**Warn (~5%):**
```javascript
console.warn('Deprecated feature');
```
→ Replace with `logger.warn()` (already correct pattern)

### Step 3: Add logger import to each file

Files that need import added:
- All 20 HTML files listed above

**Import statement to add:**
```javascript
import { logger } from './js/logger.js';
```

---

## ✅ Verification

### Test Each Page After Migration

```javascript
// In browser console, check environment detection:
localStorage.setItem('DEBUG_MODE', 'true'); // Enable debug logs
// OR
localStorage.removeItem('DEBUG_MODE');      // Disable (production mode)

// Reload page and verify:
// - Debug logs appear only when DEBUG_MODE is true
// - Info/warn/error logs always appear
```

### Automated Testing

```bash
# After migration, verify no console.log remains:
grep -r "console\.log" webapp/*.html webapp/admin/*.html

# Expected output: (none)
# If any found, migrate those files
```

---

## 📊 Expected Impact

### Before Migration
```
✗ 98 console.log statements in production
✗ Potential information disclosure
✗ Console pollution for end users
✗ Debug info visible to attackers
```

### After Migration
```
✓ 0 console.log in production (only in development)
✓ No information disclosure
✓ Clean console for end users
✓ Professional production environment
```

---

## 🕒 Estimated Time

- **Per file:** 5-10 minutes
- **Total (20 files):** 2-3 hours
- **Priority files only (6):** 30-60 minutes

---

## 📝 Example: Complete Migration

**File:** `webapp/perfil.html`

**BEFORE:**
```html
<script type="module">
  import { auth, db, storage } from './js/firebase-config.js';
  import { showToast } from './js/utils.js';

  console.log('Loading profile page');

  async function loadUserData() {
    console.log('Fetching user data...');
    try {
      const userData = await getUserData();
      console.log('User data:', userData);
      displayProfile(userData);
    } catch (error) {
      console.error('Error loading profile:', error);
      showToast('Error al cargar perfil', 'error');
    }
  }
</script>
```

**AFTER:**
```html
<script type="module">
  import { auth, db, storage } from './js/firebase-config.js';
  import { showToast } from './js/utils.js';
  import { logger } from './js/logger.js'; // ✅ Added

  logger.debug('Loading profile page'); // ✅ Changed

  async function loadUserData() {
    logger.debug('Fetching user data...'); // ✅ Changed
    try {
      const userData = await getUserData();
      logger.debug('User data:', userData); // ✅ Changed
      displayProfile(userData);
      logger.info('Profile loaded successfully'); // ✅ Added
    } catch (error) {
      logger.error('Error loading profile:', error); // ✅ Changed
      showToast('Error al cargar perfil', 'error');
    }
  }
</script>
```

---

## 🚀 Quick Start

### Option 1: Manual Migration (Recommended)
1. Start with high-priority files (login, register, perfil)
2. Add logger import
3. Replace console.log → logger.debug
4. Test page functionality
5. Move to next file

### Option 2: Bulk Find & Replace (Faster but needs review)
```bash
# 1. Add imports (manual per file)
# 2. Replace console.log with logger.debug
sed -i 's/console\.log(/logger.debug(/g' webapp/*.html

# ⚠️ WARNING: This replaces ALL console.log blindly
# Review changes before committing!
```

---

## 📞 Related Documentation

- `webapp/js/logger.js` - Logger implementation
- `SECURITY_AUDIT_2025-11-14.md` - Full audit report
- `DEVELOPMENT.md` - Development best practices

---

**Priority:** 🟡 **HIGH** (Security & Professionalism)
**Estimated Time:** 2-3 hours full migration
**Status:** Ready to implement
**Last Updated:** 2025-11-14
