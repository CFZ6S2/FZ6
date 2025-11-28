/**
 * Input Validation and Sanitization Utilities
 *
 * Provides comprehensive validation for user inputs to prevent
 * injection attacks, malformed data, and improve data quality.
 *
 * Usage:
 * ```javascript
 * import { validators, sanitize } from './input-validator.js';
 *
 * if (!validators.email(userEmail)) {
 *   showError('Email inválido');
 * }
 *
 * const cleanName = sanitize.name(userInput);
 * ```
 */

/**
 * Email validator (RFC 5322 compliant)
 */
export const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim()) && email.length <= 254;
};

/**
 * Password strength validator
 * Returns object with isValid and strength score
 */
export const validatePassword = (password) => {
  if (!password || typeof password !== 'string') {
    return { isValid: false, strength: 0, errors: ['Contraseña requerida'] };
  }

  const errors = [];
  let strength = 0;

  // Length check
  if (password.length < 8) {
    errors.push('Mínimo 8 caracteres');
  } else {
    strength += 1;
  }

  // Uppercase check
  if (!/[A-Z]/.test(password)) {
    errors.push('Requiere al menos una mayúscula');
  } else {
    strength += 1;
  }

  // Lowercase check
  if (!/[a-z]/.test(password)) {
    errors.push('Requiere al menos una minúscula');
  } else {
    strength += 1;
  }

  // Number check
  if (!/[0-9]/.test(password)) {
    errors.push('Requiere al menos un número');
  } else {
    strength += 1;
  }

  // Special character check
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Requiere al menos un carácter especial');
  } else {
    strength += 1;
  }

  // Common passwords check (basic)
  const commonPasswords = ['password', '12345678', 'qwerty', 'admin'];
  if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
    errors.push('Contraseña demasiado común');
    strength = Math.max(0, strength - 2);
  }

  return {
    isValid: errors.length === 0,
    strength: Math.min(5, strength),
    errors
  };
};

/**
 * Phone number validator (Spanish format)
 */
export const isValidPhone = (phone) => {
  if (!phone || typeof phone !== 'string') return false;

  // Remove spaces and special characters
  const cleaned = phone.replace(/[\s\-()]/g, '');

  // Spanish phone: 9 digits, starts with 6, 7, 8, or 9
  const spanishMobile = /^[6789]\d{8}$/;

  // International format: +34 followed by 9 digits
  const international = /^\+34[6789]\d{8}$/;

  return spanishMobile.test(cleaned) || international.test(cleaned);
};

/**
 * Age validator (18+)
 */
export const isValidAge = (birthDate) => {
  if (!birthDate) return false;

  const today = new Date();
  const birth = new Date(birthDate);

  if (isNaN(birth.getTime())) return false;

  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age >= 18 && age <= 120;
};

/**
 * Username/alias validator
 */
export const isValidUsername = (username) => {
  if (!username || typeof username !== 'string') return false;

  // 3-20 characters, alphanumeric + underscore/dash
  const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;

  // No offensive words (basic check)
  const bannedWords = ['admin', 'root', 'system'];
  const lowerUsername = username.toLowerCase();

  return (
    usernameRegex.test(username) &&
    !bannedWords.some(word => lowerUsername.includes(word))
  );
};

/**
 * URL validator
 */
export const isValidURL = (url) => {
  if (!url || typeof url !== 'string') return false;

  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
};

/**
 * Sanitize name (remove special characters, trim)
 */
