#!/usr/bin/env python3
"""
Script simplificado para crear cuentas de admin solo en Firebase Auth
Las Cloud Functions deployadas (onUserDocCreate) crearán los documentos de Firestore automáticamente
"""
import os
import sys
import ssl
from pathlib import Path

# Fix SSL issues
os.environ['GRPC_SSL_CIPHER_SUITES'] = 'HIGH+ECDSA'
ssl._create_default_https_context = ssl._create_unverified_context

import firebase_admin
from firebase_admin import credentials, auth

# Lista de administradores a crear
ADMINS = [
    {"email": "cesar.herrera.rojo@gmail.com", "gender": "masculino"},
    {"email": "lacasitadebarajas@gmail.com", "gender": "femenino"},
    {"email": "gonzalo.hrrj@gmail.com", "gender": "masculino"}
]

def create_admin(email, gender):
    """Crear un usuario administrador en Firebase Auth"""
    print(f"\n{'━' * 60}")
    print(f"📧 Email: {email}")
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

        # Establecer custom claims (role y gender)
        auth.set_custom_user_claims(user.uid, {
            "role": "admin",
            "gender": gender
        })
        print("  ✅ Custom claims configurados (role: admin, gender: {})".format(gender))

        print(f"✅ COMPLETADO: {email}")
        print(f"  ℹ️  Firestore se actualizará automáticamente con las Cloud Functions")

        return {"success": True, "email": email, "uid": user.uid, "is_new": is_new}

    except Exception as e:
        print(f"❌ ERROR: {email}")
        print(f"   {str(e)}")
        import traceback
        traceback.print_exc()
        return {"success": False, "email": email, "error": str(e)}

def main():
    print("=" * 70)
    print("🚀 CREACIÓN DE CUENTAS DE ADMINISTRADOR")
    print("=" * 70)

    # Inicializar Firebase - usar ruta relativa para Windows/Linux
    script_dir = Path(__file__).parent
    cred_path = script_dir.parent / 'backend' / 'firebase-credentials.json'

    if not cred_path.exists():
        print(f"❌ ERROR: No se encuentra el archivo de credenciales en: {cred_path}")
        print(f"   Asegúrate de que el archivo firebase-credentials.json esté en la carpeta 'backend'")
        sys.exit(1)

    cred = credentials.Certificate(str(cred_path))
    firebase_admin.initialize_app(cred)

    print(f"✅ Firebase Auth inicializado")
    print(f"📁 Credenciales: {cred_path}")

    print(f"\n{'═' * 60}")
    print(f"📋 Procesando {len(ADMINS)} cuentas...")
    print(f"{'═' * 60}")

    results = []

    # Crear cada admin
    for admin in ADMINS:
        result = create_admin(admin["email"], admin["gender"])
        results.append(result)

    # Resumen
    print(f"\n{'═' * 70}")
    print("📊 RESUMEN FINAL")
    print(f"{'═' * 70}")

    successful = [r for r in results if r["success"]]
    failed = [r for r in results if not r["success"]]

    print(f"✅ Exitosos: {len(successful)}/{len(ADMINS)}")

    if successful:
        print("\n📋 Cuentas creadas/actualizadas:")
        for r in successful:
            admin = next(a for a in ADMINS if a["email"] == r["email"])
            status = "NUEVA" if r["is_new"] else "ACTUALIZADA"
            print(f"  ✓ {r['email']}")
            print(f"    - UID: {r['uid']}")
            print(f"    - Género: {admin['gender']}")
            print(f"    - Role: admin")
            print(f"    - Estado: {status}")

    if failed:
        print(f"\n❌ Fallidos: {len(failed)}/{len(ADMINS)}")
        print("\nCuentas con error:")
        for f in failed:
            print(f"  ✗ {f['email']}: {f['error']}")

    print("\n" + "=" * 70)
    print("📝 PRÓXIMOS PASOS PARA LOS ADMINISTRADORES")
    print("=" * 70)
    print("1. Ir a la página de login de la aplicación")
    print("2. Click en 'Olvidé mi contraseña'")
    print("3. Ingresar su email")
    print("4. Revisar el correo y crear una nueva contraseña")
    print("5. Hacer login - Los documentos de Firestore se crearán automáticamente")
    print("=" * 70)

    if len(successful) == len(ADMINS):
        print("\n🎉 ¡Todas las cuentas de administrador están listas!")
        sys.exit(0)
    else:
        print(f"\n⚠️  Se completaron {len(successful)} de {len(ADMINS)} cuentas")
        sys.exit(1)

if __name__ == "__main__":
    main()
