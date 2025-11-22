from fastapi import FastAPI
from app.api import emergency_phones
import firebase_admin
try: firebase_admin.initialize_app()
except: pass
app = FastAPI()
app.include_router(emergency_phones.router, prefix="/api/v1/security")
