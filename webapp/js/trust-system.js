/**
 * Trust Level System for Men
 * Sistema de niveles de confianza para hombres basado en citas
 * 
 * Reglas:
 * - Todos empiezan en ORO
 * - 1 cita fallida: ORO -> PLATA
 * - 2 citas fallidas: PLATA -> BRONCE
 * - Desde BRONCE, si siguen fallando: BRONCE -> NEGRO (ban)
 * - 3 citas satisfactorias sin fallos: Permiso para carnet de conductor
 */

import { TRUST_LEVELS, TRUST_LEVEL_CONFIG, TRUST_LEVEL_RULES } from './constants.js';
import { GENDERS } from './constants.js';
import { doc, updateDoc, getDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase-config-env.js';
import { logger } from './logger.js';

/**
 * Obtener el nivel de confianza actual de un usuario
 * @param {string} userId - ID del usuario
 * @returns {Promise<string>} Nivel de confianza (ORO, PLATA, BRONCE, NEGRO)
 */
export async function getTrustLevel(userId) {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      // Usuario nuevo: nivel inicial ORO
      return TRUST_LEVEL_RULES.INITIAL_LEVEL;
    }
    
    const userData = userSnap.data();
    return userData.trustLevel || TRUST_LEVEL_RULES.INITIAL_LEVEL;
  } catch (error) {
    logger.error('Error obteniendo nivel de confianza:', error);
    return TRUST_LEVEL_RULES.INITIAL_LEVEL;
  }
}

/**
 * Obtener estadísticas de citas de un usuario
 * @param {string} userId - ID del usuario
 * @returns {Promise<Object>} Estadísticas { successful, failed, consecutiveSuccessful }
 */
export async function getAppointmentStats(userId) {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      return {
        successful: 0,
        failed: 0,
        consecutiveSuccessful: 0,
        totalAppointments: 0
      };
    }
    
    const userData = userSnap.data();
    return {
      successful: userData.appointmentsSuccessful || 0,
      failed: userData.appointmentsFailed || 0,
      consecutiveSuccessful: userData.consecutiveSuccessfulAppointments || 0,
      totalAppointments: (userData.appointmentsSuccessful || 0) + (userData.appointmentsFailed || 0)
    };
  } catch (error) {
    logger.error('Error obteniendo estadísticas de citas:', error);
    return {
      successful: 0,
      failed: 0,
      consecutiveSuccessful: 0,
      totalAppointments: 0
    };
  }
}

/**
 * Actualizar nivel de confianza después de una cita fallida
 * @param {string} userId - ID del usuario
 * @param {string} appointmentId - ID de la cita
 * @returns {Promise<Object>} { newLevel, wasBanned, previousLevel }
 */
export async function handleFailedAppointment(userId, appointmentId) {
  try {
    const currentLevel = await getTrustLevel(userId);
    const stats = await getAppointmentStats(userId);
    
    logger.info(`📉 Procesando cita fallida para usuario ${userId}`, {
      currentLevel,
      failedCount: stats.failed + 1,
      appointmentId
    });
    
    // Determinar nuevo nivel según las reglas
    let newLevel = currentLevel;
    const downgradeMap = TRUST_LEVEL_RULES.FAILED_APPOINTMENT_DOWNGRADES;
    
    if (downgradeMap[currentLevel]) {
      newLevel = downgradeMap[currentLevel];
    }
    
    // Si ya está en BRONCE y falla otra vez, ir a NEGRO
    if (currentLevel === 'BRONCE' && downgradeMap['BRONCE']) {
      newLevel = downgradeMap['BRONCE'];
    }
    
    const wasBanned = newLevel === 'NEGRO';
    const previousLevel = currentLevel;
    
    // Actualizar en Firestore
    const userRef = doc(db, 'users', userId);
    const updateData = {
      trustLevel: newLevel,
      appointmentsFailed: increment(1),
      consecutiveSuccessfulAppointments: 0, // Reset contador de éxitos consecutivos
      lastTrustLevelUpdate: serverTimestamp(),
      lastFailedAppointment: serverTimestamp()
    };
    
    if (wasBanned) {
      updateData.banned = true;
      updateData.bannedAt = serverTimestamp();
      updateData.bannedReason = 'Múltiples citas fallidas';
      logger.warn(`🚫 Usuario ${userId} baneado por citas fallidas`);
    }
    
    await updateDoc(userRef, updateData);
    
    logger.info(`✅ Nivel de confianza actualizado: ${previousLevel} -> ${newLevel}`, {
      userId,
      wasBanned,
      appointmentId
    });
    
    return {
      newLevel,
      previousLevel,
      wasBanned,
      currentFailedCount: stats.failed + 1
    };
  } catch (error) {
    logger.error('Error manejando cita fallida:', error);
    throw error;
  }
}

