
/**
 * Luna v2 Logic - Couple Pet (Cloud Enabled)
 */

const KEYS = {
    SESSION: 'fiaos_session'
};

const COOLDOWNS = {
    feed: 60000 * 5,   // 5 min
    play: 60000 * 2,   // 2 min
    care: 60000 * 10,  // 10 min
    sleep: 60000 * 30, // 30 min
    love: 45000        // 45 sec
};

let user = null;
let state = null;
let cloud = null;

// --- Init ---
function init() {
    const sessionStr = localStorage.getItem(KEYS.SESSION);
    if (!sessionStr) return;
    user = JSON.parse(sessionStr);

    // Get Cloud Adapter from parent
    if (window.parent.FIAOS && window.parent.FIAOS.cloud) {
        cloud = window.parent.FIAOS.cloud;
    } else {
        console.error("Cloud Adapter not found");
        return;
    }

    loadState();

    // Start Loop
    setInterval(tick, 1000); // 1s visual tick
    setInterval(saveState, 5000); // 5s auto-save/sync
}

async function loadState() {
    state = await cloud.loadLuna();
    if (!state) {
        // Should have been initialized by adapter, but fallback just in case
        state = { stats: { hunger: 50, energy: 50, hygiene: 50, fun: 50, love: 50 }, mood: 'happy', lastActions: {} };
    }
    
    // Check Daily
    const today = new Date().toISOString().split('T')[0];
    if (state.daily && state.daily.dayKey !== today) {
        // Missed day logic handled here or on server? 
        // Client-side simulation for v0.3
        if (!state.daily.fedToday) {
            state.daily.missedDays = (state.daily.missedDays || 0) + 1;
            state.stats.love = Math.max(0, state.stats.love - 20);
        } else {
            state.daily.missedDays = 0;
        }
        state.daily.fedToday = false;
        state.daily.dayKey = today;
        saveState();
    }
    
    render();
}

async function saveState() {
    if (!state) return;
    await cloud.updateLuna(state);
}

// --- Logic ---

function tick() {
    if (!state) return;
    // Decay
    const drain = 0.002;
    state.stats.hunger = Math.max(0, state.stats.hunger - drain * 1.5);
    state.stats.energy = Math.max(0, state.stats.energy - drain);
    state.stats.hygiene = Math.max(0, state.stats.hygiene - drain * 0.5);
    state.stats.fun = Math.max(0, state.stats.fun - drain * 1.2);
    state.stats.love = Math.max(0, state.stats.love - drain * 0.8);

    updateMood();
    render();
}

function updateMood() {
    let m = 'happy';
    if (state.daily.missedDays >= 1) m = 'sad';
    else if (state.stats.hunger < 30) m = 'hungry';
    else if (state.stats.energy < 20) m = 'tired';
    else if (state.stats.love > 80) m = 'loved';
    else if (state.stats.hygiene < 30) m = 'sad';
    state.mood = m;
}

// --- Actions ---

function performAction(type) {
    if (!state) return;
    const now = Date.now();
    const last = state.lastActions[type] || 0;
    
    if (now - last < COOLDOWNS[type]) {
        showToast("Luna braucht eine Pause ⏳");
        return;
    }

    showOverlay(type, () => {
        applyActionEffects(type, now);
        saveState();
        render();
    });
}

function applyActionEffects(type, now) {
    state.lastActions[type] = now;
    
    if (type === 'feed') {
        state.stats.hunger = Math.min(100, state.stats.hunger + 30);
        state.stats.love += 5;
        if (!state.daily.fedToday) {
            state.daily.fedToday = true;
            state.streak.count++;
            checkMilestones();
        }
        cloud.addLunaHistory({ by: user.name, text: 'gefüttert 🍎', ts: now });
    }
    else if (type === 'play') {
        state.stats.fun = Math.min(100, state.stats.fun + 25);
        state.stats.energy -= 10;
        state.stats.love += 2;
        cloud.addLunaHistory({ by: user.name, text: 'gespielt 🧶', ts: now });
    }
    else if (type === 'care') {
        state.stats.hygiene = Math.min(100, state.stats.hygiene + 40);
        state.stats.love += 3;
        cloud.addLunaHistory({ by: user.name, text: 'gebadet 🧼', ts: now });
    }
    else if (type === 'sleep') {
        state.stats.energy = 100;
        state.stats.hunger -= 10;
        cloud.addLunaHistory({ by: user.name, text: 'schlafen gelegt 🌙', ts: now });
    }
    else if (type === 'love') {
        state.stats.love = Math.min(100, state.stats.love + 15);
        cloud.addLunaHistory({ by: user.name, text: 'lieb gehabt 💗', ts: now });
    }
    
    // Reload to get updated history from server logic simulation
    setTimeout(loadState, 1000); 
}

