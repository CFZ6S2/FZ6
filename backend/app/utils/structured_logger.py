"""
Sistema de logs estructurados con sanitización de datos sensibles
Compatible con Cloud Logging y Sentry
"""
import logging
import json
import time
from datetime import datetime
from typing import Any, Dict, Optional, Set
from enum import Enum
import re


class Severity(str, Enum):
    """
    Niveles de severidad según Cloud Logging
    https://cloud.google.com/logging/docs/reference/v2/rest/v2/LogEntry#logseverity
    """
    DEBUG = "DEBUG"
    INFO = "INFO"
    NOTICE = "NOTICE"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"
    ALERT = "ALERT"
    EMERGENCY = "EMERGENCY"


# Patrones de datos sensibles que deben sanitizarse
SENSITIVE_PATTERNS = {
    # Tokens y credenciales
    'accessToken': re.compile(r'access[_-]?token', re.IGNORECASE),
    'refreshToken': re.compile(r'refresh[_-]?token', re.IGNORECASE),
    'apiKey': re.compile(r'api[_-]?key', re.IGNORECASE),
    'password': re.compile(r'password|passwd|pwd', re.IGNORECASE),
    'secret': re.compile(r'secret', re.IGNORECASE),

    # Información financiera
    'creditCard': re.compile(r'card[_-]?number|cc[_-]?number', re.IGNORECASE),
    'cvv': re.compile(r'cvv|cvc|card[_-]?code', re.IGNORECASE),

    # Datos personales (GDPR)
    'email': re.compile(r'email', re.IGNORECASE),
    'phone': re.compile(r'phone|telefono|mobile', re.IGNORECASE),
    'address': re.compile(r'address|direccion', re.IGNORECASE),

    # Identificadores sensibles
    'ssn': re.compile(r'ssn|social[_-]?security', re.IGNORECASE),
    'dni': re.compile(r'dni|nif|passport', re.IGNORECASE),

    # Headers sensibles
    'authorization': re.compile(r'authorization', re.IGNORECASE),
    'cookie': re.compile(r'cookie', re.IGNORECASE),

    # Datos de PayPal/Stripe
    'paypalSecret': re.compile(r'paypal[_-]?secret', re.IGNORECASE),
    'stripeSecret': re.compile(r'stripe[_-]?secret', re.IGNORECASE),
}

# Campos que siempre deben redactarse completamente
REDACT_FIELDS: Set[str] = {
    'password', 'passwd', 'pwd', 'secret', 'api_key', 'apiKey',
    'accessToken', 'access_token', 'refreshToken', 'refresh_token',
    'privateKey', 'private_key', 'cvv', 'cvc', 'cardNumber', 'card_number',
    'ssn', 'authorization', 'cookie', 'stripe_secret_key', 'paypal_secret'
}

# Campos que deben parcialmente enmascararse (mostrar solo últimos 4 caracteres)
MASK_FIELDS: Set[str] = {
    'email', 'phone', 'telefono', 'mobile', 'cardNumber', 'card_number',
    'accountNumber', 'account_number'
}


def sanitize_value(key: str, value: Any) -> Any:
    """
    Sanitizar valor según tipo de dato sensible

    Args:
        key: Nombre del campo
        value: Valor a sanitizar

    Returns:
        Valor sanitizado
    """
    if value is None:
        return value

    key_lower = key.lower()

    # Redactar completamente campos sensibles
    if key in REDACT_FIELDS or key_lower in REDACT_FIELDS:
        return '[REDACTED]'

    # Enmascarar parcialmente ciertos campos
    if key in MASK_FIELDS or key_lower in MASK_FIELDS:
        str_value = str(value)
        if len(str_value) <= 4:
            return '****'
        return '****' + str_value[-4:]

    # Sanitizar emails
    if isinstance(value, str) and '@' in value:
        parts = value.split('@')
        if len(parts) == 2 and len(parts[0]) > 2:
            return parts[0][:2] + '****@' + parts[1]

    return value