/**
 * Actualizar nivel de confianza después de una cita exitosa
 * @param {string} userId - ID del usuario
 * @param {string} appointmentId - ID de la cita
 * @returns {Promise<Object>} { earnedLicense, consecutiveCount, currentLevel }
 */
export async function handleSuccessfulAppointment(userId, appointmentId) {
  try {
    const currentLevel = await getTrustLevel(userId);
    const stats = await getAppointmentStats(userId);
    
    logger.info(`📈 Procesando cita exitosa para usuario ${userId}`, {
      currentLevel,
      consecutiveBefore: stats.consecutiveSuccessful,
      appointmentId
    });
    
    const newConsecutiveCount = (stats.consecutiveSuccessful || 0) + 1;
    const earnedLicense = newConsecutiveCount >= TRUST_LEVEL_RULES.SATISFACTORY_APPOINTMENTS_FOR_LICENSE;
    
    // Actualizar en Firestore
    const userRef = doc(db, 'users', userId);
    const updateData = {
      appointmentsSuccessful: increment(1),
      consecutiveSuccessfulAppointments: newConsecutiveCount,
      lastSuccessfulAppointment: serverTimestamp()
    };
    
    if (earnedLicense) {
      updateData.drivingLicensePermission = true;
      updateData.drivingLicenseEarnedAt = serverTimestamp();
      logger.success(`🎉 Usuario ${userId} obtuvo permiso para carnet de conductor!`);
    }
    
    await updateDoc(userRef, updateData);
    
    logger.info(`✅ Cita exitosa procesada`, {
      userId,
      consecutiveCount: newConsecutiveCount,
      earnedLicense,
      appointmentId
    });
    
    return {
      earnedLicense,
      consecutiveCount: newConsecutiveCount,
      currentLevel,
      totalSuccessful: stats.successful + 1
    };
  } catch (error) {
    logger.error('Error manejando cita exitosa:', error);
    throw error;
  }
}

/**
 * Obtener configuración visual del nivel de confianza
 * @param {string} level - Nivel de confianza
 * @returns {Object} Configuración con colores, iconos, etc.
 */
export function getTrustLevelConfig(level) {
  return TRUST_LEVEL_CONFIG[level] || TRUST_LEVEL_CONFIG.ORO;
}

/**
 * Verificar si un usuario tiene permiso para carnet de conductor
 * @param {string} userId - ID del usuario
 * @returns {Promise<boolean>} True si tiene permiso
 */
export async function hasDrivingLicensePermission(userId) {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      return false;
    }
    
    const userData = userSnap.data();
    return userData.drivingLicensePermission === true;
  } catch (error) {
    logger.error('Error verificando permiso de carnet:', error);
    return false;
  }
}

/**
 * Inicializar nivel de confianza para un nuevo usuario (hombre)
 * @param {string} userId - ID del usuario
 * @param {string} gender - Género del usuario
 * @returns {Promise<void>}
 */
export async function initializeTrustLevel(userId, gender) {
  // Solo aplicar a hombres
  if (gender !== GENDERS.MALE) {
    return;
  }
  
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    // Si ya existe, no sobrescribir
    if (userSnap.exists() && userSnap.data().trustLevel) {
      return;
    }
    
    // Inicializar con nivel ORO
    await updateDoc(userRef, {
      trustLevel: TRUST_LEVEL_RULES.INITIAL_LEVEL,
      appointmentsSuccessful: 0,
      appointmentsFailed: 0,
      consecutiveSuccessfulAppointments: 0,
      trustLevelInitializedAt: serverTimestamp()
    });
    
    logger.info(`✅ Nivel de confianza inicializado (ORO) para usuario ${userId}`);
  } catch (error) {
    logger.error('Error inicializando nivel de confianza:', error);
  }
}

