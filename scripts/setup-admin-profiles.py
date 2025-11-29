#!/usr/bin/env python3
"""
Script para crear/actualizar perfiles de administradores en Firestore
Asegura que los admins puedan usar la app como usuarios normales
"""

import firebase_admin
from firebase_admin import credentials, auth, firestore
from datetime import datetime

# Inicializar Firebase
cred = credentials.Certificate('../backend/firebase-credentials.json')
firebase_admin.initialize_app(cred)

db = firestore.client()

# Lista de administradores (deben tener cuentas en Firebase Auth)
ADMINS = [
    {"email": "cesar.herrera.rojo@gmail.com", "gender": "masculino", "alias": "César Admin"},
    {"email": "lacasitadebarajas@gmail.com", "gender": "femenino", "alias": "La Casita Admin"},
    {"email": "gonzalo.hrrj@gmail.com", "gender": "masculino", "alias": "Gonzalo Admin"}
]

def setup_admin_profile(email, gender, alias):
    """
    Crear o actualizar perfil de admin en Firestore
    """
    try:
        # Obtener usuario de Firebase Auth
        user = auth.get_user_by_email(email)
        uid = user.uid

        print(f"\n✓ Usuario encontrado: {email} (UID: {uid})")

        # Referencia al documento del usuario
        user_ref = db.collection('users').document(uid)
        user_doc = user_ref.get()

        # Datos mínimos para que el admin funcione como usuario
        admin_data = {
            'uid': uid,
            'email': email,
            'userRole': 'admin',  # Importante: role en Firestore
            'gender': gender,
            'alias': alias,
            'name': alias,
            'birthDate': '1990-01-01',  # Fecha de nacimiento ficticia (mayor de 18)
            'city': 'Madrid',
            'profession': 'Administrador',
            'bio': 'Cuenta de administrador del sistema. ' * 15,  # Bio de 120+ palabras
            'photos': [],  # Sin fotos por ahora
            'balance': 0,  # Monedero en 0
            'hasActiveSubscription': False,
            'subscriptionStatus': 'none',
            'lastActivity': firestore.SERVER_TIMESTAMP,
        }

        if user_doc.exists:
            # Actualizar solo campos esenciales sin sobrescribir datos existentes
            print(f"  → Documento existe, actualizando campos esenciales...")
            update_data = {
                'userRole': 'admin',
                'gender': gender,
                'lastActivity': firestore.SERVER_TIMESTAMP
            }
            user_ref.update(update_data)
            print(f"  ✓ Perfil actualizado para {email}")
        else:
            # Crear nuevo documento
            print(f"  → Documento NO existe, creando perfil completo...")
            admin_data['createdAt'] = firestore.SERVER_TIMESTAMP
            user_ref.set(admin_data)
            print(f"  ✓ Perfil creado para {email}")

        # Verificar custom claims
        user = auth.get_user(uid)
        claims = user.custom_claims or {}

        print(f"  → Custom claims: role={claims.get('role')}, gender={claims.get('gender')}")

        if claims.get('role') != 'admin' or claims.get('gender') != gender:
            print(f"  → Actualizando custom claims...")
            auth.set_custom_user_claims(uid, {
                'role': 'admin',
                'gender': gender
            })
            print(f"  ✓ Custom claims actualizados")

        print(f"✅ Admin configurado: {email}")
        return uid

    except auth.UserNotFoundError:
        print(f"❌ Error: Usuario {email} no existe en Firebase Auth")
        print(f"   Primero ejecuta create-admins-auth-simple.py para crear la cuenta")
        return None
    except Exception as e:
        print(f"❌ Error configurando {email}: {e}")
        return None

def main():
    print("=" * 70)
    print("CONFIGURACIÓN DE PERFILES DE ADMINISTRADORES")
    print("=" * 70)
    print("\nEste script asegura que los admins tengan perfiles en Firestore")
    print("para que puedan usar la app como usuarios normales.\n")

    success_count = 0

    for admin in ADMINS:
        uid = setup_admin_profile(
            email=admin['email'],
            gender=admin['gender'],
            alias=admin['alias']
        )
        if uid:
            success_count += 1

    print("\n" + "=" * 70)
    print(f"✅ Proceso completado: {success_count}/{len(ADMINS)} admins configurados")
    print("=" * 70)

    if success_count < len(ADMINS):
        print("\n⚠️  Algunos admins no pudieron ser configurados.")
        print("   Verifica que las cuentas existan en Firebase Auth.\n")

if __name__ == '__main__':
    main()
