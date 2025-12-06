import{a as S,d as l}from"./firebase-config-env-BtJ4KElt.js";/* empty css               */import"./firebase-appcheck-B5Dlx5A0.js";import{onAuthStateChanged as N,signOut as q}from"https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";import{getDoc as j,doc as m,query as T,collection as C,where as D,getDocs as k,serverTimestamp as L,addDoc as P,updateDoc as v}from"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";import{l as F}from"./theme-BOByySXs.js";import"./image-optimizer-CfUQm69F.js";import"https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";import"https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js";import"https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";import"https://www.gstatic.com/firebasejs/10.12.2/firebase-app-check.js";import"./logger-CnI7WBtq.js";let b=null,c=null,i=null,u=null,d=[],r="pending";const M=new URLSearchParams(window.location.search);u=M.get("eventId");u||(alert("ID de evento no especificado"),window.location.href="/eventos-vip.html");N(S,async e=>{if(!e){window.location.href="/login.html";return}b=e;const t=await j(m(l,"users",e.uid));t.exists()&&(c={id:t.id,...t.data()},F(c),await R(),document.getElementById("loading").classList.add("hidden"),document.getElementById("content").classList.remove("hidden"))});async function R(){try{const e=await j(m(l,"vip_events",u));if(!e.exists()){n("Evento no encontrado","error"),setTimeout(()=>window.location.href="/eventos-vip.html",2e3);return}i={id:e.id,...e.data()},_(),c.userRole==="concierge"&&i.conciergeId===b.uid?(document.getElementById("conciergeView").classList.remove("hidden"),await g()):c.gender==="femenino"?(document.getElementById("applicantView").classList.remove("hidden"),await U()):(n("No tienes acceso a este evento","error"),setTimeout(()=>window.location.href="/perfil.html",2e3))}catch(e){console.error("Error loading event:",e),n("Error al cargar evento","error")}}function _(){const e=i.eventDate?.toDate(),t=e?e.toLocaleDateString("es-ES",{weekday:"long",year:"numeric",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit"}):"Fecha no disponible",s=i.spotsAvailable-(i.spotsSelected||0),a={dinner:"Cena",party:"Fiesta",travel:"Viaje",networking:"Networking",other:"Otro"},o=sanitizer.text(i.title||"Sin título"),E=sanitizer.text(i.conciergeName||"Concierge"),I=sanitizer.text(i.location?.city||"N/A"),h=sanitizer.text(i.location?.address||""),p=sanitizer.text(i.description||"Sin descripción"),A=sanitizer.text(a[i.eventType]||"Otro");document.getElementById("eventDetails").innerHTML=`
        <div class="flex justify-between items-start mb-6">
          <div class="flex-1">
            <h1 class="text-white text-3xl md:text-4xl font-bold mb-2">${o}</h1>
            <p class="text-white text-opacity-80">
              <i class="fas fa-user-tie mr-2"></i>
              Publicado por: <span class="font-semibold">${E}</span>
              <span class="bg-gradient-to-r from-amber-500 to-yellow-600 px-2 py-1 rounded text-xs ml-2">🎩 Verificado</span>
            </p>
          </div>
          <span class="bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 rounded-full text-white font-bold">
            💎 VIP
          </span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div class="bg-white bg-opacity-10 rounded-lg p-4">
            <p class="text-white text-opacity-70 text-sm mb-1">Fecha y Hora</p>
            <p class="text-white font-semibold">
              <i class="fas fa-calendar mr-2"></i>${t}
            </p>
          </div>

          <div class="bg-white bg-opacity-10 rounded-lg p-4">
            <p class="text-white text-opacity-70 text-sm mb-1">Ubicación</p>
            <p class="text-white font-semibold">
              <i class="fas fa-map-marker-alt mr-2"></i>${I}
            </p>
            <p class="text-white text-opacity-80 text-sm">${h}</p>
          </div>

          <div class="bg-white bg-opacity-10 rounded-lg p-4">
            <p class="text-white text-opacity-70 text-sm mb-1">Compensación</p>
            <p class="text-white font-bold text-2xl text-green-300">
              <i class="fas fa-euro-sign mr-2"></i>${i.compensation?.amount||0}
            </p>
            <p class="text-white text-opacity-70 text-xs">por persona</p>
          </div>
        </div>

        <div class="bg-white bg-opacity-10 rounded-lg p-4 mb-6">
          <p class="text-white text-opacity-70 text-sm mb-2">Tipo de Evento</p>
          <p class="text-white font-semibold">${A}</p>
        </div>

        <div class="mb-6">
          <h3 class="text-white text-xl font-bold mb-3">Descripción</h3>
          <p class="text-white text-opacity-90 leading-relaxed">${p}</p>
        </div>

        <div class="mb-6">
          <h3 class="text-white text-xl font-bold mb-3">Requisitos</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div class="bg-white bg-opacity-10 rounded-lg p-3">
              <i class="fas fa-birthday-cake mr-2 text-purple-300"></i>
              <span class="text-white">Edad: ${i.requirements?.minAge||18} - ${i.requirements?.maxAge||99} años</span>
            </div>
            <div class="bg-white bg-opacity-10 rounded-lg p-3">
              <i class="fas fa-users mr-2 text-blue-300"></i>
              <span class="text-white">Plazas: ${s} disponibles de ${i.spotsAvailable}</span>
            </div>
            ${i.requirements?.dresscode?`
            <div class="bg-white bg-opacity-10 rounded-lg p-3">
              <i class="fas fa-tshirt mr-2 text-pink-300"></i>
              <span class="text-white">Vestimenta: ${i.requirements.dresscode}</span>
            </div>
            `:""}
            ${i.requirements?.other?`
            <div class="bg-white bg-opacity-10 rounded-lg p-3 md:col-span-2">
              <i class="fas fa-info-circle mr-2 text-yellow-300"></i>
              <span class="text-white">${i.requirements.other}</span>
            </div>
            `:""}
          </div>
        </div>
      `}async function U(){try{const e=T(C(l,"vip_applications"),D("eventId","==",u),D("userId","==",b.uid));(await k(e)).empty||(document.getElementById("alreadyApplied").classList.remove("hidden"),document.getElementById("applicationForm").classList.add("hidden"))}catch(e){console.error("Error checking application:",e)}}document.getElementById("applyForm").addEventListener("submit",async e=>{e.preventDefault();try{const t=O(c.birthDate);if(t<i.requirements?.minAge||t>i.requirements?.maxAge){n("No cumples con los requisitos de edad para este evento","error");return}const s={eventId:u,userId:b.uid,userName:c.alias||c.email.split("@")[0],userPhoto:c.photoURL||"",userAge:t,userCity:c.city||"No especificada",motivation:document.getElementById("motivation").value,availability:!0,status:"pending",appliedAt:L()};await P(C(l,"vip_applications"),s),n("¡Aplicación enviada exitosamente!","success"),document.getElementById("alreadyApplied").classList.remove("hidden"),document.getElementById("applicationForm").classList.add("hidden")}catch(t){console.error("Error applying to event:",t),n("Error al enviar aplicación: "+t.message,"error")}});async function g(){try{const e=T(C(l,"vip_applications"),D("eventId","==",u)),t=await k(e);d=[];for(const s of t.docs){const a={id:s.id,...s.data()};d.push(a)}V(),w()}catch(e){console.error("Error loading applications:",e),n("Error al cargar aplicantes","error")}}function V(){const e=d.filter(a=>a.status==="pending").length,t=d.filter(a=>a.status==="selected").length,s=d.filter(a=>a.status==="rejected").length;document.getElementById("applicantsCount").textContent=d.length,document.getElementById("pendingCount").textContent=e,document.getElementById("selectedCount").textContent=t,document.getElementById("rejectedCount").textContent=s}function w(){const e=document.getElementById("applicantsList"),t=document.getElementById("noApplicants"),s=d.filter(a=>a.status===r);if(s.length===0){e.innerHTML="",t.classList.remove("hidden"),t.querySelector("p").textContent=`No hay aplicantes ${r==="pending"?"pendientes":r==="selected"?"seleccionadas":"rechazadas"}`;return}t.classList.add("hidden"),e.innerHTML="",s.forEach(a=>{const o=H(a);e.appendChild(o)})}function H(e){const t=e.appliedAt?.toDate(),s=t?t.toLocaleDateString("es-ES",{year:"numeric",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}):"Fecha no disponible",a=sanitizer.text(e.userName||"Usuario"),o=sanitizer.text(String(e.userAge||"")),E=sanitizer.text(e.userCity||""),I=sanitizer.text(e.motivation||"Sin mensaje"),h=e.userPhoto?sanitizer.url(e.userPhoto):null,p=sanitizer.attribute(e.id||""),A=a.charAt(0).toUpperCase(),f=document.createElement("div");return f.className="applicant-card p-6",f.innerHTML=`
        <div class="flex items-start space-x-4">
          <div class="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white text-2xl font-bold">
            ${h?`<img src="${h}" class="w-full h-full rounded-full object-cover">`:A}
          </div>

          <div class="flex-1">
            <div class="flex justify-between items-start mb-2">
              <div>
                <h3 class="text-white font-bold text-xl">${a}</h3>
                <p class="text-white text-opacity-70 text-sm">
                  ${o} años • ${E}
                </p>
              </div>
              <span class="text-white text-opacity-60 text-xs">${s}</span>
            </div>

            <div class="bg-white bg-opacity-10 rounded-lg p-3 mb-4">
              <p class="text-white text-opacity-80 text-sm italic">"${I}"</p>
            </div>

            ${e.status==="pending"?`
              <div class="flex space-x-3">
                <button data-app-id="${p}" data-action="select" class="applicant-action-btn flex-1 bg-green-500 hover:bg-green-600 px-4 py-2 rounded-lg text-white font-semibold transition">
                  <i class="fas fa-check mr-2"></i>Seleccionar
                </button>
                <button data-app-id="${p}" data-action="reject" class="applicant-action-btn flex-1 bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg text-white font-semibold transition">
                  <i class="fas fa-times mr-2"></i>Rechazar
                </button>
              </div>
            `:e.status==="selected"?`
              <div class="flex items-center justify-between">
                <span class="bg-green-500 px-4 py-2 rounded-full text-white font-semibold">
                  <i class="fas fa-check-circle mr-2"></i>Seleccionada
                </span>
                <button data-app-id="${p}" data-action="unselect" class="applicant-action-btn text-white text-opacity-70 hover:text-opacity-100 text-sm transition">
                  <i class="fas fa-undo mr-1"></i>Quitar selección
                </button>
              </div>
            `:`
              <div class="flex items-center justify-between">
                <span class="bg-red-500 px-4 py-2 rounded-full text-white font-semibold">
                  <i class="fas fa-times-circle mr-2"></i>Rechazada
                </span>
                <button data-app-id="${p}" data-action="reconsider" class="applicant-action-btn text-white text-opacity-70 hover:text-opacity-100 text-sm transition">
                  <i class="fas fa-undo mr-1"></i>Reconsiderar
                </button>
              </div>
            `}
          </div>
        </div>
      `,f.querySelectorAll(".applicant-action-btn").forEach(z=>{z.addEventListener("click",async B=>{const x=B.currentTarget.dataset.action,y=B.currentTarget.dataset.appId;x==="select"?await selectApplicant(y):x==="reject"?await rejectApplicant(y):x==="unselect"?await unselectApplicant(y):x==="reconsider"&&await reconsiderApplicant(y)})}),f}window.selectApplicant=async e=>{try{await v(m(l,"vip_applications",e),{status:"selected",selectedAt:L()}),n("Candidata seleccionada","success"),await g()}catch(t){console.error("Error selecting applicant:",t),n("Error al seleccionar candidata","error")}};window.rejectApplicant=async e=>{try{await v(m(l,"vip_applications",e),{status:"rejected",reviewedAt:L()}),n("Candidata rechazada","success"),await g()}catch(t){console.error("Error rejecting applicant:",t),n("Error al rechazar candidata","error")}};window.unselectApplicant=async e=>{try{await v(m(l,"vip_applications",e),{status:"pending"}),n("Selección removida","success"),await g()}catch(t){console.error("Error unselecting applicant:",t),n("Error al remover selección","error")}};window.reconsiderApplicant=async e=>{try{await v(m(l,"vip_applications",e),{status:"pending"}),n("Candidata reconsiderada","success"),await g()}catch(t){console.error("Error reconsidering applicant:",t),n("Error al reconsiderar candidata","error")}};document.getElementById("tabPending").addEventListener("click",()=>{r="pending",$(),w()});document.getElementById("tabSelected").addEventListener("click",()=>{r="selected",$(),w()});document.getElementById("tabRejected").addEventListener("click",()=>{r="rejected",$(),w()});function $(){document.getElementById("tabPending").className=r==="pending"?"px-6 py-2 rounded-lg text-white font-semibold bg-yellow-500 transition":"px-6 py-2 rounded-lg text-white font-semibold bg-white bg-opacity-20 hover:bg-opacity-30 transition",document.getElementById("tabSelected").className=r==="selected"?"px-6 py-2 rounded-lg text-white font-semibold bg-green-500 transition":"px-6 py-2 rounded-lg text-white font-semibold bg-white bg-opacity-20 hover:bg-opacity-30 transition",document.getElementById("tabRejected").className=r==="rejected"?"px-6 py-2 rounded-lg text-white font-semibold bg-red-500 transition":"px-6 py-2 rounded-lg text-white font-semibold bg-white bg-opacity-20 hover:bg-opacity-30 transition"}function O(e){if(!e)return 0;const t=new Date,s=new Date(e);let a=t.getFullYear()-s.getFullYear();const o=t.getMonth()-s.getMonth();return(o<0||o===0&&t.getDate()<s.getDate())&&a--,a}document.getElementById("logoutBtn").addEventListener("click",async()=>{try{await q(S),window.location.href="/login.html"}catch(e){console.error("Error signing out:",e),n("Error al cerrar sesión","error")}});function n(e,t="success"){const s=document.getElementById("toast"),a=document.getElementById("toastMessage"),o=document.getElementById("toastIcon");a.textContent=e,t==="success"?o.className="fas fa-check-circle text-green-400 text-2xl":t==="error"&&(o.className="fas fa-exclamation-circle text-red-400 text-2xl"),s.classList.remove("hidden"),setTimeout(()=>{s.classList.add("hidden")},4e3)}window.showToast=n;
