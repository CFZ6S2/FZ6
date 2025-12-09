"""
Métricas de App Check para rastrear solicitudes con/sin tokens de App Check.
Utilidad para monitorear la migración de versiones antiguas del SDK.
"""
from typing import Dict, Optional
from datetime import datetime
from collections import defaultdict
import threading
import logging

logger = logging.getLogger("metrics.app_check")


class AppCheckMetrics:
    """
    Clase thread-safe para rastrear métricas de App Check.
    Mantiene contadores simples que pueden extenderse a Prometheus/Cloud Monitoring.
    """
    
    def __init__(self):
        self._lock = threading.Lock()
        # Contadores por tipo de solicitud
        self._counters = {
            'with_app_check': 0,
            'without_app_check': 0,
            'invalid_token': 0,
            'legacy_sdk': 0,  # Solicitudes que parecen ser de versiones antiguas
        }
        # Agregación por versión del cliente
        self._by_client_version: Dict[str, Dict[str, int]] = defaultdict(lambda: defaultdict(int))
        # Agregación por path
        self._by_path: Dict[str, Dict[str, int]] = defaultdict(lambda: defaultdict(int))
        # Timestamp de la última solicitud sin App Check
        self._last_missing_app_check: Optional[datetime] = None
    
    def record_request(
        self,
        has_app_check: bool,
        client_version: Optional[str] = None,
        path: Optional[str] = None,
        is_legacy: bool = False,
        token_valid: bool = True
    ):
        """
        Registrar una solicitud con/sin App Check.
        
        Args:
            has_app_check: Si la solicitud tiene token de App Check
            client_version: Versión del cliente (ej: "webapp/1.0.0" o "firebase-js/9.0.0")
            path: Path de la solicitud
            is_legacy: Si parece ser de una versión antigua del SDK
            token_valid: Si el token de App Check es válido (solo relevante si has_app_check=True)
        """
        with self._lock:
            if has_app_check:
                if token_valid:
                    self._counters['with_app_check'] += 1
                else:
                    self._counters['invalid_token'] += 1
            else:
                self._counters['without_app_check'] += 1
                self._last_missing_app_check = datetime.utcnow()
                if is_legacy:
                    self._counters['legacy_sdk'] += 1
            
            # Agregación por versión del cliente
            if client_version:
                if has_app_check and token_valid:
                    self._by_client_version[client_version]['with_app_check'] += 1
                elif has_app_check and not token_valid:
                    self._by_client_version[client_version]['invalid_token'] += 1
                else:
                    self._by_client_version[client_version]['without_app_check'] += 1
                    if is_legacy:
                        self._by_client_version[client_version]['legacy_sdk'] += 1
            
            # Agregación por path
            if path:
                if has_app_check and token_valid:
                    self._by_path[path]['with_app_check'] += 1
                elif has_app_check and not token_valid:
                    self._by_path[path]['invalid_token'] += 1
                else:
                    self._by_path[path]['without_app_check'] += 1
    
    def get_stats(self) -> Dict:
        """
        Obtener estadísticas actuales.
        
        Returns:
            Dict con contadores y agregaciones
        """
        with self._lock:
            total = sum(self._counters.values())
            return {
                'counters': dict(self._counters),
                'total_requests': total,
                'coverage_percentage': (
                    (self._counters['with_app_check'] / total * 100) 
                    if total > 0 else 0
                ),
                'last_missing_app_check': (
                    self._last_missing_app_check.isoformat() 
                    if self._last_missing_app_check else None
                ),
                'by_client_version': {
                    version: dict(stats) 
                    for version, stats in self._by_client_version.items()
                },
                'by_path': {
                    path: dict(stats) 
                    for path, stats in list(self._by_path.items())[:20]  # Limitar a top 20
                }
            }
    
    def reset(self):
        """Resetear todas las métricas (útil para testing)."""
        with self._lock:
            self._counters.clear()
            self._by_client_version.clear()
            self._by_path.clear()
            self._last_missing_app_check = None
    
    def get_coverage_percentage(self) -> float:
        """
        Obtener el porcentaje de solicitudes con App Check.
        
        Returns:
            Porcentaje entre 0 y 100
        """
        with self._lock:
            total = sum(self._counters.values())
            if total == 0:
                return 0.0
            return (self._counters['with_app_check'] / total) * 100


# Instancia global (thread-safe)
_metrics_instance: Optional[AppCheckMetrics] = None


def get_metrics() -> AppCheckMetrics:
    """
    Obtener la instancia global de métricas.
    
    Returns:
        AppCheckMetrics instance
    """
    global _metrics_instance
    if _metrics_instance is None:
        _metrics_instance = AppCheckMetrics()
    return _metrics_instance


def detect_legacy_sdk(user_agent: Optional[str], client_version: Optional[str]) -> bool:
    """
    Detectar si la solicitud parece venir de una versión antigua del SDK.
    
    Args:
        user_agent: User-Agent header
        client_version: Versión del cliente desde header personalizado
        
    Returns:
        True si parece ser una versión antigua
    """
    if not user_agent and not client_version:
        # Sin información de versión, asumir legacy
        return True
    
    # Detectar versiones antiguas de Firebase SDK
    if user_agent:
        user_agent_lower = user_agent.lower()
        # Versiones antiguas del SDK no incluyen "app-check" en el User-Agent típicamente
        # O puedes buscar versiones específicas como "firebase-js/8" vs "firebase-js/9+"
        if 'firebase' in user_agent_lower:
            # Si tiene Firebase pero no menciona App Check, podría ser legacy
            if 'app-check' not in user_agent_lower:
                # Pero esto no es determinante, mejor verificar por versión
                pass
    
    if client_version:
        # Si la versión del cliente es muy antigua, marcar como legacy
        # Ejemplo: versiones anteriores a 1.0.0 o sin formato de versión
        if client_version.startswith('0.') or '/' not in client_version:
            return True
    
    return False


def extract_client_version(headers: Dict[str, str]) -> Optional[str]:
    """
    Extraer versión del cliente desde headers.
    
    Args:
        headers: Dict de headers HTTP
        
    Returns:
        Versión del cliente o None
    """
    # Intentar desde header personalizado primero
    client_version = headers.get('X-Client-Version') or headers.get('X-App-Version')
    if client_version:
        return client_version
    
    # Intentar desde User-Agent
    user_agent = headers.get('User-Agent', '')
    if 'firebase-js' in user_agent.lower():
        # Extraer versión de Firebase SDK del User-Agent
        # Formato típico: "firebase-js/10.12.2"
        import re
        match = re.search(r'firebase-js/([\d.]+)', user_agent)
        if match:
            return f"firebase-js/{match.group(1)}"
    
    return None

