/**
 * Constants for TuCitaSegura
 * Centralized configuration values
 */

// ============================================================================
// BUSINESS RULES
// ============================================================================

/**
 * Minimum number of words required in user bio
 */
export const MIN_BIO_WORDS = 120;

/**
 * Minimum age required to register (18+)
 */
export const MIN_AGE = 18;

/**
 * Maximum number of photos allowed per profile
 */
export const MAX_PHOTOS = 5;

/**
 * Minimum number of photos required for profile
 */
export const MIN_PHOTOS = 2;

// ============================================================================
// PRICING (EUR)
// ============================================================================

/**
 * Monthly membership price for men (€29.99/month)
 */
export const MEMBERSHIP_PRICE_EUR = 29.99;

/**
 * Anti-ghosting insurance one-time payment (€120.00)
 */
export const INSURANCE_PRICE_EUR = 120.00;

/**
 * Concierge subscription price (€199.00/month)
 */
export const CONCIERGE_PRICE_EUR = 199.00;

/**
 * Currency used for all payments
 */
export const CURRENCY = 'EUR';

// ============================================================================
// FILE SIZE LIMITS (bytes)
// ============================================================================

/**
 * Maximum profile photo size (5MB)
 */
export const MAX_PHOTO_SIZE = 5 * 1024 * 1024;

/**
 * Maximum SOS evidence video size (50MB)
 */
export const MAX_VIDEO_SIZE = 50 * 1024 * 1024;

/**
 * Maximum verification document size (10MB)
 */
export const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024;

/**
 * Maximum chat attachment size (25MB)
 */
export const MAX_CHAT_ATTACHMENT_SIZE = 25 * 1024 * 1024;

/**
 * Maximum event photo size (10MB)
 */
export const MAX_EVENT_PHOTO_SIZE = 10 * 1024 * 1024;

// ============================================================================
// RATE LIMITS
// ============================================================================

/**
 * Rate limiting configuration per operation
 */
export const RATE_LIMITS = {
  messages: {
    perMinute: 10,
    perHour: 100,
    perDay: 500
  },
  dateProposals: {
    perHour: 5,
    perDay: 20
  },
  matchRequests: {
    perHour: 10,
    perDay: 50
  },
  reports: {
    perHour: 3,
    perDay: 10
  }
};

// ============================================================================
// REPUTATION SYSTEM
// ============================================================================

/**
 * Available reputation levels (ordered by tier)
 */
export const REPUTATION_LEVELS = ['BRONCE', 'PLATA', 'ORO', 'PLATINO'];

/**
 * Reputation badge configuration
 */
export const REPUTATION_CONFIG = {
  BRONCE: {
    color: 'text-amber-700 bg-amber-900/30 border border-amber-700/50',
    icon: '🥉',
    label: 'Bronce',
    minPoints: 0
  },
  PLATA: {
    color: 'text-gray-300 bg-gray-700/30 border border-gray-400/50',
    icon: '🥈',
    label: 'Plata',
    minPoints: 100
  },
  ORO: {
    color: 'text-yellow-400 bg-yellow-900/30 border border-yellow-500/50',
    icon: '🥇',
    label: 'Oro',
    minPoints: 500
  },
  PLATINO: {
    color: 'text-cyan-300 bg-cyan-900/30 border border-cyan-400/50',
    icon: '💎',
    label: 'Platino',
    minPoints: 1000
  }
};

// ============================================================================
// THEMES
// ============================================================================

/**
 * Available color themes for user profiles
 */
export const AVAILABLE_THEMES = ['purple', 'blue', 'green', 'orange', 'teal', 'pink'];

/**
 * Default theme for new users
 */
export const DEFAULT_THEME = 'purple';

// ============================================================================
// GENDER
// ============================================================================

/**
 * Available genders
 */
export const GENDERS = {
  MALE: 'masculino',
  FEMALE: 'femenino'
};

// ============================================================================
// USER ROLES
// ============================================================================

/**
 * Available user roles
 */
export const USER_ROLES = {
  REGULAR: 'regular',
  ADMIN: 'admin',
  CONCIERGE: 'concierge'
};

// ============================================================================
// APPOINTMENT STATUSES
// ============================================================================

/**
 * Appointment/date statuses
 */
export const APPOINTMENT_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  COMPLETED: 'completed',
  CANCELED: 'canceled',
  NO_SHOW: 'no_show'
};

