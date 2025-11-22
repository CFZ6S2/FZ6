"""
Pydantic schemas for API requests and responses
SECURITY: Input sanitization to prevent XSS attacks
SECURITY: Advanced input validation using specialized validators
"""
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, validator
from app.utils.sanitization import sanitize_html, sanitize_phone_number, sanitize_url

# Advanced validators
try:
    from app.utils.validators import (
        validate_alias,
        validate_name,
        validate_phone_number,
        validate_url,
        validate_bio,
        validate_description,
        validate_city,
        validate_coordinates,
        validate_interests,
        validate_amount,
        validate_age_range
    )
    VALIDATORS_AVAILABLE = True
except ImportError:
    VALIDATORS_AVAILABLE = False


# ========== User Models ==========

class AuthenticatedUser(BaseModel):
    """Authenticated user from Firebase JWT token"""
    uid: str
    email: str
    email_verified: bool
    role: str = "regular"  # 'admin', 'concierge', 'regular'
    custom_claims: Dict[str, Any] = {}

    @property
    def is_admin(self) -> bool:
        """Check if user is admin"""
        return self.role == "admin"

    @property
    def is_concierge(self) -> bool:
        """Check if user is concierge"""
        return self.role in ["concierge", "admin"]

    @property
    def is_verified(self) -> bool:
        """Check if email is verified"""
        return self.email_verified


class UserBase(BaseModel):
    """Base user model"""
    email: EmailStr
    alias: str
    gender: str = Field(..., pattern="^(masculino|femenino|otro)$")
    birth_date: str  # YYYY-MM-DD

    @validator('alias')
    def validate_alias_format(cls, v):
        """Validate alias format using advanced validator"""
        if VALIDATORS_AVAILABLE:
            return validate_alias(v)
        return v

    @validator('birth_date')
    def validate_age_18_plus(cls, v):
        """Validate that user is at least 18 years old"""
        if not v:
            raise ValueError("birth_date is required")

        try:
            # Parse birth date (YYYY-MM-DD format)
            birth_date = datetime.fromisoformat(v.replace('Z', '+00:00').split('T')[0])
        except (ValueError, AttributeError):
            raise ValueError("birth_date must be in YYYY-MM-DD format")

        # Calculate age
        today = datetime.now()
        age = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))

        if age < 18:
            raise ValueError("You must be at least 18 years old to register")

        # Prevent unrealistic ages (e.g., 150 years old)
        if age > 120:
            raise ValueError("Invalid birth date")

        return v


class UserProfile(UserBase):
    """Complete user profile"""
    uid: str
    city: Optional[str] = None
    bio: Optional[str] = None
    interests: List[str] = []
    profession: Optional[str] = None
    photo_url: Optional[str] = None
    user_role: str = "regular"
    has_active_subscription: bool = False
    has_anti_ghosting_insurance: bool = False
    reputation: str = "BRONCE"
    created_at: Optional[datetime] = None

    @validator('bio')
    def validate_bio_content(cls, v):
        """Validate and sanitize bio using advanced validator"""
        if v and VALIDATORS_AVAILABLE:
            return validate_bio(v, max_length=500)
        return sanitize_html(v) if v else v

    @validator('city')
    def validate_city_name(cls, v):
        """Validate city name using advanced validator"""
        if v and VALIDATORS_AVAILABLE:
            return validate_city(v)
        return sanitize_html(v) if v else v

    @validator('profession')
    def sanitize_profession(cls, v):
        """Sanitize profession field"""
        return sanitize_html(v) if v else v

    @validator('interests')
    def validate_interests_list(cls, v):
        """Validate interests list using advanced validator"""
        if v and VALIDATORS_AVAILABLE:
            return validate_interests(v, max_count=10)
        return v

    @validator('photo_url')
    def validate_photo_url_format(cls, v):
        """Validate photo URL using advanced validator"""
        if v and VALIDATORS_AVAILABLE:
            return validate_url(v)
        return sanitize_url(v) if v else v


