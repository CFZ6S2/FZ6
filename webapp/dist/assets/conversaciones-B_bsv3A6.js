import{a as T,d as m}from"./firebase-config-env-BtJ4KElt.js";/* empty css               */import"./error-fixes-B-QQl9aC.js";import"./firebase-appcheck-B5Dlx5A0.js";import{onAuthStateChanged as O}from"https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";import{getDoc as k,doc as w,query as z,collection as H,where as P,orderBy as N,onSnapshot as j,updateDoc as S,arrayUnion as E}from"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";import{c as q,s as l}from"./utils-B649B8Z6.js";import{l as R}from"./theme-BOByySXs.js";import{i as F}from"./notifications-kMvx_muo.js";import"./image-optimizer-CfUQm69F.js";import"https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";import"https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js";import"https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";import"https://www.gstatic.com/firebasejs/10.12.2/firebase-app-check.js";import"./logger-CnI7WBtq.js";import"https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js";let a=null,o=null,x=[],c=null,p=null;O(T,async e=>{if(e){a=e,await V(),X();try{await F()&&console.log("✅ Push notifications initialized successfully")}catch(s){console.error("Error initializing push notifications:",s)}}else window.location.href="/login.html"});async function V(){try{const e=await k(w(m,"users",a.uid));if(e.exists()){o={id:e.id,...e.data()},R(o);const s=o.alias||a.email;document.getElementById("userAlias").textContent=s,s&&(document.getElementById("userAvatar").textContent=s.charAt(0).toUpperCase()),W()}}catch(e){console.error("Error loading user data:",e)}}function W(){o.gender==="masculino"&&!o.hasActiveSubscription&&document.getElementById("paymentWarning").classList.remove("hidden")}function X(){const e=z(H(m,"conversations"),P("participants","array-contains",a.uid),N("lastMessageTime","desc"));j(e,async s=>{x=[];const r=document.getElementById("loadingState"),i=document.getElementById("emptyState"),b=document.getElementById("conversationsList");if(s.empty){r.classList.add("hidden"),i.classList.remove("hidden"),b.innerHTML="";return}r.classList.add("hidden"),i.classList.add("hidden");for(const t of s.docs){const n={id:t.id,...t.data()};if(o.hiddenConversations?.includes(n.id))continue;const g=n.participants.find(v=>v!==a.uid),d=await k(w(m,"users",g));d.exists()&&(n.otherUser={id:d.id,...d.data()},o.location&&n.otherUser.location&&(n.distance=q(o.location.lat,o.location.lng,n.otherUser.location.lat,n.otherUser.location.lng)),x.push(n))}h()},s=>{console.error("Error loading conversations:",s),l("Error al cargar conversaciones","error")})}function h(){const e=document.getElementById("conversationsList"),s=document.getElementById("searchInput").value.toLowerCase(),r=document.getElementById("filterSelect").value;let i=x;if(s&&(i=i.filter(t=>t.otherUser.alias?.toLowerCase().includes(s)||t.lastMessage?.toLowerCase().includes(s))),r==="unread"?i=i.filter(t=>t.unreadCount>0):r==="online"&&(i=i.filter(t=>t.otherUser.isOnline)),i.length===0){e.innerHTML=`
          <div class="glass-strong rounded-2xl p-8 text-center">
            <i class="fas fa-search text-4xl text-white/50 mb-4"></i>
            <p class="text-lg text-slate-300">No se encontraron conversaciones</p>
          </div>
        `;return}const b=new Date;e.innerHTML=i.map(t=>{const n=t.otherUser,g=sanitizer.text(n.alias||"Usuario"),d=sanitizer.text(t.lastMessage||"Nueva conversación"),v=sanitizer.text(t.id||""),U=sanitizer.text(n.id||""),I=t.lastMessageSenderId!==a.uid&&t.unreadCount>0,A=n.isOnline;let u="Hace tiempo";if(t.lastMessageTime){const y=t.lastMessageTime.toDate(),f=b-y,C=Math.floor(f/6e4),L=Math.floor(f/36e5),D=Math.floor(f/864e5);C<1?u="Ahora":C<60?u=`Hace ${C}m`:L<24?u=`Hace ${L}h`:u=`Hace ${D}d`}let M="";if(n.gender==="masculino"&&n.reputation){const y={BRONCE:"from-orange-700 to-orange-900",PLATA:"from-gray-400 to-gray-600",ORO:"from-yellow-400 to-yellow-600",PLATINO:"from-cyan-400 to-blue-500"},f=sanitizer.text(n.reputation);M=`
            <span class="px-2 py-1 text-xs rounded-full bg-gradient-to-r ${y[n.reputation]} text-white font-bold">
              ${f}
            </span>
          `}let $="";n.gender==="femenino"&&n.availability&&($=`
            <span class="w-3 h-3 rounded-full ${{verde:"bg-green-500",amarillo:"bg-yellow-500",rojo:"bg-red-500"}[n.availability]} inline-block" title="Disponibilidad"></span>
          `);let B="";return t.distance!==void 0&&(B=`
            <span class="text-xs text-slate-400">
              <i class="fas fa-location-dot"></i> ${t.distance.toFixed(1)} km
            </span>
          `),`
          <div class="glass-strong rounded-xl p-4 conversation-item cursor-pointer"
               onclick="openChat('${v}', '${U}')"
               oncontextmenu="showContextMenu(event, '${v}', '${U}'); return false;">
            <div class="flex items-center gap-4">
              <!-- Avatar -->
              <div class="relative flex-shrink-0">
                <div class="w-14 h-14 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center font-bold text-xl">
                  ${g.charAt(0).toUpperCase()}
                </div>
                ${A?'<div class="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-slate-900 rounded-full"></div>':""}
              </div>

              <!-- Content -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between mb-1">
                  <div class="flex items-center gap-2">
                    <h3 class="font-bold text-lg truncate">${g}</h3>
                    ${n.emailVerified?'<i class="fas fa-circle-check text-blue-400 text-sm"></i>':""}
                    ${M}
                    ${$}
                  </div>
                  <span class="text-xs text-slate-400 flex-shrink-0">${u}</span>
                </div>
                <div class="flex items-center justify-between">
                  <p class="text-slate-300 text-sm truncate ${I?"font-semibold":""}">
                    ${t.lastMessageSenderId===a.uid?'<i class="fas fa-reply text-xs mr-1"></i>':""}
                    ${d}
                  </p>
                  ${B}
                </div>
              </div>

              <!-- Unread badge -->
              ${I?`
                <div class="flex-shrink-0">
                  <div class="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-xs font-bold unread-badge">
                    ${t.unreadCount>9?"9+":t.unreadCount}
                  </div>
                </div>
              `:""}
            </div>
          </div>
        `}).join("")}window.openChat=function(e,s){if(o.gender==="masculino"&&!o.hasActiveSubscription){l("⚠️ Membresía requerida para chatear","error"),confirm(`Necesitas una membresía activa (€29.99/mes) para acceder al chat.

¿Deseas activar tu membresía ahora?`)&&(window.location.href="/suscripcion.html");return}window.location.href=`/chat.html?conversationId=${e}&userId=${s}`};window.showContextMenu=function(e,s,r){e.preventDefault(),c=s,p=r;const i=document.getElementById("contextMenu");i.classList.remove("hidden"),i.style.left=e.pageX+"px",i.style.top=e.pageY+"px"};document.addEventListener("click",()=>{document.getElementById("contextMenu").classList.add("hidden")});window.hideConversation=async function(){try{const e=w(m,"users",a.uid);await S(e,{hiddenConversations:E(c)}),o.hiddenConversations=o.hiddenConversations||[],o.hiddenConversations.push(c),h(),l("Conversación ocultada","success")}catch(e){console.error("Error hiding conversation:",e),l("Error al ocultar conversación","error")}};window.reportUser=function(){p&&(window.location.href=`/reportes.html?type=user&userId=${p}`)};window.blockUser=function(){const e=x.find(s=>s.id===c);e&&(document.getElementById("blockUserName").textContent=e.otherUser.alias||"Este usuario",document.getElementById("blockModal").classList.remove("opacity-0","pointer-events-none"))};window.closeBlockModal=function(){document.getElementById("blockModal").classList.add("opacity-0","pointer-events-none")};window.confirmBlock=async function(){try{const e=w(m,"users",a.uid);await S(e,{blockedUsers:E(p),hiddenConversations:E(c)}),o.blockedUsers=o.blockedUsers||[],o.blockedUsers.push(p),o.hiddenConversations=o.hiddenConversations||[],o.hiddenConversations.push(c),closeBlockModal(),h(),l("Usuario bloqueado","success")}catch(e){console.error("Error blocking user:",e),l("Error al bloquear usuario","error")}};document.getElementById("searchInput").addEventListener("input",h);document.getElementById("filterSelect").addEventListener("change",h);
