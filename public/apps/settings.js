
const KEYS = { SESSION: 'fiaos_session', PREFS_PREFIX: 'fiaos_user_' };
let user = null;
let prefs = {};

function init() {
    const s = localStorage.getItem(KEYS.SESSION);
    if (!s) return;
    user = JSON.parse(s);
    const prefix = user.role === 'guest' ? 'fiaos_guest_' : 'fiaos_user_';
    
    // Load local first for speed
    const pStr = localStorage.getItem(`${prefix}${user.id}_prefs`);
    prefs = pStr ? JSON.parse(pStr) : { theme: 'roseGlass', accent: '#818cf8', reduceMotion: false };
    
    renderUI();
}

function savePrefs() {
    const prefix = user.role === 'guest' ? 'fiaos_guest_' : 'fiaos_user_';
    localStorage.setItem(`${prefix}${user.id}_prefs`, JSON.stringify(prefs));
    
    // Send to OS to sync with Cloud
    if (window.parent.FIAOS_APPLY_PREFS) {
        window.parent.FIAOS_APPLY_PREFS(prefs);
    }
    renderUI();
}

function renderUI() {
    document.querySelectorAll('.theme-card').forEach(el => {
        el.classList.toggle('selected', el.innerText === getThemeName(prefs.theme));
    });
    const tog = document.getElementById('toggleMotion');
    if (tog) {
        if (prefs.reduceMotion) tog.classList.add('active'); else tog.classList.remove('active');
    }
}

function getThemeName(id) {
    const map = { roseGlass: 'Default', softRose: 'Soft Rose', midnightLove: 'Midnight', pastelSky: 'Pastel Sky', eternal: 'Eternal' };
    return map[id] || 'Default';
}

window.setTheme = (id) => { prefs.theme = id; savePrefs(); };
window.setAccent = (hex) => { prefs.accent = hex; savePrefs(); };
window.toggleMotion = () => { prefs.reduceMotion = !prefs.reduceMotion; savePrefs(); };

// Render logic for grid omitted for brevity, assumes HTML structure exists
// ...

init();
