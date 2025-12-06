import logging
import math
import requests
import json
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime, timedelta
import numpy as np
from geopy.distance import geodesic
from geopy.geocoders import GoogleV3

logger = logging.getLogger(__name__)

@dataclass
class MeetingSpot:
    """Represents a suggested meeting spot"""
    name: str
    location: Tuple[float, float]  # (lat, lng)
    address: str
    rating: float
    review_count: int
    types: List[str]
    distance_user1: float  # meters
    distance_user2: float  # meters
    price_level: Optional[int] = None  # 0-4, 4 being most expensive
    is_open_now: Optional[bool] = None
    phone_number: Optional[str] = None
    website: Optional[str] = None
    safety_score: float = 0.0
    date_suitability: float = 0.0

@dataclass
class LocationVerification:
    """Location verification result"""
    is_verified: bool
    distance: float  # meters
    within_tolerance: bool
    confidence: float
    factors: List[str]

class LocationIntelligence:
    def __init__(self, google_api_key: str):
        self.google_api_key = google_api_key
        self.geocoder = GoogleV3(api_key=google_api_key)
        
        # Criterios de seguridad para lugares de encuentro
        self.safety_criteria = {
            'min_rating': 3.5,
            'min_reviews': 10,
            'preferred_types': [
                'cafe', 'restaurant', 'bar', 'bakery', 'shopping_mall',
                'park', 'movie_theater', 'museum', 'art_gallery',
                'book_store', 'library', 'university', 'gym'
            ],
            'avoid_types': [
                'night_club', 'casino', 'liquor_store', 'bar'
            ],
            'max_distance_km': 10.0
        }
        
        # Factores de conveniencia para citas
        self.date_suitability_factors = {
            'quiet_environment': ['library', 'book_store', 'cafe'],
            'romantic_atmosphere': ['restaurant', 'park', 'art_gallery'],
            'activity_based': ['movie_theater', 'museum', 'shopping_mall'],
            'casual_meeting': ['cafe', 'bakery', 'park']
        }

    def suggest_meeting_spots(self, 
                            user1_location: Tuple[float, float], 
                            user2_location: Tuple[float, float],
                            preferences: Optional[Dict] = None) -> List[MeetingSpot]:
        """
        Sugiere lugares seguros para encuentros entre dos usuarios
        """
        try:
            # Calcular punto medio
            midpoint = self._calculate_midpoint(user1_location, user2_location)
            
            # Verificar distancia total
            total_distance = geodesic(user1_location, user2_location).kilometers
            if total_distance > self.safety_criteria['max_distance_km']:
                logger.warning(f"Users are {total_distance:.1f}km apart - very far for meeting")
            
            # Buscar lugares cercanos al punto medio
            places = self._find_nearby_places(midpoint, radius_km=2.0)
            
            # Filtrar y puntuar lugares
            filtered_places = self._filter_suitable_places(places, preferences)
            scored_places = self._score_places_for_dating(filtered_places, user1_location, user2_location)
            
            # Ordenar por puntuación total
            scored_places.sort(key=lambda x: x.safety_score + x.date_suitability, reverse=True)
            
            logger.info(f"Found {len(scored_places)} suitable meeting spots near midpoint {midpoint}")
            
            return scored_places[:10]  # Top 10 lugares
            
        except Exception as e:
            logger.error(f"Error suggesting meeting spots: {str(e)}")
            return []

    def verify_date_location(self, 
                           claimed_location: Tuple[float, float], 
                           user_gps: Tuple[float, float],
                           tolerance_meters: int = 250) -> LocationVerification:
        """
        Verifica que el usuario esté realmente en la ubicación que dice
        """
        try:
            # Calcular distancia
            distance = geodesic(claimed_location, user_gps).meters
            
            # Verificar si está dentro de la tolerancia
            within_tolerance = distance <= tolerance_meters
            
            # Análisis adicional de confianza
            confidence_factors = []
            confidence = 0.5  # Base confidence
            
            # Factor 1: Precisión de la distancia
            if distance < 50:  # Muy cercano
                confidence += 0.3
                confidence_factors.append("Muy cercano a la ubicación declarada")
            elif distance < tolerance_meters:
                confidence += 0.2
                confidence_factors.append("Dentro del rango de tolerancia")
            else:
                confidence -= 0.2
                confidence_factors.append("Fuera del rango de tolerancia")
            
            # Factor 2: Verificar si el lugar existe realmente
            try:
                location_info = self._get_location_info(claimed_location)
                if location_info:
                    confidence += 0.1
                    confidence_factors.append("Ubicación verificada en base de datos")
            except Exception as e:
                logger.warning(f"Error validating location existence: {e}")
                confidence -= 0.1
                confidence_factors.append("No se pudo verificar la ubicación")
            
            # Factor 3: Hora del día (algunas horas son más sospechosas)
            current_hour = datetime.now().hour
            if 6 <= current_hour <= 22:  # Horas razonables
                confidence += 0.1
                confidence_factors.append("Hora del día razonable")
            else:
                confidence_factors.append("Verificación en horas poco comunes")
            
            # Ajustar confianza final
            confidence = max(0.0, min(1.0, confidence))
            
            logger.info(f"Location verification: distance={distance:.1f}m, "
                       f"within_tolerance={within_tolerance}, confidence={confidence:.2f}")
            
            return LocationVerification(
                is_verified=within_tolerance,
                distance=distance,
                within_tolerance=within_tolerance,
                confidence=confidence,
                factors=confidence_factors
            )
            
        except Exception as e:
            logger.error(f"Error verifying location: {str(e)}")
            return LocationVerification(
                is_verified=False,
                distance=float('inf'),
                within_tolerance=False,
                confidence=0.0,
                factors=["Error en verificación"]
            )

    def _calculate_midpoint(self, loc1: Tuple[float, float], loc2: Tuple[float, float]) -> Tuple[float, float]:
        """Calcula el punto medio entre dos ubicaciones"""
        # Convertir a radianes
        lat1, lng1 = math.radians(loc1[0]), math.radians(loc1[1])
        lat2, lng2 = math.radians(loc2[0]), math.radians(loc2[1])
        
        # Calcular punto medio usando fórmula de navegación
        bx = math.cos(lat2) * math.cos(lng2 - lng1)
        by = math.cos(lat2) * math.sin(lng2 - lng1)
        
        lat_mid = math.atan2(math.sin(lat1) + math.sin(lat2),
                           math.sqrt((math.cos(lat1) + bx) * (math.cos(lat1) + bx) + by * by))
        lng_mid = lng1 + math.atan2(by, math.cos(lat1) + bx)
        
        return math.degrees(lat_mid), math.degrees(lng_mid)

    def _find_nearby_places(self, location: Tuple[float, float], radius_km: float = 2.0) -> List[Dict]:
        """Busca lugares cercanos usando Google Places API"""
        try:
            lat, lng = location
            radius_meters = int(radius_km * 1000)
            
            # Tipos de lugares a buscar
            place_types = [
                'cafe', 'restaurant', 'bar', 'bakery', 'shopping_mall',
                'park', 'movie_theater', 'museum', 'art_gallery', 'book_store'
            ]
            
            all_places = []
            
            for place_type in place_types:
                url = (
                    f"https://maps.googleapis.com/maps/api/place/nearbysearch/json?"
                    f"location={lat},{lng}&radius={radius_meters}&type={place_type}"
                    f"&key={self.google_api_key}&language=es"
                )
                
                response = requests.get(url, timeout=10)
                if response.status_code == 200:
                    data = response.json()
                    if data.get('results'):
                        all_places.extend(data['results'])
            
            # Eliminar duplicados
            seen_places = {}
            unique_places = []
            for place in all_places:
                place_id = place.get('place_id')
                if place_id and place_id not in seen_places:
                    seen_places[place_id] = True
                    unique_places.append(place)
            
            logger.info(f"Found {len(unique_places)} unique places near {location}")
            return unique_places
            
        except Exception as e:
            logger.error(f"Error finding nearby places: {str(e)}")
            return []

    def _filter_suitable_places(self, places: List[Dict], preferences: Optional[Dict] = None) -> List[Dict]:
        """Filtra lugares según criterios de seguridad y preferencias"""
        filtered = []
        
        for place in places:
            # Verificar rating mínimo
            rating = place.get('rating', 0)
            if rating < self.safety_criteria['min_rating']:
                continue
            
            # Verificar cantidad de reseñas
            user_ratings = place.get('user_ratings_total', 0)
            if user_ratings < self.safety_criteria['min_reviews']:
                continue
            
            # Verificar tipos de lugar
            place_types = place.get('types', [])
            
            # Evitar tipos no deseados
            if any(avoid_type in place_types for avoid_type in self.safety_criteria['avoid_types']):
                continue
            
            # Preferir tipos adecuados
            has_preferred_type = any(pref_type in place_types 
                                   for pref_type in self.safety_criteria['preferred_types'])
            if not has_preferred_type:
                continue
            
            # Aplicar preferencias del usuario
            if preferences:
                if not self._matches_preferences(place, preferences):
                    continue
            
            filtered.append(place)
        
        logger.info(f"Filtered to {len(filtered)} suitable places")
        return filtered

    def _matches_preferences(self, place: Dict, preferences: Dict) -> bool:
        """Verifica si un lugar coincide con las preferencias del usuario"""
        # Preferencias de precio
        if 'max_price' in preferences:
            price_level = place.get('price_level', 2)  # Default medium price
            if price_level > preferences['max_price']:
                return False
        
        # Tipos de lugar preferidos
        if 'preferred_types' in preferences:
            place_types = place.get('types', [])
            user_prefs = preferences['preferred_types']
            has_match = any(pref in place_types for pref in user_prefs)
            if not has_match:
                return False
        
        # Rating mínimo personalizado
        if 'min_rating' in preferences:
            rating = place.get('rating', 0)
            if rating < preferences['min_rating']:
                return False
        
        return True

    def _score_places_for_dating(self, places: List[Dict], user1_location: Tuple[float, float], 
                                user2_location: Tuple[float, float]) -> List[MeetingSpot]:
        """Puntúa lugares según su idoneidad para citas"""
        scored_places = []
        
        for place in places:
            # Calcular distancias
            place_location = (place['geometry']['location']['lat'], 
                            place['geometry']['location']['lng'])
            
            distance_user1 = geodesic(user1_location, place_location).meters
            distance_user2 = geodesic(user2_location, place_location).meters
            
            # Calcular puntuación de seguridad
            safety_score = self._calculate_safety_score(place)
            
            # Calcular puntuación de idoneidad para citas
            date_suitability = self._calculate_date_suitability(place)
            
            # Crear objeto MeetingSpot
            meeting_spot = MeetingSpot(
                name=place.get('name', 'Unknown Place'),
                location=place_location,
                address=place.get('vicinity', 'Address not available'),
                rating=place.get('rating', 0),
                review_count=place.get('user_ratings_total', 0),
                types=place.get('types', []),
                distance_user1=distance_user1,
                distance_user2=distance_user2,
                price_level=place.get('price_level'),
                is_open_now=place.get('opening_hours', {}).get('open_now') if place.get('opening_hours') else None,
                phone_number=place.get('formatted_phone_number'),
                website=place.get('website'),
                safety_score=safety_score,
                date_suitability=date_suitability
            )
            
            scored_places.append(meeting_spot)
        
        return scored_places

    def _calculate_safety_score(self, place: Dict) -> float:
        """Calcula puntuación de seguridad basada en múltiples factores"""
        score = 0.5  # Puntuación base
        
        # Factor 1: Rating (0-0.3 puntos)
        rating = place.get('rating', 0)
        if rating >= 4.5:
            score += 0.3
        elif rating >= 4.0:
            score += 0.2
        elif rating >= 3.5:
            score += 0.1
        
        # Factor 2: Cantidad de reseñas (0-0.2 puntos)
        review_count = place.get('user_ratings_total', 0)
        if review_count >= 100:
            score += 0.2
        elif review_count >= 50:
            score += 0.15
        elif review_count >= 20:
            score += 0.1
        
        # Factor 3: Tipos de lugar (0-0.2 puntos)
        place_types = place.get('types', [])
        safe_types = ['cafe', 'restaurant', 'shopping_mall', 'park', 'library', 'book_store']
        unsafe_types = ['night_club', 'bar', 'liquor_store']
        
        safe_matches = sum(1 for t in place_types if t in safe_types)
        unsafe_matches = sum(1 for t in place_types if t in unsafe_types)
        
        score += min(0.2, safe_matches * 0.05)
        score -= unsafe_matches * 0.1
        
        # Factor 4: Horario de apertura (0-0.1 puntos)
        opening_hours = place.get('opening_hours', {})
        if opening_hours and opening_hours.get('open_now') is not None:
            score += 0.1  # Lugar con horarios verificados
        
        # Factor 5: Precio (0-0.2 puntos) - lugares moderadamente caros tienden a ser más seguros
        price_level = place.get('price_level', 2)
        if price_level == 2 or price_level == 3:  # Moderado a caro
            score += 0.1
        elif price_level == 4:  # Muy caro
            score += 0.2
        
        return max(0.0, min(1.0, score))

    def _calculate_date_suitability(self, place: Dict) -> float:
        """Calcula idoneidad del lugar para una cita"""
        score = 0.3  # Puntuación base
        
        place_types = place.get('types', [])
        
        # Evaluar según tipos de lugar
        for place_type in place_types:
            if place_type in self.date_suitability_factors['quiet_environment']:
                score += 0.2
            elif place_type in self.date_suitability_factors['romantic_atmosphere']:
                score += 0.25
            elif place_type in self.date_suitability_factors['activity_based']:
                score += 0.15
            elif place_type in self.date_suitability_factors['casual_meeting']:
                score += 0.2
        
        # Bonus por rating alto
        rating = place.get('rating', 0)
        if rating >= 4.0:
            score += 0.1
        
        # Bonus por tener muchas reseñas (popularidad)
        review_count = place.get('user_ratings_total', 0)
        if review_count >= 50:
            score += 0.1
        
        return max(0.0, min(1.0, score))

    def _get_location_info(self, location: Tuple[float, float]) -> Optional[Dict]:
        """Obtiene información detallada sobre una ubicación"""
        try:
            lat, lng = location
            url = (
                f"https://maps.googleapis.com/maps/api/geocode/json?"
                f"latlng={lat},{lng}&key={self.google_api_key}&language=es"
            )
            
            response = requests.get(url, timeout=5)
            if response.status_code == 200:
                data = response.json()
                if data.get('results'):
                    return data['results'][0]
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting location info: {str(e)}")
            return None

    def get_safety_recommendations(self, location: Tuple[float, float]) -> List[str]:
        """Obtiene recomendaciones de seguridad para un área"""
        recommendations = []
        
        try:
            # Verificar si es un área urbana segura
            nearby_places = self._find_nearby_places(location, radius_km=0.5)
            
            # Contar tipos de lugares
            place_types = []
            for place in nearby_places:
                place_types.extend(place.get('types', []))
            
            # Recomendaciones basadas en el entorno
            if 'police' in place_types:
                recommendations.append("✅ Hay comisaría cerca - área segura")
            
            if 'hospital' in place_types or 'doctor' in place_types:
                recommendations.append("✅ Servicios médicos cercanos")
            
            if place_types.count('restaurant') >= 3:
                recommendations.append("✅ Zona con buena oferta gastronómica")
            
            if 'shopping_mall' in place_types:
                recommendations.append("✅ Centro comercial cercano - zona concurrida")
            
            # Advertencias
            if 'night_club' in place_types or 'bar' in place_types:
                recommendations.append("⚠️ Zona de ocio nocturno - mayor precaución")
            
            if not nearby_places:
                recommendations.append("⚠️ Área poco concurrida - mayor precaución")
            
            # Recomendaciones generales
            recommendations.extend([
                "📱 Comparte tu ubicación en tiempo real con un amigo",
                "🕐 Planifica tu encuentro durante el día",
                "📍 Elige lugares públicos y concurridos",
                "🚗 Ten tu transporte organizado de antemano"
            ])
            
        except Exception as e:
            logger.error(f"Error getting safety recommendations: {str(e)}")
            recommendations.append("⚠️ No se pudieron obtener recomendaciones específicas")
        
        return recommendations

