#!/usr/bin/env python3
"""
Script para crear administradores usando solo Firebase Auth (sin Firestore)
"""
import firebase_admin
from firebase_admin import credentials, auth
import sys
import time

# Lista de administradores a crear
ADMINS = [
    {"email": "cesar.herrera.rojo@gmail.com", "gender": "masculino"},
    {"email": "lacasitadebarajas@gmail.com", "gender": "femenino"},
    {"email": "gonzalo.hrrj@gmail.com", "gender": "masculino"}
]

def create_admin_auth_only(email, gender):
    """Crear un usuario administrador solo en Firebase Auth"""
    print(f"\n{'━' * 60}")
    print(f"📧 Creando: {email}")
    print(f"👤 Género: {gender}")
    print(f"{'━' * 60}")

    try:
        # Buscar o crear usuario
        try:
            user = auth.get_user_by_email(email)
            print(f"  ✅ Usuario encontrado: {user.uid}")
            is_new = False
        except auth.UserNotFoundError:
            print("  ℹ️  Usuario no existe, creando...")
            user = auth.create_user(
                email=email,
                email_verified=True,
                display_name="Administrador",
                password=f"Admin{int(time.time())}!"
            )
            print(f"  ✅ Usuario creado: {user.uid}")
            is_new = True

        # Establecer custom claims
        auth.set_custom_user_claims(user.uid, {
            "role": "admin",
            "gender": gender
        })
        print("  ✅ Custom claims configurados (role: admin)")

        print(f"✅ ÉXITO: {email}")
        print(f"   UID: {user.uid}")
        return {"success": True, "email": email, "uid": user.uid, "is_new": is_new}

    except Exception as e:
        print(f"❌ ERROR: {email}")
        print(f"   {str(e)}")
        return {"success": False, "email": email, "error": str(e)}

def main():
    print("🚀 Creando administradores (solo Firebase Auth)...")

    # Inicializar Firebase
    cred_path = "/home/user/FZ6/backend/firebase-credentials.json"
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)

    print(f"✅ Firebase inicializado desde: {cred_path}")

    print(f"\n{'═' * 60}")
    print(f"🚀 Creando {len(ADMINS)} cuentas de administrador...")
    print(f"{'═' * 60}")

    results = []

    # Crear cada admin
    for admin in ADMINS:
        result = create_admin_auth_only(admin["email"], admin["gender"])
        results.append(result)

    # Resumen
    print(f"\n{'═' * 60}")
    print("📊 RESUMEN")
    print(f"{'═' * 60}")

    successful = [r for r in results if r["success"]]
    failed = [r for r in results if not r["success"]]

    print(f"✅ Exitosos: {len(successful)}/{len(ADMINS)}")

    if failed:
        print(f"❌ Fallidos: {len(failed)}/{len(ADMINS)}")
        print("\nEmails fallidos:")
        for f in failed:
            print(f"  - {f['email']}: {f['error']}")

    print("\n📝 IMPORTANTE:")
    print("⚠️  Los usuarios fueron creados SOLO en Firebase Auth")
    print("⚠️  Necesitas crear manualmente los documentos en Firestore")
    print("⚠️  O esperar a que los usuarios inicien sesión (el Cloud Function onUserDocCreate los creará)")

    print("\n📝 Próximos pasos:")
    print("1. Cada admin debe ir a la página de login")
    print("2. Click en 'Olvidé mi contraseña'")
    print("3. Ingresa su email respectivo")
    print("4. Revisa el correo y establece una nueva contraseña")

    print("\n📋 Lista de admins creados:")
    for r in successful:
        admin = next(a for a in ADMINS if a["email"] == r["email"])
        print(f"  📧 {r['email']} ({admin['gender']}) - UID: {r['uid']}")

    if len(successful) == len(ADMINS):
        print("\n🎉 ¡Todos los administradores creados exitosamente en Firebase Auth!")
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()
