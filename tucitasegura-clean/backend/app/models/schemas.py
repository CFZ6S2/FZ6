"""
Pydantic schemas - SOLO LO ESENCIAL
"""
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field


# ========== Emergency Phone Models ==========

class EmergencyPhoneBase(BaseModel):
    """Base model for emergency phone numbers"""
    phone_number: str = Field(..., min_length=9, max_length=15, pattern=r"^\+?[0-9\s\-\(\)]+")
    country_code: str = Field(default="+34", pattern=r"^\+[0-9]{1,3}$")
    is_primary: bool = False
    label: str = Field(default="Teléfono personal", max_length=50)
    notes: Optional[str] = Field(default=None, max_length=200)


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


# ========== Generic Response Models ==========

class SuccessResponse(BaseModel):
    """Generic success response"""
    success: bool
    message: str


class ErrorResponse(BaseModel):
    """Generic error response"""
    error: str
    details: Optional[str] = None
    code: Optional[int] = None