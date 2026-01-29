
/**
 * AdminOS v3.0 Logic
 */

const KEYS = { SESSION: 'fiaos_session' };

let currentUser = null;
let adminConfig = null;
let cloud = null;
let selectedUserId = null;
let userRewardsData = null;
let healthInterval = null;

// App Definitions
const APP_DEFS = [
    { id: 'luna', name: 'Luna', icon: '🐑' },
    { id: 'valentine', name: 'Valentine', icon: '💘' },
    { id: 'rewards_app', name: 'Rewards', icon: '🎁' },
    { id: 'vault', name: 'Vault', icon: '💌' },
    { id: 'games', name: 'Arcade', icon: '🕹️' },
    { id: 'diary', name: 'Diary', icon: '📔' },
    { id: 'daily', name: 'Daily', icon: '✨' },
    { id: 'love', name: 'Love', icon: '💞' },
    { id: 'messages', name: 'Chat', icon: '💬' },
    { id: 'story', name: 'Story', icon: '🎞️' },
    { id: 'bucket', name: 'Ziele', icon: '📍' }
];

const USERS_LIST = [
    { id: 'fia', name: 'Fia' },
    { id: 'collin', name: 'Collin' },
    { id: 'guest', name: 'Gast' }
];

function init() {
    const sessionStr = localStorage.getItem(KEYS.SESSION);
    if (!sessionStr) return denyAccess();
    currentUser = JSON.parse(sessionStr);

    if (currentUser.role !== 'admin' && currentUser.role !== 'developer') return denyAccess();
    
    if (window.parent.FIAOS && window.parent.FIAOS.cloud) {
        cloud = window.parent.FIAOS.cloud;
    }

    log("> AdminOS Kernel loaded.");
    loadSystemData();
    startHealthMonitor();
}

function denyAccess() {
    document.body.innerHTML = `<div style="height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#ff453a; background:#000; font-family:monospace;">
        <div style="font-size:40px; margin-bottom:10px;">⛔</div>
        <h2 style="font-weight:800;">ACCESS_DENIED</h2>
        <p>UID mismatch.</p>
    </div>`;
}

function log(msg, type = 'info') {
    const term = document.getElementById('terminalLog');
    const line = document.createElement('div');
    line.className = `log-line ${type}`;
    const time = new Date().toLocaleTimeString('de-DE', {hour12:false, hour:"2-digit", minute:"2-digit", second:"2-digit"});
    line.innerText = `[${time}] ${msg}`;
    term.appendChild(line);
    term.scrollTop = term.scrollHeight;
}

function startHealthMonitor() {
    if (healthInterval) clearInterval(healthInterval);
    healthInterval = setInterval(() => {
        const cpu = Math.floor(Math.random() * 30) + 10;
        const ram = Math.floor(Math.random() * 20) + 30;
        const net = Math.floor(Math.random() * 50);
        
        document.getElementById('cpuBar').style.width = cpu + '%';
        document.getElementById('cpuVal').innerText = cpu + '%';
        
        document.getElementById('ramBar').style.width = ram + '%';
        document.getElementById('ramVal').innerText = ram + '%';
        
        document.getElementById('netBar').style.width = net + '%';
        document.getElementById('netVal').innerText = net + '%';
    }, 2000);
}

