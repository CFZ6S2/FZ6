# 👤 User Profile Schema - TuCitaSegura

Complete documentation of the user profile data structure and fields.

## 📋 Firestore Collection: `users`

### Document ID
The document ID is the user's Firebase Authentication UID.

### Complete User Schema

```javascript
{
  // ========================================
  // BASIC INFORMATION (Set during registration)
  // ========================================

  email: string,                    // User's email (from Firebase Auth)
  alias: string,                    // Username/alias (set once during registration, cannot be changed)

  // ========================================
  // PERSONAL INFORMATION
  // ========================================

  birthDate: string,                // Format: "YYYY-MM-DD" (must be 18+ years old)
  gender: string,                   // "masculino" | "femenino" (only these two options)
  city: string,                     // User's municipio (municipality) - NOT full address for security
  profession: string,               // User's profession or occupation
  bio: string,                      // Self-description (minimum 120 words required)
  photoURL: string,                 // Avatar photo URL (from Firebase Storage)
  galleryPhotos: [string],          // Array of gallery photo URLs (minimum 2, maximum 5 required)

  // Location for distance calculation
  location: {
    lat: number,                    // Latitude
    lng: number                     // Longitude
  },

  // ========================================
  // RELATIONSHIP STATUS & PREFERENCES
  // ========================================

  relationshipStatus: string,       // "soltero" | "divorciado" | "viudo" | "separado" | "complicado"

  lookingFor: string,               // What the user is looking for:
                                    // "relacion_seria" - Long-term relationship
                                    // "relacion_casual" - Casual dating
                                    // "amistad" - Friendship
                                    // "conocer_gente" - Meet new people
                                    // "sin_compromiso" - No strings attached
                                    // "abierto" - Open to possibilities

  ageRangeMin: number,              // Minimum age preference (default: 18)
  ageRangeMax: number,              // Maximum age preference (default: 99)

  // ========================================
  // ACCOUNT STATUS & VERIFICATION
  // ========================================

  emailVerified: boolean,           // Email verification status
  isOnline: boolean,                // Current online status
  reputation: string,               // "BRONCE" | "PLATA" | "ORO" | "PLATINO"

  // For women only
  availability: string,             // "verde" | "amarillo" | "rojo" (availability indicator)

  // ========================================
  // PAYMENT STATUS (Men only currently)
  // ========================================

  // Subscription (€30 + IVA / month)
  hasActiveSubscription: boolean,   // Active premium membership
  subscriptionId: string,           // PayPal/Stripe subscription ID
  subscriptionStartDate: Timestamp, // When subscription started
  subscriptionEndDate: Timestamp,   // When subscription expires
  subscriptionStatus: string,       // "active" | "canceled" | "expired"

  // Anti-Ghosting Insurance (€120 one-time)
  hasAntiGhostingInsurance: boolean, // Has paid insurance
  insurancePaymentId: string,       // Payment transaction ID
  insurancePurchaseDate: Timestamp, // When insurance was purchased
  insuranceAmount: number,          // 120 (euros)

  // ========================================
  // PRIVACY & MODERATION
  // ========================================

  blockedUsers: [string],           // Array of user IDs that this user has blocked
  hiddenConversations: [string],    // Array of conversation IDs hidden by user

  // ========================================
  // PERSONALIZATION
  // ========================================

  theme: string,                    // Color theme preference: "purple" | "blue" | "green" | "orange" | "teal" | "pink"

  // ========================================
  // TIMESTAMPS
  // ========================================

  createdAt: Timestamp,             // Account creation date
  updatedAt: Timestamp,             // Last profile update
  lastSeenAt: Timestamp             // Last time user was active
}
```

---

## 📝 Field Descriptions

### Basic Information

| Field | Type | Required | Editable | Notes |
|-------|------|----------|----------|-------|
| `email` | string | ✅ Yes | ❌ No | From Firebase Auth |
| `alias` | string | ✅ Yes | ❌ No | Set during registration, cannot be changed |

### Personal Information

| Field | Type | Required | Editable | Notes |
|-------|------|----------|----------|-------|
| `birthDate` | string | ✅ Yes | ✅ Yes | Format: YYYY-MM-DD, must be 18+ |
| `gender` | string | ✅ Yes | ✅ Yes | Only "masculino" or "femenino" |
| `city` | string | ✅ Yes | ✅ Yes | User's municipio (NOT full address for security) |
| `profession` | string | ✅ Yes | ✅ Yes | User's profession or occupation |
| `bio` | string | ✅ Yes | ✅ Yes | Minimum 120 words required, max 500 characters |
| `photoURL` | string | ✅ Yes | ✅ Yes | Avatar photo, uploaded to Firebase Storage |
| `galleryPhotos` | array | ✅ Yes | ✅ Yes | 2-5 additional photos required |
| `location` | object | ❌ No | ✅ Yes | For distance calculations |

