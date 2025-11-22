import logging
import hashlib
import uuid
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum

logger = logging.getLogger(__name__)

class ReferralStatus(Enum):
    """Estados de referido"""
    PENDING = "pending"
    COMPLETED = "completed"
    EXPIRED = "expired"
    INVALID = "invalid"

class RewardType(Enum):
    """Tipos de recompensas"""
    SUBSCRIPTION_DISCOUNT = "subscription_discount"
    PREMIUM_FEATURES = "premium_features"
    CASH_CREDIT = "cash_credit"
    FREE_INSURANCE = "free_insurance"
    PROFILE_BOOST = "profile_boost"

@dataclass
class ReferralCode:
    """Código de referido"""
    code: str
    user_id: str
    created_at: datetime
    expires_at: datetime
    max_uses: int
    current_uses: int
    is_active: bool

@dataclass
class Referral:
    """Referido individual"""
    id: str
    referrer_id: str
    referred_id: str
    referral_code: str
    status: ReferralStatus
    created_at: datetime
    completed_at: Optional[datetime]
    reward_earned: Optional[float]
    reward_type: Optional[RewardType]

@dataclass
class Reward:
    """Recompensa"""
    id: str
    user_id: str
    referral_id: str
    reward_type: RewardType
    value: float
    description: str
    expires_at: Optional[datetime]
    is_claimed: bool
    claimed_at: Optional[datetime]