async function loadSystemData() {
    log("> Connecting to Cloud Interface...");
    try {
        if (cloud) {
            adminConfig = await cloud.loadAdminConfig();
            document.getElementById('connStatus').className = 'status-badge';
            document.getElementById('connText').innerText = "ONLINE";
            log("> Config synchronized.", "success");
            
            // Load Luna Stats
            const luna = await cloud.loadLuna();
            if (luna && luna.stats) {
                document.getElementById('lunaH').value = luna.stats.hunger || 50;
                document.getElementById('lunaL').value = luna.stats.love || 50;
                document.getElementById('lunaE').value = luna.stats.energy || 50;
                updateLunaUI();
            }
        } else {
            adminConfig = JSON.parse(localStorage.getItem('fiaos_global_admin_config') || '{}');
            document.getElementById('connStatus').className = 'status-badge offline';
            document.getElementById('connText').innerText = "OFFLINE";
            log("> Cloud unreachable. Using local cache.", "warn");
        }

        // Init defaults if empty
        if (!adminConfig) adminConfig = { appVisibility: {}, userStatus: {}, maintenanceMode: false };
        if (!adminConfig.appVisibility) adminConfig.appVisibility = {};
        if (!adminConfig.userStatus) adminConfig.userStatus = {};

        renderDashboard();
        renderApps();
        renderUsersList();
        loadUserRewardsList(); 

    } catch(e) {
        console.error("Sys Load Error", e);
        log("> CRITICAL ERROR: Load failed.", "error");
    }
}

// --- Renderers ---

function renderDashboard() {
    // Maintenance Toggle
    const tog = document.getElementById('maintToggle');
    const card = document.getElementById('maintCard');
    if (adminConfig.maintenanceMode) {
        tog.classList.add('active');
        card.classList.add('maint-active');
        log("> WARNING: System is in Maintenance Mode.", "warn");
    } else {
        tog.classList.remove('active');
        card.classList.remove('maint-active');
    }

    document.getElementById('statUsers').innerText = USERS_LIST.length;
}

function renderApps() {
    const grid = document.getElementById('appsGrid');
    grid.innerHTML = '';
    
    APP_DEFS.forEach(app => {
        if (app.id === 'settings') return; 
        const isVisible = adminConfig.appVisibility[app.id] !== false;
        
        const el = document.createElement('div');
        el.className = `app-toggle ${isVisible ? 'active' : 'disabled'}`;
        el.onclick = () => toggleAppVisibility(app.id);
        el.innerHTML = `
            <div class="app-icon">${app.icon}</div>
            <div class="app-name">${app.name}</div>
        `;
        grid.appendChild(el);
    });
}

function renderUsersList() {
    const list = document.getElementById('usersList');
    list.innerHTML = '';
    
    USERS_LIST.forEach(u => {
        const el = document.createElement('div');
        el.className = 'user-row';
        el.onclick = () => openUserModal(u.id, u.name);
        
        const status = adminConfig.userStatus[u.id] || {};
        const role = u.id === 'collin' ? 'Admin' : (u.id === 'guest' ? 'Guest' : 'User');
        const isBanned = status.banned;

        el.innerHTML = `
            <div class="user-avatar">${u.name.charAt(0)}</div>
            <div class="user-info">
                <div class="user-name">${u.name} ${isBanned ? '<span class="tag banned">BANNED</span>' : ''}</div>
                <div class="user-meta">${role} • ID: ${u.id}</div>
            </div>
            <div style="color:var(--text-sec)">➔</div>
        `;
        list.appendChild(el);
    });
}

// --- Views & Navigation ---

window.switchView = (viewId, btn) => {
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    document.getElementById(`view-${viewId}`).classList.add('active');
    
    document.querySelectorAll('.dock-btn').forEach(el => el.classList.remove('active'));
    btn.classList.add('active');
    log(`> Switched view to ${viewId}`);
};

// --- Actions: System ---

window.toggleMaintenance = async () => {
    adminConfig.maintenanceMode = !adminConfig.maintenanceMode;
    renderDashboard(); 
    await syncConfig();
    log(`> Maintenance Mode set to ${adminConfig.maintenanceMode}`);
};

window.toggleAppVisibility = async (appId) => {
    adminConfig.appVisibility[appId] = !adminConfig.appVisibility[appId];
    renderApps(); 
    await syncConfig();
    log(`> Toggled app ${appId}`);
};

