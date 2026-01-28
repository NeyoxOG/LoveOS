
/**
 * AdminOS Logic v2.8 (Fixed Rewards List & Maintenance)
 */

const KEYS = { SESSION: 'fiaos_session' };

let currentUser = null;
let adminConfig = null;
let cloud = null;
let selectedUserId = null;
let userRewardsData = null; 

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
    { id: 'settings', name: 'Settings', icon: '⚙️' },
    { id: 'story', name: 'Story', icon: '🎞️' },
    { id: 'bucket', name: 'Ziele', icon: '📍' }
];

// FULL CATALOG - Copy from constants.ts to ensure Admin sees EVERYTHING
const FULL_REWARD_CATALOG = [
    // General
    { id: 'reward.welcome', title: 'Willkommen' },
    { id: 'reward.firstLogin', title: 'Erster Login' },
    { id: 'reward.firstAppOpen', title: 'Erste App' },
    { id: 'reward.firstReward', title: 'Erster Erfolg' },
    { id: 'reward.streak3', title: '3 Tage da' },
    { id: 'reward.secretLove', title: 'Secret Love' },
    { id: 'reward.welcomeTheme', title: 'Theme: Aurora' },
    { id: 'custom_theme_unlock', title: 'Theme: Custom' },

    // Valentine
    { id: 'valentine.reward.pizza', title: 'Val: Pizza' },
    { id: 'valentine.reward.photo', title: 'Val: Foto' },
    { id: 'valentine.reward.letter', title: 'Val: Brief' },
    { id: 'valentine.reward.care', title: 'Val: Care Day' },
    { id: 'valentine.reward.art', title: 'Val: Malen' },
    { id: 'valentine.reward.secret', title: 'Val: Secret' },

    // Games
    { id: 'games.stack.10', title: 'Stack: 10' },
    { id: 'games.stack.50', title: 'Stack: 50' },
    { id: 'games.stack.100', title: 'Stack: 100' },
    { id: 'games.react.first', title: 'Reflex: First' },
    { id: 'games.react.combo10', title: 'Reflex: Combo 10' },
    { id: 'games.react.200', title: 'Reflex: 200 Pts' },
    { id: 'games.block.starter', title: 'Block: 500' },
    { id: 'games.block.master', title: 'Block: 1500' },
    { id: 'games.block.combo', title: 'Block: Combo' },
    { id: 'games.puzzle.solve', title: 'Puzzle: Solved' },
    { id: 'games.puzzle.sub60', title: 'Puzzle: <60s' },
    { id: 'games.puzzle.sub40', title: 'Puzzle: <40s' },
    { id: 'snake_score_10', title: 'Snake: 10' },
    { id: 'snake_score_25', title: 'Snake: 25' },
    { id: 'snake_score_50', title: 'Snake: 50' },
    { id: 'snake.survival', title: 'Snake: Survival' },
    { id: 'flappy_score_5', title: 'Flappy: 5' },
    { id: 'flappy_score_15', title: 'Flappy: 15' },
    { id: 'flappy_score_30', title: 'Flappy: 30' },

    // Diary
    { id: 'diary.first', title: 'Diary: First' },
    { id: 'diary.shared', title: 'Diary: Shared' },
    { id: 'diary.streak3', title: 'Diary: 3 Days' },
    { id: 'diary.10', title: 'Diary: 10 Entries' },
    { id: 'diary.30', title: 'Diary: 30 Entries' },

    // Bucket
    { id: 'bucket.first', title: 'Bucket: Erstellt' },
    { id: 'bucket.done1', title: 'Bucket: Erledigt' },

    // Daily
    { id: 'daily.first', title: 'Daily: First' },
    { id: 'daily.streak3', title: 'Daily: 3 Streak' },
    { id: 'daily.streak7', title: 'Daily: 7 Streak' },
    { id: 'daily.total10', title: 'Daily: 10 Total' },
    { id: 'daily.points100', title: 'Daily: 100 Pts (Royal)' },

    // Love
    { id: 'love_1_month', title: 'Love: 1 Monat' },
    { id: 'love_3_month', title: 'Love: 3 Monate' },
    { id: 'love_6_month', title: 'Love: 6 Monate' },
    { id: 'love_1_year', title: 'Love: 1 Jahr' },
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
            // Fallback for totally offline scenarios
            adminConfig = JSON.parse(localStorage.getItem('fiaos_global_admin_config') || '{}');
            document.getElementById('cloudStatusTxt').innerText = "Offline Mode";
        }

        // Initialize missing structure
        if (!adminConfig) adminConfig = { appVisibility: {}, userStatus: {}, maintenanceMode: false };
        if (!adminConfig.appVisibility) adminConfig.appVisibility = {};
        if (!adminConfig.userStatus) adminConfig.userStatus = {};

        renderSystemTab();
    } catch(e) {
        console.error(e);
        alert("Fehler beim Laden der Admin Config.");
    }
    toggleLoading(false);
}

// --- Renderers ---

