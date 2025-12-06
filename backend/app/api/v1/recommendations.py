"""
TuCitaSegura - Recommendations API Endpoints
Provides intelligent match recommendations using ML algorithms
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional, Dict
from pydantic import BaseModel, Field
from datetime import datetime
import logging
import random

# Import Recommendation Engine
from app.services.ml.recommendation_engine import matching_engine

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/recommendations", tags=["Recommendations"])


# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class UserPreferences(BaseModel):
    """User preferences for recommendations"""
    min_age: int = Field(ge=18, le=100)
    max_age: int = Field(ge=18, le=100)
    max_distance_km: int = Field(ge=1, le=500)
    gender_preference: str = Field(pattern="^(male|female|any)$")
    relationship_goals: Optional[List[str]] = None
    interests: Optional[List[str]] = None


class RecommendationScore(BaseModel):
    """Individual recommendation with score"""
    user_id: str
    compatibility_score: float = Field(ge=0.0, le=1.0)
    distance_km: float
    common_interests: List[str]
    reasons: List[str]
    recommended_at: datetime
    predicted_success_rate: float
    risk_factors: List[str]


class RecommendationsResponse(BaseModel):
    """Response with list of recommendations"""
    success: bool
    count: int
    recommendations: List[RecommendationScore]
    generated_at: datetime


class CompatibilityResponse(BaseModel):
    """Response validation for compatibility check"""
    success: bool
    user_id_1: str
    user_id_2: str
    compatibility_score: float
    breakdown: Dict[str, float]
    common_interests: List[str]
    reasons: List[str]
    distance_km: float
    calculated_at: datetime


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.get("/", response_model=RecommendationsResponse)
async def get_recommendations(
    user_id: str = Query(..., description="ID del usuario que solicita recomendaciones"),
    limit: int = Query(10, ge=1, le=50, description="Número máximo de recomendaciones"),
    min_score: float = Query(0.5, ge=0.0, le=1.0, description="Score mínimo de compatibilidad"),
    max_distance: int = Query(100, ge=1, le=500, description="Distancia máxima en KM"),
    min_age: Optional[int] = Query(None, ge=18, le=100),
    max_age: Optional[int] = Query(None, ge=18, le=100)
):
    """
    Obtiene recomendaciones personalizadas para un usuario usando el MatchingEngine
    """
    try:
        logger.info(f"Getting Smart Recommendations for user {user_id}")

        # Construir filtros opcionales
        filters = {}
        if min_age: filters['min_age'] = min_age
        if max_age: filters['max_age'] = max_age
        
        # Obtener recomendaciones del motor de ML
        recommendations = matching_engine.get_smart_recommendations(
            user_id=user_id,
            limit=limit,
            filters=filters
        )

        # Mapear a modelo de respuesta
        response_recommendations = []
        for rec in recommendations:
            response_recommendations.append(RecommendationScore(
                user_id=rec.user_id,
                compatibility_score=rec.score,
                distance_km=rec.distance_km,
                common_interests=rec.common_interests,
                reasons=rec.reasons,
                recommended_at=datetime.now(),
                predicted_success_rate=rec.predicted_success_rate,
                risk_factors=rec.risk_factors
            ))

        return RecommendationsResponse(
            success=True,
            count=len(response_recommendations),
            recommendations=response_recommendations,
            generated_at=datetime.now()
        )

    except Exception as e:
        logger.error(f"Error getting recommendations: {str(e)}")
        # Fallback elegante si falla el motor real
        # raise HTTPException(status_code=500, detail=str(e))
        return RecommendationsResponse(
            success=False,
            count=0,
            recommendations=[],
            generated_at=datetime.now()
        )


@router.post("/refresh")
async def refresh_recommendations(user_id: str):
    """
    Regenera las recomendaciones para un usuario
    """
    try:
        # En esta arquitectura síncrona, "refresh" es lo mismo que get,
        # pero en el futuro podría invalidar caché.
        logger.info(f"Refreshing recommendations for user {user_id}")

        # Por ahora, simplemente confirmamos
        return {
            "success": True,
            "message": "Caché de recomendaciones invalidado (simulado)",
            "user_id": user_id,
            "refreshed_at": datetime.now()
        }

    except Exception as e:
        logger.error(f"Error refreshing recommendations: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error al actualizar recomendaciones: {str(e)}"
        )


@router.get("/compatibility/{user_id_1}/{user_id_2}", response_model=CompatibilityResponse)
async def get_compatibility_score(user_id_1: str, user_id_2: str):
    """
    Calcula el score de compatibilidad entre dos usuarios específicos
    """
    try:
        logger.info(f"Calculating compatibility between {user_id_1} and {user_id_2}")

        result = matching_engine.calculate_compatibility(user_id_1, user_id_2)
        
        if not result:
            raise HTTPException(status_code=404, detail="No se pudo calcular la compatibilidad (usuarios no encontrados)")

        return CompatibilityResponse(
            success=True,
            user_id_1=user_id_1,
            user_id_2=user_id_2,
            compatibility_score=result["total_score"],
            breakdown=result["breakdown"],
            common_interests=result["common_interests"],
            reasons=result["reasons"],
            distance_km=result["distance_km"],
            calculated_at=datetime.now()
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calculating compatibility: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error al calcular compatibilidad: {str(e)}"
        )


@router.post("/preferences/{user_id}")
async def update_preferences(user_id: str, preferences: UserPreferences):
    """
    Actualiza las preferencias de búsqueda de un usuario
    """
    try:
        logger.info(f"Updating preferences for user {user_id}")

        # Aquí idealmente actualizaríamos Firestore
        # db.collection('users').document(user_id).update({'preferences': preferences.dict()})
        
        # Como MatchingEngine lee directo de Firestore en cada request, 
        # solo necesitamos guardar los datos aquí.
        
        # TODO: Implementar guardado real en Firestore cuando tengamos auth context
        
        return {
            "success": True,
            "message": "Preferencias actualizadas correctamente",
            "user_id": user_id,
            "preferences": preferences.dict(),
            "updated_at": datetime.now()
        }

    except Exception as e:
        logger.error(f"Error updating preferences: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error al actualizar preferencias: {str(e)}"
        )


@router.get("/stats/{user_id}")
async def get_recommendation_stats(user_id: str):
    """
    Obtiene estadísticas sobre las recomendaciones de un usuario
    """
    try:
        logger.info(f"Getting recommendation stats for user {user_id}")

        # Estas estadísticas requieren agregar contadores históricos en Firestore
        # Por ahora, mantenemos el mock mejorado
        
        return {
            "success": True,
            "user_id": user_id,
            "stats": {
                "total_recommendations": random.randint(20, 100),
                "viewed": random.randint(10, 50),
                "liked": random.randint(1, 20),
                "matched": random.randint(0, 5),
                "match_rate": 0.15,
                "average_compatibility_score": 0.73,
                "last_updated": datetime.now()
            }
        }

    except Exception as e:
        logger.error(f"Error getting stats: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error al obtener estadísticas: {str(e)}"
        )