window.sendBroadcast = async () => {
    const inp = document.getElementById('broadcastInput');
    const msg = inp.value.trim();
    if(!msg) return;
    
    // In a real implementation, we would write to a 'system_messages' collection
    // Here we simulate it by updating config lastEditedBy as a trigger or specific field
    // For now, we assume the cloud adapter can handle it or we update a state.
    
    if(cloud) {
        log(`> Broadcasting: "${msg}"...`);
        // We can piggyback on admin config or a separate state
        adminConfig.latestBroadcast = { text: msg, time: Date.now() };
        await syncConfig();
        alert("Nachricht gesendet!");
        inp.value = '';
    }
};

async function syncConfig() {
    localStorage.setItem('fiaos_global_admin_config', JSON.stringify(adminConfig));
    if (cloud) {
        await cloud.saveAdminConfig(adminConfig);
    }
}

// --- Actions: Luna ---

window.updateLunaUI = () => {
    document.getElementById('lunaHVal').innerText = document.getElementById('lunaH').value + '%';
    document.getElementById('lunaLVal').innerText = document.getElementById('lunaL').value + '%';
    document.getElementById('lunaEVal').innerText = document.getElementById('lunaE').value + '%';
};

window.saveLunaStats = async () => {
    if (!cloud) return alert("Offline Mode.");
    const h = parseInt(document.getElementById('lunaH').value);
    const l = parseInt(document.getElementById('lunaL').value);
    const e = parseInt(document.getElementById('lunaE').value);
    
    await cloud.updateLuna({
        stats: { hunger: h, love: l, energy: e }
    });
    log("> Luna Core updated.");
    alert("Luna Updated ✅");
};

// --- Actions: Users ---

window.openUserModal = async (uid, name) => {
    selectedUserId = uid;
    document.getElementById('modalUserName').innerText = name;
    document.getElementById('userModal').classList.add('open');
    
    if (!adminConfig.userStatus[uid]) {
        adminConfig.userStatus[uid] = { role: 'user', banned: false };
    }

    const status = adminConfig.userStatus[uid];
    const banTog = document.getElementById('banToggle');
    if (status.banned) banTog.classList.add('active'); else banTog.classList.remove('active');

    // Load Daily Stats
    document.getElementById('inpStreak').value = '';
    document.getElementById('inpPoints').value = '';
    
    if (cloud) {
        const daily = await cloud.adminGetData(uid, 'daily_state');
        document.getElementById('inpStreak').value = daily?.streak || 0;
        document.getElementById('inpPoints').value = daily?.points || 0;
    }
};

window.closeUserModal = () => {
    document.getElementById('userModal').classList.remove('open');
    selectedUserId = null;
};

window.toggleBan = async () => {
    if (!selectedUserId) return;
    if (selectedUserId === 'guest') return alert("Gast kann nicht gebannt werden.");
    if (selectedUserId === 'collin') return alert("Admin kann nicht gebannt werden.");
    
    adminConfig.userStatus[selectedUserId].banned = !adminConfig.userStatus[selectedUserId].banned;
    
    const banTog = document.getElementById('banToggle');
    if (adminConfig.userStatus[selectedUserId].banned) banTog.classList.add('active'); 
    else banTog.classList.remove('active');
    
    await syncConfig();
    renderUsersList(); 
    log(`> Ban status changed for ${selectedUserId}`);
};

window.saveUserDaily = async () => {
    if (!selectedUserId || !cloud) return;
    const s = parseInt(document.getElementById('inpStreak').value);
    const p = parseInt(document.getElementById('inpPoints').value);
    
    await cloud.adminSetData(selectedUserId, 'daily_state', { streak: s, points: p });
    log(`> Updated daily stats for ${selectedUserId}`);
    alert("Gespeichert.");
};

window.forceLogoutUser = async () => {
    if (!selectedUserId || !cloud) return;
    if (confirm("Benutzer wirklich ausloggen?")) {
        await cloud.adminForceLogout(selectedUserId);
        log(`> Logout signal sent to ${selectedUserId}`);
        alert("Signal gesendet.");
    }
};

