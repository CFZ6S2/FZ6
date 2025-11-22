"""
Servicio para gestionar teléfonos de emergencia en Firestore con seguridad por subcolección privada.
SECURITY: Números de teléfono encriptados en reposo.
"""
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime
import firebase_admin
from firebase_admin import firestore
from app.services.security.encryption_service import encryption_service

logger = logging.getLogger(__name__)

db = firestore.client()

class EmergencyPhoneService:
    """Servicio para operaciones CRUD de teléfonos de emergencia en Firestore."""

    def __init__(self):
        self.collection_name = "users"
        self.encryption = encryption_service
    
    async def create_emergency_phone(self, user_id: str, phone_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Crea un nuevo teléfono de emergencia en la subcolección privada del usuario.
        El número de teléfono se encripta antes de guardarse.

        Args:
            user_id: ID del usuario
            phone_data: Datos del teléfono

        Returns:
            Teléfono creado con ID de Firestore (con número desencriptado)
        """
        try:
            # Referencia a la subcolección privada
            private_collection = db.collection(self.collection_name).document(user_id).collection("private_info")

            # Encriptar número de teléfono antes de guardar
            encrypted_data = phone_data.copy()
            if "phone_number" in encrypted_data and encrypted_data["phone_number"]:
                original_number = encrypted_data["phone_number"]
                encrypted_data["phone_number"] = self.encryption.encrypt(original_number)
                logger.debug(f"Phone number encrypted for user {user_id}")

            # Datos con timestamps
            phone_data_with_meta = {
                **encrypted_data,
                "created_at": datetime.now(),
                "updated_at": datetime.now(),
                "is_verified": False
            }

            # Crear documento
            doc_ref = private_collection.document()
            await doc_ref.set(phone_data_with_meta)

            # Retornar datos desencriptados para respuesta API
            result_data = phone_data_with_meta.copy()
            if "phone_number" in result_data:
                result_data["phone_number"] = self.encryption.decrypt(result_data["phone_number"])

            return {
                "id": doc_ref.id,
                "user_id": user_id,
                **result_data
            }

        except Exception as e:
            logger.error(f"Error creando teléfono de emergencia para usuario {user_id}: {e}")
            raise
    
    async def get_user_emergency_phones(self, user_id: str) -> List[Dict[str, Any]]:
        """
        Obtiene todos los teléfonos de emergencia de un usuario.
        Los números se desencriptan antes de devolverlos.

        Args:
            user_id: ID del usuario

        Returns:
            Lista de teléfonos de emergencia (con números desencriptados)
        """
        try:
            private_collection = db.collection(self.collection_name).document(user_id).collection("private_info")

            # Query para obtener solo documentos de teléfonos (puedes añadir filtros)
            docs = private_collection.where("phone_number", ">", "").get()

            phones = []
            for doc in docs:
                phone_data = doc.to_dict()

                # Desencriptar número de teléfono
                if "phone_number" in phone_data and phone_data["phone_number"]:
                    try:
                        phone_data["phone_number"] = self.encryption.decrypt(phone_data["phone_number"])
                    except ValueError:
                        # Si falla la desencriptación, podría ser un número sin encriptar (migración)
                        logger.warning(f"Could not decrypt phone for user {user_id}, phone_id {doc.id}")
                        phone_data["phone_number"] = "[ENCRYPTED]"

                phones.append({
                    "id": doc.id,
                    "user_id": user_id,
                    **phone_data
                })

            return phones

        except Exception as e:
            logger.error(f"Error obteniendo teléfonos de emergencia para usuario {user_id}: {e}")
            raise
    
    async def get_emergency_phone(self, user_id: str, phone_id: str) -> Optional[Dict[str, Any]]:
        """
        Obtiene un teléfono de emergencia específico.
        El número se desencripta antes de devolverlo.

        Args:
            user_id: ID del usuario
            phone_id: ID del teléfono

        Returns:
            Datos del teléfono (con número desencriptado) o None si no existe
        """
        try:
            doc_ref = db.collection(self.collection_name).document(user_id).collection("private_info").document(phone_id)
            doc = await doc_ref.get()

            if not doc.exists:
                return None

            phone_data = doc.to_dict()

            # Desencriptar número de teléfono
            if "phone_number" in phone_data and phone_data["phone_number"]:
                try:
                    phone_data["phone_number"] = self.encryption.decrypt(phone_data["phone_number"])
                except ValueError:
                    logger.warning(f"Could not decrypt phone {phone_id} for user {user_id}")
                    phone_data["phone_number"] = "[ENCRYPTED]"

            return {
                "id": phone_id,
                "user_id": user_id,
                **phone_data
            }

        except Exception as e:
            logger.error(f"Error obteniendo teléfono {phone_id} para usuario {user_id}: {e}")
            raise
    
    async def update_emergency_phone(self, user_id: str, phone_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Actualiza un teléfono de emergencia.
        Si se actualiza el número, se encripta antes de guardar.

        Args:
            user_id: ID del usuario
            phone_id: ID del teléfono
            update_data: Campos a actualizar

        Returns:
            Teléfono actualizado (con número desencriptado)
        """
        try:
            doc_ref = db.collection(self.collection_name).document(user_id).collection("private_info").document(phone_id)

            # Encriptar número si está en update_data
            encrypted_update = update_data.copy()
            if "phone_number" in encrypted_update and encrypted_update["phone_number"]:
                encrypted_update["phone_number"] = self.encryption.encrypt(encrypted_update["phone_number"])
                logger.debug(f"Phone number encrypted for update: user {user_id}, phone {phone_id}")

            # Añadir timestamp de actualización
            encrypted_update["updated_at"] = datetime.now()

            await doc_ref.update(encrypted_update)

            # Obtener el documento actualizado y desencriptar
            doc = await doc_ref.get()
            phone_data = doc.to_dict()

            # Desencriptar número de teléfono
            if "phone_number" in phone_data and phone_data["phone_number"]:
                try:
                    phone_data["phone_number"] = self.encryption.decrypt(phone_data["phone_number"])
                except ValueError:
                    logger.warning(f"Could not decrypt updated phone {phone_id} for user {user_id}")
                    phone_data["phone_number"] = "[ENCRYPTED]"

            return {
                "id": phone_id,
                "user_id": user_id,
                **phone_data
            }

        except Exception as e:
            logger.error(f"Error actualizando teléfono {phone_id} para usuario {user_id}: {e}")
            raise
    
    async def delete_emergency_phone(self, user_id: str, phone_id: str) -> bool:
        """
        Elimina un teléfono de emergencia.
        
        Args:
            user_id: ID del usuario
            phone_id: ID del teléfono
            
        Returns:
            True si se eliminó correctamente
        """
        try:
            doc_ref = db.collection(self.collection_name).document(user_id).collection("private_info").document(phone_id)
            await doc_ref.delete()
            return True
            
        except Exception as e:
            logger.error(f"Error eliminando teléfono {phone_id} para usuario {user_id}: {e}")
            raise
    
    async def verify_emergency_phone(self, user_id: str, phone_id: str) -> Dict[str, Any]:
        """
        Marca un teléfono de emergencia como verificado por administrador.
        
        Args:
            user_id: ID del usuario
            phone_id: ID del teléfono
            
        Returns:
            Teléfono verificado
        """
        try:
            doc_ref = db.collection(self.collection_name).document(user_id).collection("private_info").document(phone_id)
            
            update_data = {
                "is_verified": True,
                "verified_at": datetime.now(),
                "updated_at": datetime.now()
            }
            
            await doc_ref.update(update_data)
            
            # Obtener el documento actualizado
            doc = await doc_ref.get()
            phone_data = doc.to_dict()
            
            return {
                "id": phone_id,
                "user_id": user_id,
                **phone_data
            }
            
        except Exception as e:
            logger.error(f"Error verificando teléfono {phone_id} para usuario {user_id}: {e}")
            raise

# Instancia global del servicio
emergency_phone_service = EmergencyPhoneService()