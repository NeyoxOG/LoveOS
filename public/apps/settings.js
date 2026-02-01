
/**
 * Account Settings Logic
 */

const KEYS = { SESSION: 'fiaos_session' };

// Key generator MUST match utils/data.ts
const PREFS_KEY = (uid) => {
    return uid === 'guest' ? 'fiaos_guest_guest_prefs' : `fiaos_user_${uid}_prefs`;
};
const PROFILE_KEY = (uid) => {
    return uid === 'guest' ? 'fiaos_guest_guest_profile' : `fiaos_user_${uid}_profile`;
};

let user = null;
let prefs = {};
let profile = {};
let rewards = null; // New: Load rewards to check locks
let cloud = null;

// Emojis for Avatar Picker
const AVATAR_EMOJIS = ["👽", "🦊", "🐱", "🐶", "🦁", "🐯", "🐨", "🐼", "🐻", "🐰", "🐹", "🐭", "🦄", "🦋", "🍄", "🌺", "🌸", "🌼", "⚡", "🔥", "💧", "❄️", "🌟", "🌙", "🌍", "🪐", "🍕", "🍔", "🍟", "🍩"];

// Themes Defs (Visual) - Exact match with constants.ts
const THEMES_UI = [
    { id: 'roseGlass', name: 'Rose Glass', preview: 'radial-gradient(circle at top, rgba(236, 72, 153, 0.25), transparent 55%), linear-gradient(145deg, #1b0f2f 0%, #0a0615 55%, #05030d 100%)', unlockRewardId: null },
    { id: 'aurora', name: 'Aurora Drift', preview: 'radial-gradient(circle at top right, rgba(56, 189, 248, 0.45), transparent 60%), radial-gradient(circle at left, rgba(14, 165, 233, 0.25), transparent 50%), linear-gradient(140deg, #0b1023 0%, #111827 45%, #0f172a 100%)', unlockRewardId: 'reward.welcomeTheme' },
    { id: 'softRose', name: 'Soft Rose', preview: 'radial-gradient(circle at top, rgba(251, 113, 133, 0.45), transparent 60%), linear-gradient(150deg, #831843 0%, #be123c 50%, #4c0519 100%)', unlockRewardId: 'love_1_month' },
    { id: 'midnightLove', name: 'Midnight Love', preview: 'radial-gradient(circle at top, rgba(99, 102, 241, 0.4), transparent 60%), linear-gradient(180deg, #0b1020 0%, #1e1b4b 50%, #2e1065 100%)', unlockRewardId: 'love_3_month' },
    { id: 'pastelSky', name: 'Pastel Sky', preview: 'linear-gradient(150deg, #bae6fd 0%, #fef3c7 45%, #fbcfe8 100%)', unlockRewardId: 'love_6_month' },
    { id: 'eternal', name: 'Eternal Gold', preview: 'radial-gradient(circle at top, rgba(251, 191, 36, 0.45), transparent 60%), linear-gradient(150deg, #92400e 0%, #713f12 45%, #3f1a06 100%)', unlockRewardId: 'love_1_year' },
    { id: 'royal', name: 'Royal Gold', preview: 'radial-gradient(circle at top right, rgba(253, 224, 71, 0.35), transparent 60%), linear-gradient(135deg, #3b0764 0%, #7c2d12 50%, #451a03 100%)', unlockRewardId: 'daily.points100' },
    { id: 'custom', name: 'Eigene', preview: '#111827', unlockRewardId: 'custom_theme_unlock' }
];

function init() {
    const s = localStorage.getItem(KEYS.SESSION);
    if (!s) return;
    user = JSON.parse(s);
    user.id = user.id || user.userId;

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
        
        const profStr = localStorage.getItem(PROFILE_KEY('guest'));
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
            // Local fallback for non-guest (unlikely but safe)
            const pStr = localStorage.getItem(PREFS_KEY(user.id));
            prefs = pStr ? JSON.parse(pStr) : defaultPrefs();
            
            const profStr = localStorage.getItem(PROFILE_KEY(user.id));
            profile = profStr ? JSON.parse(profStr) : defaultProfile();
            
            const rewStr = localStorage.getItem(`fiaos_rewards_${user.id}`);
            rewards = rewStr ? JSON.parse(rewStr) : null;
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
        // Unlock check
        const isUnlocked = !t.unlockRewardId || 
                           (rewards?.rewards?.[t.unlockRewardId]?.unlocked) || 
                           (rewards?.valentine?.unlocked?.[t.unlockRewardId]);
                           
        const activeClass = prefs.theme === t.id ? 'active' : '';
        const lockHtml = !isUnlocked ? '<div style="position:absolute; inset:0; background:rgba(0,0,0,0.6); display:flex; justify-content:center; align-items:center; font-size:24px;">🔒</div>' : '';
        const onclick = !isUnlocked ? `alert('Erst freischalten!')` : `setTheme('${t.id}')`;
        
        return `
        <div class="theme-opt ${activeClass}" onclick="${onclick}">
            <div class="theme-preview" style="background:${t.preview}">
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
        // Need to wait for DOM or just use logic
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
        localStorage.setItem(PROFILE_KEY('guest'), JSON.stringify(profile));
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
            try {
                localStorage.setItem('fiaos_wallpaper_custom', e.target.result);
                alert("Bild gespeichert! (Nur dieses Gerät)");
                applyPrefs(); 
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
        // Send a deep copy to ensure React state update works
        window.parent.FIAOS_APPLY_PREFS(JSON.parse(JSON.stringify(prefs)));
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