function checkMilestones() {
    const s = state.streak.count;
    if (window.parent.FIAOS_EVENTS) {
        if (s === 3) window.parent.FIAOS_EVENTS.emit('luna.milestone.3', { count: s });
    }
}

// --- Visuals ---

function showOverlay(type, cb) {
    const overlay = document.getElementById('actionOverlay');
    const emoji = document.getElementById('sceneEmoji');
    const text = document.getElementById('sceneText');
    const config = {
        feed: { e: '🍎', t: 'Lecker!' },
        play: { e: '🧶', t: 'Juhuu!' },
        care: { e: '🧼', t: 'Frisch!' },
        sleep: { e: '💤', t: 'Gute Nacht...' },
        love: { e: '💗', t: 'Purrrr...' }
    };
    emoji.innerText = config[type].e;
    text.innerText = config[type].t;
    overlay.classList.add('active');
    setTimeout(() => { overlay.classList.remove('active'); cb(); }, 2000);
}

function render() {
    if (!state) return;

    const pet = document.getElementById('petVisual');
    pet.className = `lamb-wrapper mood-${state.mood}`;

    const moodMap = {
        happy: "Luna ist glücklich 💗",
        hungry: "Luna hat Hunger 🥺",
        tired: "Luna ist müde 💤",
        sad: "Luna ist traurig 🌧️",
        loved: "Luna fühlt sich geliebt ✨"
    };
    document.getElementById('moodLabel').innerText = moodMap[state.mood] || moodMap['happy'];
    document.getElementById('streakLabel').innerText = `🔥 ${state.streak?.count || 0} Tage`;
    document.getElementById('fedCheck').innerText = state.daily?.fedToday ? "✅" : "❌";
    
    renderRing('hunger', '🍎', state.stats.hunger, '#fbbf24');
    renderRing('energy', '⚡', state.stats.energy, '#60a5fa');
    renderRing('hygiene', '🧼', state.stats.hygiene, '#34d399');
    renderRing('fun', '🧶', state.stats.fun, '#a78bfa');
    renderRing('love', '💗', state.stats.love, '#ec4899');

    // History
    if (state.history) {
        const html = state.history.slice(0, 20).map(item => {
            const isMe = item.by === user.name;
            const time = new Date(item.ts).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
            return `
                <div class="event ${isMe ? 'me' : ''}">
                    <div class="avatar" style="background: ${isMe ? '#4f46e5' : '#db2777'}">${item.by.charAt(0)}</div>
                    <div><div class="bubble">${isMe ? 'Du hast' : item.by + ' hat'} Luna ${item.text}</div><span class="ts">${time}</span></div>
                </div>
            `;
        }).join('');
        document.getElementById('timelineList').innerHTML = html;
    }
}

function renderRing(id, icon, val, color) {
    const container = document.getElementById(`ring-${id}`);
    const r = 20;
    const c = 2 * Math.PI * r;
    const offset = c - (val / 100) * c;
    container.innerHTML = `
        <div class="ring-container">
            <svg class="ring-svg">
                <circle class="ring-bg" cx="24" cy="24" r="${r}"></circle>
                <circle class="ring-progress" cx="24" cy="24" r="${r}" style="stroke: ${color}; stroke-dashoffset: ${offset}"></circle>
            </svg>
            <div class="ring-icon">${icon}</div>
        </div>
        <div class="stat-label">${Math.round(val)}%</div>
    `;
}

function showToast(msg) {
    const t = document.getElementById('toast');
    t.innerText = msg;
    t.classList.add('visible');
    setTimeout(() => t.classList.remove('visible'), 2000);
}

window.switchTab = (idx) => {
    document.querySelectorAll('.tab-btn').forEach((b, i) => b.classList.toggle('active', i === idx));
    document.getElementById('tabIndicator').style.transform = `translateX(${idx * 100}%)`;
    document.querySelectorAll('.view').forEach((v, i) => v.classList.toggle('active', i === idx));
};

init();
