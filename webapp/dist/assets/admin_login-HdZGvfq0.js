import{a as o}from"./firebase-config-env-BtJ4KElt.js";import"./sanitizer-CcqdHDpm.js";import{sendPasswordResetEmail as m,setPersistence as u,browserSessionPersistence as f,signInWithEmailAndPassword as g}from"https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";import"https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";import"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";import"https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js";import"https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";import"./logger-CnI7WBtq.js";console.log("✅ Firebase Auth initialized (App Check disabled for admin)");console.warn("⚠️  IMPORTANT: Make sure App Check enforcement is disabled in Firebase Console");console.warn("⚠️  URL: https://console.firebase.google.com/project/tuscitasseguras-2d1a6/appcheck");const v=document.getElementById("togglePassword"),c=document.getElementById("password");v.addEventListener("click",function(){const s=this.querySelector("i");c.type==="password"?(c.type="text",s.classList.remove("fa-eye"),s.classList.add("fa-eye-slash")):(c.type="password",s.classList.remove("fa-eye-slash"),s.classList.add("fa-eye"))});const p=document.getElementById("forgotPasswordLink"),a=document.getElementById("forgotPasswordModal"),x=document.getElementById("cancelReset");p.addEventListener("click",s=>{s.preventDefault(),a.classList.remove("hidden"),document.getElementById("resetEmail").value=document.getElementById("email").value});x.addEventListener("click",()=>{a.classList.add("hidden"),document.getElementById("resetMessage").classList.add("hidden")});a.addEventListener("click",s=>{s.target===a&&(a.classList.add("hidden"),document.getElementById("resetMessage").classList.add("hidden"))});document.getElementById("forgotPasswordForm").addEventListener("submit",async s=>{s.preventDefault();const l=document.getElementById("resetEmail").value.trim(),r=document.getElementById("resetMessage"),i=document.getElementById("sendResetButton");i.disabled=!0,i.innerHTML='<i class="fas fa-spinner fa-spin mr-2"></i>Enviando...';try{await m(o,l),r.innerHTML=`
          <div class="bg-green-500/20 border border-green-500/50 rounded-xl p-4">
            <div class="flex items-center text-green-300">
              <i class="fas fa-check-circle text-xl mr-3"></i>
              <div class="text-sm">
                <p class="font-semibold">¡Correo enviado!</p>
                <p class="text-green-300/80 mt-1">Revisa tu bandeja de entrada</p>
              </div>
            </div>
          </div>
        `,r.classList.remove("hidden"),setTimeout(()=>{a.classList.add("hidden"),r.classList.add("hidden")},3e3)}catch(n){console.error("Reset error:",n);let e="Error al enviar el correo";n.code==="auth/user-not-found"?e="No existe una cuenta con este correo":n.code==="auth/invalid-email"&&(e="Correo electrónico inválido"),r.innerHTML=`
          <div class="bg-red-500/20 border border-red-500/50 rounded-xl p-4">
            <div class="flex items-center text-red-300">
              <i class="fas fa-exclamation-circle text-xl mr-3"></i>
              <p class="text-sm font-semibold">${e}</p>
            </div>
          </div>
        `,r.classList.remove("hidden")}finally{i.disabled=!1,i.innerHTML="Enviar Enlace"}});document.getElementById("loginForm").addEventListener("submit",async function(s){s.preventDefault();const l=document.getElementById("email").value.trim(),r=document.getElementById("password").value,i=document.getElementById("resultMessage"),n=document.getElementById("loginButton");i.innerHTML="",n.disabled=!0,n.innerHTML='<i class="fas fa-spinner fa-spin mr-2"></i>Verificando credenciales...';try{await u(o,f);const t=(await g(o,l,r)).user;if(console.log("✅ Login successful:",t.uid),!((await t.getIdTokenResult()).claims.role==="admin"))throw await o.signOut(),new Error("Acceso denegado: Se requieren permisos de administrador");i.innerHTML=`
          <div class="bg-green-500/20 border border-green-500/50 rounded-xl p-5">
            <div class="flex items-start space-x-4">
              <div class="flex-shrink-0">
                <div class="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                  <i class="fas fa-check-circle text-2xl text-green-300"></i>
                </div>
              </div>
              <div class="flex-1">
                <p class="font-bold text-white text-lg">¡Acceso Autorizado!</p>
                <p class="text-green-300/80 text-sm mt-1">
                  Bienvenido al panel administrativo
                </p>
                <div class="mt-3 flex items-center text-green-300/60 text-xs">
                  <i class="fas fa-circle-notch fa-spin mr-2"></i>
                  Redirigiendo...
                </div>
              </div>
            </div>
          </div>
        `,setTimeout(()=>{window.location.href="/admin.html"},1500)}catch(e){console.error("❌ Login error:",e);let t="Error desconocido",d="fa-exclamation-triangle";e.code==="auth/wrong-password"||e.code==="auth/user-not-found"?(t="Credenciales incorrectas",d="fa-lock"):e.code==="auth/invalid-email"?(t="Formato de correo inválido",d="fa-envelope"):e.code==="auth/too-many-requests"?(t="Demasiados intentos fallidos. Intenta más tarde.",d="fa-clock"):e.code==="auth/network-request-failed"?(t="Error de conexión. Verifica tu internet.",d="fa-wifi"):e.message&&(t=e.message),i.innerHTML=`
          <div class="bg-red-500/20 border border-red-500/50 rounded-xl p-5">
            <div class="flex items-start space-x-4">
              <div class="flex-shrink-0">
                <div class="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                  <i class="fas ${d} text-2xl text-red-300"></i>
                </div>
              </div>
              <div class="flex-1">
                <p class="font-bold text-white">Error de Autenticación</p>
                <p class="text-red-300/80 text-sm mt-1">${t}</p>
              </div>
            </div>
          </div>
        `,n.disabled=!1,n.innerHTML='<i class="fas fa-sign-in-alt mr-2"></i>Iniciar Sesión'}});
