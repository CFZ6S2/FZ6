import { auth, functions } from './firebase-config-env.js';
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, getDocs, getDoc, query, orderBy, limit, doc, updateDoc, where, startAfter } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { calculateAge, getReputationBadge, getAvailabilityStatus, formatDate } from './utils.js';
import { sanitizer } from './sanitizer.js';

let currentUser = null;
let allUsers = [];
let currentPage = 0;
const USERS_PER_PAGE = 50;
let lastVisibleDoc = null;

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
// Format Date (Imported from utils)

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

// Load Users with Pagination
window.loadUsers = async (loadMore = false) => {
    const tableBody = document.getElementById('usersTableBody');

    if (!loadMore) {
        tableBody.innerHTML = '<tr><td colspan="5" class="p-8 text-center"><i class="fas fa-circle-notch fa-spin text-2xl text-blue-500"></i></td></tr>';
        allUsers = [];
        currentPage = 0;
        lastVisibleDoc = null;
    }

    try {
        const { getDb } = await import('./firebase-config-env.js');
        const db = await getDb();
        const usersRef = collection(db, 'users');

        // Build query with pagination
        let q;
        if (loadMore && lastVisibleDoc) {
            // Removed orderBy('createdAt') to prevent hiding users without this field
            q = query(usersRef, startAfter(lastVisibleDoc), limit(USERS_PER_PAGE));
        } else {
            // Removed orderBy('createdAt') to prevent hiding users without this field
            q = query(usersRef, limit(USERS_PER_PAGE));
        }

        const snapshot = await getDocs(q);

        // Get last visible document for next page
        if (snapshot.docs.length > 0) {
            lastVisibleDoc = snapshot.docs[snapshot.docs.length - 1];
        }

        const users = [];
        snapshot.forEach(doc => {
            users.push({ id: doc.id, ...doc.data() });
        });

        if (loadMore) {
            allUsers = [...allUsers, ...users];
        } else {
            allUsers = users;
        }

        renderTable(allUsers);
        updateStats(allUsers);
        updatePaginationControls(snapshot.docs.length);

    } catch (error) {
        console.error('Error loading users:', error);
        tableBody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-red-400"><i class="fas fa-exclamation-triangle mr-2"></i>Error: ${error.message}</td></tr>`;
    }
};

// Load Zombie Users
window.loadZombieUsers = async () => {
    const tableBody = document.getElementById('usersTableBody');
    tableBody.innerHTML = '<tr><td colspan="5" class="p-8 text-center"><i class="fas fa-skull fa-spin text-2xl text-orange-500"></i><br><span class="text-sm mt-2">Cargando zombies...</span></td></tr>';

    try {
        const listZombies = httpsCallable(functions, 'listZombieUsers');
        const result = await listZombies({});

        if (result.data.success) {
            const zombies = result.data.zombies;
            allUsers = zombies; // Update global

            document.getElementById('totalUsers').textContent = result.data.zombieCount;
            document.getElementById('showingCount').textContent = result.data.zombieCount;

            if (zombies.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-green-400"><i class="fas fa-check-circle mr-2"></i>¡No hay usuarios zombies!</td></tr>';
                return;
            }

            renderTable(zombies);
            updateStats(zombies);

            // Show notification
            alert(`🧟 Encontrados ${zombies.length} usuarios zombies de ${result.data.totalUsers} totales`);
        } else {
            throw new Error('Failed to load zombies');
        }
    } catch (error) {
        console.error('Error loading zombie users:', error);
        tableBody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-red-400"><i class="fas fa-exclamation-triangle mr-2"></i>Error: ${error.message}</td></tr>`;
    }
};

