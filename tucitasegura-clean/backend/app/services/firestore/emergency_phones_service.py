"""
Servicio para gestionar teléfonos de emergencia en Firestore - SUBCOLECCIÓN PRIVADA
"""
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime
import firebase_admin
from firebase_admin import firestore

logger = logging.getLogger(__name__)

db = firestore.client()

class EmergencyPhoneService:
    """Servicio para operaciones CRUD de teléfonos de emergencia en Firestore"""
    
    def __init__(self):
        self.collection_name = "users"
    
    async def create_emergency_phone(self, user_id: str, phone_data: Dict[str, Any]) -> Dict[str, Any]:
        """Crea un nuevo teléfono de emergencia en la subcolección privada del usuario"""
        try:
            private_collection = db.collection(self.collection_name).document(user_id).collection("private_info")
            
            phone_data_with_meta = {
                **phone_data,
                "created_at": datetime.now(),
                "updated_at": datetime.now(),
                "is_verified": False
            }
            
            doc_ref = private_collection.document()
            await doc_ref.set(phone_data_with_meta)
            
            return {
                "id": doc_ref.id,
                "user_id": user_id,
                **phone_data_with_meta
            }
            
        except Exception as e:
            logger.error(f"Error creando teléfono de emergencia para usuario {user_id}: {e}")
            raise
    
    async def get_user_emergency_phones(self, user_id: str) -> List[Dict[str, Any]]:
        """Obtiene todos los teléfonos de emergencia de un usuario"""
        try:
            private_collection = db.collection(self.collection_name).document(user_id).collection("private_info")
            docs = private_collection.where("phone_number", ">", "").get()
            
            phones = []
            for doc in docs:
                phone_data = doc.to_dict()
                phones.append({
                    "id": doc.id,
                    "user_id": user_id,
                    **phone_data
                })
            
            return phones
            
        except Exception as e:
            logger.error(f"Error obteniendo teléfonos de emergencia para usuario {user_id}: {e}")
            raise
    
    async def get_emergency_phone(self, phone_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Obtiene un teléfono de emergencia específico"""
        try:
            doc_ref = db.collection(self.collection_name).document(user_id).collection("private_info").document(phone_id)
            doc = await doc_ref.get()
            
            if not doc.exists:
                return None
            
            phone_data = doc.to_dict()
            return {
                "id": phone_id,
                "user_id": user_id,
                **phone_data
            }
            
        except Exception as e:
            logger.error(f"Error obteniendo teléfono {phone_id} para usuario {user_id}: {e}")
            raise
    
    async def update_emergency_phone(self, phone_id: str, user_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """Actualiza un teléfono de emergencia"""
        try:
            doc_ref = db.collection(self.collection_name).document(user_id).collection("private_info").document(phone_id)
            update_data["updated_at"] = datetime.now()
            await doc_ref.update(update_data)
            
            doc = await doc_ref.get()
            phone_data = doc.to_dict()
            
            return {
                "id": phone_id,
                "user_id": user_id,
                **phone_data
            }
            
        except Exception as e:
            logger.error(f"Error actualizando teléfono {phone_id} para usuario {user_id}: {e}")
            raise
    
    async def delete_emergency_phone(self, phone_id: str, user_id: str) -> bool:
        """Elimina un teléfono de emergencia"""
        try:
            doc_ref = db.collection(self.collection_name).document(user_id).collection("private_info").document(phone_id)
            doc = await doc_ref.get()
            if not doc.exists:
                return False
            await doc_ref.delete()
            return True
            
        except Exception as e:
            logger.error(f"Error eliminando teléfono {phone_id} para usuario {user_id}: {e}")
            raise

emergency_phone_service = EmergencyPhoneService()