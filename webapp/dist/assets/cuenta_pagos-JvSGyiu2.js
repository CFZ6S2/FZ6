import{a as h,d as g}from"./firebase-config-env-BtJ4KElt.js";/* empty css               */import"./firebase-appcheck-B5Dlx5A0.js";import{onAuthStateChanged as w,signOut as b}from"https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";import{getDoc as E,doc as I,query as D,collection as B,where as L,orderBy as C,limit as A,getDocs as T}from"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";import{l as S}from"./theme-BOByySXs.js";import"https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";import"https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js";import"https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";import"https://www.gstatic.com/firebasejs/10.12.2/firebase-app-check.js";import"./logger-CnI7WBtq.js";let x=null,i=null;w(h,async t=>{t?(x=t,await N(),await $(),await M(),document.getElementById("loadingOverlay").classList.add("hidden")):window.location.href="/login.html"});async function N(){try{const t=await E(I(g,"users",x.uid));t.exists()&&(i={id:t.id,...t.data()},S(i))}catch(t){console.error("Error loading user data:",t),p("Error al cargar datos de usuario","error")}}async function $(){try{const t=document.getElementById("subscriptionBadge"),n=document.getElementById("subscriptionInfo");if(i.hasActiveSubscription&&i.subscriptionStatus==="active"){t.textContent="Activa",t.className="status-active px-4 py-2 rounded-full text-white font-semibold text-sm";const s=i.subscriptionEndDate?.toDate(),c=s?new Date(s).toLocaleDateString("es-ES",{year:"numeric",month:"long",day:"numeric"}):"Fecha no disponible";n.innerHTML=`
            <div class="payment-card p-4">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-white font-semibold">Membresía Premium</p>
                  <p class="text-white text-opacity-70 text-sm">€29.99 / mes + IVA</p>
                </div>
                <i class="fas fa-check-circle text-green-300 text-2xl"></i>
              </div>
            </div>
            <div class="payment-card p-4">
              <p class="text-white text-opacity-70 text-sm">Próxima renovación</p>
              <p class="text-white font-semibold">${c}</p>
            </div>
            <div class="payment-card p-4">
              <p class="text-white text-opacity-70 text-sm">ID de Suscripción</p>
              <p class="text-white font-mono text-sm">${i.subscriptionId||"N/A"}</p>
            </div>
          `}else t.textContent="Inactiva",t.className="status-inactive px-4 py-2 rounded-full text-white font-semibold text-sm",n.innerHTML=`
            <div class="payment-card p-4">
              <div class="flex items-center space-x-3">
                <i class="fas fa-exclamation-triangle text-yellow-300 text-2xl"></i>
                <div>
                  <p class="text-white font-semibold">No tienes una suscripción activa</p>
                  <p class="text-white text-opacity-70 text-sm">Activa tu membresía para enviar mensajes y proponer citas</p>
                </div>
              </div>
            </div>
          `;const a=document.getElementById("insuranceBadge"),o=document.getElementById("insuranceInfo");if(i.hasAntiGhostingInsurance){a.textContent="Activo",a.className="status-active px-4 py-2 rounded-full text-white font-semibold text-sm";const s=i.insurancePurchaseDate?.toDate(),c=s?new Date(s).toLocaleDateString("es-ES",{year:"numeric",month:"long",day:"numeric"}):"Fecha no disponible";o.innerHTML=`
            <div class="payment-card p-4">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-white font-semibold">Seguro Anti-Ghosting</p>
                  <p class="text-white text-opacity-70 text-sm">€120 (pago único)</p>
                </div>
                <i class="fas fa-shield-check text-blue-300 text-2xl"></i>
              </div>
            </div>
            <div class="payment-card p-4">
              <p class="text-white text-opacity-70 text-sm">Fecha de contratación</p>
              <p class="text-white font-semibold">${c}</p>
            </div>
            <div class="payment-card p-4">
              <p class="text-white text-opacity-70 text-sm">ID de Transacción</p>
              <p class="text-white font-mono text-sm">${i.insurancePaymentId||"N/A"}</p>
            </div>
          `}else a.textContent="No Contratado",a.className="status-inactive px-4 py-2 rounded-full text-white font-semibold text-sm",o.innerHTML=`
            <div class="payment-card p-4">
              <div class="flex items-center space-x-3">
                <i class="fas fa-info-circle text-blue-300 text-2xl"></i>
                <div>
                  <p class="text-white font-semibold">No tienes el seguro anti-ghosting</p>
                  <p class="text-white text-opacity-70 text-sm">Contrata el seguro para programar citas y recibir depósitos de seguridad</p>
                </div>
              </div>
            </div>
          `}catch(t){console.error("Error loading payment data:",t),p("Error al cargar información de pagos","error")}}async function M(){try{const t=document.getElementById("transactionsList"),n=document.getElementById("noTransactions"),a=D(B(g,"payments"),L("userId","==",x.uid),C("createdAt","desc"),A(10)),o=await T(a);if(o.empty){n.classList.remove("hidden"),t.innerHTML="",document.getElementById("activeDepositsAmount").textContent="0 €",document.getElementById("availableWithdrawAmount").textContent="0 €";return}n.classList.add("hidden"),t.innerHTML="";let s=0,c=0;o.forEach(f=>{const e={id:f.id,...f.data()};e.type==="deposit"&&(e.status==="locked"?s+=e.amount||0:e.status==="completed"&&(c+=e.amount||0));const y=e.createdAt?.toDate(),v=y?new Date(y).toLocaleDateString("es-ES",{year:"numeric",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}):"Fecha no disponible",u=document.createElement("div");u.className="payment-card p-4";let l="fa-question-circle",m="Desconocido",r="status-pending",d=e.status||"Pendiente";e.type==="subscription"?(l="fa-crown",m="Suscripción"):e.type==="insurance"?(l="fa-shield-alt",m="Seguro Anti-Ghosting"):e.type==="deposit"&&(l="fa-piggy-bank",m="Depósito de Cita"),e.status==="completed"?(r="status-active",d="Completado"):e.status==="pending"?(r="status-pending",d="Pendiente"):e.status==="failed"||e.status==="canceled"?(r="status-inactive",d="Cancelado"):e.status==="locked"&&(r="status-pending",d="Bloqueado"),u.innerHTML=`
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-4">
                <div class="bg-gradient-to-br from-purple-500 to-pink-500 p-3 rounded-lg">
                  <i class="fas ${l} text-white text-xl"></i>
                </div>
                <div>
                  <p class="text-white font-semibold">${m}</p>
                  <p class="text-white text-opacity-60 text-sm">${v}</p>
                </div>
              </div>
              <div class="text-right">
                <p class="text-white font-bold text-lg">${e.amount?.toFixed(2)||"0.00"} €</p>
                <span class="${r} px-2 py-1 rounded-full text-white text-xs font-semibold">${d}</span>
              </div>
            </div>
          `,t.appendChild(u)}),document.getElementById("activeDepositsAmount").textContent=`${s.toFixed(2)} €`,document.getElementById("availableWithdrawAmount").textContent=`${c.toFixed(2)} €`}catch(t){console.error("Error loading transaction history:",t),t.message.includes("index")||p("Error al cargar historial de transacciones","error"),document.getElementById("noTransactions").classList.remove("hidden")}}document.getElementById("logoutBtn").addEventListener("click",async()=>{try{await b(h),window.location.href="/login.html"}catch(t){console.error("Error signing out:",t),p("Error al cerrar sesión","error")}});function p(t,n="success"){const a=document.getElementById("toast"),o=document.getElementById("toastMessage"),s=document.getElementById("toastIcon");o.textContent=t,n==="success"?s.className="fas fa-check-circle text-green-400 text-2xl":n==="error"&&(s.className="fas fa-exclamation-circle text-red-400 text-2xl"),a.classList.remove("hidden"),setTimeout(()=>{a.classList.add("hidden")},4e3)}
