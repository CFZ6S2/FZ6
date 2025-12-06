#!/usr/bin/env bash
set -euo pipefail

# Configuración por defecto (proyecto que nos diste)
PROJECT_ID="tucitasegura-129cc"
PROJECT_NUMBER="180656060538"

# Comprueba dependencias
for cmd in gcloud firebase jq; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Error: la herramienta '$cmd' no está instalada o no está en PATH."
    exit 1
  fi
done

usage() {
  cat <<EOF
Uso:
  ./manage_secrets_appcheck.sh [opciones]

Opciones:
  --secret-name NAME            Nombre del secreto (ej: stripe-secret)   [REQUIRED]
  --secret-value-file FILE      Archivo con el valor del secreto         [mutuamente excluyente con --secret-value]
  --secret-value STRING         Proveer valor del secreto en la llamada  [mutuamente excluyente con --secret-value-file]
  --function-name NAME          Nombre de la Cloud Function para obtener su service account (opcional)
  --region REGION               Región de la función (ej: us-central1). Default: us-central1
  --create-debug-token          Si se añade, creará un App Check debug token vía REST; requiere --app-id y --debug-token
  --app-id APP_ID               App ID web (ej: 1:1234567890:web:abcdef) - requerido para debug token
  --debug-token TOKEN           Token de depuración que quieres crear (si --create-debug-token)
  --display-name NAME           Display name para el debug token (opcional)
  -h, --help                    Muestra esta ayuda
EOF
}

# Valores por defecto
REGION="us-central1"
FUNCTION_NAME=""
CREATE_DEBUG_TOKEN="no"
APP_ID=""
DEBUG_TOKEN=""
DISPLAY_NAME=""

# Parseo de argumentos (simple)
while [[ $# -gt 0 ]]; do
  case "$1" in
    --secret-name) SECRET_NAME="$2"; shift 2 ;;
    --secret-value-file) SECRET_VALUE_FILE="$2"; shift 2 ;;
    --secret-value) SECRET_VALUE="$2"; shift 2 ;;
    --function-name) FUNCTION_NAME="$2"; shift 2 ;;
    --region) REGION="$2"; shift 2 ;;
    --create-debug-token) CREATE_DEBUG_TOKEN="yes"; shift 1 ;;
    --app-id) APP_ID="$2"; shift 2 ;;
    --debug-token) DEBUG_TOKEN="$2"; shift 2 ;;
    --display-name) DISPLAY_NAME="$2"; shift 2 ;;
    -h, --help) usage; exit 0 ;;
    *) echo "Parámetro desconocido: $1"; usage; exit 1 ;;
  esac
done

if [[ -z "${SECRET_NAME:-}" ]]; then
  echo "ERROR: --secret-name es requerido."
  usage
  exit 1
fi

# Obtener el valor del secreto (preferir archivo)
if [[ -n "${SECRET_VALUE_FILE:-}" && -n "${SECRET_VALUE:-}" ]]; then
  echo "ERROR: Use sólo --secret-value-file o --secret-value, no ambos."
  exit 1
fi

if [[ -n "${SECRET_VALUE_FILE:-}" ]]; then
  if [[ ! -f "$SECRET_VALUE_FILE" ]]; then
    echo "ERROR: archivo $SECRET_VALUE_FILE no encontrado."
    exit 1
  fi
  SECRET_VALUE=$(cat "$SECRET_VALUE_FILE")
elif [[ -n "${SECRET_VALUE:-}" ]]; then
  # Si se pasa inline, lo usamos (advertencia al usuario)
  SECRET_VALUE="$SECRET_VALUE"
else
  # Pedirlo por stdin, sin mostrar (opción segura)
  read -rsp "Introduce el valor del secreto para '$SECRET_NAME' (input oculto): " SECRET_VALUE
  echo
fi

echo "Proyecto configurado: $PROJECT_ID ($PROJECT_NUMBER)"
echo "Preparando Secret Manager..."

# Habilitar servicio Secret Manager si no está habilitado
echo "Habilitando secretmanager API (si es necesario)..."
gcloud services enable secretmanager.googleapis.com --project="$PROJECT_ID" >/dev/null

