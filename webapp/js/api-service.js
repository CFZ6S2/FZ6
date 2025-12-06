/**
 * API Service for TuCitaSegura
 * Connects frontend with FastAPI backend
 */

export class APIService {
  constructor() {
    const host = (typeof window !== 'undefined' && window.location && window.location.hostname) ? window.location.hostname : '';
    const isLocal = host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local');
    this.isLocal = isLocal;
    const override = (typeof window !== 'undefined' && window.API_BASE_URL) ? String(window.API_BASE_URL) : '';
    // FORCE CLOUD RUN URL IN PRODUCTION (Bypass Hosting Rewrites)
    const CLOUD_RUN_URL = 'https://tucitasegura-backend-tlmpmnvyda-uc.a.run.app';
    this.baseURL = override ? override : (isLocal ? 'http://localhost:8001' : CLOUD_RUN_URL);

    // If we have a baseURL (which we always do now), disable same-origin
    // This allows api-service to bypass faulty local rewrites
    const useSameOrigin = false;
    this.useSameOrigin = useSameOrigin;
    this.fallbackBaseURL = CLOUD_RUN_URL;
    this.token = null;
    this.headers = {
      'Content-Type': 'application/json',
    };
  }

  /**
   * Set authentication token
   * @param {string} token - Firebase ID token
   */
  setToken(token) {
    this.token = token;
    this.headers['Authorization'] = `Bearer ${token}`;
  }

  /**
   * Clear authentication token
   */
  clearToken() {
    this.token = null;
    delete this.headers['Authorization'];
  }

  /**
   * Make HTTP request
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Response data
   */
  async request(endpoint, options = {}) {
    if (!this.baseURL && !this.useSameOrigin) {
      throw new Error('Backend base no configurada');
    }
    const url = this.useSameOrigin ? endpoint : `${this.baseURL}${endpoint}`;
    const method = (options.method ? String(options.method) : 'GET').toUpperCase();
    const mergedHeaders = { ...this.headers, ...(options.headers || {}) };
    try {
      const hasGetter = typeof window !== 'undefined' && typeof window.getAppCheckToken === 'function';
      const hasInstance = typeof window !== 'undefined' && !!window._appCheckInstance;
      if (hasGetter && hasInstance) {
        const tokenResult = await window.getAppCheckToken();
        if (tokenResult && tokenResult.token) {
          mergedHeaders['X-Firebase-AppCheck'] = tokenResult.token;
        }
      }
    } catch (e) {
      console.warn('App Check token not available:', e?.message || e);
    }
    if (method === 'GET') {
      delete mergedHeaders['Content-Type'];
    }
    const config = { ...options, method, headers: mergedHeaders };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        let detail = `HTTP ${response.status}`;
        try {
          const json = await response.json();
          detail = json.detail || detail;
        } catch (e) {
          try {
            const text = await response.text();
            if (text) detail = text;
          } catch { }
        }
        if (String(detail).toLowerCase().includes('app check') || String(detail).toLowerCase().includes('x-firebase-appcheck')) {
          console.warn('App Check enforcement detected on backend:', detail);
        }
        throw new Error(detail);
      }

