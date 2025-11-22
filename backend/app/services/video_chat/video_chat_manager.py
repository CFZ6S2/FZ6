import logging
import uuid
import asyncio
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Set, Any
from dataclasses import dataclass, field
from enum import Enum
import random
import string

logger = logging.getLogger(__name__)

class CallStatus(Enum):
    INITIATED = "initiated"
    RINGING = "ringing"
    CONNECTED = "connected"
    DISCONNECTED = "disconnected"
    FAILED = "failed"
    TIMEOUT = "timeout"

class CallQuality(Enum):
    EXCELLENT = "excellent"
    GOOD = "good"
    FAIR = "fair"
    POOR = "poor"

class RecordingStatus(Enum):
    NOT_RECORDING = "not_recording"
    RECORDING = "recording"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"

@dataclass
class CallParticipant:
    user_id: str
    display_name: str
    joined_at: datetime
    left_at: Optional[datetime] = None
    is_host: bool = False
    audio_enabled: bool = True
    video_enabled: bool = True
    connection_quality: CallQuality = CallQuality.GOOD
    network_stats: Dict = field(default_factory=dict)

@dataclass
class VideoCall:
    call_id: str
    room_id: str
    participants: Dict[str, CallParticipant] = field(default_factory=dict)
    status: CallStatus = CallStatus.INITIATED
    started_at: datetime = field(default_factory=datetime.now)
    ended_at: Optional[datetime] = None
    max_participants: int = 2  # EXCLUSIVAMENTE 1-A-1
    is_private: bool = True
    recording_status: RecordingStatus = RecordingStatus.NOT_RECORDING
    recording_url: Optional[str] = None
    quality_metrics: Dict = field(default_factory=dict)
    security_flags: List[str] = field(default_factory=list)

@dataclass
class CallInvitation:
    invitation_id: str
    call_id: str
    caller_id: str
    callee_id: str
    created_at: datetime
    expires_at: datetime
    status: str = "pending"  # pending, accepted, rejected, expired
    accepted_at: Optional[datetime] = None

