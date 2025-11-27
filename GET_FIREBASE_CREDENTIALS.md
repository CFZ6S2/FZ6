# 🔑 Obtener Credenciales de Firebase

**Necesitas este archivo para testear Firebase Auth**

---

## 📥 Pasos para Descargar

### 1. Ir a Firebase Console

Abre este link en tu navegador:

**https://console.firebase.google.com/project/tuscitasseguras-2d1a6/settings/serviceaccounts/adminsdk**

### 2. Generar Clave Privada

1. Busca la sección **"Firebase Admin SDK"**
2. Click en botón **"Generate new private key"** (Generar nueva clave privada)
3. Confirma en el popup
4. Se descargará un archivo JSON: `tuscitasseguras-2d1a6-xxxxx.json`

### 3. Guardar en el Proyecto

**Opción A: Copiar manualmente**
```bash
# Desde la carpeta de descargas
cp ~/Downloads/tuscitasseguras-*.json /home/user/FZ6/backend/firebase-credentials.json
```

**Opción B: Mover el archivo**
```bash
# Buscar el archivo descargado
ls -lt ~/Downloads/tuscitasseguras-*.json | head -1

# Moverlo al proyecto
mv ~/Downloads/tuscitasseguras-*.json /home/user/FZ6/backend/firebase-credentials.json
```

### 4. Verificar

```bash
# Verificar que existe
ls -la /home/user/FZ6/backend/firebase-credentials.json

# Verificar que tiene contenido válido
cat /home/user/FZ6/backend/firebase-credentials.json | jq . | head -20
```

---

## ⚠️ Importante

- **NO** subir este archivo a Git (ya está en .gitignore)
- **NO** compartir este archivo (contiene credenciales privadas)
- Guárdalo en un lugar seguro como backup

---

## ✅ Una vez descargado

Vuelve y continúa con el testing:

```bash
# Verificar que está listo
python3 scripts/firebase-token-builder.py list-users
```

Si funciona, ¡estás listo para continuar! 🎉
