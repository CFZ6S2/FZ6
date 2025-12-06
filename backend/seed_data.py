
import firebase_admin
from firebase_admin import credentials, firestore
import random
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

# Load env vars
load_dotenv()

# Initialize Firebase
# Try to find credentials

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
    print(f"❌ Error conectando a Firestore: {e}")
    print("💡 Intenta ejecutar: 'gcloud auth application-default login' si falla la autenticación.")
    import traceback
    traceback.print_exc()
    exit(1)

# Data generators
def random_coordinates():
    # Madrid Center approx
    lat = 40.4168 + (random.random() - 0.5) * 0.1
    lng = -3.7038 + (random.random() - 0.5) * 0.1
    return {"lat": lat, "lng": lng}

def random_birthdate(min_age=18, max_age=50):
    age = random.randint(min_age, max_age)
    days = random.randint(0, 365)
    dob = datetime.now() - timedelta(days=age*365 + days)
    return dob.strftime("%Y-%m-%d")

INTERESTS = ["Deportes", "Viajes", "Cocina", "Música", "Cine", "Lectura", "Arte", "Tecnología", "Animales", "Baile", "Fotografía", "Naturaleza"]
REPUTATIONS = ["BRONCE", "PLATA", "ORO", "PLATINO"]
GENDERS = ["masculino", "femenino"]

USERS = [
    {"alias": "Ana Madrid", "gender": "femenino", "bio": "Amante del arte y los paseos por el retiro 🎨"},
    {"alias": "Carlos Viajero", "gender": "masculino", "bio": "Siempre planeando la próxima aventura ✈️"},
    {"alias": "Elena Fitness", "gender": "femenino", "bio": "Crossfit y vida sana 💪"},
    {"alias": "David Tech", "gender": "masculino", "bio": "Programador y gamer 🎮"},
    {"alias": "Lucía Chef", "gender": "femenino", "bio": "Me encanta cocinar para amigos 🍳"},
    {"alias": "Jorge Músico", "gender": "masculino", "bio": "Guitarrista en mis ratos libres 🎸"},
    {"alias": "Sofia Yoga", "gender": "femenino", "bio": "Namasté 🙏 Buscando paz y armonía"},
    {"alias": "Pablo Cine", "gender": "masculino", "bio": "Cinéfilo empedernido 🎬"},
    {"alias": "Marta Baile", "gender": "femenino", "bio": "Salsa y bachata los fines de semana 💃"},
    {"alias": "Diego Foto", "gender": "masculino", "bio": "Capturando momentos únicos 📸"},
    {"alias": "Laura Libros", "gender": "femenino", "bio": "Devoradora de libros 📚"},
    {"alias": "Alberto Bici", "gender": "masculino", "bio": "Rutas en bici por la sierra 🚴"},
    {"alias": "Carmen Mar", "gender": "femenino", "bio": "Enamorada del mar y la playa 🌊"},
    {"alias": "Ruben Montaña", "gender": "masculino", "bio": "Senderismo y escalada 🧗"},
    {"alias": "Patricia Animales", "gender": "femenino", "bio": "Voluntaria en refugio de animales 🐾"},
    {"alias": "Sergio Gamer", "gender": "masculino", "bio": "League of Legends y Valorant 🕹️"},
    {"alias": "Bea Moda", "gender": "femenino", "bio": "Diseñadora de moda y tendencias 👗"},
    {"alias": "Javi Motor", "gender": "masculino", "bio": "Pasión por las dos ruedas 🏍️"},
    {"alias": "Irene Teatro", "gender": "femenino", "bio": "Actriz amateur y drama queen 🎭"},
    {"alias": "Manu Futbol", "gender": "masculino", "bio": "Fútbol los domingos y cerveza ⚽"}
]

def seed_users():
    print("🌱 Iniciando seeding de usuarios...")
    batch = db.batch()
    count = 0

    for user_template in USERS:
        # Create user doc
        user_ref = db.collection("users").document()
        
        user_data = {
            "alias": user_template["alias"],
            "gender": user_template["gender"],
            "bio": user_template["bio"],
            "email": f"{user_template['alias'].replace(' ', '.').lower()}@example.com",
            "birthDate": random_birthdate(),
            "location": random_coordinates(),
            "interests": random.sample(INTERESTS, k=random.randint(3, 6)),
            "reputation": random.choice(REPUTATIONS),
            "isOnline": random.choice([True, False]),
            "emailVerified": True,
            "createdAt": firestore.SERVER_TIMESTAMP,
            "galleryPhotos": [], # Empty for now
            "avatarUrl": f"https://api.dicebear.com/7.x/avataaars/svg?seed={user_template['alias']}", # Placeholder avatar
            "searchable": True,
            "hasActiveSubscription": random.choice([True, False])
        }

        batch.set(user_ref, user_data)
        count += 1

    try:
        batch.commit()
        print(f"✅ Se han creado {count} usuarios de prueba correctamente.")
    except Exception as e:
        print(f"❌ Error al hacer commit del batch: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    seed_users()
