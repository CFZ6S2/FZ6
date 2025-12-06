import{a as I,d as m}from"./firebase-config-env-BtJ4KElt.js";/* empty css               */import"./error-fixes-B-QQl9aC.js";import"./firebase-appcheck-B5Dlx5A0.js";import{onAuthStateChanged as C,signOut as L}from"https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";import{getDoc as A,doc as D,query as y,collection as v,where as x,orderBy as T,getDocs as h,serverTimestamp as u,Timestamp as M,addDoc as S}from"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";import{l as $}from"./theme-BOByySXs.js";import"https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";import"https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js";import"https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";import"https://www.gstatic.com/firebasejs/10.12.2/firebase-app-check.js";import"./logger-CnI7WBtq.js";let g=null,i=null,f=[];C(I,async e=>{if(!e){window.location.href="/login.html";return}g=e;const t=await A(D(m,"users",e.uid));if(t.exists()){if(i={id:t.id,...t.data()},$(i),i.userRole!=="concierge"||i.conciergeStatus!=="approved"){d("Acceso denegado. Solo para Concierges aprobados.","error"),setTimeout(()=>{window.location.href="/perfil.html"},2e3);return}await B(),document.getElementById("loading").classList.add("hidden"),document.getElementById("content").classList.remove("hidden")}});async function B(){try{const e=y(v(m,"vip_events"),x("conciergeId","==",g.uid),T("createdAt","desc")),t=await h(e);f=[];let n=[],a=[],o=0,c=0;for(const l of t.docs){const s={id:l.id,...l.data()},p=y(v(m,"vip_applications"),x("eventId","==",l.id)),r=await h(p);s.applicationsCount=r.size,s.selectedCount=r.docs.filter(b=>b.data().status==="selected").length,o+=s.applicationsCount,c+=s.selectedCount;const E=s.eventDate?.toDate();E&&E<new Date||s.status==="completed"||s.status==="canceled"?a.push(s):n.push(s),f.push(s)}document.getElementById("activeEventsCount").textContent=n.length,document.getElementById("totalApplicantsCount").textContent=o,document.getElementById("selectedApplicantsCount").textContent=c,document.getElementById("pastEventsCount").textContent=a.length,k(n),P(a)}catch(e){console.error("Error loading events:",e),d("Error al cargar eventos","error")}}function k(e){const t=document.getElementById("activeEventsList"),n=document.getElementById("noActiveEvents");if(e.length===0){t.innerHTML="",n.classList.remove("hidden");return}n.classList.add("hidden"),t.innerHTML="",e.forEach(a=>{const o=w(a);t.appendChild(o)})}function P(e){const t=document.getElementById("pastEventsList"),n=document.getElementById("noPastEvents");if(e.length===0){t.innerHTML="",n.classList.remove("hidden");return}n.classList.add("hidden"),t.innerHTML="",e.forEach(a=>{const o=w(a,!0);t.appendChild(o)})}function w(e,t=!1){const n=e.eventDate?.toDate(),a=n?n.toLocaleDateString("es-ES",{weekday:"long",year:"numeric",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit"}):"Fecha no disponible",o=e.spotsAvailable-(e.spotsSelected||0),c=document.createElement("div"),l=sanitizer.text(e.title||"Sin título"),s=sanitizer.text(e.description||""),p=s.substring(0,100)+(s.length>100?"...":""),r=sanitizer.text(e.location?.city||"N/A");return c.className=`event-card p-6 ${t?"opacity-75":""}`,c.innerHTML=`
        <div class="flex justify-between items-start mb-4">
          <div class="flex-1">
            <h3 class="text-white font-bold text-xl mb-2">${l}</h3>
            <p class="text-white text-opacity-70 text-sm mb-2">${p}</p>
          </div>
          <div class="text-right">
            <span class="bg-gradient-to-r from-purple-600 to-pink-600 px-3 py-1 rounded-full text-white text-xs font-bold">
              ${e.status==="published"?"✓ Publicado":e.status==="completed"?"✓ Completado":e.status}
            </span>
          </div>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div class="stat-card p-3 text-center">
            <p class="text-white text-opacity-70 text-xs mb-1">Aplicantes</p>
            <p class="text-white text-2xl font-bold">${e.applicationsCount||0}</p>
          </div>
          <div class="stat-card p-3 text-center">
            <p class="text-white text-opacity-70 text-xs mb-1">Seleccionadas</p>
            <p class="text-white text-2xl font-bold">${e.selectedCount||0}/${e.spotsAvailable}</p>
          </div>
          <div class="stat-card p-3 text-center">
            <p class="text-white text-opacity-70 text-xs mb-1">Plazas Libres</p>
            <p class="text-white text-2xl font-bold">${o}</p>
          </div>
          <div class="stat-card p-3 text-center">
            <p class="text-white text-opacity-70 text-xs mb-1">Compensación</p>
            <p class="text-white text-2xl font-bold">€${e.compensation?.amount||0}</p>
          </div>
        </div>

        <div class="flex items-center text-white text-opacity-80 text-sm mb-4">
          <i class="fas fa-calendar mr-2"></i>
          <span>${a}</span>
          <i class="fas fa-map-marker-alt ml-4 mr-2"></i>
          <span>${r}</span>
        </div>

        <div class="flex space-x-3">
          <button
            onclick="window.location.href='/evento-detalle.html?eventId=${e.id}'"
            class="flex-1 gradient-button px-4 py-2 rounded-lg text-white font-semibold">
            <i class="fas fa-users mr-2"></i>Ver Aplicantes (${e.applicationsCount||0})
          </button>
        </div>
      `,c}document.getElementById("createEventBtn").addEventListener("click",()=>{document.getElementById("createEventModal").classList.remove("opacity-0","pointer-events-none")});document.getElementById("closeModalBtn").addEventListener("click",()=>{document.getElementById("createEventModal").classList.add("opacity-0","pointer-events-none")});document.getElementById("cancelCreateBtn").addEventListener("click",()=>{document.getElementById("createEventModal").classList.add("opacity-0","pointer-events-none")});document.getElementById("createEventForm").addEventListener("submit",async e=>{e.preventDefault();try{const t=new Date(document.getElementById("eventDate").value+"T"+document.getElementById("eventTime").value),n={conciergeId:g.uid,conciergeName:i.alias||i.email,title:document.getElementById("eventTitle").value,description:document.getElementById("eventDescription").value,eventType:document.getElementById("eventType").value,eventDate:M.fromDate(t),eventTime:document.getElementById("eventTime").value,location:{address:document.getElementById("eventAddress").value,city:document.getElementById("eventCity").value,country:"España"},compensation:{amount:parseFloat(document.getElementById("eventCompensation").value),currency:"EUR",type:"per_person"},spotsAvailable:parseInt(document.getElementById("eventSpots").value),spotsSelected:0,requirements:{minAge:parseInt(document.getElementById("minAge").value),maxAge:parseInt(document.getElementById("maxAge").value),dresscode:document.getElementById("dresscode").value,other:document.getElementById("otherRequirements").value},status:"published",isActive:!0,totalApplications:0,selectedApplicants:[],createdAt:u(),publishedAt:u(),updatedAt:u()};await S(v(m,"vip_events"),n),d("Evento VIP creado exitosamente","success"),document.getElementById("createEventModal").classList.add("opacity-0","pointer-events-none"),document.getElementById("createEventForm").reset(),await B()}catch(t){console.error("Error creating event:",t),d("Error al crear evento: "+t.message,"error")}});document.getElementById("logoutBtn").addEventListener("click",async()=>{try{await L(I),window.location.href="/login.html"}catch(e){console.error("Error signing out:",e),d("Error al cerrar sesión","error")}});function d(e,t="success"){const n=document.getElementById("toast"),a=document.getElementById("toastMessage"),o=document.getElementById("toastIcon");a.textContent=e,t==="success"?o.className="fas fa-check-circle text-green-400 text-2xl":t==="error"&&(o.className="fas fa-exclamation-circle text-red-400 text-2xl"),n.classList.remove("hidden"),setTimeout(()=>{n.classList.add("hidden")},4e3)}window.showToast=d;