### Relationship Status & Preferences

| Field | Type | Required | Editable | Notes |
|-------|------|----------|----------|-------|
| `relationshipStatus` | string | ✅ Yes | ✅ Yes | Current relationship status |
| `lookingFor` | string | ✅ Yes | ✅ Yes | What user seeks on platform |
| `ageRangeMin` | number | ❌ No | ✅ Yes | Min 18, default 18 |
| `ageRangeMax` | number | ❌ No | ✅ Yes | Max 99, default 99 |

### Account Status

| Field | Type | Required | Editable | Notes |
|-------|------|----------|----------|-------|
| `emailVerified` | boolean | ✅ Yes | ❌ No | From Firebase Auth |
| `isOnline` | boolean | ❌ No | 🔄 Auto | Updated automatically |
| `reputation` | string | ❌ No | 🔄 System | Updated by system based on behavior |
| `availability` | string | ❌ No | ✅ Yes | Women only |

### Payment Status

| Field | Type | Required | Editable | Notes |
|-------|------|----------|----------|-------|
| `hasActiveSubscription` | boolean | ❌ No | 🔄 Auto | Men only (currently) |
| `subscriptionId` | string | ❌ No | 🔄 Auto | PayPal/Stripe ID |
| `subscriptionStartDate` | Timestamp | ❌ No | 🔄 Auto | Start date |
| `subscriptionEndDate` | Timestamp | ❌ No | 🔄 Auto | Expiration date |
| `subscriptionStatus` | string | ❌ No | 🔄 Auto | Subscription state |
| `hasAntiGhostingInsurance` | boolean | ❌ No | 🔄 Auto | Men only (currently) |
| `insurancePaymentId` | string | ❌ No | 🔄 Auto | Transaction ID |
| `insurancePurchaseDate` | Timestamp | ❌ No | 🔄 Auto | Purchase date |
| `insuranceAmount` | number | ❌ No | 🔄 Auto | Always 120 |

---

## 🎯 Business Rules

### Gender

- **Only two genders allowed**: `masculino` and `femenino`
- Set during registration
- Cannot be changed after registration (for now)

### Age Verification

- Users must be **18 years or older**
- Age is calculated from `birthDate`
- Validation happens on:
  - Registration
  - Profile update
  - Before any interaction

### Username (Alias)

- Set **once during registration** (in modal)
- **Cannot be changed** after registration
- Shown as read-only in profile page
- Used throughout the app instead of email

### Profile Photos

**Avatar (Required):**
- Stored in Firebase Storage at `profile_photos/{userId}/avatar`
- Maximum size: **5MB**
- Accepted formats: `image/*` (jpg, png, gif, webp, etc.)
- Falls back to initial letter if no photo
- **Must be uploaded before saving profile**

**Gallery Photos (2-5 Required):**
- Stored in Firebase Storage at `profile_photos/{userId}/gallery_1` through `gallery_5`
- Maximum size: **5MB per photo**
- Accepted formats: `image/*` (jpg, png, gif, webp, etc.)
- **Minimum 2 photos required**
- **Maximum 5 photos allowed**
- User must upload at least 2 before saving profile

### City/Municipio

- Users should only provide their **municipio (municipality)**, NOT their full address
- This is for **security and privacy reasons**
- Full addresses should never be stored or displayed
- Distance calculations use the `location` object (lat/lng) if provided

### Profession

- Set during profile creation or editing
- Can be changed at any time
- Examples: "Ingeniero", "Médico", "Estudiante", "Empresario", etc.
- No character limit

### Bio/Autodescripción

- **Minimum 120 words required**
- Maximum 500 characters
- Real-time word counter shown to user
- Warning indicator if less than 120 words
- Success indicator when requirement is met
- Cannot save profile without meeting minimum requirement

### Relationship Status Options

```javascript
const relationshipStatuses = {
  felizmente_separado: "Felizmente Separado o Divorciado",
  casado_golfo: "Casado y Golfo",
  viudo: "Viudo",
  libre_pajaro: "Libre como un Pájaro",
  no_contestar: "Prefiero No Contestar",
  builder: "Builder"
};
```

### Looking For Options

```javascript
const lookingForOptions = {
  relacion_seria: "Relación Seria / A Largo Plazo",
  relacion_casual: "Relación Casual / Esporádica",
  amistad: "Amistad",
  conocer_gente: "Conocer Gente Nueva",
  sin_compromiso: "Citas sin Compromiso",
  abierto: "Abierto a Posibilidades"
};
```

---

## 🔒 Privacy & Security

### Blocked Users

- Array of user IDs that this user has blocked
- Blocked users:
  - Cannot see the user in searches
  - Cannot send messages
  - Cannot see the user's profile
  - Existing conversations are hidden

