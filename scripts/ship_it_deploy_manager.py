import os
import subprocess
import sys
import platform
import shutil
import datetime
import json
import argparse

PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(PROJECT_ROOT, os.pardir))
WEBAPP_DIR = os.path.join(PROJECT_ROOT, "webapp")
BACKEND_DIR = os.path.join(PROJECT_ROOT, "backend")
FUNCTIONS_DIR = os.path.join(PROJECT_ROOT, "functions")
LOG_FILE = os.path.join(PROJECT_ROOT, "deployment.log")

COLORS = {
    "HEADER": "\033[95m",
    "BLUE": "\033[94m",
    "CYAN": "\033[96m",
    "GREEN": "\033[92m",
    "WARNING": "\033[93m",
    "FAIL": "\033[91m",
    "ENDC": "\033[0m",
    "BOLD": "\033[1m"
}

def log_action(message):
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(f"[{timestamp}] {message}\n")

def print_color(text, color="ENDC"):
    msg = f"{COLORS.get(color, COLORS['ENDC'])}{text}{COLORS['ENDC']}"
    if platform.system() == "Windows":
        try:
            import colorama
            colorama.init()
            print(msg)
        except ImportError:
            print(text)
    else:
        print(msg)

def run_command(command, cwd=None, shell=False, capture_output=False, ignore_error=False):
    """
    Execute a command safely.

    Args:
        command: Command as string (if shell=True) or list (if shell=False, recommended)
        cwd: Working directory
        shell: Whether to use shell (SECURITY: avoid when possible)
        capture_output: Whether to capture stdout/stderr
        ignore_error: Whether to ignore command failures
    """
    try:
        # Convert string commands to list for safety when shell=False
        if not shell and isinstance(command, str):
            command = command.split()

        cmd_display = command if isinstance(command, str) else ' '.join(command)
        if not capture_output:
            print_color(f"➜ Ejecutando: {cmd_display}", "CYAN")
            log_action(f"Ejecutando: {cmd_display} en {cwd or 'root'}")

        result = subprocess.run(
            command,
            cwd=cwd,
            shell=shell,
            check=not ignore_error,
            text=True,
            stdout=subprocess.PIPE if capture_output else None,
            stderr=subprocess.PIPE if capture_output else None
        )
        return result
    except subprocess.CalledProcessError as e:
        if not capture_output and not ignore_error:
            print_color(f"✖ Error al ejecutar: {cmd_display}", "FAIL")
            log_action(f"Error: {str(e)}")
            if e.stderr:
                print(e.stderr)
        return None

def check_prerequisites():
    print_color("\n--- 1. Verificando Prerrequisitos ---", "HEADER")
    all_ok = True
    tools = [
        ("firebase", "Firebase CLI", "npm install -g firebase-tools"),
        ("npm", "Node.js & NPM", "Instalar Node.js"),
        ("git", "Git", "Instalar Git"),
        ("python", "Python", "Instalar Python 3")
    ]
    for cmd, name, fix in tools:
        if shutil.which(cmd):
            print_color(f"✔ {name} detectado.", "GREEN")
        else:
            print_color(f"✖ {name} no encontrado. Solución: {fix}", "FAIL")
            all_ok = False
    if not os.path.exists(os.path.join(PROJECT_ROOT, "firebase.json")):
        print_color("✖ firebase.json no encontrado. Es un archivo crítico.", "FAIL")
        all_ok = False
    if not os.path.exists(os.path.join(BACKEND_DIR, "requirements.txt")):
        print_color(f"⚠ requirements.txt no encontrado en {BACKEND_DIR}", "WARNING")
    return all_ok

def check_git_status(auto=False):
    if not shutil.which("git"):
        return True
    res = run_command(["git", "status", "--porcelain"], capture_output=True, cwd=PROJECT_ROOT)
    if res and res.stdout.strip():
        print_color("\n⚠ ATENCIÓN: Tienes cambios sin guardar (commit) en Git.", "WARNING")
        print(res.stdout)
        print_color("Desplegar código no guardado puede causar inconsistencias.", "WARNING")
        if auto:
            return True
        ans = input("¿Deseas continuar de todos modos? (s/n): ").lower()
        if ans != 's':
            return False
    return True

