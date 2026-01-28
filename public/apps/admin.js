
/**
 * AdminOS Logic v2.5
 */

const KEYS = { SESSION: 'fiaos_session', USER_INDEX: 'fiaos_global_user_index' };

let currentUser = null;
let adminConfig = null;
let cloud = null;
let selectedUserId = null;
let userRewardsData = null; // Cache for rewards editing

// App Definitions for the Grid
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
    { id: 'settings', name: 'Settings', icon: '⚙️' }
];

// Simplified Catalog for Admin Toggle
const REWARD_CATALOG_MOCK = [
    { id: 'reward.welcome', title: 'Willkommen' },
    { id: 'reward.welcomeTheme', title: 'Theme: Aurora' },
    { id: 'reward.firstLogin', title: 'Erster Login' },
    { id: 'reward.firstAppOpen', title: 'Erste App' },
    { id: 'reward.firstReward', title: 'Erster Erfolg' },
    { id: 'reward.streak3', title: '3 Tage Streak' },
    { id: 'reward.secretLove', title: 'Secret Love' },
    { id: 'custom_theme_unlock', title: 'Theme: Custom' },
    { id: 'daily.points100', title: 'Theme: Royal' },
    { id: 'love_1_month', title: 'Theme: Soft Rose' },
    { id: 'love_3_month', title: 'Theme: Midnight' },
    { id: 'love_6_month', title: 'Theme: Pastel' },
    { id: 'love_1_year', title: 'Theme: Eternal' },
    // Valentine
    { id: 'valentine.reward.pizza', title: 'Val: Pizza' },
    { id: 'valentine.reward.photo', title: 'Val: Foto' },
    { id: 'valentine.reward.letter', title: 'Val: Brief' },
    { id: 'valentine.reward.care', title: 'Val: Care' },
    { id: 'valentine.reward.art', title: 'Val: Art' },
    { id: 'valentine.reward.secret', title: 'Val: Secret' }
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
}

function denyAccess() {
    document.body.innerHTML = `<div style="height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; color:white; background:#000;">
        <div style="font-size:40px;">⛔</div>
        <h2 style="margin-top:20px;">Access Denied</h2>
    </div>`;
}

async function loadSystemData() {
    toggleLoading(true);
    try {
        if (cloud) {
            adminConfig = await cloud.loadAdminConfig();
            document.getElementById('cloudStatusDot').classList.add('online');
            document.getElementById('cloudStatusTxt').innerText = "Online";
        } else {
            adminConfig = JSON.parse(localStorage.getItem('fiaos_global_admin_config') || '{}');
            document.getElementById('cloudStatusTxt').innerText = "Offline";
        }

        if (!adminConfig.appVisibility) adminConfig.appVisibility = {};
        if (!adminConfig.userStatus) adminConfig.userStatus = {};

        renderSystemTab();
    } catch(e) {
        console.error(e);
        alert("Fehler beim Laden.");
    }
    toggleLoading(false);
}

// --- Renderers ---

