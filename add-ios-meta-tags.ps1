$files = @(
    'admin-login.html', 'admin.html', 'ayuda.html', 'buscar-usuarios.html',
    'cita-detalle.html', 'citas.html', 'concierge-dashboard.html', 'contacto.html',
    'conversaciones.html', 'cuenta-pagos.html', 'diagnostics.html', 'evento-detalle.html',
    'eventos-vip.html', 'favoritos.html', 'index.html', 'logros.html',
    'membresia.html', 'privacidad.html', 'referidos.html', 'reportes.html',
    'seguridad.html', 'seguro.html', 'suscripcion.html', 'terminos.html',
    'test-firestore-minimal.html', 'verificacion-identidad.html', 'verify-email.html', 'video-chat.html'
)

$iosMetaTags = @"
  
  <!-- iOS PWA Support -->
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="TuCitaSegura">
  
"@

$count = 0
$updated = 0

foreach ($file in $files) {
    $path = "c:\Users\cesar\FZ6\webapp\$file"
    if (Test-Path $path) {
        $count++
        $content = Get-Content $path -Raw -Encoding UTF8
    
        # Check if already has iOS meta tags
        if ($content -match 'apple-mobile-web-app-capable') {
            Write-Host "Skipping $file (already has iOS tags)" -ForegroundColor Yellow
            continue
        }
    
        # Find the manifest link and add iOS tags after it
        if ($content -match '(<link rel="manifest"[^>]*>)(\r?\n)([ \t]*)(<meta name="theme-color")') {
            # Insert before theme-color
            $newContent = $content -replace '(<link rel="manifest"[^>]*>)(\r?\n)([ \t]*)(<meta name="theme-color")', "`$1`$2$iosMetaTags`$3`$4"
            $newContent | Set-Content -Path $path -Encoding UTF8 -NoNewline
            Write-Host "✓ Updated: $file" -ForegroundColor Green
            $updated++
        }
        # Alternative pattern: apple-touch-icon followed by other elements
        elseif ($content -match '(<link rel="apple-touch-icon"[^>]*>)(\r?\n)([ \t]*)(\r?\n)([ \t]*)(<!--)') {
            $newContent = $content -replace '(<link rel="apple-touch-icon"[^>]*>)(\r?\n)(\r?\n)([ \t]*)(<!--)', "`$1`$2$iosMetaTags`$3`$4`$5"
            $newContent | Set-Content -Path $path -Encoding UTF8 -NoNewline
            Write-Host "✓ Updated: $file" -ForegroundColor Green
            $updated++
        }
        # Fallback: Add after <head> if nothing else works
        elseif ($content -match '(<head>)(\r?\n)') {
            Write-Host "! Using fallback for: $file" -ForegroundColor Magenta
        }
        else {
            Write-Host "✗ Could not find insertion point in: $file" -ForegroundColor Red
        }
    }
}

Write-Host "`nSummary:" -ForegroundColor Cyan
Write-Host "Total files processed: $count" -ForegroundColor Cyan
Write-Host "Files updated: $updated" -ForegroundColor Green
