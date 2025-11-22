"""
TuCitaSegura - Motor de Recomendaciones con Machine Learning

Este módulo implementa un sistema de recomendaciones inteligente que utiliza:
- Collaborative Filtering (filtrado colaborativo)
- Content-Based Filtering (filtrado basado en contenido)
- Hybrid Approach (enfoque híbrido)
- Geographic proximity
- Behavioral patterns
"""

import numpy as np
import pandas as pd
from typing import List, Dict, Optional, Tuple
from datetime import datetime, timedelta
import logging
from dataclasses import dataclass
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import StandardScaler, LabelEncoder
import firebase_admin
from firebase_admin import firestore
import json

logger = logging.getLogger(__name__)

@dataclass
class UserProfile:
    """Perfil de usuario para recomendaciones"""
    user_id: str
    age: int
    gender: str
    location: Dict[str, float]  # {"lat": float, "lng": float}
    interests: List[str]
    profession: str
    education_level: str
    relationship_goals: str
    personality_traits: Dict[str, float]  # {"trait": score}
    preferences: Dict[str, any]
    activity_score: float
    reputation_score: float
    verification_level: str
    photos_count: int
    bio_length: int
    languages: List[str]
    smoking: str
    drinking: str
    exercise: str
    religion: str
    politics: str

@dataclass
class InteractionData:
    """Datos de interacción entre usuarios"""
    user_id: str
    target_user_id: str
    interaction_type: str  # "like", "message", "block", "report"
    timestamp: datetime
    success_outcome: bool  # si llevó a cita o relación
    interaction_score: float

@dataclass
class Recommendation:
    """Recomendación de usuario"""
    user_id: str
    score: float
    reasons: List[str]
    compatibility_percentage: float
    distance_km: float
    common_interests: List[str]
    predicted_success_rate: float
    risk_factors: List[str]

