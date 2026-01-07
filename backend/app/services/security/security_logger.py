import logging
from typing import Optional, Dict, Any
from datetime import datetime
from enum import Enum
try:
    import firebase_admin  # type: ignore
    from firebase_admin import firestore  # type: ignore
    db = firestore.client()  # type: ignore
except Exception:
    firebase_admin = None  # type: ignore
    firestore = None  # type: ignore
    db = None  # type: ignore

logger = logging.getLogger(__name__)


class SecurityEventType(str, Enum):
    """Tipos de eventos de seguridad."""
    # Authentication
    LOGIN_SUCCESS = "login_success"
    LOGIN_FAILED = "login_failed"
    LOGOUT = "logout"
    PASSWORD_RESET_REQUEST = "password_reset_request"
    PASSWORD_RESET_SUCCESS = "password_reset_success"

    # Authorization
    UNAUTHORIZED_ACCESS = "unauthorized_access"
    PRIVILEGE_ESCALATION_ATTEMPT = "privilege_escalation_attempt"
    ADMIN_ACTION = "admin_action"

    # Data Access
    SENSITIVE_DATA_ACCESS = "sensitive_data_access"
    SENSITIVE_DATA_MODIFIED = "sensitive_data_modified"
    SENSITIVE_DATA_DELETED = "sensitive_data_deleted"

    # Security
    ENCRYPTION_ERROR = "encryption_error"
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded"
    SUSPICIOUS_ACTIVITY = "suspicious_activity"
    XSS_ATTEMPT_BLOCKED = "xss_attempt_blocked"
    SQL_INJECTION_BLOCKED = "sql_injection_blocked"

    # Account
    ACCOUNT_CREATED = "account_created"
    ACCOUNT_DELETED = "account_deleted"
    ACCOUNT_LOCKED = "account_locked"
    ACCOUNT_UNLOCKED = "account_unlocked"