class WebRTCVideoChatManager:
    """
    Sistema de video chat seguro con WebRTC para TuCitaSegura
    """
    
    def __init__(self):
        self.active_calls: Dict[str, VideoCall] = {}
        self.call_invitations: Dict[str, CallInvitation] = {}
        self.user_sessions: Dict[str, Set[str]] = {}  # user_id -> set of call_ids
        self.ice_servers = self._get_default_ice_servers()
        self.call_recordings: Dict[str, Dict] = {}
        
        # Configuración de seguridad
        self.security_config = {
            'max_call_duration_minutes': 120,
            'invitation_timeout_seconds': 60,
            'max_participants_per_call': 2,  # EXCLUSIVAMENTE 1-A-1
            'enable_recording': True,
            'require_mutual_consent': True,
            'enable_moderation': True,
            'block_screen_recording': True
        }
        
        # Configuración de calidad
        self.quality_config = {
            'preferred_video_codec': 'VP8',
            'preferred_audio_codec': 'opus',
            'max_video_bitrate': 2000000,  # 2 Mbps
            'max_audio_bitrate': 128000,   # 128 kbps
            'enable_simulcast': True,
            'adaptive_bitrate': True
        }
        
        # Métricas del sistema
        self.system_metrics = {
            'total_calls_created': 0,
            'total_call_duration': 0,
            'average_call_quality': 0.0,
            'successful_connections': 0,
            'failed_connections': 0
        }
    
    def _get_default_ice_servers(self) -> List[Dict]:
        """Obtener servidores ICE por defecto para WebRTC"""
        return [
            {
                'urls': ['stun:stun.l.google.com:19302'],
                'username': '',
                'credential': ''
            },
            {
                'urls': ['stun:stun1.l.google.com:19302'],
                'username': '',
                'credential': ''
            }
            # En producción, agregar servidores TURN con autenticación
        ]
    
    def create_call_room(self, host_user_id: str, display_name: str, 
                        max_participants: int = 2, is_private: bool = True) -> Dict:
        """Crear una nueva sala de video chat"""
        try:
            call_id = str(uuid.uuid4())
            room_id = self._generate_room_id()
            
            # Crear objeto de llamada
            call = VideoCall(
                call_id=call_id,
                room_id=room_id,
                max_participants=max_participants,
                is_private=is_private
            )
            
            # Agregar host como primer participante
            host_participant = CallParticipant(
                user_id=host_user_id,
                display_name=display_name,
                joined_at=datetime.now(),
                is_host=True
            )
            call.participants[host_user_id] = host_participant
            
            # Almacenar llamada activa
            self.active_calls[call_id] = call
            
            # Actualizar sesiones del usuario
            if host_user_id not in self.user_sessions:
                self.user_sessions[host_user_id] = set()
            self.user_sessions[host_user_id].add(call_id)
            
            # Actualizar métricas
            self.system_metrics['total_calls_created'] += 1
            
            logger.info(f"Sala de video chat creada: {call_id} por usuario {host_user_id}")
            
            return {
                'call_id': call_id,
                'room_id': room_id,
                'ice_servers': self.ice_servers,
                'rtc_config': self._get_rtc_configuration(),
                'join_url': f"/video-chat/join/{room_id}",
                'host_controls': self._get_host_controls(host_user_id, call_id)
            }
            
        except Exception as e:
            logger.error(f"Error creando sala de video chat: {str(e)}")
            raise
    
    def _generate_room_id(self) -> str:
        """Generar ID de sala único y fácil de recordar"""
        # Generar ID alfanumérico de 8 caracteres
        return ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
    
    def _get_rtc_configuration(self) -> Dict:
        """Obtener configuración de WebRTC"""
        return {
            'iceServers': self.ice_servers,
            'bundlePolicy': 'max-bundle',
            'rtcpMuxPolicy': 'require',
            'iceCandidatePoolSize': 10
        }
    
    def _get_host_controls(self, user_id: str, call_id: str) -> List[str]:
        """Obtener controles disponibles para el host"""
        return [
            'mute_participants',
            'remove_participants',
            'start_recording',
            'stop_recording',
            'end_call',
            'lock_room',
            'enable_waiting_room'
        ]
    
    def invite_to_call(self, call_id: str, caller_user_id: str, 
                      callee_user_id: str, callee_display_name: str) -> Dict:
        """Invitar a un usuario a unirse a una llamada"""
        try:
            # Verificar que la llamada existe
            if call_id not in self.active_calls:
                raise ValueError("Llamada no encontrada")
            
            call = self.active_calls[call_id]
            
            # Verificar que el invitador es participante
            if caller_user_id not in call.participants:
                raise ValueError("Usuario no es participante de la llamada")
            
            # Verificar cupo
            if len(call.participants) >= call.max_participants:
                raise ValueError("Llamada está llena")
            
            # Verificar que no haya invitación pendiente
            existing_invitations = [
                inv for inv in self.call_invitations.values()
                if inv.call_id == call_id and inv.callee_id == callee_user_id and inv.status == "pending"
            ]
            
            if existing_invitations:
                raise ValueError("Usuario ya tiene invitación pendiente para esta llamada")
            
            # Crear invitación
            invitation_id = str(uuid.uuid4())
            expires_at = datetime.now() + timedelta(seconds=self.security_config['invitation_timeout_seconds'])
            
            invitation = CallInvitation(
                invitation_id=invitation_id,
                call_id=call_id,
                caller_id=caller_user_id,
                callee_id=callee_user_id,
                created_at=datetime.now(),
                expires_at=expires_at
            )
            
            self.call_invitations[invitation_id] = invitation
            
            logger.info(f"Invitación creada: {invitation_id} para usuario {callee_user_id}")
            
            return {
                'invitation_id': invitation_id,
                'call_id': call_id,
                'room_id': call.room_id,
                'expires_at': expires_at.isoformat(),
                'caller_info': {
                    'user_id': caller_user_id,
                    'display_name': call.participants[caller_user_id].display_name
                }
            }
            
        except Exception as e:
            logger.error(f"Error creando invitación: {str(e)}")
            raise
    
    def accept_call_invitation(self, invitation_id: str, user_id: str, 
                             display_name: str) -> Dict:
        """Aceptar invitación a una llamada"""
        try:
            # Verificar que la invitación existe
            if invitation_id not in self.call_invitations:
                raise ValueError("Invitación no encontrada")
            
            invitation = self.call_invitations[invitation_id]
            
            # Verificar que el usuario es el destinatario
            if invitation.callee_id != user_id:
                raise ValueError("Invitación no pertenece a este usuario")
            
            # Verificar que no haya expirado
            if datetime.now() > invitation.expires_at:
                invitation.status = "expired"
                raise ValueError("Invitación expirada")
            
            # Verificar que la llamada existe y tiene espacio
            call_id = invitation.call_id
            if call_id not in self.active_calls:
                raise ValueError("Llamada no encontrada")
            
            call = self.active_calls[call_id]
            
            if len(call.participants) >= call.max_participants:
                raise ValueError("Llamada está llena")
            
            # Actualizar invitación
            invitation.status = "accepted"
            invitation.accepted_at = datetime.now()
            
            # Agregar participante a la llamada
            participant = CallParticipant(
                user_id=user_id,
                display_name=display_name,
                joined_at=datetime.now()
            )
            call.participants[user_id] = participant
            
            # Actualizar sesiones del usuario
            if user_id not in self.user_sessions:
                self.user_sessions[user_id] = set()
            self.user_sessions[user_id].add(call_id)
            
            # Actualizar métricas
            self.system_metrics['successful_connections'] += 1
            
            logger.info(f"Invitación aceptada: {invitation_id} por usuario {user_id}")
            
            return {
                'call_id': call_id,
                'room_id': call.room_id,
                'ice_servers': self.ice_servers,
                'rtc_config': self._get_rtc_configuration(),
                'participants': self._get_participants_info(call_id),
                'call_controls': self._get_call_controls(user_id, call_id)
            }
            
        except Exception as e:
            logger.error(f"Error aceptando invitación: {str(e)}")
            raise
    
    def reject_call_invitation(self, invitation_id: str, user_id: str) -> bool:
        """Rechazar invitación a una llamada"""
        try:
            if invitation_id not in self.call_invitations:
                return False
            
            invitation = self.call_invitations[invitation_id]
            
            # Verificar que el usuario es el destinatario
            if invitation.callee_id != user_id:
                return False
            
            invitation.status = "rejected"
            
            logger.info(f"Invitación rechazada: {invitation_id} por usuario {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error rechazando invitación: {str(e)}")
            return False
    
    def _get_participants_info(self, call_id: str) -> List[Dict]:
        """Obtener información de participantes"""
        if call_id not in self.active_calls:
            return []
        
        call = self.active_calls[call_id]
        participants_info = []
        
        for participant in call.participants.values():
            participants_info.append({
                'user_id': participant.user_id,
                'display_name': participant.display_name,
                'is_host': participant.is_host,
                'audio_enabled': participant.audio_enabled,
                'video_enabled': participant.video_enabled,
                'connection_quality': participant.connection_quality.value,
                'joined_at': participant.joined_at.isoformat()
            })
        
        return participants_info
    
    def _get_call_controls(self, user_id: str, call_id: str) -> List[str]:
        """Obtener controles disponibles para el usuario"""
        if call_id not in self.active_calls:
            return []
        
        call = self.active_calls[call_id]
        controls = []
        
        # Controles básicos para todos los participantes
        controls.extend([
            'toggle_audio',
            'toggle_video',
            'share_screen',
            'leave_call'
        ])
        
        # Controles adicionales para el host
        if user_id in call.participants and call.participants[user_id].is_host:
            controls.extend([
                'mute_participants',
                'remove_participants',
                'start_recording',
                'stop_recording',
                'end_call'
            ])
        
        return controls
    
    def update_participant_status(self, call_id: str, user_id: str, 
                                 audio_enabled: Optional[bool] = None,
                                 video_enabled: Optional[bool] = None) -> bool:
        """Actualizar estado de participante"""
        try:
            if call_id not in self.active_calls:
                return False
            
            call = self.active_calls[call_id]
            
            if user_id not in call.participants:
                return False
            
            participant = call.participants[user_id]
            
            if audio_enabled is not None:
                participant.audio_enabled = audio_enabled
            
            if video_enabled is not None:
                participant.video_enabled = video_enabled
            
            logger.info(f"Estado de participante actualizado: {user_id} en llamada {call_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error actualizando estado de participante: {str(e)}")
            return False
    
    def start_call_recording(self, call_id: str, user_id: str) -> Dict:
        """Iniciar grabación de llamada"""
        try:
            if call_id not in self.active_calls:
                raise ValueError("Llamada no encontrada")
            
            call = self.active_calls[call_id]
            
            # Verificar permisos
            if not call.participants[user_id].is_host:
                raise ValueError("Solo el host puede iniciar grabación")
            
            if call.recording_status == RecordingStatus.RECORDING:
                raise ValueError("Grabación ya está en curso")
            
            # Iniciar grabación (en producción, integrar con servicio real)
            recording_id = str(uuid.uuid4())
            call.recording_status = RecordingStatus.RECORDING
            
            # Almacenar información de grabación
            self.call_recordings[recording_id] = {
                'call_id': call_id,
                'started_by': user_id,
                'started_at': datetime.now(),
                'status': 'recording',
                'participants': list(call.participants.keys())
            }
            
            logger.info(f"Grabación iniciada: {recording_id} para llamada {call_id}")
            
            return {
                'recording_id': recording_id,
                'call_id': call_id,
                'started_at': datetime.now().isoformat(),
                'participants': list(call.participants.keys())
            }
            
        except Exception as e:
            logger.error(f"Error iniciando grabación: {str(e)}")
            raise
    
    def stop_call_recording(self, call_id: str, user_id: str) -> Dict:
        """Detener grabación de llamada"""
        try:
            if call_id not in self.active_calls:
                raise ValueError("Llamada no encontrada")
            
            call = self.active_calls[call_id]
            
            # Verificar permisos
            if not call.participants[user_id].is_host:
                raise ValueError("Solo el host puede detener grabación")
            
            if call.recording_status != RecordingStatus.RECORDING:
                raise ValueError("No hay grabación en curso")
            
            # Detener grabación
            call.recording_status = RecordingStatus.COMPLETED
            
            # Actualizar información de grabación
            recording_info = None
            for rec_id, rec_data in self.call_recordings.items():
                if rec_data['call_id'] == call_id and rec_data['status'] == 'recording':
                    rec_data['status'] = 'completed'
                    rec_data['ended_at'] = datetime.now()
                    rec_data['duration_seconds'] = (datetime.now() - rec_data['started_at']).total_seconds()
                    recording_info = rec_data
                    break
            
            logger.info(f"Grabación detenida para llamada {call_id}")
            
            return {
                'call_id': call_id,
                'ended_at': datetime.now().isoformat(),
                'recording_info': recording_info
            }
            
        except Exception as e:
            logger.error(f"Error deteniendo grabación: {str(e)}")
            raise
    
    def end_call(self, call_id: str, user_id: str) -> Dict:
        """Finalizar llamada"""
        try:
            if call_id not in self.active_calls:
                raise ValueError("Llamada no encontrada")
            
            call = self.active_calls[call_id]
            
            # Verificar permisos
            if not call.participants[user_id].is_host:
                raise ValueError("Solo el host puede finalizar la llamada")
            
            # Actualizar estado de la llamada
            call.status = CallStatus.DISCONNECTED
            call.ended_at = datetime.now()
            
            # Actualizar hora de salida de todos los participantes
            for participant in call.participants.values():
                if participant.left_at is None:
                    participant.left_at = datetime.now()
            
            # Calcular duración total
            duration_seconds = (call.ended_at - call.started_at).total_seconds()
            self.system_metrics['total_call_duration'] += duration_seconds
            
            # Limpiar sesiones de usuarios
            for participant in call.participants.values():
                if participant.user_id in self.user_sessions:
                    self.user_sessions[participant.user_id].discard(call_id)
            
            logger.info(f"Llamada finalizada: {call_id} por usuario {user_id}")
            
            return {
                'call_id': call_id,
                'ended_at': call.ended_at.isoformat(),
                'duration_seconds': duration_seconds,
                'final_participants': len(call.participants),
                'quality_metrics': call.quality_metrics
            }
            
        except Exception as e:
            logger.error(f"Error finalizando llamada: {str(e)}")
            raise
    
    def leave_call(self, call_id: str, user_id: str) -> Dict:
        """Abandonar llamada"""
        try:
            if call_id not in self.active_calls:
                raise ValueError("Llamada no encontrada")
            
            call = self.active_calls[call_id]
            
            if user_id not in call.participants:
                raise ValueError("Usuario no es participante de la llamada")
            
            # Actualizar participante
            participant = call.participants[user_id]
            participant.left_at = datetime.now()
            
            # Remover de sesiones del usuario
            if user_id in self.user_sessions:
                self.user_sessions[user_id].discard(call_id)
            
            # Si el host abandona, finalizar llamada
            if participant.is_host:
                return self.end_call(call_id, user_id)
            
            logger.info(f"Usuario {user_id} abandonó llamada {call_id}")
            
            return {
                'call_id': call_id,
                'left_at': participant.left_at.isoformat(),
                'remaining_participants': len([p for p in call.participants.values() if p.left_at is None])
            }
            
        except Exception as e:
            logger.error(f"Error abandonando llamada: {str(e)}")
            raise
    
    def update_call_quality(self, call_id: str, user_id: str, 
                           quality_metrics: Dict) -> bool:
        """Actualizar métricas de calidad de la llamada"""
        try:
            if call_id not in self.active_calls:
                return False
            
            call = self.active_calls[call_id]
            
            if user_id not in call.participants:
                return False
            
            # Actualizar métricas de calidad del participante
            participant = call.participants[user_id]
            participant.connection_quality = CallQuality(quality_metrics.get('overall_quality', 'good'))
            participant.network_stats = quality_metrics.get('network_stats', {})
            
            # Actualizar métricas generales de la llamada
            call.quality_metrics[user_id] = quality_metrics
            
            return True
            
        except Exception as e:
            logger.error(f"Error actualizando calidad de llamada: {str(e)}")
            return False
    
    def get_call_info(self, call_id: str) -> Dict:
        """Obtener información detallada de una llamada"""
        try:
            if call_id not in self.active_calls:
                return {}
            
            call = self.active_calls[call_id]
            
            return {
                'call_id': call_id,
                'room_id': call.room_id,
                'status': call.status.value,
                'started_at': call.started_at.isoformat(),
                'ended_at': call.ended_at.isoformat() if call.ended_at else None,
                'duration_seconds': (call.ended_at - call.started_at).total_seconds() if call.ended_at else None,
                'max_participants': call.max_participants,
                'current_participants': len([p for p in call.participants.values() if p.left_at is None]),
                'total_participants': len(call.participants),
                'is_private': call.is_private,
                'recording_status': call.recording_status.value,
                'recording_url': call.recording_url,
                'participants': self._get_participants_info(call_id),
                'quality_metrics': call.quality_metrics,
                'security_flags': call.security_flags
            }
            
        except Exception as e:
            logger.error(f"Error obteniendo información de llamada: {str(e)}")
            return {}
    
    def get_user_active_calls(self, user_id: str) -> List[Dict]:
        """Obtener llamadas activas de un usuario"""
        try:
            if user_id not in self.user_sessions:
                return []
            
            user_calls = []
            for call_id in self.user_sessions[user_id]:
                if call_id in self.active_calls:
                    call = self.active_calls[call_id]
                    user_calls.append({
                        'call_id': call_id,
                        'room_id': call.room_id,
                        'status': call.status.value,
                        'is_host': call.participants[user_id].is_host if user_id in call.participants else False,
                        'joined_at': call.participants[user_id].joined_at.isoformat() if user_id in call.participants else None,
                        'current_participants': len([p for p in call.participants.values() if p.left_at is None])
                    })
            
            return user_calls
            
        except Exception as e:
            logger.error(f"Error obteniendo llamadas activas del usuario: {str(e)}")
            return []
    
    def get_system_statistics(self) -> Dict:
        """Obtener estadísticas del sistema de video chat"""
        try:
            active_calls_count = len(self.active_calls)
            total_participants = sum(len(call.participants) for call in self.active_calls.values())
            
            # Calcular tasa de éxito de conexiones
            total_connections = self.system_metrics['successful_connections'] + self.system_metrics['failed_connections']
            success_rate = (self.system_metrics['successful_connections'] / total_connections * 100) if total_connections > 0 else 0
            
            # Calcular duración promedio
            avg_duration = (self.system_metrics['total_call_duration'] / self.system_metrics['total_calls_created']) if self.system_metrics['total_calls_created'] > 0 else 0
            
            return {
                'active_calls': active_calls_count,
                'total_participants': total_participants,
                'total_calls_created': self.system_metrics['total_calls_created'],
                'successful_connections': self.system_metrics['successful_connections'],
                'failed_connections': self.system_metrics['failed_connections'],
                'connection_success_rate': success_rate,
                'total_call_duration_seconds': self.system_metrics['total_call_duration'],
                'average_call_duration_seconds': avg_duration,
                'active_invitations': len([inv for inv in self.call_invitations.values() if inv.status == "pending"]),
                'total_recordings': len([rec for rec in self.call_recordings.values() if rec['status'] == 'completed'])
            }
            
        except Exception as e:
            logger.error(f"Error obteniendo estadísticas del sistema: {str(e)}")
            return {}
    
    def cleanup_expired_invitations(self) -> int:
        """Limpiar invitaciones expiradas"""
        try:
            expired_count = 0
            current_time = datetime.now()
            
            expired_invitations = [
                inv_id for inv_id, invitation in self.call_invitations.items()
                if invitation.status == "pending" and current_time > invitation.expires_at
            ]
            
            for inv_id in expired_invitations:
                self.call_invitations[inv_id].status = "expired"
                expired_count += 1
            
            logger.info(f"Invitaciones expiradas limpiadas: {expired_count}")
            return expired_count
            
        except Exception as e:
            logger.error(f"Error limpiando invitaciones expiradas: {str(e)}")
            return 0
    
    def moderate_call_content(self, call_id: str, user_id: str, 
                            content_type: str, content_data: Dict) -> Dict:
        """Moderar contenido de la llamada"""
        try:
            if call_id not in self.active_calls:
                return {'action': 'block', 'reason': 'call_not_found'}
            
            call = self.active_calls[call_id]
            
            if user_id not in call.participants:
                return {'action': 'block', 'reason': 'user_not_in_call'}
            
            # Análisis de contenido (placeholder para implementación real)
            moderation_result = {
                'action': 'allow',  # allow, warn, block
                'reason': '',
                'confidence': 0.95,
                'suggested_action': None
            }
            
            # Ejemplos de moderación (en producción, usar servicios de IA)
            if content_type == 'screen_share':
                # Verificar que no esté compartiendo información personal
                moderation_result['action'] = 'allow'
            
            elif content_type == 'chat_message':
                # Moderar mensajes de chat
                message_text = content_data.get('text', '')
                if len(message_text) > 500:
                    moderation_result['action'] = 'warn'
                    moderation_result['reason'] = 'message_too_long'
            
            elif content_type == 'virtual_background':
                # Verificar que el fondo virtual sea apropiado
                moderation_result['action'] = 'allow'
            
            # Registrar evento de moderación
            if moderation_result['action'] != 'allow':
                call.security_flags.append({
                    'type': 'content_moderation',
                    'user_id': user_id,
                    'content_type': content_type,
                    'action': moderation_result['action'],
                    'reason': moderation_result['reason'],
                    'timestamp': datetime.now().isoformat()
                })
            
            return moderation_result
            
        except Exception as e:
            logger.error(f"Error moderando contenido: {str(e)}")
            return {'action': 'block', 'reason': 'moderation_error'}

