"""
Servicio de integración con PayPal para TuCitaSegura.
Maneja la creación de órdenes de pago, verificación y webhooks.
SECURITY: HTTP timeouts y validación de expiración de tokens
"""
import os
import json
import logging
from typing import Dict, Optional, Any
from datetime import datetime, timedelta
import httpx
from app.core.config import get_settings

logger = logging.getLogger(__name__)

# HTTP timeout configuration (in seconds)
PAYPAL_TIMEOUT = 15.0  # 15 seconds for PayPal API calls

class PayPalService:
    """Servicio para interactuar con la API de PayPal."""

    def __init__(self):
        self.settings = get_settings()
        self.client_id = os.getenv("PAYPAL_CLIENT_ID")
        self.client_secret = os.getenv("PAYPAL_CLIENT_SECRET")
        self.mode = os.getenv("PAYPAL_MODE", "sandbox")
        self.base_url = self._get_base_url()
        self.access_token = None
        self.token_obtained_at = None
    
    def _get_base_url(self) -> str:
        """Obtiene la URL base de la API de PayPal según el modo."""
        if self.mode == "live":
            return "https://api.paypal.com"
        return "https://api.sandbox.paypal.com"
    
    def _is_token_expired(self) -> bool:
        """Verifica si el token de acceso ha expirado."""
        if not self.token_obtained_at or not self.access_token:
            return True

        # Renovar token 5 minutos antes de expiración (margen de seguridad)
        expiry_time = self.token_obtained_at + timedelta(hours=8) - timedelta(minutes=5)
        return datetime.now() >= expiry_time

    async def get_access_token(self) -> str:
        """Obtiene un token de acceso de la API de PayPal con verificación de expiración."""
        # Verificar si el token sigue siendo válido
        if self.access_token and not self._is_token_expired():
            return self.access_token

        auth = httpx.BasicAuth(self.client_id, self.client_secret)
        data = {"grant_type": "client_credentials"}

        try:
            async with httpx.AsyncClient(timeout=PAYPAL_TIMEOUT) as client:
                response = await client.post(
                    f"{self.base_url}/v1/oauth2/token",
                    auth=auth,
                    data=data,
                    headers={"Content-Type": "application/x-www-form-urlencoded"}
                )
                response.raise_for_status()

                token_data = response.json()
                self.access_token = token_data["access_token"]
                self.token_obtained_at = datetime.now()

                logger.info(f"PayPal access token obtained, expires in {token_data.get('expires_in', 28800)}s")

                return self.access_token

        except httpx.TimeoutException as e:
            logger.error(f"Timeout obteniendo token de PayPal: {e}")
            raise Exception("PayPal no responde (timeout)")
        except httpx.HTTPError as e:
            logger.error(f"Error obteniendo token de PayPal: {e}")
            raise Exception("No se pudo conectar con PayPal")
    
    async def create_order(
        self, 
        amount: float, 
        currency: str = "EUR",
        description: str = "Suscripción TuCitaSegura",
        custom_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Crea una orden de pago en PayPal.
        
        Args:
            amount: Monto del pago
            currency: Moneda (EUR por defecto)
            description: Descripción del pago
            custom_id: ID personalizado para tracking
            
        Returns:
            Dict con la información de la orden creada
        """
        access_token = await self.get_access_token()
        
        order_data = {
            "intent": "CAPTURE",
            "purchase_units": [{
                "amount": {
                    "currency_code": currency,
                    "value": f"{amount:.2f}"
                },
                "description": description
            }],
            "application_context": {
                "brand_name": "TuCitaSegura",
                "landing_page": "LOGIN",
                "user_action": "PAY_NOW",
                "return_url": f"{self.settings.frontend_url}/payment/success",
                "cancel_url": f"{self.settings.frontend_url}/payment/cancel"
            }
        }
        
        if custom_id:
            order_data["purchase_units"][0]["custom_id"] = custom_id
        
        try:
            async with httpx.AsyncClient(timeout=PAYPAL_TIMEOUT) as client:
                response = await client.post(
                    f"{self.base_url}/v2/checkout/orders",
                    json=order_data,
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {access_token}",
                        "Prefer": "return=representation"
                    }
                )
                response.raise_for_status()

                return response.json()

        except httpx.TimeoutException as e:
            logger.error(f"Timeout creando orden en PayPal: {e}")
            raise Exception("PayPal no responde (timeout)")
        except httpx.HTTPError as e:
            logger.error(f"Error creando orden en PayPal: {e}")
            raise Exception("No se pudo crear la orden de pago")
    
    async def capture_order(self, order_id: str) -> Dict[str, Any]:
        """
        Captura una orden de pago de PayPal.
        
        Args:
            order_id: ID de la orden a capturar
            
        Returns:
            Dict con el resultado de la captura
        """
        access_token = await self.get_access_token()
        
        try:
            async with httpx.AsyncClient(timeout=PAYPAL_TIMEOUT) as client:
                response = await client.post(
                    f"{self.base_url}/v2/checkout/orders/{order_id}/capture",
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {access_token}",
                        "Prefer": "return=representation"
                    }
                )
                response.raise_for_status()

                return response.json()

        except httpx.TimeoutException as e:
            logger.error(f"Timeout capturando orden en PayPal: {e}")
            raise Exception("PayPal no responde (timeout)")
        except httpx.HTTPError as e:
            logger.error(f"Error capturando orden en PayPal: {e}")
            raise Exception("No se pudo capturar el pago")
    
    async def verify_webhook_signature(
        self, 
        headers: Dict[str, str], 
        body: bytes
    ) -> bool:
        """
        Verifica la firma de un webhook de PayPal.
        
        Args:
            headers: Headers de la solicitud
            body: Cuerpo de la solicitud en bytes
            
        Returns:
            True si la firma es válida, False otherwise
        """
        access_token = await self.get_access_token()
        webhook_id = os.getenv("PAYPAL_WEBHOOK_ID")
        
        verification_data = {
            "auth_algo": headers.get("PAYPAL-AUTH-ALGO"),
            "cert_url": headers.get("PAYPAL-CERT-URL"),
            "transmission_id": headers.get("PAYPAL-TRANSMISSION-ID"),
            "transmission_sig": headers.get("PAYPAL-TRANSMISSION-SIG"),
            "transmission_time": headers.get("PAYPAL-TRANSMISSION-TIME"),
            "webhook_id": webhook_id,
            "webhook_event": json.loads(body.decode("utf-8"))
        }
        
        try:
            async with httpx.AsyncClient(timeout=PAYPAL_TIMEOUT) as client:
                response = await client.post(
                    f"{self.base_url}/v1/notifications/verify-webhook-signature",
                    json=verification_data,
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {access_token}"
                    }
                )
                response.raise_for_status()

                result = response.json()
                return result.get("verification_status") == "SUCCESS"

        except httpx.TimeoutException as e:
            logger.error(f"Timeout verificando webhook de PayPal: {e}")
            return False
        except Exception as e:
            logger.error(f"Error verificando webhook de PayPal: {e}")
            return False
    
    async def get_order_details(self, order_id: str) -> Dict[str, Any]:
        """Obtiene los detalles de una orden específica."""
        access_token = await self.get_access_token()
        
        try:
            async with httpx.AsyncClient(timeout=PAYPAL_TIMEOUT) as client:
                response = await client.get(
                    f"{self.base_url}/v2/checkout/orders/{order_id}",
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {access_token}"
                    }
                )
                response.raise_for_status()

                return response.json()

        except httpx.TimeoutException as e:
            logger.error(f"Timeout obteniendo detalles de orden: {e}")
            raise Exception("PayPal no responde (timeout)")
        except httpx.HTTPError as e:
            logger.error(f"Error obteniendo detalles de orden: {e}")
            raise Exception("No se pudieron obtener los detalles de la orden")

# Instancia global del servicio
paypal_service = PayPalService()