from fastapi import APIRouter, Depends
from app.models.schemas import EmergencyPhoneRequest
from app.services.security.recaptcha_service import RecaptchaService
from app.services.firestore.emergency_phones_service import EmergencyPhoneService

router = APIRouter()
svc = EmergencyPhoneService()

# Mock auth para que funcione la demo
async def get_user(): return {"uid": "test_user"}

@router.post("/save")
async def save(req: EmergencyPhoneRequest, user=Depends(get_user)):
    RecaptchaService.verify_token(req.recaptcha_token)
    await svc.save_phone(user['uid'], req.phone_number)
    return {"message": "Guardado seguro"}
