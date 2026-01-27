/**
 * Admin App Logic
 */

const KEYS = {
    SESSION: 'fiaos_session',
    CONFIG: 'fiaos_global_admin_config',
    USER_INDEX: 'fiaos_global_user_index'
};

let currentUser = null;
let adminConfig = null;
let userIndex = null;
let editingUserId = null;

// Mock Data for Rewards List
const REWARDS = [
    'reward.welcome', 'reward.firstLogin', 'reward.streak3', 
    'valentine.reward.pizza', 'valentine.reward.letter'
];

function init() {
    // 1. Auth Check
    const sessionStr = localStorage.getItem(KEYS.SESSION);
    if (!sessionStr) return denyAccess();
    currentUser = JSON.parse(sessionStr);

    if (currentUser.role !== 'admin' && currentUser.role !== 'developer') {
        return denyAccess();
    }

    // 2. Load Data
    loadData();

    // 3. Render
    renderUsers();
    renderApps();
    renderRewardsUI();
    renderSystem();

    // 4. Poll for updates (optional, keeping it simple)
}

function denyAccess() {
    document.body.innerHTML = `
        <div style="height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; color:white;">
            <h1>⛔ Access Denied</h1>
            <p>Admin privileges required.</p>
        </div>
    `;
}

function loadData() {
    // Config
    const cfg = localStorage.getItem(KEYS.CONFIG);
    if (cfg) adminConfig = JSON.parse(cfg);
    else adminConfig = { 
        appVisibility: { luna: true, valentine: true, vault: true }, 
        roleOverrides: {}, 
        maintenanceMode: false 
    };

    // User Index
    const idx = localStorage.getItem(KEYS.USER_INDEX);
    if (idx) userIndex = JSON.parse(idx);
    else userIndex = { users: [] };
}

function saveConfig() {
    localStorage.setItem(KEYS.CONFIG, JSON.stringify(adminConfig));
    // Notify OS
    if (window.parent.FIAOS_ADMIN_CONFIG_UPDATED) {
        window.parent.FIAOS_ADMIN_CONFIG_UPDATED(adminConfig);
    }
}

// --- Tabs ---
window.switchTab = (id, idx) => {
    document.querySelectorAll('[id^="tab-"]').forEach(el => el.classList.add('hidden'));
    document.getElementById(`tab-${id}`).classList.remove('hidden');
    document.getElementById('segIndicator').style.transform = `translateX(${idx * 100}%)`;
};

// --- Users Tab ---
function renderUsers() {
    const list = document.getElementById('usersList');
    list.innerHTML = '';
    
    userIndex.users.forEach(u => {
        const role = adminConfig.roleOverrides[u.userId] || u.role;
        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `
            <div class="list-item-content">
                <div class="list-avatar">${u.avatar?.value || '👤'}</div>
                <div class="list-info">
                    <span style="font-weight:600">${u.displayName}</span>
                    <span class="list-sub">${u.userId} • ${role}</span>
                </div>
            </div>
            <button class="btn secondary" onclick="openUserEdit('${u.userId}')">Edit</button>
        `;
        list.appendChild(div);
    });
}

window.openUserEdit = (uid) => {
    editingUserId = uid;
    const user = userIndex.users.find(u => u.userId === uid);
    const role = adminConfig.roleOverrides[uid] || user.role;
    
    document.getElementById('editUserName').innerText = `${user.displayName} (${uid})`;
    document.getElementById('editUserRole').value = role;
    document.getElementById('userModal').classList.add('active');
};

window.saveUserEdit = () => {
    const newRole = document.getElementById('editUserRole').value;
    adminConfig.roleOverrides[editingUserId] = newRole;
    saveConfig();
    closeModal();
    renderUsers();
};

window.kickUser = () => {
    if (confirm("Force logout this user?")) {
        localStorage.setItem(`fiaos_user_${editingUserId}_session_flag`, 'forceLogout');
        alert("Kick flag set.");
        closeModal();
    }
};

window.closeModal = () => {
    document.getElementById('userModal').classList.remove('active');
};

// --- Apps Tab ---
function renderApps() {
    const list = document.getElementById('appsList');
    list.innerHTML = '';
    
    const apps = ['luna', 'valentine', 'rewards', 'vault', 'messages', 'settings', 'admin'];
    
    apps.forEach(appId => {
        const isVisible = adminConfig.appVisibility[appId] !== false;
        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `
            <span style="text-transform:capitalize">${appId}</span>
            <div class="toggle ${isVisible ? 'active' : ''}" onclick="toggleApp('${appId}')"></div>
        `;
        list.appendChild(div);
    });
}

window.toggleApp = (appId) => {
    const current = adminConfig.appVisibility[appId] !== false;
    adminConfig.appVisibility[appId] = !current;
    saveConfig();
    renderApps();
};

// --- Rewards Tab ---
function renderRewardsUI() {
    const userSel = document.getElementById('rewardUserSelect');
    userSel.innerHTML = '';
    userIndex.users.forEach(u => {
        userSel.innerHTML += `<option value="${u.userId}">${u.displayName}</option>`;
    });

    const rwSel = document.getElementById('rewardIdSelect');
    rwSel.innerHTML = '';
    REWARDS.forEach(r => {
        rwSel.innerHTML += `<option value="${r}">${r}</option>`;
    });
}

window.adminUnlockReward = () => {
    const uid = document.getElementById('rewardUserSelect').value;
    const rid = document.getElementById('rewardIdSelect').value;
    
    // Low level write
    const key = `fiaos_rewards_${uid}`;
    const data = JSON.parse(localStorage.getItem(key) || '{}');
    
    if (!data.rewards) data.rewards = {};
    if (!data.valentine) data.valentine = { unlocked: {} };
    
    // Unlock generic
    data.rewards[rid] = { unlocked: true, unlockedAt: Date.now() };
    // Unlock valentine if applicable
    data.valentine.unlocked[rid] = true;
    
    localStorage.setItem(key, JSON.stringify(data));
    alert(`Unlocked ${rid} for ${uid}`);
};

window.resetRewardsAll = () => {
    if (confirm("Reset ALL rewards for ALL users?")) {
        userIndex.users.forEach(u => {
             localStorage.removeItem(`fiaos_rewards_${u.userId}`);
        });
        alert("All rewards reset.");
    }
};

// --- Luna Tab ---
window.resetLunaState = () => {
    // Shared key
    if (confirm("Reset Luna Shared State?")) {
        localStorage.removeItem('fiaos_pair_room_main');
        localStorage.removeItem('fiaos_guest_luna_state');
        alert("Luna reset.");
    }
};

window.setLunaMood = (mood) => {
    if (!mood) return;
    const key = 'fiaos_pair_room_main'; // Assuming pair for now
    const raw = localStorage.getItem(key);
    if (raw) {
        const state = JSON.parse(raw);
        state.mood = mood;
        localStorage.setItem(key, JSON.stringify(state));
        alert("Mood updated.");
    }
};

// --- System Tab ---
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

window.exportConfig = () => {
    const data = {
        config: adminConfig,
        index: userIndex,
        // could include more
    };
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    alert("Config copied to clipboard.");
};

window.factoryReset = () => {
    if (confirm("FACTORY RESET: This will wipe EVERYTHING. Are you sure?")) {
        localStorage.clear();
        window.parent.location.reload();
    }
};

// Start
init();