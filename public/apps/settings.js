
/**
 * Account Settings Logic
 */

const KEYS = { SESSION: 'fiaos_session' };
const PREFS_KEY = (uid) => `fiaos_user_${uid}_prefs`; 
const PROFILE_KEY = (uid) => `fiaos_user_${uid}_profile`;

let user = null;
let prefs = {};
let profile = {};
let rewards = null; // New: Load rewards to check locks
let cloud = null;

// Emojis for Avatar Picker
const AVATAR_EMOJIS = ["👽", "🦊", "🐱", "🐶", "🦁", "🐯", "🐨", "🐼", "🐻", "🐰", "🐹", "🐭", "🦄", "🦋", "🍄", "🌺", "🌸", "🌼", "⚡", "🔥", "💧", "❄️", "🌟", "🌙", "🌍", "🪐", "🍕", "🍔", "🍟", "🍩"];

// Themes Defs (Visual) - Added unlock conditions
const THEMES_UI = [
    { id: 'roseGlass', name: 'Default', color: '#2e1065', unlockRewardId: null },
    { id: 'aurora', name: 'Aurora', color: '#2b5876', unlockRewardId: 'reward.welcomeTheme' },
    { id: 'softRose', name: 'Soft Rose', color: '#be185d', unlockRewardId: 'love_1_month' },
    { id: 'midnightLove', name: 'Midnight', color: '#1e1b4b', unlockRewardId: 'love_3_month' },
    { id: 'pastelSky', name: 'Pastel', color: '#7dd3fc', unlockRewardId: 'love_6_month' },
    { id: 'eternal', name: 'Eternal', color: '#713f12', unlockRewardId: 'love_1_year' },
    { id: 'royal', name: 'Royal', color: '#d97706', unlockRewardId: 'daily.points100' },
    { id: 'custom', name: 'Eigene', color: '#333', unlockRewardId: 'custom_theme_unlock' }
];

function init() {
    const s = localStorage.getItem(KEYS.SESSION);
    if (!s) return;
    user = JSON.parse(s);

    if (window.parent.FIAOS && window.parent.FIAOS.cloud) {
        cloud = window.parent.FIAOS.cloud;
    }

    loadEverything();
    updateStatus();
    setInterval(updateStatus, 5000);
}

async function loadEverything() {
    // 1. Prefs & Profile & Rewards
    if (user.role === 'guest') {
        const pStr = localStorage.getItem(PREFS_KEY('guest'));
        prefs = pStr ? JSON.parse(pStr) : defaultPrefs();
        
        const profStr = localStorage.getItem('fiaos_guest_guest_profile');
        profile = profStr ? JSON.parse(profStr) : defaultProfile();

        const rewStr = localStorage.getItem('fiaos_rewards_guest');
        rewards = rewStr ? JSON.parse(rewStr) : null;
    } else {
        if (cloud) {
            const cPrefs = await cloud.loadPrefs();
            prefs = cPrefs || defaultPrefs();
            
            const cProf = await cloud.loadProfile();
            profile = cProf || defaultProfile();

            rewards = await cloud.loadRewards();
        } else {
            prefs = defaultPrefs();
            profile = defaultProfile();
        }
    }
    
    renderUI();
}

function defaultPrefs() {
    return {
        theme: 'roseGlass',
        accent: '#818cf8',
        wallpaper: 'gradient_1',
        reduceMotion: false,
        uiDensity: 'cozy',
        quickstartMode: 'lastApp',
        quickstartApp: ''
    };
}

function defaultProfile() {
    return {
        userId: user.id,
        role: user.role,
        displayName: user.name,
        avatar: { type: 'emoji', value: user.name.charAt(0) },
        createdAt: Date.now(),
        updatedAt: Date.now()
    };
}

// --- Render ---