def select_firebase_environment(preferred=None, auto=False):
    print_color("\n--- Seleccionando Entorno de Firebase ---", "HEADER")
    if preferred:
        print_color(f"✔ Usando entorno: {preferred}", "GREEN")
        return preferred
    firebaserc_path = os.path.join(PROJECT_ROOT, ".firebaserc")
    if not os.path.exists(firebaserc_path):
        print_color("⚠ No se encontró .firebaserc. Se usará el proyecto 'default'.", "WARNING")
        return "default"
    try:
        with open(firebaserc_path, 'r', encoding='utf-8') as f:
            rc_data = json.load(f)
        projects = rc_data.get("projects", {})
        if not projects:
            print_color("⚠ .firebaserc está vacío. Se usará 'default'.", "WARNING")
            return "default"
        aliases = list(projects.keys())
        if len(aliases) == 1 or auto:
            alias = aliases[0]
            pid = projects[alias]
            print_color(f"✔ Usando entorno: {alias} ({pid})", "GREEN")
            return pid
        print("Entornos de Firebase detectados:")
        for i, alias in enumerate(aliases):
            print(f"  {i+1}. {alias} ({projects[alias]})")
        choice_idx = -1
        while choice_idx < 0 or choice_idx >= len(aliases):
            try:
                choice = input(f"¿A qué entorno deseas desplegar? (1-{len(aliases)}): ")
                choice_idx = int(choice) - 1
            except ValueError:
                pass
        selected_project_id = projects[aliases[choice_idx]]
        print_color(f"✔ Desplegando a: {aliases[choice_idx]} ({selected_project_id})", "GREEN")
        return selected_project_id
    except Exception as e:
        print_color(f"✖ Error leyendo .firebaserc: {e}. Se usará 'default'.", "FAIL")
        return "default"

def build_frontend():
    print_color("\n--- Construyendo Frontend ---", "HEADER")
    if not os.path.exists(os.path.join(PROJECT_ROOT, "node_modules")):
        print_color("Instalando dependencias NPM (raíz)...", "BLUE")
        if not run_command(["npm", "install"], cwd=PROJECT_ROOT):
            return False
    out_dir = os.path.join(WEBAPP_DIR, "css")
    os.makedirs(out_dir, exist_ok=True)
    input_css = os.path.join("src", "input.css")
    output_css = os.path.join("webapp", "css", "output.css")
    if os.path.exists(os.path.join(PROJECT_ROOT, input_css)):
        print_color("Compilando Tailwind CSS...", "BLUE")
        cmd = ["npx", "tailwindcss", "-i", input_css, "-o", output_css, "--minify"]
        if run_command(cmd, cwd=PROJECT_ROOT):
            print_color("✔ Frontend compilado y listo.", "GREEN")
            return True
    else:
        print_color("⚠ No se encontró src/input.css. Saltando compilación CSS.", "WARNING")
    return True

def prepare_functions():
    print_color("\n--- Verificando Cloud Functions ---", "HEADER")
    func_node_modules = os.path.join(FUNCTIONS_DIR, "node_modules")
    if not os.path.exists(func_node_modules):
        print_color("⚠ Dependencias de Functions no encontradas.", "WARNING")
        print_color("Instalando dependencias en /functions...", "BLUE")
        if run_command(["npm", "install"], cwd=FUNCTIONS_DIR):
            print_color("✔ Dependencias de Functions instaladas.", "GREEN")
        else:
            print_color("✖ Error instalando dependencias de Functions.", "FAIL")
            return False
    return True

def prepare_backend(auto=False):
    print_color("\n--- Verificando Backend de Python ---", "HEADER")
    venv_path = os.path.join(BACKEND_DIR, "venv")
    req_path = os.path.join(BACKEND_DIR, "requirements.txt")
    if not os.path.exists(req_path):
        print_color("⚠ No se encontró requirements.txt. Saltando preparación de backend.", "WARNING")
        return True
    if not os.path.exists(venv_path):
        print_color("⚠ Entorno virtual (venv) no encontrado.", "WARNING")
        if auto:
            if run_command([sys.executable, "-m", "venv", venv_path], cwd=BACKEND_DIR):
                print_color("✔ Entorno virtual creado.", "GREEN")
            else:
                print_color("✖ Error creando entorno virtual.", "FAIL")
                return False
        else:
            ans = input("¿Crear venv en /backend ahora? (s/n): ").lower()
            if ans == 's':
                if run_command([sys.executable, "-m", "venv", venv_path], cwd=BACKEND_DIR):
                    print_color("✔ Entorno virtual creado.", "GREEN")
                else:
                    print_color("✖ Error creando entorno virtual.", "FAIL")
                    return False
    pip_exe = os.path.join(venv_path, "bin", "pip")
    if platform.system() == "Windows":
        pip_exe = os.path.join(venv_path, "Scripts", "pip.exe")
    print_color("Instalando/actualizando dependencias de Python...", "BLUE")
    if run_command([pip_exe, "install", "-r", req_path], cwd=BACKEND_DIR):
        print_color("✔ Dependencias de Python instaladas.", "GREEN")
    else:
        print_color("✖ Error instalando dependencias de Python.", "FAIL")
        return False
    return True

