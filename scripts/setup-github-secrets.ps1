param(
  [string]$FirebaseProjectId = "tucitasegura-129cc",
  [string]$FirebaseToken,
  [string]$RecaptchaSiteKey = "6LdSBCksAAAAAB5qyYtNf1ZOSt7nH4EvtaGTNT2t",
  [string]$RecaptchaProjectId = "tucitasegura-129cc",
  [string]$StripeSecretKey
)

if (-not $FirebaseToken -or $FirebaseToken.Trim() -eq "") { Write-Error "FIREBASE_TOKEN requerido"; exit 1 }

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) { Write-Error "GitHub CLI no encontrado"; exit 1 }

Set-Location (Split-Path $PSScriptRoot -Parent)

gh repo view > $null
if ($LASTEXITCODE -ne 0) { Write-Error "Autenticación de GitHub CLI requerida"; exit 1 }

gh secret set FIREBASE_PROJECT_ID -b $FirebaseProjectId
if ($LASTEXITCODE -ne 0) { Write-Error "Error al crear FIREBASE_PROJECT_ID"; exit 1 }

gh secret set FIREBASE_TOKEN -b $FirebaseToken
if ($LASTEXITCODE -ne 0) { Write-Error "Error al crear FIREBASE_TOKEN"; exit 1 }

gh secret set RECAPTCHA_SITE_KEY -b $RecaptchaSiteKey
if ($LASTEXITCODE -ne 0) { Write-Error "Error al crear RECAPTCHA_SITE_KEY"; exit 1 }

gh secret set RECAPTCHA_PROJECT_ID -b $RecaptchaProjectId
if ($LASTEXITCODE -ne 0) { Write-Error "Error al crear RECAPTCHA_PROJECT_ID"; exit 1 }

if ($StripeSecretKey) {
  gh secret set STRIPE_SECRET_KEY -b $StripeSecretKey
  if ($LASTEXITCODE -ne 0) { Write-Error "Error al crear STRIPE_SECRET_KEY"; exit 1 }
}

gh workflow run deploy-functions.yml
if ($LASTEXITCODE -ne 0) { Write-Error "Error al lanzar workflow"; exit 1 }

Write-Host "Secrets configurados y workflow lanzado."
