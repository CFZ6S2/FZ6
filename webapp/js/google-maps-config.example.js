/**
 * Google Maps Configuration Example
 *
 * ⚠️ SETUP INSTRUCTIONS:
 * 1. Copy this file to google-maps-config.js
 * 2. Replace 'TU_API_KEY_AQUI' with your actual Google Maps API key
 * 3. NEVER commit google-maps-config.js with real API keys to Git!
 *
 * Para obtener tu API Key:
 * 1. Ve a: https://console.cloud.google.com/apis/credentials
 * 2. Selecciona tu proyecto
 * 3. Click en "Crear credenciales" → "Clave de API"
 * 4. Copia la clave y pégala aquí (reemplazando TU_API_KEY_AQUI)
 * 5. ⚠️ CRÍTICO: Restringe la key a tu dominio en "Restricciones de clave"
 *    - Production: tucitasegura.vercel.app
 *    - Development: localhost, 127.0.0.1
 * 6. Habilita solo las APIs necesarias:
 *    - Maps JavaScript API
 *    - Geocoding API
 *    - Places API
 *
 * APIs requeridas:
 * - Maps JavaScript API
 * - Geocoding API
 * - Places API (for location autocomplete)
 */

export const GOOGLE_MAPS_API_KEY = 'TU_API_KEY_AQUI';

// Configuración del mapa
export const MAP_CONFIG = {
  zoom: 13,
  mapTypeId: 'roadmap',
  gestureHandling: 'cooperative',
  styles: [
    {
      featureType: 'poi',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }]
    }
  ]
};

// Configuración de geocoding
export const GEOCODING_CONFIG = {
  // Nivel de zoom para obtener solo municipio/ciudad (privacidad)
  resultType: 'locality|administrative_area_level_2|administrative_area_level_3',
  language: 'es',
  region: 'ES'
};
