#!/usr/bin/env python3
"""
Script para eliminar usuarios semilla de Firebase Auth y Firestore.
Elimina:
- Usuarios con email @example.com (usuarios semilla del seed_data.py)
- Usuario de prueba: prueba@tucitasegura.com
"""

import firebase_admin
from firebase_admin import credentials, firestore, auth
import os
from dotenv import load_dotenv

# Load env vars
load_dotenv()

# Initialize Firebase
project_id = "tucitasegura-129cc"

try:
    print(f"🔌 Conectando a proyecto: {project_id}...")
    
    # Check if app exists
    try:
        app = firebase_admin.get_app()
    except ValueError:
        app = firebase_admin.initialize_app(options={'projectId': project_id})
            
    db = firestore.client()
    print("✅ Conectado a Firestore correctamente.\n")
except Exception as e:
    print(f"❌ Error conectando a Firebase: {e}")
    print("💡 Intenta ejecutar: 'gcloud auth application-default login'")
    import traceback
    traceback.print_exc()
    exit(1)

# Lista de usuarios semilla conocidos
SEED_USER_EMAILS = [
    "prueba@tucitasegura.com"
]

# Aliases conocidos de usuarios semilla
SEED_USER_ALIASES = [
    "Ana Madrid",
    "Carlos Viajero",
    "Elena Fitness",
    "David Tech",
    "Lucía Chef",
    "Jorge Músico",
    "Sofia Yoga",
    "Pablo Cine",
    "Marta Baile",
    "Diego Foto",
    "Laura Libros",
    "Alberto Bici",
    "Carmen Mar",
    "Ruben Montaña",
    "Patricia Animales",
    "Sergio Gamer",
    "Bea Moda",
    "Javi Motor",
    "Irene Teatro",
    "Manu Futbol",
    "Usuario Prueba"
]

def delete_seed_users():
    """
    Eliminar usuarios semilla de Firebase Auth y Firestore.
    """
    print("🔍 Buscando usuarios semilla...\n")
    
    deleted_count = 0
    deleted_emails = []
    deleted_aliases = []
    
    try:
        # 1. Buscar usuarios por email @example.com
        print("📧 Buscando usuarios con email @example.com...")
        users_ref = db.collection("users")
        
        # Buscar en Firestore usuarios con email @example.com
        seed_docs = users_ref.where("email", ">=", "@example.com").where("email", "<=", "@example.com\uf8ff").stream()
        
        seed_user_ids = []
        for doc in seed_docs:
            user_data = doc.to_dict()
            email = user_data.get("email", "")
            alias = user_data.get("alias", "")
            if email.endswith("@example.com"):
                seed_user_ids.append(doc.id)
                deleted_aliases.append(alias)
                print(f"  ⚠️  Encontrado: {alias} ({email}) - ID: {doc.id}")
        
        # 2. Buscar usuarios semilla conocidos por email
        print("\n📧 Buscando usuarios semilla conocidos por email...")
        for email in SEED_USER_EMAILS:
            try:
                user = auth.get_user_by_email(email)
                if user.uid not in seed_user_ids:
                    seed_user_ids.append(user.uid)
                deleted_emails.append(email)
                print(f"  ⚠️  Encontrado: {email} - ID: {user.uid}")
            except auth.UserNotFoundError:
                print(f"  ℹ️  Usuario no encontrado en Auth: {email}")
        
        # 3. Buscar usuarios por alias conocidos
        print("\n👤 Buscando usuarios semilla por alias...")
        for alias in SEED_USER_ALIASES:
            alias_docs = users_ref.where("alias", "==", alias).stream()
            for doc in alias_docs:
                user_data = doc.to_dict()
                email = user_data.get("email", "")
                if doc.id not in seed_user_ids:
                    # Verificar que sea realmente un usuario semilla
                    if email.endswith("@example.com") or email == "prueba@tucitasegura.com":
                        seed_user_ids.append(doc.id)
                        deleted_aliases.append(alias)
                        print(f"  ⚠️  Encontrado por alias: {alias} ({email}) - ID: {doc.id}")
        
        # Eliminar duplicados
        seed_user_ids = list(set(seed_user_ids))
        
        if not seed_user_ids:
            print("\n✅ No se encontraron usuarios semilla para eliminar.")
            return
        
        # Confirmar eliminación
        print(f"\n⚠️  ADVERTENCIA: Se van a eliminar {len(seed_user_ids)} usuarios semilla.")
        print("\nUsuarios a eliminar:")
        for uid in seed_user_ids:
            try:
                user = auth.get_user(uid)
                print(f"  - {user.email or uid}")
            except:
                print(f"  - {uid} (solo en Firestore)")
        
        confirm = input("\n¿Continuar con la eliminación? (escribe 'SI' para confirmar): ")
        if confirm != "SI":
            print("❌ Eliminación cancelada.")
            return
        
        print("\n🗑️  Iniciando eliminación...\n")
        
        # 4. Eliminar usuarios
        for uid in seed_user_ids:
            try:
                print(f"🗑️  Eliminando usuario: {uid}")
                
                # Eliminar de Firestore
                try:
                    user_ref = db.collection("users").document(uid)
                    user_doc = user_ref.get()
                    
                    if user_doc.exists:
                        user_data = user_doc.to_dict()
                        email = user_data.get("email", "N/A")
                        alias = user_data.get("alias", "N/A")
                        
                        # Eliminar documento
                        user_ref.delete()
                        print(f"  ✅ Firestore document eliminado: {alias} ({email})")
                    else:
                        print(f"  ⚠️  Documento Firestore no encontrado")
                except Exception as e:
                    print(f"  ⚠️  Error eliminando de Firestore: {e}")
                
                # Eliminar de Auth
                try:
                    user = auth.get_user(uid)
                    auth.delete_user(uid)
                    print(f"  ✅ Auth user eliminado: {user.email or uid}")
                    deleted_count += 1
                except auth.UserNotFoundError:
                    print(f"  ⚠️  Usuario no encontrado en Auth")
                except Exception as e:
                    print(f"  ⚠️  Error eliminando de Auth: {e}")
                
                print()
                
            except Exception as e:
                print(f"  ❌ Error procesando usuario {uid}: {e}\n")
        
        print(f"\n✅ Eliminación completada!")
        print(f"   Total usuarios eliminados: {deleted_count}")
        if deleted_emails:
            print(f"   Emails eliminados: {', '.join(deleted_emails)}")
        if deleted_aliases:
            print(f"   Aliases eliminados: {len(set(deleted_aliases))} usuarios únicos")
        
    except Exception as e:
        print(f"\n❌ Error durante la eliminación: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    delete_seed_users()