class ReferralSystem:
    def __init__(self):
        # Configuración del sistema de referidos
        self.config = {
            'referral_reward_amount': 10.0,  # €
            'referred_reward_amount': 5.0,   # €
            'code_expiry_days': 30,
            'max_referrals_per_user': 50,
            'min_referrals_for_premium': 10,
            'reward_expiry_days': 90,
            'subscription_discount_percentage': 20,
            'premium_features_duration_days': 30,
            'profile_boost_duration_hours': 24
        }
        
        # Umbrales de recompensas
        self.reward_thresholds = [
            {'referrals': 1, 'reward_type': RewardType.CASH_CREDIT, 'value': 10.0},
            {'referrals': 5, 'reward_type': RewardType.PREMIUM_FEATURES, 'value': 30.0},
            {'referrals': 10, 'reward_type': RewardType.SUBSCRIPTION_DISCOUNT, 'value': 20.0},
            {'referrals': 25, 'reward_type': RewardType.FREE_INSURANCE, 'value': 120.0},
            {'referrals': 50, 'reward_type': RewardType.PROFILE_BOOST, 'value': 50.0}
        ]

    def generate_referral_code(self, user_id: str, custom_code: Optional[str] = None) -> str:
        """Genera un código de referido único para un usuario"""
        try:
            if custom_code:
                # Validar código personalizado
                if not self._is_valid_custom_code(custom_code):
                    raise ValueError("Código personalizado inválido")
                code = custom_code.upper()
            else:
                # Generar código basado en hash
                timestamp = datetime.now().isoformat()
                hash_input = f"{user_id}{timestamp}{uuid.uuid4()}"
                hash_digest = hashlib.sha256(hash_input.encode()).hexdigest()[:8]
                code = hash_digest.upper()
            
            # Verificar que el código no exista
            if self._code_exists(code):
                # Si existe, generar uno nuevo
                return self.generate_referral_code(user_id)
            
            # Crear objeto de código de referido
            referral_code = ReferralCode(
                code=code,
                user_id=user_id,
                created_at=datetime.now(),
                expires_at=datetime.now() + timedelta(days=self.config['code_expiry_days']),
                max_uses=self.config['max_referrals_per_user'],
                current_uses=0,
                is_active=True
            )
            
            # Guardar en base de datos (simulado)
            self._save_referral_code(referral_code)
            
            logger.info(f"Generated referral code {code} for user {user_id}")
            return code
            
        except Exception as e:
            logger.error(f"Error generating referral code: {str(e)}")
            raise

    def process_referral(self, referred_user_id: str, referral_code: str) -> Dict:
        """Procesa un referido cuando un nuevo usuario se registra con un código"""
        try:
            # Validar código
            referral_code_obj = self._get_referral_code(referral_code)
            if not referral_code_obj:
                return {
                    'success': False,
                    'error': 'Código de referido inválido',
                    'referral_id': None
                }
            
            # Verificar que el código esté activo y no expirado
            if not referral_code_obj.is_active:
                return {
                    'success': False,
                    'error': 'Código de referido inactivo',
                    'referral_id': None
                }
            
            if datetime.now() > referral_code_obj.expires_at:
                return {
                    'success': False,
                    'error': 'Código de referido expirado',
                    'referral_id': None
                }
            
            # Verificar límite de usos
            if referral_code_obj.current_uses >= referral_code_obj.max_uses:
                return {
                    'success': False,
                    'error': 'Código de referido alcanzó el límite de usos',
                    'referral_id': None
                }
            
            # Verificar que el usuario no se refiera a sí mismo
            if referral_code_obj.user_id == referred_user_id:
                return {
                    'success': False,
                    'error': 'No puedes referirte a ti mismo',
                    'referral_id': None
                }
            
            # Verificar que el usuario no haya sido referido antes
            if self._user_was_referred(referred_user_id):
                return {
                    'success': False,
                    'error': 'Usuario ya fue referido anteriormente',
                    'referral_id': None
                }
            
            # Crear referido
            referral = Referral(
                id=str(uuid.uuid4()),
                referrer_id=referral_code_obj.user_id,
                referred_id=referred_user_id,
                referral_code=referral_code,
                status=ReferralStatus.PENDING,
                created_at=datetime.now(),
                completed_at=None,
                reward_earned=None,
                reward_type=None
            )
            
            # Guardar referido
            self._save_referral(referral)
            
            # Actualizar contador de usos del código
            referral_code_obj.current_uses += 1
            self._update_referral_code(referral_code_obj)
            
            # Otorgar recompensa inmediata al referido (pequeña bonificación)
            self._reward_referred_user(referred_user_id)
            
            logger.info(f"Processed referral {referral.id} for code {referral_code}")
            
            return {
                'success': True,
                'error': None,
                'referral_id': referral.id,
                'referrer_id': referral_code_obj.user_id
            }
            
        except Exception as e:
            logger.error(f"Error processing referral: {str(e)}")
            return {
                'success': False,
                'error': 'Error procesando referido',
                'referral_id': None
            }

    def complete_referral(self, referral_id: str) -> Dict:
        """Completa un referido cuando el usuario referido cumple los requisitos"""
        try:
            # Obtener referido
            referral = self._get_referral(referral_id)
            if not referral:
                return {
                    'success': False,
                    'error': 'Referido no encontrado'
                }
            
            # Verificar que esté pendiente
            if referral.status != ReferralStatus.PENDING:
                return {
                    'success': False,
                    'error': f'Referido ya está {referral.status.value}'
                }
            
            # Marcar como completado
            referral.status = ReferralStatus.COMPLETED
            referral.completed_at = datetime.now()
            
            # Calcular y otorgar recompensas
            referrer_reward = self._calculate_referrer_reward(referral.referrer_id)
            referred_reward = self._calculate_referred_reward()
            
            # Otorgar recompensas
            self._grant_reward(referral.referrer_id, referral.id, referrer_reward)
            self._grant_reward(referral.referred_id, referral.id, referred_reward)
            
            # Actualizar recompensas en el referido
            referral.reward_earned = referrer_reward['value']
            referral.reward_type = referrer_reward['type']
            
            # Guardar cambios
            self._update_referral(referral)
            
            logger.info(f"Completed referral {referral_id} with rewards")
            
            return {
                'success': True,
                'error': None,
                'referrer_reward': referrer_reward,
                'referred_reward': referred_reward
            }
            
        except Exception as e:
            logger.error(f"Error completing referral: {str(e)}")
            return {
                'success': False,
                'error': 'Error completando referido'
            }

    def get_user_referral_stats(self, user_id: str) -> Dict:
        """Obtiene estadísticas de referidos de un usuario"""
        try:
            # Obtener todos los referidos del usuario
            referrals = self._get_user_referrals(user_id)
            
            # Calcular estadísticas
            total_referrals = len(referrals)
            completed_referrals = sum(1 for r in referrals if r.status == ReferralStatus.COMPLETED)
            pending_referrals = sum(1 for r in referrals if r.status == ReferralStatus.PENDING)
            total_earned = sum(r.reward_earned or 0 for r in referrals if r.reward_earned)
            
            # Calcular próximo umbral de recompensa
            next_threshold = self._get_next_reward_threshold(completed_referrals)
            
            # Obtener recompensas no reclamadas
            unclaimed_rewards = self._get_unclaimed_rewards(user_id)
            
            return {
                'user_id': user_id,
                'total_referrals': total_referrals,
                'completed_referrals': completed_referrals,
                'pending_referrals': pending_referrals,
                'success_rate': completed_referrals / total_referrals if total_referrals > 0 else 0,
                'total_earned': total_earned,
                'unclaimed_rewards': len(unclaimed_rewards),
                'next_reward_threshold': next_threshold,
                'referral_code': self._get_user_active_code(user_id)
            }
            
        except Exception as e:
            logger.error(f"Error getting referral stats: {str(e)}")
            return {
                'user_id': user_id,
                'error': 'Error obteniendo estadísticas'
            }

    def claim_reward(self, user_id: str, reward_id: str) -> Dict:
        """Permite a un usuario reclamar una recompensa"""
        try:
            # Obtener recompensa
            reward = self._get_reward(reward_id)
            if not reward:
                return {
                    'success': False,
                    'error': 'Recompensa no encontrada'
                }
            
            # Verificar que pertenezca al usuario
            if reward.user_id != user_id:
                return {
                    'success': False,
                    'error': 'Recompensa no pertenece al usuario'
                }
            
            # Verificar que no esté reclamada
            if reward.is_claimed:
                return {
                    'success': False,
                    'error': 'Recompensa ya reclamada'
                }
            
            # Verificar que no esté expirada
            if reward.expires_at and datetime.now() > reward.expires_at:
                return {
                    'success': False,
                    'error': 'Recompensa expirada'
                }
            
            # Marcar como reclamada
            reward.is_claimed = True
            reward.claimed_at = datetime.now()
            self._update_reward(reward)
            
            # Aplicar la recompensa según su tipo
            self._apply_reward(user_id, reward)
            
            logger.info(f"User {user_id} claimed reward {reward_id}")
            
            return {
                'success': True,
                'error': None,
                'reward': {
                    'type': reward.reward_type.value,
                    'value': reward.value,
                    'description': reward.description
                }
            }
            
        except Exception as e:
            logger.error(f"Error claiming reward: {str(e)}")
            return {
                'success': False,
                'error': 'Error reclamando recompensa'
            }

    def get_leaderboard(self, limit: int = 10) -> List[Dict]:
        """Obtiene el leaderboard de usuarios con más referidos"""
        try:
            # Obtener usuarios ordenados por referidos completados
            users_stats = self._get_top_referrers(limit)
            
            leaderboard = []
            for i, user_stat in enumerate(users_stats):
                leaderboard.append({
                    'rank': i + 1,
                    'user_id': user_stat['user_id'],
                    'completed_referrals': user_stat['completed_referrals'],
                    'total_earned': user_stat['total_earned'],
                    'success_rate': user_stat['success_rate']
                })
            
            return leaderboard
            
        except Exception as e:
            logger.error(f"Error getting leaderboard: {str(e)}")
            return []

    # Métodos auxiliares (simulación de base de datos)
    def _is_valid_custom_code(self, code: str) -> bool:
        """Valida un código personalizado"""
        return (len(code) >= 4 and len(code) <= 12 and 
                code.isalnum() and not code.isdigit())

    def _code_exists(self, code: str) -> bool:
        """Verifica si un código ya existe"""
        # Simulación - en producción consultar base de datos
        return False

    def _save_referral_code(self, referral_code: ReferralCode):
        """Guarda un código de referido"""
        # Simulación - en producción guardar en base de datos
        pass

    def _get_referral_code(self, code: str) -> Optional[ReferralCode]:
        """Obtiene un código de referido"""
        # Simulación - en producción consultar base de datos
        return None

    def _update_referral_code(self, referral_code: ReferralCode):
        """Actualiza un código de referido"""
        # Simulación - en producción actualizar en base de datos
        pass

    def _user_was_referred(self, user_id: str) -> bool:
        """Verifica si un usuario ya fue referido"""
        # Simulación - en producción consultar base de datos
        return False

    def _save_referral(self, referral: Referral):
        """Guarda un referido"""
        # Simulación - en producción guardar en base de datos
        pass

    def _get_referral(self, referral_id: str) -> Optional[Referral]:
        """Obtiene un referido"""
        # Simulación - en producción consultar base de datos
        return None

    def _update_referral(self, referral: Referral):
        """Actualiza un referido"""
        # Simulación - en producción actualizar en base de datos
        pass

    def _get_user_referrals(self, user_id: str) -> List[Referral]:
        """Obtiene todos los referidos de un usuario"""
        # Simulación - en producción consultar base de datos
        return []

    def _get_user_active_code(self, user_id: str) -> Optional[str]:
        """Obtiene el código activo de un usuario"""
        # Simulación - en producción consultar base de datos
        return None

    def _get_reward(self, reward_id: str) -> Optional[Reward]:
        """Obtiene una recompensa"""
        # Simulación - en producción consultar base de datos
        return None

    def _update_reward(self, reward: Reward):
        """Actualiza una recompensa"""
        # Simulación - en producción actualizar en base de datos
        pass

    def _get_unclaimed_rewards(self, user_id: str) -> List[Reward]:
        """Obtiene recompensas no reclamadas de un usuario"""
        # Simulación - en producción consultar base de datos
        return []

    def _get_top_referrers(self, limit: int) -> List[Dict]:
        """Obtiene los usuarios con más referidos"""
        # Simulación - en producción consultar base de datos
        return []

    def _reward_referred_user(self, user_id: str):
        """Otorga una pequeña recompensa al usuario referido"""
        # Crear recompensa de bienvenida
        welcome_reward = Reward(
            id=str(uuid.uuid4()),
            user_id=user_id,
            referral_id="welcome",
            reward_type=RewardType.PREMIUM_FEATURES,
            value=7.0,  # 7 días de premium
            description="Bienvenida por unirte con un código de referido",
            expires_at=datetime.now() + timedelta(days=30),
            is_claimed=False,
            claimed_at=None
        )
        self._save_reward(welcome_reward)

    def _calculate_referrer_reward(self, referrer_id: str) -> Dict:
        """Calcula la recompensa para el usuario que refiere"""
        # Obtener cantidad de referidos completados
        referrals = self._get_user_referrals(referrer_id)
        completed_count = sum(1 for r in referrals if r.status == ReferralStatus.COMPLETED)
        
        # Determinar recompensa según umbral
        for threshold in reversed(self.reward_thresholds):
            if completed_count >= threshold['referrals']:
                return {
                    'type': threshold['reward_type'],
                    'value': threshold['value'],
                    'description': f"Recompensa por {threshold['referrals']} referidos"
                }
        
        # Recompensa por defecto
        return {
            'type': RewardType.CASH_CREDIT,
            'value': self.config['referral_reward_amount'],
            'description': "Recompensa por referido completado"
        }

    def _calculate_referred_reward(self) -> Dict:
        """Calcula la recompensa para el usuario referido"""
        return {
            'type': RewardType.CASH_CREDIT,
            'value': self.config['referred_reward_amount'],
            'description': "Bono por completar tu registro con un código de referido"
        }

    def _grant_reward(self, user_id: str, referral_id: str, reward_data: Dict):
        """Otorga una recompensa a un usuario"""
        reward = Reward(
            id=str(uuid.uuid4()),
            user_id=user_id,
            referral_id=referral_id,
            reward_type=reward_data['type'],
            value=reward_data['value'],
            description=reward_data['description'],
            expires_at=datetime.now() + timedelta(days=self.config['reward_expiry_days']),
            is_claimed=False,
            claimed_at=None
        )
        self._save_reward(reward)

    def _save_reward(self, reward: Reward):
        """Guarda una recompensa"""
        # Simulación - en producción guardar en base de datos
        pass

    def _apply_reward(self, user_id: str, reward: Reward):
        """Aplica una recompensa al usuario"""
        # Aquí se implementaría la lógica específica para cada tipo de recompensa
        # Por ejemplo:
        # - Crédito en cuenta: actualizar balance del usuario
        # - Descuento en suscripción: aplicar descuento en próximo pago
        # - Premium features: activar features premium por X días
        # - Profile boost: activar boost de perfil por X horas
        pass

    def _get_next_reward_threshold(self, current_referrals: int) -> Optional[Dict]:
        """Obtiene el próximo umbral de recompensa"""
        for threshold in self.reward_thresholds:
            if current_referrals < threshold['referrals']:
                return threshold
        return None

# Funciones auxiliares para uso externo
def generate_user_referral_code(user_id: str, custom_code: Optional[str] = None) -> str:
    """Genera un código de referido para un usuario"""
    system = ReferralSystem()
    return system.generate_referral_code(user_id, custom_code)

def process_user_referral(referred_user_id: str, referral_code: str) -> Dict:
    """Procesa un referido"""
    system = ReferralSystem()
    return system.process_referral(referred_user_id, referral_code)

def complete_user_referral(referral_id: str) -> Dict:
    """Completa un referido"""
    system = ReferralSystem()
    return system.complete_referral(referral_id)

def get_user_referral_statistics(user_id: str) -> Dict:
    """Obtiene estadísticas de referidos de un usuario"""
    system = ReferralSystem()
    return system.get_user_referral_stats(user_id)

def claim_user_reward(user_id: str, reward_id: str) -> Dict:
    """Reclama una recompensa"""
    system = ReferralSystem()
    return system.claim_reward(user_id, reward_id)

def get_referral_leaderboard(limit: int = 10) -> List[Dict]:
    """Obtiene el leaderboard de referidos"""
    system = ReferralSystem()
    return system.get_leaderboard(limit)