import { auth, db, functions } from './firebase-config-env.js';
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, getDocs, query, orderBy, limit, doc, updateDoc, where } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

let currentUser = null;

// Is Admin Check
async function checkAdminAccess(user) {
    if (!user) return false;

    try {
        const idTokenResult = await user.getIdTokenResult(true); // create: true forces refresh
        console.log('🛡️ Claims:', idTokenResult.claims);
        // Emergency whitelist for owner
        const allowedEmails = ['cesar.herrera.rojo@gmail.com', 'admin@tucitasegura.com'];
        const allowedUids = ['Y1rNgj4KYpWSFlPqgrpAaGuAk033'];

        if (allowedEmails.includes(user.email) || allowedUids.includes(user.uid)) return true;

        return idTokenResult.claims.role === 'admin';
    } catch (e) {
        console.error('Error checking admin:', e);
        return false;
    }
}

// Format Date
const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    // Handle Firestore Timestamp or Date object
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('es-ES', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
};

// Logout
window.logout = async () => {
    await signOut(auth);
    window.location.href = '/login.html';
};

// Render Badge
const getRoleBadge = (role) => {
    if (role === 'admin') return '<span class="bg-red-500/20 text-red-400 px-2 py-1 rounded-full text-xs font-bold border border-red-500/30">Admin</span>';
    if (role === 'concierge') return '<span class="bg-purple-500/20 text-purple-400 px-2 py-1 rounded-full text-xs font-bold border border-purple-500/30">Concierge</span>';
    return '<span class="bg-slate-700 text-slate-300 px-2 py-1 rounded-full text-xs border border-slate-600">Usuario</span>';
};

// Render Status
const getStatusBadge = (user) => {
    if (user.disabled) return '<span class="text-red-400 flex items-center gap-1"><i class="fas fa-ban"></i> Baneado</span>';
    if (!user.emailVerified) return '<span class="text-orange-400 flex items-center gap-1"><i class="fas fa-exclamation-triangle"></i> No Verif.</span>';
    return '<span class="text-green-400 flex items-center gap-1"><i class="fas fa-check-circle"></i> Activo</span>';
};

// Load Users
window.loadUsers = async () => {
    const tableBody = document.getElementById('usersTableBody');
    tableBody.innerHTML = '<tr><td colspan="5" class="p-8 text-center"><i class="fas fa-circle-notch fa-spin text-2xl text-blue-500"></i></td></tr>';

    try {
        const usersRef = collection(db, 'users');
        // Simple query for now
        const q = query(usersRef, orderBy('createdAt', 'desc'), limit(50));
        const snapshot = await getDocs(q);

        const users = [];
        snapshot.forEach(doc => {
            users.push({ id: doc.id, ...doc.data() });
        });

        renderTable(users);
        updateStats(users);

    } catch (error) {
        console.error('Error loading users:', error);
        tableBody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-red-400">Error cargando usuarios: ${error.message}<br>¿Tienes permisos de admin?</td></tr>`;
    }
};

