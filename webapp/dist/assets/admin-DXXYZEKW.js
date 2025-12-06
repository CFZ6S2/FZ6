import{a as p,d as x}from"./firebase-config-env-BtJ4KElt.js";import{onAuthStateChanged as y,signOut as b}from"https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";import{getDocs as h,collection as v,deleteDoc as w,doc as E}from"https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";import"https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";import"https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";import"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";import"https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js";import"https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";let l=[],r=[],i=0;const g=20;y(p,async s=>{if(!s){window.location.href="/admin-login.html";return}console.log("🔄 Forcing token refresh to get latest custom claims...");const e=await s.getIdTokenResult(!0);if(console.log("📋 Custom claims:",e.claims),console.log("👤 Role:",e.claims.role),e.claims.role!=="admin"){console.error("❌ Access denied: role =",e.claims.role),alert(`Acceso denegado: Se requieren permisos de administrador

Role actual: `+(e.claims.role||"undefined")),await b(p),window.location.href="/admin-login.html";return}console.log("✅ Admin access granted"),document.getElementById("adminName").textContent=s.email,B()});async function B(){try{const s=await h(v(x,"users"));l=[],s.forEach(o=>{const d=o.data();l.push({id:o.id,...d,balance:d.balance||0})});const e=l.length,a=l.reduce((o,d)=>o+(d.balance||0),0),n=new Date;n.setHours(0,0,0,0);const t=l.filter(o=>o.lastActivity?(o.lastActivity.toDate?o.lastActivity.toDate():new Date(o.lastActivity))>=n:!1).length,m=l.filter(o=>o.hasActiveSubscription).length;document.getElementById("totalUsers").textContent=e,document.getElementById("totalMoney").textContent=a.toFixed(2)+"€",document.getElementById("activeUsers").textContent=t,document.getElementById("premiumUsers").textContent=m,c(),document.getElementById("loadingState").classList.add("hidden"),document.getElementById("mainContent").classList.remove("hidden")}catch(s){console.error("Error loading data:",s),alert("Error al cargar los datos: "+s.message)}}function c(){const s=document.getElementById("searchInput").value.toLowerCase(),e=document.getElementById("roleFilter").value,a=document.getElementById("genderFilter").value;r=l.filter(n=>{const t=!s||(n.email||"").toLowerCase().includes(s)||(n.alias||"").toLowerCase().includes(s)||(n.displayName||"").toLowerCase().includes(s),m=!e||n.userRole===e,o=!a||n.gender===a;return t&&m&&o}),i=0,u()}function u(){const s=document.getElementById("usersTableBody"),e=i*g,a=e+g,n=r.slice(e,a);s.innerHTML=n.map(t=>`
        <tr class="hover:bg-white/5 transition-colors">
          <td class="px-6 py-4">
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                ${(t.alias||t.email||"U")[0].toUpperCase()}
              </div>
              <div>
                <p class="font-semibold">${t.alias||t.displayName||"Sin nombre"}</p>
                <p class="text-xs text-gray-400">${t.uid}</p>
              </div>
            </div>
          </td>
          <td class="px-6 py-4 text-sm text-gray-300">${t.email||"Sin email"}</td>
          <td class="px-6 py-4">
            <span class="px-3 py-1 rounded-full text-xs font-semibold ${$(t.userRole)}">
              ${f(t.userRole)}
            </span>
          </td>
          <td class="px-6 py-4">
            <span class="px-3 py-1 rounded-full text-xs font-semibold ${C(t.gender)}">
              ${t.gender==="masculino"?"♂ Masculino":t.gender==="femenino"?"♀ Femenino":"No especificado"}
            </span>
          </td>
          <td class="px-6 py-4">
            <span class="text-green-400 font-bold">${(t.balance||0).toFixed(2)}€</span>
          </td>
          <td class="px-6 py-4">
            ${t.hasActiveSubscription?'<span class="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-500/20 text-yellow-400"><i class="fas fa-crown mr-1"></i>Premium</span>':'<span class="px-3 py-1 rounded-full text-xs font-semibold bg-gray-500/20 text-gray-400">Free</span>'}
          </td>
          <td class="px-6 py-4">
            <div class="flex gap-2">
              <button
                onclick="viewUser('${t.id}')"
                class="px-4 py-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 transition-colors text-sm"
              >
                <i class="fas fa-eye mr-2"></i>Ver
              </button>
              <button
                onclick="deleteUser('${t.id}', '${t.email?.replace(/'/g,"\\'")}', '${t.userRole}')"
                class="px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 transition-colors text-sm ${t.userRole==="admin"?"opacity-50 cursor-not-allowed":""}"
                ${t.userRole==="admin"?"disabled":""}
              >
                <i class="fas fa-trash mr-2"></i>Borrar
              </button>
            </div>
          </td>
        </tr>
      `).join(""),document.getElementById("showingCount").textContent=Math.min(a,r.length),document.getElementById("totalCount").textContent=r.length,document.getElementById("prevBtn").disabled=i===0,document.getElementById("nextBtn").disabled=a>=r.length}function $(s){switch(s){case"admin":return"bg-red-500/20 text-red-400";case"concierge":return"bg-blue-500/20 text-blue-400";default:return"bg-gray-500/20 text-gray-400"}}function f(s){switch(s){case"admin":return"Admin";case"concierge":return"Concierge";default:return"Regular"}}function C(s){return s==="masculino"?"bg-blue-500/20 text-blue-400":"bg-pink-500/20 text-pink-400"}window.viewUser=async s=>{const e=l.find(n=>n.id===s);if(!e)return;const a=document.getElementById("userModalContent");a.innerHTML=`
        <div class="space-y-6">
          <!-- Avatar and Basic Info -->
          <div class="text-center pb-6 border-b border-white/10">
            <div class="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-4xl font-bold mx-auto mb-4">
              ${(e.alias||e.email||"U")[0].toUpperCase()}
            </div>
            <h3 class="text-2xl font-bold mb-1">${e.alias||e.displayName||"Sin nombre"}</h3>
            <p class="text-gray-400">${e.email||"Sin email"}</p>
          </div>

          <!-- Details Grid -->
          <div class="grid grid-cols-2 gap-4">
            <div class="bg-white/5 rounded-lg p-4">
              <p class="text-xs text-gray-400 mb-1">Rol</p>
              <p class="font-semibold">${f(e.userRole)}</p>
            </div>
            <div class="bg-white/5 rounded-lg p-4">
              <p class="text-xs text-gray-400 mb-1">Género</p>
              <p class="font-semibold">${e.gender==="masculino"?"Masculino":e.gender==="femenino"?"Femenino":"No especificado"}</p>
            </div>
            <div class="bg-white/5 rounded-lg p-4">
              <p class="text-xs text-gray-400 mb-1">Monedero</p>
              <p class="font-semibold text-green-400">${(e.balance||0).toFixed(2)}€</p>
            </div>
            <div class="bg-white/5 rounded-lg p-4">
              <p class="text-xs text-gray-400 mb-1">Suscripción</p>
              <p class="font-semibold">${e.hasActiveSubscription?"✓ Premium":"✗ Free"}</p>
            </div>
            <div class="bg-white/5 rounded-lg p-4">
              <p class="text-xs text-gray-400 mb-1">Edad</p>
              <p class="font-semibold">${e.age||"No especificada"}</p>
            </div>
            <div class="bg-white/5 rounded-lg p-4">
              <p class="text-xs text-gray-400 mb-1">Ubicación</p>
              <p class="font-semibold">${e.city||"No especificada"}</p>
            </div>
          </div>

          <!-- Full Details -->
          <div class="bg-white/5 rounded-lg p-4">
            <p class="text-xs text-gray-400 mb-2">UID</p>
            <code class="text-xs bg-black/30 px-2 py-1 rounded">${e.uid}</code>
          </div>

          ${e.bio?`
          <div class="bg-white/5 rounded-lg p-4">
            <p class="text-xs text-gray-400 mb-2">Biografía</p>
            <p class="text-sm">${e.bio}</p>
          </div>
          `:""}

          <!-- Actions -->
          <div class="pt-4 border-t border-white/10 flex space-x-3">
            <button
              onclick="closeUserModal()"
              class="flex-1 px-6 py-3 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      `,document.getElementById("userModal").classList.remove("hidden")};window.closeUserModal=()=>{document.getElementById("userModal").classList.add("hidden")};window.deleteUser=async(s,e,a)=>{if(a==="admin"){alert("⚠️ No se pueden borrar cuentas de administrador");return}if(confirm(`⚠️ ¿Estás seguro de que quieres borrar este usuario?

Email: ${e}

Esta acción NO se puede deshacer.`))try{console.log("🗑️ Deleting user:",s,e),await w(E(x,"users",s)),console.log("✅ User deleted from Firestore"),l=l.filter(t=>t.id!==s),c(),alert("✅ Usuario borrado exitosamente")}catch(t){console.error("❌ Error deleting user:",t),alert("❌ Error al borrar usuario: "+t.message)}};window.logout=async()=>{confirm("¿Seguro que quieres cerrar sesión?")&&(await b(p),window.location.href="/admin-login.html")};window.previousPage=()=>{i>0&&(i--,u())};window.nextPage=()=>{(i+1)*g<r.length&&(i++,u())};document.getElementById("searchInput").addEventListener("input",c);document.getElementById("roleFilter").addEventListener("change",c);document.getElementById("genderFilter").addEventListener("change",c);