function renderUI() {
    // Profile
    document.getElementById('avatarDisplay').innerText = profile.avatar?.value || '👤';
    document.getElementById('nameInput').value = profile.displayName || user.name;

    // Themes
    const tList = document.getElementById('themeList');
    tList.innerHTML = THEMES_UI.map(t => {
        // Unlock check: generic rewards OR valentine rewards
        const isUnlocked = !t.unlockRewardId || 
                           (rewards?.rewards?.[t.unlockRewardId]?.unlocked) || 
                           (rewards?.valentine?.unlocked?.[t.unlockRewardId]);
                           
        const activeClass = prefs.theme === t.id ? 'active' : '';
        const lockHtml = !isUnlocked ? '<div style="position:absolute; inset:0; background:rgba(0,0,0,0.6); display:flex; justify-content:center; align-items:center; font-size:24px;">🔒</div>' : '';
        const onclick = !isUnlocked ? `alert('Erst freischalten!')` : `setTheme('${t.id}')`;
        
        return `
        <div class="theme-opt ${activeClass}" onclick="${onclick}">
            <div class="theme-preview" style="background:${t.color}">
                ${lockHtml}
            </div>
            <div class="theme-name">${t.name}</div>
        </div>
    `}).join('');

    // Custom Upload Visibility
    const uploadDiv = document.getElementById('customUpload');
    if (prefs.theme === 'custom') uploadDiv.classList.add('visible');
    else uploadDiv.classList.remove('visible');

    // Behavior
    const tog = document.getElementById('toggleMotion');
    if (prefs.reduceMotion) tog.classList.add('active'); else tog.classList.remove('active');

    // Quickstart
    const sel = document.getElementById('quickstartSelect');
    const label = document.getElementById('quickstartVal');
    
    if (prefs.quickstartMode === 'lastApp') {
        sel.value = 'lastApp';
        label.innerText = "Zuletzt geöffnet";
    } else {
        sel.value = prefs.quickstartApp || 'luna';
        const opt = sel.querySelector(`option[value="${sel.value}"]`);
        label.innerText = opt ? opt.innerText : "App";
    }
}

function updateStatus() {
    const dot = document.getElementById('statusDot');
    const txt = document.getElementById('statusText');
    
    if (user.role === 'guest') {
        dot.className = 'status-dot offline';
        txt.innerText = "Lokal gespeichert (Gast)";
        return;
    }

    if (cloud) {
        dot.className = 'status-dot';
        txt.innerText = "Cloud Synchronisiert";
    } else {
        dot.className = 'status-dot offline';
        txt.innerText = "Offline";
    }
}

// --- Actions ---

window.saveProfile = async () => {
    const name = document.getElementById('nameInput').value.trim();
    if (name) profile.displayName = name;
    
    if (window.parent.FIAOS_PROFILE_UPDATED) {
        window.parent.FIAOS_PROFILE_UPDATED(profile);
    }
    
    if (user.role === 'guest') {
        localStorage.setItem('fiaos_guest_guest_profile', JSON.stringify(profile));
    } else if (cloud) {
        await cloud.saveProfile(profile);
    }
};

window.setTheme = async (id) => {
    prefs.theme = id;
    applyPrefs();
};

window.uploadWallpaper = () => {
    const input = document.getElementById('bgInput');
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            // Save to LocalStorage (Browser specific)
            try {
                localStorage.setItem('fiaos_wallpaper_custom', e.target.result);
                alert("Bild gespeichert! (Nur dieses Gerät)");
                applyPrefs(); // Force refresh in parent
            } catch(err) {
                alert("Bild zu groß für Speicher! Bitte kleineres Bild wählen.");
            }
        };
        reader.readAsDataURL(input.files[0]);
    }
};

window.toggleMotion = () => {
    prefs.reduceMotion = !prefs.reduceMotion;
    applyPrefs();
};

window.saveQuickstart = () => {
    const val = document.getElementById('quickstartSelect').value;
    if (val === 'lastApp') {
        prefs.quickstartMode = 'lastApp';
        prefs.quickstartApp = '';
    } else {
        prefs.quickstartMode = 'fixed';
        prefs.quickstartApp = val;
    }
    applyPrefs();
};

async function applyPrefs() {
    renderUI();
    
    if (window.parent.FIAOS_APPLY_PREFS) {
        window.parent.FIAOS_APPLY_PREFS(prefs);
    }

    if (user.role === 'guest') {
        localStorage.setItem(PREFS_KEY('guest'), JSON.stringify(prefs));
    } else if (cloud) {
        await cloud.savePrefs(prefs);
    }
}

// --- Emoji Picker ---

window.openEmojiPicker = () => {
    const grid = document.getElementById('emojiGrid');
    grid.innerHTML = AVATAR_EMOJIS.map(e => `
        <div class="emoji-opt" onclick="pickEmoji('${e}')">${e}</div>
    `).join('');
    document.getElementById('emojiModal').classList.add('open');
};

window.closeEmojiPicker = (e) => {
    if (e.target.id === 'emojiModal') {
        document.getElementById('emojiModal').classList.remove('open');
    }
};

window.pickEmoji = (char) => {
    profile.avatar = { type: 'emoji', value: char };
    document.getElementById('emojiModal').classList.remove('open');
    renderUI();
    window.saveProfile();
};

init();
