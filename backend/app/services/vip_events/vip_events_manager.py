import logging
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum
import random

logger = logging.getLogger(__name__)

class EventType(Enum):
    WINE_TASTING = "wine_tasting"
    COOKING_CLASS = "cooking_class"
    ART_GALLERY = "art_gallery"
    NETWORKING_MIXER = "networking_mixer"
    OUTDOOR_ADVENTURE = "outdoor_adventure"
    CULTURAL_EXPERIENCE = "cultural_experience"
    MUSICAL_EVENT = "musical_event"
    SPORTS_ACTIVITY = "sports_activity"
    TRAVEL_EXPERIENCE = "travel_experience"
    LUXURY_DINING = "luxury_dining"

class EventStatus(Enum):
    PLANNING = "planning"
    OPEN = "open"
    FULL = "full"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class TicketTier(Enum):
    STANDARD = "standard"
    PREMIUM = "premium"
    VIP = "vip"
    PLATINUM = "platinum"

@dataclass
class EventLocation:
    name: str
    address: str
    city: str
    coordinates: Tuple[float, float]
    venue_type: str
    capacity: int
    accessibility_features: List[str] = field(default_factory=list)
    parking_available: bool = True
    public_transport_access: bool = True

@dataclass
class EventTicket:
    id: str
    event_id: str
    user_id: str
    tier: TicketTier
    price: float
    purchase_date: datetime
    status: str = "active"
    check_in_time: Optional[datetime] = None
    companion_ticket: Optional[str] = None

@dataclass
class VIPEvent:
    id: str
    title: str
    description: str
    event_type: EventType
    location: EventLocation
    start_time: datetime
    end_time: datetime
    max_attendees: int
    current_attendees: int
    ticket_tiers: Dict[TicketTier, float]
    status: EventStatus
    organizer_id: str
    featured: bool = False
    requirements: List[str] = field(default_factory=list)
    amenities: List[str] = field(default_factory=list)
    matching_criteria: Dict = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.now)

