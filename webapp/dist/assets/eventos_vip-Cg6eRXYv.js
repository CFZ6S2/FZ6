import{a as x,d as p}from"./firebase-config-env-BtJ4KElt.js";/* empty css               */import"./firebase-appcheck-B5Dlx5A0.js";import{onAuthStateChanged as B,signOut as A}from"https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";import{getDoc as h,doc as v,query as y,collection as g,where as w,orderBy as b,getDocs as E}from"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";import{l as T}from"./theme-BOByySXs.js";import"./image-optimizer-CfUQm69F.js";import"https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";import"https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js";import"https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";import"https://www.gstatic.com/firebasejs/10.12.2/firebase-app-check.js";import"./logger-CnI7WBtq.js";let I=null,u=null,d=[],c=[];B(x,async t=>{if(!t){window.location.href="/login.html";return}I=t;const e=await h(v(p,"users",t.uid));if(e.exists()){if(u={id:e.id,...e.data()},T(u),u.gender!=="femenino"){r("Acceso denegado. Solo disponible para mujeres.","error"),setTimeout(()=>{window.location.href="/perfil.html"},2e3);return}await C(),await S(),document.getElementById("loading").classList.add("hidden"),document.getElementById("content").classList.remove("hidden")}});async function S(){try{const t=y(g(p,"vip_events"),w("status","==","published"),b("eventDate","asc")),e=await E(t);d=[],e.forEach(s=>{const n={id:s.id,...s.data()},a=n.eventDate?.toDate();a&&a>new Date&&d.push(n)}),D(d)}catch(t){console.error("Error loading VIP events:",t),r("Error al cargar eventos VIP","error"),document.getElementById("noEvents").classList.remove("hidden")}}async function C(){try{const t=y(g(p,"vip_applications"),w("userId","==",I.uid),b("appliedAt","desc")),e=await E(t);c=[];for(const s of e.docs){const n={id:s.id,...s.data()},a=await h(v(p,"vip_events",n.eventId));a.exists()&&(n.eventData={id:a.id,...a.data()},c.push(n))}M()}catch(t){console.error("Error loading applications:",t)}}function M(){const t=document.getElementById("myApplicationsList"),e=document.getElementById("noApplications");if(c.length===0){t.innerHTML="",e.classList.remove("hidden");return}e.classList.add("hidden"),t.innerHTML="",c.forEach(s=>{const n=s.eventData,a=n.eventDate?.toDate(),o=a?a.toLocaleDateString("es-ES",{weekday:"long",year:"numeric",month:"long",day:"numeric"}):"Fecha no disponible";let l="",i="";s.status==="pending"?(l='<span class="bg-yellow-500 px-3 py-1 rounded-full text-white text-xs font-bold">⏳ Pendiente</span>',i="border-yellow-400"):s.status==="selected"?(l='<span class="bg-green-500 px-3 py-1 rounded-full text-white text-xs font-bold">✅ Seleccionada</span>',i="border-green-400"):s.status==="rejected"&&(l='<span class="bg-red-500 px-3 py-1 rounded-full text-white text-xs font-bold">❌ No Seleccionada</span>',i="border-red-400");const m=sanitizer.text(n.title||"Sin título"),L=sanitizer.text(n.location?.city||"Ciudad no disponible"),$=sanitizer.attribute(n.id||""),f=document.createElement("div");f.className=`event-card p-4 border-l-4 ${i}`,f.innerHTML=`
          <div class="flex justify-between items-start">
            <div class="flex-1">
              <h3 class="text-white font-bold text-lg mb-1">${m}</h3>
              <p class="text-white text-opacity-70 text-sm mb-2">
                <i class="fas fa-calendar mr-1"></i>${o}
              </p>
              <p class="text-white text-opacity-70 text-sm">
                <i class="fas fa-map-marker-alt mr-1"></i>${L}
              </p>
            </div>
            <div class="text-right">
              ${l}
              <p class="text-white text-opacity-60 text-xs mt-2">
                Aplicado: ${s.appliedAt?.toDate().toLocaleDateString("es-ES")}
              </p>
            </div>
          </div>
          <div class="mt-3 pt-3 border-t border-white border-opacity-20">
            <button onclick="window.location.href='/evento-detalle.html?eventId=${$}'" class="text-white text-sm hover:text-purple-200 transition">
              Ver Detalles del Evento <i class="fas fa-arrow-right ml-1"></i>
            </button>
          </div>
        `,t.appendChild(f)})}function D(t){const e=document.getElementById("eventsList"),s=document.getElementById("noEvents");if(t.length===0){e.innerHTML="",s.classList.remove("hidden");return}s.classList.add("hidden"),e.innerHTML="",t.forEach(n=>{const a=k(n);e.appendChild(a)})}function k(t){const e=t.eventDate?.toDate(),s=e?e.toLocaleDateString("es-ES",{weekday:"long",year:"numeric",month:"long",day:"numeric"}):"Fecha no disponible",n=t.spotsAvailable-(t.spotsSelected||0),a=c.some(m=>m.eventId===t.id),l={dinner:"🍷",party:"🎉",travel:"✈️",networking:"🤝",other:"⭐"}[t.eventType]||"⭐",i=document.createElement("div");return i.className="event-card p-6",i.innerHTML=`
        <div class="flex justify-between items-start mb-4">
          <span class="badge-vip px-3 py-1 rounded-full text-white text-xs font-bold">
            💎 VIP
          </span>
          ${a?'<span class="bg-green-500 px-3 py-1 rounded-full text-white text-xs font-bold">✓ Aplicaste</span>':""}
        </div>

        <div class="mb-4">
          <h3 class="text-white font-bold text-xl mb-2">${l} ${t.title||"Sin título"}</h3>
          <p class="text-white text-opacity-70 text-sm line-clamp-2">${t.description||"Sin descripción"}</p>
        </div>

        <div class="space-y-2 mb-4">
          <div class="flex items-center text-white text-opacity-80 text-sm">
            <i class="fas fa-user-tie w-5"></i>
            <span class="badge-concierge px-2 py-1 rounded text-xs ml-2">🎩 ${t.conciergeName||"Concierge"}</span>
          </div>

          <div class="flex items-center text-white text-opacity-80 text-sm">
            <i class="fas fa-calendar w-5"></i>
            <span class="ml-2">${s}</span>
          </div>

          <div class="flex items-center text-white text-opacity-80 text-sm">
            <i class="fas fa-map-marker-alt w-5"></i>
            <span class="ml-2">${t.location?.city||"Ciudad no disponible"}</span>
          </div>

          <div class="flex items-center text-white text-opacity-80 text-sm">
            <i class="fas fa-euro-sign w-5"></i>
            <span class="ml-2 font-bold text-green-300">€${t.compensation?.amount||0}/persona</span>
          </div>

          <div class="flex items-center text-white text-opacity-80 text-sm">
            <i class="fas fa-users w-5"></i>
            <span class="ml-2">${n} ${n===1?"plaza disponible":"plazas disponibles"}</span>
          </div>
        </div>

        <div class="pt-4 border-t border-white border-opacity-20">
          <button
            onclick="window.location.href='/evento-detalle.html?eventId=${t.id}'"
            class="w-full gradient-button px-4 py-3 rounded-lg text-white font-semibold">
            ${a?"Ver Mi Aplicación":"Ver Detalles y Aplicar"} <i class="fas fa-arrow-right ml-2"></i>
          </button>
        </div>
      `,i}document.getElementById("applyFilters").addEventListener("click",()=>{const t=document.getElementById("filterCity").value,e=document.getElementById("filterType").value,s=parseInt(document.getElementById("filterCompensation").value)||0;let n=d.filter(a=>{let o=!0;return t&&a.location?.city!==t&&(o=!1),e&&a.eventType!==e&&(o=!1),s>0&&(a.compensation?.amount||0)<s&&(o=!1),o});D(n),n.length>0&&r(`${n.length} evento(s) encontrado(s)`,"success")});document.getElementById("logoutBtn").addEventListener("click",async()=>{try{await A(x),window.location.href="/login.html"}catch(t){console.error("Error signing out:",t),r("Error al cerrar sesión","error")}});function r(t,e="success"){const s=document.getElementById("toast"),n=document.getElementById("toastMessage"),a=document.getElementById("toastIcon");n.textContent=t,e==="success"?a.className="fas fa-check-circle text-green-400 text-2xl":e==="error"&&(a.className="fas fa-exclamation-circle text-red-400 text-2xl"),s.classList.remove("hidden"),setTimeout(()=>{s.classList.add("hidden")},4e3)}window.showToast=r;
