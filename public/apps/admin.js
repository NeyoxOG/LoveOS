
/**
 * AdminOS v2.0 Logic (Fixes for Ban & Rewards)
 */

const KEYS = { SESSION: 'fiaos_session' };

let currentUser = null;
let adminConfig = null;
let cloud = null;
let selectedUserId = null;
let userRewardsData = null;
let appUptime = 0;

// Need a default struct if cloud data is missing for new users
const DEFAULT_REWARDS_STRUCT = {
  version: 2,
  rewards: {
    "reward.welcome": { unlocked: true, unlockedAt: Date.now() }
  },
  valentine: {
    total: 6,
    unlocked: {},
    completedAt: null
  },
  meta: {
    lastSeenAt: Date.now(),
    points: 0
  }
};

// App Definitions
const APP_DEFS = [
    { id: 'luna', name: 'Luna', icon: '🐑' },
    { id: 'valentine', name: 'Valentine', icon: '💘' },
    { id: 'rewards_app', name: 'Belohnungen', icon: '🎁' },
    { id: 'vault', name: 'Vault', icon: '💌' },
    { id: 'games', name: 'Arcade', icon: '🕹️' },
    { id: 'diary', name: 'Diary', icon: '📔' },
    { id: 'daily', name: 'Daily', icon: '✨' },
    { id: 'love', name: 'Love', icon: '💞' },
    { id: 'messages', name: 'Chat', icon: '💬' },
    { id: 'settings', name: 'Einstellungen', icon: '⚙️' },
    { id: 'story', name: 'Story', icon: '🎞️' },
    { id: 'bucket', name: 'Ziele', icon: '📍' }
];

// Full Catalog
const FULL_REWARD_CATALOG = [
    { id: 'reward.welcome', title: 'Willkommen' },
    { id: 'reward.firstLogin', title: 'Erster Login' },
    { id: 'reward.streak3', title: '3 Tage Streak' },
    { id: 'reward.secretLove', title: 'Secret Love' },
    { id: 'reward.welcomeTheme', title: 'Theme: Aurora' },
    { id: 'valentine.reward.pizza', title: 'Val: Pizza' },
    { id: 'valentine.reward.photo', title: 'Val: Foto' },
    { id: 'valentine.reward.letter', title: 'Val: Brief' },
    { id: 'valentine.reward.care', title: 'Val: Care Day' },
    { id: 'valentine.reward.art', title: 'Val: Malen' },
    { id: 'valentine.reward.secret', title: 'Val: Secret' },
    { id: 'games.stack.10', title: 'Stack: 10' },
    { id: 'games.stack.50', title: 'Stack: 50' },
    { id: 'daily.streak7', title: 'Daily: 7 Streak' },
    { id: 'daily.points100', title: 'Daily: Royal Theme' },
    { id: 'love_1_month', title: 'Love: 1 Monat' },
    { id: 'love_1_year', title: 'Love: 1 Jahr' },
    { id: 'bucket.done1', title: 'Bucket: Erledigt' }
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

    loadSystemData();
    setInterval(updateUptime, 60000);
}

function denyAccess() {
    document.body.innerHTML = `<div style="height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#ff453a; background:#000;">
        <div style="font-size:40px; margin-bottom:10px;">⛔</div>
        <h2 style="font-weight:800;">ZUGRIFF VERWEIGERT</h2>
    </div>`;
}

async function loadSystemData() {
    try {
        if (cloud) {
            // Live Admin Config Listener handles updates in Parent App, but here we explicitly fetch once to render
            adminConfig = await cloud.loadAdminConfig();
            document.getElementById('cloudDot').className = 'dot online';
            document.getElementById('cloudText').innerText = "Online";
            
            // Load Luna Stats
            const luna = await cloud.loadLuna();
            if (luna && luna.stats) {
                document.getElementById('lunaHunger').value = luna.stats.hunger || 50;
                document.getElementById('lunaLove').value = luna.stats.love || 50;
                document.getElementById('lunaEnergy').value = luna.stats.energy || 50;
                updateLunaStat();
            }
        } else {
            adminConfig = JSON.parse(localStorage.getItem('fiaos_global_admin_config') || '{}');
            document.getElementById('cloudDot').className = 'dot offline';
            document.getElementById('cloudText').innerText = "Offline";
        }

        // Init defaults if empty
        if (!adminConfig) adminConfig = { appVisibility: {}, userStatus: {}, maintenanceMode: false };
        if (!adminConfig.appVisibility) adminConfig.appVisibility = {};
        if (!adminConfig.userStatus) adminConfig.userStatus = {};

        // Force defaults for apps
        APP_DEFS.forEach(a => {
            if (adminConfig.appVisibility[a.id] === undefined) adminConfig.appVisibility[a.id] = true;
        });

        renderDashboard();
        renderApps();
        renderUsersList();
        
        // Auto-select first user for rewards tab context (or default)
        const defaultRewardUser = document.getElementById('rewardUserSelect').value;
        loadUserRewardsList(); 

    } catch(e) {
        console.error("Sys Load Error", e);
        document.getElementById('cloudText').innerText = "Error";
    }
}

