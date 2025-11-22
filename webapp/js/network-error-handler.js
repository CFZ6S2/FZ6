// network-error-handler.js - Comprehensive network error handling for TuCitaSegura
// Handles Firebase network errors and provides fallback mechanisms

/**
 * Handle Firebase network errors with user-friendly messages and fallbacks
 * @param {Error} error - The Firebase error object
 * @param {string} operation - The operation that failed (login, register, etc.)
 * @returns {Object} - Error handling result with message and recovery options
 */
export function handleFirebaseNetworkError(error, operation = 'operation') {
  const errorInfo = {
    code: error.code,
    message: error.message,
    operation: operation,
    timestamp: new Date().toISOString(),
    userMessage: '',
    recoveryOptions: [],
    severity: 'error',
    shouldRetry: false,
    isDomainIssue: false
  };

  // Network-specific error handling
  if (error.code === 'auth/network-request-failed') {
    // Check if this might be a domain authorization issue
    const currentDomain = location.hostname;
    const isVercelDomain = currentDomain.includes('.vercel.app');
    const isLocalhost = currentDomain === 'localhost' || currentDomain === '127.0.0.1';
    
    if (isVercelDomain) {
      errorInfo.userMessage = 'Error de conexión con Firebase. El dominio de despliegue puede no estar autorizado.';
      errorInfo.recoveryOptions = [
        'Verifica que el dominio esté autorizado en Firebase Console',
        'Prueba en modo localhost para desarrollo',
        'Contacta al administrador para autorizar el dominio',
        'Intenta nuevamente en unos segundos'
      ];
      errorInfo.isDomainIssue = true;
    } else if (isLocalhost) {
      errorInfo.userMessage = 'Error de conexión. Verifica que estés conectado a internet.';
      errorInfo.recoveryOptions = [
        'Verifica tu conexión a internet',
        'Asegúrate de no estar detrás de un firewall restrictivo',
        'Intenta desactivar VPN si estás usando una',
        'Prueba con un navegador diferente'
      ];
    } else {
      errorInfo.userMessage = 'Error de conexión. No podemos comunicarnos con nuestros servidores.';
      errorInfo.recoveryOptions = [
        'Verifica tu conexión a internet',
        'Intenta nuevamente en unos segundos',
        'Prueba con una conexión diferente',
        'Contacta soporte si el problema persiste'
      ];
    }
    errorInfo.severity = 'error';
    errorInfo.shouldRetry = true;
    
  } else if (error.code === 'auth/internal-error') {
    errorInfo.userMessage = 'Error interno del servidor. Estamos trabajando para solucionarlo.';
    errorInfo.recoveryOptions = [
      'Intenta nuevamente en unos minutos',
      'Recarga la página',
      'Contacta soporte si el problema persiste'
    ];
    errorInfo.severity = 'error';
    errorInfo.shouldRetry = true;
    const msg = (error.message || '').toLowerCase();
    if (msg.includes('<html') || msg.includes('page not found') || msg.includes('http cloud function returned an error')) {
      errorInfo.isDomainIssue = true;
    }
    
  } else if (error.code === 'auth/timeout') {
    errorInfo.userMessage = 'La solicitud tardó demasiado tiempo. El servidor no respondió.';
    errorInfo.recoveryOptions = [
      'Verifica tu conexión a internet',
      'Intenta nuevamente',
      'Prueba más tarde'
    ];
    errorInfo.severity = 'warning';
    errorInfo.shouldRetry = true;
    
  } else if (error.code === 'auth/unavailable') {
    errorInfo.userMessage = 'El servicio de autenticación no está disponible temporalmente.';
    errorInfo.recoveryOptions = [
      'El servicio podría estar en mantenimiento',
      'Intenta nuevamente en unos minutos',
      'Consulta nuestro estado de servicio'
    ];
    errorInfo.severity = 'warning';
    errorInfo.shouldRetry = true;
    
  } else {
    // Generic error handling
    errorInfo.userMessage = `Error durante ${operation}. Por favor, intenta nuevamente.`;
    errorInfo.recoveryOptions = [
      'Verifica los datos ingresados',
      'Intenta nuevamente',
      'Contacta soporte si el problema persiste'
    ];
    errorInfo.severity = 'error';
    errorInfo.shouldRetry = false;
  }

  // Log detailed error for debugging
  console.error(`[NETWORK ERROR] ${operation}:`, {
    code: errorInfo.code,
    message: errorInfo.message,
    timestamp: errorInfo.timestamp,
    userAgent: navigator.userAgent,
    online: navigator.onLine,
    hostname: location.hostname,
    protocol: location.protocol
  });

  return errorInfo;
}

/**
 * Check network connectivity and provide status
 * @returns {Object} - Network status information
 */
export function checkNetworkStatus() {
  return {
    online: navigator.onLine,
    connection: navigator.connection || null,
    userAgent: navigator.userAgent,
    hostname: location.hostname,
    protocol: location.protocol,
    timestamp: new Date().toISOString()
  };
}

/**
 * Retry mechanism for failed operations
 * @param {Function} operation - The operation to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} delay - Delay between retries in milliseconds
 * @returns {Promise} - Result of the operation
 */
export async function retryOperation(operation, maxRetries = 3, delay = 1000) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[RETRY] Attempt ${attempt}/${maxRetries}`);
      const result = await operation();
      console.log(`[RETRY] Success on attempt ${attempt}`);
      return result;
    } catch (error) {
      lastError = error;
      console.error(`[RETRY] Attempt ${attempt} failed:`, error.message);
      
      if (attempt < maxRetries) {
        console.log(`[RETRY] Waiting ${delay}ms before next attempt...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      }
    }
  }
  
  throw lastError;
}

/**
 * Show user-friendly error notification
 * @param {Object} errorInfo - Error information from handleFirebaseNetworkError
 * @param {Function} showToast - Toast notification function
 */
export function showNetworkError(errorInfo, showToast) {
  const icon = errorInfo.severity === 'error' ? '❌' : '⚠️';
  const title = `${icon} Error de Conexión`;
  
  let message = errorInfo.userMessage;
  
  if (errorInfo.recoveryOptions.length > 0) {
    message += '\n\n💡 Sugerencias:';
    errorInfo.recoveryOptions.forEach((option, index) => {
      message += `\n${index + 1}. ${option}`;
    });
  }
  
  if (errorInfo.shouldRetry) {
    message += '\n\n🔄 Puedes intentar nuevamente.';
  }
  
  showToast(message, errorInfo.severity);
}

/**
 * Fallback authentication method for network issues
 * @returns {Promise} - Fallback authentication result
 */
export async function fallbackAuthentication() {
  console.warn('[FALLBACK] Using offline authentication mode');
  
  // In a real implementation, you might want to:
  // 1. Store credentials securely for offline use
  // 2. Implement a queue system for when network returns
  // 3. Use a different authentication provider
  
  throw new Error('Autenticación offline no disponible temporalmente');
}

// Export all functions
export default {
  handleFirebaseNetworkError,
  checkNetworkStatus,
  retryOperation,
  showNetworkError,
  fallbackAuthentication
};