export const sanitizeName = (name) => {
  if (!name || typeof name !== 'string') return '';

  return name
    .trim()
    .replace(/[<>\"'&]/g, '') // Remove potentially dangerous chars
    .replace(/\s+/g, ' ') // Normalize spaces
    .substring(0, 50); // Max length
};

/**
 * Sanitize text input (remove scripts, normalize)
 */
export const sanitizeText = (text, maxLength = 500) => {
  if (!text || typeof text !== 'string') return '';

  return text
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Remove event handlers
    .substring(0, maxLength);
};

/**
 * Sanitize phone number
 */
export const sanitizePhone = (phone) => {
  if (!phone || typeof phone !== 'string') return '';

  // Keep only digits and +
  return phone.replace(/[^\d+]/g, '').substring(0, 15);
};

/**
 * Validate credit card number (Luhn algorithm)
 */
export const isValidCreditCard = (cardNumber) => {
  if (!cardNumber || typeof cardNumber !== 'string') return false;

  const cleaned = cardNumber.replace(/\s/g, '');

  if (!/^\d{13,19}$/.test(cleaned)) return false;

  // Luhn algorithm
  let sum = 0;
  let isEven = false;

  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i], 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
};

/**
 * Validate Spanish DNI/NIE
 */
export const isValidDNI = (dni) => {
  if (!dni || typeof dni !== 'string') return false;

  const cleaned = dni.toUpperCase().replace(/[\s-]/g, '');

  // DNI: 8 digits + 1 letter
  const dniRegex = /^(\d{8})([A-Z])$/;
  // NIE: X/Y/Z + 7 digits + 1 letter
  const nieRegex = /^([XYZ])(\d{7})([A-Z])$/;

  let match = cleaned.match(dniRegex);
  let number;

  if (match) {
    number = parseInt(match[1], 10);
  } else {
    match = cleaned.match(nieRegex);
    if (!match) return false;

    // Replace X, Y, Z with 0, 1, 2
    const prefix = { 'X': 0, 'Y': 1, 'Z': 2 }[match[1]];
    number = parseInt(prefix + match[2], 10);
  }

  const letters = 'TRWAGMYFPDXBNJZSQVHLCKE';
  const expectedLetter = letters[number % 23];
  const providedLetter = match[match.length - 1];

  return expectedLetter === providedLetter;
};

/**
 * Comprehensive validators object
 */
export const validators = {
  email: isValidEmail,
  password: validatePassword,
  phone: isValidPhone,
  age: isValidAge,
  username: isValidUsername,
  url: isValidURL,
  creditCard: isValidCreditCard,
  dni: isValidDNI
};

/**
 * Sanitizers object
 */
export const sanitize = {
  name: sanitizeName,
  text: sanitizeText,
  phone: sanitizePhone
};

/**
 * Form validator helper
 * Validates entire form and returns errors
 */
export const validateForm = (formData, rules) => {
  const errors = {};

  for (const [field, rule] of Object.entries(rules)) {
    const value = formData[field];

    // Required check
    if (rule.required && (!value || value.trim() === '')) {
      errors[field] = rule.requiredMessage || `${field} es requerido`;
      continue;
    }

    // Skip validation if not required and empty
    if (!rule.required && (!value || value.trim() === '')) {
      continue;
    }

    // Custom validator
    if (rule.validator) {
      const result = rule.validator(value);

      if (typeof result === 'boolean' && !result) {
        errors[field] = rule.message || `${field} no es válido`;
      } else if (typeof result === 'object' && !result.isValid) {
        errors[field] = result.errors ? result.errors.join(', ') : rule.message;
      }
    }

    // Min length
    if (rule.minLength && value.length < rule.minLength) {
      errors[field] = `Mínimo ${rule.minLength} caracteres`;
    }

    // Max length
    if (rule.maxLength && value.length > rule.maxLength) {
      errors[field] = `Máximo ${rule.maxLength} caracteres`;
    }

    // Pattern match
    if (rule.pattern && !rule.pattern.test(value)) {
      errors[field] = rule.message || `${field} formato inválido`;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Show validation errors in form
 */
export const showFormErrors = (errors) => {
  // Clear previous errors
  document.querySelectorAll('.error-message').forEach(el => el.remove());
  document.querySelectorAll('.error-input').forEach(el => el.classList.remove('error-input'));

  for (const [field, message] of Object.entries(errors)) {
    const input = document.getElementById(field);

    if (input) {
      // Add error class
      input.classList.add('error-input');

      // Create error message
      const errorDiv = document.createElement('div');
      errorDiv.className = 'error-message text-red-400 text-sm mt-1';
      errorDiv.textContent = message;

      // Insert after input
      input.parentNode.insertBefore(errorDiv, input.nextSibling);
    }
  }
};

export default {
  validators,
  sanitize,
  validateForm,
  showFormErrors
};
