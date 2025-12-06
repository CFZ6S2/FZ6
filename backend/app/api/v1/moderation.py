"""
TuCitaSegura - Moderation API
Provides endpoints for content moderation (text, images, etc.)
"""

from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel
from typing import List, Optional
import logging
from datetime import datetime

from app.services.ml.message_moderator import message_moderator

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/moderation", tags=["Moderation"])

# Modelos
class MessageModerationRequest(BaseModel):
    text: str
    user_id: Optional[str] = None
    context: Optional[str] = None  # 'chat', 'bio', 'comment'

class MessageModerationResponse(BaseModel):
    is_safe: bool
    reasons: List[str]
    toxicity_score: float
    categories: List[str]
    processed_text: str
    moderated_at: datetime

@router.post("/message", response_model=MessageModerationResponse)
async def moderate_message_endpoint(request: MessageModerationRequest):
    """
    Modera un mensaje de texto para detectar contenido inapropiado
    """
    try:
        logger.info(f"Moderating message for user {request.user_id or 'anonymous'}")
        
        result = message_moderator.moderate_message(request.text)
        
        return MessageModerationResponse(
            is_safe=result.is_safe,
            reasons=result.reasons,
            toxicity_score=result.toxicity_score,
            categories=result.categories,
            processed_text=result.processed_text,
            moderated_at=datetime.now()
        )
        
    except Exception as e:
        logger.error(f"Error in moderation endpoint: {e}")
        raise HTTPException(status_code=500, detail="Error processing moderation request")