class VIPEventsManager:
    """
    Sistema de gestión de eventos VIP exclusivos para TuCitaSegura
    """
    
    def __init__(self):
        self.events: Dict[str, VIPEvent] = {}
        self.tickets: Dict[str, EventTicket] = {}
        self.user_events: Dict[str, List[str]] = {}
        
        # Configuración de eventos
        self.event_templates = self._load_event_templates()
        self.matching_weights = {
            'age_compatibility': 0.3,
            'interests_overlap': 0.4,
            'location_proximity': 0.2,
            'personality_match': 0.1
        }
    
    def _load_event_templates(self) -> Dict[EventType, Dict]:
        """Cargar plantillas de eventos predefinidas"""
        return {
            EventType.WINE_TASTING: {
                'title_template': "Cata de Vinos Exclusiva {location}",
                'description_template': "Descubre vinos excepcionales en compañía de personas sofisticadas",
                'duration_hours': 3,
                'typical_capacity': 20,
                'amenities': ['wine_selection', 'sommelier_guide', 'appetizers', 'tasting_notes'],
                'requirements': ['age_21+', 'business_casual']
            },
            EventType.COOKING_CLASS: {
                'title_template': "Clase de Cocina Gourmet: {theme}",
                'description_template': "Aprende técnicas culinarias mientras conoces gente interesante",
                'duration_hours': 4,
                'typical_capacity': 16,
                'amenities': ['professional_kitchen', 'ingredients', 'recipes', 'wine_pairing'],
                'requirements': ['cooking_interest', 'team_work']
            },
            EventType.ART_GALLERY: {
                'title_template': "Vernissage Privado: {artist}",
                'description_template': "Disfruta del arte contemporáneo en una velada exclusiva",
                'duration_hours': 2.5,
                'typical_capacity': 30,
                'amenities': ['private_tour', 'artist_meet', 'champagne', 'catalog'],
                'requirements': ['art_interest', 'cultural_awareness']
            },
            EventType.NETWORKING_MIXER: {
                'title_template': "Networking Elite: {theme}",
                'description_template': "Conecta con profesionales exitosos en un ambiente sofisticado",
                'duration_hours': 3,
                'typical_capacity': 40,
                'amenities': ['business_lounge', 'cocktails', 'business_cards', 'wifi'],
                'requirements': ['professional_status', 'business_attire']
            },
            EventType.OUTDOOR_ADVENTURE: {
                'title_template': "Aventura Exclusiva: {activity}",
                'description_template': "Vive una experiencia única en la naturaleza con gente extraordinaria",
                'duration_hours': 6,
                'typical_capacity': 12,
                'amenities': ['equipment', 'guide', 'meals', 'transportation'],
                'requirements': ['physical_fitness', 'adventure_spirit']
            }
        }
    
    def create_exclusive_event(self, event_type: EventType, location: EventLocation, 
                             date_time: datetime, organizer_id: str, 
                             customizations: Optional[Dict] = None) -> VIPEvent:
        """Crear un nuevo evento VIP exclusivo"""
        try:
            template = self.event_templates.get(event_type, {})
            
            # Generar título y descripción
            title = customizations.get('title', template.get('title_template', 'Evento VIP'))
            description = customizations.get('description', template.get('description_template', ''))
            
            # Configurar duración y capacidad
            duration_hours = customizations.get('duration_hours', template.get('duration_hours', 3))
            max_attendees = customizations.get('max_attendees', template.get('typical_capacity', 20))
            
            # Configurar precios por tier
            base_price = customizations.get('base_price', 150.0)
            ticket_tiers = {
                TicketTier.STANDARD: base_price,
                TicketTier.PREMIUM: base_price * 1.5,
                TicketTier.VIP: base_price * 2.5,
                TicketTier.PLATINUM: base_price * 4.0
            }
            
            # Crear evento
            event = VIPEvent(
                id=str(uuid.uuid4()),
                title=title,
                description=description,
                event_type=event_type,
                location=location,
                start_time=date_time,
                end_time=date_time + timedelta(hours=duration_hours),
                max_attendees=max_attendees,
                current_attendees=0,
                ticket_tiers=ticket_tiers,
                status=EventStatus.PLANNING,
                organizer_id=organizer_id,
                featured=customizations.get('featured', False),
                requirements=customizations.get('requirements', template.get('requirements', [])),
                amenities=customizations.get('amenities', template.get('amenities', [])),
                matching_criteria=customizations.get('matching_criteria', {})
            )
            
            # Almacenar evento
            self.events[event.id] = event
            
            logger.info(f"Evento VIP creado: {event.title} (ID: {event.id})")
            return event
            
        except Exception as e:
            logger.error(f"Error creando evento VIP: {str(e)}")
            raise
    
    def suggest_events_for_user(self, user_profile: Dict, 
                              preferences: Optional[Dict] = None) -> List[VIPEvent]:
        """Sugerir eventos VIP basados en perfil y preferencias"""
        try:
            available_events = [
                event for event in self.events.values() 
                if event.status in [EventStatus.OPEN, EventStatus.FULL] 
                and event.current_attendees < event.max_attendees
            ]
            
            if not available_events:
                return []
            
            # Calcular compatibilidad para cada evento
            scored_events = []
            for event in available_events:
                compatibility_score = self._calculate_event_compatibility(
                    user_profile, event, preferences
                )
                scored_events.append((event, compatibility_score))
            
            # Ordenar por puntuación de compatibilidad
            scored_events.sort(key=lambda x: x[1], reverse=True)
            
            # Retornar top 10 eventos
            return [event for event, score in scored_events[:10]]
            
        except Exception as e:
            logger.error(f"Error sugiriendo eventos: {str(e)}")
            return []
    
    def _calculate_event_compatibility(self, user_profile: Dict, 
                                     event: VIPEvent, 
                                     preferences: Optional[Dict] = None) -> float:
        """Calcular puntuación de compatibilidad entre usuario y evento"""
        score = 0.0
        weights = self.matching_weights
        
        try:
            # 1. Compatibilidad de edad (30%)
            age_score = self._calculate_age_compatibility(
                user_profile.get('age', 0), event
            )
            score += age_score * weights['age_compatibility']
            
            # 2. Solapamiento de intereses (40%)
            interests_score = self._calculate_interests_overlap(
                user_profile.get('interests', []), event
            )
            score += interests_score * weights['interests_overlap']
            
            # 3. Proximidad de ubicación (20%)
            location_score = self._calculate_location_proximity(
                user_profile.get('location', {}), event.location
            )
            score += location_score * weights['location_proximity']
            
            # 4. Compatibilidad de personalidad (10%)
            personality_score = self._calculate_personality_match(
                user_profile.get('personality_traits', {}), event
            )
            score += personality_score * weights['personality_match']
            
            # Ajustar según preferencias explícitas
            if preferences:
                score = self._apply_preference_adjustments(score, event, preferences)
            
            return min(score, 1.0)  # Normalizar a 0-1
            
        except Exception as e:
            logger.error(f"Error calculando compatibilidad: {str(e)}")
            return 0.0
    
    def _calculate_age_compatibility(self, user_age: int, event: VIPEvent) -> float:
        """Calcular compatibilidad de edad"""
        try:
            # Determinar rango de edad objetivo según tipo de evento
            age_ranges = {
                EventType.WINE_TASTING: (25, 65),
                EventType.COOKING_CLASS: (21, 60),
                EventType.ART_GALLERY: (25, 70),
                EventType.NETWORKING_MIXER: (24, 55),
                EventType.OUTDOOR_ADVENTURE: (21, 45),
                EventType.CULTURAL_EXPERIENCE: (23, 65),
                EventType.MUSICAL_EVENT: (18, 50),
                EventType.SPORTS_ACTIVITY: (20, 45),
                EventType.TRAVEL_EXPERIENCE: (25, 60),
                EventType.LUXURY_DINING: (28, 65)
            }
            
            min_age, max_age = age_ranges.get(event.event_type, (21, 60))
            
            if user_age < min_age or user_age > max_age:
                return 0.0
            
            # Calcular distancia al centro del rango
            center_age = (min_age + max_age) / 2
            distance = abs(user_age - center_age)
            max_distance = max(center_age - min_age, max_age - center_age)
            
            return max(0, 1 - (distance / max_distance))
            
        except Exception as e:
            logger.error(f"Error en compatibilidad de edad: {str(e)}")
            return 0.5  # Puntuación neutral
    
    def _calculate_interests_overlap(self, user_interests: List[str], event: VIPEvent) -> float:
        """Calcular solapamiento de intereses"""
        try:
            if not user_interests:
                return 0.3  # Puntuación baja por falta de datos
            
            # Mapear tipos de eventos a intereses
            event_interests = {
                EventType.WINE_TASTING: ['wine', 'gastronomy', 'socializing', 'luxury'],
                EventType.COOKING_CLASS: ['cooking', 'food', 'learning', 'socializing'],
                EventType.ART_GALLERY: ['art', 'culture', 'aesthetics', 'intellectual'],
                EventType.NETWORKING_MIXER: ['business', 'networking', 'professional', 'socializing'],
                EventType.OUTDOOR_ADVENTURE: ['nature', 'adventure', 'fitness', 'outdoor'],
                EventType.CULTURAL_EXPERIENCE: ['culture', 'travel', 'learning', 'history'],
                EventType.MUSICAL_EVENT: ['music', 'entertainment', 'socializing', 'dancing'],
                EventType.SPORTS_ACTIVITY: ['sports', 'fitness', 'competition', 'outdoor'],
                EventType.TRAVEL_EXPERIENCE: ['travel', 'adventure', 'culture', 'exploration'],
                EventType.LUXURY_DINING: ['gastronomy', 'luxury', 'socializing', 'fine_dining']
            }
            
            event_interests_list = event_interests.get(event.event_type, [])
            
            # Calcular solapamiento
            overlap = set(user_interests) & set(event_interests_list)
            total_unique = set(user_interests) | set(event_interests_list)
            
            return len(overlap) / len(total_unique) if total_unique else 0.0
            
        except Exception as e:
            logger.error(f"Error calculando solapamiento de intereses: {str(e)}")
            return 0.0
    
    def _calculate_location_proximity(self, user_location: Dict, 
                                    event_location: EventLocation) -> float:
        """Calcular proximidad de ubicación"""
        try:
            if not user_location or 'coordinates' not in user_location:
                return 0.5  # Puntuación neutral
            
            user_coords = user_location['coordinates']
            event_coords = event_location.coordinates
            
            # Calcular distancia (simplificada)
            distance = self._calculate_distance(user_coords, event_coords)
            
            # Convertir distancia a puntuación (0-1)
            # Asumimos que 50km es la distancia máxima aceptable
            max_distance = 50.0
            return max(0, 1 - (distance / max_distance))
            
        except Exception as e:
            logger.error(f"Error calculando proximidad: {str(e)}")
            return 0.5
    
    def _calculate_distance(self, coords1: Tuple[float, float], 
                         coords2: Tuple[float, float]) -> float:
        """Calcular distancia entre dos coordenadas (simplificado)"""
        try:
            # Fórmula simplificada de distancia (no es Haversine)
            lat_diff = abs(coords1[0] - coords2[0])
            lon_diff = abs(coords1[1] - coords2[1])
            
            # Aproximación: 1 grado ≈ 111 km
            distance_km = (lat_diff + lon_diff) * 111.0
            
            return distance_km
            
        except Exception as e:
            logger.error(f"Error calculando distancia: {str(e)}")
            return 999.0  # Distancia muy grande
    
    def _calculate_personality_match(self, user_personality: Dict, 
                                   event: VIPEvent) -> float:
        """Calcular compatibilidad de personalidad"""
        try:
            if not user_personality:
                return 0.5  # Puntuación neutral
            
            # Mapear tipos de eventos a rasgos de personalidad deseados
            personality_requirements = {
                EventType.WINE_TASTING: {'sophistication': 0.7, 'social_openness': 0.6},
                EventType.COOKING_CLASS: {'creativity': 0.7, 'collaboration': 0.6},
                EventType.ART_GALLERY: {'cultural_appreciation': 0.8, 'intellectual_curiosity': 0.7},
                EventType.NETWORKING_MIXER: {'extroversion': 0.8, 'professional_drive': 0.7},
                EventType.OUTDOOR_ADVENTURE: {'adventurousness': 0.8, 'physical_fitness': 0.6},
                EventType.CULTURAL_EXPERIENCE: {'openness': 0.7, 'cultural_interest': 0.8},
                EventType.MUSICAL_EVENT: {'social_energy': 0.6, 'artistic_appreciation': 0.7},
                EventType.SPORTS_ACTIVITY: {'competitiveness': 0.6, 'physical_activity': 0.8},
                EventType.TRAVEL_EXPERIENCE: {'adventurousness': 0.8, 'cultural_openness': 0.7},
                EventType.LUXURY_DINING: {'sophistication': 0.8, 'social_grace': 0.7}
            }
            
            requirements = personality_requirements.get(event.event_type, {})
            
            if not requirements:
                return 0.5
            
            # Calcular coincidencia
            total_score = 0.0
            total_weight = 0.0
            
            for trait, required_level in requirements.items():
                user_level = user_personality.get(trait, 0.5)
                
                # Calcular qué tan bien el usuario cumple el requisito
                if user_level >= required_level:
                    trait_score = 1.0
                else:
                    trait_score = user_level / required_level
                
                total_score += trait_score * required_level
                total_weight += required_level
            
            return total_score / total_weight if total_weight > 0 else 0.5
            
        except Exception as e:
            logger.error(f"Error calculando compatibilidad de personalidad: {str(e)}")
            return 0.5
    
    def _apply_preference_adjustments(self, score: float, event: VIPEvent, 
                                    preferences: Dict) -> float:
        """Aplicar ajustes según preferencias explícitas"""
        try:
            adjusted_score = score
            
            # Ajustar por tipo de evento preferido
            preferred_types = preferences.get('preferred_event_types', [])
            if event.event_type.value in preferred_types:
                adjusted_score *= 1.3  # Aumentar 30%
            
            # Ajustar por precio máximo
            max_price = preferences.get('max_price', float('inf'))
            min_tier_price = min(event.ticket_tiers.values())
            
            if min_tier_price > max_price:
                adjusted_score *= 0.5  # Reducir 50% si es muy caro
            
            # Ajustar por ubicación preferida
            preferred_locations = preferences.get('preferred_locations', [])
            if event.location.city in preferred_locations:
                adjusted_score *= 1.2  # Aumentar 20%
            
            return min(adjusted_score, 1.0)
            
        except Exception as e:
            logger.error(f"Error aplicando ajustes de preferencias: {str(e)}")
            return score
    
    def purchase_event_ticket(self, event_id: str, user_id: str, 
                            tier: TicketTier, companion_user_id: Optional[str] = None) -> EventTicket:
        """Comprar boleto para evento VIP"""
        try:
            # Verificar que el evento existe y está disponible
            if event_id not in self.events:
                raise ValueError("Evento no encontrado")
            
            event = self.events[event_id]
            
            if event.status != EventStatus.OPEN:
                raise ValueError("Evento no está disponible para registro")
            
            if event.current_attendees >= event.max_attendees:
                raise ValueError("Evento está lleno")
            
            if tier not in event.ticket_tiers:
                raise ValueError(f"Tier {tier.value} no disponible para este evento")
            
            # Verificar que el usuario no esté ya registrado
            user_event_tickets = [
                ticket for ticket in self.tickets.values()
                if ticket.user_id == user_id and ticket.event_id == event_id and ticket.status == "active"
            ]
            
            if user_event_tickets:
                raise ValueError("Usuario ya está registrado en este evento")
            
            # Crear boleto
            ticket = EventTicket(
                id=str(uuid.uuid4()),
                event_id=event_id,
                user_id=user_id,
                tier=tier,
                price=event.ticket_tiers[tier],
                purchase_date=datetime.now(),
                companion_ticket=companion_user_id
            )
            
            # Actualizar contadores
            self.tickets[ticket.id] = ticket
            event.current_attendees += 1
            
            if user_id not in self.user_events:
                self.user_events[user_id] = []
            self.user_events[user_id].append(event_id)
            
            # Actualizar estado del evento si se llenó
            if event.current_attendees >= event.max_attendees:
                event.status = EventStatus.FULL
            
            logger.info(f"Boleto comprado: {ticket.id} para evento {event_id} por usuario {user_id}")
            return ticket
            
        except Exception as e:
            logger.error(f"Error comprando boleto: {str(e)}")
            raise
    
    def get_user_events(self, user_id: str) -> List[VIPEvent]:
        """Obtener eventos en los que participa un usuario"""
        try:
            user_event_ids = self.user_events.get(user_id, [])
            return [self.events[event_id] for event_id in user_event_ids if event_id in self.events]
            
        except Exception as e:
            logger.error(f"Error obteniendo eventos del usuario: {str(e)}")
            return []
    
    def cancel_event_ticket(self, ticket_id: str, user_id: str) -> bool:
        """Cancelar boleto de evento"""
        try:
            if ticket_id not in self.tickets:
                return False
            
            ticket = self.tickets[ticket_id]
            
            # Verificar que el boleto pertenece al usuario
            if ticket.user_id != user_id:
                return False
            
            # Verificar que el boleto está activo
            if ticket.status != "active":
                return False
            
            # Actualizar estado del boleto
            ticket.status = "cancelled"
            
            # Actualizar contador del evento
            if ticket.event_id in self.events:
                event = self.events[ticket.event_id]
                event.current_attendees = max(0, event.current_attendees - 1)
                
                # Actualizar estado del evento si ya no está lleno
                if event.status == EventStatus.FULL and event.current_attendees < event.max_attendees:
                    event.status = EventStatus.OPEN
            
            # Remover de la lista de eventos del usuario
            if user_id in self.user_events and ticket.event_id in self.user_events[user_id]:
                self.user_events[user_id].remove(ticket.event_id)
            
            logger.info(f"Boleto cancelado: {ticket_id} por usuario {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error cancelando boleto: {str(e)}")
            return False
    
    def get_event_attendees(self, event_id: str) -> List[Dict]:
        """Obtener información de asistentes a un evento"""
        try:
            if event_id not in self.events:
                return []
            
            event_tickets = [
                ticket for ticket in self.tickets.values()
                if ticket.event_id == event_id and ticket.status == "active"
            ]
            
            # En una implementación real, obtendríamos perfiles completos de usuarios
            attendees_info = []
            for ticket in event_tickets:
                attendees_info.append({
                    'user_id': ticket.user_id,
                    'ticket_tier': ticket.tier.value,
                    'purchase_date': ticket.purchase_date.isoformat(),
                    'has_companion': ticket.companion_ticket is not None
                })
            
            return attendees_info
            
        except Exception as e:
            logger.error(f"Error obteniendo asistentes al evento: {str(e)}")
            return []
    
    def create_curated_networking_event(self, user_list: List[str], 
                                      event_details: Dict) -> VIPEvent:
        """Crear evento de networking curado para usuarios específicos"""
        try:
            # Analizar compatibilidad entre usuarios
            compatibility_matrix = self._analyze_user_compatibility(user_list)
            
            # Seleccionar ubicación óptima basada en usuarios
            optimal_location = self._select_optimal_location(user_list)
            
            # Crear evento con restricciones específicas
            event_details.update({
                'max_attendees': len(user_list),
                'requirements': ['exclusive_invitation', 'verified_profile'],
                'featured': True,
                'matching_criteria': {
                    'target_demographics': self._extract_demographics(user_list),
                    'compatibility_matrix': compatibility_matrix
                }
            })
            
            event = self.create_exclusive_event(
                EventType.NETWORKING_MIXER,
                optimal_location,
                event_details['date_time'],
                event_details.get('organizer_id', 'system'),
                event_details
            )
            
            # Enviar invitaciones privadas
            self._send_private_invitations(event.id, user_list)
            
            logger.info(f"Evento de networking curado creado: {event.id} para {len(user_list)} usuarios")
            return event
            
        except Exception as e:
            logger.error(f"Error creando evento de networking curado: {str(e)}")
            raise
    
    def _analyze_user_compatibility(self, user_list: List[str]) -> Dict[str, Dict[str, float]]:
        """Analizar compatibilidad entre usuarios (placeholder)"""
        # En una implementación real, usaríamos el motor de recomendación
        compatibility_matrix = {}
        for user1 in user_list:
            compatibility_matrix[user1] = {}
            for user2 in user_list:
                if user1 != user2:
                    # Puntuación aleatoria para demostración
                    compatibility_matrix[user1][user2] = random.uniform(0.3, 0.9)
                else:
                    compatibility_matrix[user1][user2] = 1.0
        
        return compatibility_matrix
    
    def _select_optimal_location(self, user_list: List[str]) -> EventLocation:
        """Seleccionar ubicación óptima basada en usuarios (placeholder)"""
        # En una implementación real, calcularíamos el punto medio óptimo
        return EventLocation(
            name="Salón Ejecutivo Central",
            address="Avenida Principal 123",
            city="Ciudad Central",
            coordinates=(40.7128, -74.0060),
            venue_type="business_lounge",
            capacity=50,
            accessibility_features=['wheelchair_accessible', 'elevator'],
            parking_available=True,
            public_transport_access=True
        )
    
    def _extract_demographics(self, user_list: List[str]) -> Dict:
        """Extraer información demográfica de la lista de usuarios (placeholder)"""
        return {
            'age_range': '25-45',
            'professional_level': 'executive',
            'interests': ['business', 'networking', 'luxury']
        }
    
    def _send_private_invitations(self, event_id: str, user_list: List[str]):
        """Enviar invitaciones privadas a usuarios (placeholder)"""
        logger.info(f"Enviando {len(user_list)} invitaciones privadas para evento {event_id}")
        # En una implementación real, integraríamos con el sistema de notificaciones
    
    def get_event_statistics(self, event_id: str) -> Dict:
        """Obtener estadísticas detalladas de un evento"""
        try:
            if event_id not in self.events:
                return {}
            
            event = self.events[event_id]
            attendees = self.get_event_attendees(event_id)
            
            # Análisis por tier
            tier_distribution = {}
            for attendee in attendees:
                tier = attendee['ticket_tier']
                tier_distribution[tier] = tier_distribution.get(tier, 0) + 1
            
            # Calcular ingresos totales
            total_revenue = sum(
                ticket.price for ticket in self.tickets.values()
                if ticket.event_id == event_id and ticket.status == "active"
            )
            
            # Tiempo promedio de compra
            purchase_times = [
                ticket.purchase_date for ticket in self.tickets.values()
                if ticket.event_id == event_id and ticket.status == "active"
            ]
            
            avg_purchase_time = None
            if purchase_times:
                avg_purchase_time = sum(
                    (t - event.created_at).total_seconds() / 3600 
                    for t in purchase_times
                ) / len(purchase_times)
            
            return {
                'event_id': event_id,
                'total_attendees': len(attendees),
                'capacity_utilization': len(attendees) / event.max_attendees,
                'tier_distribution': tier_distribution,
                'total_revenue': total_revenue,
                'average_purchase_time_hours': avg_purchase_time,
                'companion_tickets': sum(1 for a in attendees if a['has_companion']),
                'cancellation_rate': self._calculate_cancellation_rate(event_id)
            }
            
        except Exception as e:
            logger.error(f"Error obteniendo estadísticas del evento: {str(e)}")
            return {}
    
    def _calculate_cancellation_rate(self, event_id: str) -> float:
        """Calcular tasa de cancelación de un evento"""
        try:
            all_tickets = [
                ticket for ticket in self.tickets.values()
                if ticket.event_id == event_id
            ]
            
            if not all_tickets:
                return 0.0
            
            cancelled_tickets = [t for t in all_tickets if t.status == "cancelled"]
            
            return len(cancelled_tickets) / len(all_tickets)
            
        except Exception as e:
            logger.error(f"Error calculando tasa de cancelación: {str(e)}")
            return 0.0