class SecuritySeverity(str, Enum):
    """Niveles de severidad de eventos de seguridad."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class SecurityLogger:
    def __init__(self):
        self.collection_name = "security_logs"

    async def log_event(
        self,
        event_type: SecurityEventType,
        severity: SecuritySeverity,
        user_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        success: bool = True
    ) -> str:
        """
        Registra un evento de seguridad en Firestore.

        Args:
            event_type: Tipo de evento de seguridad
            severity: Nivel de severidad del evento
            user_id: ID del usuario relacionado (opcional)
            ip_address: Dirección IP del cliente
            user_agent: User agent del cliente
            details: Detalles adicionales del evento
            success: Si la acción fue exitosa o no

        Returns:
            ID del documento creado en Firestore

        Example:
            >>> await security_logger.log_event(
            ...     event_type=SecurityEventType.LOGIN_SUCCESS,
            ...     severity=SecuritySeverity.LOW,
            ...     user_id="user123",
            ...     ip_address="192.168.1.1",
            ...     details={"method": "email_password"}
            ... )
        """
        try:
            # Preparar datos del evento
            event_data = {
                "event_type": event_type.value,
                "severity": severity.value,
                "timestamp": datetime.now(),
                "success": success,
                "user_id": user_id,
                "ip_address": ip_address,
                "user_agent": user_agent,
                "details": details or {}
            }

            # Guardar en Firestore
            doc_ref = db.collection(self.collection_name).document()
            await doc_ref.set(event_data)

            # Log en consola para eventos críticos
            if severity in [SecuritySeverity.HIGH, SecuritySeverity.CRITICAL]:
                logger.warning(
                    f"SECURITY EVENT [{severity.value.upper()}]: {event_type.value} "
                    f"- User: {user_id or 'anonymous'} - IP: {ip_address or 'unknown'}"
                )

            return doc_ref.id

        except Exception as e:
            logger.error(f"Error logging security event {event_type.value}: {e}")
            # No lanzar excepción para no interrumpir el flujo principal
            return ""

    async def log_login_attempt(
        self,
        user_id: Optional[str],
        email: str,
        success: bool,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        failure_reason: Optional[str] = None
    ) -> str:
        """
        Registra un intento de login (exitoso o fallido).

        Args:
            user_id: ID del usuario (None si falló antes de identificar)
            email: Email usado en el intento
            success: Si el login fue exitoso
            ip_address: IP del cliente
            user_agent: User agent del cliente
            failure_reason: Razón del fallo (si aplica)

        Returns:
            ID del log creado
        """
        event_type = SecurityEventType.LOGIN_SUCCESS if success else SecurityEventType.LOGIN_FAILED
        severity = SecuritySeverity.LOW if success else SecuritySeverity.MEDIUM

        details = {
            "email": email,
            "method": "email_password"
        }

        if not success and failure_reason:
            details["failure_reason"] = failure_reason

        return await self.log_event(
            event_type=event_type,
            severity=severity,
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            details=details,
            success=success
        )

    async def log_unauthorized_access(
        self,
        user_id: Optional[str],
        resource: str,
        action: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> str:
        """
        Registra un intento de acceso no autorizado.

        Args:
            user_id: ID del usuario que intentó el acceso
            resource: Recurso al que intentó acceder
            action: Acción que intentó realizar
            ip_address: IP del cliente
            user_agent: User agent del cliente

        Returns:
            ID del log creado
        """
        return await self.log_event(
            event_type=SecurityEventType.UNAUTHORIZED_ACCESS,
            severity=SecuritySeverity.HIGH,
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            details={
                "resource": resource,
                "action": action
            },
            success=False
        )

    async def log_admin_action(
        self,
        admin_user_id: str,
        action: str,
        target_user_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Registra una acción administrativa.

        Args:
            admin_user_id: ID del administrador
            action: Acción realizada
            target_user_id: ID del usuario afectado (si aplica)
            ip_address: IP del cliente
            user_agent: User agent del cliente
            details: Detalles adicionales

        Returns:
            ID del log creado
        """
        event_details = {
            "action": action,
            "target_user_id": target_user_id
        }

        if details:
            event_details.update(details)

        return await self.log_event(
            event_type=SecurityEventType.ADMIN_ACTION,
            severity=SecuritySeverity.HIGH,
            user_id=admin_user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            details=event_details,
            success=True
        )

    async def log_sensitive_data_access(
        self,
        user_id: str,
        data_type: str,
        resource_id: str,
        action: str = "read",
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> str:
        """
        Registra acceso a datos sensibles.

        Args:
            user_id: ID del usuario que accedió
            data_type: Tipo de dato sensible (ej: "emergency_phone", "payment_info")
            resource_id: ID del recurso accedido
            action: Acción realizada (read, update, delete)
            ip_address: IP del cliente
            user_agent: User agent del cliente

        Returns:
            ID del log creado
        """
        event_type_map = {
            "read": SecurityEventType.SENSITIVE_DATA_ACCESS,
            "update": SecurityEventType.SENSITIVE_DATA_MODIFIED,
            "delete": SecurityEventType.SENSITIVE_DATA_DELETED
        }

        event_type = event_type_map.get(action, SecurityEventType.SENSITIVE_DATA_ACCESS)
        severity = SecuritySeverity.MEDIUM if action == "read" else SecuritySeverity.HIGH

        return await self.log_event(
            event_type=event_type,
            severity=severity,
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            details={
                "data_type": data_type,
                "resource_id": resource_id,
                "action": action
            },
            success=True
        )

    async def log_rate_limit_exceeded(
        self,
        user_id: Optional[str],
        endpoint: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> str:
        """
        Registra cuando se excede el límite de rate limiting.

        Args:
            user_id: ID del usuario (si está autenticado)
            endpoint: Endpoint que excedió el límite
            ip_address: IP del cliente
            user_agent: User agent del cliente

        Returns:
            ID del log creado
        """
        return await self.log_event(
            event_type=SecurityEventType.RATE_LIMIT_EXCEEDED,
            severity=SecuritySeverity.MEDIUM,
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            details={
                "endpoint": endpoint
            },
            success=False
        )

    async def log_xss_attempt(
        self,
        user_id: Optional[str],
        field: str,
        malicious_input: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> str:
        """
        Registra un intento de XSS bloqueado.

        Args:
            user_id: ID del usuario
            field: Campo donde se detectó el intento
            malicious_input: Input malicioso (truncado)
            ip_address: IP del cliente
            user_agent: User agent del cliente

        Returns:
            ID del log creado
        """
        # Truncar input malicioso para no llenar la BD
        truncated_input = malicious_input[:200] + "..." if len(malicious_input) > 200 else malicious_input

        return await self.log_event(
            event_type=SecurityEventType.XSS_ATTEMPT_BLOCKED,
            severity=SecuritySeverity.CRITICAL,
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            details={
                "field": field,
                "malicious_input": truncated_input
            },
            success=False
        )

    async def log_account_created(
        self,
        user_id: str,
        email: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> str:
        """
        Registra la creación de una cuenta nueva.

        Args:
            user_id: ID del usuario creado
            email: Email del usuario
            ip_address: IP del cliente
            user_agent: User agent del cliente

        Returns:
            ID del log creado
        """
        return await self.log_event(
            event_type=SecurityEventType.ACCOUNT_CREATED,
            severity=SecuritySeverity.LOW,
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            details={
                "email": email
            },
            success=True
        )

    async def log_account_deleted(
        self,
        user_id: str,
        deleted_by: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> str:
        """
        Registra la eliminación de una cuenta.

        Args:
            user_id: ID del usuario eliminado
            deleted_by: ID del usuario que realizó la eliminación
            ip_address: IP del cliente
            user_agent: User agent del cliente

        Returns:
            ID del log creado
        """
        return await self.log_event(
            event_type=SecurityEventType.ACCOUNT_DELETED,
            severity=SecuritySeverity.HIGH,
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            details={
                "deleted_by": deleted_by
            },
            success=True
        )


# Instancia global del servicio
security_logger = SecurityLogger()


class AuditLogger:
    def __init__(self):
        self.collection_name = "audit_logs"

    async def log_action(
        self,
        action: str,
        user_id: Optional[str] = None,
        resource_id: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        success: bool = True
    ) -> str:
        try:
            event_data = {
                "action": action,
                "timestamp": datetime.now(),
                "success": success,
                "user_id": user_id,
                "resource_id": resource_id,
                "context": context or {}
            }
            doc_ref = db.collection(self.collection_name).document()  # type: ignore
            await doc_ref.set(event_data)  # type: ignore
            return doc_ref.id  # type: ignore
        except Exception as e:
            logger.error(f"Error logging audit action {action}: {e}")
            return ""


audit_logger = AuditLogger()
