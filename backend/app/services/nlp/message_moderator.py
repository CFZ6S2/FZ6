import logging
import re
import numpy as np
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime
import unicodedata

logger = logging.getLogger(__name__)

@dataclass
class ModerationResult:
    is_safe: bool
    severity: str  # 'low', 'medium', 'high', 'critical'
    categories: List[str]
    confidence: float
    flagged_phrases: List[str]
    recommendation: str
    alternative_suggestion: Optional[str] = None

class MessageModerator:
    def __init__(self):
        # Categorías de contenido problemático
        self.categories = {
            'hate_speech': {
                'weight': 0.9,
                'patterns': [
                    r'\b(odio|maldit[oa]s?|muer[ae]n|matar|asesinar)\s+(gente|personas|gays?|lesbianas?|trans|negros?|jud[íi]os?)\b',
                    r'\b(racista|homofóbic[oa]|nazi|supremacista)\b',
                    r'\b(inferior|basura|escoria)\s+(raza|gente)\b'
                ]
            },
            'harassment': {
                'weight': 0.8,
                'patterns': [
                    r'\b(acosar|hostigar|molestar|perseguir)\b',
                    r'\b(voy\s+a\s+encontrar|te\s+voy\s+a)\s+(dañar|hacer\s+daño)\b',
                    r'\b(no\s+te\s+escaparás|te\s+voy\s+a\s+coger)\b',
                    r'\b(idiota|estúpido|imbécil|retrasado)\b'
                ]
            },
            'sexual_explicit': {
                'weight': 0.7,
                'patterns': [
                    r'\b(pene|vagina|coño|polla|verga|pija)\b',
                    r'\b(follar|coger|singar|joder|chupar)\s+(polla|pene)\b',
                    r'\b(sexo\s+(anal|oral)|anal\s+sexo)\b',
                    r'\b(desnud[oa]|desvestir|quitarte\s+la\s+ropa)\b'
                ]
            },
            'drugs': {
                'weight': 0.6,
                'patterns': [
                    r'\b(cocaína|marihuana|porro|joint|extasis|éxtasis|mdma)\b',
                    r'\b(vender|comprar|traficar)\s+(drogas|pastillas|coca)\b',
                    r'\b(pasto|hierba|weed|hash)\s+(tengo|vendo|quiero)\b'
                ]
            },
            'scam': {
                'weight': 0.85,
                'patterns': [
                    r'\b(dinero|plata|efectivo|transferencia|bitcoin)\s+(enviar|mandar)\b',
                    r'\b(ayuda\s+económica|necesito\s+dinero|préstamo)\b',
                    r'\b(inversión|negocio|oportunidad|ganar\s+dinero)\s+(rápido|fácil)\b',
                    r'\b(urgente|emergencia|hospital|medicina)\s+(dinero)\b'
                ]
            },
            'personal_info': {
                'weight': 0.75,
                'patterns': [
                    r'\b(dni|nif|pasaporte)\s*[:#]?\s*\d{8}[a-z]?\b',
                    r'\b(cuenta\s+bancaria|iban|tarjeta\s+(de\s+)?crédito)\b',
                    r'\b(dirección|calle|avenida)\s+\w+\s+\d+\b',
                    r'\b(teléfono|móvil)\s*[:#]?\s*\+?\d{9,}\b'
                ]
            },
            'spam': {
                'weight': 0.5,
                'patterns': [
                    r'\b(http|https|www\.|\.com|\.net|\.org)\b',
                    r'\b(sígueme|follow|instagram|facebook|twitter|snapchat)\b',
                    r'\b(promoción|descuento|oferta|gratis)\b',
                    r'(.)\1{4,}'  # Caracteres repetitivos
                ]
            }
        }
        
        # Palabras de contexto positivo/negativo
        self.context_words = {
            'positive': ['amor', 'cariño', 'besos', 'abrazos', 'te quiero', 'me gustas', 'guapo', 'hermoso', 'precioso'],
            'negative': ['odio', 'malo', 'feo', 'estúpido', 'idiota', 'tonto', 'imbécil']
        }
        
        # Umbrales de severidad
        self.severity_thresholds = {
            'critical': 0.8,
            'high': 0.6,
            'medium': 0.4,
            'low': 0.2
        }

    def moderate_message(self, message: str, user_id: str, context: Optional[Dict] = None) -> ModerationResult:
        """Modera un mensaje individual"""
        try:
            if not message or not message.strip():
                return ModerationResult(
                    is_safe=True,
                    severity='low',
                    categories=[],
                    confidence=1.0,
                    flagged_phrases=[],
                    recommendation='Mensaje vacío permitido'
                )
            
            # Normalizar el mensaje
            normalized_message = self._normalize_text(message)
            
            # Análisis por categorías
            category_scores = {}
            flagged_phrases = []
            
            for category_name, category_data in self.categories.items():
                score, phrases = self._analyze_category(normalized_message, category_data)
                category_scores[category_name] = score
                flagged_phrases.extend(phrases)
            
            # Análisis de contexto
            context_modifier = self._analyze_context(message, context)
            
            # Calcular score final
            final_score = self._calculate_final_score(category_scores, context_modifier)
            
            # Determinar severidad y recomendaciones
            severity = self._get_severity(final_score)
            recommendation = self._generate_recommendation(final_score, category_scores)
            
            # Sugerencia alternativa para mensajes problemáticos
            alternative = None
            if final_score > 0.5:
                alternative = self._suggest_alternative(message, flagged_phrases)
            
            is_safe = final_score < self.severity_thresholds['medium']
            
            # Filtrar categorías relevantes
            relevant_categories = [cat for cat, score in category_scores.items() 
                                 if score > 0.3]
            
            logger.info(f"Message moderation completed for user {user_id}: "
                       f"score={final_score:.2f}, severity={severity}, "
                       f"categories={relevant_categories}, safe={is_safe}")
            
            return ModerationResult(
                is_safe=is_safe,
                severity=severity,
                categories=relevant_categories,
                confidence=min(final_score + 0.2, 1.0),
                flagged_phrases=flagged_phrases[:5],  # Limitar a 5 frases
                recommendation=recommendation,
                alternative_suggestion=alternative
            )
            
        except Exception as e:
            logger.error(f"Error moderating message: {str(e)}")
            return ModerationResult(
                is_safe=False,
                severity='medium',
                categories=['error'],
                confidence=0.1,
                flagged_phrases=[],
                recommendation='Error en moderación - revisar manualmente',
                alternative_suggestion=None
            )

    def _normalize_text(self, text: str) -> str:
        """Normaliza el texto para análisis"""
        # Convertir a minúsculas
        text = text.lower()
        
        # Eliminar acentos
        text = unicodedata.normalize('NFKD', text)
        text = ''.join(c for c in text if not unicodedata.combining(c))
        
        # Eliminar caracteres especiales pero mantener espacios
        text = re.sub(r'[^\w\s]', ' ', text)
        
        # Eliminar espacios múltiples
        text = re.sub(r'\s+', ' ', text).strip()
        
        return text

    def _analyze_category(self, text: str, category_data: Dict) -> Tuple[float, List[str]]:
        """Analiza una categoría específica"""
        total_score = 0.0
        flagged_phrases = []
        
        for pattern in category_data['patterns']:
            matches = re.finditer(pattern, text, re.I)
            for match in matches:
                phrase = match.group().strip()
                # Calcular score basado en longitud y contexto
                phrase_score = min(len(phrase) / 50, 1.0) * category_data['weight']
                total_score += phrase_score
                flagged_phrases.append(phrase)
        
        # Normalizar score
        max_possible_score = len(category_data['patterns']) * category_data['weight']
        normalized_score = min(total_score / max_possible_score if max_possible_score > 0 else 0, 1.0)
        
        return normalized_score, flagged_phrases

    def _analyze_context(self, message: str, context: Optional[Dict]) -> float:
        """Analiza el contexto del mensaje"""
        modifier = 0.0
        
        if not context:
            return modifier
        
        # Analizar historial de mensajes del usuario
        user_history = context.get('user_history', [])
        if user_history:
            # Verificar si el usuario tiene historial de mensajes problemáticos
            problematic_ratio = sum(1 for msg in user_history[-10:] 
                                  if msg.get('was_flagged', False)) / min(len(user_history), 10)
            
            if problematic_ratio > 0.5:
                modifier += 0.2
        
        # Analizar relación entre usuarios
        relationship_context = context.get('relationship_context', {})
        if relationship_context.get('is_new_match', False):
            # Mensajes más estrictos para nuevos matches
            modifier += 0.1
        
        if relationship_context.get('has_blocked_before', False):
            # Usuario que ha bloqueado antes al destinatario
            modifier += 0.3
        
        # Analizar hora del mensaje
        message_time = context.get('timestamp')
        if message_time:
            hour = datetime.fromisoformat(message_time).hour
            # Mensajes muy tardíos pueden ser más sospechosos
            if hour < 6 or hour > 23:
                modifier += 0.1
        
        return min(modifier, 0.5)

    def _calculate_final_score(self, category_scores: Dict[str, float], context_modifier: float) -> float:
        """Calcula el score final de moderación"""
        # Tomar el score máximo de todas las categorías
        max_category_score = max(category_scores.values()) if category_scores else 0.0
        
        # Aplicar modificador de contexto
        final_score = min(max_category_score + context_modifier, 1.0)
        
        return final_score

    def _get_severity(self, score: float) -> str:
        """Determina la severidad basada en el score"""
        if score >= self.severity_thresholds['critical']:
            return 'critical'
        elif score >= self.severity_thresholds['high']:
            return 'high'
        elif score >= self.severity_thresholds['medium']:
            return 'medium'
        elif score >= self.severity_thresholds['low']:
            return 'low'
        else:
            return 'minimal'

    def _generate_recommendation(self, final_score: float, category_scores: Dict[str, float]) -> str:
        """Genera recomendaciones basadas en el score y categorías"""
        if final_score >= self.severity_thresholds['critical']:
            return "BLOQUEAR: Contenido extremadamente inapropiado - Revisión inmediata requerida"
        elif final_score >= self.severity_thresholds['high']:
            return "RECHAZAR: Contenido altamente inapropiado - No enviar"
        elif final_score >= self.severity_thresholds['medium']:
            return "REVISAR: Contenido potencialmente problemático - Considerar edición"
        elif final_score >= self.severity_thresholds['low']:
            return "ADVERTENCIA: Contenido ligeramente problemático - Monitorear"
        else:
            return "APROBAR: Contenido seguro - Enviar normalmente"

    def _suggest_alternative(self, original_message: str, flagged_phrases: List[str]) -> Optional[str]:
        """Sugiere una alternativa al mensaje"""
        if not flagged_phrases:
            return None
        
        alternative = original_message
        
        # Reemplazos comunes
        replacements = {
            'hate_speech': {
                'odio': 'disgusto',
                'maldito': 'problemático',
                'mueren': 'desaparecen',
                'matar': 'eliminar'
            },
            'sexual_explicit': {
                'sexo': 'intimidad',
                'follar': 'estar juntos',
                'desnudo': 'cómodo'
            },
            'harassment': {
                'acosar': 'contactar',
                'molestar': 'incomodar',
                'perseguir': 'seguir'
            }
        }
        
        # Aplicar reemplazos básicos
        for category, category_replacements in replacements.items():
            for old_word, new_word in category_replacements.items():
                if old_word in alternative.lower():
                    alternative = re.sub(r'\b' + old_word + r'\b', new_word, alternative, flags=re.I)
        
        # Si el mensaje sigue siendo muy problemático, sugerir algo completamente diferente
        if len(alternative) < len(original_message) * 0.5:
            return "¿Te gustaría hablar de tus intereses o aficiones?"
        
        return alternative if alternative != original_message else None

    def moderate_conversation(self, messages: List[Dict], user_id: str) -> Dict:
        """Modera una conversación completa"""
        try:
            results = []
            conversation_risk = 0.0
            
            for i, message in enumerate(messages):
                # Agregar contexto de conversación
                context = {
                    'user_history': messages[:i],  # Mensajes previos
                    'timestamp': message.get('timestamp'),
                    'relationship_context': message.get('relationship_context', {})
                }
                
                result = self.moderate_message(
                    message.get('content', ''),
                    user_id,
                    context
                )
                
                results.append({
                    'message_id': message.get('id'),
                    'moderation_result': result,
                    'timestamp': message.get('timestamp')
                })
                
                conversation_risk = max(conversation_risk, 
                                      1.0 if not result.is_safe else 0.0)
            
            # Análisis de patrones en la conversación
            pattern_analysis = self._analyze_conversation_patterns(messages)
            
            return {
                'overall_safe': conversation_risk < 0.5,
                'risk_level': 'high' if conversation_risk >= 0.5 else 'low',
                'message_results': results,
                'pattern_analysis': pattern_analysis,
                'analyzed_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error moderating conversation: {str(e)}")
            return {
                'overall_safe': False,
                'risk_level': 'unknown',
                'message_results': [],
                'pattern_analysis': {},
                'error': str(e),
                'analyzed_at': datetime.now().isoformat()
            }

    def _analyze_conversation_patterns(self, messages: List[Dict]) -> Dict:
        """Analiza patrones en la conversación"""
        patterns = {
            'has_repetitive_messages': False,
            'has_aggressive_escalation': False,
            'has_personal_info_requests': False,
            'has_scam_patterns': False,
            'message_frequency_anomaly': False
        }
        
        if len(messages) < 3:
            return patterns
        
        # Análisis de mensajes repetitivos
        contents = [msg.get('content', '').lower() for msg in messages]
        unique_contents = len(set(contents))
        if unique_contents < len(contents) * 0.7:
            patterns['has_repetitive_messages'] = True
        
        # Análisis de escalada agresiva
        for i in range(1, len(messages)):
            prev_result = self.moderate_message(contents[i-1], 'temp', {})
            curr_result = self.moderate_message(contents[i], 'temp', {})
            
            if (not prev_result.is_safe and not curr_result.is_safe and 
                curr_result.severity in ['high', 'critical']):
                patterns['has_aggressive_escalation'] = True
                break
        
        # Análisis de solicitudes de información personal
        personal_info_patterns = [
            r'dónde\s+vives',
            r'cuál\s+es\s+tu\s+(nombre|teléfono|dirección)',
            r'mándame\s+tu\s+(foto|número)',
            r'envíame\s+tu\s+(ubicación|dirección)'
        ]
        
        for content in contents:
            for pattern in personal_info_patterns:
                if re.search(pattern, content):
                    patterns['has_personal_info_requests'] = True
                    break
        
        return patterns

# Función auxiliar para uso externo
def moderate_user_message(message: str, user_id: str, context: Optional[Dict] = None) -> Dict:
    """Función principal para moderar un mensaje de usuario"""
    moderator = MessageModerator()
    result = moderator.moderate_message(message, user_id, context)
    
    return {
        'is_safe': result.is_safe,
        'severity': result.severity,
        'categories': result.categories,
        'confidence': result.confidence,
        'flagged_phrases': result.flagged_phrases,
        'recommendation': result.recommendation,
        'alternative_suggestion': result.alternative_suggestion,
        'moderated_at': datetime.now().isoformat()
    }

def moderate_conversation_messages(messages: List[Dict], user_id: str) -> Dict:
    """Función para moderar una conversación completa"""
    moderator = MessageModerator()
    return moderator.moderate_conversation(messages, user_id)