function renderSystemTab() {
    const maintToggle = document.getElementById('dashMaintToggle');
    // Ensure accurate visual state
    if (adminConfig.maintenanceMode) maintToggle.classList.add('active');
    else maintToggle.classList.remove('active');

    const grid = document.getElementById('appsGrid');
    grid.innerHTML = '';
    APP_DEFS.forEach(app => {
        if (app.id === 'settings') return;
        // Default to true if undefined
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
    
    // Ensure user status obj exists
    if (!adminConfig.userStatus[uid]) {
        adminConfig.userStatus[uid] = { role: 'user', banned: false };
    }

    const isBanned = adminConfig.userStatus[uid]?.banned;
    const banToggle = document.getElementById('uDetailBanToggle');
    if (isBanned) banToggle.classList.add('active'); else banToggle.classList.remove('active');
    
    // Load Daily Stats
    loadDailyStats(uid);
}

async function loadDailyStats(uid) {
    if (!cloud) return;
    try {
        const daily = await cloud.adminGetData(uid, 'daily_state');
        if (daily) {
            document.getElementById('inpStreak').value = daily.streak || 0;
            document.getElementById('inpPoints').value = daily.points || 0;
        } else {
            document.getElementById('inpStreak').value = 0;
            document.getElementById('inpPoints').value = 0;
        }
    } catch (e) {
        console.error("Failed to load daily stats", e);
    }
}

async function loadUserRewardsList() {
    const uid = document.getElementById('rewardUserSelect').value;
    const container = document.getElementById('rewardsListContainer');
    container.innerHTML = '<div style="padding:20px; text-align:center;">Lade...</div>';
    
    try {
        if (cloud) {
            userRewardsData = await cloud.loadRewards(uid);
        } else {
            userRewardsData = JSON.parse(localStorage.getItem(uid === 'guest' ? 'fiaos_rewards_guest' : `fiaos_rewards_${uid}`) || 'null');
        }

        if (!userRewardsData) {
            // Falls keine Daten da sind (User war nie eingeloggt), erstelle Dummy für Admin
            userRewardsData = { rewards: {}, valentine: { unlocked: {} } };
        }

        container.innerHTML = '';
        
        // Loop through the FULL catalog
        FULL_REWARD_CATALOG.forEach(r => {
            let unlocked = false;
            // Robust check
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
                    <span style="font-size:13px;">${r.title}</span>
                </div>
                <div class="toggle ${unlocked ? 'active' : ''}" onclick="toggleReward('${r.id}', '${uid}')"></div>
            `;
            container.appendChild(div);
        });

    } catch(e) {
        console.error(e);
        container.innerHTML = '<div style="padding:20px; text-align:center;">Fehler beim Laden.</div>';
    }
}

// --- Actions ---

window.switchTab = (id, idx) => {
    document.querySelectorAll('.segment-btn').forEach((b, i) => {
        if (i === idx) b.classList.add('active'); else b.classList.remove('active');
    });
    document.getElementById('segIndicator').style.transform = `translateX(${idx * 100}%)`;

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
        document.getElementById('tab-user-detail').classList.remove('hidden');
        renderUserTab(id);
    }
};

window.toggleMaintenance = async () => {
    toggleLoading(true);
    try {
        adminConfig.maintenanceMode = !adminConfig.maintenanceMode;
        await syncConfig();
        // Give time for Cloud latency if any
        setTimeout(() => {
            renderSystemTab();
            toggleLoading(false);
        }, 500);
    } catch(e) {
        alert("Error saving config");
        toggleLoading(false);
    }
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

window.actionResetUser = async () => {
    if (!selectedUserId) return;
    const confirmCode = Math.floor(1000 + Math.random() * 9000);
    const input = prompt(`WARNUNG: Dies setzt den User KOMPLETT zurück (Rewards, Diary, etc.).\nBestätigen mit Code: ${confirmCode}`);
    
    if (input == confirmCode) {
        toggleLoading(true);
        if (cloud) {
            await cloud.adminResetUser(selectedUserId);
            alert("User wurde zurückgesetzt.");
            renderUserTab(selectedUserId);
        } else {
            alert("Offline Reset nicht implementiert.");
        }
        toggleLoading(false);
    }
};

window.actionForceLogout = async () => {
    if (!selectedUserId || !cloud) return;
    await cloud.adminForceLogout(selectedUserId);
    alert("Force Logout Signal gesendet.");
}

window.actionSaveDaily = async () => {
    if (!selectedUserId || !cloud) return;
    const streak = parseInt(document.getElementById('inpStreak').value, 10);
    const points = parseInt(document.getElementById('inpPoints').value, 10);
    
    if (isNaN(streak) || isNaN(points)) {
        alert("Bitte gültige Zahlen eingeben.");
        return;
    }

    toggleLoading(true);
    await cloud.adminSetData(selectedUserId, 'daily_state', { streak, points });
    toggleLoading(false);
    alert("Daily Stats gespeichert.");
};

// Reward Action
window.toggleReward = async (rId, uid) => {
    if (!userRewardsData) return;
    
    // Optimistic UI Update not done here to ensure consistency, show loading
    toggleLoading(true);
    
    let newVal = false;
    if (rId.startsWith('valentine.')) {
        // Ensure structure
        if (!userRewardsData.valentine) userRewardsData.valentine = { total: 0, unlocked: {}, completedAt: null };
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

    if (cloud) await cloud.saveRewards(userRewardsData, uid);
    else localStorage.setItem(uid === 'guest' ? 'fiaos_rewards_guest' : `fiaos_rewards_${uid}`, JSON.stringify(userRewardsData));
    
    await loadUserRewardsList();
    toggleLoading(false);
};

async function syncConfig() {
    // Save to Cloud
    if (cloud) await cloud.saveAdminConfig(adminConfig);
    // Also save to LocalStorage for immediate fallback/speed
    localStorage.setItem('fiaos_global_admin_config', JSON.stringify(adminConfig));
    
    // Notify Parent (App.tsx) to update state
    if (window.parent.FIAOS_ADMIN_CONFIG_UPDATED) window.parent.FIAOS_ADMIN_CONFIG_UPDATED(adminConfig);
}

function toggleLoading(show) {
    const el = document.getElementById('loading');
    if (show) el.classList.remove('hidden'); else el.classList.add('hidden');
}

init();