function renderTable(users) {
    const tableBody = document.getElementById('usersTableBody');
    const countEl = document.getElementById('totalUsers');
    const showingEl = document.getElementById('showingCount');

    if (countEl) countEl.textContent = users.length;
    if (showingEl) showingEl.textContent = users.length;

    if (users.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-slate-500">No se encontraron usuarios.</td></tr>';
        return;
    }

    tableBody.innerHTML = users.map(user => {
        const isVip = user.plan === 'manual_vip' || user.subscriptionStatus === 'active';
        const isVerified = user.phoneVerified;
        const lastLogin = formatRelativeTime(user.lastActivity || user.createdAt);

        return `
        <tr class="hover:bg-slate-800/50 transition group">
            <td class="p-3 sm:p-4">
                <div class="flex items-center gap-2 sm:gap-3">
                    <img src="${user.photoURL || 'https://ui-avatars.com/api/?name=' + user.alias + '&background=random'}" 
                         class="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover bg-slate-700">
                    <div class="min-w-0">
                        <div class="font-semibold text-white flex items-center gap-1 sm:gap-2 truncate text-sm sm:text-base">
                            ${user.alias || 'Sin Alias'}
                            ${isVip ? '<i class="fas fa-crown text-yellow-400 text-xs" title="VIP"></i>' : ''}
                        </div>
                        <div class="text-xs text-slate-400 truncate hidden sm:block">${user.email || 'No Email'}</div>
                    </div>
                </div>
            </td>
            <td class="p-3 sm:p-4 hidden md:table-cell">
                ${getRoleBadge(user.userRole || (user.email === 'admin@tucitasegura.com' ? 'admin' : 'regular'))}
            </td>
            <td class="p-3 sm:p-4">
                ${getStatusBadge(user)}
            </td>
            <td class="p-3 sm:p-4 text-slate-400 text-xs sm:text-sm hidden lg:table-cell">
                ${formatDate(user.createdAt)}
            </td>
            <td class="p-3 sm:p-4 text-slate-400 text-xs sm:text-sm">
                <div class="flex items-center gap-1">
                    <i class="fas fa-clock text-xs"></i>
                    <span>${lastLogin}</span>
                </div>
            </td>
            <td class="p-3 sm:p-4 text-right">
                <div class="opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity flex justify-end gap-1 sm:gap-2">
                    <!-- Verify Button -->
                    <button onclick="toggleVerification('${user.id}', ${!isVerified})" 
                        title="${isVerified ? 'Quitar Verificación' : 'Verificar Manualmente'}" 
                        class="w-7 h-7 sm:w-8 sm:h-8 rounded-lg ${isVerified ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400'} hover:scale-110 transition text-xs sm:text-sm">
                        <i class="fas fa-check"></i>
                    </button>

                    <!-- VIP Button -->
                    <button onclick="toggleVIP('${user.id}', ${!isVip})" 
                        title="${isVip ? 'Quitar VIP' : 'Dar VIP Manual'}" 
                        class="w-7 h-7 sm:w-8 sm:h-8 rounded-lg ${isVip ? 'bg-yellow-500/20 text-yellow-400' : 'bg-slate-700 text-slate-400'} hover:scale-110 transition text-xs sm:text-sm">
                        <i class="fas fa-crown"></i>
                    </button>
                    
                    <div class="w-px h-5 sm:h-6 bg-slate-700 mx-1 sm:mx-2 self-center"></div>

                    <button onclick="toggleBan('${user.id}', ${!user.disabled})" title="${user.disabled ? 'Desbloquear' : 'Banear'}" class="w-7 h-7 sm:w-8 sm:h-8 rounded-lg ${user.disabled ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'} hover:scale-110 transition text-xs sm:text-sm">
                        <i class="fas ${user.disabled ? 'fa-unlock' : 'fa-ban'}"></i>
                    </button>
                    <button onclick="deleteUser('${user.id}')" title="ELIMINAR PERMANENTEMENTE" class="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-red-600/20 text-red-500 hover:bg-red-600 hover:text-white hover:scale-110 transition text-xs sm:text-sm">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `}).join('');
}

// Helper function to format relative time
function formatRelativeTime(timestamp) {
    if (!timestamp) return 'Nunca';

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins}m`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;
    if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)}sem`;
    return `Hace ${Math.floor(diffDays / 30)}mes`;
}

function updateStats(users) {
    const males = users.filter(u => u.gender === 'masculino').length;
    const females = users.filter(u => u.gender === 'femenino').length;

    const ratioEl = document.getElementById('genderRatio');
    if (ratioEl) ratioEl.textContent = `${males} / ${females}`;
}

// Toggle Ban
window.toggleBan = async (userId, disable) => {
    const action = disable ? 'banear' : 'desbloquear';
    if (!confirm(`¿Estás seguro de ${action} a este usuario?`)) return;

    try {
        const toggleUserStatus = httpsCallable(functions, 'toggleUserStatus');
        await toggleUserStatus({ userId, disable }); // Pass as object
        alert(`Usuario ${disable ? 'baneado' : 'desbloqueado'} exitosamente.`);
        loadUsers(); // Reload table
    } catch (e) {
        console.error('Ban error:', e);
        alert('Error: ' + e.message);
    }
};

// Toggle Verification (Manual)
window.toggleVerification = async (userId, status) => {
    const action = status ? 'verificar' : 'desverificar';
    if (!confirm(`¿Confirmas ${action} manualmente a este usuario?`)) return;

    try {
        const adminToggleVerification = httpsCallable(functions, 'adminToggleVerification');
        await adminToggleVerification({ userId, status });
        alert(`Usuario ${status ? 'verificado' : 'desverificado'} exitosamente.`);
        loadUsers();
    } catch (e) {
        console.error('Verification error:', e);
        alert('Error: ' + e.message);
    }
};