# ========== Recommendation Models ==========

class RecommendationRequest(BaseModel):
    """Request for user recommendations"""
    user_id: str
    limit: int = Field(default=10, ge=1, le=50)
    filters: Optional[Dict[str, Any]] = None


class RecommendationScore(BaseModel):
    """Single recommendation with score"""
    user_id: str
    score: float = Field(..., ge=0, le=1)
    reasons: List[str] = []
    user_data: Optional[Dict[str, Any]] = None


class RecommendationResponse(BaseModel):
    """Response with recommendations"""
    user_id: str
    recommendations: List[RecommendationScore]
    algorithm: str
    generated_at: datetime


# ========== Photo Verification Models ==========

class PhotoVerificationRequest(BaseModel):
    """Request to verify a photo"""
    image_url: str
    user_id: str
    claimed_age: Optional[int] = None


class PhotoVerificationResult(BaseModel):
    """Photo verification results"""
    is_real_person: bool
    has_excessive_filters: bool
    is_appropriate: bool
    estimated_age: Optional[int] = None
    confidence: float = Field(..., ge=0, le=1)
    faces_detected: int
    warnings: List[str] = []


# ========== Analytics Models ==========

class RevenueData(BaseModel):
    """Revenue data point"""
    date: datetime
    amount: float
    source: str  # 'subscription', 'insurance', 'concierge'


class RevenueForecast(BaseModel):
    """Revenue forecast"""
    date: datetime
    predicted_amount: float
    lower_bound: float
    upper_bound: float
    confidence: float = 0.95


class ChurnPrediction(BaseModel):
    """Churn risk prediction"""
    user_id: str
    churn_probability: float = Field(..., ge=0, le=1)
    risk_level: str  # 'low', 'medium', 'high'
    contributing_factors: List[str] = []
    suggested_actions: List[str] = []


class UserLTV(BaseModel):
    """User Lifetime Value calculation"""
    user_id: str
    ltv: float
    monthly_value: float
    retention_months: int
    breakdown: Dict[str, float]


# ========== Fraud Detection Models ==========

class FraudCheckRequest(BaseModel):
    """Request to check for fraudulent behavior"""
    user_id: str
    user_data: Optional[Dict[str, Any]] = None  # Datos del perfil del usuario
    user_history: Optional[Dict[str, Any]] = None  # Historial de actividad del usuario
    action: str = "general"  # Tipo de acción que está realizando
    metadata: Optional[Dict[str, Any]] = None


class FraudCheckResult(BaseModel):
    """Fraud detection result"""
    is_suspicious: bool
    risk_score: float = Field(..., ge=0, le=1)
    flags: List[str] = []
    recommended_action: str  # 'allow', 'review', 'block'
    details: Optional[Dict[str, Any]] = None


# ========== Message Moderation Models ==========

class MessageModerationRequest(BaseModel):
    """Request to moderate a message"""
    message_text: str
    sender_id: str
    receiver_id: str
    timestamp: Optional[datetime] = None
    relationship_context: Optional[Dict[str, Any]] = None  # Contexto de la relación entre usuarios

    @validator('message_text')
    def sanitize_message(cls, v):
        """Sanitize message text to prevent XSS"""
        return sanitize_html(v) if v else v


class MessageModerationResult(BaseModel):
    """Message moderation result"""
    should_block: bool
    is_toxic: bool
    contains_personal_info: bool
    is_spam: bool
    sentiment: str  # 'positive', 'neutral', 'negative'
    warnings: List[str] = []
    suggested_edit: Optional[str] = None


# ========== Geolocation Models ==========

class Location(BaseModel):
    """Geographic location"""
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)

    @validator('lat', 'lng')
    def validate_coordinates_precision(cls, v, field):
        """Validate coordinate precision using advanced validator"""
        if VALIDATORS_AVAILABLE:
            # Create dict with lat/lng for validation
            coords = {field.name: v}
            validate_coordinates(
                coords.get('lat', 0),
                coords.get('lng', 0)
            )
        return v