def deploy_firebase(targets, env_id):
    print_color(f"\n--- Desplegando a Firebase: {targets} (Entorno: {env_id}) ---", "HEADER")
    cmd = ["firebase", "deploy", "--project", env_id, "--only", targets]
    if run_command(cmd, cwd=PROJECT_ROOT):
        print_color("✔ Despliegue de Firebase exitoso.", "GREEN")
        log_action(f"Despliegue exitoso: {targets} a {env_id}")
        return True
    else:
        print_color("✖ El despliegue de Firebase falló.", "FAIL")
        log_action(f"Fallo en despliegue: {targets} a {env_id}")
        return False

def deploy_backend_manager(mode="skip", auto=False):
    print_color("\n--- Gestor de Backend (Python/FastAPI) ---", "HEADER")
    if not prepare_backend(auto=auto):
        print_color("✖ No se pudo preparar el backend. Despliegue cancelado.", "FAIL")
        return
    env_path = os.path.join(BACKEND_DIR, ".env")
    example_path = os.path.join(BACKEND_DIR, ".env.example")
    if not os.path.exists(env_path) and os.path.exists(example_path):
        print_color("\n⚠ Falta configuración de entorno (.env) en el backend.", "WARNING")
        if auto:
            shutil.copy(example_path, env_path)
            print_color("✔ Archivo .env creado a partir del ejemplo.", "GREEN")
        else:
            ans = input("¿Crear .env basado en el ejemplo? (s/n): ").lower()
            if ans == 's':
                shutil.copy(example_path, env_path)
                print_color("✔ Archivo .env creado. RECUERDA EDITARLO CON TUS CLAVES.", "GREEN")
                input("Presiona Enter cuando hayas editado el .env...")
    if mode == "git":
        msg = "Update backend"
        if not auto:
            imsg = input("Mensaje del commit: ")
            if imsg:
                msg = imsg
        run_command(["git", "add", "."], cwd=PROJECT_ROOT)
        run_command(["git", "commit", "-m", msg], cwd=PROJECT_ROOT, ignore_error=True)
        if run_command(["git", "push"], cwd=PROJECT_ROOT):
            print_color("✔ Código subido. El CI/CD se encargará del resto.", "GREEN")
    elif mode == "script":
        script = os.path.join(BACKEND_DIR, "scripts", "deploy-render.sh")
        if os.path.exists(script):
            if platform.system() == "Windows":
                print_color("⚠ No se pueden ejecutar .sh en Windows desde aquí. Usa Git Bash o WSL.", "WARNING")
            else:
                # SECURITY FIX: Use list form to prevent command injection
                run_command(["bash", script], shell=False, cwd=BACKEND_DIR)
        else:
            print_color(f"✖ No se encontró {script}.", "FAIL")

def parse_args():
    p = argparse.ArgumentParser(prog="ship-it", description="Ship-It Deploy Manager v4.0")
    p.add_argument("--env", dest="env", default=None)
    p.add_argument("--auto", dest="auto", action="store_true")
    p.add_argument("--frontend", dest="frontend", action="store_true")
    p.add_argument("--functions", dest="functions", action="store_true")
    p.add_argument("--rules", dest="rules", action="store_true")
    p.add_argument("--full", dest="full", action="store_true")
    p.add_argument("--targets", dest="targets", default=None)
    p.add_argument("--backend", dest="backend", choices=["skip", "git", "script"], default="skip")
    p.add_argument("--reinstall-functions", dest="reinstall_functions", action="store_true")
    p.add_argument("--reinstall-backend", dest="reinstall_backend", action="store_true")
    p.add_argument("--logs", dest="logs", type=int, default=0)
    return p.parse_args()

