# 🔐 Obtener Firebase ID Token - Consola del Navegador

## 📋 Instrucciones Paso a Paso

### PASO 1: Abre la Consola del Navegador

1. Abre **cualquier página web** (ej: https://google.com)
2. Presiona **F12** (o Ctrl+Shift+J en Chrome/Edge)
3. Ve a la pestaña **"Console"** / "Consola"

---

### PASO 2: Copia y Pega Este Código

**Copia TODO este código** y pégalo en la consola:

```javascript
// Firebase ID Token Getter - TuCitaSegura
// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAgFcoHwoBpo80rlEHL2hHVZ2DqtjWXh2s",
    authDomain: "tuscitasseguras-2d1a6.firebaseapp.com",
    projectId: "tuscitasseguras-2d1a6"
};

// Credenciales
const email = "lascasitadebarajas@gmail.com";
const password = "cesar123456";

// Función para obtener token
async function getFirebaseToken() {
    try {
        console.log("🔄 Autenticando...");

        // Sign in con REST API
        const response = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseConfig.apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email,
                    password: password,
                    returnSecureToken: true
                })
            }
        );

        if (!response.ok) {
            const error = await response.json();
            console.error("❌ Error:", error.error?.message || "Authentication failed");
            return;
        }

        const data = await response.json();

        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("✅ AUTENTICACIÓN EXITOSA");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("");
        console.log("📋 Información del Usuario:");
        console.log(`   Email: ${data.email}`);
        console.log(`   UID: ${data.localId}`);
        console.log(`   Verificado: ${data.registered ? '✅' : '❌'}`);
        console.log("");
        console.log("🎫 ID TOKEN (copia esto):");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log(data.idToken);
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("");
        console.log("📝 Cómo usar:");
        console.log("   1. Copia el token de arriba");
        console.log("   2. Pégaselo a Claude");
        console.log("   3. Él testeará el backend con tu token");
        console.log("");

        // Copiar al portapapeles si es posible
        try {
            await navigator.clipboard.writeText(data.idToken);
            console.log("✅ Token copiado al portapapeles!");
        } catch (e) {
            console.log("⚠️  Copia manualmente el token de arriba");
        }

        return data.idToken;

    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

// Ejecutar
getFirebaseToken();
```

---

### PASO 3: Presiona Enter

El código se ejecutará automáticamente y mostrará:
- ✅ Confirmación de autenticación
- 📋 Información de tu usuario
- 🎫 **El ID TOKEN** (en una caja)

---

### PASO 4: Copia el Token

El token se verá algo así:
```
eyJhbGciOiJSUzI1NiIsImtpZCI6IjExNjUzYTI3...
```

**Cópialo completamente** y pégalo aquí en el chat.

---

## 🆘 Si Hay Error

### Error: "Requests from referer are blocked"

Esto es normal. Prueba estos métodos alternativos:

**Método A: Usa una página de Firebase**
1. Ve a: https://tuscitasseguras-2d1a6.web.app
2. Abre la consola (F12)
3. Pega el código de arriba

**Método B: Usa Firebase Console**
1. Ve a: https://console.firebase.google.com/project/tuscitasseguras-2d1a6
2. Abre la consola (F12)
3. Pega el código de arriba

**Método C: Código simplificado (sin validación de referrer)**

```javascript
// Este método usa fetch sin headers restrictivos
fetch('https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyPassword?key=AIzaSyAgFcoHwoBpo80rlEHL2hHVZ2DqtjWXh2s', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
        email: 'lascasitadebarajas@gmail.com',
        password: 'cesar123456',
        returnSecureToken: true
    })
})
.then(r => r.json())
.then(d => {
    if (d.idToken) {
        console.log("✅ TOKEN:");
        console.log(d.idToken);
        navigator.clipboard.writeText(d.idToken);
    } else {
        console.error("Error:", d.error);
    }
});
```

---

## ✅ Una vez que tengas el token

**Simplemente pégalo aquí en el chat** y yo:
- ✅ Testearé tu autenticación
- ✅ Verificaré tu usuario
- ✅ Probaré diferentes endpoints del backend
- ✅ Te mostraré todos los resultados

---

**¡Listo!** Cuando tengas el token, pégalo aquí. 🚀
