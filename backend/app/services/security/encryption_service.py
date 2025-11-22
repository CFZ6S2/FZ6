"""
Servicio de encriptación para datos sensibles.
Usa Fernet (AES-128) para encriptación simétrica.
"""
import os
import logging
from typing import Optional
from cryptography.fernet import Fernet, InvalidToken
from base64 import b64encode, b64decode

logger = logging.getLogger(__name__)

class EncryptionService:
    """Servicio para encriptar/desencriptar datos sensibles."""

    def __init__(self):
        """
        Inicializa el servicio de encriptación.

        La clave de encriptación debe estar en ENCRYPTION_KEY env var.
        Si no existe, se genera una nueva (solo para desarrollo).
        """
        encryption_key = os.getenv("ENCRYPTION_KEY")

        if not encryption_key:
            # Modo desarrollo: generar clave temporal
            logger.warning(
                "ENCRYPTION_KEY no configurada. Generando clave temporal. "
                "⚠️ ESTO DEBE CONFIGURARSE EN PRODUCCIÓN"
            )
            self.cipher = Fernet(Fernet.generate_key())
            self._is_temp_key = True
        else:
            try:
                # Verificar que la clave es válida
                key_bytes = encryption_key.encode('utf-8')
                self.cipher = Fernet(key_bytes)
                self._is_temp_key = False
                logger.info("Encryption service initialized with production key")
            except Exception as e:
                logger.error(f"Error initializing encryption key: {e}")
                raise ValueError(
                    "ENCRYPTION_KEY inválida. Genera una con: "
                    "python -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())'"
                )

    def encrypt(self, data: str) -> str:
        """
        Encripta datos en texto plano.

        Args:
            data: Texto a encriptar

        Returns:
            Texto encriptado (base64)

        Example:
            >>> service = EncryptionService()
            >>> encrypted = service.encrypt("+34123456789")
            >>> encrypted
            'gAAAAABl...'
        """
        if not data:
            return ""

        try:
            # Encriptar y retornar como string base64
            encrypted_bytes = self.cipher.encrypt(data.encode('utf-8'))
            return encrypted_bytes.decode('utf-8')
        except Exception as e:
            logger.error(f"Error encrypting data: {e}")
            raise ValueError("Failed to encrypt data")

    def decrypt(self, encrypted_data: str) -> str:
        """
        Desencripta datos encriptados.

        Args:
            encrypted_data: Texto encriptado (base64)

        Returns:
            Texto desencriptado

        Raises:
            ValueError: Si los datos están corruptos o la clave es incorrecta

        Example:
            >>> service = EncryptionService()
            >>> decrypted = service.decrypt('gAAAAABl...')
            >>> decrypted
            '+34123456789'
        """
        if not encrypted_data:
            return ""

        try:
            # Desencriptar desde base64
            decrypted_bytes = self.cipher.decrypt(encrypted_data.encode('utf-8'))
            return decrypted_bytes.decode('utf-8')
        except InvalidToken:
            logger.error("Invalid encryption token - data may be corrupted or key is wrong")
            raise ValueError("Cannot decrypt data - invalid encryption key")
        except Exception as e:
            logger.error(f"Error decrypting data: {e}")
            raise ValueError("Failed to decrypt data")

    def encrypt_dict_fields(self, data: dict, fields_to_encrypt: list) -> dict:
        """
        Encripta campos específicos de un diccionario.

        Args:
            data: Diccionario con datos
            fields_to_encrypt: Lista de campos a encriptar

        Returns:
            Nuevo diccionario con campos encriptados

        Example:
            >>> data = {"name": "John", "phone": "+34123456789"}
            >>> encrypted = service.encrypt_dict_fields(data, ["phone"])
            >>> encrypted
            {"name": "John", "phone": "gAAAAABl...", "_encrypted_fields": ["phone"]}
        """
        result = data.copy()
        encrypted_fields = []

        for field in fields_to_encrypt:
            if field in result and result[field]:
                try:
                    result[field] = self.encrypt(str(result[field]))
                    encrypted_fields.append(field)
                except Exception as e:
                    logger.error(f"Error encrypting field {field}: {e}")

        # Marcar qué campos están encriptados
        if encrypted_fields:
            result["_encrypted_fields"] = encrypted_fields

        return result

    def decrypt_dict_fields(self, data: dict, fields_to_decrypt: Optional[list] = None) -> dict:
        """
        Desencripta campos específicos de un diccionario.

        Args:
            data: Diccionario con datos encriptados
            fields_to_decrypt: Lista de campos a desencriptar (o usa _encrypted_fields)

        Returns:
            Nuevo diccionario con campos desencriptados

        Example:
            >>> encrypted_data = {"name": "John", "phone": "gAAAAABl...", "_encrypted_fields": ["phone"]}
            >>> decrypted = service.decrypt_dict_fields(encrypted_data)
            >>> decrypted
            {"name": "John", "phone": "+34123456789"}
        """
        result = data.copy()

        # Usar campos marcados como encriptados si no se especifican
        if fields_to_decrypt is None:
            fields_to_decrypt = result.get("_encrypted_fields", [])

        for field in fields_to_decrypt:
            if field in result and result[field]:
                try:
                    result[field] = self.decrypt(str(result[field]))
                except Exception as e:
                    logger.error(f"Error decrypting field {field}: {e}")
                    # Mantener el valor encriptado si falla la desencriptación
                    result[field] = "[ENCRYPTED]"

        # Remover metadatos de encriptación
        result.pop("_encrypted_fields", None)

        return result

    @staticmethod
    def generate_key() -> str:
        """
        Genera una nueva clave de encriptación.

        Returns:
            Clave de encriptación en formato base64 (string)

        Example:
            >>> key = EncryptionService.generate_key()
            >>> print(f"ENCRYPTION_KEY={key}")
            ENCRYPTION_KEY=abcdef123456...
        """
        return Fernet.generate_key().decode('utf-8')

    def is_using_temp_key(self) -> bool:
        """Retorna True si se está usando una clave temporal (desarrollo)."""
        return self._is_temp_key


# Instancia global del servicio
encryption_service = EncryptionService()


# Función helper para CLI
if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "generate-key":
        key = EncryptionService.generate_key()
        print("=" * 80)
        print("Nueva clave de encriptación generada:")
        print("=" * 80)
        print(f"ENCRYPTION_KEY={key}")
        print("=" * 80)
        print("Agrega esta línea a tu archivo .env")
        print("⚠️  NUNCA compartas esta clave ni la subas a GitHub")
        print("=" * 80)
    else:
        print("Usage: python encryption_service.py generate-key")