### Hidden Conversations

- Array of conversation IDs hidden by the user
- Hidden conversations:
  - Don't appear in conversations list
  - Can be unhidden (not deleted)
  - Messages are preserved

---

## 🎨 Personalization

### Theme Selection

Users can personalize their experience by choosing a color theme that suits their style.

**Available Themes:**

| Theme Key | Name | Icon | Description |
|-----------|------|------|-------------|
| `purple` | Púrpura Pasión | 💜 | Default purple/pink gradient (original design) |
| `blue` | Azul Océano | 💙 | Cool blue gradient (calming, professional) |
| `green` | Verde Natura | 💚 | Natural green gradient (fresh, eco-friendly) |
| `orange` | Naranja Solar | 🧡 | Warm orange/pink gradient (energetic, friendly) |
| `teal` | Turquesa Tropical | 🩵 | Tropical teal gradient (modern, vibrant) |
| `pink` | Rosa Romance | 🩷 | Romantic pink gradient (sweet, playful) |

**How it works:**
- Theme preference is saved in Firestore (`theme` field)
- Theme is cached in localStorage for instant loading
- Theme is applied across all pages automatically
- Changes take effect immediately when selected
- Default theme: `purple` (if not set)

**Implementation:**
- Themes are managed by `/webapp/js/theme.js`
- Each theme defines: gradient, primary, secondary, accent colors
- CSS custom properties are updated dynamically
- Background gradients and UI elements adapt to selected theme

---

## 📊 Reputation System

Users earn reputation based on their behavior:

| Reputation | Requirements |
|------------|-------------|
| **BRONCE** | Default for new users |
| **PLATA** | 5+ completed dates, no reports |
| **ORO** | 15+ completed dates, high rating |
| **PLATINO** | 30+ completed dates, excellent rating, verified |

Reputation affects:
- Visibility in search results
- Trust indicator for other users
- Potential future premium features

---

## 💰 Payment Requirements (Current: Men Only)

### Membership (€30 + IVA / month)

**Required for:**
- Sending match requests
- Sending messages in chat
- Viewing certain profiles

**Not required for:**
- Creating account
- Completing profile
- Browsing (limited)

### Anti-Ghosting Insurance (€120 one-time)

**Required for:**
- Proposing dates
- Accepting date proposals
- Scheduling in-person meetings

**Not required for:**
- Chatting
- Sending match requests

### Future Changes

- Payment requirements will apply to **both genders**
- Current logic checks `gender === 'masculino'` for payment validation
- Will be updated to apply to all users

---

## 🔄 Profile Update Flow

1. User navigates to `/webapp/perfil.html`
2. Profile loads from Firestore
3. User edits fields:
   - ✅ Editable: birthDate, gender, city (municipio), profession, bio, avatar, gallery photos, relationshipStatus, lookingFor, ageRange, theme
   - ❌ Read-only: alias (set during registration), email
4. User clicks "Guardar Cambios"
5. Validation:
   - All required fields filled
   - Age 18+
   - Valid gender selection
   - Valid relationship status
   - Valid looking for option
   - **Bio minimum 120 words**
   - **Avatar photo uploaded**
   - **Minimum 2 gallery photos uploaded**
6. If avatar photo selected:
   - Upload to Firebase Storage (`profile_photos/{userId}/avatar`)
   - Get download URL
   - Save URL to Firestore `photoURL` field
7. If gallery photos selected:
   - Upload each to Firebase Storage (`profile_photos/{userId}/gallery_1` through `gallery_5`)
   - Get download URLs
   - Save URLs array to Firestore `galleryPhotos` field
8. Update Firestore with new data:
   - Personal info: birthDate, gender, city, profession, bio
   - Photos: photoURL, galleryPhotos
   - Preferences: relationshipStatus, lookingFor, ageRange
   - Personalization: theme
   - Timestamp: updatedAt
9. Show success modal
10. Reload profile

---

## 🗑️ Account Deletion

**Warning:** Account deletion is permanent and irreversible.

**What gets deleted:**
- User document from Firestore
- All conversations
- All matches
- All reports (as reporter)
- Profile photo from Storage
- Firebase Auth account

**Confirmation required:**
- User must type "ELIMINAR" to confirm
- Double confirmation prompt

**Note:** Currently shows as "próximamente" (coming soon)

---

## 📸 Photo Storage

### Storage Structure

```
gs://YOUR_BUCKET/
└── profile_photos/
    └── {userId}/
        ├── avatar              (Main profile photo - required)
        ├── gallery_1           (Gallery photo 1)
        ├── gallery_2           (Gallery photo 2)
        ├── gallery_3           (Gallery photo 3)
        ├── gallery_4           (Gallery photo 4)
        └── gallery_5           (Gallery photo 5)
```

