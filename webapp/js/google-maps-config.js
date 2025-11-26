/**
 * Google Maps Configuration
 *
 * IMPORTANTE: Reemplaza 'TU_API_KEY_AQUI' con tu API Key de Google Maps
 *
 * Para obtener tu API Key:
 * 1. Ve a: https://console.cloud.google.com/apis/credentials
 * 2. Selecciona tu proyecto
 * 3. Click en "Crear credenciales" → "Clave de API"
 * 4. Copia la clave y pégala aquí (reemplazando TU_API_KEY_AQUI)
 * 5. IMPORTANTE: Restringe la key a tu dominio en "Restricciones de clave"
 *
 * APIs requeridas (ya las tienes habilitadas):
 * - Maps JavaScript API
 * - Geocoding API
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