def sanitize_object(obj: Any, depth: int = 0) -> Any:
    """
    Sanitizar objeto recursivamente

    Args:
        obj: Objeto a sanitizar
        depth: Profundidad actual (prevenir recursión infinita)

    Returns:
        Objeto sanitizado
    """
    # Prevenir recursión infinita
    if depth > 10:
        return '[MAX_DEPTH_EXCEEDED]'

    if obj is None:
        return None

    # Tipos primitivos
    if not isinstance(obj, (dict, list, tuple, set)):
        return obj

    # Listas, tuplas, sets
    if isinstance(obj, (list, tuple, set)):
        return type(obj)(sanitize_object(item, depth + 1) for item in obj)

    # Diccionarios
    if isinstance(obj, dict):
        sanitized = {}
        for key, value in obj.items():
            if isinstance(value, (dict, list, tuple, set)):
                sanitized[key] = sanitize_object(value, depth + 1)
            else:
                sanitized[key] = sanitize_value(key, value)
        return sanitized

    return obj


class StructuredLogger:
    """
    Logger estructurado con sanitización automática de datos sensibles
    Compatible con Cloud Logging, Sentry y logs estructurados JSON
    """

    def __init__(self, component: str = 'default'):
        """
        Inicializar logger estructurado

        Args:
            component: Nombre del componente/módulo
        """
        self.component = component
        self.logger = logging.getLogger(component)

    def _create_log_entry(
        self,
        severity: Severity,
        message: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Crear entrada de log estructurada

        Args:
            severity: Nivel de severidad
            message: Mensaje de log
            context: Contexto adicional

        Returns:
            Entrada de log estructurada
        """
        entry = {
            'severity': severity.value,
            'message': message,
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'component': self.component
        }

        if context:
            entry.update(sanitize_object(context))

        return entry

    def _log(self, severity: Severity, message: str, context: Optional[Dict[str, Any]] = None):
        """Método interno para hacer log"""
        entry = self._create_log_entry(severity, message, context)

        # Log como JSON estructurado
        log_line = json.dumps(entry, default=str, ensure_ascii=False)

        # Usar el nivel de logging de Python apropiado
        if severity in [Severity.DEBUG]:
            self.logger.debug(log_line)
        elif severity in [Severity.INFO, Severity.NOTICE]:
            self.logger.info(log_line)
        elif severity in [Severity.WARNING]:
            self.logger.warning(log_line)
        elif severity in [Severity.ERROR]:
            self.logger.error(log_line)
        else:  # CRITICAL, ALERT, EMERGENCY
            self.logger.critical(log_line)

    def debug(self, message: str, context: Optional[Dict[str, Any]] = None):
        """
        Log de debug

        Args:
            message: Mensaje de log
            context: Contexto adicional
        """
        self._log(Severity.DEBUG, message, context)

    def info(self, message: str, context: Optional[Dict[str, Any]] = None):
        """
        Log de info

        Args:
            message: Mensaje de log
            context: Contexto adicional
        """
        self._log(Severity.INFO, message, context)

    def notice(self, message: str, context: Optional[Dict[str, Any]] = None):
        """
        Log de notice

        Args:
            message: Mensaje de log
            context: Contexto adicional
        """
        self._log(Severity.NOTICE, message, context)

    def warn(self, message: str, context: Optional[Dict[str, Any]] = None):
        """
        Log de warning

        Args:
            message: Mensaje de log
            context: Contexto adicional
        """
        self._log(Severity.WARNING, message, context)

    def warning(self, message: str, context: Optional[Dict[str, Any]] = None):
        """Alias para warn"""
        self.warn(message, context)

    def error(self, message: str, error: Optional[Exception] = None, context: Optional[Dict[str, Any]] = None):
        """
        Log de error

        Args:
            message: Mensaje de log
            error: Excepción (opcional)
            context: Contexto adicional
        """
        ctx = context or {}

        if error:
            ctx['error'] = {
                'message': str(error),
                'type': type(error).__name__,
                'traceback': self._get_traceback(error)
            }

        self._log(Severity.ERROR, message, ctx)

    def critical(self, message: str, error: Optional[Exception] = None, context: Optional[Dict[str, Any]] = None):
        """
        Log de critical

        Args:
            message: Mensaje de log
            error: Excepción (opcional)
            context: Contexto adicional
        """
        ctx = context or {}

        if error:
            ctx['error'] = {
                'message': str(error),
                'type': type(error).__name__,
                'traceback': self._get_traceback(error)
            }

        self._log(Severity.CRITICAL, message, ctx)

    def security(self, event: str, context: Optional[Dict[str, Any]] = None):
        """
        Log de evento de seguridad

        Args:
            event: Tipo de evento de seguridad
            context: Contexto adicional
        """
        ctx = context or {}
        ctx['eventType'] = 'security'
        ctx['event'] = event

        self._log(Severity.WARNING, f"Security event: {event}", ctx)

    def audit(self, action: str, user_id: str, context: Optional[Dict[str, Any]] = None):
        """
        Log de auditoría

        Args:
            action: Acción realizada
            user_id: ID del usuario
            context: Contexto adicional
        """
        ctx = context or {}
        ctx['eventType'] = 'audit'
        ctx['action'] = action
        ctx['userId'] = user_id

        self._log(Severity.NOTICE, f"Audit: {action}", ctx)

    def performance(self, operation: str, duration_ms: float, context: Optional[Dict[str, Any]] = None):
        """
        Log de métrica de performance

        Args:
            operation: Nombre de la operación
            duration_ms: Duración en milisegundos
            context: Contexto adicional
        """
        ctx = context or {}
        ctx['eventType'] = 'performance'
        ctx['operation'] = operation
        ctx['durationMs'] = round(duration_ms, 2)

        self._log(Severity.INFO, f"Performance: {operation}", ctx)

    @staticmethod
    def _get_traceback(error: Exception) -> Optional[str]:
        """Obtener traceback de excepción"""
        import traceback
        if error:
            return ''.join(traceback.format_exception(type(error), error, error.__traceback__))
        return None


class PerformanceTimer:
    """
    Helper para medir tiempo de ejecución de operaciones

    Uso:
        timer = PerformanceTimer(logger, 'database_query')
        # ... operación ...
        timer.end({'rows': 100})
    """

    def __init__(self, logger: StructuredLogger, operation: str):
        """
        Inicializar timer

        Args:
            logger: Logger estructurado
            operation: Nombre de la operación
        """
        self.logger = logger
        self.operation = operation
        self.start_time = time.time()

    def end(self, context: Optional[Dict[str, Any]] = None) -> float:
        """
        Finalizar timer y hacer log de performance

        Args:
            context: Contexto adicional

        Returns:
            Duración en milisegundos
        """
        duration_ms = (time.time() - self.start_time) * 1000
        self.logger.performance(self.operation, duration_ms, context)
        return duration_ms


def create_logger(component: str) -> StructuredLogger:
    """
    Crear logger para componente específico

    Args:
        component: Nombre del componente/módulo

    Returns:
        Logger estructurado

    Ejemplo:
        logger = create_logger('payment-service')
        logger.info('Payment processed', {'orderId': '123', 'amount': 99.99})
    """
    return StructuredLogger(component)


# Configurar formato de logging básico de Python
logging.basicConfig(
    level=logging.INFO,
    format='%(message)s',  # Solo el mensaje JSON
    handlers=[
        logging.StreamHandler()
    ]
)


__all__ = [
    'StructuredLogger',
    'PerformanceTimer',
    'create_logger',
    'Severity',
    'sanitize_object',
    'sanitize_value'
]
