# Script PowerShell para actualizar dashboard.html
$dashboardPath = "C:\Users\cesar\FZ6\webapp\dashboard.html"
$content = Get-Content $dashboardPath -Raw

# Reemplazar la línea de import para incluir dashboard-loader
$content = $content -replace "import { doc, getDoc, collection, query, where, getDocs } from `"firebase/firestore`";", "import { loadDashboardData } from './js/dashboard-loader.js';"

# Eliminar la función loadDashboardData completa (se usa la del módulo ahora)
$content = $content -replace "(?s)async function loadDashboardData\(user\) \{.*?\n        \}", ""

# Guardar
Set-Content $dashboardPath $content -NoNewline

Write-Host "✅ Dashboard.html actualizado"
