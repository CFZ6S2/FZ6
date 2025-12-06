"""
TuCitaSegura - Message Moderation Service
Handles text moderation, toxicity detection, and spam filtering
"""

import re
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

@dataclass
class ModerationResult:
    """Resultado de la moderación de un mensaje"""
    is_safe: bool
    reasons: List[str]
    toxicity_score: float
    categories: List[str]  # ['profanity', 'spam', 'harassment', 'pii']
    processed_text: str    # Texto con partes sensibles censuradas

class MessageModerator:
    """Servicio de moderación de mensajes"""
    
    def __init__(self):
        # Lista básica de palabras prohibidas (español e inglés)
        # En producción, esto debería cargarse de una base de datos o archivo externo
        self.banned_words = {
            'profanay': ['mierda', 'puta', 'cabron', 'estupido', 'shit', 'fuck', 'bitch', 'asshole'],
            'sexual': ['sexo', 'nude', 'desnuda', 'pack', 'xxx', 'porn'],
            'scam': ['bitcoin', 'crypto', 'inversion', 'dinero rapido', 'whatsapp', 'telegram']
        }
        
        # Patrones regex para detección
        self.patterns = {
            'phone': r'\b(\+?[\d\s-]{8,})\b',
            'email': r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
            'url': r'https?://(?:[-\w.]|(?:%[\da-fA-F]{2}))+',
            'repeated_chars': r'(.)\1{4,}'  # "holaaaaaa"
        }
    
    def moderate_message(self, text: str) -> ModerationResult:
        """
        Analiza un mensaje y determina si es seguro
        """
        try:
            # Normalizar texto
            text_lower = text.lower()
            reasons = []
            categories = []
            toxicity_score = 0.0
            
            # 1. Detección de Profanidad y Palabras Prohibidas
            for category, words in self.banned_words.items():
                for word in words:
                    if word in text_lower:
                        reasons.append(f"Contenido inapropiado detectado: {category}")
                        categories.append(category)
                        toxicity_score += 0.3
            
            # 2. Detección de Información Personal (PII) - Números y Emails
            # En apps de citas, compartir contacto rápido suele ser riesgo o prohibido al inicio
            if re.search(self.patterns['phone'], text):
                reasons.append("Intento de compartir número de teléfono")
                categories.append('pii')
                toxicity_score += 0.2
            
            if re.search(self.patterns['email'], text):
                reasons.append("Intento de compartir email")
                categories.append('pii')
                toxicity_score += 0.2
            
            # 3. Detección de Spam (URLs y repeticiones)
            if re.search(self.patterns['url'], text):
                reasons.append("Enlaces externos no permitidos")
                categories.append('spam')
                toxicity_score += 0.4
                
            if re.search(self.patterns['repeated_chars'], text):
                reasons.append("Uso excesivo de caracteres repetidos")
                categories.append('spam')
                toxicity_score += 0.1

            # 4. Longitud
            if len(text) > 1000:
                reasons.append("Mensaje demasiado largo")
                categories.append('spam')
            
            # Decisión final
            is_safe = toxicity_score < 0.7 and len(reasons) == 0
            
            # Censura básica para el texto procesado
            processed_text = text
            if not is_safe:
                for category in ['profanay', 'sexual']:
                    for word in self.banned_words.get(category, []):
                        processed_text = re.sub(word, '*' * len(word), processed_text, flags=re.IGNORECASE)

            return ModerationResult(
                is_safe=is_safe,
                reasons=reasons,
                toxicity_score=min(toxicity_score, 1.0),
                categories=list(set(categories)),
                processed_text=processed_text
            )
            
        except Exception as e:
            logger.error(f"Error moderating message: {e}")
            # Fail-safe: Si falla, marcamos como inseguro para revisión manual por defecto (o seguro, según política)
            return ModerationResult(
                is_safe=False, 
                reasons=["Error interno en moderación"], 
                toxicity_score=1.0, 
                categories=['error'], 
                processed_text=text
            )

# Instancia global
message_moderator = MessageModerator()
