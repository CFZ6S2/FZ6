# INSTRUCCIONES FINALES PARA CONFIGURAR RENDER

## ✅ PASO 1: Variables de Entorno
Copia estas 11 variables UNA POR UNA en Render:

SECRET_KEY=g79Aa-XCHKU5zr7Du2t8ZGm9TFKuUwAHjzJeUMRQxp4

STRIPE_PUBLIC_KEY=pk_test_51R31JLHdpQPdr46sBrwaHhZctgmhyHsVKwVIM8lnf2bwrHzjGnUwlCIuI9YzgdRZoKTWQ7WYWNmU3WD5DqAbN42p0001gnrQMH
STRIPE_SECRET_KEY=sk_test_51R31JLHdpQPdr46s2BWNG2zQMhhuSzmVprC24atBQ6eZPDTPHIcJawwy0aJTsEOVzpSD7BffNOG9Kpcu3jAcRV7G008Qxd6nU4
STRIPE_WEBHOOK_SECRET=rk_test_51R31JLHdpQPdr46sBSNnbQcm8IGMiaGwkPS5PsWDdHscsF2B2xVFMPpMIzr3i5ABzlnWNOwDmZbqrKDH92PzIjb700BgiGxDz0

GOOGLE_MAPS_API_KEY=AIzaSyAb8RN6I6FQgaC1SltCBdMTyt6mM49BUATqwB32I7g5crKb91Vg

OPENAI_API_KEY=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

FIREBASE_PROJECT_ID=tuscitasseguras-2d1a6
FIREBASE_DATABASE_URL=https://tuscitasseguras-2d1a6-default-rtdb.europe-west1.firebasedatabase.app

ENVIRONMENT=production
DEBUG=false
API_WORKERS=4
DATABASE_POOL_SIZE=20
CORS_ORIGINS=https://tucitasegura.com,https://www.tucitasegura.com

## ✅ PASO 2: Archivo de Credenciales Firebase
1. Abre tu archivo: C:\Users\cesar\Downloads\tuscitasseguras-2d1a6-firebase-adminsdk-fbsvc-fb73f633c9.json
2. Selecciona TODO el contenido (Ctrl+A) y copialo (Ctrl+C)
3. En Render, ve a la sección "Files"
4. Click "Add File"
5. Configura:
   - Filename: firebase-credentials.json
   - Mount Path: /app/firebase-credentials.json
   - Content: Pega todo el JSON (Ctrl+V)
6. Click "Save"

## ✅ PASO 3: Verificar Deployment
Una vez que añadas todo, el deployment empezará automáticamente.

Para verificar que funciona:
1. Espera 2-3 minutos
2. Ve a la URL que te dé Render
3. Añade /health al final (ej: https://tu-app.onrender.com/health)
4. Deberías ver: {"status":"healthy"}

## 🎯 RESUMEN
- Variables: 12 (ya las tienes arriba)
- Archivo Firebase: firebase-credentials.json
- Auto-deploy: Activado
- Health check: /health
- Puerto: 8000

¡Listo! Tu backend estará funcionando en minutos.