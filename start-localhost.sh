#!/bin/bash
# Script para iniciar TuCitaSegura en localhost

echo "🚀 Iniciando TuCitaSegura en localhost..."
echo ""
echo "📁 Directorio del proyecto: $(pwd)"
echo ""

# Verificar si el puerto 8000 está en uso
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "⚠️  El puerto 8000 ya está en uso"
    echo "❓ ¿Quieres matar el proceso? (s/n)"
    read -r respuesta
    if [ "$respuesta" = "s" ] || [ "$respuesta" = "S" ]; then
        echo "🔫 Matando proceso en puerto 8000..."
        kill -9 $(lsof -t -i:8000) 2>/dev/null
        sleep 1
    else
        echo "💡 Usa otro puerto: python3 -m http.server 5000"
        exit 1
    fi
fi

echo "🌐 Iniciando servidor HTTP en puerto 8000..."
echo ""
python3 -m http.server 8000 &
SERVER_PID=$!

# Esperar un momento para que el servidor arranque
sleep 2

echo ""
echo "✅ Servidor iniciado correctamente!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 ABRE ESTAS URLs EN TU NAVEGADOR:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🏠 Página Principal:"
echo "   http://localhost:8000/index.html"
echo ""
echo "📝 Registro:"
echo "   http://localhost:8000/webapp/register.html"
echo ""
echo "🔐 Login:"
echo "   http://localhost:8000/webapp/login.html"
echo ""
echo "🎮 Demo Sanitizer XSS (NUEVO):"
echo "   http://localhost:8000/webapp/sanitizer-demo.html"
echo ""
echo "💬 Chat (requiere login):"
echo "   http://localhost:8000/webapp/chat.html"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💡 Para detener el servidor presiona: Ctrl + C"
echo "🔍 PID del servidor: $SERVER_PID"
echo ""
echo "⏳ Servidor corriendo... (presiona Ctrl+C para detener)"
echo ""

# Esperar a que el usuario detenga el servidor
wait $SERVER_PID
