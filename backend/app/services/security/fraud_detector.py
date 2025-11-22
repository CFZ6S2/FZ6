import logging
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from collections import defaultdict
import re
import hashlib

logger = logging.getLogger(__name__)

@dataclass
class FraudScore:
    total_score: float
    risk_level: str
    indicators: List[str]
    recommendations: List[str]
    confidence: float

class FraudDetector:
    def __init__(self):
        self.risk_thresholds = {
            'low': 0.3,
            'medium': 0.6,
            'high': 0.8
        }
        
        # Patrones de fraude comunes
        self.suspicious_patterns = {
            'email_temporal': re.compile(r'@(tempmail|10minutemail|mailinator|guerrillamail|throwaway)\.(com|net|org|co\.uk)', re.I),
            'phone_voip': re.compile(r'^\+?(1|44|34)[0-9]{9,11}$'),  # Números VOIP comunes
            'name_repetitive': re.compile(r'(.)\1{2,}'),  # Caracteres repetitivos
            'bio_generic': re.compile(r'(looking for|seeking|want to meet|nice person|good heart)', re.I),
            'location_vpn': ['VPN', 'Proxy', 'Tor', 'Anonymous'],
            'multiple_accounts': re.compile(r'user[0-9]+|test[0-9]+|fake[0-9]+', re.I)
        }
        
        # Umbrales de comportamiento
        self.behavioral_thresholds = {
            'max_messages_per_hour': 50,
            'max_likes_per_hour': 100,
            'max_reports': 3,
            'min_profile_completion': 0.3,
            'max_login_locations': 5,
            'max_devices': 3
        }

    def analyze_user_fraud_risk(self, user_data: Dict, user_history: Dict) -> FraudScore:
        """Analiza el riesgo de fraude para un usuario"""
        try:
            scores = []
            indicators = []
            recommendations = []
            
            # 1. Análisis de registro y perfil (25% del score)
            profile_score, profile_indicators = self._analyze_profile_fraud(user_data)
            scores.append(profile_score * 0.25)
            indicators.extend(profile_indicators)
            
            # 2. Análisis de comportamiento (35% del score)
            behavior_score, behavior_indicators = self._analyze_behavior_fraud(user_history)
            scores.append(behavior_score * 0.35)
            indicators.extend(behavior_indicators)
            
            # 3. Análisis de red y dispositivos (20% del score)
            network_score, network_indicators = self._analyze_network_fraud(user_data, user_history)
            scores.append(network_score * 0.20)
            indicators.extend(network_indicators)
            
            # 4. Análisis de contenido y patrones (20% del score)
            content_score, content_indicators = self._analyze_content_fraud(user_data)
            scores.append(content_score * 0.20)
            indicators.extend(content_indicators)
            
            total_score = sum(scores)
            risk_level = self._get_risk_level(total_score)
            
            # Generar recomendaciones
            recommendations = self._generate_fraud_recommendations(indicators, total_score)
            
            # Calcular confianza basada en la cantidad de datos disponibles
            confidence = self._calculate_confidence(user_data, user_history)
            
            logger.info(f"Fraud analysis completed for user {user_data.get('id', 'unknown')}: "
                       f"score={total_score:.2f}, risk={risk_level}, confidence={confidence:.2f}")
            
            return FraudScore(
                total_score=total_score,
                risk_level=risk_level,
                indicators=indicators,
                recommendations=recommendations,
                confidence=confidence
            )
            
        except Exception as e:
            logger.error(f"Error analyzing fraud risk: {str(e)}")
            return FraudScore(
                total_score=0.5,
                risk_level="medium",
                indicators=["Error en análisis de fraude"],
                recommendations=["Revisar manualmente"],
                confidence=0.1
            )

    def _analyze_profile_fraud(self, user_data: Dict) -> Tuple[float, List[str]]:
        """Analiza señales de fraude en el perfil del usuario"""
        score = 0.0
        indicators = []
        
        # Verificar email temporal
        email = user_data.get('email', '')
        if self.suspicious_patterns['email_temporal'].search(email):
            score += 0.3
            indicators.append("Email temporal detectado")
        
        # Verificar nombre sospechoso
        name = user_data.get('displayName', '')
        if len(name) < 2 or len(name) > 50:
            score += 0.2
            indicators.append("Nombre con longitud anormal")
        
        if self.suspicious_patterns['name_repetitive'].search(name):
            score += 0.25
            indicators.append("Nombre con patrones repetitivos")
        
        # Verificar edad sospechosa
        birth_date = user_data.get('birthDate')
        if birth_date:
            try:
                birth_year = int(birth_date.split('-')[0])
                current_year = datetime.now().year
                age = current_year - birth_year
                
                if age < 18 or age > 80:
                    score += 0.3
                    indicators.append(f"Edad sospechosa: {age} años")
            except:
                score += 0.2
                indicators.append("Formato de fecha inválido")
        
        # Verificar foto de perfil
        photos = user_data.get('photos', [])
        if not photos or len(photos) == 0:
            score += 0.15
            indicators.append("Sin fotos de perfil")
        
        # Verificar completitud del perfil
        profile_fields = ['bio', 'location', 'interests', 'occupation', 'education']
        completed_fields = sum(1 for field in profile_fields if user_data.get(field))
        completion_rate = completed_fields / len(profile_fields)
        
        if completion_rate < self.behavioral_thresholds['min_profile_completion']:
            score += 0.2
            indicators.append("Perfil incompleto")
        
        return min(score, 1.0), indicators

    def _analyze_behavior_fraud(self, user_history: Dict) -> Tuple[float, List[str]]:
        """Analiza patrones de comportamiento fraudulentos"""
        score = 0.0
        indicators = []
        
        # Análisis de mensajes
        messages = user_history.get('messages', [])
        recent_messages = [msg for msg in messages 
                          if datetime.fromisoformat(msg.get('timestamp', '')) > 
                          datetime.now() - timedelta(hours=1)]
        
        if len(recent_messages) > self.behavioral_thresholds['max_messages_per_hour']:
            score += 0.4
            indicators.append(f"Exceso de mensajes: {len(recent_messages)} en 1h")
        
        # Análisis de likes
        likes = user_history.get('likes', [])
        recent_likes = [like for like in likes 
                       if datetime.fromisoformat(like.get('timestamp', '')) > 
                       datetime.now() - timedelta(hours=1)]
        
        if len(recent_likes) > self.behavioral_thresholds['max_likes_per_hour']:
            score += 0.3
            indicators.append(f"Exceso de likes: {len(recent_likes)} en 1h")
        
        # Análisis de reportes
        reports = user_history.get('reports_received', [])
        if len(reports) >= self.behavioral_thresholds['max_reports']:
            score += 0.5
            indicators.append(f"Múltiples reportes: {len(reports)}")
        
        # Análisis de patrones de mensajes
        if messages:
            message_texts = [msg.get('content', '') for msg in messages[-20:]]
            duplicate_ratio = self._calculate_duplicate_ratio(message_texts)
            
            if duplicate_ratio > 0.7:
                score += 0.35
                indicators.append("Mensajes duplicados frecuentes")
        
        # Análisis de velocidad de interacción
        if recent_messages and len(recent_messages) > 10:
            avg_response_time = self._calculate_avg_response_time(recent_messages)
            if avg_response_time < 2:  # Respuestas muy rápidas (posible bot)
                score += 0.25
                indicators.append("Respuestas sospechosamente rápidas")
        
        return min(score, 1.0), indicators

    def _analyze_network_fraud(self, user_data: Dict, user_history: Dict) -> Tuple[float, List[str]]:
        """Analiza señales de fraude en red y dispositivos"""
        score = 0.0
        indicators = []
        
        # Análisis de ubicaciones de login
        logins = user_history.get('login_sessions', [])
        unique_locations = set()
        
        for session in logins[-30:]:  # Últimos 30 días
            location = session.get('location', {})
            if location:
                location_key = f"{location.get('lat', 0):.3f},{location.get('lng', 0):.3f}"
                unique_locations.add(location_key)
        
        if len(unique_locations) > self.behavioral_thresholds['max_login_locations']:
            score += 0.3
            indicators.append(f"Múltiples ubicaciones: {len(unique_locations)}")
        
        # Análisis de dispositivos
        devices = user_history.get('devices', [])
        if len(devices) > self.behavioral_thresholds['max_devices']:
            score += 0.25
            indicators.append(f"Múltiples dispositivos: {len(devices)}")
        
        # Verificar uso de VPN/Proxy
        for session in logins[-10:]:
            ip_info = session.get('ip_info', {})
            if ip_info.get('is_vpn') or ip_info.get('is_proxy'):
                score += 0.2
                indicators.append("Uso de VPN/Proxy detectado")
                break
        
        # Análisis de red social
        connections = user_history.get('connections', [])
        if connections:
            # Verificar si se conecta principalmente con usuarios reportados
            reported_connections = sum(1 for conn in connections 
                                     if conn.get('other_user_reported', False))
            
            if reported_connections > len(connections) * 0.5:
                score += 0.35
                indicators.append("Conexiones con usuarios reportados")
        
        return min(score, 1.0), indicators

    def _analyze_content_fraud(self, user_data: Dict) -> Tuple[float, List[str]]:
        """Analiza el contenido del perfil para detectar fraude"""
        score = 0.0
        indicators = []
        
        # Análisis de biografía
        bio = user_data.get('bio', '')
        if bio:
            # Biografía genérica/sospechosa
            if self.suspicious_patterns['bio_generic'].search(bio):
                score += 0.2
                indicators.append("Biografía genérica")
            
            # Biografía con enlaces sospechosos
            if re.search(r'(http|www|\.com|\.net)', bio, re.I):
                score += 0.15
                indicators.append("Enlaces en biografía")
            
            # Biografía muy corta o muy larga
            if len(bio) < 10 or len(bio) > 500:
                score += 0.1
                indicators.append("Longitud de biografía anormal")
        
        # Análisis de intereses
        interests = user_data.get('interests', [])
        if interests:
            # Intereses genéricos o contradictorios
            generic_interests = ['music', 'movies', 'travel', 'food', 'sports']
            generic_count = sum(1 for interest in interests 
                              if any(gen in interest.lower() for gen in generic_interests))
            
            if generic_count == len(interests):
                score += 0.15
                indicators.append("Intereses demasiado genéricos")
        
        # Análisis de fotos
        photos = user_data.get('photos', [])
        if len(photos) > 0:
            # Verificar si todas las fotos son similares (posible bot)
            photo_hashes = [photo.get('hash', '') for photo in photos]
            unique_hashes = len(set(photo_hashes))
            
            if unique_hashes < len(photos) * 0.5:
                score += 0.3
                indicators.append("Fotos muy similares")
        
        return min(score, 1.0), indicators

    def _calculate_duplicate_ratio(self, texts: List[str]) -> float:
        """Calcula la ratio de mensajes duplicados"""
        if not texts:
            return 0.0
        
        unique_texts = set(texts)
        return 1 - (len(unique_texts) / len(texts))

    def _calculate_avg_response_time(self, messages: List[Dict]) -> float:
        """Calcula el tiempo promedio de respuesta"""
        if len(messages) < 2:
            return 0.0
        
        response_times = []
        for i in range(1, len(messages)):
            try:
                prev_time = datetime.fromisoformat(messages[i-1].get('timestamp', ''))
                curr_time = datetime.fromisoformat(messages[i].get('timestamp', ''))
                response_time = (curr_time - prev_time).total_seconds() / 60  # minutos
                response_times.append(response_time)
            except:
                continue
        
        return sum(response_times) / len(response_times) if response_times else 0.0

    def _get_risk_level(self, score: float) -> str:
        """Determina el nivel de riesgo basado en el score"""
        if score >= self.risk_thresholds['high']:
            return "high"
        elif score >= self.risk_thresholds['medium']:
            return "medium"
        elif score >= self.risk_thresholds['low']:
            return "low"
        else:
            return "minimal"

    def _generate_fraud_recommendations(self, indicators: List[str], score: float) -> List[str]:
        """Genera recomendaciones basadas en los indicadores de fraude"""
        recommendations = []
        
        if score >= 0.8:
            recommendations.extend([
                "Suspender cuenta temporalmente",
                "Revisar manualmente todos los datos del usuario",
                "Verificar identidad con documentación oficial",
                "Investigar conexiones con otros usuarios reportados"
            ])
        elif score >= 0.6:
            recommendations.extend([
                "Monitorear actividad de cerca",
                "Limitar interacciones temporales",
                "Verificar información del perfil",
                "Aplicar restricciones de mensajería"
            ])
        elif score >= 0.3:
            recommendations.extend([
                "Aumentar supervisión",
                "Verificar fotos del perfil",
                "Monitorear frecuencia de mensajes",
                "Verificar ubicación y dispositivos"
            ])
        else:
            recommendations.extend([
                "Continuar monitoreo normal",
                "Verificar periódicamente",
                "Mantener alertas activas"
            ])
        
        # Recomendaciones específicas por indicadores
        if any("Email temporal" in indicator for indicator in indicators):
            recommendations.append("Solicitar verificación de email permanente")
        
        if any("Múltiples reportes" in indicator for indicator in indicators):
            recommendations.append("Investigar reportes previos")
        
        if any("VPN/Proxy" in indicator for indicator in indicators):
            recommendations.append("Solicitar desactivación de VPN para verificación")
        
        return recommendations

    def _calculate_confidence(self, user_data: Dict, user_history: Dict) -> float:
        """Calcula la confianza del análisis basado en la disponibilidad de datos"""
        confidence_factors = []
        
        # Datos del perfil
        profile_data_weight = 0
        if user_data.get('email'): profile_data_weight += 1
        if user_data.get('photos'): profile_data_weight += 1
        if user_data.get('bio'): profile_data_weight += 1
        if user_data.get('birthDate'): profile_data_weight += 1
        confidence_factors.append(min(profile_data_weight / 4, 1.0))
        
        # Datos de comportamiento
        behavior_data_weight = 0
        if user_history.get('messages'): behavior_data_weight += 1
        if user_history.get('likes'): behavior_data_weight += 1
        if user_history.get('login_sessions'): behavior_data_weight += 1
        if user_history.get('reports_received') is not None: behavior_data_weight += 1
        confidence_factors.append(min(behavior_data_weight / 4, 1.0))
        
        # Datos de red
        network_data_weight = 0
        if user_history.get('devices'): network_data_weight += 1
        if user_history.get('connections'): network_data_weight += 1
        confidence_factors.append(min(network_data_weight / 2, 1.0))
        
        return sum(confidence_factors) / len(confidence_factors)

# Función auxiliar para uso externo
def detect_user_fraud(user_data: Dict, user_history: Dict) -> Dict:
    """Función principal para detectar fraude de usuario"""
    detector = FraudDetector()
    result = detector.analyze_user_fraud_risk(user_data, user_history)
    
    return {
        'fraud_score': result.total_score,
        'risk_level': result.risk_level,
        'indicators': result.indicators,
        'recommendations': result.recommendations,
        'confidence': result.confidence,
        'analyzed_at': datetime.now().isoformat()
    }