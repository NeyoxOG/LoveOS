/**
 * Settings App Logic
 */

const KEYS = {
    SESSION: 'fiaos_session',
    PROFILE_PREFIX: 'fiaos_user_', // or fiaos_guest_
    PREFS_PREFIX: 'fiaos_user_'
};

let user = null;
let profileKey = '';
let prefsKey = '';

let profile = {};
let prefs = {};

// Default Themes
const THEMES = [
    { id: 'roseGlass', name: 'Rose', bg: '#2e1065' },
    { id: 'midnight', name: 'Night', bg: '#000' },
    { id: 'cloud', name: 'Cloud', bg: '#e7f0fd', text: '#333' },
    { id: 'matcha', name: 'Matcha', bg: '#d4fc79', text: '#064e3b' }
];

function init() {
    // 1. Get Session
    const sessionStr = localStorage.getItem(KEYS.SESSION);
    if (!sessionStr) return;
    user = JSON.parse(sessionStr);

    const prefix = user.role === 'guest' ? 'fiaos_guest_' : 'fiaos_user_';
    profileKey = `${prefix}${user.id}_profile`;
    prefsKey = `${prefix}${user.id}_prefs`;

    // 2. Load Data
    loadData();

    // 3. Render
    renderUI();

    // 4. Admin Check
    if (user.role === 'admin') {
        document.getElementById('devSection').classList.remove('hidden');
    }
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
        const div = document.createElement('div');
        div.className = `theme-card ${prefs.theme === t.id ? 'selected' : ''}`;
        div.style.background = t.bg;
        div.style.color = t.text || '#fff';
        div.innerText = t.name;
        div.onclick = () => setTheme(t.id);
        grid.appendChild(div);
    });
}

function renderAccents() {
    const swatches = document.querySelectorAll('.color-swatch');
    swatches.forEach(s => {
        // Simple check by converting rgb to hex is hard, checking logic roughly
        // Just remove selected class first
        s.classList.remove('selected');
        // If inline style matches (approx)
        // Ignoring exact visual match for simplicity in vanilla JS without hex conversion lib
    });
}

// --- Actions ---

function saveProfile() {
    const name = document.getElementById('inpName').value;
    if (name) profile.displayName = name;
    
    localStorage.setItem(profileKey, JSON.stringify(profile));
    
    // Notify OS
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
    
    // Notify OS
    if (window.parent.FIAOS_APPLY_PREFS) {
        window.parent.FIAOS_APPLY_PREFS(prefs);
    }
    renderUI();
}

// Pref Setters
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
        alert("Rewards Unlocked");
    }
};

window.devResetLuna = () => {
    if (window.parent.LUNA_DEBUG) {
        // This won't work cross-frame directly unless exposed differently
        // But we can delete the key manually
        const key = user.role === 'guest' ? 'fiaos_guest_luna_state' : 'fiaos_pair_room_main';
        localStorage.removeItem(key);
        alert("Luna State removed.");
    } else {
        const key = user.role === 'guest' ? 'fiaos_guest_luna_state' : 'fiaos_pair_room_main';
        localStorage.removeItem(key);
        alert("Luna State removed.");
    }
};

// Start
init();