      try {
        return await response.json();
      } catch {
        return {};
      }
    } catch (error) {
      const ep = endpoint || '';
      const isNoise = ep === '/health' || ep.includes('/auth/status');

      // Manejar específicamente errores de CORS y conexión
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        if (this.useSameOrigin && this.fallbackBaseURL) {
          try {
            const fallbackUrl = `${this.fallbackBaseURL}${endpoint}`;
            const resp = await fetch(fallbackUrl, { ...config });
            if (!resp.ok) {
              let detail = `HTTP ${resp.status}`;
              try {
                const json = await resp.json();
                detail = json.detail || detail;
              } catch { }
              throw new Error(detail);
            }
            try {
              return await resp.json();
            } catch {
              return {};
            }
          } catch (fallbackErr) {
            console.warn(`Fallback request failed: ${ep}`, String(fallbackErr.message || fallbackErr));
          }
        }
        console.warn(`CORS/Network error - backend not reachable: ${ep}`, error.message);
        throw new Error('Backend connection failed - CORS or network issue');
      }

      if (isNoise) {
        console.warn(`API warning: ${ep}`, error.message || error);
      } else {
        console.error(`API request failed: ${ep}`, error);
      }

      if (typeof window !== 'undefined') {
        try {
          await fetch('/reportAppCheckFailure', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              errorCode: 'api_request_failed',
              message: error.message || String(error),
              hostname: location.hostname,
              userAgent: navigator.userAgent,
              path: endpoint
            })
          });
        } catch { }
      }
      throw error;
    }
  }

  /**
   * GET request
   */
  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url);
  }

  /**
   * POST request
   */
  async post(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * PUT request
   */
  async put(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * DELETE request
   */
  async delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE',
    });
  }

  // ============================================================================
  // AUTHENTICATION ENDPOINTS
  // ============================================================================

  /**
   * Check authentication status with backend
   * @returns {Promise<Object>} Auth status
   */
  async checkAuthStatus() {
    return this.get('/api/v1/auth/status');
  }

  /**
   * Get user profile from backend
   * @returns {Promise<Object>} User profile
   */
  async getUserProfile() {
    return this.get('/api/v1/users/me');
  }

  /**
   * Upload profile photo
   * @param {File} file - Image file
   * @param {string} photoType - Type of photo (avatar, gallery_1, etc.)
   * @returns {Promise<Object>} Upload result
   */
  async uploadProfilePhoto(file, photoType = 'avatar') {
    const formData = new FormData();
    formData.append('file', file);

    // Construct query parameters
    const params = new URLSearchParams({ photo_type: photoType });
    const endpoint = `/api/upload/profile?${params.toString()}`;

    if (!this.baseURL && !this.useSameOrigin) {
      throw new Error('Backend disabled');
    }

    const url = this.useSameOrigin ? endpoint : `${this.baseURL}${endpoint}`;

    // Headers (excluding Content-Type to let browser set boundary)
    const headers = { ...this.headers };
    delete headers['Content-Type'];

    // Add App Check token if available
    if (typeof window.getAppCheckToken === 'function') {
      try {
        const appCheckResult = await window.getAppCheckToken();
        if (appCheckResult && appCheckResult.token) {
          headers['X-Firebase-AppCheck'] = appCheckResult.token;
        }
      } catch (e) {
        console.warn('Failed to get App Check token for upload:', e);
      }
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   * @param {Object} profileData - Profile data
   * @returns {Promise<Object>} Updated profile
   */
  async updateUserProfile(profileData) {
    return this.put('/api/v1/users/me', profileData);
  }

  // ============================================================================
  // MEMBERSHIP ENDPOINTS
  // ============================================================================

  /**
   * Check membership status
   * @returns {Promise<Object>} Membership status
   */
  async checkMembershipStatus() {
    return this.get('/api/v1/membership/status');
  }

  /**
   * Get subscription plans
   * @returns {Promise<Array>} Subscription plans
   */
  async getSubscriptionPlans() {
    return this.get('/api/v1/membership/plans');
  }

  /**
   * Create subscription
   * @param {Object} subscriptionData - Subscription data
   * @returns {Promise<Object>} Created subscription
   */
  async createSubscription(subscriptionData) {
    return this.post('/api/v1/membership/subscribe', subscriptionData);
  }

  /**
   * Cancel subscription
   * @returns {Promise<Object>} Cancellation result
   */
  async cancelSubscription() {
    return this.post('/api/v1/membership/cancel');
  }

  // ============================================================================
  // MODERATION ENDPOINTS
  // ============================================================================

  /**
   * Moderate message content
   * @param {string} text - Text to moderate
   * @returns {Promise<Object>} Moderation result { is_safe, reasons, ... }
   */
  async moderateMessage(text) {
    return this.post('/api/v1/moderation/message', {
      text: text,
      context: 'chat'
    });
  }

  // ============================================================================
  // RECOMMENDATIONS ENDPOINTS
  // ============================================================================

  /**
   * Get user recommendations
   * @param {Object} filters - Search filters
   * @returns {Promise<Array>} User recommendations
   */
  async getRecommendations(filters = {}) {
    const params = {
      user_id: this.getCurrentUserId(),
      limit: 50,
      min_score: 0.1
    };

    if (filters.min_age) params.min_age = filters.min_age;
    if (filters.max_age) params.max_age = filters.max_age;
    if (filters.distance) params.max_distance = filters.distance;

    return this.get('/api/v1/recommendations', params);
  }

  /**
   * Get matches for user
   * @returns {Promise<Array>} User matches
   */
  async getMatches() {
    return this.get('/api/v1/matches');
  }

  // ============================================================================
  // CHAT ENDPOINTS
  // ============================================================================

  /**
   * Get conversations
   * @returns {Promise<Array>} User conversations
   */
  async getConversations() {
    return this.get('/api/v1/chat/conversations');
  }

  /**
   * Get messages for conversation
   * @param {string} conversationId - Conversation ID
   * @returns {Promise<Array>} Messages
   */
  async getMessages(conversationId) {
    return this.get(`/api/v1/chat/conversations/${conversationId}/messages`);
  }

  /**
   * Send message
   * @param {string} conversationId - Conversation ID
   * @param {string} message - Message content
   * @returns {Promise<Object>} Sent message
   */
  async sendMessage(conversationId, message) {
    return this.post(`/api/v1/chat/conversations/${conversationId}/messages`, {
      content: message
    });
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  /**
   * Get current user ID from token
   * @returns {string|null} User ID
   */
  getCurrentUserId() {
    if (!this.token) return null;

    try {
      // Decode JWT token to get user ID
      const payload = JSON.parse(atob(this.token.split('.')[1]));
      return payload.user_id || null;
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  }

  /**
   * Health check
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    return this.get('/health');
  }

  /**
   * Check if backend is available
   * @returns {Promise<boolean>} Backend availability
   */
  async isBackendAvailable() {
    try {
      await this.healthCheck();
      return true;
    } catch (error) {
      return false;
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const apiService = new APIService();

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Handle API errors
 * @param {Error} error - API error
 * @param {Function} onError - Error callback
 */
export function handleAPIError(error, onError = null) {
  console.error('API Error:', error);

  let message = 'Error de conexión con el servidor';

  if (error.message.includes('Failed to fetch')) {
    message = 'No se pudo conectar con el servidor. Por favor, verifica tu conexión.';
  } else if (error.message.includes('401')) {
    message = 'No autorizado. Por favor, inicia sesión nuevamente.';
  } else if (error.message.includes('403')) {
    message = 'Acceso denegado. Verifica tu membresía.';
  } else if (error.message.includes('404')) {
    message = 'Recurso no encontrado.';
  } else if (error.message.includes('500')) {
    message = 'Error del servidor. Por favor, intenta más tarde.';
  } else {
    message = error.message;
  }

  if (onError) {
    onError(message);
  } else {
    // Show toast notification
    if (typeof window !== 'undefined' && window.showToast) {
      window.showToast(message, 'error');
    } else {
      alert(message);
    }
  }
}

export default apiService;
