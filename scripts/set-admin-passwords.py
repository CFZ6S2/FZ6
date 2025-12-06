#!/usr/bin/env python3
"""
Script para establecer contraseñas directamente a los administradores
Ya que Firebase App Check está bloqueado y no puede enviar emails
"""
import firebase_admin
from firebase_admin import credentials, auth
import sys

# Contraseña temporal segura para todos los admins
import os
# Contraseña obtenida de variable de entorno o input seguro
TEMP_PASSWORD = os.getenv("ADMIN_TEMP_PASSWORD") or input("Ingresa la contraseña temporal para admins: ")

# Lista de administradores
ADMINS = [
    {"email": "cesar.herrera.rojo@gmail.com", "uid": "VCUEimCib0XxWLgkyVDdQt5XXlv1"},
    {"email": "lacasitadebarajas@gmail.com", "uid": "gYkFee5cLVPn4DWb06uGoUxtGLx2"},
    {"email": "gonzalo.hrrj@gmail.com", "uid": "LLTBZ8TGfRZE1Bh76k2hYTzpOnA2"}
]

def set_password(email, uid):
    """Establecer contraseña para un admin"""
    print(f"\n📧 {email}")

    try:
        # Actualizar contraseña
        auth.update_user(
            uid,
            password=TEMP_PASSWORD
        )
        print(f"  ✅ Contraseña establecida")
        return True
    except Exception as e:
        print(f"  ❌ Error: {str(e)}")
        return False

def main():
    print("🔐 Estableciendo contraseñas para administradores...")

    # Inicializar Firebase
    cred_path = "/home/user/FZ6/backend/firebase-credentials.json"
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)

    print(f"✅ Firebase inicializado")
    print(f"\n{'═' * 60}")
    print(f"🔑 Estableciendo contraseña temporal para 3 admins")
    print(f"{'═' * 60}")

    success_count = 0

    for admin in ADMINS:
        if set_password(admin["email"], admin["uid"]):
            success_count += 1

    print(f"\n{'═' * 60}")
    print("📊 RESUMEN")
    print(f"{'═' * 60}")
    print(f"✅ Exitosos: {success_count}/{len(ADMINS)}")

    if success_count == len(ADMINS):
        print(f"\n🎉 ¡Contraseñas establecidas exitosamente!")
        print(f"\n{'═' * 60}")
        print("🔐 CREDENCIALES DE ACCESO")
        print(f"{'═' * 60}")
        print(f"\n📝 Contraseña temporal para TODOS los admins:")
        print(f"\n   {TEMP_PASSWORD}")
        print(f"\n{'─' * 60}")
        print("\n📧 Emails de administrador:")
        for admin in ADMINS:
            print(f"   • {admin['email']}")
        print(f"\n{'═' * 60}")
        print("\n📝 INSTRUCCIONES:")
        print("1. Ve a la página de login de TuCitaSegura")
        print("2. Ingresa tu email de administrador")
        print(f"3. Ingresa la contraseña: {TEMP_PASSWORD}")
        print("4. Una vez dentro, CAMBIA tu contraseña inmediatamente")
        print("   (Ve a Configuración → Cambiar contraseña)")
        print("\n⚠️  IMPORTANTE: Cada admin debe cambiar su contraseña después del primer login")
        print("")
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()
