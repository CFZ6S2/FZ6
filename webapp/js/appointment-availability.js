/**
 * Appointment Availability System for Women
 * Sistema de disponibilidad de citas para mujeres
 * 
 * Estados:
 * - Verde (immediate): Quieren cita inmediata
 * - Amarillo (planned): Quieren cita planeada
 * - Rojo (not_accepting): No aceptan citas
 */

import { APPOINTMENT_AVAILABILITY } from './constants.js';
import { GENDERS } from './constants.js';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase-config-env.js';
import { logger } from './logger.js';

/**
 * Obtener el estado de disponibilidad actual de una usuaria
 * @param {string} userId - ID del usuario
 * @returns {Promise<string>} Estado de disponibilidad (immediate, planned, not_accepting)
 */
export async function getAvailabilityStatus(userId) {
  try {
    const { getDoc } = await import('firebase/firestore');
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      // Por defecto: no acepta citas
      return APPOINTMENT_AVAILABILITY.NOT_ACCEPTING.status;
    }
    
    const userData = userSnap.data();
    return userData.appointmentAvailability || APPOINTMENT_AVAILABILITY.NOT_ACCEPTING.status;
  } catch (error) {
    logger.error('Error obteniendo estado de disponibilidad:', error);
    return APPOINTMENT_AVAILABILITY.NOT_ACCEPTING.status;
  }
}

/**
 * Actualizar el estado de disponibilidad de una usuaria
 * @param {string} userId - ID del usuario
 * @param {string} availability - Nuevo estado (immediate, planned, not_accepting)
 * @param {string} gender - Género del usuario (debe ser femenino)
 * @returns {Promise<Object>} { success, previousStatus, newStatus }
 */
export async function updateAvailabilityStatus(userId, availability, gender) {
  try {
    // Validar que es una mujer
    if (gender !== GENDERS.FEMALE) {
      logger.warn('⚠️ Solo las mujeres pueden cambiar su disponibilidad de citas');
      return {
        success: false,
        error: 'Solo disponible para mujeres'
      };
    }
    
    // Validar estado
    const validStatuses = Object.values(APPOINTMENT_AVAILABILITY).map(a => a.status);
    if (!validStatuses.includes(availability)) {
      logger.warn('⚠️ Estado de disponibilidad inválido:', availability);
      return {
        success: false,
        error: 'Estado de disponibilidad inválido'
      };
    }
    
    const previousStatus = await getAvailabilityStatus(userId);
    
    // Actualizar en Firestore
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      appointmentAvailability: availability,
      appointmentAvailabilityUpdatedAt: serverTimestamp()
    });
    
    const config = APPOINTMENT_AVAILABILITY[availability.toUpperCase()] || 
                   Object.values(APPOINTMENT_AVAILABILITY).find(a => a.status === availability);
    
    logger.info(`✅ Disponibilidad actualizada: ${previousStatus} -> ${availability}`, {
      userId,
      label: config?.label || availability
    });
    
    return {
      success: true,
      previousStatus,
      newStatus: availability,
      config
    };
  } catch (error) {
    logger.error('Error actualizando disponibilidad:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Obtener configuración visual del estado de disponibilidad
 * @param {string} status - Estado de disponibilidad
 * @returns {Object} Configuración con colores, iconos, etc.
 */
export function getAvailabilityConfig(status) {
  const config = Object.values(APPOINTMENT_AVAILABILITY).find(a => a.status === status);
  return config || APPOINTMENT_AVAILABILITY.NOT_ACCEPTING;
}

/**
 * Obtener todos los estados disponibles
 * @returns {Array<Object>} Lista de estados disponibles
 */
export function getAllAvailabilityStatuses() {
  return Object.values(APPOINTMENT_AVAILABILITY);
}

/**
 * Verificar si una usuaria acepta citas
 * @param {string} userId - ID del usuario
 * @returns {Promise<boolean>} True si acepta citas (immediate o planned)
 */
export async function isAcceptingAppointments(userId) {
  const status = await getAvailabilityStatus(userId);
  return status !== APPOINTMENT_AVAILABILITY.NOT_ACCEPTING.status;
}

/**
 * Verificar si una usuaria acepta citas inmediatas
 * @param {string} userId - ID del usuario
 * @returns {Promise<boolean>} True si acepta citas inmediatas
 */
export async function acceptsImmediateAppointments(userId) {
  const status = await getAvailabilityStatus(userId);
  return status === APPOINTMENT_AVAILABILITY.IMMEDIATE.status;
}

