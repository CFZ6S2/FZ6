# 🚀 GUÍA RÁPIDA: Subir TuCitaSegura a GitHub

## 📋 PASO 1: Crear Token de GitHub

1. Ve a GitHub.com → Settings (click en tu foto de perfil arriba a la derecha)
2. Ve a: **Developer settings** → **Personal access tokens** → **Tokens (classic)**
3. Click en **Generate new token**
4. **Note**: Ponle un nombre como "TuCitaSegura Token"
5. **Expiration**: Selecciona "No expiration" o "90 days"
6. **Select scopes**: Marca solo estas opciones:
   - ✅ `repo` (acceso completo a repositorios privados)
   - ✅ `workflow` (actualizar archivos GitHub Actions)
7. Click en **Generate token**
8. **¡IMPORTANTE!** Copia el token que aparece (empieza con `ghp_`)

## 📋 PASO 2: Ejecutar el Script

Abre PowerShell o Command Prompt en la carpeta del proyecto y ejecuta:

```bash
push-to-github.bat
```

**Cuando te pida el token, pega el que copiaste del paso 1**

## 📋 PASO 3: Verificar

Si todo sale bien, verás un mensaje como este:
```
✅ ¡Éxito! Tu código ha sido subido a GitHub.
📍 URL del repositorio: https://github.com/cesarherrerarojo-ship-it/TuCitaSegura
```

## 🎯 ¿Qué se va a subir?

✅ **Backend FastAPI** con autenticación Firebase
✅ **Frontend** con integración backend
✅ **Tests de integración** funcionando
✅ **Documentación completa** del proyecto
✅ **Servicios ML/AI** configurados

## 🚀 Alternativa Manual (Si el script falla)

Si prefieres hacerlo manualmente, ejecuta estos comandos:

```bash
# 1. Eliminar remote actual (si existe)
git remote remove origin

# 2. Agregar nuevo remote con tu token
# Reemplaza TU_TOKEN con el token que copiaste
git remote add origin https://TU_TOKEN@github.com/cesarherrerarojo-ship-it/TuCitaSegura.git

# 3. Empujar el código
git push -u origin claude/paypal-insurance-retention-01KCDWh2xVbLZSmqH8kX3uhW
```

## 📞 Si tienes problemas:

1. **¿No puedes crear el token?** - Asegúrate de estar logueado en GitHub
2. **¿El push falla?** - Verifica que el token tenga los permisos correctos
3. **¿Error de autenticación?** - El token debe estar activo y tener permisos `repo`

## 🎉 ¡Listo!

Una vez que completes estos pasos, tu proyecto TuCitaSegura estará en GitHub con:
- ✅ Integración frontend-backend completa
- ✅ Backend respondiendo correctamente
- ✅ Documentación técnica actualizada
- ✅ Tests pasando

**¡Tu código está listo para ser compartido con el mundo!** 🚀