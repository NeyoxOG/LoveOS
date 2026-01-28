
/**
 * Admin App Logic v2 (Cloud Enabled)
 */

const KEYS = { SESSION: 'fiaos_session', USER_INDEX: 'fiaos_global_user_index' };

let currentUser = null;
let adminConfig = null;
let userIndex = null;
let cloud = null;

function init() {
    const sessionStr = localStorage.getItem(KEYS.SESSION);
    if (!sessionStr) return denyAccess();
    currentUser = JSON.parse(sessionStr);

    if (currentUser.role !== 'admin' && currentUser.role !== 'developer') return denyAccess();
    
    if (window.parent.FIAOS && window.parent.FIAOS.cloud) {
        cloud = window.parent.FIAOS.cloud;
    }

    loadData().then(() => {
        renderUsers();
        renderApps();
        renderSystem();
    });
}

function denyAccess() {
    document.body.innerHTML = `<div style="height:100vh; display:flex; align-items:center; justify-content:center; color:white;"><h1>⛔ Access Denied</h1></div>`;
}

async function loadData() {
    if (cloud) adminConfig = await cloud.loadAdminConfig();
    else adminConfig = JSON.parse(localStorage.getItem('fiaos_global_admin_config') || '{}');
    
    if (!adminConfig?.userStatus) adminConfig = { appVisibility: {}, userStatus: {}, maintenanceMode: false };
    
    const idx = localStorage.getItem(KEYS.USER_INDEX);
    userIndex = idx ? JSON.parse(idx) : { users: [] };
}

function saveConfig() {
    adminConfig.updatedAt = Date.now();
    if (cloud) cloud.saveAdminConfig(adminConfig);
    if (window.parent.FIAOS_ADMIN_CONFIG_UPDATED) window.parent.FIAOS_ADMIN_CONFIG_UPDATED(adminConfig);
}

// --- Tabs ---
window.switchTab = (id, idx) => {
    document.querySelectorAll('[id^="tab-"]').forEach(el => el.classList.add('hidden'));
    document.getElementById(`tab-${id}`).classList.remove('hidden');
    document.getElementById('segIndicator').style.transform = `translateX(${idx * 100}%)`;
};

// --- Inspector Logic ---
window.fetchInspectorData = async () => {
    if (!cloud) { alert("Cloud offline"); return; }
    
    const uid = document.getElementById('inspUser').value;
    const type = document.getElementById('inspType').value;
    const loader = document.getElementById('inspLoading');
    const editor = document.getElementById('jsonEditor');
    
    loader.classList.remove('hidden');
    
    try {
        const data = await cloud.adminGetData(uid, type);
        editor.value = JSON.stringify(data, null, 4);
    } catch(e) {
        editor.value = "// Error fetching data:\n" + e.message;
    }
    
    loader.classList.add('hidden');
};

window.saveInspectorData = async () => {
    if (!cloud) return;
    const uid = document.getElementById('inspUser').value;
    const type = document.getElementById('inspType').value;
    const editor = document.getElementById('jsonEditor');
    
    if (!confirm(`Overwrite ${type} for ${uid}? This is destructive.`)) return;
    
    try {
        const data = JSON.parse(editor.value);
        await cloud.adminSetData(uid, type, data);
        alert("Saved successfully! ✅");
    } catch(e) {
        alert("Invalid JSON or Save Failed: " + e.message);
    }
};

// --- Users & Apps Rendering (Simplified) ---
function renderUsers() {
    const list = document.getElementById('usersList');
    list.innerHTML = userIndex.users.map(u => `
        <div class="list-item">
            <span>${u.displayName} <span style="font-size:10px;color:#666">(${u.userId})</span></span>
            <span style="font-size:12px;color:#aaa">${u.role}</span>
        </div>
    `).join('');
}

function renderApps() {
    const list = document.getElementById('appsList');
    const apps = ['luna', 'valentine', 'rewards', 'vault', 'messages', 'games', 'diary', 'daily', 'love'];
    list.innerHTML = apps.map(app => `
        <div class="list-item">
            <span style="text-transform:capitalize;">${app}</span>
            <div class="toggle ${adminConfig.appVisibility[app] !== false ? 'active' : ''}" onclick="toggleApp('${app}')"></div>
        </div>
    `).join('');
}

window.toggleApp = (id) => {
    adminConfig.appVisibility[id] = !adminConfig.appVisibility[id];
    saveConfig();
    renderApps();
};

function renderSystem() {
    const t = document.getElementById('toggleMaint');
    if (adminConfig.maintenanceMode) t.classList.add('active');
    else t.classList.remove('active');
}

window.toggleMaintenance = () => {
    adminConfig.maintenanceMode = !adminConfig.maintenanceMode;
    saveConfig();
    renderSystem();
};

init();
