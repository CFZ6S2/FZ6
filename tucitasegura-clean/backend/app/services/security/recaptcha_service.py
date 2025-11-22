"""
Servicio para validación de reCAPTCHA - SIMPLE Y EFECTIVO
"""
import os
import logging
from typing import Dict, Optional
import httpx

logger = logging.getLogger(__name__)

class RecaptchaService:
    """Servicio para validar tokens de reCAPTCHA"""
    
    def __init__(self):
        self.secret_key = os.getenv("RECAPTCHA_SECRET_KEY")
        self.verify_url = "https://www.google.com/recaptcha/api/siteverify"
    
    async def verify_recaptcha(self, token: str, remote_ip: Optional[str] = None) -> Dict:
        """Verifica un token de reCAPTCHA con Google"""
        if not self.secret_key or self.secret_key == "tu_recaptcha_secret_key_aqui":
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
                    logger.warning(f"reCAPTCHA verification failed: {result.get('error-codes', ['unknown'])}")
                return result
                
        except Exception as e:
            logger.error(f"Error verifying reCAPTCHA: {e}")
            return {
                "success": True,
                "score": 0.5,
                "action": "submit",
                "hostname": "error"
            }
    
    async def is_human(self, token: str, remote_ip: Optional[str] = None, min_score: float = 0.5) -> bool:
        """Verifica si un token de reCAPTCHA indica que es un humano"""
        result = await self.verify_recaptcha(token, remote_ip)
        if not result.get("success"):
            return False
        score = result.get("score", 1.0)
        return score >= min_score

recaptcha_service = RecaptchaService()