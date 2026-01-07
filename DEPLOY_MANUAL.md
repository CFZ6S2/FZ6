# Instrucciones de Despliegue Manual

Como estás teniendo problemas con los comandos automáticos, sigue estos pasos exactos en tu terminal:

## 1. Desplegar Cloud Functions (Backend)
Debes ejecutar esto desde la raíz del proyecto (`C:\Users\cesar\FZ6`), NO desde `webapp`.

```powershell
cd C:\Users\cesar\FZ6
firebase deploy --only functions:cleanupZombieUsers,functions:listZombieUsers
```

> **Nota:** Si te pide actualizar `firebase-functions`, puedes ignorarlo por ahora o ejecutar `npm install --save firebase-functions@latest` dentro de la carpeta `functions`.

## 2. Compilar Frontend (Webapp)
Ahora necesitamos compilar la aplicación web con los nuevos cambios (botón rojo de limpieza).

```powershell
cd C:\Users\cesar\FZ6\webapp
npm run build
```

## 3. Desplegar Hosting (Frontend)
Una vez terminado el build, vuelve a la raíz y despliega el hosting.

```powershell
cd C:\Users\cesar\FZ6
firebase deploy --only hosting
```

---

## 4. Verificar
1. Ve al Admin Panel: [admin.html](https://tucitasegura-129cc.web.app/admin.html)
2. Busca el botón rojo **"🗑️ Limpiar"**.
3. Haz clic, acepta la confirmación y escribe "ELIMINAR" para borrar los usuarios zombies.