class MeetingSpotRequest(BaseModel):
    """Request for meeting spot suggestions"""
    user1_location: Location
    user2_location: Location
    preferences: Optional[Dict[str, Any]] = None


class MeetingSpot(BaseModel):
    """Suggested meeting spot"""
    name: str
    location: Location
    address: str
    rating: float
    review_count: int
    types: List[str] = []
    distance_user1: float  # meters
    distance_user2: float  # meters


class LocationVerificationRequest(BaseModel):
    """Request to verify user is at location"""
    claimed_location: Location
    user_gps: Location
    tolerance_meters: int = 250


class LocationVerificationResult(BaseModel):
    """Location verification result"""
    is_verified: bool
    distance: float  # meters
    within_tolerance: bool


# ========== Notification Models ==========

class NotificationRequest(BaseModel):
    """Request to send notification"""
    user_id: str
    notification_type: str
    data: Dict[str, Any]
    priority: str = "normal"  # 'low', 'normal', 'high'


class NotificationSchedule(BaseModel):
    """Scheduled notification"""
    user_id: str
    best_time_hour: int = Field(..., ge=0, le=23)
    timezone: str = "Europe/Madrid"
    send_at: Optional[datetime] = None


# ========== VIP Events Models (for Concierge) ==========

class VIPEventCreate(BaseModel):
    """Create VIP event"""
    title: str = Field(..., min_length=5, max_length=100)
    description: str = Field(..., min_length=20, max_length=1000)
    event_type: str = Field(..., pattern="^(dinner|party|travel|networking|other)$")
    event_date: datetime
    city: str
    address: str
    compensation: float = Field(..., gt=0)
    spots_available: int = Field(..., ge=1, le=50)
    min_age: int = Field(..., ge=18, le=100)
    max_age: int = Field(..., ge=18, le=100)
    dresscode: Optional[str] = None
    requirements: Optional[str] = None

    @validator('title')
    def validate_title(cls, v):
        """Sanitize title field"""
        return sanitize_html(v) if v else v

    @validator('description')
    def validate_description_content(cls, v):
        """Validate description using advanced validator"""
        if v and VALIDATORS_AVAILABLE:
            return validate_description(v, min_length=20, max_length=1000, field_name='description')
        return sanitize_html(v) if v else v

    @validator('city')
    def validate_city_name(cls, v):
        """Validate city name using advanced validator"""
        if v and VALIDATORS_AVAILABLE:
            return validate_city(v)
        return sanitize_html(v) if v else v

    @validator('address', 'dresscode', 'requirements')
    def sanitize_text_fields(cls, v):
        """Sanitize text fields to prevent XSS"""
        return sanitize_html(v) if v else v

    @validator('compensation')
    def validate_compensation_amount(cls, v):
        """Validate compensation amount using advanced validator"""
        if v and VALIDATORS_AVAILABLE:
            return validate_amount(v, min_amount=0, max_amount=10000)
        return v

    @validator('max_age')
    def validate_age_range_values(cls, v, values):
        """Validate age range consistency"""
        if 'min_age' in values:
            if VALIDATORS_AVAILABLE:
                validate_age_range(values['min_age'], v, min_absolute=18, max_absolute=100)
            elif v < values['min_age']:
                raise ValueError('max_age must be greater than or equal to min_age')
        return v


class VIPEventApplication(BaseModel):
    """Application to VIP event"""
    event_id: str
    user_id: str
    motivation: str = Field(..., min_length=50, max_length=500)
    availability_confirmed: bool = True

    @validator('motivation')
    def sanitize_motivation(cls, v):
        """Sanitize motivation field to prevent XSS"""
        return sanitize_html(v) if v else v


class VIPEventTicketRequest(BaseModel):
    """Request to purchase VIP event ticket"""
    event_id: str
    user_id: str
    tier: str = Field(..., pattern="^(standard|premium|vip|platinum)$")
    companion_user_id: Optional[str] = None


