
import firebase_admin
from firebase_admin import credentials, firestore, auth
import random
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

# Load env vars
load_dotenv()

# Initialize Firebase
# Force use of default credentials (gcloud) and correct project
project_id = "tucitasegura-129cc"

try:
    print(f"🔌 Intentando conectar a proyecto: {project_id} usando Default Credentials...")
    
    # Check if app exists
    try:
        app = firebase_admin.get_app()
    except ValueError:
        app = firebase_admin.initialize_app(options={'projectId': project_id})
            
    db = firestore.client()
    print("✅ Conectado a Firestore corréctamente.")
except Exception as e:
    print(f"❌ Error conectando a Firebase: {e}")
    print("💡 Intenta ejecutar: 'gcloud auth application-default login' si falla la autenticación.")
    import traceback
    traceback.print_exc()
    exit(1)

def create_login_user():
    email = "prueba@tucitasegura.com"
    password = "password123"
    alias = "Usuario Prueba"
    
    print(f"👤 Creando usuario de prueba: {email}")
    
    try:
        # Create Auth User
        try:
            user = auth.get_user_by_email(email)
            print(f"⚠️ El usuario ya existe en Auth (UID: {user.uid}). Actualizando perfil...")
        except auth.UserNotFoundError:
            user = auth.create_user(
                email=email,
                email_verified=True,
                password=password,
                display_name=alias,
                disabled=False
            )
            print(f"✅ Usuario Auth creado: {user.uid}")

        # Create/Update Firestore Profile
        user_ref = db.collection("users").document(user.uid)
        
        user_data = {
            "alias": alias,
            "gender": "masculino",
            "bio": "Cuenta de prueba para verificación.",
            "email": email,
            "birthDate": "1990-01-01",
            "location": {"lat": 40.4168, "lng": -3.7038}, # Madrid
            "interests": ["Tecnología", "Pruebas"],
            "reputation": "ORO",
            "isOnline": True,
            "emailVerified": True,
            "createdAt": firestore.SERVER_TIMESTAMP,
            "galleryPhotos": [], 
            "avatarUrl": f"https://api.dicebear.com/7.x/avataaars/svg?seed={alias}", 
            "searchable": True,
            "hasActiveSubscription": True, # Premium for testing
            "hasAntiGhostingInsurance": True
        }

        user_ref.set(user_data, merge=True)
        print(f"✅ Perfil Firestore creado/actualizado para: {user.uid}")
        
        print("\n🎉 CREDENCIALES DE ACCESO:")
        print(f"📧 Email: {email}")
        print(f"🔑 Pass:  {password}")
        
    except Exception as e:
        print(f"❌ Error creando usuario: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    create_login_user()
