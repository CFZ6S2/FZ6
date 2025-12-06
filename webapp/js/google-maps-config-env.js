// ============================================================================
// GOOGLE MAPS CONFIGURATION (ENVIRONMENT AWARE)
// ============================================================================

// Load configuration from Vite environment variables
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyBvHTajBkXNlXnkFeN0zAVmfV00XjLT7cg'; // Fallback to user provided key for now

const MAP_CONFIG = {
    DEFAULT_CENTER: { lat: 40.416775, lng: -3.703790 }, // Madrid
    DEFAULT_ZOOM: 12,
    STYLES: [
        {
            "featureType": "all",
            "elementType": "geometry",
            "stylers": [{ "color": "#242f3e" }]
        },
        {
            "featureType": "all",
            "elementType": "labels.text.stroke",
            "stylers": [{ "lightness": -80 }]
        },
        {
            "featureType": "administrative",
            "elementType": "labels.text.fill",
            "stylers": [{ "color": "#746855" }]
        },
        {
            "featureType": "poi",
            "elementType": "labels.text.fill",
            "stylers": [{ "color": "#d59563" }]
        },
        {
            "featureType": "water",
            "elementType": "geometry",
            "stylers": [{ "color": "#17263c" }]
        }
    ]
};

const GEOCODING_CONFIG = {
    REGION: 'es',
    LANGUAGE: 'es'
};

export { GOOGLE_MAPS_API_KEY, MAP_CONFIG, GEOCODING_CONFIG };