// ============================================================================
// MATCH STATUSES
// ============================================================================

/**
 * Match request statuses
 */
export const MATCH_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected'
};

// ============================================================================
// SUBSCRIPTION STATUSES
// ============================================================================

/**
 * Subscription statuses
 */
export const SUBSCRIPTION_STATUS = {
  ACTIVE: 'active',
  PAST_DUE: 'past_due',
  CANCELED: 'canceled',
  INCOMPLETE: 'incomplete',
  TRIALING: 'trialing'
};

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

/**
 * Notification types for FCM
 */
export const NOTIFICATION_TYPES = {
  NEW_MESSAGE: 'new_message',
  NEW_MATCH_REQUEST: 'new_match_request',
  MATCH_ACCEPTED: 'match_accepted',
  DATE_PROPOSAL: 'date_proposal',
  DATE_CONFIRMED: 'date_confirmed',
  PAYMENT_REMINDER: 'payment_reminder',
  PAYMENT_FAILED: 'payment_failed',
  VIP_EVENT: 'vip_event'
};

// ============================================================================
// TOAST TYPES
// ============================================================================

/**
 * Toast notification types
 */
export const TOAST_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
};

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Email regex pattern
 */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Password minimum length
 */
export const MIN_PASSWORD_LENGTH = 8;

/**
 * Alias minimum length
 */
export const MIN_ALIAS_LENGTH = 3;

/**
 * Alias maximum length
 */
export const MAX_ALIAS_LENGTH = 30;

// ============================================================================
// DISTANCE FILTERS (km)
// ============================================================================

/**
 * Distance filter options in kilometers
 */
export const DISTANCE_FILTERS = [5, 10, 25, 50, 100];

/**
 * Default distance filter (km)
 */
export const DEFAULT_DISTANCE = 25;

// ============================================================================
// MAPS CONFIGURATION
// ============================================================================

/**
 * Default map center (Madrid, Spain)
 */
export const DEFAULT_MAP_CENTER = {
  lat: 40.4168,
  lng: -3.7038
};

/**
 * Default map zoom level
 */
export const DEFAULT_MAP_ZOOM = 10;

// ============================================================================
// TIMING (milliseconds)
// ============================================================================

/**
 * Toast auto-dismiss duration (5 seconds)
 */
export const TOAST_DURATION = 5000;

/**
 * Debounce delay for search inputs (500ms)
 */
export const SEARCH_DEBOUNCE = 500;

/**
 * Auto-logout timeout for inactivity (30 minutes)
 */
export const AUTO_LOGOUT_TIMEOUT = 30 * 60 * 1000;

// ============================================================================
// PAGINATION
// ============================================================================

/**
 * Default number of items per page
 */
export const DEFAULT_PAGE_SIZE = 20;

/**
 * Maximum items to load in infinite scroll
 */
export const MAX_INFINITE_SCROLL_ITEMS = 100;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get file size limit by type
 * @param {string} type - File type (photo, video, document, chat, event)
 * @returns {number} Size limit in bytes
 */
export function getFileSizeLimit(type) {
  const limits = {
    photo: MAX_PHOTO_SIZE,
    video: MAX_VIDEO_SIZE,
    document: MAX_DOCUMENT_SIZE,
    chat: MAX_CHAT_ATTACHMENT_SIZE,
    event: MAX_EVENT_PHOTO_SIZE
  };
  return limits[type] || MAX_PHOTO_SIZE;
}

/**
 * Format file size for display
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size (e.g., "5 MB")
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Get reputation config by level
 * @param {string} level - Reputation level
 * @returns {Object} Reputation configuration
 */
export function getReputationConfig(level) {
  return REPUTATION_CONFIG[level] || REPUTATION_CONFIG.BRONCE;
}

/**
 * Check if gender is valid
 * @param {string} gender - Gender to validate
 * @returns {boolean} True if valid
 */
export function isValidGender(gender) {
  return Object.values(GENDERS).includes(gender);
}

/**
 * Check if role is valid
 * @param {string} role - Role to validate
 * @returns {boolean} True if valid
 */
export function isValidRole(role) {
  return Object.values(USER_ROLES).includes(role);
}

/**
 * Get opposite gender
 * @param {string} gender - User's gender
 * @returns {string} Opposite gender
 */
export function getOppositeGender(gender) {
  return gender === GENDERS.MALE ? GENDERS.FEMALE : GENDERS.MALE;
}
