import requests, os
from fastapi import HTTPException
RECAPTCHA_SECRET_KEY = os.getenv("RECAPTCHA_SECRET_KEY", "TU_CLAVE_AQUI")
class RecaptchaService:
    @staticmethod
    def verify_token(token: str):
        if not token: raise HTTPException(400, "Falta token")
        res = requests.post("https://www.google.com/recaptcha/api/siteverify", 
                          data={'secret': RECAPTCHA_SECRET_KEY, 'response': token}).json()
        if not res.get('success') or res.get('score', 0) < 0.5:
            raise HTTPException(403, "Bot detectado")
        return True
