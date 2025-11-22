/**
 * Badges and Achievements System for TuCitaSegura
 * Gamification layer to encourage user engagement
 */

/**
 * Badge categories
 */
export const BADGE_CATEGORIES = {
  PROFILE: 'profile',
  SOCIAL: 'social',
  DATING: 'dating',
  PREMIUM: 'premium',
  SPECIAL: 'special'
};

/**
 * All available badges
 */
export const BADGES = {
  // Profile Badges
  PROFILE_COMPLETE: {
    id: 'profile_complete',
    name: 'Perfil Completo',
    description: 'Completaste tu perfil al 100%',
    icon: '✅',
    category: BADGE_CATEGORIES.PROFILE,
    rarity: 'common',
    points: 10,
    condition: 'Profile fully completed with all fields and photos'
  },

  PHOTO_PRO: {
    id: 'photo_pro',
    name: 'Fotógrafo Pro',
    description: 'Subiste 5 fotos de alta calidad',
    icon: '📸',
    category: BADGE_CATEGORIES.PROFILE,
    rarity: 'common',
    points: 15,
    condition: 'Upload 5 photos'
  },

  VERIFIED_USER: {
    id: 'verified_user',
    name: 'Usuario Verificado',
    description: 'Verificaste tu identidad con documento',
    icon: '✓',
    category: BADGE_CATEGORIES.PROFILE,
    rarity: 'rare',
    points: 50,
    condition: 'Identity verification completed'
  },

  // Social Badges
  FIRST_MATCH: {
    id: 'first_match',
    name: 'Primera Conexión',
    description: 'Hiciste tu primer match',
    icon: '🤝',
    category: BADGE_CATEGORIES.SOCIAL,
    rarity: 'common',
    points: 20,
    condition: 'First match accepted'
  },

  SOCIAL_BUTTERFLY: {
    id: 'social_butterfly',
    name: 'Mariposa Social',
    description: 'Tienes 10+ conversaciones activas',
    icon: '🦋',
    category: BADGE_CATEGORIES.SOCIAL,
    rarity: 'uncommon',
    points: 30,
    condition: '10+ active conversations'
  },

  POPULAR: {
    id: 'popular',
    name: 'Popular',
    description: 'Recibiste 50+ solicitudes de match',
    icon: '⭐',
    category: BADGE_CATEGORIES.SOCIAL,
    rarity: 'rare',
    points: 40,
    condition: '50+ match requests received'
  },

  INFLUENCER: {
    id: 'influencer',
    name: 'Influencer',
    description: 'Referiste a 10+ usuarios',
    icon: '📢',
    category: BADGE_CATEGORIES.SOCIAL,
    rarity: 'epic',
    points: 100,
    condition: '10+ successful referrals'
  },

  // Dating Badges
  FIRST_DATE: {
    id: 'first_date',
    name: 'Primera Cita',
    description: 'Completaste tu primera cita',
    icon: '❤️',
    category: BADGE_CATEGORIES.DATING,
    rarity: 'common',
    points: 25,
    condition: 'First date completed'
  },

  DATE_PRO: {
    id: 'date_pro',
    name: 'Experto en Citas',
    description: 'Completaste 10+ citas exitosas',
    icon: '💯',
    category: BADGE_CATEGORIES.DATING,
    rarity: 'rare',
    points: 75,
    condition: '10+ dates completed'
  },

  PUNCTUAL: {
    id: 'punctual',
    name: 'Puntual',
    description: 'Nunca plantaste a nadie (10+ citas)',
    icon: '⏰',
    category: BADGE_CATEGORIES.DATING,
    rarity: 'epic',
    points: 100,
    condition: '10+ dates, 0 ghosting incidents'
  },

  RELATIONSHIP_GURU: {
    id: 'relationship_guru',
    name: 'Gurú de Relaciones',
    description: 'Lograste una relación seria',
    icon: '💑',
    category: BADGE_CATEGORIES.DATING,
    rarity: 'legendary',
    points: 200,
    condition: 'Successful relationship established'
  },

  // Premium Badges
  EARLY_ADOPTER: {
    id: 'early_adopter',
    name: 'Pionero',
    description: 'Uno de los primeros 1000 usuarios',
    icon: '🌟',
    category: BADGE_CATEGORIES.PREMIUM,
    rarity: 'rare',
    points: 50,
    condition: 'Registered in first 1000 users'
  },

  VIP_MEMBER: {
    id: 'vip_member',
    name: 'Miembro VIP',
    description: 'Membresía activa por 6+ meses',
    icon: '👑',
    category: BADGE_CATEGORIES.PREMIUM,
    rarity: 'epic',
    points: 150,
    condition: '6+ months active membership'
  },

  PLATINUM_MEMBER: {
    id: 'platinum_member',
    name: 'Miembro Platino',
    description: 'Alcanzaste reputación Platino',
    icon: '💎',
    category: BADGE_CATEGORIES.PREMIUM,
    rarity: 'legendary',
    points: 200,
    condition: 'Platinum reputation achieved'
  },

  INSURED: {
    id: 'insured',
    name: 'Asegurado',
    description: 'Compraste el seguro anti-plantón',
    icon: '🛡️',
    category: BADGE_CATEGORIES.PREMIUM,
    rarity: 'uncommon',
    points: 30,
    condition: 'Anti-ghosting insurance purchased'
  },

  // Special Badges
  CONCIERGE: {
    id: 'concierge',
    name: 'Concierge VIP',
    description: 'Organizas eventos VIP',
    icon: '🎩',
    category: BADGE_CATEGORIES.SPECIAL,
    rarity: 'legendary',
    points: 300,
    condition: 'Concierge role active'
  },

  EVENT_HOST: {
    id: 'event_host',
    name: 'Anfitrión Estrella',
    description: 'Organizaste 5+ eventos VIP exitosos',
    icon: '🎉',
    category: BADGE_CATEGORIES.SPECIAL,
    rarity: 'epic',
    points: 150,
    condition: '5+ successful VIP events hosted'
  },

  NIGHT_OWL: {
    id: 'night_owl',
    name: 'Búho Nocturno',
    description: 'Activo principalmente después de las 10 PM',
    icon: '🦉',
    category: BADGE_CATEGORIES.SPECIAL,
    rarity: 'uncommon',
    points: 20,
    condition: '70%+ activity after 10 PM'
  },

  EARLY_BIRD: {
    id: 'early_bird',
    name: 'Madrugador',
    description: 'Activo principalmente antes de las 8 AM',
    icon: '🐦',
    category: BADGE_CATEGORIES.SPECIAL,
    rarity: 'uncommon',
    points: 20,
    condition: '70%+ activity before 8 AM'
  },

  WEEKEND_WARRIOR: {
    id: 'weekend_warrior',
    name: 'Guerrero de Fin de Semana',
    description: 'Más activo los fines de semana',
    icon: '🎮',
    category: BADGE_CATEGORIES.SPECIAL,
    rarity: 'common',
    points: 15,
    condition: '60%+ activity on weekends'
  },

  ADMIN: {
    id: 'admin',
    name: 'Administrador',
    description: 'Parte del equipo de TuCitaSegura',
    icon: '🔧',
    category: BADGE_CATEGORIES.SPECIAL,
    rarity: 'legendary',
    points: 500,
    condition: 'Admin role'
  }
};

