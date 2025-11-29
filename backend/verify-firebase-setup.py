#!/usr/bin/env python3
"""
Script de Verificación de Firebase Admin SDK
Verifica que las credenciales están correctamente configuradas
"""

import os
import sys
import json
from pathlib import Path

def print_header(text):
    """Print formatted header"""
    print("\n" + "=" * 60)
    print(f"  {text}")
    print("=" * 60 + "\n")

def print_check(condition, success_msg, error_msg):
    """Print check result"""
    if condition:
        print(f"✅ {success_msg}")
        return True
    else:
        print(f"❌ {error_msg}")
        return False

def main():
    print_header("🔍 Verificación de Firebase Admin SDK")

    all_checks_passed = True

    # Check 1: Environment variables
    print("📋 Verificando variables de entorno...")

    cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    service_account_json = os.getenv("SERVICE_ACCOUNT_JSON")

    has_cred_path = print_check(
        cred_path is not None,
        f"GOOGLE_APPLICATION_CREDENTIALS configurado: {cred_path}",
        "GOOGLE_APPLICATION_CREDENTIALS no está configurado"
    )

    has_service_account = print_check(
        service_account_json is not None,
        "SERVICE_ACCOUNT_JSON configurado (modo Railway/Cloud)",
        "SERVICE_ACCOUNT_JSON no está configurado (esto es normal en desarrollo local)"
    )

    if not has_cred_path and not has_service_account:
        print("\n⚠️  ERROR: No se encontró ninguna configuración de credenciales")
        print("   Debes configurar una de estas opciones:")
        print("   1. GOOGLE_APPLICATION_CREDENTIALS (para desarrollo local)")
        print("   2. SERVICE_ACCOUNT_JSON (para Railway/producción)")
        all_checks_passed = False

    print()

    # Check 2: Credential file (if using file path)
    if has_cred_path:
        print("📁 Verificando archivo de credenciales...")

        file_exists = print_check(
            os.path.exists(cred_path),
            f"Archivo existe: {cred_path}",
            f"Archivo NO existe: {cred_path}"
        )

        if file_exists:
            try:
                with open(cred_path, 'r') as f:
                    cred_data = json.load(f)

                valid_type = print_check(
                    cred_data.get("type") == "service_account",
                    "Tipo de credencial válido: service_account",
                    "Tipo de credencial inválido"
                )

                has_project = print_check(
                    cred_data.get("project_id") == "tuscitasseguras-2d1a6",
                    f"Project ID correcto: {cred_data.get('project_id')}",
                    "Project ID incorrecto o faltante"
                )

                has_private_key = print_check(
                    "private_key" in cred_data,
                    "Private key presente",
                    "Private key faltante"
                )

                has_client_email = print_check(
                    "client_email" in cred_data,
                    f"Client email: {cred_data.get('client_email')}",
                    "Client email faltante"
                )

                if not (valid_type and has_project and has_private_key and has_client_email):
                    all_checks_passed = False

            except json.JSONDecodeError:
                print("❌ El archivo no es un JSON válido")
                all_checks_passed = False
            except Exception as e:
                print(f"❌ Error al leer el archivo: {e}")
                all_checks_passed = False
        else:
            all_checks_passed = False

        print()

    # Check 3: Try to initialize Firebase
    print("🔥 Verificando inicialización de Firebase Admin SDK...")

    try:
        from firebase_admin import credentials, initialize_app, auth

        # Try to initialize
        if service_account_json:
            service_account_dict = json.loads(service_account_json)
            cred = credentials.Certificate(service_account_dict)
            print("✅ Credenciales cargadas desde SERVICE_ACCOUNT_JSON")
        elif cred_path and os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            print(f"✅ Credenciales cargadas desde {cred_path}")
        else:
            raise ValueError("No se encontraron credenciales válidas")

        # Initialize app (use a unique name to avoid conflicts)
        app = initialize_app(cred, name='verification-app')
        print("✅ Firebase Admin SDK inicializado correctamente")

        # Try to verify a dummy token (this will fail but confirms SDK works)
        try:
            auth.verify_id_token("dummy-token", app=app)
        except auth.InvalidIdTokenError:
            print("✅ Verificación de tokens funcionando (error esperado con token dummy)")
        except Exception as e:
            print(f"✅ SDK funcional (error esperado: {type(e).__name__})")

    except ImportError as e:
        print(f"❌ Error: firebase-admin no está instalado")
        print(f"   Ejecuta: pip install firebase-admin")
        all_checks_passed = False
    except Exception as e:
        print(f"❌ Error al inicializar Firebase: {e}")
        all_checks_passed = False

    print()

    # Check 4: .gitignore
    print("🔒 Verificando seguridad (.gitignore)...")

    gitignore_path = Path(__file__).parent / ".gitignore"
    if gitignore_path.exists():
        with open(gitignore_path, 'r') as f:
            gitignore_content = f.read()

        protected = print_check(
            "firebase-credentials.json" in gitignore_content,
            "firebase-credentials.json está en .gitignore ✓",
            "⚠️  firebase-credentials.json NO está en .gitignore (RIESGO DE SEGURIDAD)"
        )

        if not protected:
            all_checks_passed = False
    else:
        print("⚠️  .gitignore no encontrado")

    print()

    # Final summary
    print_header("📊 RESUMEN")

    if all_checks_passed:
        print("✅ ¡Todas las verificaciones pasaron!")
        print("\n🎉 Tu configuración de Firebase Admin SDK está correcta")
        print("\nPuedes iniciar el servidor:")
        print("   uvicorn main:app --reload")
        return 0
    else:
        print("❌ Algunas verificaciones fallaron")
        print("\n📚 Consulta la documentación:")
        print("   - FIREBASE_KEY_SETUP.md")
        print("   - backend/.env.example")
        print("\n🆘 O ejecuta el script de configuración:")
        print("   - setup-firebase-key.ps1 (Windows)")
        return 1

if __name__ == "__main__":
    sys.exit(main())
