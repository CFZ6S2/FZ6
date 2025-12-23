/**
 * Referral System for TuCitaSegura
 * Allows users to invite friends and earn rewards
 */

/**
 * Generate a unique referral code for a user
 * @param {string} alias - User alias
 * @param {string} uid - User ID
 * @returns {string} Referral code
 */
export function generateReferralCode(alias, uid) {
  // Create a code based on alias + partial UID
  const cleanAlias = alias.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 6);
  const uidPart = uid.substring(0, 6).toUpperCase();
  return `${cleanAlias}${uidPart}`;
}

/**
 * Referral reward tiers
 */
export const REFERRAL_REWARDS = {
  BRONZE: {
    referralsNeeded: 1,
    reward: 'Free 1 month membership',
    badge: 'Embajador Bronce',
    icon: '🥉',
    discountDays: 30
  },
  SILVER: {
    referralsNeeded: 5,
    reward: 'Free 3 months membership + VIP event access',
    badge: 'Embajador Plata',
    icon: '🥈',
    discountDays: 90,
    vipEventAccess: true
  },
  GOLD: {
    referralsNeeded: 10,
    reward: 'Free 6 months membership + VIP priority',
    badge: 'Embajador Oro',
    icon: '🥇',
    discountDays: 180,
    vipEventAccess: true,
    priority: true
  },
  PLATINUM: {
    referralsNeeded: 25,
    reward: 'Free 1 year membership + all perks',
    badge: 'Embajador Platino',
    icon: '💎',
    discountDays: 365,
    vipEventAccess: true,
    priority: true,
    allPerks: true
  }
};

/**
 * Get referral tier based on successful referrals
 * @param {number} referralCount - Number of successful referrals
 * @returns {Object|null} Tier information
 */
export function getReferralTier(referralCount) {
  if (referralCount >= REFERRAL_REWARDS.PLATINUM.referralsNeeded) {
    return { tier: 'PLATINUM', ...REFERRAL_REWARDS.PLATINUM };
  } else if (referralCount >= REFERRAL_REWARDS.GOLD.referralsNeeded) {
    return { tier: 'GOLD', ...REFERRAL_REWARDS.GOLD };
  } else if (referralCount >= REFERRAL_REWARDS.SILVER.referralsNeeded) {
    return { tier: 'SILVER', ...REFERRAL_REWARDS.SILVER };
  } else if (referralCount >= REFERRAL_REWARDS.BRONZE.referralsNeeded) {
    return { tier: 'BRONZE', ...REFERRAL_REWARDS.BRONZE };
  }
  return null;
}

/**
 * Get next tier information
 * @param {number} referralCount - Current number of referrals
 * @returns {Object|null} Next tier information
 */
export function getNextTier(referralCount) {
  const tiers = [
    { tier: 'BRONZE', ...REFERRAL_REWARDS.BRONZE },
    { tier: 'SILVER', ...REFERRAL_REWARDS.SILVER },
    { tier: 'GOLD', ...REFERRAL_REWARDS.GOLD },
    { tier: 'PLATINUM', ...REFERRAL_REWARDS.PLATINUM }
  ];

  for (const tier of tiers) {
    if (referralCount < tier.referralsNeeded) {
      return {
        ...tier,
        remaining: tier.referralsNeeded - referralCount
      };
    }
  }

  return null; // Already at max tier
}

/**
 * Calculate referral stats
 * @param {Array} referrals - Array of referral documents
 * @returns {Object} Statistics
 */
export function calculateReferralStats(referrals) {
  const stats = {
    total: referrals.length,
    pending: 0,
    completed: 0,
    active: 0,
    totalRewardsEarned: 0
  };

  referrals.forEach(ref => {
    if (ref.status === 'pending') stats.pending++;
    if (ref.status === 'completed') stats.completed++;
    if (ref.status === 'active') stats.active++;
    if (ref.rewardEarned) stats.totalRewardsEarned += ref.rewardValue || 0;
  });

  return stats;
}

/**
 * Validate referral code format
 * @param {string} code - Referral code to validate
 * @returns {boolean} Is valid
 */
export function isValidReferralCode(code) {
  // Must be 12 characters, alphanumeric
  return /^[A-Z0-9]{12}$/.test(code);
}

/**
 * Share referral code
 * @param {string} code - Referral code
 * @param {string} alias - User alias
 */
export async function shareReferralCode(code, alias) {
  const shareText = `¡Únete a TuCitaSegura con mi código de invitación ${code} y comienza a encontrar relaciones serias! 💕`;
  const shareUrl = `${window.location.origin}/register.html?ref=${code}`;

  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Invitación a TuCitaSegura',
        text: shareText,
        url: shareUrl
      });
      return { success: true, method: 'native' };
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error sharing:', error);
      }
    }
  }

  // Fallback: Copy to clipboard
  try {
    await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
    return { success: true, method: 'clipboard' };
  } catch (error) {
    console.error('Error copying to clipboard:', error);
    return { success: false, method: null };
  }
}
