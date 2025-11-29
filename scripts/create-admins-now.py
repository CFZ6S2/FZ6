#!/usr/bin/env python3
"""
Script para crear las 3 cuentas de administrador inmediatamente
"""
import firebase_admin
from firebase_admin import credentials, auth, firestore
import sys

# Lista de administradores a crear
ADMINS = [
    {"email": "cesar.herrera.rojo@gmail.com", "gender": "masculino"},
    {"email": "lacasitadebarajas@gmail.com", "gender": "femenino"},
    {"email": "gonzalo.hrrj@gmail.com", "gender": "masculino"}
]

def create_admin(email, gender):
    """Crear un usuario administrador"""
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
                password=f"Admin{int(__import__('time').time())}!"
            )
            print(f"  ✅ Usuario creado: {user.uid}")
            is_new = True

        # Establecer custom claims
        auth.set_custom_user_claims(user.uid, {
            "role": "admin",
            "gender": gender
        })
        print("  ✅ Custom claims configurados")

        # Actualizar Firestore
        db = firestore.client()
        user_ref = db.collection("users").document(user.uid)
        user_doc = user_ref.get()

        if not user_doc.exists:
            user_ref.set({
                "uid": user.uid,
                "email": email,
                "userRole": "admin",
                "gender": gender,
                "alias": "Admin",
                "createdAt": firestore.SERVER_TIMESTAMP,
                "lastActivity": firestore.SERVER_TIMESTAMP,
                "hasActiveSubscription": False,
                "subscriptionStatus": "none"
            })
            print("  ✅ Documento de Firestore creado")
        else:
            user_ref.update({
                "userRole": "admin",
                "gender": gender,
                "lastActivity": firestore.SERVER_TIMESTAMP
            })
            print("  ✅ Documento de Firestore actualizado")

        print(f"✅ ÉXITO: {email}")
        return {"success": True, "email": email, "uid": user.uid, "is_new": is_new}

    except Exception as e:
        print(f"❌ ERROR: {email}")
        print(f"   {str(e)}")
        return {"success": False, "email": email, "error": str(e)}

def main():
    print("🚀 Iniciando creación de administradores...")

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
        result = create_admin(admin["email"], admin["gender"])
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

    print("\n📝 Próximos pasos:")
    print("1. Cada admin debe ir a la página de login")
    print("2. Click en 'Olvidé mi contraseña'")
    print("3. Ingresa su email respectivo")
    print("4. Revisa el correo y establece una nueva contraseña")

    print("\n📋 Lista de admins creados:")
    for r in successful:
        admin = next(a for a in ADMINS if a["email"] == r["email"])
        print(f"  📧 {r['email']} ({admin['gender']})")

    if len(successful) == len(ADMINS):
        print("\n🎉 ¡Todos los administradores creados exitosamente!")
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()
