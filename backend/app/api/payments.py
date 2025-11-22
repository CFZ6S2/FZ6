"""
Endpoints de la API para manejar pagos con PayPal.
ACTUALIZADO: Ahora usa autenticación real de Firebase.
PROTECCIÓN: Rate limiting implementado en todos los endpoints.
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import JSONResponse
import logging
import os
from typing import Dict, Any, Optional
from datetime import datetime
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.services.payments.paypal_service import paypal_service
from app.services.firestore.subscription_service import subscription_service
from app.services.email.email_service import email_service
from app.models.schemas import AuthenticatedUser
from app.core.dependencies import get_current_user, get_current_verified_user
from firebase_admin import auth

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/payments", tags=["payments"])
limiter = Limiter(key_func=get_remote_address)

@router.post("/paypal/create-order")
@limiter.limit("10/minute")
async def create_paypal_order(
    request: Request,
    amount: float,
    user: AuthenticatedUser = Depends(get_current_verified_user),
    currency: str = "EUR",
    description: str = "Suscripción TuCitaSegura"
):
    """
    Crea una orden de pago en PayPal.

    AUTENTICACIÓN REQUERIDA:
    - Token de Firebase válido
    - Email verificado

    Args:
        amount: Monto del pago (ej: 9.99)
        currency: Moneda (EUR por defecto)
        description: Descripción del producto/servicio

    Returns:
        URL de aprobación de PayPal y ID de la orden
    """
    try:
        # Crear la orden en PayPal con el user_id autenticado
        order = await paypal_service.create_order(
            amount=amount,
            currency=currency,
            description=description,
            custom_id=user.uid  # Usar UID autenticado
        )

        logger.info(f"PayPal order created for user {user.uid}: amount={amount} {currency}")
        
        # Encontrar el link de aprobación
        approval_url = None
        for link in order.get("links", []):
            if link.get("rel") == "approve":
                approval_url = link.get("href")
                break
        
        if not approval_url:
            raise HTTPException(status_code=500, detail="No se pudo generar URL de pago")
        
        return JSONResponse({
            "success": True,
            "order_id": order["id"],
            "approval_url": approval_url,
            "status": order["status"]
        })
        
    except Exception as e:
        logger.error(f"Error creando orden de PayPal: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/paypal/capture-order/{order_id}")
@limiter.limit("10/minute")
async def capture_paypal_order(
    request: Request,
    order_id: str,
    user: AuthenticatedUser = Depends(get_current_verified_user)
):
    """
    Captura una orden de pago de PayPal después de que el usuario haya aprobado el pago.

    AUTENTICACIÓN REQUERIDA:
    - Token de Firebase válido
    - Email verificado

    Args:
        order_id: ID de la orden de PayPal a capturar

    Returns:
        Detalles del pago capturado
    """
    try:
        capture_result = await paypal_service.capture_order(order_id)

        # Extraer información importante del pago
        payment_status = capture_result["status"]
        purchase_units = capture_result.get("purchase_units", [])

        if purchase_units:
            capture = purchase_units[0].get("payments", {}).get("captures", [{}])[0]
            amount = capture.get("amount", {}).get("value")
            currency = capture.get("amount", {}).get("currency_code")
            capture_id = capture.get("id")
        else:
            amount = None
            currency = None
            capture_id = None

        logger.info(
            f"PayPal order captured by user {user.uid}: "
            f"order_id={order_id}, amount={amount} {currency}, status={payment_status}"
        )

        return JSONResponse({
            "success": True,
            "status": payment_status,
            "order_id": order_id,
            "capture_id": capture_id,
            "amount": amount,
            "currency": currency,
            "user_id": user.uid,  # Incluir para tracking
            "details": capture_result
        })
        
    except Exception as e:
        logger.error(f"Error capturando orden de PayPal {order_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/paypal/order/{order_id}")
@limiter.limit("20/minute")
async def get_paypal_order_details(
    request: Request,
    order_id: str,
    user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Obtiene los detalles de una orden específica de PayPal.

    AUTENTICACIÓN REQUERIDA:
    - Token de Firebase válido

    Args:
        order_id: ID de la orden de PayPal

    Returns:
        Detalles completos de la orden
    """
    try:
        order_details = await paypal_service.get_order_details(order_id)
        return JSONResponse({
            "success": True,
            "order": order_details
        })
        
    except Exception as e:
        logger.error(f"Error obteniendo detalles de orden {order_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/paypal/webhook")
