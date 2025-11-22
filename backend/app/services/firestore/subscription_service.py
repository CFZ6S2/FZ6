"""
Servicio para gestionar suscripciones de usuarios en Firestore.
"""
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from firebase_admin import firestore, auth

logger = logging.getLogger(__name__)
db = firestore.client()

class SubscriptionService:
    """Servicio para operaciones de suscripciones de usuarios."""

    def __init__(self):
        self.collection_name = "users"
        self.subscriptions_collection = "subscriptions"

    async def create_subscription(
        self,
        user_id: str,
        payment_data: Dict[str, Any],
        plan_type: str = "premium",
        duration_months: int = 1
    ) -> Dict[str, Any]:
        """
        Crea o actualiza una suscripción de usuario después de un pago exitoso.

        Args:
            user_id: ID del usuario de Firebase
            payment_data: Datos del pago (order_id, capture_id, amount, etc.)
            plan_type: Tipo de plan (premium, basic, etc.)
            duration_months: Duración de la suscripción en meses

        Returns:
            Datos de la suscripción creada/actualizada
        """
        try:
            # Calcular fechas de inicio y fin
            start_date = datetime.now()
            end_date = start_date + timedelta(days=30 * duration_months)

            # Datos de la suscripción
            subscription_data = {
                "user_id": user_id,
                "status": "active",
                "plan_type": plan_type,
                "start_date": start_date,
                "end_date": end_date,
                "payment_provider": "paypal",
                "payment_id": payment_data.get("capture_id"),
                "order_id": payment_data.get("order_id"),
                "amount": payment_data.get("amount"),
                "currency": payment_data.get("currency", "EUR"),
                "auto_renew": False,  # Configurar según necesidad
                "created_at": start_date,
                "updated_at": start_date
            }

            # Guardar en la colección de suscripciones
            subscription_ref = db.collection(self.subscriptions_collection).document()
            await subscription_ref.set(subscription_data)

            # Actualizar el documento del usuario con el estado de suscripción
            user_ref = db.collection(self.collection_name).document(user_id)
            await user_ref.update({
                "subscription_status": "active",
                "subscription_id": subscription_ref.id,
                "subscription_plan": plan_type,
                "subscription_end_date": end_date,
                "updated_at": datetime.now()
            })

            logger.info(f"Suscripción creada para usuario {user_id}: plan={plan_type}, hasta={end_date}")

            return {
                "id": subscription_ref.id,
                **subscription_data
            }

        except Exception as e:
            logger.error(f"Error creando suscripción para usuario {user_id}: {e}")
            raise

    async def cancel_subscription(
        self,
        user_id: str,
        refund_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Cancela la suscripción de un usuario (por reembolso u otro motivo).

        Args:
            user_id: ID del usuario
            refund_data: Datos del reembolso si aplica

        Returns:
            Datos de la suscripción cancelada
        """
        try:
            # Actualizar el documento del usuario
            user_ref = db.collection(self.collection_name).document(user_id)
            user_doc = await user_ref.get()

            if not user_doc.exists:
                raise ValueError(f"Usuario {user_id} no encontrado")

            user_data = user_doc.to_dict()
            subscription_id = user_data.get("subscription_id")

            if subscription_id:
                # Actualizar el documento de suscripción
                subscription_ref = db.collection(self.subscriptions_collection).document(subscription_id)
                await subscription_ref.update({
                    "status": "cancelled",
                    "cancelled_at": datetime.now(),
                    "refund_data": refund_data or {},
                    "updated_at": datetime.now()
                })

            # Actualizar el usuario
            await user_ref.update({
                "subscription_status": "cancelled",
                "subscription_cancelled_at": datetime.now(),
                "updated_at": datetime.now()
            })

            logger.info(f"Suscripción cancelada para usuario {user_id}")

            return {
                "user_id": user_id,
                "subscription_id": subscription_id,
                "status": "cancelled"
            }

        except Exception as e:
            logger.error(f"Error cancelando suscripción para usuario {user_id}: {e}")
            raise

    async def update_custom_claims(self, user_id: str, has_active_subscription: bool) -> bool:
        """
        Actualiza los custom claims de Firebase Auth para reflejar el estado de suscripción.

        Args:
            user_id: ID del usuario
            has_active_subscription: Si el usuario tiene suscripción activa

        Returns:
            True si se actualizó correctamente
        """
        try:
            # Obtener claims actuales
            user = auth.get_user(user_id)
            current_claims = user.custom_claims or {}

            # Actualizar solo el claim de suscripción
            new_claims = {
                **current_claims,
                "hasActiveSubscription": has_active_subscription,
                "subscriptionUpdatedAt": datetime.now().isoformat()
            }

            # Establecer nuevos claims
            auth.set_custom_user_claims(user_id, new_claims)

            logger.info(f"Custom claims actualizados para usuario {user_id}: hasActiveSubscription={has_active_subscription}")

            return True

        except Exception as e:
            logger.error(f"Error actualizando custom claims para usuario {user_id}: {e}")
            raise

    async def get_user_subscription(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Obtiene la suscripción activa de un usuario.

        Args:
            user_id: ID del usuario

        Returns:
            Datos de la suscripción o None si no tiene
        """
        try:
            user_ref = db.collection(self.collection_name).document(user_id)
            user_doc = await user_ref.get()

            if not user_doc.exists:
                return None

            user_data = user_doc.to_dict()
            subscription_id = user_data.get("subscription_id")

            if not subscription_id:
                return None

            # Obtener el documento de suscripción
            subscription_ref = db.collection(self.subscriptions_collection).document(subscription_id)
            subscription_doc = await subscription_ref.get()

            if not subscription_doc.exists:
                return None

            subscription_data = subscription_doc.to_dict()

            # Verificar si la suscripción sigue activa
            if subscription_data.get("status") == "active":
                end_date = subscription_data.get("end_date")
                if end_date and end_date > datetime.now():
                    return {
                        "id": subscription_id,
                        **subscription_data
                    }

            return None

        except Exception as e:
            logger.error(f"Error obteniendo suscripción para usuario {user_id}: {e}")
            raise

    async def check_and_expire_subscriptions(self) -> int:
        """
        Verifica todas las suscripciones y marca como expiradas las que corresponda.
        Esta función debería ejecutarse periódicamente (cron job).

        Returns:
            Número de suscripciones expiradas
        """
        try:
            # Buscar suscripciones activas que hayan expirado
            now = datetime.now()
            subscriptions = db.collection(self.subscriptions_collection)\
                .where("status", "==", "active")\
                .where("end_date", "<", now)\
                .stream()

            expired_count = 0

            for subscription_doc in subscriptions:
                subscription_data = subscription_doc.to_dict()
                user_id = subscription_data.get("user_id")

                # Actualizar suscripción a expirada
                await subscription_doc.reference.update({
                    "status": "expired",
                    "updated_at": now
                })

                # Actualizar usuario
                user_ref = db.collection(self.collection_name).document(user_id)
                await user_ref.update({
                    "subscription_status": "expired",
                    "updated_at": now
                })

                # Actualizar custom claims
                await self.update_custom_claims(user_id, False)

                expired_count += 1
                logger.info(f"Suscripción expirada para usuario {user_id}")

            return expired_count

        except Exception as e:
            logger.error(f"Error verificando suscripciones expiradas: {e}")
            raise

# Instancia global del servicio
subscription_service = SubscriptionService()