window.resetUser = async () => {
    if (!selectedUserId) return;
    const code = Math.floor(Math.random() * 9000 + 1000);
    const input = prompt(`WARNUNG: PROFIL LÖSCHEN?\nCode: ${code}`);
    if (input == code) {
        if (cloud) await cloud.adminResetUser(selectedUserId);
        log(`> User ${selectedUserId} reset to factory defaults.`, "warn");
        alert("Reset durchgeführt.");
        closeUserModal();
    }
};

// --- Actions: Rewards ---

window.loadUserRewardsList = async () => {
    const uid = document.getElementById('rewardUserSelect').value;
    const list = document.getElementById('rewardsList');
    list.innerHTML = '<div style="padding:20px; text-align:center; color:#666;">Loading...</div>';
    
    try {
        if (cloud) {
            userRewardsData = await cloud.loadRewards(uid);
        } else {
            userRewardsData = JSON.parse(localStorage.getItem(uid === 'guest' ? 'fiaos_rewards_guest' : `fiaos_rewards_${uid}`) || 'null');
        }
        
        if (!userRewardsData) userRewardsData = { rewards: {}, valentine: { unlocked: {} } }; // Fallback
        
        renderRewardsList();
    } catch(e) {
        console.error(e);
        list.innerHTML = 'Error loading rewards.';
    }
};

function renderRewardsList() {
    const list = document.getElementById('rewardsList');
    const term = document.getElementById('rewardSearch').value.toLowerCase();
    list.innerHTML = '';

    // Mock Catalog for Admin View (Ideally imported)
    const CATALOG = [
        { id: 'reward.welcome', title: 'Willkommen' },
        { id: 'reward.streak3', title: 'Streak 3' },
        { id: 'valentine.reward.pizza', title: 'Val: Pizza' },
        { id: 'daily.points100', title: 'Royal Theme' },
        { id: 'love_1_year', title: '1 Jahr' }
    ];

    CATALOG.forEach(r => {
        if (term && !r.title.toLowerCase().includes(term) && !r.id.toLowerCase().includes(term)) return;

        let unlocked = false;
        if (r.id.startsWith('valentine.')) unlocked = userRewardsData.valentine?.unlocked?.[r.id] || false;
        else unlocked = userRewardsData.rewards?.[r.id]?.unlocked || false;

        const el = document.createElement('div');
        el.className = 'reward-item';
        el.innerHTML = `
            <div class="reward-left">
                <div class="reward-icon">${unlocked ? '🔓' : '🔒'}</div>
                <div>
                    <div style="font-weight:600; font-size:14px;">${r.title}</div>
                    <div style="font-size:10px; color:var(--text-sec); font-family:monospace;">${r.id}</div>
                </div>
            </div>
            <div class="toggle ${unlocked ? 'active' : ''}" onclick="toggleReward('${r.id}')"></div>
        `;
        list.appendChild(el);
    });
}

window.filterRewards = () => {
    renderRewardsList();
};

window.toggleReward = async (rId) => {
    const uid = document.getElementById('rewardUserSelect').value;
    let newVal = false;
    
    if (rId.startsWith('valentine.')) {
        if (!userRewardsData.valentine) userRewardsData.valentine = { total: 6, unlocked: {}, completedAt: null };
        if (!userRewardsData.valentine.unlocked) userRewardsData.valentine.unlocked = {};
        newVal = !userRewardsData.valentine.unlocked[rId];
        userRewardsData.valentine.unlocked[rId] = newVal;
    } else {
        if (!userRewardsData.rewards) userRewardsData.rewards = {};
        if (!userRewardsData.rewards[rId]) userRewardsData.rewards[rId] = {};
        newVal = !userRewardsData.rewards[rId].unlocked;
        userRewardsData.rewards[rId].unlocked = newVal;
    }

    if (cloud) await cloud.saveRewards(userRewardsData, uid);
    else localStorage.setItem(uid === 'guest' ? 'fiaos_rewards_guest' : `fiaos_rewards_${uid}`, JSON.stringify(userRewardsData));
    
    renderRewardsList();
    log(`> Toggled reward ${rId} for ${uid}`);
};

init();