async def handle_paypal_webhook(request: Request):
    """
    Endpoint para recibir webhooks de PayPal.
    
    Maneja eventos como:
    - PAYMENT.CAPTURE.COMPLETED (pago completado)
    - PAYMENT.CAPTURE.DENIED (pago rechazado)
    - PAYMENT.CAPTURE.REFUNDED (reembolso)
    """
    try:
        # Leer el cuerpo de la solicitud
        body = await request.body()
        headers = dict(request.headers)
        
        # Verificar la firma del webhook
        signature_valid = await paypal_service.verify_webhook_signature(headers, body)
        
        if not signature_valid:
            logger.warning("Webhook de PayPal con firma inválida")
            raise HTTPException(status_code=401, detail="Firma inválida")
        
        # Parsear el evento
        event = await request.json()
        event_type = event.get("event_type")
        
        logger.info(f"Webhook de PayPal recibido: {event_type}")
        
        # Procesar diferentes tipos de eventos
        if event_type == "PAYMENT.CAPTURE.COMPLETED":
            # Pago completado exitosamente
            resource = event.get("resource", {})
            capture_id = resource.get("id")
            order_id = resource.get("supplementary_data", {}).get("related_ids", {}).get("order_id")
            amount_data = resource.get("amount", {})
            amount = amount_data.get("value")
            currency = amount_data.get("currency_code", "EUR")
            custom_id = resource.get("custom_id")  # Este es el user_id que pasamos en create_order

            logger.info(f"Pago completado: {capture_id}, orden: {order_id}, monto: {amount} {currency}")

            if custom_id:
                try:
                    # 1. Obtener información del usuario
                    user = auth.get_user(custom_id)
                    user_email = user.email

                    # 2. Crear/actualizar suscripción en Firestore
                    payment_data = {
                        "capture_id": capture_id,
                        "order_id": order_id,
                        "amount": amount,
                        "currency": currency
                    }

                    subscription_data = await subscription_service.create_subscription(
                        user_id=custom_id,
                        payment_data=payment_data,
                        plan_type="premium",
                        duration_months=1
                    )

                    logger.info(f"Suscripción creada para usuario {custom_id}: {subscription_data['id']}")

                    # 3. Actualizar custom claims en Firebase Auth
                    await subscription_service.update_custom_claims(
                        user_id=custom_id,
                        has_active_subscription=True
                    )

                    logger.info(f"Custom claims actualizados para usuario {custom_id}")

                    # 4. Enviar email de confirmación
                    if user_email:
                        email_sent = await email_service.send_payment_confirmation(
                            user_email=user_email,
                            payment_data=payment_data,
                            subscription_data=subscription_data
                        )

                        if email_sent:
                            logger.info(f"Email de confirmación enviado a {user_email}")
                        else:
                            logger.warning(f"No se pudo enviar email de confirmación a {user_email}")

                    logger.info(f"Procesamiento completo de pago para usuario {custom_id}")

                except Exception as e:
                    logger.error(f"Error procesando pago para usuario {custom_id}: {e}")
                    # No lanzar excepción para no rechazar el webhook
                    # PayPal reintentará si falla
            else:
                logger.warning(f"Webhook recibido sin custom_id (user_id). Capture: {capture_id}")

        elif event_type == "PAYMENT.CAPTURE.DENIED":
            # Pago rechazado
            resource = event.get("resource", {})
            custom_id = resource.get("custom_id")
            logger.warning(f"Pago rechazado para usuario {custom_id}: {resource}")

            # Aquí podrías enviar un email al usuario notificando el rechazo

        elif event_type == "PAYMENT.CAPTURE.REFUNDED":
            # Reembolso procesado
            resource = event.get("resource", {})
            custom_id = resource.get("custom_id")
            refund_amount = resource.get("amount", {}).get("value")
            refund_id = resource.get("id")

            logger.info(f"Reembolso procesado para usuario {custom_id}: {refund_amount}")

            if custom_id:
                try:
                    # 1. Cancelar suscripción
                    refund_data = {
                        "refund_id": refund_id,
                        "amount": refund_amount,
                        "refunded_at": datetime.now()
                    }

                    await subscription_service.cancel_subscription(
                        user_id=custom_id,
                        refund_data=refund_data
                    )

                    # 2. Actualizar custom claims
                    await subscription_service.update_custom_claims(
                        user_id=custom_id,
                        has_active_subscription=False
                    )

                    # 3. Enviar email de notificación
                    user = auth.get_user(custom_id)
                    if user.email:
                        await email_service.send_subscription_cancelled(
                            user_email=user.email,
                            refund_data=refund_data
                        )

                    logger.info(f"Suscripción cancelada por reembolso para usuario {custom_id}")

                except Exception as e:
                    logger.error(f"Error procesando reembolso para usuario {custom_id}: {e}")
        
        return JSONResponse({"status": "processed"})
        
    except Exception as e:
        logger.error(f"Error procesando webhook de PayPal: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/config")
@limiter.limit("30/minute")
async def get_payment_config(request: Request):
    """
    Obtiene la configuración de pagos para el frontend.
    
    Returns:
        Información de configuración de métodos de pago disponibles
    """
    return JSONResponse({
        "paypal": {
            "enabled": True,
            "client_id": os.getenv("PAYPAL_CLIENT_ID"),  # Solo para frontend
            "environment": os.getenv("PAYPAL_MODE", "sandbox")
        },
        "stripe": {
            "enabled": bool(os.getenv("STRIPE_PUBLISHABLE_KEY")),
            "publishable_key": os.getenv("STRIPE_PUBLISHABLE_KEY")
        },
        "currency": "EUR",
        "currency_symbol": "€"
    })