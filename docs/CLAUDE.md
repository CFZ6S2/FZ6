# CLAUDE.md - TuCitaSegura Developer Guide for AI Assistants

> **Last Updated:** 2025-11-14
> **Project:** TuCitaSegura (Premium Dating Platform)
> **Main Branch:** `claude/claude-md-mhymenkglzshcxub-01AwaEAHXCtZafGo3nmHBYGA`
> **Firebase Project:** `tuscitasseguras-2d1a6`

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Architecture & Key Concepts](#3-architecture--key-concepts)
4. [Directory Structure](#4-directory-structure)
5. [Development Workflows](#5-development-workflows)
6. [Code Conventions](#6-code-conventions)
7. [Security & Business Rules](#7-security--business-rules)
8. [Firebase Integration](#8-firebase-integration)
9. [Key Files Reference](#9-key-files-reference)
10. [Common Tasks & How-Tos](#10-common-tasks--how-tos)
11. [Testing Approach](#11-testing-approach)
12. [Deployment](#12-deployment)
13. [Important Gotchas](#13-important-gotchas)
14. [Resources & Documentation](#14-resources--documentation)

---

## 1. Project Overview

### What is TuCitaSegura?

**TuCitaSegura** (YourSafeDating) is a premium dating web application focused on **serious, committed relationships** with unique safety mechanisms.

**Core Features:**
- Anti-ghosting insurance system (€120 one-time payment)
- Identity verification and reputation system (Bronze/Silver/Gold/Platinum)
- **Heterosexual matching only** (backend-enforced)
- Paid memberships for men (€29.99/month), currently free for women
- VIP Events system with Concierge role (€199/month)
- 1-to-1 chat with date proposals
- Geolocation-based matching with Google Maps
- QR code validation for dates

**Target Market:** Spanish-speaking adults (18+) looking for serious relationships

**Current Status:** Production-ready frontend, Python backend (FastAPI) planned for ML/CV features

---

## 2. Technology Stack

### Frontend (Production)
```javascript
// Core Technologies
- Vanilla JavaScript (ES6+ modules) - NO framework
- Tailwind CSS (CDN) - Utility-first styling
- Font Awesome 6.4.0 - Icons
- Google Fonts (Inter) - Typography
```

### Backend Services

#### Firebase (Primary Backend)
```yaml
Authentication: Email/Password with verification
Database: Cloud Firestore (NoSQL, real-time)
Storage: Firebase Storage (photos)
Functions: Cloud Functions (Node.js 18)
Security:
  - App Check with reCAPTCHA Enterprise
  - Comprehensive Firestore Rules (336 lines)
  - Role-based access control
```

#### Python Backend (Optional - ML/AI Features)
```python
# Framework
FastAPI 0.104.1 with Uvicorn

# ML/AI Stack
scikit-learn 1.3.2      # Recommendation engine
OpenCV 4.8.1.78         # Photo verification
NLTK 3.8.1              # Message moderation

# Database
PostgreSQL + SQLAlchemy 2.0.23
Firebase Admin SDK

# Payments
Stripe 7.4.0 (alternative to PayPal)

# Background Tasks
Celery 5.3.4 + Redis

# Monitoring
Sentry SDK
```

### Third-Party APIs
- **Google Maps JavaScript API** (Places, Geometry, Maps)
- **PayPal SDK** (Subscriptions & one-time payments)
- **reCAPTCHA Enterprise** (Bot protection)

---

## 3. Architecture & Key Concepts

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Client (HTML/JS)                         │
│              Vanilla JS + Tailwind CSS                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│               Firebase Services                             │
│  ┌──────────────┬──────────────┬──────────────────────┐    │
│  │ Auth         │ Firestore    │ Storage              │    │
│  │ (Email/Pass) │ (Real-time)  │ (Photos)             │    │
│  └──────────────┴──────────────┴──────────────────────┘    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│         Security Rules (336 lines) - CRITICAL               │
│     ⚠️ ENFORCES ALL BUSINESS LOGIC (backend)                │
│  • Heterosexual search only                                 │
│  • Payment validation                                       │
│  • Role-based access                                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│        Cloud Functions (Node.js 18)                         │
│  • Custom claims management                                 │
│  • Chat ACL synchronization                                 │
│  • Webhooks (planned)                                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼ (optional)
┌─────────────────────────────────────────────────────────────┐
│        FastAPI Backend (Python) - Future                    │
│  • ML Recommendation Engine                                 │
│  • CV Photo Verification                                    │
│  • NLP Message Moderation                                   │
│  • Analytics & Fraud Detection                              │
└─────────────────────────────────────────────────────────────┘
```

### Design Patterns

#### 1. Security-First Architecture
**Critical Principle:** All business rules are enforced at the **Firestore Security Rules level** (backend), NOT in frontend JavaScript.

```javascript
// ❌ WRONG: Frontend-only validation (can be bypassed)
if (user.gender === 'masculino' && !user.hasActiveSubscription) {
  alert('You need a membership');
  return; // User can bypass this in DevTools
}

// ✅ CORRECT: Backend enforcement via Firestore Rules
// In firestore.rules:
match /conversations/{conversationId}/messages/{messageId} {
  allow create: if isAuthed() && (
    isFemale() ||
    (isMale() && hasActiveMembership())  // Enforced server-side
  );
}
```

#### 2. Module-Based SPA (No Framework)
```javascript
// Each HTML page is self-contained
// Shared utilities in /webapp/js/utils.js

// Example: webapp/perfil.html
import { loadTheme } from './js/theme.js';
import { showToast } from './js/utils.js';
import { auth, db, storage } from './js/firebase-config.js';

// Initialize on load
document.addEventListener('DOMContentLoaded', async () => {
  await loadUserData();
  loadTheme(currentUserData);
});
```

#### 3. Real-Time Data Flow
```javascript
// All state managed in Firestore
// UI updates via real-time listeners

// Example: Chat messages
const messagesRef = collection(db, `conversations/${conversationId}/messages`);
onSnapshot(messagesRef, (snapshot) => {
  snapshot.docChanges().forEach((change) => {
    if (change.type === 'added') {
      displayMessage(change.doc.data());
    }
  });
});
```

#### 4. Custom Claims for Authorization
```javascript
// Set by Cloud Functions on user creation
{
  role: "regular" | "admin" | "concierge",
  gender: "masculino" | "femenino"
}

// Used in Firestore Rules
function isAdmin() {
  return request.auth.token.role == 'admin';
}
function isMale() {
  return request.auth.token.gender == 'masculino';
}
```

---

## 4. Directory Structure

```
t2c06/
├── index.html                          # Landing page
│
├── webapp/                             # Main application (SPA)
│   ├── *.html                          # 16 HTML pages
│   │   ├── buscar-usuarios.html        # User search + Google Maps
│   │   ├── perfil.html                 # User profile management
│   │   ├── conversaciones.html         # Conversation list
│   │   ├── chat.html                   # 1-on-1 messaging
│   │   ├── cita-detalle.html          # Date details & QR validation
│   │   ├── suscripcion.html           # Membership payment
│   │   ├── seguro.html                # Insurance payment
│   │   ├── eventos-vip.html           # VIP events listing (women)
│   │   ├── concierge-dashboard.html   # Concierge management panel
│   │   ├── reportes.html              # User reports
│   │   ├── ayuda.html                 # Help center
│   │   ├── seguridad.html             # Security center
│   │   ├── cuenta-pagos.html          # Account & payments
│   │   └── admin/dashboard.html       # Admin panel
│   │
│   └── js/                            # JavaScript modules
│       ├── firebase-config.js         # Firebase initialization
│       ├── firebase-appcheck.js       # App Check security
│       ├── utils.js                   # Shared utilities (475 lines)
│       ├── theme.js                   # Theme system (6 themes)
│       └── error-fixes.js             # Bug fixes & patches
│
├── backend/                           # Python FastAPI backend (future)
│   ├── main.py                        # FastAPI app entry
│   ├── requirements.txt               # 81 dependencies
│   ├── Dockerfile                     # Docker container
│   ├── docker-compose.yml             # Full stack orchestration
│   │
│   └── app/
│       ├── api/                       # API endpoints
│       ├── core/                      # Configuration
│       ├── models/                    # Pydantic schemas
│       ├── services/                  # Business logic
│       │   ├── ml/                    # Recommendation engine
│       │   ├── cv/                    # Photo verification
│       │   ├── analytics/             # Analytics
│       │   ├── security/              # Fraud detection
│       │   ├── nlp/                   # Message moderation
│       │   └── geo/                   # Geolocation
│       └── utils/                     # Utilities
│
├── functions/                         # Firebase Cloud Functions
│   ├── index.js                       # 648 lines, 7+ functions
│   ├── package.json                   # Node.js 18
│   └── scripts/
│       └── update-existing-users.js   # User migration script
│
├── firestore.rules                    # ⚠️ CRITICAL - 336 lines
├── firebase-storage.rules             # ⚠️ CRITICAL - 102 lines
├── firestore.indexes.json             # Database indexes
├── firebase.json                      # Firebase config
│
└── *.md                              # 21 documentation files
    ├── README.md                      # Project overview
    ├── BUSINESS_RULES.md              # Business logic (738 lines)
    ├── DEVELOPMENT.md                 # Development guide
    ├── FIRESTORE_SECURITY_RULES.md    # Security rules guide
    ├── GOOGLE_MAPS_FEATURES.md        # Maps integration
    ├── PAYPAL_INTEGRATION.md          # Payment integration
    ├── USER_PROFILE_SCHEMA.md         # Database schema
    ├── APP_CHECK_SETUP.md             # App Check configuration
    ├── APPCHECK_400_ERROR_FIX.md      # Emergency fix guide
    ├── TROUBLESHOOTING.md             # Common issues
    ├── CONCIERGE_SYSTEM.md            # VIP events system
    └── CLAUDE.md                      # This file
```

---

## 5. Development Workflows

### Local Development Setup

```bash
# 1. Clone repository
git clone <repo-url>
cd t2c06

# 2. Checkout development branch
git checkout claude/claude-md-mhymenkglzshcxub-01AwaEAHXCtZafGo3nmHBYGA

# 3. Run local server (choose one)
python -m http.server 8000              # Python
npx http-server -p 8000                 # Node.js
# OR use VS Code Live Server extension

# 4. Open browser
# http://localhost:8000
```

### Firebase Configuration

**IMPORTANT:** Update `/webapp/js/firebase-config.js` with your Firebase credentials:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### Git Workflow

```bash
# Make changes
git add .
git commit -m "feat: description"  # Use conventional commits

# Push to development branch
git push -u origin claude/claude-md-mhymenkglzshcxub-01AwaEAHXCtZafGo3nmHBYGA
```

**Commit Message Format:**
- `feat:` New feature
- `fix:` Bug fix
- `chore:` Maintenance
- `docs:` Documentation
- `refactor:` Code refactoring

**Recent Examples:**
```
feat: Integrate Firebase App Check across all HTML pages
fix: Use ReCaptchaEnterpriseProvider for App Check
docs: Add emergency fix guides for App Check 400 Bad Request error
chore: Add script for bulk App Check import integration
```

---

## 6. Code Conventions

### JavaScript Style

```javascript
// ✅ Naming Conventions
const currentUserData = {};           // camelCase for variables
const hasActiveSubscription = true;   // Boolean prefix: has/is/can
const RECAPTCHA_SITE_KEY = 'xxx';    // UPPER_SNAKE_CASE for constants

// ✅ Functions: Verb-based names
function loadTheme() { }
function getReputationBadge() { }
function showToast(message, type) { }
function calculateDistance(lat1, lng1, lat2, lng2) { }

// ✅ ES6+ Features
import { auth, db } from './js/firebase-config.js';  // ES6 imports
const users = await getDocs(collection(db, 'users')); // async/await
const filtered = users.filter(u => u.age > 25);      // arrow functions

// ✅ Error Handling Pattern
try {
  await updateDoc(userRef, { alias: newAlias });
  showToast('Profile updated successfully', 'success');
} catch (error) {
  console.error('Error updating profile:', error);
  showToast('Failed to update profile', 'error');
}
```

### Firestore Naming

```javascript
// Collections: lowercase_underscore
users
vip_events
blocked_users
insurance_payments

// Fields: camelCase
hasActiveSubscription
photoURL
birthDate
createdAt
```

### HTML/CSS Patterns

```html
<!-- Glass morphism design system -->
<div class="glass rounded-2xl p-6">
  <div class="flex items-center justify-between mb-4">
    <h2 class="text-2xl font-bold">Title</h2>
    <button class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg">
      Action
    </button>
  </div>
  <!-- Content -->
</div>
```

**UI Conventions:**
- Use Tailwind utility classes (no custom CSS)
- Glass morphism: `backdrop-filter: blur()` with transparency
- Responsive: `md:`, `lg:` breakpoints
- Animations: fadeIn, slide, float effects

### File Organization

**Each HTML page structure:**
```html
<!DOCTYPE html>
<html lang="es">
<head>
  <!-- Meta tags -->
  <!-- External CSS (Tailwind, Font Awesome) -->
  <!-- Inline styles for animations -->
</head>
<body>
  <!-- Glass morphism UI components -->

  <!-- Firebase SDK -->
  <script type="module">
    import { auth, db, storage } from './js/firebase-config.js';
    import { loadTheme } from './js/theme.js';
    import { showToast, calculateAge } from './js/utils.js';

    // Page initialization
    document.addEventListener('DOMContentLoaded', async () => {
      // Load user, theme, data
    });
  </script>
</body>
</html>
```

---

## 7. Security & Business Rules

### Critical Business Rules (Backend-Enforced)

#### 1. Heterosexual Search Only
```javascript
// firestore.rules
match /users/{userId} {
  allow read: if isAuthed();
  // Frontend filters by opposite gender
  // Backend allows reading all, frontend filters
}
```

#### 2. Payment Requirements (Men Only - Currently)

**Membership (€29.99/month):**
- Required to send date requests
- Required to chat
- Required to view full profiles

**Anti-Ghosting Insurance (€120 one-time):**
- Required to schedule confirmed dates
- Required to get contact information
- Valid for lifetime

**Women:**
- Currently FREE access to all features
- Plan to implement paid model in future

#### 3. User Roles

```javascript
// Custom Claims (set by Cloud Functions)
{
  role: "regular" | "admin" | "concierge",
  gender: "masculino" | "femenino"
}

// Permissions
regular:    Standard user
admin:      Platform administrator (full access)
concierge:  VIP event organizer (€199/month)
```

### Firestore Security Rules (336 lines)

**Key Enforcement Points:**

```javascript
// 1. User Creation - Only regular role
allow create: if request.resource.data.userRole == 'regular';

// 2. VIP Events - Concierge only
match /vip_events/{eventId} {
  allow create: if isConcierge() &&
                   request.resource.data.conciergeId == uid();
  allow read: if isFemale() || isConcierge() || isAdmin();
}

// 3. Conversations - Participants only
match /conversations/{conversationId} {
  allow read: if isAuthed() &&
                 uid() in resource.data.participants;
}

// 4. Admin Logs - Immutable
match /admin_logs/{logId} {
  allow create: if isAdmin();
  allow update, delete: if false;  // Immutable
}
```

**⚠️ CRITICAL:** Firestore Rules are the ONLY source of truth for authorization. Frontend validations are for UX only.

### Firebase Storage Rules (102 lines)

**Path-based Security:**
```javascript
// Profile photos
/profile_photos/{gender}/{userId}/{filename}
- Owner can write (max 5MB)
- Opposite gender can read

// Event photos
/event_photos/{eventId}/{filename}
- Concierges can write
- Women + concierges can read

// SOS evidence
/sos_evidence/{userId}/{filename}
- Owner can write (50MB, images/videos)
- Admin can read

// Verification docs
/verification_docs/{userId}/{filename}
- Owner can write (10MB, images/PDF)
- Admin-only read
```

---

## 8. Firebase Integration

### Cloud Functions (5 functions)

#### 1. `onUserDocCreate`
```javascript
// Trigger: When user document created
// Action: Set custom claims (role, gender)
exports.onUserDocCreate = functions.firestore
  .document('users/{userId}')
  .onCreate(async (snap, ctx) => {
    const data = snap.data();
    await admin.auth().setCustomClaims(ctx.params.userId, {
      role: data.userRole || 'regular',
      gender: data.gender
    });
  });
```

#### 2. `onUserDocUpdate`
```javascript
// Trigger: When user document updated
// Action: Sync role/gender changes to custom claims
```

#### 3. `syncChatACL`
```javascript
// Trigger: When conversation created/updated
// Action: Manage Storage ACLs for chat attachments
```

#### 4. `updateUserClaims` (Callable)
```javascript
// Admin-only function to manually update claims
```

#### 5. `getUserClaims` (Callable)
```javascript
// View custom claims (own or admin-viewable)
```

### Firebase App Check

**Configuration:**
```javascript
// webapp/js/firebase-appcheck.js
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';

const appCheck = initializeAppCheck(app, {
  provider: new ReCaptchaEnterpriseProvider('SITE_KEY'),
  isTokenAutoRefreshEnabled: true
});
```

**Recent Integration:** Added to all 16+ HTML pages via bulk script.

### Firestore Collections Schema

**Key Collections:**

```javascript
// users
{
  uid: string,
  email: string,
  alias: string,
  gender: "masculino" | "femenino",
  birthDate: "YYYY-MM-DD",
  userRole: "regular" | "admin" | "concierge",

  // Payments
  hasActiveSubscription: boolean,
  subscriptionId: string,
  hasAntiGhostingInsurance: boolean,
  insurancePaymentId: string,

  // Concierge
  isConcierge: boolean,
  conciergeStatus: "pending" | "approved" | "suspended",
  conciergeSubscriptionId: string,

  // Profile
  photoURL: string,
  photos: string[],  // Up to 5
  bio: string,       // Min 120 words
  municipio: string,
  location: { lat: number, lng: number },
  reputation: "BRONCE" | "PLATA" | "ORO" | "PLATINO",

  // Theme
  theme: "purple" | "blue" | "green" | "orange" | "teal" | "pink",

  // Metadata
  emailVerified: boolean,
  isOnline: boolean,
  createdAt: Timestamp,
  lastActivity: Timestamp
}

// vip_events
{
  eventId: string,
  conciergeId: string,
  title: string,
  description: string,
  date: Timestamp,
  location: string,
  maxApplicants: number,
  status: "published" | "closed" | "canceled",
  createdAt: Timestamp
}

// matches
{
  participants: [uid1, uid2],
  status: "pending" | "accepted" | "rejected",
  requestedBy: uid,
  createdAt: Timestamp
}

// conversations
{
  participants: [uid1, uid2],
  lastMessage: string,
  lastMessageTime: Timestamp,
  unreadCount: { [uid]: number }
}

// conversations/{id}/messages
{
  senderId: string,
  text: string,
  type: "text" | "date_proposal",
  dateProposal: {
    date: string,
    time: string,
    place: string
  },
  createdAt: Timestamp
}

// appointments
{
  participants: [uid1, uid2],
  date: string,
  time: string,
  place: string,
  status: "pending" | "confirmed" | "completed" | "canceled",
  qrCode: string,
  validationCode: string,
  createdAt: Timestamp
}
```

---

## 9. Key Files Reference

### Must-Read Files

| File | Purpose | Lines | Importance |
|------|---------|-------|------------|
| `firestore.rules` | Security rules - CRITICAL | 336 | 🔴 CRITICAL |
| `firebase-storage.rules` | Storage security | 102 | 🔴 CRITICAL |
| `webapp/js/utils.js` | Shared utilities | 475 | 🟡 Important |
| `functions/index.js` | Cloud Functions | 648 | 🟡 Important |
| `BUSINESS_RULES.md` | Business logic | 738 | 🟢 Reference |

### Configuration Files

```yaml
/.firebaserc:         Project ID mapping
/firebase.json:       Firebase services config
/firestore.indexes.json: Database indexes
/functions/package.json: Functions dependencies
/backend/requirements.txt: Python dependencies (81 lines)
```

### Utility Functions (webapp/js/utils.js)

**Key Exports:**
```javascript
// Toast notifications
export function showToast(message, type);

// Age calculation
export function calculateAge(birthDate);

// Reputation badges
export function getReputationBadge(reputation);

// Distance calculation (Haversine)
export function calculateDistance(lat1, lng1, lat2, lng2);

// Relative time
export function getRelativeTime(timestamp);

// Format date/time
export function formatDate(dateString);
export function formatTime(timeString);

// Gender emoji
export function getGenderEmoji(gender);

// Image validation
export function isValidImage(file);
```

---

## 10. Common Tasks & How-Tos

### Adding a New HTML Page

```bash
# 1. Create HTML file
cp webapp/perfil.html webapp/new-page.html

# 2. Update imports
<script type="module">
  import { auth, db, storage } from './js/firebase-config.js';
  import { loadTheme } from './js/theme.js';
  import { showToast } from './js/utils.js';

  // Initialize
  document.addEventListener('DOMContentLoaded', async () => {
    const user = auth.currentUser;
    if (!user) {
      window.location.href = 'index.html';
      return;
    }

    // Load user data
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const userData = userDoc.data();

    // Apply theme
    loadTheme(userData);
  });
</script>

# 3. Add App Check import
import './js/firebase-appcheck.js';
```

### Modifying Firestore Rules

```bash
# 1. Edit firestore.rules
nano firestore.rules

# 2. Test in Firebase Console
# Go to Rules Playground and test scenarios

# 3. Deploy
firebase deploy --only firestore:rules

# 4. Document changes
# Update FIRESTORE_SECURITY_RULES.md
```

### Adding a Cloud Function

```javascript
// functions/index.js

exports.newFunction = functions.https.onCall(async (data, context) => {
  // 1. Check authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Must be authenticated'
    );
  }

  // 2. Check authorization (if needed)
  const token = context.auth.token;
  if (token.role !== 'admin') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Admin access required'
    );
  }

  // 3. Business logic
  const result = await doSomething(data);

  // 4. Return result
  return { success: true, data: result };
});
```

### Adding Payment Validation

**Frontend (UX only):**
```javascript
// Check payment status
function checkPaymentStatus(userData) {
  if (userData.gender === 'masculino') {
    if (!userData.hasActiveSubscription) {
      return {
        canUse: false,
        reason: 'membership',
        message: 'Necesitas membresía activa'
      };
    }

    if (!userData.hasAntiGhostingInsurance) {
      return {
        canUse: false,
        reason: 'insurance',
        message: 'Necesitas seguro anti-plantón'
      };
    }
  }

  return { canUse: true };
}

// Show payment modal
const status = checkPaymentStatus(currentUserData);
if (!status.canUse) {
  showPaymentModal(status.reason, status.message);
}
```

**Backend (Enforcement):**
```javascript
// firestore.rules
// TODO: Add payment validation in rules
// Currently enforced in frontend only
```

### Google Maps Integration

```html
<!-- 1. Include Maps API -->
<script src="https://maps.googleapis.com/maps/api/js?key=YOUR_KEY&libraries=places,geometry"></script>

<!-- 2. Initialize map -->
<script>
let map;
const mapOptions = {
  center: { lat: 40.4168, lng: -3.7038 },  // Madrid
  zoom: 10,
  styles: [/* custom styles */]
};
map = new google.maps.Map(document.getElementById('map'), mapOptions);

// 3. Add markers
users.forEach(user => {
  const marker = new google.maps.Marker({
    position: { lat: user.location.lat, lng: user.location.lng },
    map: map,
    icon: getGenderIcon(user.gender)
  });
});
</script>
```

---

## 11. Testing Approach

### Current State

**No automated tests** - Project relies on manual testing.

**Available Infrastructure:**
```python
# backend/requirements.txt
pytest==7.4.3
pytest-asyncio==0.21.1
pytest-cov==4.1.0

# functions/package.json
"firebase-functions-test": "^3.1.0"
```

### Manual Testing Checklist

**Authentication:**
- [ ] Register with email/password
- [ ] Email verification flow
- [ ] Login/logout
- [ ] Session persistence

**Profile:**
- [ ] Complete profile (min 2 photos, 120-word bio)
- [ ] Theme switching (6 themes)
- [ ] Photo upload (max 5 photos)
- [ ] Profile update

**User Search:**
- [ ] Opposite gender filtering
- [ ] Same gender blocked
- [ ] Distance filters (5-100km)
- [ ] Map vs grid view toggle
- [ ] Geolocation detection

**Payment Validations:**
- [ ] Male user without membership → blocked from chat
- [ ] Male user without insurance → blocked from scheduling
- [ ] Female user → full access without payment

**Chat:**
- [ ] Send/receive messages (real-time)
- [ ] Typing indicator
- [ ] Unread count
- [ ] Date proposal with calendar

**Firestore Rules Testing:**
```javascript
// Firebase Console → Rules Playground

// Test 1: Same-gender read (should ALLOW in current rules)
// Operation: get
// Location: /databases/(default)/documents/users/user123
// Auth: { uid: 'male-user', token: { gender: 'masculino' } }
// Expected: Allowed (filtering happens in frontend)

// Test 2: Create message without membership (should allow currently)
// Operation: create
// Location: /conversations/conv123/messages/msg456
// Expected: TODO - Add payment validation to rules
```

---

## 12. Deployment

### Firebase Hosting

```bash
# 1. Install Firebase CLI
npm install -g firebase-tools

# 2. Login
firebase login

# 3. Initialize hosting
firebase init hosting
# Select: Use existing project
# Public directory: . (root)
# Single-page app: No
# Set up automatic builds: No

# 4. Deploy
firebase deploy --only hosting

# 5. Custom domain (optional)
firebase hosting:channel:deploy production
```

### Firestore Rules (CRITICAL)

```bash
# MUST deploy before production use
firebase deploy --only firestore:rules

# Deploy storage rules too
firebase deploy --only storage

# Verify deployment
firebase firestore:rules get
```

### Cloud Functions

```bash
cd functions

# Install dependencies
npm install

# Deploy all functions
firebase deploy --only functions

# Deploy specific function
firebase deploy --only functions:onUserDocCreate

# View logs
firebase functions:log
```

### Python Backend (Future)

**Recommended Platforms:**
- Railway.app (easiest)
- Render.com
- Google Cloud Run
- AWS EC2 with Docker

```bash
# Using Docker
cd backend
docker build -t tuscitaseguras-api .
docker run -p 8000:8000 tuscitaseguras-api

# Using docker-compose
docker-compose up -d
```

---

## 13. Important Gotchas

### 1. Firestore Rules NOT Deployed

**Symptom:** Users can bypass payment requirements, see same-gender profiles, etc.

**Fix:**
```bash
firebase deploy --only firestore:rules
```

### 2. App Check Not Configured

**Symptom:** "400 Bad Request" errors on Firestore operations

**Fix:**
- Configure reCAPTCHA Enterprise site key
- Add debug token for development
- See `APPCHECK_400_ERROR_FIX.md`

### 3. Google Maps API Not Loaded

**Symptom:** "google is not defined" error

**Fix:**
```html
<!-- Ensure this is loaded BEFORE your script -->
<script src="https://maps.googleapis.com/maps/api/js?key=YOUR_KEY&libraries=places,geometry"></script>
```

### 4. Custom Claims Not Set

**Symptom:** Firestore Rules fail with "token.role is undefined"

**Fix:**
- Ensure Cloud Functions are deployed
- Check function logs: `firebase functions:log`
- Manually trigger for existing users:
```bash
node functions/scripts/update-existing-users.js
```

### 5. CORS Errors

**Symptom:** Network errors when loading local files

**Fix:**
- Use a local server (not `file://`)
- Use Live Server, http-server, or Python server

### 6. Theme Not Loading

**Symptom:** Pages don't have color theme

**Fix:**
```javascript
// Ensure theme.js is imported
import { loadTheme } from './js/theme.js';

// Call after loading user data
const userData = userDoc.data();
loadTheme(userData);
```

### 7. Payment Validation Bypass

**Symptom:** Users can use features without paying

**Cause:** Validation only in frontend (can be bypassed in DevTools)

**Fix:** Add payment checks to Firestore Rules (TODO)

### 8. Firebase Config Exposure

**Question:** Is it safe to expose Firebase config in frontend?

**Answer:** YES - Firebase API keys are NOT secret. Security is enforced by:
- Firestore Rules
- Firebase Storage Rules
- App Check
- Authentication

Do NOT hide Firebase config. It's designed to be public.

---

## 14. Resources & Documentation

### Internal Documentation (21 files)

**Essential Reading:**
1. `README.md` - Project overview
2. `BUSINESS_RULES.md` - Complete business logic (738 lines)
3. `DEVELOPMENT.md` - Development setup
4. `FIRESTORE_SECURITY_RULES.md` - Security rules guide

**Feature-Specific:**
5. `GOOGLE_MAPS_FEATURES.md` - Maps integration
6. `PAYPAL_INTEGRATION.md` - Payment setup
7. `USER_PROFILE_SCHEMA.md` - Database schema
8. `CONCIERGE_SYSTEM.md` - VIP events system

**Troubleshooting:**
9. `TROUBLESHOOTING.md` - Common issues
10. `APPCHECK_400_ERROR_FIX.md` - App Check errors
11. `EMERGENCY_FIX_NOW.md` - Critical fixes
12. `CURRENT_STATUS_APP_CHECK.md` - App Check status

**Other:**
13. `APP_CHECK_SETUP.md` - App Check configuration
14. `FIREBASE_CONSOLE_STEPS.md` - Firebase setup
15. `FIREBASE_CUSTOM_CLAIMS_SETUP.md` - Custom claims
16. `MEJORAS.md` - Improvements list
17. `RECAPTCHA_ENTERPRISE_FIX.md` - reCAPTCHA issues

### External Resources

**Firebase:**
- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Cloud Functions](https://firebase.google.com/docs/functions)
- [App Check](https://firebase.google.com/docs/app-check)

**Google Maps:**
- [Maps JavaScript API](https://developers.google.com/maps/documentation/javascript)
- [Places Library](https://developers.google.com/maps/documentation/javascript/places)
- [Geometry Library](https://developers.google.com/maps/documentation/javascript/geometry)

**Payments:**
- [PayPal Developer](https://developer.paypal.com/home)
- [Stripe Documentation](https://stripe.com/docs)

**Frontend:**
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Font Awesome](https://fontawesome.com/icons)

### Quick Reference Commands

```bash
# Local Development
python -m http.server 8000
npx http-server -p 8000

# Firebase
firebase login
firebase deploy --only firestore:rules
firebase deploy --only storage
firebase deploy --only functions
firebase deploy --only hosting
firebase functions:log

# Git
git checkout claude/claude-md-mhymenkglzshcxub-01AwaEAHXCtZafGo3nmHBYGA
git add .
git commit -m "feat: description"
git push -u origin claude/claude-md-mhymenkglzshcxub-01AwaEAHXCtZafGo3nmHBYGA

# Backend (Future)
cd backend
docker-compose up -d
uvicorn main:app --reload
pytest --cov
```

---

## Summary for AI Assistants

### When Making Code Changes

**✅ DO:**
1. Always check Firestore Rules before modifying authorization logic
2. Test payment validations (male users need membership + insurance)
3. Maintain ES6+ module structure
4. Use Tailwind CSS classes (no custom CSS)
5. Import theme system in new pages
6. Add App Check import to new HTML pages
7. Document changes in relevant *.md files
8. Use conventional commit messages
9. Deploy Firestore Rules after modifying them
10. Check that gender filtering is working (heterosexual only)

**❌ DON'T:**
1. Skip Firestore Rules enforcement
2. Add frontend-only security validations
3. Introduce framework dependencies (React, Vue, etc.)
4. Hardcode credentials (use .env or config files)
5. Modify userRole or custom claims without Cloud Functions
6. Allow same-gender matching
7. Skip email verification
8. Bypass payment validations
9. Create collections without security rules
10. Push to wrong branch

### Critical Files to Never Break

1. `firestore.rules` - All business logic enforcement
2. `firebase-storage.rules` - Storage security
3. `webapp/js/firebase-config.js` - Firebase initialization
4. `functions/index.js` - Custom claims management
5. `webapp/js/utils.js` - Shared utilities

### Architecture Principles

1. **Security-First:** Rules enforced server-side (Firestore Rules)
2. **No Framework:** Vanilla JS for simplicity
3. **Real-time:** Firestore listeners for live updates
4. **Mobile-First:** Tailwind CSS responsive design
5. **Progressive Enhancement:** Core features in Firebase, ML/CV in Python backend

---

**End of CLAUDE.md**

*For questions or updates, modify this file directly in the repository.*