// Toggle VIP (Manual)
window.toggleVIP = async (userId, status) => {
    const action = status ? 'DAR VIP (Gratis)' : 'QUITAR VIP';
    if (!confirm(`¿Confirmas ${action} a este usuario?`)) return;

    try {
        const adminManageMembership = httpsCallable(functions, 'adminManageMembership');
        await adminManageMembership({ userId, status });
        alert(`Membresía ${status ? 'activada' : 'revocada'} exitosamente.`);
        loadUsers();
    } catch (e) {
        console.error('VIP error:', e);
        alert('Error: ' + e.message);
    }
};

// Delete User (Hard Delete)
window.deleteUser = async (userId) => {
    if (!confirm('⚠️ ¡PELIGRO! ⚠️\n\n¿Estás seguro de ELIMINAR PERMANENTEMENTE a este usuario?\n\nEsta acción borrará:\n1. Su cuenta de autenticación.\n2. Su perfil y datos.\n3. NO SE PUEDE DESHACER.\n\n¿Continuar?')) return;

    const btn = document.querySelector(`button[onclick="deleteUser('${userId}')"]`);
    if (btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    try {
        const deleteUserComplete = httpsCallable(functions, 'deleteUserComplete');
        await deleteUserComplete({ targetUserId: userId });
        alert('✅ Usuario eliminado correctamente de Auth y Firestore.');
        loadUsers();
    } catch (e) {
        console.error('Delete error:', e);
        alert('Error: ' + e.message);
        if (btn) btn.innerHTML = '<i class="fas fa-trash"></i>';
    }
};


// View Switching
// View Switching
window.showView = (viewName) => {
    // Hide all views first
    document.getElementById('usersView').classList.add('hidden');
    document.getElementById('marketingView').classList.add('hidden');
    const statsView = document.getElementById('statsView');
    if (statsView) statsView.classList.add('hidden');

    // Show selected view
    if (viewName === 'users') {
        document.getElementById('usersView').classList.remove('hidden');
    } else if (viewName === 'marketing') {
        document.getElementById('marketingView').classList.remove('hidden');
    } else if (viewName === 'stats') {
        if (statsView) {
            statsView.classList.remove('hidden');
            loadDetailedStats();
        }
    }
};

// --- CHARTS & STATS LOGIC ---
let genderChartInstance = null;
let statusChartInstance = null;
let growthChartInstance = null;

async function loadDetailedStats() {
    console.log('📊 Loading detailed stats...');
    try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, orderBy('createdAt', 'desc'), limit(1000)); // Get last 1000 users for stats
        const snapshot = await getDocs(q);

        const users = [];
        snapshot.forEach(doc => users.push({ ...doc.data(), createdAt: doc.data().createdAt?.toDate() }));

        renderGenderChart(users);
        renderStatusChart(users);
        renderGrowthChart(users);

    } catch (e) {
        console.error('Error loading stats:', e);
        alert('Error cargando estadísticas: ' + e.message);
    }
}

function renderGenderChart(users) {
    const ctx = document.getElementById('genderChart');
    if (!ctx) return;

    const males = users.filter(u => u.gender === 'masculino').length;
    const females = users.filter(u => u.gender === 'femenino').length;

    if (genderChartInstance) genderChartInstance.destroy();

    genderChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Hombres', 'Mujeres'],
            datasets: [{
                data: [males, females],
                backgroundColor: ['#3b82f6', '#ec4899'],
                borderColor: ['#1e3a8a', '#831843'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom', labels: { color: '#cbd5e1' } }
            }
        }
    });
}

function renderStatusChart(users) {
    const ctx = document.getElementById('statusChart');
    if (!ctx) return;

    const active = users.filter(u => !u.disabled && u.emailVerified).length;
    const unverified = users.filter(u => !u.emailVerified).length;
    const banned = users.filter(u => u.disabled).length;

    if (statusChartInstance) statusChartInstance.destroy();

    statusChartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Activos', 'No Verificados', 'Baneados'],
            datasets: [{
                data: [active, unverified, banned],
                backgroundColor: ['#22c55e', '#f97316', '#ef4444'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom', labels: { color: '#cbd5e1' } }
            }
        }
    });
}

