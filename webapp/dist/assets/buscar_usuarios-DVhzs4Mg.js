import{a as R,d as b}from"./firebase-config-env-BtJ4KElt.js";/* empty css               */import{G as ke}from"./google-maps-config-env-B4GqPX9R.js";import{a as ce,g as Ce}from"./demo-mode-hXQ_XCDZ.js";import"./firebase-appcheck-B5Dlx5A0.js";import{onAuthStateChanged as Se,signOut as Te}from"https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";import{getDoc as de,doc as me,collection as L,query as G,where as _,getDocs as J}from"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";import"https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";import{s as h}from"./utils-B649B8Z6.js";import{l as I}from"./logger-CnI7WBtq.js";import"https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";import"https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js";import"https://www.gstatic.com/firebasejs/10.12.2/firebase-app-check.js";const D=document.createElement("script");D.src=`https://maps.googleapis.com/maps/api/js?key=${ke}&libraries=places,geometry`;D.async=!0;D.defer=!0;document.head.appendChild(D);window.checkDemoAuth=function(){if(ce()){const e=Ce();if(e)return{uid:e.uid,email:e.email,emailVerified:!0,isDemo:!0}}return null};window.checkDemoEmailVerified=function(){return ce()?!0:null};async function Ae(){const e=R.currentUser;if(!e)return{isComplete:!1,missingFields:["authentication"],userData:null,redirectTo:"/login.html"};if(!e.emailVerified)return I.warn("Email no verificado"),{isComplete:!1,missingFields:["emailVerification"],userData:null,redirectTo:"/verify-email.html"};try{const t=await de(me(b,"users",e.uid));if(!t.exists())return I.error("Usuario no encontrado en Firestore"),{isComplete:!1,missingFields:["userDocument"],userData:null,redirectTo:"/login.html"};const a=t.data(),n=[];(!a.alias||a.alias.trim()==="")&&n.push("alias"),(!a.gender||a.gender==="")&&n.push("gender"),(!a.photoURL||a.photoURL==="")&&n.push("photo"),(!a.bio||a.bio.trim()==="")&&n.push("bio"),(!a.municipio||a.municipio==="")&&n.push("location"),(!a.photos||a.photos.length===0)&&n.push("photos");const i=n.length===0;return{isComplete:i,missingFields:n,userData:a,redirectTo:i?null:"/perfil.html?complete=true"}}catch(t){return I.error("Error verificando perfil:",t),{isComplete:!1,missingFields:["error"],userData:null,redirectTo:"/perfil.html"}}}async function Ue(e={}){const{requireEmailVerification:t=!0,requireCompleteProfile:a=!0,silent:n=!1}=e,i=await new Promise(s=>{const o=R.onAuthStateChanged(d=>{o(),s(d)})});if(!i)return n||I.warn("Usuario no autenticado - redirigiendo a login"),window.location.href="/login.html",!1;if(t&&!i.emailVerified)return n||(I.warn("Email no verificado - redirigiendo"),ee("Debes verificar tu email antes de continuar","warning")),setTimeout(()=>{window.location.href="/verify-email.html"},2e3),!1;if(a){const s=await Ae();if(!s.isComplete){if(!n){I.warn("Perfil incompleto - redirigiendo");const o=Pe(s.missingFields);ee(o,"info")}return setTimeout(()=>{window.location.href=s.redirectTo},2e3),!1}}return!0}function Pe(e){if(e.includes("emailVerification"))return"📧 Debes verificar tu email antes de continuar";if(e.includes("authentication"))return"🔐 Debes iniciar sesión para acceder";const t={alias:"nombre de usuario",gender:"género",photo:"foto de perfil",photos:"al menos una foto",bio:"biografía",location:"ubicación"},a=e.filter(n=>t[n]).map(n=>t[n]);return a.length===0?"⚠️ Tu perfil está incompleto":`⚠️ Completa tu perfil: falta ${a.join(", ")}`}function ee(e,t="warning"){const a=document.createElement("div");a.className="fixed inset-0 bg-black/80 flex items-center justify-center z-50",a.innerHTML=`
    <div class="glass-strong rounded-2xl p-8 max-w-md mx-4 text-center animate-fade-in">
      <i class="fas ${t==="warning"?"fa-exclamation-triangle text-yellow-400":"fa-info-circle text-blue-400"} text-6xl mb-4"></i>
      <h2 class="text-2xl font-bold mb-4 text-white">${e}</h2>
      <p class="text-slate-300 mb-6">Serás redirigido automáticamente...</p>
      <div class="w-full bg-slate-700 rounded-full h-2">
        <div class="bg-blue-500 h-2 rounded-full animate-pulse" style="width: 100%; animation: shrink 2s linear;"></div>
      </div>
    </div>
  `;const n=document.createElement("style");n.textContent=`
    @keyframes shrink {
      from { width: 100%; }
      to { width: 0%; }
    }
    .animate-fade-in {
      animation: fadeIn 0.3s ease-in;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: scale(0.9); }
      to { opacity: 1; transform: scale(1); }
    }
  `,document.head.appendChild(n),document.body.appendChild(a)}const ue=["cesar@tucitasegura.com","admin@tucitasegura.com"];window.onerror=function(e,t,a,n,i){return console.error("Global Error:",e,i),!!(e&&e.includes("Google Maps"))};await Ue({requireEmailVerification:!0,requireCompleteProfile:!0,silent:!1});const V=document.getElementById("userGrid"),fe=document.getElementById("loading"),N=document.getElementById("noResults"),$e=document.getElementById("userCount"),Re=document.getElementById("logoutBtn"),De=document.getElementById("toggleFilters"),ge=document.getElementById("filtersPanel"),Fe=document.getElementById("applyFilters"),W=document.getElementById("clearFilters"),Oe=document.getElementById("clearAllFilters"),qe=document.getElementById("resetSearch"),F=document.getElementById("sortBy"),v=document.getElementById("userModal"),ze=document.getElementById("closeModal"),p=document.getElementById("sendMatchBtn"),Ve=document.getElementById("skipUserBtn"),S=document.getElementById("loadMoreContainer"),Ne=document.getElementById("loadMoreBtn"),te=document.getElementById("activeFilters"),He=document.getElementById("filterChips"),H=document.getElementById("viewList"),j=document.getElementById("viewMap"),pe=document.getElementById("mapContainer"),he=document.getElementById("gridContainer"),x=document.getElementById("useMyLocation"),T=document.getElementById("paymentModal"),je=document.getElementById("closePaymentModal"),ae=document.getElementById("goToPaymentBtn"),y=document.getElementById("paymentStatusBanner");let c=null,r=null,g=null,P=[],u=[],$=[],E=[],A=0,m=null,C=[],l=null,z=null,Y="list";const ne=12;function ie(){const e={zoom:12,center:{lat:40.4168,lng:-3.7038},styles:[{featureType:"all",elementType:"geometry",stylers:[{color:"#242f3e"}]},{featureType:"all",elementType:"labels.text.stroke",stylers:[{lightness:-80}]},{featureType:"administrative",elementType:"labels.text.fill",stylers:[{color:"#746855"}]},{featureType:"poi",elementType:"labels.text.fill",stylers:[{color:"#d59563"}]},{featureType:"water",elementType:"geometry",stylers:[{color:"#17263c"}]}]};m=new google.maps.Map(document.getElementById("map"),e);const t=document.getElementById("locationSearch");z=new google.maps.places.Autocomplete(t,{types:["(cities)"],componentRestrictions:{country:"es"}}),z.addListener("place_changed",()=>{const a=z.getPlace();a.geometry&&(l={lat:a.geometry.location.lat(),lng:a.geometry.location.lng()},m.setCenter(l),m.setZoom(12),w())})}function ye(e){if(C.forEach(t=>t.setMap(null)),C=[],!!m&&(e.forEach(t=>{if(t.location&&t.location.lat&&t.location.lng){const a=new google.maps.Marker({position:{lat:t.location.lat,lng:t.location.lng},map:m,title:t.alias||"Usuario",icon:{url:"data:image/svg+xml;charset=UTF-8,"+encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <circle cx="20" cy="20" r="18" fill="#0ea5e9" stroke="#fff" stroke-width="3" />
    <text x="20" y="26" font-size="16" font-weight="bold" text-anchor="middle" fill="#fff">
      ${(t.alias||"U").charAt(0).toUpperCase()}
    </text>
  </svg>
  `),scaledSize:new google.maps.Size(40,40),anchor:new google.maps.Point(20,20)}}),n=getReputationBadge(t.reputation||"BRONCE"),i=l&&t.location?calculateDistance(l.lat,l.lng,t.location.lat,t.location.lng):null,s=new google.maps.InfoWindow({content:`
  <div class="map-info-window">
    <h3 style="font-weight: bold; margin-bottom: 8px;">${t.alias||"Usuario"}</h3>
    <p style="font-size: 0.875rem; margin-bottom: 4px;">
      <i class="fas fa-birthday-cake"></i> ${t.age} años
    </p>
    ${i?`<p style="font-size: 0.875rem; margin-bottom: 8px; color: #86efac;">
      <i class="fas fa-route"></i> ${i.toFixed(1)} km
    </p>`:""}
    <p style="font-size: 0.875rem; margin-bottom: 8px;">${n.icon} ${n.label}</p>
    <button onclick="window.openUserModalFromMap('${t.id}')"
      style="background: linear-gradient(to right, #ec4899, #a855f7); color: white; padding: 8px 16px; border-radius: 8px; border: none; cursor: pointer; font-weight: 600; width: 100%;">
      Ver Perfil
    </button>
  </div>
  `});a.addListener("click",()=>{s.open(m,a)}),C.push(a)}}),C.length>0)){const t=new google.maps.LatLngBounds;C.forEach(a=>t.extend(a.getPosition())),m.fitBounds(t)}}window.openUserModalFromMap=function(e){const t=P.find(a=>a.id===e);t&&Be(t)};x.addEventListener("click",()=>{navigator.geolocation?(x.disabled=!0,x.innerHTML='<i class="fas fa-spinner fa-spin mr-2"></i>Obteniendo...',navigator.geolocation.getCurrentPosition(e=>{l={lat:e.coords.latitude,lng:e.coords.longitude},m&&(m.setCenter(l),m.setZoom(14),new google.maps.Marker({position:l,map:m,icon:{url:"data:image/svg+xml;charset=UTF-8,"+encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <circle cx="20" cy="20" r="18" fill="#22c55e" stroke="#fff" stroke-width="3" />
    <circle cx="20" cy="20" r="8" fill="#fff" />
  </svg>
  `),scaledSize:new google.maps.Size(40,40)},title:"Tu ubicación"})),h("Ubicación detectada","success"),w(),x.disabled=!1,x.innerHTML='<i class="fas fa-check mr-2"></i>Ubicación detectada'},e=>{console.error("Error getting location:",e),h("No se pudo obtener tu ubicación","error"),x.disabled=!1,x.innerHTML='<i class="fas fa-crosshairs mr-2"></i>Usar mi ubicación'})):h("Geolocalización no soportada","error")});Se(R,async e=>{const t=window.checkDemoAuth();if(t){console.log("🎯 Demo mode active - bypassing Firebase auth"),c={uid:t.uid,email:t.email,emailVerified:!0},r={id:t.uid,email:t.email,alias:"Usuario Demo",gender:"masculino",birthDate:"1990-01-01",reputation:"BRONCE",hasActiveSubscription:!1,hasAntiGhostingInsurance:!1,location:{lat:40.4168,lng:-3.7038}},await se(),ie(),await oe(),re(),xe();return}const a=["gonzalo.hrrj@gmail.com","lacasitadebarajas@gmail.com"],n=location.hostname==="localhost"||location.hostname==="127.0.0.1";if(!e){window.location.href="/login.html";return}if(!e.emailVerified&&(h("Verifica tu email primero","warning"),!n&&!a.includes(e.email))){window.location.href="/perfil.html";return}c=e;const i=await e.getIdToken();apiService.setToken(i),await Ge(),await Promise.all([se(),oe()]),ie(),re()});function ve(){return ue.includes(c.email)?{canUse:!0,reason:null}:r.gender==="masculino"?r.hasActiveSubscription?r.hasAntiGhostingInsurance?{canUse:!0,reason:null}:{canUse:!1,reason:"insurance",title:"Seguro Anti-Plantón Requerido",message:"Para agendar citas debes contratar el seguro anti-plantón de 120€."}:{canUse:!1,reason:"membership",title:"Membresía Requerida",message:"Para enviar solicitudes de cita necesitas una membresía activa."}:{canUse:!0,reason:null}}function be(e,t,a){const n=document.getElementById("paymentModalTitle"),i=document.getElementById("paymentModalMessage"),s=document.getElementById("paymentDetails"),o=document.getElementById("paymentBtnText");n.textContent=t,i.textContent=a,e==="membership"?(s.innerHTML=`
  <div class="space-y-4">
    <div class="flex items-center justify-between pb-3 border-b border-white/10">
      <span class="text-slate-400">Plan Mensual</span>
      <span class="text-2xl font-bold text-green-400">€29.99/mes</span>
    </div>
    <div class="space-y-2 text-sm">
      <div class="flex items-start gap-2">
        <i class="fas fa-check text-green-400 mt-1"></i>
        <span>Envía solicitudes de cita ilimitadas</span>
      </div>
      <div class="flex items-start gap-2">
        <i class="fas fa-check text-green-400 mt-1"></i>
        <span>Chat con todos tus matches</span>
      </div>
      <div class="flex items-start gap-2">
        <i class="fas fa-check text-green-400 mt-1"></i>
        <span>Filtros avanzados de búsqueda</span>
      </div>
      <div class="flex items-start gap-2">
        <i class="fas fa-check text-green-400 mt-1"></i>
        <span>Soporte prioritario</span>
      </div>
    </div>
  </div>
  `,o.textContent="Contratar Membresía",ae.onclick=()=>window.location.href="/suscripcion.html"):e==="insurance"&&(s.innerHTML=`
  <div class="space-y-4">
    <div class="flex items-center justify-between pb-3 border-b border-white/10">
      <span class="text-slate-400">Pago Único</span>
      <span class="text-2xl font-bold text-blue-400">€120</span>
    </div>
    <div class="space-y-2 text-sm">
      <div class="flex items-start gap-2">
        <i class="fas fa-shield-check text-blue-400 mt-1"></i>
        <span><strong>Protección anti-plantón:</strong> Si tu cita no se presenta, recuperas tu dinero</span>
      </div>
      <div class="flex items-start gap-2">
        <i class="fas fa-shield-check text-blue-400 mt-1"></i>
        <span><strong>Verificación de identidad:</strong> Todas las citas están verificadas</span>
      </div>
      <div class="flex items-start gap-2">
        <i class="fas fa-shield-check text-blue-400 mt-1"></i>
        <span><strong>Seguridad garantizada:</strong> Sistema de reputación y valoraciones</span>
      </div>
      <div class="flex items-start gap-2">
        <i class="fas fa-shield-check text-blue-400 mt-1"></i>
        <span><strong>Reembolso automático:</strong> Si hay un plantón comprobado</span>
      </div>
    </div>
    <div class="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-3 text-xs">
      <i class="fas fa-info-circle text-yellow-400 mr-2"></i>
      Este seguro es obligatorio para agendar citas y garantiza la seriedad de ambas partes.
    </div>
  </div>
  `,o.textContent="Contratar Seguro",ae.onclick=()=>window.location.href="/seguro.html"),T.classList.remove("opacity-0","pointer-events-none")}function xe(){if(ue.includes(c.email)){y.classList.add("hidden");return}if(!(r.gender==="masculino")){y.classList.add("hidden");return}const t=r.hasActiveSubscription,a=r.hasAntiGhostingInsurance;if(t&&a)y.className="glass-strong rounded-2xl p-4 mb-6 border-2 border-green-500/50",y.innerHTML=`
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-3">
      <i class="fas fa-check-circle text-green-400 text-2xl"></i>
      <div>
        <h4 class="font-bold text-green-400">Cuenta Premium Activa</h4>
        <p class="text-sm text-slate-300">Membresía y seguro anti-plantón activos</p>
      </div>
    </div>
    <div class="flex items-center gap-2">
      <span class="badge bg-green-500/20 border border-green-500/50 text-green-400">
        <i class="fas fa-crown mr-1"></i>Premium
      </span>
      <span class="badge bg-blue-500/20 border border-blue-500/50 text-blue-400">
        <i class="fas fa-shield-check mr-1"></i>Asegurado
      </span>
    </div>
  </div>
  `,y.classList.remove("hidden");else{y.className="glass-strong rounded-2xl p-4 mb-6 border-2 border-yellow-500/50 bg-yellow-500/10";const n=[];t||n.push("Membresía mensual"),a||n.push("Seguro anti-plantón (€120)"),y.innerHTML=`
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-3">
      <i class="fas fa-exclamation-triangle text-yellow-400 text-2xl"></i>
      <div>
        <h4 class="font-bold text-yellow-400">Pagos Pendientes</h4>
        <p class="text-sm text-slate-300">Falta: ${n.join(" y ")}</p>
      </div>
    </div>
    <button onclick="document.getElementById('paymentModal').classList.remove('opacity-0','pointer-events-none')"
      class="bg-yellow-500 hover:bg-yellow-600 px-4 py-2 rounded-lg font-semibold text-black">
      <i class="fas fa-credit-card mr-2"></i>Completar Pagos
    </button>
  </div>
  `,y.classList.remove("hidden")}}async function Ge(){try{const e=me(b,"users",c.uid),t=await de(e);if(t.exists()&&(r={id:t.id,...t.data()},loadTheme(r),r.location&&(l=r.location),xe(),r.gender==="femenino")){const a=document.getElementById("vipEventsBtn");a&&a.classList.remove("opacity-0","pointer-events-none")}}catch(e){console.error("Error loading user data:",e)}}async function se(){try{const e=L(b,"matches"),t=G(e,_("senderId","==",c.uid));E=(await J(t)).docs.map(n=>n.data().receiverId)}catch(e){console.error("Error loading matches:",e)}}async function oe(){Ye();try{const e=L(b,"users"),t=r.gender==="masculino"?"femenino":"masculino",a=G(e,_("gender","==",t)),n=await J(a);let i={};try{const s=await apiService.getRecommendations({limit:50});console.log("🔮 Smart Recommendations:",s);const o=s.recommendations||(Array.isArray(s)?s:[]);Array.isArray(o)&&(o.forEach(d=>{const B=d.user_id||d.id;B&&(i[B]=d.compatibility_score||d.match_score||d.score||0)}),console.log("✅ Matches loaded:",Object.keys(i).length))}catch(s){console.warn("Could not fetch recommendations:",s)}P=[],n.forEach(s=>{if(s.id!==c.uid){const o=s.data(),d=o.birthDate?calculateAge(o.birthDate):null;if(!o.location){const U=s.id.split("").reduce((q,k)=>q+k.charCodeAt(0),0),M=(U%100/100-.5)*.2,O=(U*13%100/100-.5)*.2;o.location={lat:40.4168+M,lng:-3.7038+O}}const B=i[s.id]||0;P.push({id:s.id,...o,age:d,matchScore:B})}}),w()}catch(e){console.error("Error loading users:",e),h("Error al cargar usuarios","error"),Le()}}function w(){const e=Ee();u=P.filter(a=>{if(e.searchText){const n=e.searchText.toLowerCase(),i=a.alias?.toLowerCase().includes(n),s=a.bio?.toLowerCase().includes(n);if(!i&&!s)return!1}if(e.ageMin&&(!a.age||a.age<e.ageMin)||e.ageMax&&(!a.age||a.age>e.ageMax)||e.distance&&l&&a.location&&calculateDistance(l.lat,l.lng,a.location.lat,a.location.lng)>e.distance)return!1;if(e.reputation){const n={BRONCE:1,PLATA:2,ORO:3,PLATINO:4},i=n[a.reputation||"BRONCE"],s=n[e.reputation];if(i<s)return!1}return!(e.verified&&!a.emailVerified||e.online&&!a.isOnline)}),l&&u.forEach(a=>{a.location&&(a.distance=calculateDistance(l.lat,l.lng,a.location.lat,a.location.lng))});const t=e.sortBy;if(t==="compatibility")u.sort((a,n)=>(n.matchScore||0)-(a.matchScore||0));else if(t==="distance"&&l)u.sort((a,n)=>(a.distance||999999)-(n.distance||999999));else if(t==="age-asc")u.sort((a,n)=>(a.age||999)-(n.age||999));else if(t==="age-desc")u.sort((a,n)=>(n.age||0)-(a.age||0));else if(t==="reputation"){const a={BRONCE:1,PLATA:2,ORO:3,PLATINO:4};u.sort((n,i)=>a[i.reputation||"BRONCE"]-a[n.reputation||"BRONCE"])}else u.sort((a,n)=>{const i=a.createdAt?.toMillis?.()||0;return(n.createdAt?.toMillis?.()||0)-i});A=0,$=[],_e(e),Y==="map"?ye(u):we(),We(),Le()}function Ee(){return{searchText:document.getElementById("searchText").value.trim(),ageMin:parseInt(document.getElementById("filterAgeMin").value)||null,ageMax:parseInt(document.getElementById("filterAgeMax").value)||null,distance:parseInt(document.getElementById("filterDistance").value)||null,reputation:document.getElementById("filterReputation").value,verified:document.getElementById("filterVerified").checked,online:document.getElementById("filterOnline").checked,sortBy:F.value}}function _e(e){const t=[];e.searchText&&t.push({text:`"${e.searchText}"`,icon:"search"}),e.ageMin&&t.push({text:`Edad ≥ ${e.ageMin}`,icon:"birthday-cake"}),e.ageMax&&t.push({text:`Edad ≤ ${e.ageMax}`,icon:"birthday-cake"}),e.distance&&t.push({text:`≤ ${e.distance} km`,icon:"route"}),e.reputation&&t.push({text:`${e.reputation}+`,icon:"star"}),e.verified&&t.push({text:"Verificados",icon:"certificate"}),e.online&&t.push({text:"En línea",icon:"circle"}),t.length>0?(He.innerHTML=t.map(a=>{const n=sanitizer.text(a.icon||""),i=sanitizer.text(a.text||"");return`
      <span class="filter-chip">
        <i class="fas fa-${n}"></i>
        ${i}
      </span>
      `}).join(""),te.classList.remove("hidden")):te.classList.add("hidden")}function we(){const e=A*ne,t=e+ne,a=u.slice(e,t);if(A===0&&(V.innerHTML="",$=[]),a.length===0&&A===0){N.classList.remove("hidden"),S.classList.add("hidden");return}N.classList.add("hidden"),a.forEach(n=>{$.push(n);const i=Z(n);V.insertAdjacentHTML("beforeend",i)}),t<u.length?S.classList.remove("hidden"):S.classList.add("hidden"),K()}function Z(e){const t=getReputationBadge(e.reputation||"BRONCE"),a=(e.alias||e.email||"U").charAt(0).toUpperCase(),n=E.includes(e.id),i=e.isOnline||!1,s=e.distance?`<span class="distance-badge"><i
          class="fas fa-route"></i>${e.distance.toFixed(1)} km</span>`:"";return`
        <div class="user-card glass rounded-2xl p-6 cursor-pointer" data-user-id="${e.id}">
          <div class="flex items-start gap-4 mb-4">
            <div class="relative">
              <div
                class="w-20 h-20 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center text-3xl font-bold flex-shrink-0">
                ${a}
              </div>
              ${i?'<span class="absolute bottom-0 right-0 w-5 h-5 bg-green-500 border-4 border-slate-800 rounded-full"></span>':""}
            </div >
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <h3 class="text-xl font-bold truncate">${e.alias||"Usuario"}</h3>
            ${e.emailVerified?'<i class="fas fa-certificate text-blue-400 text-sm" title="Verificado"></i>':""}
          </div>
          <div class="flex flex-wrap gap-2 mb-2">
            <span class="badge bg-slate-700/50 text-xs">
              <i class="fas fa-birthday-cake"></i>
              ${e.age} años
            </span>
            ${s}
          </div>

              <!-- Match Score Badge -->
          ${e.matchScore>0?`
              <div class="mb-2">
                <div class="flex items-center gap-2">
                  <div class="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div class="h-full bg-gradient-to-r from-pink-500 to-purple-500"
                      style="width: ${e.matchScore*100}%"></div>
                  </div>
                  <span class="text-xs font-bold text-pink-400">${Math.round(e.matchScore*100)}%</span>
                </div>
              </div>
              `:""}

          <span class="${t.color} badge text-xs">
            ${t.icon} ${t.label}
          </span>
        </div>
          </div >

          <p class="text-sm text-slate-300 mb-4 line-clamp-2 min-h-[40px]">
            ${e.bio||"Sin descripción disponible"}
          </p>

          <div class="flex gap-2">
            <button
              class="view-profile-btn flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 px-4 py-2.5 rounded-lg font-semibold transition text-sm">
              <i class="fas fa-eye mr-2"></i>Ver Perfil
            </button>
            ${n?'<span class="px-4 py-2.5 bg-yellow-500/20 text-yellow-400 rounded-lg text-sm font-semibold border border-yellow-500/30"><i class="fas fa-check mr-2"></i>Solicitado</span>':'<button class="quick-match-btn quick-action-btn bg-pink-500 hover:bg-pink-600 text-white"><i class="fas fa-heart"></i></button>'}
          </div >
        </div >
      `}function K(){document.querySelectorAll(".user-card").forEach(e=>{const t=e.dataset.userId,a=$.find(s=>s.id===t),n=e.querySelector(".view-profile-btn");n&&n.addEventListener("click",s=>{s.stopPropagation(),Be(a)});const i=e.querySelector(".quick-match-btn");i&&i.addEventListener("click",s=>{s.stopPropagation(),Je(a)})})}function Be(e){g=e;const t=sanitizer.text((e.alias||e.email||"U").charAt(0).toUpperCase()),a=getReputationBadge(e.reputation||"BRONCE"),n=E.includes(e.id);if(document.getElementById("modalAvatar").innerHTML=`
        ${t}
        ${e.isOnline?'<span id="modalOnlineIndicator" class="absolute bottom-1 right-1 w-5 h-5 bg-green-500 border-4 border-slate-800 rounded-full"></span>':""}
        `,document.getElementById("modalName").textContent=e.alias||"Usuario",document.getElementById("modalVerifiedBadge").classList.toggle("hidden",!e.emailVerified),document.getElementById("modalAge").querySelector("span").textContent=`${e.age} años`,e.distance){const f=document.getElementById("modalDistance");f.classList.remove("hidden"),f.querySelector("span").textContent=`${e.distance.toFixed(1)} km`}else document.getElementById("modalDistance").classList.add("hidden");const i=document.getElementById("modalReputation");i.className=`badge ${a.color} `;const s=sanitizer.text(a.icon||""),o=sanitizer.text(a.label||"");i.innerHTML=`${s} ${o} `,document.getElementById("modalBio").textContent=e.bio||"Este usuario no ha agregado una descripción todavía.";const d=e.id.split("").reduce((f,X)=>f+X.charCodeAt(0),0),B=d%20+5,Q=calculateCompatibility(r,e),U=d*13%30+65;document.getElementById("modalCitasCompletadas").textContent=B,document.getElementById("modalCompatibilidad").textContent=`${Q}% `,document.getElementById("modalRespuesta").textContent=`${U}% `,e.location?(document.getElementById("modalMapContainer").classList.remove("hidden"),setTimeout(()=>{const f=new google.maps.Map(document.getElementById("userModalMap"),{zoom:14,center:{lat:e.location.lat,lng:e.location.lng},styles:m.get("styles")});new google.maps.Marker({position:{lat:e.location.lat,lng:e.location.lng},map:f,icon:{url:"data:image/svg+xml;charset=UTF-8,"+encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="18" fill="#0ea5e9" stroke="#fff" stroke-width="3" />
          <text x="20" y="26" font-size="16" font-weight="bold" text-anchor="middle" fill="#fff">
            ${t}
          </text>
        </svg>
        `),scaledSize:new google.maps.Size(40,40)}})},100)):document.getElementById("modalMapContainer").classList.add("hidden");const M=["Música","Viajes","Deportes","Cine","Lectura"],O=d%3+2,q=d%M.length,k=[];for(let f=0;f<O;f++)k.push(M[(q+f)%M.length]);k.length>0?(document.getElementById("modalInterestsSection").classList.remove("hidden"),document.getElementById("modalInterests").innerHTML=k.map(f=>`<span class="badge bg-blue-500/20 border border-blue-500/50">${sanitizer.text(f)}</span>`).join("")):document.getElementById("modalInterestsSection").classList.add("hidden"),document.getElementById("alreadyMatchedMsg").classList.toggle("hidden",!n),p.disabled=n,n?(p.innerHTML='<i class="fas fa-check mr-2"></i>Solicitud Enviada',p.classList.add("opacity-50","cursor-not-allowed")):(p.innerHTML='<i class="fas fa-heart mr-2"></i>Enviar Solicitud de Cita',p.classList.remove("opacity-50","cursor-not-allowed")),v.classList.remove("opacity-0","pointer-events-none")}async function Ie(e,t){try{const a=G(L(b,"conversations"),_("participants","array-contains",c.uid)),n=await J(a);let i=!1;n.forEach(s=>{s.data().participants.includes(e)&&(i=!0)}),i||(await addDoc(L(b,"conversations"),{participants:[c.uid,e],participantsData:{[c.uid]:{alias:r.alias||c.email,gender:r.gender,unreadCount:0},[e]:{alias:t.alias||t.email,gender:t.gender,unreadCount:0}},lastMessage:"",lastMessageTime:serverTimestamp(),lastMessageSenderId:"",createdAt:serverTimestamp(),updatedAt:serverTimestamp()}),console.log("Conversation created successfully"))}catch(a){console.error("Error creating conversation:",a)}}async function Je(e){if(E.includes(e.id)){h("Ya enviaste solicitud a este usuario","warning");return}const t=ve();if(!t.canUse){be(t.reason,t.title,t.message);return}try{await addDoc(L(b,"matches"),{senderId:c.uid,senderName:r.alias||c.email,receiverId:e.id,receiverName:e.alias||e.email,status:"pending",createdAt:serverTimestamp(),updatedAt:serverTimestamp()}),await Ie(e.id,e),E.push(e.id),h("¡Solicitud enviada!","success");const a=document.querySelector(`[data - user - id="${e.id}"]`);a&&(a.outerHTML=Z(e),K())}catch(a){console.error("Error sending match:",a),h("Error al enviar solicitud","error")}}function We(){$e.textContent=u.length}function Ye(){fe.classList.remove("hidden"),V.innerHTML="",N.classList.add("hidden")}function Le(){fe.classList.add("hidden")}function Me(){const e=Ee();localStorage.setItem("userSearchFilters",JSON.stringify(e))}function re(){try{const e=localStorage.getItem("userSearchFilters");if(e){const t=JSON.parse(e);t.ageMin&&(document.getElementById("filterAgeMin").value=t.ageMin),t.ageMax&&(document.getElementById("filterAgeMax").value=t.ageMax),t.distance&&(document.getElementById("filterDistance").value=t.distance),t.reputation&&(document.getElementById("filterReputation").value=t.reputation),t.verified&&(document.getElementById("filterVerified").checked=t.verified),t.online&&(document.getElementById("filterOnline").checked=t.online),t.sortBy&&(F.value=t.sortBy)}}catch(e){console.error("Error loading saved filters:",e)}}H.addEventListener("click",()=>{Y="list",H.classList.add("active"),j.classList.remove("active"),pe.classList.add("hidden"),he.classList.remove("hidden"),S.classList.remove("hidden")});j.addEventListener("click",()=>{Y="map",j.classList.add("active"),H.classList.remove("active"),he.classList.add("hidden"),S.classList.add("hidden"),pe.classList.remove("hidden"),m&&(google.maps.event.trigger(m,"resize"),ye(u))});De.addEventListener("click",()=>{ge.classList.toggle("hidden")});Fe.addEventListener("click",()=>{Me(),w(),ge.classList.add("hidden")});W.addEventListener("click",()=>{document.getElementById("searchText").value="",document.getElementById("locationSearch").value="",document.getElementById("filterAgeMin").value="",document.getElementById("filterAgeMax").value="",document.getElementById("filterDistance").value="",document.getElementById("filterReputation").value="",document.getElementById("filterVerified").checked=!1,document.getElementById("filterOnline").checked=!1,F.value="distance",localStorage.removeItem("userSearchFilters"),w()});Oe.addEventListener("click",()=>{W.click()});qe.addEventListener("click",()=>{W.click()});F.addEventListener("change",()=>{Me(),w()});let le;document.getElementById("searchText").addEventListener("input",e=>{clearTimeout(le),le=setTimeout(()=>{w()},500)});Ne.addEventListener("click",()=>{A++,we()});ze.addEventListener("click",()=>{v.classList.add("opacity-0","pointer-events-none")});Ve.addEventListener("click",()=>{v.classList.add("opacity-0","pointer-events-none")});p.addEventListener("click",async()=>{if(!g||E.includes(g.id))return;const e=ve();if(!e.canUse){v.classList.add("opacity-0","pointer-events-none"),be(e.reason,e.title,e.message);return}p.disabled=!0,p.innerHTML='<i class="fas fa-spinner fa-spin mr-2"></i>Enviando...';try{await addDoc(L(b,"matches"),{senderId:c.uid,senderName:r.alias||c.email,receiverId:g.id,receiverName:g.alias||g.email,status:"pending",createdAt:serverTimestamp(),updatedAt:serverTimestamp()}),await Ie(g.id,g),E.push(g.id),h("¡Solicitud enviada!","success"),v.classList.add("hidden");const t=document.querySelector(`[data - user - id= "${g.id}"]`);t&&(t.outerHTML=Z(g),K())}catch(t){console.error("Error sending match:",t),h("Error al enviar solicitud","error")}finally{p.disabled=!1,p.innerHTML='<i class="fas fa-heart mr-2"></i>Enviar Solicitud de Cita'}});Re.addEventListener("click",async()=>{try{await Te(R),window.location.href="/login.html"}catch(e){console.error("Error signing out:",e)}});v.addEventListener("click",e=>{e.target===v&&v.classList.add("opacity-0","pointer-events-none")});je.addEventListener("click",()=>{T.classList.add("opacity-0","pointer-events-none")});T.addEventListener("click",e=>{e.target===T&&T.classList.add("opacity-0","pointer-events-none")});