# Crear secreto si no existe
if gcloud secrets describe "$SECRET_NAME" --project="$PROJECT_ID" >/dev/null 2>&1; then
  echo "Secreto '$SECRET_NAME' ya existe. Añadiendo nueva versión..."
  echo -n "$SECRET_VALUE" | gcloud secrets versions add "$SECRET_NAME" --data-file=- --project="$PROJECT_ID" >/dev/null
  echo "Versión añadida al secreto '$SECRET_NAME'."
else
  echo "Creando secreto '$SECRET_NAME'..."
  gcloud secrets create "$SECRET_NAME" --replication-policy="automatic" --project="$PROJECT_ID" >/dev/null
  echo -n "$SECRET_VALUE" | gcloud secrets versions add "$SECRET_NAME" --data-file=- --project="$PROJECT_ID" >/dev/null
  echo "Secreto '$SECRET_NAME' creado y versión añadida."
fi

# Obtener service account de la función (si se indicó)
SA_EMAIL=""
if [[ -n "${FUNCTION_NAME}" ]]; then
  echo "Intentando obtener la cuenta de servicio de la función '$FUNCTION_NAME' en región '$REGION'..."
  if SA_EMAIL=$(gcloud functions describe "$FUNCTION_NAME" --region="$REGION" --format='value(serviceAccountEmail)' --project="$PROJECT_ID" 2>/dev/null); then
    echo "Service account de la función: $SA_EMAIL"
  else
    echo "No se pudo obtener la función '$FUNCTION_NAME'. Usaré la cuenta por defecto: ${PROJECT_ID}@appspot.gserviceaccount.com"
    SA_EMAIL="${PROJECT_ID}@appspot.gserviceaccount.com"
  fi
else
  echo "No se indicó --function-name. Usaré la cuenta por defecto: ${PROJECT_ID}@appspot.gserviceaccount.com"
  SA_EMAIL="${PROJECT_ID}@appspot.gserviceaccount.com"
fi

# Añadir binding IAM para que la SA lea el secreto
echo "Dando permiso roles/secretmanager.secretAccessor a '$SA_EMAIL' sobre '$SECRET_NAME'..."
gcloud secrets add-iam-policy-binding "$SECRET_NAME" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/secretmanager.secretAccessor" \
  --project="$PROJECT_ID" >/dev/null

echo "Permiso concedido."

# Mostrar cómo leer el secreto
echo
echo "Para leer el secreto (modo debug), ejecuta:"
echo "  gcloud secrets versions access latest --secret=\"$SECRET_NAME\" --project=\"$PROJECT_ID\""
echo

# Opcional: crear debug token via REST API
if [[ "$CREATE_DEBUG_TOKEN" == "yes" ]]; then
  if [[ -z "$APP_ID" || -z "$DEBUG_TOKEN" ]]; then
    echo "ERROR: para --create-debug-token necesitas pasar --app-id y --debug-token"
    exit 1
  fi

  echo "Creando App Check debug token vía REST..."
  ACCESS_TOKEN=$(gcloud auth print-access-token)
  # Construimos payload
  PAYLOAD=$(jq -n --arg token "$DEBUG_TOKEN" --arg dname "${DISPLAY_NAME:-cli-debug-token}" \
    '{token: $token, displayName: $dname}')

  # Llamada REST
  RESP=$(curl -s -X POST \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    "https://firebaseappcheck.googleapis.com/v1/projects/${PROJECT_NUMBER}/apps/${APP_ID}/debugTokens" \
    -d "$PAYLOAD")

  echo "Respuesta de la API:"
  echo "$RESP" | jq .

  echo "Si quieres listar los debug tokens:"
  echo "  curl -H \"Authorization: Bearer \$(gcloud auth print-access-token)\" \"https://firebaseappcheck.googleapis.com/v1/projects/${PROJECT_NUMBER}/apps/${APP_ID}/debugTokens\" | jq ."
  echo
  echo "Para eliminar un debug token (ejemplo):"
  echo "  curl -X DELETE -H \"Authorization: Bearer \$(gcloud auth print-access-token)\" \"https://firebaseappcheck.googleapis.com/v1/projects/${PROJECT_NUMBER}/apps/${APP_ID}/debugTokens/DEBUG_TOKEN_NAME\""
fi

echo "Operación completada."

# Fin del script