class VIPEventSuggestionRequest(BaseModel):
    """Request for VIP event suggestions"""
    user_profile: Dict[str, Any]
    preferences: Optional[Dict[str, Any]] = None


class VIPEventCreateRequest(BaseModel):
    """Request to create VIP event"""
    event_type: str
    location_data: Dict[str, Any]
    date_time: str
    customizations: Optional[Dict[str, Any]] = None


class VIPEventResponse(BaseModel):
    """VIP event response"""
    id: str
    title: str
    description: str
    event_type: str
    location: Dict[str, Any]
    start_time: datetime
    end_time: datetime
    max_attendees: int
    current_attendees: int
    ticket_tiers: Dict[str, float]
    status: str
    organizer_id: str
    featured: bool = False
    requirements: List[str] = []
    amenities: List[str] = []
    matching_criteria: Dict[str, Any] = {}
    created_at: datetime


class VIPEventTicketResponse(BaseModel):
    """VIP event ticket response"""
    ticket_id: str
    event_id: str
    user_id: str
    tier: str
    price: float
    status: str
    purchase_date: datetime
    companion_user_id: Optional[str] = None
    qr_code: Optional[str] = None
    access_code: Optional[str] = None


class VIPEventStatistics(BaseModel):
    """VIP events statistics"""
    total_events: int
    active_events: int
    total_tickets_sold: int
    total_revenue: float
    average_event_rating: float
    most_popular_event_type: str
    upcoming_events: int
    completed_events: int


class CuratedNetworkingEventRequest(BaseModel):
    """Request to create curated networking event"""
    user_list: List[str]
    event_details: Dict[str, Any]


class RevenueForecastResponse(BaseModel):
    """Revenue forecast response"""
    forecast_period: str
    predicted_revenue: float
    confidence_interval: Dict[str, float]
    growth_rate: float
    key_factors: List[str]
    monthly_breakdown: List[Dict[str, Any]]


class ChurnRiskResponse(BaseModel):
    """Churn risk analysis response"""
    user_id: str
    churn_risk_score: float
    risk_category: str
    key_indicators: List[str]
    recommended_actions: List[str]
    predicted_churn_date: Optional[datetime] = None


class UserLTVResponse(BaseModel):
    """User lifetime value response"""
    user_id: str
    predicted_ltv: float
    confidence_level: float
    calculation_method: str
    historical_data_points: int
    projected_revenue_breakdown: Dict[str, float]


# ========== Generic Response Models ==========

class SuccessResponse(BaseModel):
    """Generic success response"""
    success: bool = True
    message: str
    data: Optional[Dict[str, Any]] = None


class ErrorResponse(BaseModel):
    """Generic error response"""
    success: bool = False
    error: str
    details: Optional[Dict[str, Any]] = None


class HealthCheck(BaseModel):
    """Health check response"""
    status: str = "healthy"
    version: str
    timestamp: datetime
    services: Dict[str, str] = {}


# ========== Video Chat Models ==========

class VideoCallCreateRequest(BaseModel):
    """Request to create a video call room"""
    host_user_id: str
    display_name: str
    max_participants: int = Field(default=2, ge=1, le=10)
    is_private: bool = True


class VideoCallInvitationRequest(BaseModel):
    """Request to invite user to video call"""
    call_id: str
    caller_user_id: str
    callee_user_id: str
    callee_display_name: str


class VideoCallInvitationResponse(BaseModel):
    """Response for video call invitation"""
    invitation_id: str
    call_id: str
    room_id: str


# ========== Emergency Phone Models ==========