// Cleanup Zombies
window.cleanupZombies = async () => {
    // Double confirmation for safety
    if (!confirm('⚠️ ¿Estás SEGURO de querer eliminar los usuarios zombies?\n\nEsta acción:\n1. Enviará un email de aviso a cada usuario.\n2. Borrará permanentemente sus cuentas.\n3. Es irreversible.')) {
        return;
    }

    const userInput = prompt('Para confirmar, escribe "ELIMINAR" en mayúsculas:');
    if (userInput !== 'ELIMINAR') {
        alert('Acción cancelada.');
        return;
    }

    const tableBody = document.getElementById('usersTableBody');
    tableBody.innerHTML = '<tr><td colspan="5" class="p-8 text-center"><i class="fas fa-cog fa-spin text-3xl text-red-500"></i><br><span class="text-sm mt-3 block font-bold text-red-400">Procesando eliminación masiva...<br>Esto puede tardar unos momentos.</span></td></tr>';

    try {
        const cleanupFunction = httpsCallable(functions, 'cleanupZombieUsers');

        // Execute with dryRun: false to actually delete
        const result = await cleanupFunction({ dryRun: false });

        if (result.data.success) {
            const { processed, deleted, errors } = result.data;

            let message = `✅ Proceso finalizado:\n\n- Procesados: ${processed}\n- Eliminados: ${deleted}`;

            if (errors && errors.length > 0) {
                message += `\n- Errores: ${errors.length}\n(Revisa la consola para detalles)`;
                console.error('Cleanup Errors:', errors);
            }

            alert(message);
            // Reload list to show empty
            loadZombieUsers();
        } else {
            throw new Error('La operación no reportó éxito.');
        }

    } catch (error) {
        console.error('Error cleanup:', error);
        tableBody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-red-400"><i class="fas fa-exclamation-triangle mr-2"></i>Error: ${error.message}</td></tr>`;
        alert(`Error: ${error.message}`);
    }
};

// Update pagination controls
function updatePaginationControls(fetchedCount) {
    const showingCount = document.getElementById('showingCount');
    if (showingCount) {
        showingCount.textContent = allUsers.length;
    }
}

