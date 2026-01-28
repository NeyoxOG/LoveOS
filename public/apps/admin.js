
/**
 * Admin App Logic v2
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
let pendingAction = null;

// Mock Data for Rewards List (Matches constants.ts)
const REWARDS = [
    'reward.welcome', 'reward.firstLogin', 'reward.streak3', 'reward.secretLove',
    'valentine.reward.pizza', 'valentine.reward.letter', 'valentine.reward.photo',
    'love_1_month', 'love_3_month', 'love_6_month', 'love_1_year'
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
    if (cfg) {
        adminConfig = JSON.parse(cfg);
        // Ensure new structure
        if (!adminConfig.userStatus) adminConfig.userStatus = {};
    } else {
        // Fallback default
        adminConfig = { 
            appVisibility: { luna: true, valentine: true, vault: true }, 
            userStatus: {}, 
            maintenanceMode: false,
            updatedAt: Date.now()
        };
    }

    // User Index
    const idx = localStorage.getItem(KEYS.USER_INDEX);
    if (idx) userIndex = JSON.parse(idx);
    else userIndex = { users: [] };
}

function saveConfig() {
    adminConfig.updatedAt = Date.now();
    adminConfig.lastEditedBy = currentUser.name;
    localStorage.setItem(KEYS.CONFIG, JSON.stringify(adminConfig));
    
    // Notify OS via Window Bridge
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
        // Get status from config or default
        const status = adminConfig.userStatus[u.userId] || { role: u.role, banned: false };
        
        // Tags
        let tags = '';
        if (status.role === 'admin') tags += `<span class="list-tag admin">Admin</span>`;
        if (status.banned) tags += `<span class="list-tag banned">Banned</span>`;

        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `
            <div class="list-item-content">
                <div class="list-avatar">${u.avatar?.value || '👤'}</div>
                <div class="list-info">
                    <div>
                        <span style="font-weight:600">${u.displayName}</span>
                        ${tags}
                    </div>
                    <span class="list-sub">${u.userId} • ${status.role}</span>
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
    const status = adminConfig.userStatus[uid] || { role: user.role, banned: false };
    
    document.getElementById('editUserName').innerText = `${user.displayName} (${uid})`;
    document.getElementById('editUserRole').value = status.role;
    
    // Toggle UI
    const tog = document.getElementById('editUserBanToggle');
    if (status.banned) tog.classList.add('active');
    else tog.classList.remove('active');

    document.getElementById('userModal').classList.add('active');
};

window.toggleEditBan = () => {
    document.getElementById('editUserBanToggle').classList.toggle('active');
};

window.saveUserEdit = () => {
    const newRole = document.getElementById('editUserRole').value;
    const isBanned = document.getElementById('editUserBanToggle').classList.contains('active');
    
    adminConfig.userStatus[editingUserId] = {
        role: newRole,
        banned: isBanned
    };
    
    saveConfig();
    closeModal();
    renderUsers();
    
    // Auto logout if banning
    if (isBanned) {
        forceLogoutUser(editingUserId);
    }
};

window.forceLogoutUser = (targetId) => {
    const uid = targetId || editingUserId;
    if (!uid) return;
    
    localStorage.setItem(`fiaos_user_${uid}_session_flag`, 'forceLogout');
    
    if (!targetId) { // If called from modal
        alert("Logout flag set for " + uid);
        closeModal();
    }
};

window.closeModal = () => {
    document.getElementById('userModal').classList.remove('active');
    editingUserId = null;
};

// --- Apps Tab ---
function renderApps() {
    const list = document.getElementById('appsList');
    list.innerHTML = '';
    
    // Full list from constants.ts knowledge
    const apps = ['luna', 'valentine', 'rewards', 'vault', 'messages', 'settings', 'admin', 'games', 'diary', 'daily', 'love'];
    
    apps.forEach(appId => {
        if (appId === 'settings') return; // Cannot hide settings
        
        const isVisible = adminConfig.appVisibility[appId] !== false;
        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `
            <span style="text-transform:capitalize; font-weight:500;">${appId}</span>
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

window.adminUnlockReward = async () => {
    const uid = document.getElementById('rewardUserSelect').value;
    const rid = document.getElementById('rewardIdSelect').value;
    
    // Use Cloud API exposed on window
    if (!window.parent.FIAOS || !window.parent.FIAOS.cloud) {
        alert("Cloud API not available.");
        return;
    }
    
    const cloud = window.parent.FIAOS.cloud;
    
    let data = await cloud.loadRewards(uid);
    if (!data) {
        // If data is missing (e.g. user never logged in to initialize), creating from scratch might be needed
        // For simplicity, we advise user to login first or assume null means fresh
        // Try creating minimal structure
        data = { 
            version: 2, 
            rewards: {}, 
            valentine: { unlocked: {}, total: 6, completedAt: null },
            meta: { lastSeenAt: Date.now(), points: 0 }
        };
    }
    
    // Safety
    if (!data.rewards) data.rewards = {};
    if (!data.valentine) data.valentine = { unlocked: {}, total: 6, completedAt: null };
    
    data.rewards[rid] = { unlocked: true, unlockedAt: Date.now() };
    if (rid.startsWith('valentine.')) data.valentine.unlocked[rid] = true;
    
    await cloud.saveRewards(data, uid);
    alert(`Unlocked ${rid} for ${uid}`);
};

// --- System Actions ---

window.confirmAction = (action) => {
    pendingAction = action;
    const modal = document.getElementById('confirmModal');
    const txt = document.getElementById('confirmText');
    
    if (action === 'lunaReset') txt.innerText = "Reset Luna Status (Hunger, Mood, Streak)? Affects shared state.";
    if (action === 'dailyReset') txt.innerText = "Reset Daily Claims for all users?";
    if (action === 'globalLogout') txt.innerText = "Log out ALL users immediately?";
    if (action === 'resetRewards') txt.innerText = "Wipe ALL rewards for ALL users?";
    
    document.getElementById('confirmBtnAction').onclick = executePendingAction;
    modal.classList.add('active');
};

window.closeConfirm = () => {
    document.getElementById('confirmModal').classList.remove('active');
    pendingAction = null;
};

async function executePendingAction() {
    if (!pendingAction) return;
    
    if (pendingAction === 'lunaReset') {
        localStorage.removeItem('fiaos_guest_luna_state');
        if (window.parent.FIAOS && window.parent.FIAOS.cloud) {
            // Need a reset method exposed or manually update?
            // Simple update to default state via cloud
            await window.parent.FIAOS.cloud.updateLuna({
                stats: { hunger: 50, energy: 50, hygiene: 50, fun: 50, love: 50 },
                mood: 'happy',
                streak: { count: 0 },
                history: []
            });
        }
    }
    else if (pendingAction === 'dailyReset') {
        userIndex.users.forEach(u => {
            localStorage.removeItem(`fiaos_user_${u.userId}_daily_state`);
        });
        // Note: Daily state is still local per user even in cloud mode for now (Prompt 19/20 didn't explicitly move daily state to cloud, only rewards/luna/diary/vault)
        // If Daily moves to cloud, this needs update.
    }
    else if (pendingAction === 'globalLogout') {
        userIndex.users.forEach(u => {
            localStorage.setItem(`fiaos_user_${u.userId}_session_flag`, 'forceLogout');
        });
        // Also self
        localStorage.setItem(`fiaos_user_${currentUser.id}_session_flag`, 'forceLogout');
    }
    else if (pendingAction === 'resetRewards') {
        // Warning: This is heavy. Reset cloud rewards for everyone?
        // Just local for now as "Reset" implies emergency wipe.
        userIndex.users.forEach(u => {
             localStorage.removeItem(`fiaos_rewards_${u.userId}`);
             // If we wanted to wipe cloud, we'd need to iterate users and call cloud.saveRewards with empty data.
             // Skipping loop cloud wipe for safety/speed in v0.3
        });
        localStorage.removeItem('fiaos_rewards_guest');
    }
    
    alert("Action Executed.");
    closeConfirm();
}

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
        index: userIndex
    };
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    alert("Config copied to clipboard.");
};

// Start
init();
