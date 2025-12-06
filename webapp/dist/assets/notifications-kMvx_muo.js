import{getToken as f,getMessaging as u,onMessage as g}from"https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js";import{doc as m,getDoc as p,updateDoc as x,setDoc as v}from"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";import{a as h,V as b,d as w}from"./firebase-config-env-BtJ4KElt.js";import{s as n}from"./utils-B649B8Z6.js";let s=null,c=null;async function P(){try{if(!("Notification"in window))return console.warn("This browser does not support notifications"),!1;if(!("serviceWorker"in navigator))return console.warn("This browser does not support service workers"),!1;await y(),s=u();const e=await l();return e&&(await d(),A()),e}catch(e){return console.error("Error initializing notifications:",e),!1}}async function y(){try{const e=await navigator.serviceWorker.register("/firebase-messaging-sw.js");return console.log("Service Worker registered:",e),e}catch(e){throw console.error("Service Worker registration failed:",e),e}}async function l(){try{const e=await Notification.requestPermission();return e==="granted"?(console.log("Notification permission granted"),!0):e==="denied"?(console.warn("Notification permission denied"),n("Has bloqueado las notificaciones. Actívalas en la configuración del navegador.","warning"),!1):(console.log("Notification permission dismissed"),!1)}catch(e){return console.error("Error requesting notification permission:",e),!1}}async function d(){try{if(!s)throw new Error("Messaging not initialized");const e=h.currentUser;if(!e)return console.warn("No user logged in"),null;const t=await f(s,{vapidKey:b});return t?(console.log("FCM Token obtained:",t.substring(0,20)+"..."),c=t,await k(e.uid,t),t):(console.warn("No FCM token available"),null)}catch(e){return console.error("Error getting FCM token:",e),e.code==="messaging/permission-blocked"&&n("Las notificaciones están bloqueadas. Actívalas en la configuración del navegador.","warning"),null}}async function k(e,t){try{const i=m(w,"users",e),a=await p(i);if(a.exists()){const r=a.data().fcmTokens||[];r.includes(t)||(await x(i,{fcmTokens:[...r,t],lastTokenUpdate:new Date}),console.log("FCM token saved to Firestore"))}else await v(i,{fcmTokens:[t],lastTokenUpdate:new Date},{merge:!0})}catch(i){console.error("Error saving FCM token to Firestore:",i)}}function A(){s&&g(s,e=>{console.log("Foreground message received:",e);const{notification:t,data:i}=e;N(t,i),F(i)})}function N(e,t){const i=e?.title||t?.title||"Nueva notificación",a=e?.body||t?.body||"",o=document.createElement("div");o.className="fixed top-4 right-4 z-50 animate-slideIn",o.innerHTML=`
    <div class="glass rounded-xl p-4 shadow-xl max-w-sm">
      <div class="flex items-start gap-3">
        <div class="flex-shrink-0">
          ${T(t?.type)}
        </div>
        <div class="flex-1">
          <h3 class="font-bold text-white mb-1">${i}</h3>
          <p class="text-sm text-gray-300">${a}</p>
        </div>
        <button onclick="this.closest('.fixed').remove()"
                class="flex-shrink-0 text-gray-400 hover:text-white">
          <i class="fas fa-times"></i>
        </button>
      </div>
      ${C(t)}
    </div>
  `,document.body.appendChild(o),setTimeout(()=>{o.classList.add("animate-fadeOut"),setTimeout(()=>o.remove(),300)},8e3),I()}function T(e){const t={match:'<i class="fas fa-heart text-pink-500 text-2xl"></i>',message:'<i class="fas fa-comment text-blue-500 text-2xl"></i>',appointment:'<i class="fas fa-calendar text-purple-500 text-2xl"></i>',reminder:'<i class="fas fa-bell text-yellow-500 text-2xl"></i>',vip_event:'<i class="fas fa-star text-gold-500 text-2xl"></i>',default:'<i class="fas fa-bell text-white text-2xl"></i>'};return t[e]||t.default}function C(e){if(!e)return"";let t="";switch(e.type){case"match":t=`
        <div class="mt-3 flex gap-2">
          <button onclick="window.location.href='/perfil-usuario.html?uid=${e.senderId}'"
                  class="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-sm">
            Ver perfil
          </button>
        </div>
      `;break;case"message":t=`
        <div class="mt-3 flex gap-2">
          <button onclick="window.location.href='/chat.html?conversationId=${e.conversationId}'"
                  class="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-sm">
            Responder
          </button>
        </div>
      `;break;case"appointment":t=`
        <div class="mt-3 flex gap-2">
          <button onclick="window.location.href='/cita-detalle.html?appointmentId=${e.appointmentId}'"
                  class="flex-1 bg-purple-500 hover:bg-purple-600 text-white px-3 py-2 rounded-lg text-sm">
            Ver cita
          </button>
        </div>
      `;break;case"vip_event":t=`
        <div class="mt-3 flex gap-2">
          <button onclick="window.location.href='/eventos-vip.html'"
                  class="flex-1 bg-gold-500 hover:bg-gold-600 text-white px-3 py-2 rounded-lg text-sm">
            Ver evento
          </button>
        </div>
      `;break}return t}function F(e){if(e)switch(e.type){case"message":M();break;case"match":E();break}}async function M(){try{const e=document.querySelector("#unread-badge");if(e){const t=parseInt(e.textContent)||0;e.textContent=t+1,e.classList.remove("hidden")}}catch(e){console.error("Error updating unread count:",e)}}async function E(){try{const e=document.querySelector("#match-badge");if(e){const t=parseInt(e.textContent)||0;e.textContent=t+1,e.classList.remove("hidden")}}catch(e){console.error("Error updating match count:",e)}}function I(){try{const e=new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSl+zPDTgjMGHm7A7+OZRQ0PUZD");e.volume=.3,e.play().catch(t=>console.log("Could not play notification sound:",t))}catch(e){console.error("Error playing notification sound:",e)}}function j(){return c}function U(){return Notification.permission==="granted"}function D(){if(Notification.permission==="default"){n("Activa las notificaciones para recibir alertas en tiempo real","info");const e=document.createElement("div");e.className="fixed inset-0 bg-black/50 flex items-center justify-center z-50",e.innerHTML=`
      <div class="glass rounded-2xl p-8 max-w-md mx-4 animate-scaleIn">
        <div class="text-center mb-6">
          <div class="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <i class="fas fa-bell text-4xl text-blue-500"></i>
          </div>
          <h2 class="text-2xl font-bold text-white mb-2">Activa las Notificaciones</h2>
          <p class="text-gray-300">
            Recibe alertas instantáneas cuando tengas nuevos matches, mensajes o citas confirmadas.
          </p>
        </div>

        <div class="space-y-3 mb-6">
          <div class="flex items-start gap-3 text-sm text-gray-300">
            <i class="fas fa-check text-green-500 mt-1"></i>
            <span>Nuevas solicitudes de match</span>
          </div>
          <div class="flex items-start gap-3 text-sm text-gray-300">
            <i class="fas fa-check text-green-500 mt-1"></i>
            <span>Mensajes en tiempo real</span>
          </div>
          <div class="flex items-start gap-3 text-sm text-gray-300">
            <i class="fas fa-check text-green-500 mt-1"></i>
            <span>Recordatorios de citas</span>
          </div>
        </div>

        <div class="flex gap-3">
          <button onclick="this.closest('.fixed').remove()"
                  class="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-3 rounded-xl">
            Ahora no
          </button>
          <button onclick="activateNotifications(this)"
                  class="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-xl">
            Activar
          </button>
        </div>
      </div>
    `,window.activateNotifications=async t=>{t.disabled=!0,t.innerHTML='<i class="fas fa-spinner fa-spin"></i> Activando...',await l()?(await d(),n("¡Notificaciones activadas correctamente!","success"),e.remove()):(t.disabled=!1,t.textContent="Activar",n("No se pudieron activar las notificaciones","error"))},document.body.appendChild(e)}else Notification.permission==="denied"&&n("Las notificaciones están bloqueadas. Actívalas en la configuración del navegador.","warning")}window.showNotificationSettingsPrompt=D;export{U as a,j as g,P as i,l as r,D as s};