def non_interactive_flow(args):
    if not check_prerequisites():
        return
    if not check_git_status(auto=args.auto):
        return
    env_id = select_firebase_environment(preferred=args.env, auto=args.auto)
    if args.logs:
        if os.path.exists(LOG_FILE):
            with open(LOG_FILE, 'r', encoding='utf-8') as f:
                lines = f.readlines()[-args.logs:]
                print("".join(lines))
    if args.reinstall_functions:
        shutil.rmtree(os.path.join(FUNCTIONS_DIR, "node_modules"), ignore_errors=True)
    if args.reinstall_backend:
        shutil.rmtree(os.path.join(BACKEND_DIR, "venv"), ignore_errors=True)
    targets = []
    if args.frontend:
        if not build_frontend():
            return
        targets.append("hosting")
    if args.functions:
        if not prepare_functions():
            return
        targets.append("functions")
    if args.rules:
        targets.extend(["firestore:rules", "firestore:indexes", "storage"])
    if args.full:
        if not build_frontend():
            return
        if not prepare_functions():
            return
        deploy_firebase("hosting,functions,firestore,storage", env_id)
        deploy_backend_manager(mode=args.backend, auto=args.auto)
        return
    if args.targets:
        deploy_firebase(args.targets, env_id)
    elif targets:
        uniq = ",".join(sorted(list(set(targets))))
        deploy_firebase(uniq, env_id)
    deploy_backend_manager(mode=args.backend, auto=args.auto)

def interactive_menu(env_id):
    while True:
        print(f"\n{COLORS['BOLD']}Selecciona qué deseas desplegar (Entorno: {env_id}):{COLORS['ENDC']}")
        print("1. Frontend (Hosting + CSS)")
        print("2. Reglas de Seguridad (Firestore, Storage)")
        print("3. Backend Serverless (Cloud Functions)")
        print("4. API Backend (Python/Render)")
        print(f"{COLORS['GREEN']}5. Despliegue Completo (Todo Firebase + API){COLORS['ENDC']}")
        print("6. Utilidades (Ver logs, Reinstalar deps)")
        print(f"7. Cambiar Entorno de Firebase (Actual: {env_id})")
        print("0. Salir")
        print(f"\n{COLORS['CYAN']}Tip: Puedes seleccionar varios separados por coma (ej: 1,3){COLORS['ENDC']}")
        choice_input = input("\nOpción > ").strip()
        if choice_input == '0':
            break
        choices = [c.strip() for c in choice_input.split(',')]
        build_css_done = False
        firebase_targets = []
        for choice in choices:
            if choice == '1':
                if not build_css_done:
                    if not build_frontend():
                        continue
                    build_css_done = True
                firebase_targets.append("hosting")
            elif choice == '2':
                firebase_targets.extend(["firestore:rules", "firestore:indexes", "storage"])
            elif choice == '3':
                if prepare_functions():
                    firebase_targets.append("functions")
            elif choice == '4':
                deploy_backend_manager()
            elif choice == '5':
                if not build_css_done:
                    if not build_frontend():
                        continue
                if prepare_functions():
                    deploy_firebase("hosting,functions,firestore,storage", env_id)
                deploy_backend_manager()
                firebase_targets = []
            elif choice == '6':
                print("\na. Ver últimos logs de despliegue")
                print("b. Forzar reinstalación dependencias (Functions)")
                print("c. Forzar reinstalación dependencias (Backend)")
                sub = input("Sub-opción > ").lower()
                if sub == 'a':
                    if os.path.exists(LOG_FILE):
                        print("\n--- Últimas 15 líneas del log ---")
                        with open(LOG_FILE, 'r', encoding='utf-8') as f:
                            print(''.join(f.readlines()[-15:]))
                    else:
                        print("No hay logs aún.")
                elif sub == 'b':
                    shutil.rmtree(os.path.join(FUNCTIONS_DIR, "node_modules"), ignore_errors=True)
                    prepare_functions()
                elif sub == 'c':
                    shutil.rmtree(os.path.join(BACKEND_DIR, "venv"), ignore_errors=True)
                    prepare_backend()
            elif choice == '7':
                env_id = select_firebase_environment()
        if firebase_targets:
            deploy_firebase(",".join(list(set(firebase_targets))), env_id)
    print("¡Hasta luego!")

def main():
    print_color("\n========================================", "BLUE")
    print_color("   SHIP-IT DEPLOY MANAGER v4.0 (ES)     ", "BOLD")
    print_color("========================================", "BLUE")
    args = parse_args()
    if args.env or args.auto or args.frontend or args.functions or args.rules or args.full or args.targets or args.backend != "skip" or args.reinstall_functions or args.reinstall_backend or args.logs:
        non_interactive_flow(args)
        return
    if not check_prerequisites():
        input("Error en prerrequisitos. Presiona Enter para salir...")
        sys.exit(1)
    if not check_git_status():
        print("Operación cancelada por el usuario.")
        sys.exit(0)
    firebase_env_id = select_firebase_environment()
    interactive_menu(firebase_env_id)

if __name__ == "__main__":
    main()