class EmergencyPhoneBase(BaseModel):
    """Base model for emergency phone numbers"""
    phone_number: str = Field(..., min_length=9, max_length=15)
    country_code: str = Field(default="+34", pattern=r"^\+[0-9]{1,3}$")
    is_primary: bool = False
    label: str = Field(default="Teléfono personal", max_length=50)
    notes: Optional[str] = Field(default=None, max_length=200)

    @validator('phone_number')
    def validate_phone_format(cls, v, values):
        """Validate phone number format using advanced validator"""
        if v and VALIDATORS_AVAILABLE:
            # Extract country code if available
            country = values.get('country_code', '+34').replace('+', '')
            # Determine region code (ES for Spain, etc.)
            region_map = {
                '34': 'ES',
                '1': 'US',
                '44': 'GB',
                '33': 'FR',
                '49': 'DE'
            }
            region = region_map.get(country, None)
            return validate_phone_number(v, region)
        return sanitize_phone_number(v) if v else v

    @validator('label', 'notes')
    def sanitize_text(cls, v):
        """Sanitize text fields to prevent XSS"""
        return sanitize_html(v) if v else v


class EmergencyPhoneCreate(EmergencyPhoneBase):
    """Model for creating emergency phone numbers"""
    pass


class EmergencyPhoneResponse(EmergencyPhoneBase):
    """Response model for emergency phone numbers"""
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime
    is_verified: bool = False


class EmergencyPhoneUpdate(BaseModel):
    """Model for updating emergency phone numbers"""
    phone_number: Optional[str] = Field(default=None, min_length=9, max_length=15, pattern=r"^\+?[0-9\s\-\(\)]+")
    country_code: Optional[str] = Field(default=None, pattern=r"^\+[0-9]{1,3}$")
    is_primary: Optional[bool] = None
    label: Optional[str] = Field(default=None, max_length=50)
    notes: Optional[str] = Field(default=None, max_length=200)


class EmergencyPhoneListResponse(BaseModel):
    """Response with list of emergency phones"""
    phones: List[EmergencyPhoneResponse]
    total_count: int


# ========== reCAPTCHA Models ==========

class RecaptchaVerifyRequest(BaseModel):
    """Request to verify reCAPTCHA token"""
    recaptcha_token: str
    action: Optional[str] = Field(default="submit", max_length=50)


class RecaptchaVerifyResponse(BaseModel):
    """Response from reCAPTCHA verification"""
    success: bool
    score: Optional[float] = Field(default=None, ge=0, le=1)
    action: Optional[str] = None
    hostname: Optional[str] = None
    error_codes: Optional[List[str]] = None


class VideoCallAcceptRequest(BaseModel):
    """Request to accept video call invitation"""
    invitation_id: str
    user_id: str
    display_name: str


class VideoCallEndRequest(BaseModel):
    """Request to end video call"""
    call_id: str
    user_id: str
    end_reason: str = Field(..., pattern="^(user_initiated|timeout|technical_error|moderation_action)$")


class VideoCallParticipant(BaseModel):
    """Video call participant information"""
    user_id: str
    display_name: str
    is_host: bool
    audio_enabled: bool
    video_enabled: bool
    connection_quality: str
    joined_at: datetime


class VideoCallInfo(BaseModel):
    """Video call information"""
    call_id: str
    room_id: str
    status: str
    started_at: datetime
    ended_at: Optional[datetime]
    duration_seconds: Optional[int]
    max_participants: int
    current_participants: int
    total_participants: int
    is_private: bool
    recording_status: str
    recording_url: Optional[str]
    participants: List[VideoCallParticipant]
    ice_servers: List[Dict[str, Any]]
    rtc_config: Dict[str, Any]


class VideoCallRecordingRequest(BaseModel):
    """Request to start/stop call recording"""
    call_id: str
    user_id: str


class VideoCallModerationRequest(BaseModel):
    """Request to moderate call content"""
    call_id: str
    user_id: str
    content_type: str = Field(..., pattern="^(screen_share|chat_message|virtual_background)$")
    content_data: Dict[str, Any]


class VideoCallStatistics(BaseModel):
    """Video call system statistics"""
    active_calls: int
    total_participants: int
    total_calls_created: int
    successful_connections: int
    failed_connections: int
    connection_success_rate: float
    total_call_duration_seconds: int
    average_call_duration_seconds: float
    active_invitations: int
    total_recordings: int
