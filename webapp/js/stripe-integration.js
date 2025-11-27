/**
 * Stripe Integration for TuCitaSegura
 * Alternative payment provider to PayPal
 */

// Stripe publishable key
const STRIPE_PUBLISHABLE_KEY = 'pk_test_51R31JLHdpQPdr46sNZC55TNFxpuiexwtSMHVYzukiU3936dBBsnG8kYzfx9tqUNItjhpXGgJ6ulALdSeJ6d4ji1T00OtMh8MXV';

let stripe = null;
let elements = null;

/**
 * Initialize Stripe
 * @returns {Object} Stripe instance
 */
export async function initializeStripe() {
  if (!window.Stripe) {
    throw new Error('Stripe.js not loaded. Include https://js.stripe.com/v3/ in your HTML');
  }

  stripe = window.Stripe(STRIPE_PUBLISHABLE_KEY);
  return stripe;
}

/**
 * Create Stripe card element
 * @param {string} elementId - ID of the container element
 * @param {Object} options - Stripe Elements options
 * @returns {Object} Card element
 */
export function createCardElement(elementId, options = {}) {
  if (!stripe) {
    throw new Error('Stripe not initialized. Call initializeStripe() first');
  }

  elements = stripe.elements();

  const defaultOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
      invalid: {
        color: '#9e2146',
      },
    },
    hidePostalCode: false
  };

  const cardElement = elements.create('card', { ...defaultOptions, ...options });
  cardElement.mount(`#${elementId}`);

  return cardElement;
}

/**
 * Create subscription with Stripe
 * @param {Object} db - Firestore instance
 * @param {string} userId - User ID
 * @param {Object} cardElement - Stripe card element
 * @param {string} priceId - Stripe price ID
 * @returns {Promise<Object>} Result
 */
