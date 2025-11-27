/**
 * PayPal Configuration for TuCitaSegura
 */

// PayPal Client ID (public, safe to expose)
export const PAYPAL_CLIENT_ID = 'AUYz2zdljYOCUhGYqKYDHiV7SxJyuGiCda7Q7JH7VqKK10U7DP5C83374uL6VyXG2ja4x69mpVVQKTrO';

// PayPal mode
export const PAYPAL_MODE = 'sandbox'; // Change to 'live' for production

/**
 * Load PayPal SDK
 * @returns {Promise<void>}
 */
export async function loadPayPalSDK() {
  return new Promise((resolve, reject) => {
    if (window.paypal) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&currency=EUR&intent=capture&vault=true`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load PayPal SDK'));
    document.body.appendChild(script);
  });
}

/**
 * Create subscription with PayPal
 * @param {string} userId - User ID
 * @param {string} containerId - ID of container element for PayPal button
 * @returns {Promise<Object>} Result
 */
export async function createPayPalSubscription(userId, containerId = 'paypal-button-container') {
  try {
    await loadPayPalSDK();

    return new Promise((resolve, reject) => {
      window.paypal.Buttons({
        createSubscription: async function(data, actions) {
          // For now, use a fixed plan ID
          // In production, you would call a Cloud Function to create a plan dynamically
          // or use a pre-configured plan ID from Stripe Dashboard

          // Monthly subscription plan
          const MONTHLY_PLAN_ID = 'P-YOUR_PAYPAL_PLAN_ID_HERE'; // TODO: Replace with actual plan ID

          return actions.subscription.create({
            plan_id: MONTHLY_PLAN_ID,
            custom_id: userId, // Important: Track user ID for webhook
            application_context: {
              shipping_preference: 'NO_SHIPPING'
            }
          });
        },
        onApprove: async function(data) {
          console.log('PayPal subscription approved:', data.subscriptionID);

          // Subscription will be handled by webhook
          resolve({
            success: true,
            subscriptionId: data.subscriptionID
          });
        },
        onError: function(err) {
          console.error('PayPal subscription error:', err);
          reject(err);
        },
        onCancel: function() {
          reject(new Error('User cancelled PayPal subscription'));
        }
      }).render(`#${containerId}`);
    });

  } catch (error) {
    console.error('Error creating PayPal subscription:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Create one-time payment (Insurance)
 * @param {string} userId - User ID
 * @param {number} amount - Amount in EUR
 * @param {string} description - Payment description
 * @param {string} containerId - ID of container element for PayPal button
 * @returns {Promise<Object>} Result
 */
export async function createPayPalPayment(userId, amount, description, containerId = 'paypal-button-container') {
  try {
    await loadPayPalSDK();

    return new Promise((resolve, reject) => {
      window.paypal.Buttons({
        createOrder: function(data, actions) {
          return actions.order.create({
            purchase_units: [{
              amount: {
                currency_code: 'EUR',
                value: amount.toFixed(2)
              },
              description: description,
              custom_id: userId // Important: Track user ID
            }],
            application_context: {
              shipping_preference: 'NO_SHIPPING'
            }
          });
        },
        onApprove: async function(data, actions) {
          const order = await actions.order.capture();
          console.log('PayPal payment captured:', order);

          resolve({
            success: true,
            orderId: order.id,
            paymentId: order.purchase_units[0].payments.captures[0].id,
            amount: parseFloat(order.purchase_units[0].amount.value)
          });
        },
        onError: function(err) {
          console.error('PayPal payment error:', err);
          reject(err);
        },
        onCancel: function() {
          reject(new Error('User cancelled PayPal payment'));
        }
      }).render(`#${containerId}`);
    });

  } catch (error) {
    console.error('Error creating PayPal payment:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Cancel PayPal subscription
 * @param {string} subscriptionId - PayPal subscription ID
 * @returns {Promise<Object>} Result
 */
export async function cancelPayPalSubscription(subscriptionId) {
  try {
    // This would typically be done through your backend/Cloud Function
    // to ensure security. Here's an example of calling a Cloud Function:

    const cancelFunction = firebase.functions().httpsCallable('cancelPayPalSubscription');
    const result = await cancelFunction({ subscriptionId });

    return result.data;

  } catch (error) {
    console.error('Error canceling PayPal subscription:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Format amount for display
 * @param {number} amount - Amount
 * @param {string} currency - Currency code
 * @returns {string} Formatted amount
 */
export function formatAmount(amount, currency = 'EUR') {
  const formatter = new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: currency
  });

  return formatter.format(amount);
}

/**
 * Payment providers enum
 */
export const PAYMENT_PROVIDERS = {
  STRIPE: 'stripe',
  PAYPAL: 'paypal'
};
