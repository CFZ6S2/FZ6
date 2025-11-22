# 🔧 Frontend Workflow Fix

**Problema identificado**: El workflow `deploy-frontend.yml` estaba configurado para un proyecto con npm/Vite, pero el frontend es HTML estático.

---

## ❌ El Problema

El workflow intentaba:
1. ✗ Instalar dependencias npm (`npm ci`) - **No existe package.json en webapp/**
2. ✗ Ejecutar build (`npm run build`) - **No existe script de build**
3. ✗ Usar variables de entorno Vite - **No se usa Vite**

Esto causaba que el workflow fallara inmediatamente.

---

## ✅ La Solución

### Cambios realizados:

1. **Eliminado**: Steps de npm build
   - Removed: Set up Node.js
   - Removed: Install dependencies
   - Removed: Build for production

2. **Simplificado**: Deploy directo
   - Solo checkout del código
   - Deploy directo a Firebase Hosting
   - Sin pasos de build innecesarios

3. **Ampliado**: Path triggers
   - `webapp/**` (archivos del webapp)
   - `*.html` (index.html en root)
   - `css/**`, `js/**`, `images/**` (assets)
   - `firebase.json` (configuración)

---

## 📋 Workflow Corregido

```yaml
jobs:
  deploy:
    name: Deploy Static Site to Firebase
    runs-on: ubuntu-latest
    environment: production

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Deploy to Firebase Hosting
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          channelId: live
          projectId: ${{ secrets.VITE_FIREBASE_PROJECT_ID }}

      - name: Verify deployment
        # ... health checks ...
```

---

## 🎯 Configuración Firebase

El proyecto usa la configuración estándar de Firebase Hosting:

```json
{
  "hosting": {
    "site": "tuscitasseguras-2d1a6",
    "public": ".",  // Deploy desde raíz
    "ignore": [
      "firebase.json",
      "functions/**",
      "backend/**",
      // ...
    ]
  }
}
```

---

## ✅ Secretos Necesarios (Reducidos)

Para frontend solo necesitas **2 secrets**:
1. `FIREBASE_SERVICE_ACCOUNT` - JSON del service account
2. `VITE_FIREBASE_PROJECT_ID` - ID del proyecto (`tuscitasseguras-2d1a6`)

**Nota**: Los otros secrets de Firebase (API_KEY, etc.) NO son necesarios para el deploy del frontend estático, solo para la configuración en runtime de la app.

---

## 🚀 Testing

Para probar el fix:

```bash
# Trigger manual del workflow
# GitHub → Actions → Deploy Frontend → Run workflow

# O hacer un cambio en frontend
echo "<!-- test -->" >> index.html
git add index.html
git commit -m "test: trigger frontend deploy"
git push origin main
```

---

## 📊 Antes vs Después

| Aspecto | Antes | Después |
|---------|-------|---------|
| **Steps** | 8 steps | 4 steps |
| **Tiempo** | ~4 min (fallaba) | ~2 min |
| **Dependencias** | npm, Node.js | Solo Firebase CLI |
| **Complejidad** | Alta | Baja |
| **Secrets requeridos** | 11 | 2 |

---

## 🔍 Archivos Modificados

- `.github/workflows/deploy-frontend.yml` - Workflow simplificado

---

## 💡 Notas

- El frontend es **HTML estático** (no React/Vue/Vite)
- Los archivos están en `webapp/` y raíz (`index.html`)
- Firebase Hosting sirve directamente los archivos
- No hay proceso de build necesario
- Las configuraciones de Firebase (API keys) se cargan en runtime desde los archivos JS

---

**Resultado**: El workflow ahora deployará correctamente el sitio estático a Firebase Hosting sin intentar hacer build.