# Instancia global del gestor de video chat
video_chat_manager = WebRTCVideoChatManager()

def create_video_call_room(host_user_id: str, display_name: str, 
                          max_participants: int = 2, is_private: bool = True) -> Dict:
    """
    Crear una nueva sala de video chat
    
    Args:
        host_user_id: ID del usuario que crea la sala
        display_name: Nombre para mostrar del host
        max_participants: Máximo número de participantes (default: 2)
        is_private: Si la sala es privada (default: True)
    
    Returns:
        Dict con información de la sala creada
    """
    try:
        return video_chat_manager.create_call_room(
            host_user_id=host_user_id,
            display_name=display_name,
            max_participants=max_participants,
            is_private=is_private
        )
    except Exception as e:
        logger.error(f"Error creando sala de video chat: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }

def invite_user_to_call(call_id: str, caller_user_id: str, 
                       callee_user_id: str, callee_display_name: str) -> Dict:
    """
    Invitar a un usuario a unirse a una llamada
    
    Args:
        call_id: ID de la llamada
        caller_user_id: ID del usuario que invita
        callee_user_id: ID del usuario invitado
        callee_display_name: Nombre para mostrar del invitado
    
    Returns:
        Dict con información de la invitación
    """
    try:
        return video_chat_manager.invite_to_call(
            call_id=call_id,
            caller_user_id=caller_user_id,
            callee_user_id=callee_user_id,
            callee_display_name=callee_display_name
        )
    except Exception as e:
        logger.error(f"Error invitando usuario a llamada: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }

def accept_call_invitation(invitation_id: str, user_id: str, 
                          display_name: str) -> Dict:
    """
    Aceptar invitación a una llamada
    
    Args:
        invitation_id: ID de la invitación
        user_id: ID del usuario que acepta
        display_name: Nombre para mostrar
    
    Returns:
        Dict con información para unirse a la llamada
    """
    try:
        return video_chat_manager.accept_call_invitation(
            invitation_id=invitation_id,
            user_id=user_id,
            display_name=display_name
        )
    except Exception as e:
        logger.error(f"Error aceptando invitación: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }

def get_call_information(call_id: str) -> Dict:
    """
    Obtener información detallada de una llamada
    
    Args:
        call_id: ID de la llamada
    
    Returns:
        Dict con información de la llamada
    """
    try:
        return video_chat_manager.get_call_info(call_id)
    except Exception as e:
        logger.error(f"Error obteniendo información de llamada: {str(e)}")
        return {}

def get_user_video_calls(user_id: str) -> List[Dict]:
    """
    Obtener llamadas de video activas de un usuario
    
    Args:
        user_id: ID del usuario
    
    Returns:
        Lista de llamadas del usuario
    """
    try:
        return video_chat_manager.get_user_active_calls(user_id)
    except Exception as e:
        logger.error(f"Error obteniendo llamadas del usuario: {str(e)}")
        return []

def end_video_call(call_id: str, user_id: str) -> Dict:
    """
    Finalizar llamada de video
    
    Args:
        call_id: ID de la llamada
        user_id: ID del usuario que finaliza
    
    Returns:
        Dict con información de la finalización
    """
    try:
        return video_chat_manager.end_call(call_id, user_id)
    except Exception as e:
        logger.error(f"Error finalizando llamada: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }

def start_call_recording(call_id: str, user_id: str) -> Dict:
    """
    Iniciar grabación de llamada
    
    Args:
        call_id: ID de la llamada
        user_id: ID del usuario (debe ser host)
    
    Returns:
        Dict con información de la grabación
    """
    try:
        return video_chat_manager.start_call_recording(call_id, user_id)
    except Exception as e:
        logger.error(f"Error iniciando grabación: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }

def stop_call_recording(call_id: str, user_id: str) -> Dict:
    """
    Detener grabación de llamada
    
    Args:
        call_id: ID de la llamada
        user_id: ID del usuario (debe ser host)
    
    Returns:
        Dict con información de la grabación detenida
    """
    try:
        return video_chat_manager.stop_call_recording(call_id, user_id)
    except Exception as e:
        logger.error(f"Error deteniendo grabación: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }

def get_video_chat_statistics() -> Dict:
    """
    Obtener estadísticas del sistema de video chat
    
    Returns:
        Dict con estadísticas del sistema
    """
    try:
        return video_chat_manager.get_system_statistics()
    except Exception as e:
        logger.error(f"Error obteniendo estadísticas: {str(e)}")
        return {}

def moderate_call_content(call_id: str, user_id: str, 
                         content_type: str, content_data: Dict) -> Dict:
    """
    Moderar contenido de la llamada
    
    Args:
        call_id: ID de la llamada
        user_id: ID del usuario
        content_type: Tipo de contenido (screen_share, chat_message, virtual_background)
        content_data: Datos del contenido
    
    Returns:
        Dict con resultado de la moderación
    """
    try:
        return video_chat_manager.moderate_call_content(
            call_id=call_id,
            user_id=user_id,
            content_type=content_type,
            content_data=content_data
        )
    except Exception as e:
        logger.error(f"Error moderando contenido: {str(e)}")
        return {
            'action': 'block',
            'reason': 'moderation_error'
        }