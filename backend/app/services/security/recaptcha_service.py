"""
Servicio para validación de reCAPTCHA.
SECURITY: HTTP timeouts para evitar bloqueos indefinidos.
PRODUCTION: Configuración diferenciada para development vs production.
"""
import os
import logging
from typing import Dict, Optional
import httpx
from app.core.config import get_settings

logger = logging.getLogger(__name__)

# HTTP timeout configuration (in seconds)
RECAPTCHA_TIMEOUT = 10.0  # 10 seconds for Google reCAPTCHA API

# Default score thresholds by environment
DEFAULT_MIN_SCORE_PRODUCTION = 0.5  # Stricter for production
DEFAULT_MIN_SCORE_DEVELOPMENT = 0.3  # More permissive for testing

class RecaptchaService:
    """
    Servicio para validar tokens de reCAPTCHA v3.

    Environment Variables:
        RECAPTCHA_SECRET_KEY: Secret key from Google reCAPTCHA admin
        RECAPTCHA_MIN_SCORE: Minimum score threshold (0.0-1.0)
        ENVIRONMENT: development, staging, or production

    Score Interpretation:
        1.0 - Definitely human
        0.5-0.9 - Likely human
        0.3-0.5 - Suspicious
        0.0-0.3 - Likely bot
    """

    def __init__(self):
        self.settings = get_settings()
        self.secret_key = os.getenv("RECAPTCHA_SECRET_KEY")
        self.verify_url = "https://www.google.com/recaptcha/api/siteverify"
        self.verify_url_enterprise = os.getenv("RECAPTCHA_VERIFY_URL")

        # Get environment
        self.environment = os.getenv("ENVIRONMENT", "development").lower()

        # Get minimum score from env or use default based on environment
        min_score_env = os.getenv("RECAPTCHA_MIN_SCORE")
        if min_score_env:
            try:
                self.default_min_score = float(min_score_env)
            except ValueError:
                logger.warning(f"Invalid RECAPTCHA_MIN_SCORE: {min_score_env}, using default")
                self.default_min_score = self._get_default_score()
        else:
            self.default_min_score = self._get_default_score()

        # Log configuration on startup
        if self.is_enabled():
            logger.info(
                f"reCAPTCHA enabled - Environment: {self.environment}, "
                f"Min Score: {self.default_min_score}"
            )
        else:
            logger.warning(
                "reCAPTCHA disabled (no secret key) - validation will be bypassed. "
                "Set RECAPTCHA_SECRET_KEY for production!"
            )

    def _get_default_score(self) -> float:
        """Get default minimum score based on environment."""
        if self.environment == "production":
            return DEFAULT_MIN_SCORE_PRODUCTION
        else:
            return DEFAULT_MIN_SCORE_DEVELOPMENT

    def is_enabled(self) -> bool:
        if self.verify_url_enterprise:
            return True
        return False
    
    async def verify_recaptcha(self, token: str, remote_ip: Optional[str] = None, action: str = "LOGIN") -> Dict:
        """
        Verifica un token de reCAPTCHA Enterprise.

        Args:
            token: Token de reCAPTCHA proporcionado por el frontend
            remote_ip: (Opcional) IP del usuario para verificación adicional (No usado en Enterprise normalmente por privacidad)
            action: Acción esperada (ej. 'LOGIN', 'SIGNUP')

        Returns:
            Dict con el resultado de la verificación
        """
        if not self.is_enabled():
            # Development mode - bypass validation
            logger.warning(
                f"reCAPTCHA bypassed (not configured) - Environment: {self.environment}. "
                "Configure RECAPTCHA_SECRET_KEY/PROJECT_ID for production!"
            )
            return {
                "success": True,
                "score": 0.9,
                "action": action,
                "hostname": "localhost",
                "_bypassed": True
            }
        try:
            async with httpx.AsyncClient(timeout=RECAPTCHA_TIMEOUT) as client:
                response = await client.post(self.verify_url_enterprise, json={"token": token, "action": "submit"})
                response.raise_for_status()
                result = response.json()
                if not result.get("success"):
                    logger.warning(f"reCAPTCHA verification failed: {result.get('reason')}")
                return result
        except httpx.TimeoutException as e:
            logger.error(f"Timeout verifying reCAPTCHA: {e}")
            return {"success": False, "error": "recaptcha_timeout"}
        except httpx.HTTPError as e:
            logger.error(f"Error verifying reCAPTCHA: {e}")
            return {"success": False, "error": "recaptcha_service_unavailable"}
        except Exception as e:
            logger.error(f"Error validating reCAPTCHA Enterprise: {e}")
            # Fail open or closed depending on policy. For now, fail closed but with specific error.
            return {"success": False, "error": str(e)}
    
    async def is_human(
        self,
        token: str,
        remote_ip: Optional[str] = None,
        min_score: Optional[float] = None
    ) -> bool:
        """
        Verifica si el token de reCAPTCHA indica que es un humano.

        Args:
            token: Token de reCAPTCHA
            remote_ip: (Opcional) IP del usuario
            min_score: Score mínimo para considerar humano (0.0-1.0)
                      Si no se especifica, usa el default del environment

        Returns:
            True si es considerado humano, False otherwise

        Example:
            >>> is_human_result = await recaptcha_service.is_human(token)
            >>> if is_human_result:
            ...     print("User is likely human")
        """
        # Use default score if not specified
        if min_score is None:
            min_score = self.default_min_score

        result = await self.verify_recaptcha(token, remote_ip)

        if not result.get("success"):
            logger.warning(
                f"reCAPTCHA verification failed: {result.get('error-codes', [])} "
                f"- Environment: {self.environment}"
            )
            return False

        # For reCAPTCHA v3, check the score
        score = result.get("score", 0.0)
        is_valid = score >= min_score

        if not is_valid:
            logger.info(
                f"reCAPTCHA score too low: {score} < {min_score} "
                f"(Environment: {self.environment})"
            )

        return is_valid

    async def annotate_assessment(self, assessment_name: str, annotation: str) -> bool:
        """
        Envía feedback a Google sobre si una evaluación fue correcta o no.
        
        Args:
            assessment_name: El nombre del recurso de evaluación (devuelto por verify_recaptcha)
                            format: projects/{project_id}/assessments/{assessment_id}
            annotation: 'LEGITIMATE' o 'FRAUDULENT'
            
        Returns:
            bool: True si se envió correctamente
        """
        if not assessment_name or not self.is_enabled():
            return False
            
        try:
            from google.cloud import recaptchaenterprise_v1
            
            client = recaptchaenterprise_v1.RecaptchaEnterpriseServiceClient()
            
            # Map simplified strings to Enums
            annotation_enum = recaptchaenterprise_v1.AnnotateAssessmentRequest.Annotation.ANNOTATION_UNSPECIFIED
            if annotation == "LEGITIMATE":
                annotation_enum = recaptchaenterprise_v1.AnnotateAssessmentRequest.Annotation.LEGITIMATE
            elif annotation == "FRAUDULENT":
                annotation_enum = recaptchaenterprise_v1.AnnotateAssessmentRequest.Annotation.FRAUDULENT
            
            request = recaptchaenterprise_v1.AnnotateAssessmentRequest()
            request.name = assessment_name
            request.annotation = annotation_enum
            
            client.annotate_assessment(request=request)
            logger.info(f"reCAPTCHA Annotation sent: {annotation} for {assessment_name}")
            return True
            
        except Exception as e:
            logger.error(f"Error annotating reCAPTCHA: {e}")
            return False

# Instancia global del servicio
recaptcha_service = RecaptchaService()
