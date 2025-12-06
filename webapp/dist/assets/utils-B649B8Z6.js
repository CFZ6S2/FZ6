function m(a,c="info"){const i=document.getElementById("toast-notification");i&&i.remove();const t=document.createElement("div");t.id="toast-notification",t.className="fixed top-24 right-4 z-[60] animate-slide-in";let n,e;switch(c){case"success":n="bg-green-500",e="fa-check-circle";break;case"error":n="bg-red-500",e="fa-exclamation-circle";break;case"warning":n="bg-yellow-500",e="fa-exclamation-triangle";break;default:n="bg-blue-500",e="fa-info-circle"}t.innerHTML=`
    <div class="${n} text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 min-w-[300px]">
      <i class="fas ${e} text-xl"></i>
      <span class="font-semibold">${a}</span>
      <button onclick="this.parentElement.parentElement.remove()" class="ml-4 hover:opacity-75 transition">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `;const s=document.createElement("style");s.textContent=`
    @keyframes slide-in {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    .animate-slide-in {
      animation: slide-in 0.3s ease-out;
    }
  `,document.getElementById("toast-styles")||(s.id="toast-styles",document.head.appendChild(s)),document.body.appendChild(t),setTimeout(()=>{t&&t.parentElement&&(t.style.animation="slide-in 0.3s ease-out reverse",setTimeout(()=>t.remove(),300))},5e3)}function f(a,c,i,t){const e=o(i-a),s=o(t-c),l=Math.sin(e/2)*Math.sin(e/2)+Math.cos(o(a))*Math.cos(o(i))*Math.sin(s/2)*Math.sin(s/2);return 6371*(2*Math.atan2(Math.sqrt(l),Math.sqrt(1-l)))}function o(a){return a*(Math.PI/180)}export{f as c,m as s};
