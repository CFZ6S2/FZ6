"""
TuCitaSegura - Recommendations API Endpoints
Provides intelligent match recommendations using ML algorithms
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime
import logging

# Note: Uncomment when services are fully integrated
# from app.services.ml.recommendation_engine import RecommendationEngine

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


class RecommendationsResponse(BaseModel):
    """Response with list of recommendations"""
    success: bool
    count: int
    recommendations: List[RecommendationScore]
    generated_at: datetime


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.get("/", response_model=RecommendationsResponse)
async def get_recommendations(
    user_id: str = Query(..., description="ID del usuario que solicita recomendaciones"),
    limit: int = Query(10, ge=1, le=50, description="Número máximo de recomendaciones"),
    min_score: float = Query(0.5, ge=0.0, le=1.0, description="Score mínimo de compatibilidad")
):
    """
    Obtiene recomendaciones personalizadas para un usuario

    - **user_id**: ID del usuario en Firebase
    - **limit**: Número de recomendaciones a retornar (1-50)
    - **min_score**: Puntuación mínima de compatibilidad (0.0-1.0)

    Returns:
        Lista de usuarios recomendados con scores de compatibilidad
    """
    try:
        # TODO: Integrate with actual RecommendationEngine
        # engine = RecommendationEngine()
        # recommendations = await engine.get_recommendations(user_id, limit, min_score)

        # Temporary mock response
        logger.info(f"Getting recommendations for user {user_id}")

        mock_recommendations = [
            RecommendationScore(
                user_id="mock_user_1",
                compatibility_score=0.85,
                distance_km=5.2,
                common_interests=["travel", "music", "fitness"],
                reasons=[
                    "Alto nivel de compatibilidad (85%)",
                    "Viven cerca (5.2 km)",
                    "3 intereses en común"
                ],
                recommended_at=datetime.now()
            )
        ]

        return RecommendationsResponse(
            success=True,
            count=len(mock_recommendations),
            recommendations=mock_recommendations,
            generated_at=datetime.now()
        )

    except Exception as e:
        logger.error(f"Error getting recommendations: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error al obtener recomendaciones: {str(e)}"
        )


@router.post("/refresh")
async def refresh_recommendations(user_id: str):
    """
    Regenera las recomendaciones para un usuario

    Útil cuando el usuario actualiza su perfil o preferencias
    """
    try:
        # TODO: Implement refresh logic
        logger.info(f"Refreshing recommendations for user {user_id}")

        return {
            "success": True,
            "message": "Recomendaciones actualizadas",
            "user_id": user_id,
            "refreshed_at": datetime.now()
        }

    except Exception as e:
        logger.error(f"Error refreshing recommendations: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error al actualizar recomendaciones: {str(e)}"
        )


@router.get("/compatibility/{user_id_1}/{user_id_2}")
async def get_compatibility_score(user_id_1: str, user_id_2: str):
    """
    Calcula el score de compatibilidad entre dos usuarios específicos

    - **user_id_1**: ID del primer usuario
    - **user_id_2**: ID del segundo usuario

    Returns:
        Score de compatibilidad detallado entre ambos usuarios
    """
    try:
        # TODO: Integrate with RecommendationEngine
        logger.info(f"Calculating compatibility between {user_id_1} and {user_id_2}")

        # Mock response
        return {
            "success": True,
            "user_id_1": user_id_1,
            "user_id_2": user_id_2,
            "compatibility_score": 0.78,
            "breakdown": {
                "interests": 0.85,
                "location": 0.92,
                "age_compatibility": 0.70,
                "lifestyle": 0.65
            },
            "common_interests": ["travel", "music"],
            "distance_km": 3.5,
            "calculated_at": datetime.now()
        }

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

    - **user_id**: ID del usuario
    - **preferences**: Nuevas preferencias de búsqueda
    """
    try:
        logger.info(f"Updating preferences for user {user_id}")

        # TODO: Save to Firestore

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

    - Total de recomendaciones generadas
    - Tasa de match
    - Score promedio de compatibilidad
    """
    try:
        logger.info(f"Getting recommendation stats for user {user_id}")

        # Mock response
        return {
            "success": True,
            "user_id": user_id,
            "stats": {
                "total_recommendations": 45,
                "viewed": 32,
                "liked": 12,
                "matched": 5,
                "match_rate": 0.41,  # 41% match rate on liked profiles
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
