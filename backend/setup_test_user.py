"""
Script para configurar el usuario de prueba con perfil completo en Firestore
"""
import firebase_admin
from firebase_admin import credentials, firestore, auth
import os

# Inicializar Firebase Admin SDK
if not firebase_admin._apps:
    cred_path = os.path.join(os.path.dirname(__file__), 'serviceAccountKey.json')
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)

db = firestore.client()

# UID del usuario de prueba (prueba@tucitasegura.com)
TEST_USER_UID = "wjl9D7y9TLXAMQj41GqEJwULcxV2"
TEST_USER_EMAIL = "prueba@tucitasegura.com"

# Datos del perfil completo
profile_data = {
    "uid": TEST_USER_UID,
    "email": TEST_USER_EMAIL,
    "alias": "UsuarioPrueba",
    "displayName": "Usuario de Prueba",
    "birth_date": "1990-05-15",
    "birthDate": "1990-05-15",
    "gender": "hombre",
    "city": "Madrid",
    "municipio": "Madrid",
    "profession": "Desarrollador de Software",
    "bio": """Hola, soy un usuario de prueba para la plataforma TuCitaSegura. 
    Me encanta la tecnología, el cine y viajar a lugares nuevos y emocionantes. Busco conocer gente interesante 
    para compartir experiencias únicas y memorables. Soy una persona honesta, divertida y con ganas 
    de conocer el mundo entero. Me gusta la música de todos los géneros, el arte contemporáneo y la naturaleza salvaje. 
    En mi tiempo libre disfruto leyendo libros de ciencia ficción, haciendo senderismo por montañas y probando nuevos 
    restaurantes de comida internacional. Creo firmemente en la importancia de la comunicación abierta y el respeto mutuo 
    en cualquier tipo de relación personal o profesional. Estoy aquí para conocer personas genuinas que compartan 
    valores similares a los míos y que busquen conexiones auténticas. Si te gusta la aventura constante y las buenas conversaciones nocturnas, 
    definitivamente podemos conectar y conocernos mejor. Me considero una persona muy optimista y siempre 
    busco ver el lado positivo de todas las cosas que me pasan. La vida es demasiado corta para no disfrutarla 
    al máximo cada día. Espero conocerte pronto y compartir buenos momentos juntos en esta plataforma maravillosa.
    Me apasiona aprender cosas nuevas constantemente y compartir mis conocimientos con los demás. Creo que cada persona
    tiene algo valioso que aportar y estoy siempre dispuesto a escuchar diferentes perspectivas y opiniones.
    La curiosidad es una de mis mayores virtudes y me impulsa a explorar nuevos horizontes continuamente.""",
    "photoURL": "https://ui-avatars.com/api/?name=Usuario+Prueba&background=random&size=200",
    "photos": [
        "https://picsum.photos/seed/test1/400/400",
        "https://picsum.photos/seed/test2/400/400",
        "https://picsum.photos/seed/test3/400/400"
    ],
    "galleryPhotos": [
        "https://picsum.photos/seed/gallery1/400/400",
        "https://picsum.photos/seed/gallery2/400/400",
        "https://picsum.photos/seed/gallery3/400/400"
    ],
    "profileComplete": True,
    "emailVerified": True,
    "isVerified": True,
    "createdAt": firestore.SERVER_TIMESTAMP,
    "updatedAt": firestore.SERVER_TIMESTAMP,
    "status": "active",
    "reputation": "BRONCE",
    "interests": ["tecnología", "viajes", "cine", "música"],
    "lookingFor": "amistad",
    "ageRange": {"min": 25, "max": 45}
}

def setup_test_user():
    print(f"🔧 Configurando usuario de prueba: {TEST_USER_EMAIL}")
    
    # Actualizar documento en Firestore
    user_ref = db.collection('users').document(TEST_USER_UID)
    user_ref.set(profile_data, merge=True)
    
    print("✅ Perfil actualizado en Firestore")
    
    # Verificar email en Firebase Auth
    try:
        user = auth.get_user(TEST_USER_UID)
        if not user.email_verified:
            auth.update_user(TEST_USER_UID, email_verified=True)
            print("✅ Email marcado como verificado en Firebase Auth")
        else:
            print("✅ Email ya estaba verificado")
    except Exception as e:
        print(f"⚠️ No se pudo verificar email en Auth: {e}")
    
    # Verificar que se guardó
    doc = user_ref.get()
    if doc.exists:
        data = doc.to_dict()
        print(f"\n📋 Datos guardados:")
        print(f"   - Alias: {data.get('alias')}")
        print(f"   - Ciudad: {data.get('city')}")
        print(f"   - Profesión: {data.get('profession')}")
        print(f"   - Bio: {len(data.get('bio', ''))} caracteres")
        print(f"   - Fotos: {len(data.get('photos', []))} fotos")
        print(f"   - Perfil completo: {data.get('profileComplete')}")
        print(f"\n🎉 Usuario de prueba listo para usar!")
    else:
        print("❌ Error: documento no encontrado después de guardar")

if __name__ == "__main__":
    setup_test_user()
