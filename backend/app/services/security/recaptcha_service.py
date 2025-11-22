"""
Servicio para validación de reCAPTCHA.
"""
import os
import logging
from typing import Dict, Optional
import httpx
from app.core.config import get_settings

logger = logging.getLogger(__name__)

class RecaptchaService:
    """Servicio para validar tokens de reCAPTCHA."""
    
    def __init__(self):
        self.settings = get_settings()
        self.secret_key = os.getenv("RECAPTCHA_SECRET_KEY")
        self.verify_url = "https://www.google.com/recaptcha/api/siteverify"
    
    async def verify_recaptcha(self, token: str, remote_ip: Optional[str] = None) -> Dict:
        """
        Verifica un token de reCAPTCHA con Google.
        
        Args:
            token: Token de reCAPTCHA proporcionado por el frontend
            remote_ip: (Opcional) IP del usuario para verificación adicional
            
        Returns:
            Dict con el resultado de la verificación
        """
        if not self.secret_key or self.secret_key == "tu_recaptcha_secret_key_aqui":
            # Modo desarrollo - aceptar siempre
            logger.warning("reCAPTCHA no configurado, aceptando token en modo desarrollo")
            return {
                "success": True,
                "score": 0.9,
                "action": "submit",
                "hostname": "localhost"
            }
        
        data = {
            "secret": self.secret_key,
            "response": token
        }
        
        if remote_ip:
            data["remoteip"] = remote_ip
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(self.verify_url, data=data)
                response.raise_for_status()
                
                result = response.json()
                
                if not result.get("success"):
                    logger.warning(f"reCAPTCHA verification failed: {result.get('error-codes', [])}")
                
                return result
                
        except httpx.HTTPError as e:
            logger.error(f"Error verifying reCAPTCHA: {e}")
            return {"success": False, "error": "recaptcha_service_unavailable"}
        except Exception as e:
            logger.error(f"Unexpected error in reCAPTCHA verification: {e}")
            return {"success": False, "error": "internal_error"}
    
    async def is_human(self, token: str, remote_ip: Optional[str] = None, min_score: float = 0.5) -> bool:
        """
        Verifica si el token de reCAPTCHA indica que es un humano.
        
        Args:
            token: Token de reCAPTCHA
            remote_ip: (Opcional) IP del usuario
            min_score: Score mínimo para considerar humano (0.0-1.0)
            
        Returns:
            True si es considerado humano, False otherwise
        """
        result = await self.verify_recaptcha(token, remote_ip)
        
        if not result.get("success"):
            return False
        
        # Para reCAPTCHA v3, verificar el score
        score = result.get("score", 0.0)
        return score >= min_score

# Instancia global del servicio
recaptcha_service = RecaptchaService()