function renderSystemTab() {
    // Maint Toggle
    const maintToggle = document.getElementById('dashMaintToggle');
    if (adminConfig.maintenanceMode) maintToggle.classList.add('active');
    else maintToggle.classList.remove('active');

    // Apps Grid
    const grid = document.getElementById('appsGrid');
    grid.innerHTML = '';
    APP_DEFS.forEach(app => {
        if (app.id === 'settings') return;
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

function renderUserTab(uid) {
    selectedUserId = uid;
    document.getElementById('uDetailName').innerText = uid.charAt(0).toUpperCase() + uid.slice(1);
    document.getElementById('uDetailId').innerText = uid;
    
    // Status
    const isBanned = adminConfig.userStatus[uid]?.banned;
    const banToggle = document.getElementById('uDetailBanToggle');
    if (isBanned) banToggle.classList.add('active'); else banToggle.classList.remove('active');
}

async function loadUserRewardsList() {
    const uid = document.getElementById('rewardUserSelect').value;
    const container = document.getElementById('rewardsListContainer');
    container.innerHTML = '<div style="padding:20px; text-align:center;">Lade...</div>';
    
    try {
        if (cloud) {
            userRewardsData = await cloud.loadRewards(uid);
        } else {
            // Local fallback simulation
            userRewardsData = JSON.parse(localStorage.getItem(uid === 'guest' ? 'fiaos_rewards_guest' : `fiaos_rewards_${uid}`) || 'null');
        }

        if (!userRewardsData) {
            container.innerHTML = '<div style="padding:20px; text-align:center;">Keine Daten. User muss sich erst einloggen.</div>';
            return;
        }

        container.innerHTML = '';
        REWARD_CATALOG_MOCK.forEach(r => {
            let unlocked = false;
            // Check reward or valentine
            if (r.id.startsWith('valentine.')) {
                unlocked = userRewardsData.valentine?.unlocked?.[r.id] || false;
            } else {
                unlocked = userRewardsData.rewards?.[r.id]?.unlocked || false;
            }

            const div = document.createElement('div');
            div.className = 'reward-toggle-item';
            div.innerHTML = `
                <div class="reward-info">
                    <div class="reward-icon">${unlocked ? '🔓' : '🔒'}</div>
                    <span>${r.title}</span>
                </div>
                <div class="toggle ${unlocked ? 'active' : ''}" onclick="toggleReward('${r.id}', '${uid}')"></div>
            `;
            container.appendChild(div);
        });

    } catch(e) {
        container.innerHTML = '<div style="padding:20px; text-align:center;">Fehler beim Laden.</div>';
    }
}

// --- Actions ---

window.switchTab = (id, idx) => {
    // UI Update
    document.querySelectorAll('.segment-btn').forEach((b, i) => {
        if (i === idx) b.classList.add('active'); else b.classList.remove('active');
    });
    document.getElementById('segIndicator').style.transform = `translateX(${idx * 100}%)`;

    // Views
    document.getElementById('tab-system').classList.add('hidden');
    document.getElementById('tab-user-detail').classList.add('hidden');
    document.getElementById('tab-rewards').classList.add('hidden');

    if (id === 'system') {
        document.getElementById('tab-system').classList.remove('hidden');
        renderSystemTab();
    } else if (id === 'rewards') {
        document.getElementById('tab-rewards').classList.remove('hidden');
        loadUserRewardsList();
    } else {
        // User Tab
        document.getElementById('tab-user-detail').classList.remove('hidden');
        renderUserTab(id); // 'fia' or 'collin'
    }
};

// System Actions
window.toggleMaintenance = async () => {
    adminConfig.maintenanceMode = !adminConfig.maintenanceMode;
    await syncConfig();
    renderSystemTab();
};

window.toggleAppVisibility = async (appId) => {
    adminConfig.appVisibility[appId] = !adminConfig.appVisibility[appId];
    await syncConfig();
    renderSystemTab();
};

// User Actions
window.actionToggleBan = async () => {
    if (!selectedUserId) return;
    if (selectedUserId === 'guest') return alert("Gast kann nicht gesperrt werden.");
    
    if (!adminConfig.userStatus[selectedUserId]) {
        adminConfig.userStatus[selectedUserId] = { role: 'user', banned: false };
    }
    adminConfig.userStatus[selectedUserId].banned = !adminConfig.userStatus[selectedUserId].banned;
    await syncConfig();
    renderUserTab(selectedUserId);
};

window.actionResetOnboarding = async () => {
    if (!selectedUserId) return;
    if (!confirm(`Intro für ${selectedUserId} zurücksetzen?`)) return;
    
    toggleLoading(true);
    if (cloud) {
        await cloud.adminResetOnboarding(selectedUserId);
        alert("Erledigt. Beim nächsten Login sieht der User das Intro.");
    } else {
        alert("Nur mit Cloud möglich.");
    }
    toggleLoading(false);
};

window.actionForceLogout = async () => {
    if (!selectedUserId) return;
    if (!confirm(`${selectedUserId} ausloggen?`)) return;
    
    toggleLoading(true);
    if (cloud) {
        await cloud.adminForceLogout(selectedUserId);
        alert("Logout Signal gesendet.");
    } else {
        alert("Nur mit Cloud möglich.");
    }
    toggleLoading(false);
};

// Reward Action
window.toggleReward = async (rId, uid) => {
    if (!userRewardsData) return;
    
    toggleLoading(true);
    
    // Toggle Logic
    let newVal = false;
    if (rId.startsWith('valentine.')) {
        newVal = !userRewardsData.valentine.unlocked[rId];
        userRewardsData.valentine.unlocked[rId] = newVal;
    } else {
        const curr = userRewardsData.rewards[rId]?.unlocked || false;
        newVal = !curr;
        if (!userRewardsData.rewards[rId]) userRewardsData.rewards[rId] = {};
        userRewardsData.rewards[rId].unlocked = newVal;
        if (newVal) userRewardsData.rewards[rId].unlockedAt = Date.now();
    }

    if (cloud) {
        await cloud.saveRewards(userRewardsData, uid);
    } else {
        // local save simulation
        localStorage.setItem(uid === 'guest' ? 'fiaos_rewards_guest' : `fiaos_rewards_${uid}`, JSON.stringify(userRewardsData));
    }
    
    await loadUserRewardsList(); // Refresh UI
    toggleLoading(false);
};

async function syncConfig() {
    if (cloud) {
        await cloud.saveAdminConfig(adminConfig);
    } else {
        localStorage.setItem('fiaos_global_admin_config', JSON.stringify(adminConfig));
    }
    // Broadcast
    if (window.parent.FIAOS_ADMIN_CONFIG_UPDATED) {
        window.parent.FIAOS_ADMIN_CONFIG_UPDATED(adminConfig);
    }
}

function toggleLoading(show) {
    const el = document.getElementById('loading');
    if (show) el.classList.remove('hidden'); else el.classList.add('hidden');
}

init();
