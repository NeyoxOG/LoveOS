
/**
 * AdminOS Logic v2.0
 */

const KEYS = { SESSION: 'fiaos_session', USER_INDEX: 'fiaos_global_user_index' };

let currentUser = null;
let adminConfig = null;
let cloud = null;
let userIndex = null;

// App Definitions for the Grid
const APP_DEFS = [
    { id: 'luna', name: 'Luna', icon: '🐑' },
    { id: 'valentine', name: 'Valentine', icon: '💘' },
    { id: 'rewards', name: 'Erfolge', icon: '🏆' },
    { id: 'vault', name: 'Vault', icon: '💌' },
    { id: 'games', name: 'Arcade', icon: '🕹️' },
    { id: 'diary', name: 'Diary', icon: '📔' },
    { id: 'daily', name: 'Daily', icon: '✨' },
    { id: 'love', name: 'Love', icon: '💞' },
    { id: 'settings', name: 'Settings', icon: '⚙️' } // Usually hidden from toggle
];

function init() {
    const sessionStr = localStorage.getItem(KEYS.SESSION);
    if (!sessionStr) return denyAccess();
    currentUser = JSON.parse(sessionStr);

    if (currentUser.role !== 'admin' && currentUser.role !== 'developer') return denyAccess();
    
    if (window.parent.FIAOS && window.parent.FIAOS.cloud) {
        cloud = window.parent.FIAOS.cloud;
    }

    // Init UI
    loadEverything();
}

function denyAccess() {
    document.body.innerHTML = `<div style="height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; color:white; background:#000;">
        <div style="font-size:40px;">⛔</div>
        <h2 style="margin-top:20px;">Access Denied</h2>
    </div>`;
}

function ensureAdmin() {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'developer')) {
        alert("Access Denied");
        return false;
    }
    return true;
}

async function loadEverything() {
    toggleLoading(true);
    try {
        // Load Admin Config
        if (cloud) {
            adminConfig = await cloud.loadAdminConfig();
            document.getElementById('cloudStatusDot').classList.add('online');
            document.getElementById('cloudStatusTxt').innerText = "Online";
        } else {
            adminConfig = JSON.parse(localStorage.getItem('fiaos_global_admin_config') || '{}');
            document.getElementById('cloudStatusTxt').innerText = "Offline (Local)";
        }

        // Defaults
        if (!adminConfig?.appVisibility) adminConfig.appVisibility = {};
        if (!adminConfig?.userStatus) adminConfig.userStatus = {};

        // Load User Index (Local Cache usually, but could be cloud)
        const idx = localStorage.getItem(KEYS.USER_INDEX);
        userIndex = idx ? JSON.parse(idx) : { users: [] };

        renderDashboard();
        renderApps();
        renderUsers();

    } catch(e) {
        console.error("Admin Load Error", e);
        alert("Ladefehler: " + e.message);
    }
    toggleLoading(false);
}

// --- Renderers ---

function renderDashboard() {
    const maintToggle = document.getElementById('dashMaintToggle');
    if (adminConfig.maintenanceMode) maintToggle.classList.add('active');
    else maintToggle.classList.remove('active');
}

function renderApps() {
    const grid = document.getElementById('appsGrid');
    grid.innerHTML = '';

    APP_DEFS.forEach(app => {
        if (app.id === 'settings') return; // Skip settings

        const isVisible = adminConfig.appVisibility[app.id] !== false;
        
        const el = document.createElement('div');
        el.className = `app-card ${isVisible ? 'active' : 'disabled'}`;
        el.onclick = () => toggleAppVisibility(app.id);
        
        el.innerHTML = `
            <div class="app-icon">${app.icon}</div>
            <div class="app-name">${app.name}</div>
            <div class="app-status">${isVisible ? 'Aktiv' : 'Versteckt'}</div>
        `;
        grid.appendChild(el);
    });
}

function renderUsers() {
    const container = document.getElementById('userListContainer');
    container.innerHTML = '';

    // Merge known users with config status
    const users = userIndex.users.map(u => {
        const status = adminConfig.userStatus[u.userId] || { role: u.role, banned: false };
        return { ...u, ...status };
    });

    // Ensure hardcoded users are present if not in index
    ['fia', 'collin', 'guest'].forEach(id => {
        if (!users.find(u => u.userId === id)) {
            users.push({ userId: id, displayName: id.toUpperCase(), role: id === 'collin'?'admin':'user', banned: false, avatar: {type:'emoji', value:'👤'} });
        }
    });

    users.forEach(u => {
        const isBanned = adminConfig.userStatus[u.userId]?.banned;
        const isGuest = u.userId === 'guest';
        
        const div = document.createElement('div');
        div.className = `user-card ${isBanned ? 'banned' : ''}`;
        
        const avatar = u.avatar?.type === 'emoji' ? u.avatar.value : '👤';
        
        const toggleStyle = isGuest 
            ? 'opacity:0.3; cursor:not-allowed; background:#39393d' 
            : `transform:scale(0.8); background:${isBanned ? '#ff453a' : '#39393d'}`;

        div.innerHTML = `
            <div class="user-avatar">${avatar}</div>
            <div class="user-info">
                <div style="font-weight:600; font-size:15px;">
                    ${u.displayName} 
                    <span class="user-role-badge">${u.role}</span>
                </div>
                <div style="font-size:12px; color:rgba(255,255,255,0.4);">${u.userId}</div>
            </div>
            <div class="toggle ${!isGuest && isBanned ? 'active' : ''}" style="${toggleStyle}" onclick="toggleBan('${u.userId}')"></div>
        `;
        container.appendChild(div);
    });
}

// --- Actions ---