# Instancia global del gestor de eventos VIP
vip_events_manager = VIPEventsManager()

def create_exclusive_vip_event(event_type: str, location_data: Dict, 
                             date_time: str, organizer_id: str, 
                             customizations: Optional[Dict] = None) -> Dict:
    """
    Función pública para crear eventos VIP exclusivos
    
    Args:
        event_type: Tipo de evento (wine_tasting, cooking_class, etc.)
        location_data: Datos de ubicación del evento
        date_time: Fecha y hora del evento (ISO format)
        organizer_id: ID del organizador
        customizations: Personalizaciones opcionales
    
    Returns:
        Dict con información del evento creado
    """
    try:
        # Parsear tipo de evento
        event_type_enum = EventType(event_type)
        
        # Crear objeto de ubicación
        location = EventLocation(
            name=location_data['name'],
            address=location_data['address'],
            city=location_data['city'],
            coordinates=tuple(location_data['coordinates']),
            venue_type=location_data.get('venue_type', 'private_venue'),
            capacity=location_data.get('capacity', 50),
            accessibility_features=location_data.get('accessibility_features', []),
            parking_available=location_data.get('parking_available', True),
            public_transport_access=location_data.get('public_transport_access', True)
        )
        
        # Parsear fecha y hora
        event_datetime = datetime.fromisoformat(date_time)
        
        # Crear evento
        event = vip_events_manager.create_exclusive_event(
            event_type_enum, location, event_datetime, organizer_id, customizations
        )
        
        return {
            'success': True,
            'event_id': event.id,
            'title': event.title,
            'description': event.description,
            'event_type': event.event_type.value,
            'location': {
                'name': event.location.name,
                'address': event.location.address,
                'city': event.location.city,
                'coordinates': event.location.coordinates
            },
            'start_time': event.start_time.isoformat(),
            'end_time': event.end_time.isoformat(),
            'max_attendees': event.max_attendees,
            'ticket_tiers': {tier.value: price for tier, price in event.ticket_tiers.items()},
            'status': event.status.value,
            'amenities': event.amenities,
            'requirements': event.requirements
        }
        
    except Exception as e:
        logger.error(f"Error creando evento VIP: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }

def suggest_vip_events_for_user(user_profile: Dict, 
                              preferences: Optional[Dict] = None) -> List[Dict]:
    """
    Sugerir eventos VIP para un usuario basado en su perfil
    
    Args:
        user_profile: Perfil del usuario
        preferences: Preferencias adicionales
    
    Returns:
        Lista de eventos sugeridos
    """
    try:
        suggested_events = vip_events_manager.suggest_events_for_user(user_profile, preferences)
        
        return [
            {
                'event_id': event.id,
                'title': event.title,
                'description': event.description,
                'event_type': event.event_type.value,
                'location': {
                    'name': event.location.name,
                    'city': event.location.city,
                    'coordinates': event.location.coordinates
                },
                'start_time': event.start_time.isoformat(),
                'end_time': event.end_time.isoformat(),
                'max_attendees': event.max_attendees,
                'current_attendees': event.current_attendees,
                'ticket_tiers': {tier.value: price for tier, price in event.ticket_tiers.items()},
                'featured': event.featured,
                'amenities': event.amenities
            }
            for event in suggested_events
        ]
        
    except Exception as e:
        logger.error(f"Error sugiriendo eventos VIP: {str(e)}")
        return []

def purchase_vip_event_ticket(event_id: str, user_id: str, 
                            tier: str, companion_user_id: Optional[str] = None) -> Dict:
    """
    Comprar boleto para evento VIP
    
    Args:
        event_id: ID del evento
        user_id: ID del usuario
        tier: Tier del boleto (standard, premium, vip, platinum)
        companion_user_id: ID del acompañante (opcional)
    
    Returns:
        Dict con información del boleto
    """
    try:
        ticket_tier_enum = TicketTier(tier)
        
        ticket = vip_events_manager.purchase_event_ticket(
            event_id, user_id, ticket_tier_enum, companion_user_id
        )
        
        return {
            'success': True,
            'ticket_id': ticket.id,
            'event_id': ticket.event_id,
            'user_id': ticket.user_id,
            'tier': ticket.tier.value,
            'price': ticket.price,
            'purchase_date': ticket.purchase_date.isoformat(),
            'status': ticket.status,
            'companion_ticket': ticket.companion_ticket
        }
        
    except Exception as e:
        logger.error(f"Error comprando boleto VIP: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }

def get_user_vip_events(user_id: str) -> List[Dict]:
    """
    Obtener eventos VIP en los que participa un usuario
    
    Args:
        user_id: ID del usuario
    
    Returns:
        Lista de eventos del usuario
    """
    try:
        user_events = vip_events_manager.get_user_events(user_id)
        
        return [
            {
                'event_id': event.id,
                'title': event.title,
                'description': event.description,
                'event_type': event.event_type.value,
                'location': {
                    'name': event.location.name,
                    'address': event.location.address,
                    'city': event.location.city
                },
                'start_time': event.start_time.isoformat(),
                'end_time': event.end_time.isoformat(),
                'status': event.status.value
            }
            for event in user_events
        ]
        
    except Exception as e:
        logger.error(f"Error obteniendo eventos del usuario: {str(e)}")
        return []

def create_curated_networking_event(user_list: List[str], 
                                  event_details: Dict) -> Dict:
    """
    Crear evento de networking curado para usuarios específicos
    
    Args:
        user_list: Lista de IDs de usuarios
        event_details: Detalles del evento
    
    Returns:
        Dict con información del evento creado
    """
    try:
        event = vip_events_manager.create_curated_networking_event(user_list, event_details)
        
        return {
            'success': True,
            'event_id': event.id,
            'title': event.title,
            'description': event.description,
            'location': {
                'name': event.location.name,
                'city': event.location.city
            },
            'start_time': event.start_time.isoformat(),
            'max_attendees': event.max_attendees,
            'status': event.status.value,
            'invited_users': user_list
        }
        
    except Exception as e:
        logger.error(f"Error creando evento de networking curado: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }

def get_vip_event_statistics(event_id: str) -> Dict:
    """
    Obtener estadísticas de un evento VIP
    
    Args:
        event_id: ID del evento
    
    Returns:
        Dict con estadísticas del evento
    """
    try:
        stats = vip_events_manager.get_event_statistics(event_id)
        return stats
        
    except Exception as e:
        logger.error(f"Error obteniendo estadísticas del evento: {str(e)}")
        return {}