
/**
 * Settings App Logic
 */

const KEYS = {
    SESSION: 'fiaos_session',
    PROFILE_PREFIX: 'fiaos_user_', 
    PREFS_PREFIX: 'fiaos_user_',
    REWARDS_PREFIX: 'fiaos_rewards_'
};

let user = null;
let profileKey = '';
let prefsKey = '';
let rewardsKey = '';

let profile = {};
let prefs = {};
let userRewards = {};

// Themes Registry (synced with constants.ts logic)
const THEMES = [
    { id: 'roseGlass', name: 'Default', bg: '#2e1065', unlockId: null },
    { id: 'softRose', name: 'Soft Rose', bg: '#be185d', unlockId: 'love_1_month' },
    { id: 'midnightLove', name: 'Midnight', bg: '#1e1b4b', unlockId: 'love_3_month' },
    { id: 'pastelSky', name: 'Pastel Sky', bg: '#7dd3fc', text:'#333', unlockId: 'love_6_month' },
    { id: 'eternal', name: 'Eternal', bg: '#713f12', unlockId: 'love_1_year' },
    // Legacy mapping support
    { id: 'midnight', name: 'Dark Mode', bg: '#000', unlockId: null },
    { id: 'cloud', name: 'Cloud', bg: '#e7f0fd', text: '#333', unlockId: null },
    { id: 'matcha', name: 'Matcha', bg: '#d4fc79', text: '#064e3b', unlockId: null }
];

function init() {
    const sessionStr = localStorage.getItem(KEYS.SESSION);
    if (!sessionStr) return;
    user = JSON.parse(sessionStr);

    const prefix = user.role === 'guest' ? 'fiaos_guest_' : 'fiaos_user_';
    profileKey = `${prefix}${user.id}_profile`;
    prefsKey = `${prefix}${user.id}_prefs`;
    rewardsKey = `${KEYS.REWARDS_PREFIX}${user.id}`;

    loadData();
    renderUI();

    // Dev Section Visibility Rule: Visible to all, but disabled if not admin
    const isAdmin = user.role === 'admin' || user.role === 'developer';
    const devBtns = document.querySelectorAll('.dev-btn');
    devBtns.forEach(btn => {
        btn.disabled = !isAdmin;
    });
}

function loadData() {
    // Profile
    const pStr = localStorage.getItem(profileKey);
    if (pStr) profile = JSON.parse(pStr);
    else {
        profile = {
            userId: user.id,
            role: user.role,
            displayName: user.name,
            avatar: { type: 'emoji', value: user.name.charAt(0) }
        };
    }

    // Prefs
    const prStr = localStorage.getItem(prefsKey);
    if (prStr) prefs = JSON.parse(prStr);
    else {
        prefs = {
            theme: 'roseGlass',
            accent: '#818cf8',
            wallpaper: 'gradient_1',
            reduceMotion: false
        };
    }

    // Rewards (to check unlocks)
    // Note: Settings app reads local rewards cache for UI speed.
    // Sync happens in OS (App.tsx).
    const rStr = localStorage.getItem(rewardsKey);
    if (rStr) userRewards = JSON.parse(rStr);
    else userRewards = { rewards: {} };
}

function renderUI() {
    // Account
    document.getElementById('avatarPreview').innerText = profile.avatar.value;
    document.getElementById('inpName').value = profile.displayName;
    document.getElementById('valRole').innerText = profile.role;

    // Look
    renderThemes();
    renderAccents();
    
    // Toggles
    const tMotion = document.getElementById('toggleMotion');
    if (prefs.reduceMotion) tMotion.classList.add('active');
    else tMotion.classList.remove('active');
}

function renderThemes() {
    const grid = document.getElementById('themeGrid');
    grid.innerHTML = '';
    
    THEMES.forEach(t => {
        const isUnlocked = !t.unlockId || (userRewards.rewards && userRewards.rewards[t.unlockId]?.unlocked);
        
        const div = document.createElement('div');
        div.className = `theme-card ${prefs.theme === t.id ? 'selected' : ''} ${!isUnlocked ? 'locked' : ''}`;
        div.style.background = t.bg;
        div.style.color = t.text || '#fff';
        
        if (isUnlocked) {
            div.innerText = t.name;
            div.onclick = () => setTheme(t.id);
        } else {
            div.innerHTML = `<span style="opacity:0.6">🔒</span><span style="font-size:10px; opacity:0.6; margin-left:4px;">Locked</span>`;
            div.style.cursor = 'not-allowed';
            div.title = `Benötigt: ${t.unlockId}`;
        }
        
        grid.appendChild(div);
    });
}

function renderAccents() {
    const swatches = document.querySelectorAll('.color-swatch');
    swatches.forEach(s => s.classList.remove('selected'));
}

// --- Actions ---

function saveProfile() {
    const name = document.getElementById('inpName').value;
    if (name) profile.displayName = name;
    localStorage.setItem(profileKey, JSON.stringify(profile));
    if (window.parent.FIAOS_PROFILE_UPDATED) {
        window.parent.FIAOS_PROFILE_UPDATED(profile);
    }
}

function promptAvatar() {
    const newEmoji = prompt("Neues Avatar Emoji:", profile.avatar.value);
    if (newEmoji) {
        profile.avatar = { type: 'emoji', value: newEmoji };
        saveProfile();
        renderUI();
    }
}

function savePrefs() {
    localStorage.setItem(prefsKey, JSON.stringify(prefs));
    if (window.parent.FIAOS_APPLY_PREFS) {
        window.parent.FIAOS_APPLY_PREFS(prefs);
    }
    renderUI();
}

window.setTheme = (id) => {
    prefs.theme = id;
    savePrefs();
};

window.setAccent = (hex) => {
    prefs.accent = hex;
    savePrefs();
};

window.toggleMotion = () => {
    prefs.reduceMotion = !prefs.reduceMotion;
    savePrefs();
};

// Data
window.exportData = () => {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k.startsWith('fiaos_')) {
            data[k] = JSON.parse(localStorage.getItem(k));
        }
    }
    const str = JSON.stringify(data, null, 2);
    navigator.clipboard.writeText(str).then(() => alert("Kopiert!"));
};

window.resetData = () => {
    if (confirm("Wirklich ALLES lokal löschen?")) {
        localStorage.clear();
        window.parent.location.reload();
    }
};

// Dev
window.devUnlockRewards = () => {
    if (window.parent.FIAOS_DEBUG) {
        window.parent.FIAOS_DEBUG.unlockAll();
        setTimeout(() => {
            loadData();
            renderUI();
            alert("Rewards Unlocked (Local)");
        }, 500);
    }
};

window.devResetLuna = async () => {
    if (!confirm("Luna Reset: Status wird auf Standard zurückgesetzt.")) return;

    if (user.role === 'guest') {
        localStorage.removeItem('fiaos_guest_luna_state');
        alert("Luna Local State removed.");
        return;
    }

    if (window.parent.FIAOS && window.parent.FIAOS.cloud) {
        try {
            await window.parent.FIAOS.cloud.updateLuna({
                stats: { hunger: 50, energy: 50, hygiene: 50, fun: 50, love: 50 },
                mood: 'happy',
                streak: { count: 0 },
                history: []
            });
            alert("Luna Cloud State reset.");
        } catch (e) {
            alert("Fehler beim Cloud Reset: " + e.message);
        }
    }
};

init();