class MatchingEngine:
    """
    Motor principal de recomendaciones que combina múltiples algoritmos
    """
    
    def __init__(self):
        # Inicializar Firebase solo si está disponible
        try:
            self.db = firestore.client()
        except Exception as e:
            logger.warning(f"Firebase no disponible, usando modo demo: {e}")
            self.db = None
            
        self.collaborative_weight = 0.4
        self.content_weight = 0.3
        self.geographic_weight = 0.2
        self.behavioral_weight = 0.1
        
        # Modelos y escaladores
        self.tfidf_vectorizer = TfidfVectorizer(max_features=100, stop_words='spanish')
        self.scaler = StandardScaler()
        self.label_encoders = {}
        
        # Umbrales de configuración
        self.max_distance_km = 100
        self.min_compatibility_score = 0.6
        self.max_recommendations = 20
        
    def get_smart_recommendations(
        self, 
        user_id: str, 
        limit: int = 10,
        filters: Optional[Dict] = None
    ) -> List[Recommendation]:
        """
        Generar recomendaciones inteligentes para un usuario
        
        Args:
            user_id: ID del usuario objetivo
            limit: Número máximo de recomendaciones
            filters: Filtros adicionales (edad, distancia, etc.)
            
        Returns:
            Lista de recomendaciones ordenadas por score
        """
        try:
            logger.info(f"[MatchingEngine] Generando recomendaciones para usuario {user_id}")
            
            # Obtener perfil del usuario
            user_profile = self._get_user_profile(user_id)
            if not user_profile:
                logger.warning(f"[MatchingEngine] Perfil no encontrado para usuario {user_id}")
                return []
            
            # Obtener pool de usuarios candidatos
            candidate_pool = self._get_candidate_pool(user_id, user_profile, filters)
            if not candidate_pool:
                logger.info(f"[MatchingEngine] No hay candidatos disponibles para {user_id}")
                return []
            
            # Calcular scores para cada candidato
            recommendations = []
            for candidate in candidate_pool:
                score, reasons = self._calculate_compatibility_score(user_profile, candidate)
                
                if score >= self.min_compatibility_score:
                    recommendation = Recommendation(
                        user_id=candidate.user_id,
                        score=score,
                        reasons=reasons,
                        compatibility_percentage=score * 100,
                        distance_km=self._calculate_distance(user_profile.location, candidate.location),
                        common_interests=list(set(user_profile.interests) & set(candidate.interests)),
                        predicted_success_rate=self._predict_success_rate(user_profile, candidate),
                        risk_factors=self._assess_risk_factors(candidate)
                    )
                    recommendations.append(recommendation)
            
            # Ordenar por score y aplicar límite
            recommendations.sort(key=lambda x: x.score, reverse=True)
            final_recommendations = recommendations[:limit]
            
            # Log de métricas
            logger.info(f"[MatchingEngine] Generadas {len(final_recommendations)} recomendaciones para {user_id}")
            
            return final_recommendations
            
        except Exception as e:
            logger.error(f"[MatchingEngine] Error generando recomendaciones: {e}", exc_info=True)
            return []
    
    def _get_user_profile(self, user_id: str) -> Optional[UserProfile]:
        """Obtener perfil completo de usuario desde Firestore o modo demo"""
        try:
            if self.db:
                # Modo producción con Firebase
                user_doc = self.db.collection('users').document(user_id).get()
                if not user_doc.exists:
                    return None
                user_data = user_doc.to_dict()
            else:
                # Modo demo para testing
                user_data = self._get_demo_user_data(user_id)
                if not user_data:
                    return None
            
            # Extraer datos de perfil
            return UserProfile(
                user_id=user_id,
                age=user_data.get('age', 25),
                gender=user_data.get('gender', ''),
                location=user_data.get('location', {'lat': 0, 'lng': 0}),
                interests=user_data.get('interests', []),
                profession=user_data.get('profession', ''),
                education_level=user_data.get('educationLevel', ''),
                relationship_goals=user_data.get('relationshipGoals', ''),
                personality_traits=user_data.get('personalityTraits', {}),
                preferences=user_data.get('preferences', {}),
                activity_score=user_data.get('activityScore', 0.5),
                reputation_score=user_data.get('reputationScore', 0.5),
                verification_level=user_data.get('verificationLevel', 'none'),
                photos_count=user_data.get('photosCount', 0),
                bio_length=len(user_data.get('bio', '')),
                languages=user_data.get('languages', []),
                smoking=user_data.get('smoking', 'no_preference'),
                drinking=user_data.get('drinking', 'no_preference'),
                exercise=user_data.get('exercise', 'no_preference'),
                religion=user_data.get('religion', 'no_preference'),
                politics=user_data.get('politics', 'no_preference')
            )
            
        except Exception as e:
            logger.error(f"[MatchingEngine] Error obteniendo perfil de {user_id}: {e}")
            return None
    
    def _get_demo_user_data(self, user_id: str) -> Optional[Dict]:
        """Datos de demo para testing cuando Firebase no está disponible"""
        demo_users = {
            'test_user_123': {
                'age': 28, 'gender': 'masculino', 'location': {'lat': 40.7128, 'lng': -74.0060},
                'interests': ['music', 'travel', 'cooking'], 'profession': 'Engineer',
                'educationLevel': 'university', 'relationshipGoals': 'serious',
                'activityScore': 0.8, 'reputationScore': 0.9, 'verificationLevel': 'verified'
            },
            'test_user_456': {
                'age': 32, 'gender': 'femenino', 'location': {'lat': 40.7589, 'lng': -73.9851},
                'interests': ['sports', 'reading'], 'profession': 'Doctor',
                'educationLevel': 'university', 'relationshipGoals': 'serious',
                'activityScore': 0.7, 'reputationScore': 0.8, 'verificationLevel': 'verified'
            }
        }
        return demo_users.get(user_id)
    
    def _get_candidate_pool(
        self, 
        user_id: str, 
        user_profile: UserProfile,
        filters: Optional[Dict] = None
    ) -> List[UserProfile]:
        """Obtener pool de candidatos basado en filtros básicos"""
        try:
            if self.db:
                # Modo producción con Firebase
                return self._get_candidate_pool_firebase(user_id, user_profile, filters)
            else:
                # Modo demo para testing
                return self._get_candidate_pool_demo(user_id, user_profile, filters)
        except Exception as e:
            logger.error(f"[MatchingEngine] Error obteniendo candidatos: {e}")
            return []
    
    def _get_candidate_pool_demo(
        self, 
        user_id: str, 
        user_profile: UserProfile,
        filters: Optional[Dict] = None
    ) -> List[UserProfile]:
        """Obtener candidatos de demo para testing - EXCLUSIVAMENTE HETEROSEXUAL"""
        try:
            # Crear candidatos de demo del género opuesto
            if user_profile.gender == 'masculino':
                # Hombre busca mujer
                demo_candidates = [
                    UserProfile(
                        user_id='demo_woman_1',
                        age=26, gender='femenino', location={'lat': 40.7200, 'lng': -74.0100},
                        interests=['music', 'travel'], profession='Designer',
                        education_level='university', relationship_goals='serious',
                        personality_traits={'open': 0.8}, preferences={},
                        activity_score=0.7, reputation_score=0.8, verification_level='verified',
                        photos_count=3, bio_length=150, languages=['es', 'en'],
                        smoking='no', drinking='social', exercise='regular',
                        religion='none', politics='centro'
                    ),
                    UserProfile(
                        user_id='demo_woman_2',
                        age=30, gender='femenino', location={'lat': 40.7300, 'lng': -74.0200},
                        interests=['sports', 'cooking'], profession='Teacher',
                        education_level='university', relationship_goals='serious',
                        personality_traits={'kind': 0.9}, preferences={},
                        activity_score=0.6, reputation_score=0.7, verification_level='basic',
                        photos_count=2, bio_length=120, languages=['es'],
                        smoking='no', drinking='no', exercise='regular',
                        religion='catholic', politics='left'
                    )
                ]
            else:
                # Mujer busca hombre
                demo_candidates = [
                    UserProfile(
                        user_id='demo_man_1',
                        age=28, gender='masculino', location={'lat': 40.7150, 'lng': -74.0150},
                        interests=['technology', 'fitness'], profession='Engineer',
                        education_level='university', relationship_goals='serious',
                        personality_traits={'ambitious': 0.8}, preferences={},
                        activity_score=0.8, reputation_score=0.9, verification_level='verified',
                        photos_count=4, bio_length=180, languages=['es', 'en'],
                        smoking='no', drinking='social', exercise='regular',
                        religion='none', politics='centro'
                    ),
                    UserProfile(
                        user_id='demo_man_2',
                        age=32, gender='masculino', location={'lat': 40.7250, 'lng': -74.0250},
                        interests=['music', 'sports'], profession='Doctor',
                        education_level='university', relationship_goals='serious',
                        personality_traits={'caring': 0.9}, preferences={},
                        activity_score=0.7, reputation_score=0.8, verification_level='verified',
                        photos_count=3, bio_length=160, languages=['es'],
                        smoking='no', drinking='social', exercise='regular',
                        religion='catholic', politics='right'
                    )
                ]
            
            # Aplicar filtros básicos
            filtered_candidates = []
            for candidate in demo_candidates:
                # Filtro de edad
                if filters:
                    if 'min_age' in filters and candidate.age < filters['min_age']:
                        continue
                    if 'max_age' in filters and candidate.age > filters['max_age']:
                        continue
                
                # Filtro de distancia (máximo 50km)
                distance = self._calculate_distance(user_profile.location, candidate.location)
                if distance > 50:
                    continue
                
                filtered_candidates.append(candidate)
            
            logger.info(f"[MatchingEngine] Demo: Encontrados {len(filtered_candidates)} candidatos HETEROSEXUALES")
            return filtered_candidates
            
        except Exception as e:
            logger.error(f"[MatchingEngine] Error en candidatos demo: {e}")
            return []
    
    def _get_candidate_pool_firebase(
        self, 
        user_id: str, 
        user_profile: UserProfile,
        filters: Optional[Dict] = None
    ) -> List[UserProfile]:
        """Obtener candidatos desde Firebase"""
        try:
            # Query base con filtros de seguridad y preferencias
            query = self.db.collection('users').where('isActive', '==', True)
            
            # Filtro de género según preferencias del usuario
            if user_profile.gender == 'masculino':
                query = query.where('gender', '==', 'femenino')
            elif user_profile.gender == 'femenino':
                query = query.where('gender', '==', 'masculino')
            
            # Filtros adicionales
            if filters:
                if 'min_age' in filters:
                    query = query.where('age', '>=', filters['min_age'])
                if 'max_age' in filters:
                    query = query.where('age', '<=', filters['max_age'])
                if 'verification_level' in filters:
                    query = query.where('verificationLevel', '==', filters['verification_level'])
            
            # Ejecutar query
            candidates = []
            for doc in query.stream():
                candidate_data = doc.to_dict()
                candidate_id = doc.id
                
                # Excluir el usuario actual
                if candidate_id == user_id:
                    continue
                
                # Verificar distancia geográfica
                candidate_location = candidate_data.get('location', {'lat': 0, 'lng': 0})
                distance = self._calculate_distance(user_profile.location, candidate_location)
                
                if distance > self.max_distance_km:
                    continue
                
                # Crear perfil de candidato
                candidate = UserProfile(
                    user_id=candidate_id,
                    age=candidate_data.get('age', 25),
                    gender=candidate_data.get('gender', ''),
                    location=candidate_location,
                    interests=candidate_data.get('interests', []),
                    profession=candidate_data.get('profession', ''),
                    education_level=candidate_data.get('educationLevel', ''),
                    relationship_goals=candidate_data.get('relationshipGoals', ''),
                    personality_traits=candidate_data.get('personalityTraits', {}),
                    preferences=candidate_data.get('preferences', {}),
                    activity_score=candidate_data.get('activityScore', 0.5),
                    reputation_score=candidate_data.get('reputationScore', 0.5),
                    verification_level=candidate_data.get('verificationLevel', 'none'),
                    photos_count=candidate_data.get('photosCount', 0),
                    bio_length=len(candidate_data.get('bio', '')),
                    languages=candidate_data.get('languages', []),
                    smoking=candidate_data.get('smoking', 'no_preference'),
                    drinking=candidate_data.get('drinking', 'no_preference'),
                    exercise=candidate_data.get('exercise', 'no_preference'),
                    religion=candidate_data.get('religion', 'no_preference'),
                    politics=candidate_data.get('politics', 'no_preference')
                )
                
                candidates.append(candidate)
            
            logger.info(f"[MatchingEngine] Encontrados {len(candidates)} candidatos")
            return candidates
            
        except Exception as e:
            logger.error(f"[MatchingEngine] Error obteniendo candidatos: {e}")
            return []
    
    def _calculate_compatibility_score(
        self, 
        user1: UserProfile, 
        user2: UserProfile
    ) -> Tuple[float, List[str]]:
        """Calcular score de compatibilidad entre dos usuarios"""
        reasons = []
        
        # 1. Filtrado Colaborativo (40%)
        collaborative_score = self._calculate_collaborative_score(user1, user2)
        
        # 2. Filtrado Basado en Contenido (30%)
        content_score = self._calculate_content_score(user1, user2, reasons)
        
        # 3. Proximidad Geográfica (20%)
        geographic_score = self._calculate_geographic_score(user1, user2)
        
        # 4. Patrones de Comportamiento (10%)
        behavioral_score = self._calculate_behavioral_score(user1, user2)
        
        # Score final ponderado
        final_score = (
            collaborative_score * self.collaborative_weight +
            content_score * self.content_weight +
            geographic_score * self.geographic_weight +
            behavioral_score * self.behavioral_weight
        )
        
        return final_score, reasons
    
    def _calculate_collaborative_score(self, user1: UserProfile, user2: UserProfile) -> float:
        """Calcular score basado en interacciones pasadas"""
        try:
            # Obtener interacciones del usuario 1 con otros usuarios similares al 2
            interactions = self._get_user_interactions(user1.user_id)
            
            if not interactions:
                return 0.5  # Score neutral si no hay datos
            
            # Encontrar usuarios similares al usuario 2
            similar_users = self._find_similar_users(user2)
            
            # Calcular score basado en interacciones exitosas con usuarios similares
            successful_interactions = 0
            total_interactions = 0
            
            for interaction in interactions:
                if interaction.target_user_id in similar_users and interaction.success_outcome:
                    successful_interactions += 1
                if interaction.target_user_id in similar_users:
                    total_interactions += 1
            
            if total_interactions > 0:
                return successful_interactions / total_interactions
            else:
                return 0.5
                
        except Exception as e:
            logger.error(f"[MatchingEngine] Error en filtrado colaborativo: {e}")
            return 0.5
    
    def _calculate_content_score(
        self, 
        user1: UserProfile, 
        user2: UserProfile,
        reasons: List[str]
    ) -> float:
        """Calcular score basado en similitud de contenido"""
        scores = []
        
        # 1. Intereses comunes (30%)
        common_interests = set(user1.interests) & set(user2.interests)
        interest_score = len(common_interests) / max(len(user1.interests), len(user2.interests), 1)
        scores.append(interest_score * 0.3)
        
        if common_interests:
            reasons.append(f"Intereses comunes: {', '.join(list(common_interests)[:3])}")
        
        # 2. Compatibilidad de metas de relación (25%)
        goal_score = 1.0 if user1.relationship_goals == user2.relationship_goals else 0.3
        scores.append(goal_score * 0.25)
        
        if goal_score > 0.5:
            reasons.append("Metas de relación compatibles")
        
        # 3. Diferencia de edad aceptable (20%)
        age_diff = abs(user1.age - user2.age)
        if age_diff <= 5:
            age_score = 1.0
        elif age_diff <= 10:
            age_score = 0.7
        else:
            age_score = 0.3
        scores.append(age_score * 0.2)
        
        # 4. Nivel educativo similar (15%)
        education_levels = ['none', 'high_school', 'bachelor', 'master', 'phd']
        try:
            edu1_idx = education_levels.index(user1.education_level.lower())
            edu2_idx = education_levels.index(user2.education_level.lower())
            edu_diff = abs(edu1_idx - edu2_idx)
            education_score = max(0, 1.0 - (edu_diff * 0.2))
        except (ValueError, IndexError):
            education_score = 0.5
        scores.append(education_score * 0.15)
        
        # 5. Estilo de vida compatible (10%)
        lifestyle_score = 0
        lifestyle_factors = ['smoking', 'drinking', 'exercise', 'religion', 'politics']
        compatible_factors = 0
        
        for factor in lifestyle_factors:
            val1 = getattr(user1, factor, 'no_preference')
            val2 = getattr(user2, factor, 'no_preference')
            if val1 == 'no_preference' or val2 == 'no_preference' or val1 == val2:
                compatible_factors += 1
        
        lifestyle_score = compatible_factors / len(lifestyle_factors)
        scores.append(lifestyle_score * 0.1)
        
        return sum(scores)
    
    def _calculate_geographic_score(self, user1: UserProfile, user2: UserProfile) -> float:
        """Calcular score basado en proximidad geográfica"""
        distance = self._calculate_distance(user1.location, user2.location)
        
        # Score inverso a la distancia (más cercano = mejor score)
        if distance <= 5:  # Mismo ciudad
            return 1.0
        elif distance <= 25:  # Área metropolitana
            return 0.8
        elif distance <= 50:  # Región cercana
            return 0.6
        elif distance <= 100:  # Viaje razonable
            return 0.3
        else:  # Muy lejos
            return 0.1
    
    def _calculate_behavioral_score(self, user1: UserProfile, user2: UserProfile) -> float:
        """Calcular score basado en patrones de comportamiento"""
        scores = []
        
        # 1. Nivel de actividad (40%)
        activity_diff = abs(user1.activity_score - user2.activity_score)
        activity_score = max(0, 1.0 - activity_diff)
        scores.append(activity_score * 0.4)
        
        # 2. Reputación (30%)
        reputation_diff = abs(user1.reputation_score - user2.reputation_score)
        reputation_score = max(0, 1.0 - reputation_diff)
        scores.append(reputation_score * 0.3)
        
        # 3. Nivel de verificación (30%)
        verification_levels = {'none': 0, 'email': 1, 'phone': 2, 'identity': 3, 'premium': 4}
        ver1 = verification_levels.get(user1.verification_level, 0)
        ver2 = verification_levels.get(user2.verification_level, 0)
        verification_score = 1.0 if ver1 == ver2 else 0.7 if abs(ver1 - ver2) <= 1 else 0.4
        scores.append(verification_score * 0.3)
        
        return sum(scores)
    
    def _calculate_distance(self, loc1: Dict[str, float], loc2: Dict[str, float]) -> float:
        """Calcular distancia entre dos ubicaciones (fórmula Haversine)"""
        try:
            lat1, lng1 = loc1.get('lat', 0), loc1.get('lng', 0)
            lat2, lng2 = loc2.get('lat', 0), loc2.get('lng', 0)
            
            # Convertir a radianes
            lat1, lng1, lat2, lng2 = map(np.radians, [lat1, lng1, lat2, lng2])
            
            # Diferencias
            dlat = lat2 - lat1
            dlng = lng2 - lng1
            
            # Fórmula de Haversine
            a = np.sin(dlat/2)**2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlng/2)**2
            c = 2 * np.arcsin(np.sqrt(a))
            
            # Radio de la Tierra en km
            r = 6371
            
            return c * r
            
        except Exception as e:
            logger.error(f"[MatchingEngine] Error calculando distancia: {e}")
            return float('inf')
    
    def _get_user_interactions(self, user_id: str) -> List[InteractionData]:
        """Obtener historial de interacciones del usuario"""
        try:
            interactions = []
            
            # Obtener likes dados
            likes_query = self.db.collection('likes').where('fromUserId', '==', user_id)
            for doc in likes_query.stream():
                data = doc.to_dict()
                interactions.append(InteractionData(
                    user_id=user_id,
                    target_user_id=data.get('toUserId', ''),
                    interaction_type='like',
                    timestamp=data.get('timestamp', datetime.now()),
                    success_outcome=data.get('matched', False),
                    interaction_score=1.0 if data.get('matched', False) else 0.3
                ))
            
            # Obtener mensajes enviados
            messages_query = self.db.collection('messages').where('senderId', '==', user_id)
            for doc in messages_query.stream():
                data = doc.to_dict()
                interactions.append(InteractionData(
                    user_id=user_id,
                    target_user_id=data.get('receiverId', ''),
                    interaction_type='message',
                    timestamp=data.get('timestamp', datetime.now()),
                    success_outcome=data.get('ledToDate', False),
                    interaction_score=0.8 if data.get('ledToDate', False) else 0.5
                ))
            
            return interactions
            
        except Exception as e:
            logger.error(f"[MatchingEngine] Error obteniendo interacciones: {e}")
            return []
    
    def _find_similar_users(self, target_user: UserProfile) -> List[str]:
        """Encontrar usuarios similares al objetivo"""
        try:
            similar_users = []
            
            # Buscar usuarios con intereses similares
            for interest in target_user.interests:
                users_query = self.db.collection('users').where('interests', 'array_contains', interest)
                for doc in users_query.stream():
                    user_id = doc.id
                    if user_id != target_user.user_id:
                        similar_users.append(user_id)
            
            # Buscar usuarios con metas de relación similares
            goals_query = self.db.collection('users').where('relationshipGoals', '==', target_user.relationship_goals)
            for doc in goals_query.stream():
                user_id = doc.id
                if user_id != target_user.user_id:
                    similar_users.append(user_id)
            
            return list(set(similar_users))  # Eliminar duplicados
            
        except Exception as e:
            logger.error(f"[MatchingEngine] Error encontrando usuarios similares: {e}")
            return []
    
    def _predict_success_rate(self, user1: UserProfile, user2: UserProfile) -> float:
        """Predecir probabilidad de éxito de una potencial relación"""
        try:
            # Modelo simple basado en factores clave
            factors = []
            
            # Compatibilidad de intereses
            common_interests = len(set(user1.interests) & set(user2.interests))
            interest_factor = min(common_interests / 5, 1.0)  # Normalizar a 5 intereses
            factors.append(interest_factor)
            
            # Proximidad geográfica
            distance = self._calculate_distance(user1.location, user2.location)
            distance_factor = max(0, 1.0 - (distance / 100))  # Invertir distancia
            factors.append(distance_factor)
            
            # Nivel de verificación
            verification_factor = (user1.reputation_score + user2.reputation_score) / 2
            factors.append(verification_factor)
            
            # Actividad reciente
            activity_factor = (user1.activity_score + user2.activity_score) / 2
            factors.append(activity_factor)
            
            # Promedio ponderado
            return sum(factors) / len(factors)
            
        except Exception as e:
            logger.error(f"[MatchingEngine] Error prediciendo tasa de éxito: {e}")
            return 0.5
    
    def _assess_risk_factors(self, user: UserProfile) -> List[str]:
        """Evaluar factores de riesgo del usuario"""
        risks = []
        
        # Bajo nivel de verificación
        if user.verification_level in ['none', 'email']:
            risks.append("Bajo nivel de verificación")
        
        # Poca actividad
        if user.activity_score < 0.3:
            risks.append("Baja actividad reciente")
        
        # Mala reputación
        if user.reputation_score < 0.5:
            risks.append("Reputación baja")
        
        # Pocos datos del perfil
        if user.photos_count < 2 or user.bio_length < 50:
            risks.append("Perfil incompleto")
        
        return risks

# Instancia global del motor de recomendaciones
matching_engine = MatchingEngine()

def get_recommendations_for_user(user_id: str, limit: int = 10, filters: Optional[Dict] = None) -> List[Dict]:
    """
    Función de utilidad para obtener recomendaciones
    
    Args:
        user_id: ID del usuario
        limit: Número de recomendaciones
        filters: Filtros adicionales
        
    Returns:
        Lista de recomendaciones como diccionarios
    """
    recommendations = matching_engine.get_smart_recommendations(user_id, limit, filters)
    
    # Convertir a diccionarios para serialización JSON
    return [
        {
            "user_id": rec.user_id,
            "score": rec.score,
            "reasons": rec.reasons,
            "compatibility_percentage": rec.compatibility_percentage,
            "distance_km": rec.distance_km,
            "common_interests": rec.common_interests,
            "predicted_success_rate": rec.predicted_success_rate,
            "risk_factors": rec.risk_factors
        }
        for rec in recommendations
    ]