### Photo Upload Process

**Avatar Photo:**
1. User clicks camera icon on avatar
2. Validation:
   - File type must be image
   - File size max 5MB
3. Preview shown immediately (local preview)
4. On "Guardar Cambios":
   - Upload to `profile_photos/{userId}/avatar`
   - Overwrites previous avatar
   - Get download URL
   - Save URL to Firestore `photoURL` field

**Gallery Photos (2-5 required):**
1. User clicks on gallery slot (1-5)
2. Validation:
   - File type must be image
   - File size max 5MB
   - Minimum 2 photos required
   - Maximum 5 photos allowed
3. Preview shown immediately with remove button
4. On "Guardar Cambios":
   - Upload to `profile_photos/{userId}/gallery_1` through `gallery_5`
   - Overwrites photo at that slot if exists
   - Get download URLs
   - Save URLs array to Firestore `galleryPhotos` field

### Photo Display

**Avatar:**
- **If photoURL exists**: Show actual photo
- **If photoURL is empty**: Show colored circle with first letter of alias
- **Default color**: Purple gradient

**Gallery:**
- **If photo exists**: Show actual photo with remove button
- **If slot is empty**: Show "+" placeholder to upload
- **Minimum requirement**: 2 photos must be uploaded
- **Visual indicator**: Warning shown if less than 2 photos

---

## 🔍 Search & Filters

Users can be filtered by:
- Age (from birthDate)
- City
- Distance (from location)
- Reputation
- Verification status
- Online status
- Gender (automatic - shows opposite gender)

Additional filters based on preferences:
- Looking for (match with user's lookingFor)
- Age range (match with user's ageRange)

---

## ✅ Validation Rules

### Required Fields (cannot save without these):
- ✅ alias (set during registration)
- ✅ email (from Firebase Auth)
- ✅ birthDate (must be 18+)
- ✅ gender (masculino or femenino only)
- ✅ city (municipio only, not full address)
- ✅ profession (occupation)
- ✅ bio (minimum 120 words)
- ✅ photoURL (avatar photo)
- ✅ galleryPhotos (minimum 2, maximum 5)
- ✅ relationshipStatus
- ✅ lookingFor

### Optional Fields:
- location (for distance calculations)
- ageRangeMin (default: 18)
- ageRangeMax (default: 99)
- availability (women only)

### Word/Character Limits:
- alias: No limit (set during registration)
- bio: **Minimum 120 words required**, max 500 characters
- city: No limit (municipio name)
- profession: No limit
- email: No limit (from Firebase)

### Photo Requirements:
- **Avatar (photoURL)**: Required, 1 photo
- **Gallery (galleryPhotos)**: Required, minimum 2 photos, maximum 5 photos
- **File type**: Must be image/* (jpg, png, gif, webp, etc.)
- **File size**: Maximum 5MB per photo
- **Total photos**: Minimum 3 (1 avatar + 2 gallery), maximum 6 (1 avatar + 5 gallery)

---

## 🎨 UI/UX Notes

### Profile Photo Section
- **Avatar**: Circular photo 150x150px
  - Camera icon button to upload
  - Purple gradient placeholder with initial
  - 4px white border with transparency
  - Required field

- **Gallery**: Grid of 5 photo slots (3 columns on mobile, 5 on desktop)
  - Each slot: 120x120px
  - "+" icon placeholder for empty slots
  - Preview image with remove button (X) for filled slots
  - Click to upload new photo
  - Minimum 2 photos required warning shown below grid

### Form Sections
1. **Información Personal** (purple icon)
   - Alias (read-only, shown in gray)
   - Birth date
   - Gender
   - Municipio (with security note: "Solo indica el municipio, no tu dirección completa por seguridad")
   - Profesión/Ocupación
   - Autodescripción (6 rows textarea)
     * Word counter with warning/success indicators
     * Shows: "X palabras (Y caracteres)"
     * Warning icon if < 120 words
     * Success icon if >= 120 words

2. **Estado Sentimental y Preferencias** (pink icon)
   - Relationship status
   - Looking for
   - Age range (min/max)

3. **Personalización** (theme icon)
   - Theme selector with 6 color options
   - Visual preview of each theme with icon

4. **Zona Peligrosa** (red icon)
   - Delete account button

### Buttons
- **Guardar Cambios**: Purple to pink gradient
- **Cancelar**: Glass effect
- **Eliminar Cuenta**: Red, small, in danger zone

---

## 📱 Responsive Design

- Desktop: Max width 1024px container
- Tablet: Full width with padding
- Mobile: Stacked form fields
- Photo: Always centered

---

**Last Updated:** 2025-11-07
**Version:** 1.0.0
**Author:** TuCitaSegura Development Team
