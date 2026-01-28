
/**
 * Luna v2 Logic (Cloud Enabled)
 */

const KEYS = { SESSION: 'fiaos_session' };
const COOLDOWNS = { feed: 300000, play: 120000, care: 600000, sleep: 1800000, love: 45000 };

let user = null;
let state = null;
let cloud = null;

function init() {
    const sessionStr = localStorage.getItem(KEYS.SESSION);
    if (!sessionStr) return;
    user = JSON.parse(sessionStr);

    if (window.parent.FIAOS && window.parent.FIAOS.cloud) {
        cloud = window.parent.FIAOS.cloud;
    }

    loadState();
    setInterval(tick, 1000);
    setInterval(saveState, 5000);
}

async function loadState() {
    state = await cloud.loadLuna();
    if (!state) state = { stats: { hunger: 50, energy: 50, hygiene: 50, fun: 50, love: 50 }, mood: 'happy', lastActions: {}, streak: {count:0}, history: [] };
    
    // Safety check for history
    if (!Array.isArray(state.history)) state.history = [];
    
    const today = new Date().toISOString().split('T')[0];
    if (!state.daily) state.daily = {};
    if (state.daily.dayKey !== today) {
        if (!state.daily.fedToday) state.stats.love = Math.max(0, state.stats.love - 20);
        state.daily.fedToday = false;
        state.daily.dayKey = today;
    }
    render();
}

async function saveState() {
    if (state) await cloud.updateLuna(state);
}

function tick() {
    if (!state) return;
    state.stats.hunger = Math.max(0, state.stats.hunger - 0.003);
    state.stats.energy = Math.max(0, state.stats.energy - 0.002);
    updateMood();
    render();
}

function updateMood() {
    let m = 'happy';
    if (state.stats.hunger < 30) m = 'hungry';
    else if (state.stats.energy < 20) m = 'tired';
    else if (state.stats.love > 80) m = 'loved';
    state.mood = m;
}

function performAction(type) {
    if (!state) return;
    const now = Date.now();
    if (now - (state.lastActions[type] || 0) < COOLDOWNS[type]) { showToast("Luna braucht eine Pause..."); return; }

    showOverlay(type, () => {
        state.lastActions[type] = now;
        if (type === 'feed') { state.stats.hunger += 30; state.stats.love += 5; state.daily.fedToday = true; }
        if (type === 'play') { state.stats.fun += 25; state.stats.energy -= 10; }
        if (type === 'care') { state.stats.hygiene += 40; state.stats.love += 3; }
        if (type === 'sleep') { state.stats.energy = 100; state.stats.hunger -= 10; }
        if (type === 'love') { state.stats.love += 15; }
        
        // Clamp stats
        ['hunger', 'energy', 'hygiene', 'fun', 'love'].forEach(k => {
            if (state.stats[k] > 100) state.stats[k] = 100;
        });

        // Use Cloud history add
        cloud.addLunaHistory({ by: user.name, text: type, ts: now });
        setTimeout(loadState, 500); // Reload to get updated history
    });
}

function render() {
    if (!state) return;
    
    // Update Pet Classes
    const visual = document.getElementById('petVisual');
    visual.className = `pet-container mood-${state.mood}`;
    
    // Update Text
    const label = document.getElementById('moodLabel');
    if (state.mood === 'hungry') label.innerText = "Luna hat Hunger 🍎";
    else if (state.mood === 'tired') label.innerText = "Luna ist müde 😴";
    else if (state.mood === 'loved') label.innerText = "Luna fühlt sich geliebt 💖";
    else label.innerText = "Luna schwebt glücklich ☁️";

    // Update Bars
    const updateBar = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.style.width = `${Math.max(5, val)}%`;
    };
    updateBar('bar-hunger', state.stats.hunger);
    updateBar('bar-energy', state.stats.energy);
    updateBar('bar-love', state.stats.love);

    // Timeline Fix
    const list = document.getElementById('timelineList');
    if (state.history && state.history.length > 0) {
        list.innerHTML = state.history.slice(0, 15).map(h => {
            const date = new Date(h.ts);
            const timeStr = !isNaN(date.getTime()) ? date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just now';
            const isMe = h.by === user.name;
            const actionMap = { 'feed': 'gefüttert 🍎', 'play': 'gespielt 🪁', 'care': 'gepflegt 🧼', 'sleep': 'schlafen gelegt 🌙', 'love': 'geliebt 💗' };
            
            return `<div class="event ${isMe ? 'me' : ''}"><div class="bubble"><b>${h.by}</b> hat Luna ${actionMap[h.text] || h.text} <div class="ts">${timeStr}</div></div></div>`;
        }).join('');
    } else {
        list.innerHTML = '<div style="text-align:center; opacity:0.5; margin-top:20px;">Noch keine Einträge</div>';
    }
}

function showOverlay(type, cb) {
    const ov = document.getElementById('actionOverlay');
    const emojis = { feed: '🍎', play: '🪁', care: '🧼', sleep: '🌙', love: '💗' };
    const texts = { feed: 'Lecker!', play: 'Juhu!', care: 'Frisch!', sleep: 'Gute Nacht', love: 'Danke!' };
    
    document.getElementById('sceneEmoji').innerText = emojis[type] || '✨';
    document.getElementById('sceneText').innerText = texts[type] || 'Yay!';
    
    ov.classList.add('active');
    setTimeout(() => { ov.classList.remove('active'); cb(); }, 1500);
}

function showToast(msg) {
    const t = document.getElementById('toast');
    t.innerText = msg;
    t.classList.add('visible');
    setTimeout(() => t.classList.remove('visible'), 2000);
}

window.switchTab = (idx) => {
    document.querySelectorAll('.tab-btn').forEach((b,i) => b.classList.toggle('active', i===idx));
    document.querySelectorAll('.view').forEach((v,i) => v.classList.toggle('active', i===idx));
    document.getElementById('tabIndicator').style.transform = `translateX(${idx*100}%)`;
};

init();