function renderGrowthChart(users) {
    const ctx = document.getElementById('growthChart');
    if (!ctx) return;

    // Group by month
    const months = {};
    const today = new Date();

    // Initialize last 6 months with 0
    for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const key = d.toLocaleString('default', { month: 'short' });
        months[key] = 0;
    }

    users.forEach(u => {
        if (!u.createdAt) return;
        // Check if within last 6 months
        const diffTime = Math.abs(today - u.createdAt);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 180) {
            const key = u.createdAt.toLocaleString('default', { month: 'short' });
            if (months[key] !== undefined) months[key]++;
        }
    });

    if (growthChartInstance) growthChartInstance.destroy();

    growthChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Object.keys(months),
            datasets: [{
                label: 'Nuevos Usuarios',
                data: Object.values(months),
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { grid: { color: '#334155' }, ticks: { color: '#94a3b8' } },
                x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

// Send Incomplete Registration Warning
window.sendIncompleteWarning = async () => {
    if (!confirm('⚠️ Esto enviará un correo de advertencia a TODOS los usuarios sin alias.\n\n¿Quieres hacer primero un DRY RUN para ver a quién se enviará?')) {
        return;
    }

    try {
        const sendIncompleteRegistrationWarning = httpsCallable(functions, 'sendIncompleteRegistrationWarning');

        // First, dry run
        const dryResult = await sendIncompleteRegistrationWarning({ dryRun: true });
        const data = dryResult.data;

        const recipientsList = data.recipients.join('\n');
        const confirmSend = confirm(`📊 DRY RUN COMPLETADO\n\nSe enviaría a ${data.recipientsCount} usuarios:\n\n${recipientsList}\n\n¿Proceder con el envío REAL?`);

        if (!confirmSend) {
            alert('❌ Envío cancelado.');
            return;
        }

        // Real send
        const realResult = await sendIncompleteRegistrationWarning({ dryRun: false });
        const realData = realResult.data;

        alert(`✅ Correos enviados!\n\nEnviados: ${realData.emailsSent}\nErrores: ${realData.errors}`);

    } catch (e) {
        console.error('Warning Email Error:', e);
        alert('Error: ' + e.message);
    }
};

// Send Campaign
window.sendCampaign = async () => {
    const target = document.getElementById('emailTarget').value;
    const subject = document.getElementById('emailSubject').value;
    const body = document.getElementById('emailBody').value;
    const dryRun = document.getElementById('dryRun').checked;
    const statusEl = document.getElementById('emailStatus');
    const btn = document.querySelector('button[onclick="sendCampaign()"]');

    if (!subject || !body) {
        alert('Por favor completa el asunto y el mensaje.');
        return;
    }

    if (!confirm(`Confirmar envío:\n\nDestino: ${target}\nDry Run: ${dryRun}\n\n¿Proceder?`)) return;

    statusEl.textContent = 'Enviando... ⏳';
    statusEl.className = 'flex-1 text-sm font-mono text-blue-400';
    btn.disabled = true;
    btn.classList.add('opacity-50', 'cursor-not-allowed');

    try {
        const sendMarketingEmail = httpsCallable(functions, 'sendMarketingEmail');
        const result = await sendMarketingEmail({ target, subject, body, dryRun });

        const data = result.data;
        if (data.success) {
            statusEl.textContent = `✅ Éxito: Encontrados ${data.usersFound}, Enviados ${data.emailsSent}, Errores ${data.errors}`;
            statusEl.className = 'flex-1 text-sm font-mono text-green-400';
            if (!dryRun) alert('Campaña enviada correctamente.');
        } else {
            throw new Error(data.error || 'Error desconocido');
        }

    } catch (e) {
        console.error('Campaign Error:', e);
        statusEl.textContent = `❌ Error: ${e.message}`;
        statusEl.className = 'flex-1 text-sm font-mono text-red-400';
    } finally {
        btn.disabled = false;
        btn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
};

// Auth Listener
onAuthStateChanged(auth, async (user) => {
    const overlay = document.getElementById('loadingOverlay');

    if (!user) {
        window.location.href = '/login.html';
        return;
    }

    const isAdmin = await checkAdminAccess(user);
    if (isAdmin) {
        overlay.classList.add('hidden');
        if (document.getElementById('adminName')) {
            document.getElementById('adminName').textContent = user.displayName || user.email;
        }
        loadUsers();
    } else {
        // Debug Alert
        const token = await user.getIdTokenResult();
        alert(`⛔ Acceso Denegado\n\nUsuario: ${user.email}\nRol: ${token.claims.role || 'Ninguno'}\n\nSi crees que esto es un error, contacta al soporte.`);
        window.location.href = '/buscar-usuarios.html';
    }
});