/**
 * Rarity levels
 */
export const RARITY_LEVELS = {
  common: {
    name: 'Común',
    color: '#9ca3af',
    emoji: '⚪'
  },
  uncommon: {
    name: 'Poco Común',
    color: '#22c55e',
    emoji: '🟢'
  },
  rare: {
    name: 'Raro',
    color: '#3b82f6',
    emoji: '🔵'
  },
  epic: {
    name: 'Épico',
    color: '#a855f7',
    emoji: '🟣'
  },
  legendary: {
    name: 'Legendario',
    color: '#f59e0b',
    emoji: '🟡'
  }
};

/**
 * Get badges by category
 * @param {string} category - Badge category
 * @returns {Array} Badges in category
 */
export function getBadgesByCategory(category) {
  return Object.values(BADGES).filter(badge => badge.category === category);
}

/**
 * Get badge by ID
 * @param {string} badgeId - Badge ID
 * @returns {Object|null} Badge data
 */
export function getBadgeById(badgeId) {
  return BADGES[badgeId.toUpperCase()] || null;
}

/**
 * Calculate user level based on points
 * @param {number} points - Total points
 * @returns {Object} Level information
 */
export function calculateLevel(points) {
  const levels = [
    { level: 1, name: 'Novato', minPoints: 0, icon: '🌱' },
    { level: 2, name: 'Aprendiz', minPoints: 50, icon: '🌿' },
    { level: 3, name: 'Competente', minPoints: 150, icon: '🍀' },
    { level: 4, name: 'Experto', minPoints: 300, icon: '🌳' },
    { level: 5, name: 'Maestro', minPoints: 500, icon: '🎋' },
    { level: 6, name: 'Leyenda', minPoints: 1000, icon: '🌟' }
  ];

  let currentLevel = levels[0];
  let nextLevel = levels[1];

  for (let i = 0; i < levels.length; i++) {
    if (points >= levels[i].minPoints) {
      currentLevel = levels[i];
      nextLevel = levels[i + 1] || null;
    } else {
      break;
    }
  }

  return {
    current: currentLevel,
    next: nextLevel,
    progress: nextLevel
      ? ((points - currentLevel.minPoints) / (nextLevel.minPoints - currentLevel.minPoints)) * 100
      : 100,
    pointsToNext: nextLevel ? nextLevel.minPoints - points : 0
  };
}

/**
 * Get badge rarity info
 * @param {string} rarity - Rarity level
 * @returns {Object} Rarity info
 */
export function getRarityInfo(rarity) {
  return RARITY_LEVELS[rarity] || RARITY_LEVELS.common;
}

/**
 * Check if user meets badge condition
 * @param {string} badgeId - Badge ID
 * @param {Object} userData - User data
 * @param {Object} userStats - User statistics
 * @returns {boolean} Whether user earned the badge
 */
export function checkBadgeCondition(badgeId, userData, userStats) {
  switch (badgeId) {
    case 'profile_complete':
      return userData.photoURL &&
             userData.photos?.length >= 2 &&
             userData.bio?.split(' ').length >= 120 &&
             userData.municipio &&
             userData.birthDate;

    case 'photo_pro':
      return userData.photos?.length >= 5;

    case 'verified_user':
      return userData.isVerified === true;

    case 'first_match':
      return userStats.totalMatches >= 1;

    case 'social_butterfly':
      return userStats.activeConversations >= 10;

    case 'popular':
      return userStats.matchRequestsReceived >= 50;

    case 'influencer':
      return userStats.successfulReferrals >= 10;

    case 'first_date':
      return userStats.completedDates >= 1;

    case 'date_pro':
      return userStats.completedDates >= 10;

    case 'punctual':
      return userStats.completedDates >= 10 && userStats.ghostingIncidents === 0;

    case 'insured':
      return userData.hasAntiGhostingInsurance === true;

    case 'vip_member':
      return userStats.membershipMonths >= 6;

    case 'platinum_member':
      return userData.reputation === 'PLATINO';

    case 'concierge':
      return userData.isConcierge === true;

    case 'admin':
      return userData.userRole === 'admin';

    default:
      return false;
  }
}
