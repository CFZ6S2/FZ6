import{a as A,d as C,b as te,s as Y}from"./firebase-config-env-BtJ4KElt.js";/* empty css               */import"./error-fixes-B-QQl9aC.js";import"./sanitizer-CcqdHDpm.js";import{_ as ue}from"./firebase-appcheck-B5Dlx5A0.js";import{onAuthStateChanged as ge,signOut as pe}from"https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";import{doc as z,getDoc as oe,updateDoc as H,serverTimestamp as ne}from"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";import{ref as J,deleteObject as K}from"https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";import{s as i}from"./utils-B649B8Z6.js";import{a as O}from"./api-service-BrFQUPuu.js";import{l as fe,t as X,a as he}from"./theme-BOByySXs.js";import{l as b}from"./logger-CnI7WBtq.js";import{s as ye}from"./error-handler-C1-yvVyz.js";import{a as be,g as ae}from"./demo-mode-hXQ_XCDZ.js";import{M as R,G as Ee}from"./google-maps-config-env-B4GqPX9R.js";import"./image-optimizer-CfUQm69F.js";import"https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";import"https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js";import"https://www.gstatic.com/firebasejs/10.12.2/firebase-app-check.js";(function(){function e(){return localStorage.getItem("demoMode")==="true"||new URLSearchParams(window.location.search).get("demo")==="true"}function t(){try{return JSON.parse(localStorage.getItem("demoUser")||"{}")}catch{return{}}}function o(){const l=document.createElement("div");return l.id="demo-mode-banner",l.className="demo-banner",l.innerHTML=`
      <div class="demo-banner-content">
        <div class="demo-banner-icon">
          <i class="fas fa-flask"></i>
        </div>
        <div class="demo-banner-text">
          <strong>Modo Demo Activado</strong>
          <span>Estás usando TuCitaSegura en modo demostración. Algunas funciones están limitadas.</span>
        </div>
        <div class="demo-banner-actions">
          <button id="demo-learn-more" class="demo-banner-btn demo-banner-btn-secondary">
            <i class="fas fa-info-circle"></i>
            Más Info
          </button>
          <button id="demo-exit" class="demo-banner-btn demo-banner-btn-primary">
            <i class="fas fa-sign-out-alt"></i>
            Salir Demo
          </button>
        </div>
      </div>
    `,l}function n(){if(document.getElementById("demo-styles"))return;const l=document.createElement("style");l.id="demo-styles",l.textContent=`
      .demo-banner {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: linear-gradient(135deg, #f59e0b, #d97706);
        color: white;
        z-index: 9999;
        padding: 12px 16px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        animation: slideDown 0.3s ease-out;
        border-bottom: 2px solid #f59e0b;
      }

      .demo-banner-content {
        max-width: 1200px;
        margin: 0 auto;
        display: flex;
        align-items: center;
        gap: 16px;
        flex-wrap: wrap;
        justify-content: space-between;
      }

      .demo-banner-icon {
        font-size: 24px;
        color: #fef3c7;
        animation: pulse 2s infinite;
      }

      .demo-banner-text {
        flex: 1;
        min-width: 200px;
      }

      .demo-banner-text strong {
        display: block;
        font-size: 16px;
        font-weight: 700;
        margin-bottom: 4px;
        color: #fff;
      }

      .demo-banner-text span {
        display: block;
        font-size: 14px;
        opacity: 0.9;
        line-height: 1.4;
      }

      .demo-banner-actions {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
      }

      .demo-banner-btn {
        padding: 8px 16px;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        gap: 6px;
        white-space: nowrap;
      }

      .demo-banner-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
      }

      .demo-banner-btn-primary {
        background: #dc2626;
        color: white;
      }

      .demo-banner-btn-primary:hover {
        background: #b91c1c;
      }

      .demo-banner-btn-secondary {
        background: rgba(255, 255, 255, 0.2);
        color: white;
        border: 1px solid rgba(255, 255, 255, 0.3);
      }

      .demo-banner-btn-secondary:hover {
        background: rgba(255, 255, 255, 0.3);
      }

      /* Demo mode indicators for specific elements */
      .demo-mode-indicator {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        background: #f59e0b;
        color: white;
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 600;
        margin-left: 8px;
      }

      .demo-mode-indicator i {
        font-size: 10px;
      }

      /* Demo limitations styling */
      .demo-limited {
        position: relative;
        opacity: 0.7;
        pointer-events: none;
      }

      .demo-limited::after {
        content: 'DEMO';
        position: absolute;
        top: 4px;
        right: 4px;
        background: #f59e0b;
        color: white;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 10px;
        font-weight: bold;
      }

      /* Adjust body padding when banner is shown */
      body.demo-mode-active {
        padding-top: 80px;
      }

      /* Responsive adjustments */
      @media (max-width: 768px) {
        .demo-banner-content {
          flex-direction: column;
          text-align: center;
          gap: 12px;
        }

        .demo-banner-actions {
          justify-content: center;
        }

        .demo-banner-text strong {
          font-size: 15px;
        }

        .demo-banner-text span {
          font-size: 13px;
        }
      }

      @keyframes slideDown {
        from {
          transform: translateY(-100%);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }

      @keyframes pulse {
        0%, 100% {
          transform: scale(1);
        }
        50% {
          transform: scale(1.1);
        }
      }
    `,document.head.appendChild(l)}function a(){e()&&(n(),document.readyState==="loading"?document.addEventListener("DOMContentLoaded",r):r())}function r(){const l=o();document.body.appendChild(l),document.body.classList.add("demo-mode-active"),document.getElementById("demo-learn-more").addEventListener("click",m),document.getElementById("demo-exit").addEventListener("click",c)}function m(){t(),alert(`🧪 Modo Demo - TuCitaSegura

✅ Funciones disponibles:
• Navegación completa
• Búsqueda de usuarios
• Ver perfiles
• Filtros avanzados
• Chat y mensajería
• Sistema de reputación

⚠️ Limitaciones:
• Datos almacenados localmente
• Sin persistencia en servidor
• Sin notificaciones reales
• Sin pagos reales

💡 Para usar todas las funciones, configura Firebase en producción.`)}function c(){confirm("¿Salir del modo demo? Se cerrará tu sesión actual.")&&(localStorage.removeItem("demoMode"),localStorage.removeItem("demoUser"),localStorage.removeItem("demoData"),window.location.href="/webapp/login.html")}function g(){if(!e())return;document.querySelectorAll('[href*="suscripcion"], [href*="seguro"], [href*="pagos"]').forEach(d=>{if(!d.querySelector(".demo-mode-indicator")){const f=document.createElement("span");f.className="demo-mode-indicator",f.innerHTML='<i class="fas fa-flask"></i>DEMO',d.appendChild(f)}}),document.querySelectorAll(".fa-gem, .fa-crown, .fa-star").forEach(d=>{if(d.closest("a, button")&&!d.closest("a, button").querySelector(".demo-mode-indicator")){const f=document.createElement("span");f.className="demo-mode-indicator",f.innerHTML='<i class="fas fa-flask"></i>',d.closest("a, button").appendChild(f)}})}a();const p=new MutationObserver(()=>{e()&&!document.getElementById("demo-mode-banner")&&r(),g()});document.body&&p.observe(document.body,{childList:!0,subtree:!0}),window.DemoMode={isActive:e,getUser:t,exit:c,showInfo:m}})();const we="BJW5I1B7KSEvM1q8FuwNokyu4sgoUy0u93C2XSQ8kpDVUdw6jv1UgYo9k_lIRjs-Rpte-YUkFqM7bbOYAD32T-w";let U=null,ve=null;async function Ie(){try{if(!("Notification"in window))return console.warn("This browser does not support notifications"),!1;if(!("serviceWorker"in navigator))return console.warn("This browser does not support service workers"),!1;try{const e=await ue(()=>import("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js"),[]),{getMessaging:t,getToken:o,onMessage:n}=e;await xe(),U=t();const a=await Be();return a&&(await Le(o),ke(n)),a}catch(e){return console.warn("Firebase Messaging not available:",e.message),console.log("💡 Notifications disabled - using basic functionality"),!1}}catch(e){return console.error("Error initializing notifications:",e),!1}}async function xe(){try{const e=await navigator.serviceWorker.register("/firebase-messaging-sw.js");return console.log("✅ Service Worker registered for notifications:",e.scope),e}catch(e){throw console.warn("Service Worker registration failed:",e),e}}async function Be(){try{const e=await Notification.requestPermission();return console.log("🔔 Notification permission:",e),e==="granted"}catch(e){return console.warn("Error requesting notification permission:",e),!1}}async function Le(e){if(!U||!A.currentUser){console.warn("Cannot get FCM token: messaging not initialized or no user");return}try{const t=await e(U,{vapidKey:we});t?(console.log("✅ FCM Token obtained"),ve=t,await Me(t),typeof i=="function"&&i("Notificaciones activadas","success")):console.log("📵 No FCM token available")}catch(t){console.warn("Error getting FCM token:",t),t.code==="messaging/permission-blocked"&&typeof i=="function"&&i("Permisos de notificación bloqueados","warning")}}async function Me(e){if(A.currentUser)try{const t=z(C,"users",A.currentUser.uid),o=await oe(t);if(o.exists()){const a=o.data().fcmTokens||{};a[e]={createdAt:new Date,platform:navigator.platform,userAgent:navigator.userAgent.substring(0,100)},await H(t,{fcmTokens:a,lastNotificationToken:e}),console.log("✅ FCM token saved to Firestore")}}catch(t){console.warn("Error saving FCM token:",t)}}function ke(e){if(U)try{e(U,t=>{console.log("📨 Foreground message received:",t);const o=t.notification?.title||"TuCitaSegura",n={body:t.notification?.body||"Tienes una nueva notificación",icon:t.notification?.icon||"/webapp/img/icon-192x192.png",badge:"/webapp/img/icon-72x72.png",vibrate:[200,100,200],tag:"tucitasegura-notification"};Notification.permission==="granted"&&new Notification(o,n),typeof i=="function"&&i(n.body,"info")}),console.log("✅ Foreground message listener set up")}catch(t){console.warn("Error setting up foreground message listener:",t)}}console.log("✅ Notifications module loaded with error handling");const G=new Set(["image/jpeg","image/jpg","image/png","image/webp","image/gif"]),Q=new Set([".exe",".bat",".cmd",".sh",".app",".deb",".rpm",".msi",".dmg",".pkg",".run",".bin",".com",".scr",".vbs",".js",".jar",".apk",".ipa",".py",".php",".asp",".aspx",".jsp",".cgi",".pl",".rb"]),Se=5*1024*1024,Ce=10*1024*1024;class j{constructor(t,o=[],n=[],a={}){this.isValid=t,this.errors=o,this.warnings=n,this.metadata=a}}class Te{constructor(){this.maxImageSize=Se,this.maxDocumentSize=Ce}async validateImage(t){const o=[],n=[],a={};try{if(!t)return o.push("No file provided"),new j(!1,o,n,a);a.sizeBytes=t.size,a.sizeMB=(t.size/(1024*1024)).toFixed(2),t.size===0&&o.push("File is empty"),t.size>this.maxImageSize&&o.push(`File too large: ${a.sizeMB}MB (max: ${(this.maxImageSize/(1024*1024)).toFixed(0)}MB)`);const r=t.name||"unknown",m=this.getFileExtension(r);a.fileName=r,a.extension=m,Q.has(m.toLowerCase())&&o.push(`Dangerous file extension: ${m}`);const c=t.type||"";a.mimeType=c,c?G.has(c.toLowerCase())||o.push(`Invalid image type: ${c}. Allowed: ${Array.from(G).join(", ")}`):o.push("Could not detect file type");const g={"image/jpeg":[".jpg",".jpeg"],"image/png":[".png"],"image/webp":[".webp"],"image/gif":[".gif"]};if(c&&g[c]&&(g[c].includes(m.toLowerCase())||n.push(`Extension ${m} doesn't match MIME type ${c}`)),o.length===0)try{const l=await this.loadImage(t);a.width=l.width,a.height=l.height,(l.width<100||l.height<100)&&n.push(`Image too small: ${l.width}x${l.height} (minimum recommended: 100x100)`),(l.width>8e3||l.height>8e3)&&n.push(`Image very large: ${l.width}x${l.height} (may cause performance issues)`);const E=l.width/l.height;a.aspectRatio=E.toFixed(2),(E>5||E<.2)&&n.push(`Unusual aspect ratio: ${E.toFixed(2)} (image may be distorted)`)}catch(l){o.push(`Invalid or corrupted image: ${l.message}`),b.error("Image validation error",l,{fileName:r})}const p=o.length===0;return b.debug("File validation completed",{fileName:r,isValid:p,errorCount:o.length,warningCount:n.length}),new j(p,o,n,a)}catch(r){return b.error("File validation error",r),o.push(`Validation error: ${r.message}`),new j(!1,o,n,a)}}loadImage(t){return new Promise((o,n)=>{const a=new Image,r=URL.createObjectURL(t);a.onload=()=>{URL.revokeObjectURL(r),o({width:a.naturalWidth,height:a.naturalHeight,img:a})},a.onerror=()=>{URL.revokeObjectURL(r),n(new Error("Failed to load image"))},a.src=r})}getFileExtension(t){const o=t.split(".");return o.length>1?"."+o[o.length-1]:""}async validateImages(t){const o=[];for(const n of t){const a=await this.validateImage(n);o.push(a)}return o}isAllowedImageType(t){return G.has(t.toLowerCase())}isDangerousExtension(t){return Q.has(t.toLowerCase())}formatFileSize(t){if(t===0)return"0 Bytes";const o=1024,n=["Bytes","KB","MB","GB"],a=Math.floor(Math.log(t)/Math.log(o));return Math.round(t/Math.pow(o,a)*100)/100+" "+n[a]}}function ie(e,t){e.isValid||e.errors.forEach(o=>{t(o,"error"),b.error("File validation error",{error:o})}),e.warnings.forEach(o=>{t(o,"warning"),b.warn("File validation warning",{warning:o})})}const re=new Te;console.log("🔥 DEBUG: Firestore imported from config:",C);console.log("🔥 DEBUG: App initialized:",te);window._debug_db=C;window._debug_app=te;ye();let y=null,s=null,$=null,D=[null,null,null,null,null],q="purple",L=!1,P=!1,T=null,N=null,_=null,v=null,I=null,F=!1;function se(){return new Promise((e,t)=>{if(window.google&&window.google.maps){F=!0,_=new google.maps.Geocoder,e();return}if(F){e();return}const o=document.querySelector('script[src*="maps.googleapis.com"]');if(o){window.google&&window.google.maps?e():o.addEventListener("load",()=>{F=!0,_=new google.maps.Geocoder,e()});return}const n=document.createElement("script");n.src=`https://maps.googleapis.com/maps/api/js?key=${Ee}&libraries=places&language=es&region=ES&callback=initMapCallback`,n.async=!0,n.defer=!0,n.id="google-maps-script",window.initMapCallback=()=>{console.log("🗺️ Google Maps loaded via callback"),F=!0,_=new google.maps.Geocoder,e()},n.onerror=()=>{t(new Error("Error al cargar Google Maps API"))},document.head.appendChild(n)})}async function le(e,t){const o=document.getElementById("locationMap");try{if(await se(),o.classList.remove("hidden"),T){const n=new google.maps.LatLng(e,t);T.setCenter(n),N?N.setPosition(n):Z(e,t);return}T=new google.maps.Map(o,{center:{lat:e,lng:t},zoom:R.zoom,mapTypeId:R.mapTypeId,gestureHandling:R.gestureHandling,styles:R.styles,mapTypeControl:!0,streetViewControl:!1,fullscreenControl:!1}),Z(e,t),T.addListener("click",async n=>{const a=n.latLng.lat(),r=n.latLng.lng();N.setPosition(n.latLng),v=a,I=r,await W(a,r)})}catch(n){console.error("Error initializing map:",n),i("Error al cargar el mapa. Verifica la API Key de Google Maps.","error")}}function Z(e,t){N=new google.maps.Marker({position:{lat:e,lng:t},map:T,draggable:!0,animation:google.maps.Animation.DROP,title:"Arrastra para ajustar tu ubicación"}),N.addListener("dragend",async o=>{const n=o.latLng.lat(),a=o.latLng.lng();v=n,I=a,await W(n,a)})}async function De(){const e=document.getElementById("getLocationBtn");e.disabled=!0,e.innerHTML='<i class="fas fa-spinner fa-spin"></i> Obteniendo ubicación...';try{if(!navigator.geolocation){i("Tu navegador no soporta geolocalización","error");return}const t=await new Promise((o,n)=>{navigator.geolocation.getCurrentPosition(o,n,{enableHighAccuracy:!0,timeout:1e4,maximumAge:0})});v=t.coords.latitude,I=t.coords.longitude,document.getElementById("latitude").value=v,document.getElementById("longitude").value=I,le(v,I),await W(v,I),i("Ubicación obtenida correctamente","success")}catch(t){console.error("Error getting location:",t);let o="Error al obtener la ubicación";t.code===1?o="Permiso de ubicación denegado. Por favor, permite el acceso a tu ubicación.":t.code===2?o="No se pudo determinar tu ubicación. Intenta de nuevo.":t.code===3&&(o="Tiempo de espera agotado. Intenta de nuevo."),i(o,"error")}finally{e.disabled=!1,e.innerHTML='<i class="fas fa-location-crosshairs"></i> Usar mi ubicación actual'}}async function W(e,t){try{await se();const o=new google.maps.LatLng(e,t);_.geocode({location:o},(n,a)=>{if(console.log("🌍 Geocoder status:",a),console.log("🌍 Geocoder results:",n),a==="OK")if(n&&n.length>0){let r="Ubicación desconocida";for(const c of n){const g=c.address_components.find(p=>p.types.includes("locality")||p.types.includes("administrative_area_level_3")||p.types.includes("administrative_area_level_2"));if(g){r=g.long_name;break}}if(r==="Ubicación desconocida"){const c=n[0].address_components.find(g=>g.types.includes("administrative_area_level_1"));c&&(r=c.long_name)}const m=document.getElementById("city");m.removeAttribute("readonly"),m.value=r,m.setAttribute("readonly","readonly"),document.getElementById("latitude").value=e,document.getElementById("longitude").value=t,console.log("📍 Municipio obtenido:",r),console.log("🔒 Privacidad: Solo se muestra el municipio, sin dirección exacta"),i(`✅ Ubicación establecida: ${r}`,"success")}else throw new Error("No se encontraron resultados");else throw new Error(`Geocoding falló: ${a}`)})}catch(o){console.error("Error in reverse geocoding:",o),i("No se pudo obtener el nombre del municipio","warning")}}document.getElementById("getLocationBtn").addEventListener("click",De);let V=0,ee=0;ge(A,async e=>{try{V++;const t=Date.now(),o=t-ee;if(ee=t,console.log(`🔍 Auth state change #${V}:`,e?"User logged in":"No user"),console.log(`⏱️ Time since last change: ${o}ms`),V>10&&o<1e3){console.error("🚨 EMERGENCY: Auth state changing too rapidly - stopping to prevent infinite loop"),i("Error de autenticación - por favor recarga la página","error");return}if(L||P){console.log("🛑 Preventing duplicate profile load");return}if(be()){const n=ae();if(n){y={uid:n.uid,email:n.email,emailVerified:!1},s=n,L=!0,await Pe(),L=!1,P=!0;return}}if(e){y=e,L=!0,await Ne(),L=!1,P=!0;try{await Ie()&&console.log("✅ Push notifications initialized successfully")}catch(n){console.error("Error initializing push notifications:",n)}}else console.log("🔄 Redirecting to login - no user"),setTimeout(()=>{window.location.href="/login.html"},1e3)}catch(t){b.error("Auth/init error:",t),i("Error cargando el perfil","error"),L=!1}finally{const t=document.getElementById("loadingOverlay");t&&t.classList.add("hidden")}});async function Pe(){if(L||P){console.log("🛑 Preventing duplicate demo profile load");return}try{console.log("🎯 Loading demo user profile...");const e=ae();if(!e){console.error("No demo user found");return}const t=document.getElementById("userName"),o=document.getElementById("userEmail"),n=document.getElementById("photoInitial");if(t&&(t.textContent=e.displayName||"Usuario Demo"),o&&(o.textContent=e.email),n){const f=(e.displayName||e.email||"D").charAt(0).toUpperCase();n.textContent=f}const a=document.getElementById("alias"),r=document.getElementById("bio");a&&(a.value=e.displayName||"Usuario Demo"),r&&(r.value="Usuario en modo demo - funcionalidad limitada");const m=document.getElementById("firstName"),c=document.getElementById("lastName"),g=document.getElementById("email");m&&(m.value=e.displayName?.split(" ")[0]||""),c&&(c.value=e.displayName?.split(" ")[1]||""),g&&(g.value=e.email);const p=document.getElementById("reputation"),l=document.getElementById("reputationBadge"),E=document.getElementById("reputationText");p&&(p.textContent="BRONCE"),l&&(l.className="reputation-badge reputation-bronce"),E&&(E.textContent="Bronce");const d=document.querySelector('button[onclick="saveProfile()"]');d&&(d.disabled=!0,d.innerHTML='<i class="fas fa-lock mr-2"></i>Guardar Perfil (Deshabilitado en Demo)',d.classList.add("opacity-50","cursor-not-allowed")),console.log("✅ Demo user profile loaded successfully")}catch(e){console.error("Error loading demo profile:",e),i("Error al cargar perfil demo","error")}}async function Ne(){if(L||P){console.log("🛑 Preventing duplicate user profile load");return}try{console.log("📋 Loading user profile for:",y.uid);const e=await oe(z(C,"users",y.uid));if(e.exists()){s={id:e.id,...e.data()},console.log("✅ User data loaded:",s.alias);const t=document.getElementById("userName"),o=document.getElementById("userEmail");t&&(t.textContent=s.alias||"Usuario"),o&&(o.textContent=y.email);const n=document.getElementById("profilePhoto"),a=document.getElementById("photoPlaceholder"),r=document.getElementById("photoInitial");if(s.photoURL)n&&(n.src=s.photoURL,n.classList.remove("hidden")),a&&a.classList.add("hidden");else if(r){const k=(s.alias||y.email||"U").charAt(0).toUpperCase();r.textContent=k}const m=document.getElementById("alias"),c=document.getElementById("birthDate"),g=document.getElementById("gender"),p=document.getElementById("city"),l=document.getElementById("profession"),E=document.getElementById("bio");m&&(m.value=s.alias||""),c&&(c.value=s.birthDate||""),g&&(g.value=s.gender||""),p&&(p.value=s.city||""),l&&(l.value=s.profession||""),E&&(E.value=s.bio||""),s.latitude&&s.longitude&&(v=s.latitude,I=s.longitude,document.getElementById("latitude").value=v,document.getElementById("longitude").value=I,le(v,I)),s.galleryPhotos&&Array.isArray(s.galleryPhotos)&&s.galleryPhotos.forEach((k,u)=>{if(k&&u<5){const h=document.getElementById(`galleryImage${u+1}`),w=document.getElementById(`galleryPreview${u+1}`),S=document.getElementById(`galleryRemove${u+1}`);h&&w&&S&&(h.src=k,h.classList.remove("hidden"),w.classList.add("hidden"),S.classList.remove("hidden"))}});const d=document.getElementById("relationshipStatus"),f=document.getElementById("lookingFor"),x=document.getElementById("ageRangeMin"),B=document.getElementById("ageRangeMax");d&&(d.value=s.relationshipStatus||""),f&&(f.value=s.lookingFor||""),x&&(x.value=s.ageRangeMin||18),B&&(B.value=s.ageRangeMax||99),q=fe(s),ce(),de(),console.log("✅ Profile loaded successfully")}else console.log("⚠️ No user document found, creating default profile"),s={alias:y.email.split("@")[0],email:y.email,createdAt:new Date,updatedAt:new Date}}catch(e){b.error("Error loading profile:",e),i("Error al cargar el perfil","error")}}function ce(){const e=document.getElementById("themeSelector");e.innerHTML="",Object.keys(X).forEach(t=>{const o=X[t],n=t===q,a=document.createElement("button");a.type="button",a.className=`relative p-4 rounded-xl border-2 transition-all ${n?"border-white shadow-lg scale-105":"border-white/20 hover:border-white/50"}`,a.style.background=o.gradient,a.onclick=()=>Ae(t);const r=sanitizer.text(o.icon||""),m=sanitizer.text(o.name||"");a.innerHTML=`
          <div class="text-center">
            <div class="text-3xl mb-2">${r}</div>
            <div class="font-semibold text-white text-sm">${m}</div>
          </div>
          ${n?'<div class="absolute top-2 right-2"><i class="fas fa-check-circle text-white text-xl"></i></div>':""}
        `,e.appendChild(a)})}function Ae(e){q=e,he(e),ce(),i("Tema aplicado. Guarda los cambios para conservarlo.","info")}document.getElementById("bio").addEventListener("input",de);function de(){const t=document.getElementById("bio").value.length;document.getElementById("bioCharCount").textContent=t;const o=document.getElementById("bioMinWarning"),n=document.getElementById("bioMinSuccess");t<100&&t>0?(o.classList.remove("hidden"),n.classList.add("hidden")):t>=100?(o.classList.add("hidden"),n.classList.remove("hidden")):(o.classList.add("hidden"),n.classList.add("hidden"))}document.getElementById("photoInput").addEventListener("change",async e=>{const t=e.target.files[0];if(t)try{const o=await re.validateImage(t);if(ie(o,i),!o.isValid){e.target.value="";return}$=t;const n=new FileReader;n.onload=a=>{document.getElementById("profilePhoto").src=a.target.result,document.getElementById("profilePhoto").classList.remove("hidden"),document.getElementById("photoPlaceholder").classList.add("hidden")},n.readAsDataURL(t),i("Foto seleccionada. Guarda los cambios para actualizar.","info"),b.debug("Profile photo validated",{fileName:o.metadata.fileName,size:o.metadata.sizeMB+"MB",dimensions:`${o.metadata.width}x${o.metadata.height}`})}catch(o){b.error("Photo validation error",o),i("Error al validar la imagen","error"),e.target.value=""}});for(let e=1;e<=5;e++){const t=document.getElementById(`galleryPreview${e}`),o=document.getElementById(`galleryInput${e}`),n=document.getElementById(`galleryImage${e}`),a=document.getElementById(`galleryRemove${e}`);t.addEventListener("click",()=>{o.click()}),o.addEventListener("change",async r=>{const m=r.target.files[0];if(m)try{const c=await re.validateImage(m);if(ie(c,i),!c.isValid){r.target.value="";return}D[e-1]=m;const g=new FileReader;g.onload=p=>{n.src=p.target.result,n.classList.remove("hidden"),t.classList.add("hidden"),a.classList.remove("opacity-0","pointer-events-none")},g.readAsDataURL(m),i(`Foto ${e} seleccionada`,"info"),b.debug(`Gallery photo ${e} validated`,{fileName:c.metadata.fileName,size:c.metadata.sizeMB+"MB",dimensions:`${c.metadata.width}x${c.metadata.height}`})}catch(c){b.error("Gallery photo validation error",c),i("Error al validar la imagen","error"),r.target.value=""}}),a.addEventListener("click",r=>{r.stopPropagation(),D[e-1]=null,o.value="",n.classList.add("hidden"),n.src="",t.classList.remove("hidden"),a.classList.add("opacity-0","pointer-events-none"),i(`Foto ${e} eliminada`,"info")})}window.saveProfile=async function(){const e=document.getElementById("saveButton"),t=e.innerHTML,o=document.getElementById("alias").value.trim(),n=document.getElementById("gender").value,a=document.getElementById("birthDate").value,r=document.getElementById("city").value.trim(),m=document.getElementById("profession").value.trim(),c=document.getElementById("bio").value.trim(),g=document.getElementById("relationshipStatus").value,p=document.getElementById("lookingFor").value;if(!o){i("El nombre de usuario (Alias) es obligatorio","warning");return}(!a||!n||!r||!m||!g||!p)&&i("Perfil incompleto: Se recomienda completar todos los campos","info"),c.length>0&&c.length<10&&i("La descripción es muy corta, se recomienda explayarse más.","info");const l=D.filter(d=>d!==null).length,E=s&&s.galleryPhotos?s.galleryPhotos.filter(d=>d).length:0;if(l+E===0&&i("Tip: Sube fotos a tu galería para tener más matches","info"),a){const d=new Date(a),f=new Date;let x=f.getFullYear()-d.getFullYear();const B=f.getMonth()-d.getMonth();if((B<0||B===0&&f.getDate()<d.getDate())&&x--,x<18){i("Debes ser mayor de 18 años para usar TuCitaSegura","error");return}}e.disabled=!0,e.innerHTML='<i class="fas fa-spinner fa-spin mr-2"></i>Guardando...';try{if(y){const u=await y.getIdToken(!0);O.setToken(u);try{const w=u.split(".")[1].replace(/-/g,"+").replace(/_/g,"/"),S=decodeURIComponent(window.atob(w).split("").map(function(me){return"%"+("00"+me.charCodeAt(0).toString(16)).slice(-2)}).join("")),M=JSON.parse(S);console.log("🔍 DEBUG JWT:",{aud:M.aud,iss:M.iss,sub:M.sub,exp:new Date(M.exp*1e3).toISOString(),project_match:M.aud==="tucitasegura-129cc"?"YES":"NO"}),M.aud!=="tucitasegura-129cc"&&i(`⚠️ Token Project Mismatch: ${M.aud}`,"error")}catch(h){console.error("Error decoding token:",h)}}let d=s&&s.photoURL?s.photoURL:null;if($)try{i("⏳ Subiendo foto de perfil...","info");const u=await O.uploadProfilePhoto($,"avatar");if(u.success){const h=u.verification?.status,w=u.verification?.warnings||[];if(h==="REJECT"||h==="CONTENT_VIOLATION"){i(`❌ Foto rechazada: ${w[0]||"Contenido no permitido"}`,"error"),e.disabled=!1,e.innerHTML=t;return}else h==="FILTER_WARNING"||h==="REVIEW_REQUIRED"?(i(`⚠️ Advertencia: ${w[0]||"Revisión requerida"}`,"warning"),d=u.url):(i("✅ Foto subida y verificada","success"),d=u.url)}}catch(u){console.error("Avatar upload failed:",u),u.message&&u.message.includes("Backend")?i("⚠️ Error conectando con el servidor. Usando imagen local.","warning"):i("❌ Error al subir avatar: "+(u.message||"Error desconocido"),"error"),d||(d=`https://picsum.photos/seed/${y.uid}/600/600`)}d||(d=`https://picsum.photos/seed/${y.uid}/600/600`);const f=s&&s.galleryPhotos?[...s.galleryPhotos]:[];for(let u=0;u<5;u++)if(D[u])try{i(`⏳ Subiendo foto ${u+1}...`,"info");const h=await O.uploadProfilePhoto(D[u],`gallery_${u+1}`);if(h.success){const w=h.verification?.status,S=h.verification?.warnings||[];if(w==="REJECT"||w==="CONTENT_VIOLATION"){i(`❌ Foto ${u+1} rechazada: ${S[0]||"Inapropiada"}`,"error");continue}else f[u]=h.url}}catch(h){console.error(`Gallery ${u+1} upload failed:`,h)}const x=document.getElementById("latitude").value,B=document.getElementById("longitude").value,k=z(C,"users",y.uid);await H(k,{alias:o,birthDate:a,gender:n,city:r,latitude:x?parseFloat(x):null,longitude:B?parseFloat(B):null,profession:m,bio:c,relationshipStatus:g,lookingFor:p,ageRangeMin:parseInt(document.getElementById("ageRangeMin").value)||18,ageRangeMax:parseInt(document.getElementById("ageRangeMax").value)||99,photoURL:d,galleryPhotos:f,theme:s?.theme||"light",updatedAt:ne()}),b.info("Profile updated successfully"),document.getElementById("successModal").classList.remove("opacity-0","pointer-events-none"),$=null}catch(d){b.error("Error saving profile:",d),i("Error al guardar los cambios: "+d.message,"error")}finally{e.disabled=!1,e.innerHTML=t}};window.closeSuccessModal=function(){if(document.getElementById("successModal").classList.add("opacity-0","pointer-events-none"),s){const e=document.getElementById("alias");e&&s.alias&&(e.value=s.alias)}};window.goToSearch=function(){document.getElementById("successModal").classList.add("opacity-0","pointer-events-none"),window.location.href="/buscar-usuarios.html"};window.confirmDeleteAccount=function(){confirm(`¿Estás COMPLETAMENTE SEGURO de que quieres eliminar tu cuenta?

Esta acción NO se puede deshacer.

Perderás:
- Todas tus conversaciones
- Todas tus citas
- Tu perfil completo
- Acceso a la plataforma

Escribe "ELIMINAR" para confirmar.`)&&(prompt('Escribe "ELIMINAR" (en mayúsculas) para confirmar:')==="ELIMINAR"?Ue():i("Cancelado. Tu cuenta no fue eliminada.","info"))};async function Ue(){try{i("Eliminando cuenta...","info");const e=z(C,"users",y.uid);await H(e,{deleted:!0,deletedAt:ne(),active:!1});try{const t=J(Y,`profile_photos/${s.gender}/${y.uid}/avatar`);await K(t);for(let o=1;o<=5;o++)try{const n=J(Y,`profile_photos/${s.gender}/${y.uid}/gallery_${o}`);await K(n)}catch{console.log(`Gallery photo ${o} not found or already deleted`)}}catch(t){console.log("Some photos could not be deleted:",t)}await pe(A),i("Cuenta eliminada exitosamente","success"),setTimeout(()=>{window.location.href="/login.html"},2e3)}catch(e){b.error("Error deleting account:",e),i("Error al eliminar la cuenta: "+e.message,"error")}}