# Funciones auxiliares para uso externo
def suggest_safe_meeting_spots(user1_lat: float, user1_lng: float, 
                             user2_lat: float, user2_lng: float,
                             google_api_key: str,
                             preferences: Optional[Dict] = None) -> List[Dict]:
    """Función principal para sugerir lugares de encuentro seguros"""
    geo_service = LocationIntelligence(google_api_key)
    
    user1_location = (user1_lat, user1_lng)
    user2_location = (user2_lat, user2_lng)
    
    spots = geo_service.suggest_meeting_spots(user1_location, user2_location, preferences)
    
    # Convertir a diccionarios para serialización JSON
    return [{
        'name': spot.name,
        'location': {'lat': spot.location[0], 'lng': spot.location[1]},
        'address': spot.address,
        'rating': spot.rating,
        'review_count': spot.review_count,
        'types': spot.types,
        'distance_user1': spot.distance_user1,
        'distance_user2': spot.distance_user2,
        'price_level': spot.price_level,
        'is_open_now': spot.is_open_now,
        'phone_number': spot.phone_number,
        'website': spot.website,
        'safety_score': spot.safety_score,
        'date_suitability': spot.date_suitability
    } for spot in spots]

def verify_user_location(claimed_lat: float, claimed_lng: float,
                        user_lat: float, user_lng: float,
                        tolerance_meters: int = 250) -> Dict:
    """Función para verificar la ubicación de un usuario"""
    # Usar una API key de prueba o obtenerla de configuración
    google_api_key = "YOUR_GOOGLE_API_KEY"  # Esto debería venir de configuración
    
    geo_service = LocationIntelligence(google_api_key)
    
    claimed_location = (claimed_lat, claimed_lng)
    user_gps = (user_lat, user_lng)
    
    result = geo_service.verify_date_location(claimed_location, user_gps, tolerance_meters)
    
    return {
        'is_verified': result.is_verified,
        'distance': result.distance,
        'within_tolerance': result.within_tolerance,
        'confidence': result.confidence,
        'factors': result.factors,
        'verified_at': datetime.now().isoformat()
    }