// RESET ALL USER STATS (Maintenance Tool)
window.resetAllGlobalStats = async () => {
    if (!confirm('⚠️ ¿RESET GLOBAL DE ESTADÍSTICAS?\n\nEsto pondrá a CERO las citas y respuesta de TODOS los usuarios.\n¿Continuar?')) return;

    const userInput = prompt('Escribe "RESET" para confirmar:');
    if (userInput !== 'RESET') { alert('Cancelado'); return; }

    console.log('🔄 Iniciando Reset Global de Estadísticas...');
    const tableBody = document.getElementById('usersTableBody');
    tableBody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-blue-400"><i class="fas fa-sync fa-spin text-3xl mb-2"></i><br>Actualizando todos los usuarios...</td></tr>';

    try {
        const { getDb } = await import('./firebase-config-env.js');
        const db = await getDb();
        const usersRef = collection(db, 'users');

        // 1. Get ALL users (In batches effectively, but here we just get all for simplicity or iterate pages)
        // Warning: Small dataset optimization. For < 1000 users this is fine.
        const snapshot = await getDocs(usersRef);
        console.log(`📊 Encontrados ${snapshot.size} usuarios.`);

        let updatedCount = 0;
        const total = snapshot.size;

        const BATCH_SIZE = 500;
        const { writeBatch } = await import("firebase/firestore");

        let batch = writeBatch(db);
        let currentBatchCount = 0;

        for (const userDoc of snapshot.docs) {
            const userRef = doc(db, 'users', userDoc.id);

            // Update logic:
            // - completedDates: 0
            // - responseRate: 100 (Default optimistic)
            // - rating: 5.0 (Default optimistic) or keep existing if rating logic is separate
            // User said: "compatibilidad lo quitamos y respuesta lo reseteamos" 
            // "aprovechar el hueco" -> I chose Rating. So I initialize rating to 5.0

            const updateData = {
                'stats.completedDates': 0,
                'stats.responseRate': 100,
                'stats.rating': 5.0,
                'updatedAt': serverTimestamp()
            };

            // Check if stats object exists to avoid overwrite? 
            // set is safer with merge, but update is cleaner for partial.
            // Using updateDoc. If 'stats' field doesn't exist, dot notation 'stats.x' works if map exists? 
            // Safer to set stats object if missing.
            // Let's use set with merge for safety

            batch.set(userRef, {
                stats: {
                    completedDates: 0,
                    responseRate: 100,
                    rating: 5.0
                }
            }, { merge: true });

            currentBatchCount++;
            updatedCount++;

            if (currentBatchCount >= BATCH_SIZE) {
                await batch.commit();
                console.log(`💾 Batch saved: ${updatedCount}/${total}`);
                batch = writeBatch(db);
                currentBatchCount = 0;
            }
        }

        if (currentBatchCount > 0) {
            await batch.commit();
        }

        console.log('✅ Reset Completado.');
        alert(`Operación exitosa: ${updatedCount} usuarios actualizados.`);
        loadUsers(); // Refresh

    } catch (e) {
        console.error('Reset Failed:', e);
        alert('Error: ' + e.message);
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
        <tr class="hover:bg-slate-800/50 transition group cursor-pointer" onclick="window.openUserModal('${user.id}')">
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
        const { getDb } = await import('./firebase-config-env.js');
        const db = await getDb();
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

// --- ADMIN USER MODAL LOGIC ---
let selectedModalUser = null;

window.openUserModal = async (userId) => {
    const overlay = document.getElementById('loadingOverlay'); // Re-use overlay if we want, or just show modal skeleton
    // Better to fetch fresh data
    try {
        const { getDb } = await import('./firebase-config-env.js');
        const db = await getDb();
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (!userDoc.exists()) {
            alert('Usuario no encontrado');
            return;
        }
        const user = { id: userDoc.id, ...userDoc.data() };
        selectedModalUser = user;

        const modal = document.getElementById('userModal');
        const avatarLetter = (user.alias || user.email || 'U').charAt(0).toUpperCase();

        // Populate Modal
        // 1. Avatar
        const modalAvatarContainer = document.getElementById('modalAvatarContainer');
        const photoUrl = user.photoURL || (user.photos && user.photos.length > 0 ? user.photos[0] : null);

        if (photoUrl) {
            modalAvatarContainer.innerHTML = `<img src="${photoUrl}" class="w-full h-full object-cover">`;
        } else {
            modalAvatarContainer.innerHTML = `<span class="text-5xl font-bold text-white">${avatarLetter}</span>`;
        }

        // Online/Status
        const onlineInd = document.getElementById('modalOnlineIndicator');
        // We don't have real-time online status here easily unless we listen, but let's check basic field
        if (user.isOnline) onlineInd.classList.remove('hidden');
        else onlineInd.classList.add('hidden');

        // 2. Info
        document.getElementById('modalName').textContent = user.alias || 'Sin Alias';
        document.getElementById('modalEmail').textContent = user.email || 'No Email';

        const verBadge = document.getElementById('modalVerifiedBadge');
        if (user.phoneVerified || user.emailVerified) verBadge.classList.remove('hidden');
        else verBadge.classList.add('hidden');

        // Age & Reputation
        const age = user.birthDate ? calculateAge(user.birthDate) : '?';
        document.getElementById('modalAge').innerHTML = `<i class="fas fa-birthday-cake mr-1 text-pink-400"></i><span>${age} años</span>`;

        // Reputation / Status
        let reputationHtml = '';
        if (user.gender === 'femenino') {
            const status = getAvailabilityStatus(user.availabilityStatus || 'available');
            reputationHtml = `<span class="badge ${status.color} text-xs py-0.5 px-2"><i class="fas ${status.icon}"></i> ${status.label}</span>`;
        } else {
            const badge = getReputationBadge(user.reputation || 'ORO', user.completedDates || 0);
            reputationHtml = `<span class="badge ${badge.color} text-xs py-0.5 px-2">${badge.icon} ${badge.label}</span>`;
        }
        document.getElementById('modalReputationContainer').innerHTML = reputationHtml;

        // Stats
        document.getElementById('modalCitasCompletadas').textContent = user.completedDates || 0;
        document.getElementById('modalJoined').textContent = formatDate(user.createdAt);

        // Bio
        const bioEl = document.getElementById('modalBio');
        bioEl.textContent = user.bio ? `"${user.bio}"` : "Sin biografía...";

        // Gallery
        const gallerySection = document.getElementById('modalGallerySection');
        const galleryGrid = document.getElementById('modalGalleryGrid');

        if (user.photos && user.photos.length > 1) {
            gallerySection.classList.remove('hidden');
            galleryGrid.innerHTML = user.photos.slice(1).map(url => `
                    <div class="aspect-square rounded-lg overflow-hidden bg-white/5 border border-white/10 group cursor-pointer" onclick="window.open('${url}', '_blank'); event.stopPropagation();">
                       <img src="${url}" class="w-full h-full object-cover transition transform group-hover:scale-110">
                    </div>
                `).join('');
        } else {
            gallerySection.classList.add('hidden');
        }

        // Admin Buttons State
        const banBtn = document.getElementById('modalAdminBanBtn');
        const verBtn = document.getElementById('modalAdminVerifyBtn');

        // Add "View Full Profile" Button
        let viewProfileBtn = document.getElementById('modalViewProfileBtn');
        if (!viewProfileBtn) {
            viewProfileBtn = document.createElement('button');
            viewProfileBtn.id = 'modalViewProfileBtn';
            viewProfileBtn.className = 'bg-blue-500/20 hover:bg-blue-500/40 text-blue-400 border border-blue-500/50 px-6 py-3 rounded-xl font-bold transition flex items-center gap-2';
            viewProfileBtn.innerHTML = '<i class="fas fa-external-link-alt"></i> <span>Ver Perfil</span>';
            // Insert before other buttons or append to container
            banBtn.parentElement.insertBefore(viewProfileBtn, banBtn);
        }

        viewProfileBtn.onclick = (e) => {
            e.stopPropagation();
            window.open(`perfil.html?userId=${user.id}`, '_blank');
        };

        if (user.disabled) {
            banBtn.innerHTML = '<i class="fas fa-unlock"></i> <span>Desbloquear</span>';
            banBtn.className = 'bg-green-500/20 hover:bg-green-500/40 text-green-400 border border-green-500/50 px-6 py-3 rounded-xl font-bold transition flex items-center gap-2';
        } else {
            banBtn.innerHTML = '<i class="fas fa-ban"></i> <span>Banear</span>';
            banBtn.className = 'bg-red-500/20 hover:bg-red-500/40 text-red-400 border border-red-500/50 px-6 py-3 rounded-xl font-bold transition flex items-center gap-2';
        }

        if (user.phoneVerified) {
            verBtn.innerHTML = '<i class="fas fa-times"></i> <span>Quitar Verif.</span>';
            verBtn.className = 'bg-slate-500/20 hover:bg-slate-500/40 text-slate-400 border border-slate-500/50 px-6 py-3 rounded-xl font-bold transition flex items-center gap-2';
        } else {
            verBtn.innerHTML = '<i class="fas fa-check"></i> <span>Verificar</span>';
            verBtn.className = 'bg-green-500/20 hover:bg-green-500/40 text-green-400 border border-green-500/50 px-6 py-3 rounded-xl font-bold transition flex items-center gap-2';
        }

        // Button Actions
        banBtn.onclick = (e) => {
            e.stopPropagation();
            toggleBan(user.id, !user.disabled);
            // Verify UI update manually or reload user? 
            // Ideally we just update the button but toggleBan reloads the table. 
            // Let's close modal or let table reload handle it? 
            // Admin experience wise, we might want to keep modal open and update state.
            // toggleBan calls loadUsers() which refreshes table. 
            // We should update local state.
            user.disabled = !user.disabled;
            // Update button immediately
            if (user.disabled) {
                banBtn.innerHTML = '<i class="fas fa-unlock"></i> <span>Desbloquear</span>';
                banBtn.className = 'bg-green-500/20 hover:bg-green-500/40 text-green-400 border border-green-500/50 px-6 py-3 rounded-xl font-bold transition flex items-center gap-2';
            } else {
                banBtn.innerHTML = '<i class="fas fa-ban"></i> <span>Banear</span>';
                banBtn.className = 'bg-red-500/20 hover:bg-red-500/40 text-red-400 border border-red-500/50 px-6 py-3 rounded-xl font-bold transition flex items-center gap-2';
            }
        };

        verBtn.onclick = (e) => {
            e.stopPropagation();
            toggleVerification(user.id, !user.phoneVerified);
            user.phoneVerified = !user.phoneVerified;
            if (user.phoneVerified) {
                verBtn.innerHTML = '<i class="fas fa-times"></i> <span>Quitar Verif.</span>';
                verBtn.className = 'bg-slate-500/20 hover:bg-slate-500/40 text-slate-400 border border-slate-500/50 px-6 py-3 rounded-xl font-bold transition flex items-center gap-2';
            } else {
                verBtn.innerHTML = '<i class="fas fa-check"></i> <span>Verificar</span>';
                verBtn.className = 'bg-green-500/20 hover:bg-green-500/40 text-green-400 border border-green-500/50 px-6 py-3 rounded-xl font-bold transition flex items-center gap-2';
            }
        };

        // Show Modal
        modal.classList.remove('opacity-0', 'pointer-events-none');

    } catch (e) {
        console.error('Error opening user modal:', e);
        alert('Error cargando detalles del usuario');
    }
};

// Close Modal
const closeModal = document.getElementById('closeModal');
const userModal = document.getElementById('userModal');

if (closeModal) {
    closeModal.addEventListener('click', () => {
        userModal.classList.add('opacity-0', 'pointer-events-none');
    });
}

if (userModal) {
    userModal.addEventListener('click', (e) => {
        if (e.target === userModal) {
            userModal.classList.add('opacity-0', 'pointer-events-none');
        }
    });
}