// --- Renderers ---

function renderDashboard() {
    // Maintenance Toggle
    const tog = document.getElementById('maintToggle');
    if (adminConfig.maintenanceMode) tog.classList.add('active');
    else tog.classList.remove('active');

    // Stats
    document.getElementById('statUsers').innerText = USERS_LIST.length;
}

function updateUptime() {
    appUptime++;
    document.getElementById('statUptime').innerText = appUptime + 'm';
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
        const banned = status.banned ? '🔴 BANNED' : '';

        el.innerHTML = `
            <div class="user-avatar">${u.name.charAt(0)}</div>
            <div class="user-info">
                <div class="user-name">${u.name} <span style="font-size:12px; color:var(--danger);">${banned}</span></div>
                <div class="user-role">${role} • ID: ${u.id}</div>
            </div>
            <div class="user-arrow">➔</div>
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
};

// --- Actions: System ---

window.toggleMaintenance = async () => {
    adminConfig.maintenanceMode = !adminConfig.maintenanceMode;
    renderDashboard(); 
    await syncConfig();
};

window.forceSync = () => {
    location.reload();
};

window.toggleAppVisibility = async (appId) => {
    adminConfig.appVisibility[appId] = !adminConfig.appVisibility[appId];
    renderApps(); 
    await syncConfig();
};

async function syncConfig() {
    // Optimistic local save
    localStorage.setItem('fiaos_global_admin_config', JSON.stringify(adminConfig));
    // Cloud save
    if (cloud) await cloud.saveAdminConfig(adminConfig);
    // Notifying parent not needed as Parent listens to Cloud
}

// --- Actions: Luna ---

window.updateLunaStat = () => {
    document.getElementById('lunaHungerVal').innerText = document.getElementById('lunaHunger').value;
    document.getElementById('lunaLoveVal').innerText = document.getElementById('lunaLove').value;
    document.getElementById('lunaEnergyVal').innerText = document.getElementById('lunaEnergy').value;
};

window.saveLunaStats = async () => {
    if (!cloud) return alert("Nur Cloud Mode.");
    const h = parseInt(document.getElementById('lunaHunger').value);
    const l = parseInt(document.getElementById('lunaLove').value);
    const e = parseInt(document.getElementById('lunaEnergy').value);
    
    await cloud.updateLuna({
        stats: { hunger: h, love: l, energy: e }
    });
    alert("Luna updated! 🐑");
};

// --- Actions: Users (Ban/Details) ---

window.openUserModal = async (uid, name) => {
    selectedUserId = uid;
    document.getElementById('modalUserName').innerText = name;
    document.getElementById('userModal').classList.add('open');
    
    // Check Ban Status
    const status = adminConfig.userStatus[uid] || { banned: false };
    const banTog = document.getElementById('banToggle');
    if (status.banned) banTog.classList.add('active'); else banTog.classList.remove('active');

    // Load Daily Stats
    document.getElementById('inpStreak').value = '...';
    document.getElementById('inpPoints').value = '...';
    
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
    
    if (!adminConfig.userStatus[selectedUserId]) {
        adminConfig.userStatus[selectedUserId] = { role: 'user', banned: false };
    }
    
    // Toggle
    adminConfig.userStatus[selectedUserId].banned = !adminConfig.userStatus[selectedUserId].banned;
    
    // Update UI
    const banTog = document.getElementById('banToggle');
    if (adminConfig.userStatus[selectedUserId].banned) banTog.classList.add('active'); 
    else banTog.classList.remove('active');
    
    // Sync
    await syncConfig();
    renderUsersList(); // Update list indicators
};

window.saveUserDaily = async () => {
    if (!selectedUserId || !cloud) return;
    const s = parseInt(document.getElementById('inpStreak').value);
    const p = parseInt(document.getElementById('inpPoints').value);
    
    await cloud.adminSetData(selectedUserId, 'daily_state', { streak: s, points: p });
    alert("Gespeichert.");
};

window.forceLogoutUser = async () => {
    if (!selectedUserId || !cloud) return;
    // We reuse the ban logic slightly or trigger the logout timestamp
    await cloud.adminForceLogout(selectedUserId);
    alert("Logout Signal gesendet.");
};

window.resetUser = async () => {
    if (!selectedUserId) return;
    const code = Math.floor(Math.random() * 9000 + 1000);
    const input = prompt(`WARNUNG: ALLES LÖSCHEN?\nBestätige mit Code: ${code}`);
    if (input == code) {
        if (cloud) await cloud.adminResetUser(selectedUserId);
        alert("Reset durchgeführt.");
        closeUserModal();
    }
};

// --- Actions: Rewards Management ---

window.loadUserRewardsList = async () => {
    const uid = document.getElementById('rewardUserSelect').value;
    const list = document.getElementById('rewardsList');
    list.innerHTML = '<div style="padding:20px; text-align:center;">Lade Daten...</div>';
    
    try {
        if (cloud) {
            userRewardsData = await cloud.loadRewards(uid);
        } else {
            userRewardsData = JSON.parse(localStorage.getItem(uid === 'guest' ? 'fiaos_rewards_guest' : `fiaos_rewards_${uid}`) || 'null');
        }
        
        // Critical Fix: Use Default Structure if null to prevent crashes
        if (!userRewardsData) {
            userRewardsData = JSON.parse(JSON.stringify(DEFAULT_REWARDS_STRUCT));
        }
        
        if (!userRewardsData.rewards) userRewardsData.rewards = {};
        if (!userRewardsData.valentine) userRewardsData.valentine = { unlocked: {} };

        renderRewardsList();
    } catch(e) {
        console.error(e);
        list.innerHTML = 'Fehler beim Laden. Siehe Konsole.';
    }
};

function renderRewardsList() {
    const list = document.getElementById('rewardsList');
    const term = document.getElementById('rewardSearch').value.toLowerCase();
    list.innerHTML = '';

    FULL_REWARD_CATALOG.forEach(r => {
        if (term && !r.title.toLowerCase().includes(term) && !r.id.toLowerCase().includes(term)) return;

        let unlocked = false;
        if (r.id.startsWith('valentine.')) {
            unlocked = userRewardsData.valentine?.unlocked?.[r.id] || false;
        } else {
            unlocked = userRewardsData.rewards?.[r.id]?.unlocked || false;
        }

        const el = document.createElement('div');
        el.className = 'reward-item';
        el.innerHTML = `
            <div class="reward-left">
                <div class="reward-icon">${unlocked ? '🔓' : '🔒'}</div>
                <div>
                    <div style="font-weight:600;">${r.title}</div>
                    <div style="font-size:10px; color:var(--text-sec);">${r.id}</div>
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
    
    // Toggle Logic
    let newVal = false;
    
    // Ensure structure exists
    if (rId.startsWith('valentine.')) {
        if (!userRewardsData.valentine) userRewardsData.valentine = { unlocked: {} };
        if (!userRewardsData.valentine.unlocked) userRewardsData.valentine.unlocked = {};
        
        newVal = !userRewardsData.valentine.unlocked[rId];
        userRewardsData.valentine.unlocked[rId] = newVal;
    } else {
        if (!userRewardsData.rewards) userRewardsData.rewards = {};
        
        const curr = userRewardsData.rewards[rId]?.unlocked || false;
        newVal = !curr;
        
        if (!userRewardsData.rewards[rId]) userRewardsData.rewards[rId] = {};
        userRewardsData.rewards[rId].unlocked = newVal;
        if (newVal) userRewardsData.rewards[rId].unlockedAt = Date.now();
    }

    // Save
    if (cloud) await cloud.saveRewards(userRewardsData, uid);
    else localStorage.setItem(uid === 'guest' ? 'fiaos_rewards_guest' : `fiaos_rewards_${uid}`, JSON.stringify(userRewardsData));
    
    // Re-render
    renderRewardsList();
};

init();
