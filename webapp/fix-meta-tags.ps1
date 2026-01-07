# Script para arreglar el warning del meta tag deprecado
# Ejecutar desde: C:\Users\cesar\FZ6\webapp

# Reemplazar apple-mobile-web-app-capable por mobile-web-app-capable en todos los HTML
Get-ChildItem -Path . -Filter "*.html" | Where-Object { $_.DirectoryName -notlike "*\dist*" } | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $newContent = $content -replace 'apple-mobile-web-app-capable', 'mobile-web-app-capable'
    if ($content -ne $newContent) {
        Set-Content -Path $_.FullName -Value $newContent -NoNewline
        Write-Host "✅ Updated: $($_.Name)"
    }
}

Write-Host "`n🎉 Completed! All HTML files updated."
