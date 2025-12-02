/**
 * Google Maps Configuration
 *
 * ⚠️ SECURITY WARNING: API keys should NEVER be committed to Git!
 *
 * This file should be listed in .gitignore and each developer should
 * create their own version with their restricted API key.
 *
 * Para obtener tu API Key:
 * 1. Ve a: https://console.cloud.google.com/apis/credentials
 * 2. Selecciona tu proyecto
 * 3. Click en "Crear credenciales" → "Clave de API"
 * 4. Copia la clave y pégala aquí (reemplazando TU_API_KEY_AQUI)
 * 5. ⚠️ CRÍTICO: Restringe la key a tu dominio en "Restricciones de clave"
 *    - Production: tucitasegura.vercel.app
 *    - Localhost: localhost, 127.0.0.1
 * 6. Habilita solo las APIs necesarias:
 *    - Maps JavaScript API
 *    - Geocoding API
 *    - Places API
 *
 * APIs requeridas (ya las tienes habilitadas):
 * - Maps JavaScript API
 * - Geocoding API
 */

// ⚠️ IMPORTANT: This API key should be restricted in Google Cloud Console
// Restrict to these domains: tucitasegura.com, www.tucitasegura.com, *.firebaseapp.com
// You can override by setting window.GOOGLE_MAPS_API_KEY before loading this module
export const GOOGLE_MAPS_API_KEY = (typeof window !== 'undefined' && window.GOOGLE_MAPS_API_KEY) || 'AIzaSyB-1uKRCkjlTMxjyXgnFDDtmvHJ4Gedp5k';

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
