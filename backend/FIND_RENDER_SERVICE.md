# GUIA RAPIDA PARA ENCONTRAR/CREAR EL SERVICIO EN RENDER

## 🔍 OPCION 1: Buscar servicio existente
1. Ve a: https://dashboard.render.com
2. En el dashboard principal, busca en la lista de servicios
3. Busca: "tucitasegura-api" o "t2c06" o similar

## 🔧 OPCION 2: Si no existe, crearlo desde cero

### Paso 1: Conectar con GitHub
1. Ve a: https://dashboard.render.com
2. Click en: "New +" (arriba a la derecha)
3. Selecciona: "Web Service"
4. Conecta con tu GitHub (si no está conectado)
5. Busca el repositorio: "t2c06"
6. Selecciona la rama: "main"

### Paso 2: Configurar el servicio
Name: tucitasegura-api
Environment: Python
Region: Frankfurt (eu-central)
Build Command: pip install -r backend/requirements.txt
Start Command: cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT

### Paso 3: Configurar avanzado
Instance Type: Starter (gratis)
Auto Deploy: Yes
Health Check Path: /health

## 📋 ALTERNATIVA: Usar Blueprint
Si tienes el archivo `render.yaml` en la raíz (que ya lo creamos), Render debería detectarlo automáticamente cuando conectes el repo.

## 🎯 ¿Qué verás?
- Si todo está bien: El servicio aparecerá en verde
- Si hay error: Estará en rojo con logs
- Durante deployment: Amarillo