export async function createSubscription(db, userId, cardElement, priceId) {
  try {
    // Create payment method
    const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
      type: 'card',
      card: cardElement,
    });

    if (pmError) {
      return {
        success: false,
        error: pmError.message
      };
    }

    // Call Cloud Function to create subscription
    const createSubscriptionFunction = firebase.functions().httpsCallable('createStripeSubscription');

    const result = await createSubscriptionFunction({
      userId: userId,
      paymentMethodId: paymentMethod.id,
      priceId: priceId
    });

    if (!result.data.success) {
      return {
        success: false,
        error: result.data.error
      };
    }

    // Check if subscription requires 3D Secure
    const subscription = result.data.subscription;

    if (subscription.status === 'incomplete' && subscription.latest_invoice) {
      const invoice = subscription.latest_invoice;
      const paymentIntent = invoice.payment_intent;

      if (paymentIntent.status === 'requires_action') {
        // Handle 3D Secure
        const { error: confirmError } = await stripe.confirmCardPayment(
          paymentIntent.client_secret
        );

        if (confirmError) {
          return {
            success: false,
            error: confirmError.message
          };
        }
      }
    }

    return {
      success: true,
      subscription: subscription
    };

  } catch (error) {
    console.error('Error creating subscription:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Create one-time payment with Stripe (for insurance)
 * @param {Object} db - Firestore instance
 * @param {string} userId - User ID
 * @param {Object} cardElement - Stripe card element
 * @param {number} amount - Amount in cents
 * @param {string} description - Payment description
 * @returns {Promise<Object>} Result
 */
export async function createPayment(db, userId, cardElement, amount, description) {
  try {
    // Create payment intent via Cloud Function
    const createPaymentFunction = firebase.functions().httpsCallable('createStripePayment');

    const result = await createPaymentFunction({
      userId: userId,
      amount: amount, // in cents (e.g., 12000 for €120)
      currency: 'eur',
      description: description
    });

    if (!result.data.success) {
      return {
        success: false,
        error: result.data.error
      };
    }

    const clientSecret = result.data.clientSecret;

    // Confirm payment with card
    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardElement,
      }
    });

    if (error) {
      return {
        success: false,
        error: error.message
      };
    }

    if (paymentIntent.status === 'succeeded') {
      return {
        success: true,
        paymentIntent: paymentIntent
      };
    } else {
      return {
        success: false,
        error: `Payment status: ${paymentIntent.status}`
      };
    }

  } catch (error) {
    console.error('Error creating payment:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get subscription plans
 * @returns {Array} List of plans
 */
export function getSubscriptionPlans() {
  return [
    {
      id: 'monthly',
      name: 'Membresía Premium Mensual',
      priceId: 'price_YOUR_MONTHLY_PRICE_ID', // TODO: Replace with actual Stripe price ID
      amount: 30.00,
      currency: 'EUR',
      interval: 'month',
      features: [
        'Chat ilimitado',
        'Propuestas de citas',
        'Búsqueda avanzada',
        'Ver quién te dio like',
        'Video llamadas ilimitadas',
        'Perfil destacado',
        'Matchmaking personalizado',
        'Soporte prioritario',
        'Eventos VIP premium'
      ]
    }
  ];
}

/**
 * Cancel subscription
 * @param {string} subscriptionId - Stripe subscription ID
 * @returns {Promise<Object>} Result
 */
export async function cancelSubscription(subscriptionId) {
  try {
    const cancelFunction = firebase.functions().httpsCallable('cancelStripeSubscription');

    const result = await cancelFunction({
      subscriptionId: subscriptionId
    });

    return result.data;

  } catch (error) {
    console.error('Error canceling subscription:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Update payment method
 * @param {string} subscriptionId - Stripe subscription ID
 * @param {Object} cardElement - New card element
 * @returns {Promise<Object>} Result
 */
export async function updatePaymentMethod(subscriptionId, cardElement) {
  try {
    // Create new payment method
    const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
      type: 'card',
      card: cardElement,
    });

    if (pmError) {
      return {
        success: false,
        error: pmError.message
      };
    }

    // Update subscription payment method via Cloud Function
    const updateFunction = firebase.functions().httpsCallable('updateStripePaymentMethod');

    const result = await updateFunction({
      subscriptionId: subscriptionId,
      paymentMethodId: paymentMethod.id
    });

    return result.data;

  } catch (error) {
    console.error('Error updating payment method:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get customer portal URL
 * @returns {Promise<string>} Portal URL
 */
export async function getCustomerPortalUrl() {
  try {
    const portalFunction = firebase.functions().httpsCallable('createStripeCustomerPortal');

    const result = await portalFunction({
      returnUrl: window.location.origin + '/webapp/cuenta-pagos.html'
    });

    if (result.data.success) {
      return result.data.url;
    } else {
      throw new Error(result.data.error || 'Failed to create portal session');
    }

  } catch (error) {
    console.error('Error getting customer portal:', error);
    throw error;
  }
}

/**
 * Format amount for display
 * @param {number} amount - Amount in cents
 * @param {string} currency - Currency code
 * @returns {string} Formatted amount
 */
export function formatAmount(amount, currency = 'EUR') {
  const formatter = new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: currency
  });

  return formatter.format(amount / 100);
}

/**
 * Validate card element
 * @param {Object} cardElement - Stripe card element
 * @returns {Promise<Object>} Validation result
 */
export async function validateCard(cardElement) {
  return new Promise((resolve) => {
    cardElement.on('change', (event) => {
      if (event.complete) {
        resolve({ valid: true });
      } else if (event.error) {
        resolve({ valid: false, error: event.error.message });
      }
    });

    // Trigger validation
    cardElement.focus();
    cardElement.blur();
  });
}

/**
 * Setup card element error handling
 * @param {Object} cardElement - Stripe card element
 * @param {string} errorElementId - ID of error display element
 */
export function setupCardErrorHandling(cardElement, errorElementId) {
  const errorElement = document.getElementById(errorElementId);

  cardElement.on('change', (event) => {
    if (event.error) {
      errorElement.textContent = event.error.message;
      errorElement.style.display = 'block';
    } else {
      errorElement.textContent = '';
      errorElement.style.display = 'none';
    }
  });
}

/**
 * Payment providers enum
 */
export const PAYMENT_PROVIDERS = {
  STRIPE: 'stripe',
  PAYPAL: 'paypal'
};

/**
 * Get user's preferred payment provider
 * @param {Object} userData - User data from Firestore
 * @returns {string} Payment provider
 */
export function getPreferredPaymentProvider(userData) {
  return userData.preferredPaymentProvider || PAYMENT_PROVIDERS.STRIPE;
}
