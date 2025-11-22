from pydantic import BaseModel, Field
class EmergencyPhoneRequest(BaseModel):
    phone_number: str = Field(..., min_length=9)
    recaptcha_token: str
class EmergencyPhoneResponse(BaseModel):
    uid: str
    has_emergency_phone: bool
    message: str