window.switchTab = (id, idx) => {
    // Hide all tabs
    document.querySelectorAll('[id^="tab-"]').forEach(el => el.classList.add('hidden'));
    // Show target
    document.getElementById(`tab-${id}`).classList.remove('hidden');
    
    // Update segment
    document.querySelectorAll('.segment-btn').forEach((b, i) => {
        if (i === idx) b.classList.add('active'); else b.classList.remove('active');
    });
    document.getElementById('segIndicator').style.transform = `translateX(${idx * 100}%)`;
};

window.toggleMaintenance = async () => {
    if (!ensureAdmin()) return;
    adminConfig.maintenanceMode = !adminConfig.maintenanceMode;
    await syncConfig();
    renderDashboard();
};

window.toggleAppVisibility = async (appId) => {
    if (!ensureAdmin()) return;
    adminConfig.appVisibility[appId] = !adminConfig.appVisibility[appId];
    await syncConfig();
    renderApps();
};

window.toggleBan = async (userId) => {
    if (!ensureAdmin()) return;
    
    if (userId === 'guest') {
        alert("Gast-Accounts können nicht gesperrt werden.");
        return;
    }

    if (!adminConfig.userStatus[userId]) {
        adminConfig.userStatus[userId] = { role: 'user', banned: false };
    }
    adminConfig.userStatus[userId].banned = !adminConfig.userStatus[userId].banned;
    await syncConfig();
    renderUsers();
};

async function syncConfig() {
    if (cloud) {
        await cloud.saveAdminConfig(adminConfig);
    } else {
        localStorage.setItem('fiaos_global_admin_config', JSON.stringify(adminConfig));
    }
    // Broadcast change
    if (window.parent.FIAOS_ADMIN_CONFIG_UPDATED) {
        window.parent.FIAOS_ADMIN_CONFIG_UPDATED(adminConfig);
    }
}

// --- Cloud Inspector ---

window.fetchData = async () => {
    if (!ensureAdmin()) return;
    
    const uid = document.getElementById('inspTarget').value;
    const type = document.getElementById('inspType').value;
    const editor = document.getElementById('jsonEditor');
    const status = document.getElementById('editorStatus');

    toggleLoading(true);
    editor.value = "";
    editor.classList.remove('error');
    
    try {
        let data = null;
        if (cloud) {
            data = await cloud.adminGetData(uid, type);
        } else {
            // Local fallback simulation for Guest
            if (uid === 'guest') {
                if (type === 'rewards') data = JSON.parse(localStorage.getItem('fiaos_rewards_guest'));
                // ... other local fallbacks
            }
        }
        
        if (data) {
            editor.value = JSON.stringify(data, null, 4);
            status.innerText = `Geladen: ${new Date().toLocaleTimeString()}`;
            status.style.color = "#32d74b";
        } else {
            editor.value = "null"; // Not found
            status.innerText = "Daten nicht gefunden oder leer.";
            status.style.color = "#ff9f0a";
        }
    } catch(e) {
        editor.value = `// ERROR \n${e.message}`;
        status.innerText = "Fehler beim Laden";
        status.style.color = "#ff453a";
    }
    toggleLoading(false);
};

window.saveData = async () => {
    if (!ensureAdmin()) return;

    const uid = document.getElementById('inspTarget').value;
    const type = document.getElementById('inspType').value;
    const editor = document.getElementById('jsonEditor');
    const status = document.getElementById('editorStatus');

    try {
        const raw = editor.value;
        const data = JSON.parse(raw); // Validate JSON
        
        toggleLoading(true);
        if (cloud) {
            await cloud.adminSetData(uid, type, data);
            status.innerText = "Gespeichert & Synchronisiert ✅";
            status.style.color = "#32d74b";
        } else {
            status.innerText = "Cloud Offline. Speichern nicht möglich.";
        }
    } catch(e) {
        editor.classList.add('error');
        alert("Ungültiges JSON! Bitte Syntax prüfen.\n" + e.message);
        status.innerText = "Syntax Fehler";
        status.style.color = "#ff453a";
    }
    toggleLoading(false);
};

// --- Quick Actions ---

window.quickAction = async (action) => {
    if (!ensureAdmin()) return;
    
    toggleLoading(true);
    try {
        if (action === 'healLuna') {
            await cloud.updateLuna({ 
                stats: { hunger: 100, energy: 100, hygiene: 100, fun: 100, love: 100 },
                mood: 'happy'
            });
            alert("Luna wurde geheilt! 🐑💖");
        } else if (action === 'resetDaily') {
            // Manually resetting shared daily
            // This is complex because Daily logic is split. 
            // We just clear shared claims for today.
            const today = new Date().toISOString().split('T')[0];
            // Admin logic to clear specific document not exposed easily in simple cloud api
            // So we might need to manually edit via inspector usually.
            // But let's assume we implement a specific helper or just log.
            alert("Bitte nutze den Cloud Inspector für Daily Resets (couples/daily/DATE).");
        }
    } catch(e) {
        alert("Fehler: " + e.message);
    }
    toggleLoading(false);
};

window.confirmAction = (type) => {
    if (!ensureAdmin()) return;
    
    if (type === 'globalLogout') {
        if (confirm("WARNUNG: Dies zwingt alle Nutzer zum Logout. Fortfahren?")) {
            // Logic: toggle a token in adminConfig that App.tsx listens to?
            // Currently App.tsx listens to 'banned'. 
            // We could just ban everyone momentarily or set a flag.
            // For now, simpler:
            alert("Feature kommt bald.");
        }
    }
};

function toggleLoading(show) {
    const el = document.getElementById('loading');
    if (show) el.classList.remove('hidden'); else el.classList.add('hidden');
}

init();
