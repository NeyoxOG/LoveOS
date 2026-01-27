/**
 * Luna v2 Logic - Couple Pet
 */

const KEYS = {
    SESSION: 'fiaos_session',
    SHARED_MAIN: 'fiaos_pair_room_main',
    GUEST_MAIN: 'fiaos_guest_luna_state'
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
let dbKey = '';

// --- Init ---
function init() {
    // 1. Load User
    const sessionStr = localStorage.getItem(KEYS.SESSION);
    if (!sessionStr) {
        showToast("Error: Not logged in");
        return;
    }
    user = JSON.parse(sessionStr);

    // 2. Determine DB Key
    dbKey = (user.role === 'guest') ? KEYS.GUEST_MAIN : KEYS.SHARED_MAIN;

    // 3. Load or Create State
    loadState();

    // 4. Daily Check
    checkDailyLogic();

    // 5. Start Loop
    render();
    setInterval(tick, 1000); // 1s visual tick
    setInterval(saveState, 5000); // 5s auto-save
}

function loadState() {
    const raw = localStorage.getItem(dbKey);
    if (raw) {
        state = JSON.parse(raw);
        // Migration to v2 structure if needed
        if (!state.daily) {
            state.daily = { dayKey: new Date().toISOString().split('T')[0], fedToday: false, missedDays: 0 };
            state.flags = { milestone3: false, milestone7: false, milestone14: false };
        }
    } else {
        // Init v2 State
        state = {
            version: 2,
            stats: { hunger: 50, energy: 50, hygiene: 50, fun: 50, love: 50 },
            mood: 'happy',
            lastActions: { feed: 0, play: 0, care: 0, sleep: 0, love: 0 },
            daily: {
                dayKey: new Date().toISOString().split('T')[0],
                fedToday: false,
                missedDays: 0
            },
            history: [],
            streak: { count: 0 },
            flags: { milestone3: false, milestone7: false, milestone14: false }
        };
    }
}

function saveState() {
    localStorage.setItem(dbKey, JSON.stringify(state));
}

// --- Logic ---

function checkDailyLogic() {
    const today = new Date().toISOString().split('T')[0];
    if (state.daily.dayKey !== today) {
        // New Day!
        
        // Check missed
        if (!state.daily.fedToday) {
            state.daily.missedDays++;
            // Penalty
            state.stats.love = Math.max(0, state.stats.love - 20);
        } else {
            state.daily.missedDays = 0;
        }

        // Reset flags
        state.daily.fedToday = false;
        state.daily.dayKey = today;
        
        saveState();
    }
}

function tick() {
    // Decay
    // Slower decay for v2 to be less annoying
    // 100 / (24 * 60 * 60) approx 0.001 per sec -> full drain in 24h
    // Let's make it slightly faster: drain in ~12h active
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
    // Determine mood
    let m = 'happy';
    if (state.daily.missedDays >= 1) m = 'sad'; // Missed feed priority
    else if (state.stats.hunger < 30) m = 'hungry';
    else if (state.stats.energy < 20) m = 'tired';
    else if (state.stats.love > 80) m = 'loved';
    else if (state.stats.hygiene < 30) m = 'sad';
    
    state.mood = m;
}

// --- Actions ---

function performAction(type) {
    const now = Date.now();
    const last = state.lastActions[type] || 0;
    
    if (now - last < COOLDOWNS[type]) {
        showToast("Luna braucht eine Pause ⏳");
        return;
    }

    // Trigger Visual Overlay First
    showOverlay(type, () => {
        // After anim, apply effects
        applyActionEffects(type, now);
        saveState();
        render();
    });
}

function applyActionEffects(type, now) {
    state.lastActions[type] = now;
    
    // Values
    if (type === 'feed') {
        state.stats.hunger = Math.min(100, state.stats.hunger + 30);
        state.stats.love += 5;
        
        // Daily Logic
        if (!state.daily.fedToday) {
            state.daily.fedToday = true;
            // Streak logic: simple increment for now
            state.streak.count++;
            checkMilestones();
        }
        
        addHistory('gefüttert 🍎');
    }
    else if (type === 'play') {
        state.stats.fun = Math.min(100, state.stats.fun + 25);
        state.stats.energy -= 10;
        state.stats.love += 2;
        addHistory('gespielt 🧶');
    }
    else if (type === 'care') {
        state.stats.hygiene = Math.min(100, state.stats.hygiene + 40);
        state.stats.love += 3;
        addHistory('gebadet 🧼');
    }
    else if (type === 'sleep') {
        state.stats.energy = 100; // Power nap
        state.stats.hunger -= 10;
        addHistory('schlafen gelegt 🌙');
    }
    else if (type === 'love') {
        state.stats.love = Math.min(100, state.stats.love + 15);
        addHistory('lieb gehabt 💗');
    }

    // Clamp all
    for (let k in state.stats) {
        state.stats[k] = Math.max(0, Math.min(100, state.stats[k]));
    }
}

function checkMilestones() {
    const s = state.streak.count;
    const emit = (evt) => {
        if (window.parent.FIAOS_EVENTS) {
            window.parent.FIAOS_EVENTS.emit(evt, { count: s });
        }
    };

    if (s === 3 && !state.flags.milestone3) {
        state.flags.milestone3 = true;
        emit('luna.milestone.3');
        emit('luna.streak.3'); // Compatible with old hook
    }
    if (s === 7 && !state.flags.milestone7) {
        state.flags.milestone7 = true;
        emit('luna.milestone.7');
    }
    if (s === 14 && !state.flags.milestone14) {
        state.flags.milestone14 = true;
        emit('luna.milestone.14');
    }
}

function addHistory(text) {
    state.history.unshift({
        by: user.name,
        text: text,
        ts: Date.now()
    });
    if (state.history.length > 50) state.history.pop();
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
    
    setTimeout(() => {
        overlay.classList.remove('active');
        cb();
    }, 2000);
}

// --- Render ---

function render() {
    if (!state) return;

    // Mood & Visuals
    const pet = document.getElementById('petVisual');
    // Remove all mood classes
    pet.classList.remove('mood-happy', 'mood-hungry', 'mood-tired', 'mood-sad', 'mood-loved');
    pet.classList.add(`mood-${state.mood}`);

    const moodMap = {
        happy: "Luna ist glücklich 💗",
        hungry: "Luna hat Hunger 🥺",
        tired: "Luna ist müde 💤",
        sad: "Luna ist traurig 🌧️",
        loved: "Luna fühlt sich geliebt ✨"
    };
    document.getElementById('moodLabel').innerText = moodMap[state.mood];
    document.getElementById('streakLabel').innerText = `🔥 ${state.streak.count} Tage`;

    document.getElementById('fedCheck').innerText = state.daily.fedToday ? "✅" : "❌";
    
    // Stats Rings
    renderRing('hunger', '🍎', state.stats.hunger, '#fbbf24');
    renderRing('energy', '⚡', state.stats.energy, '#60a5fa');
    renderRing('hygiene', '🧼', state.stats.hygiene, '#34d399');
    renderRing('fun', '🧶', state.stats.fun, '#a78bfa');
    renderRing('love', '💗', state.stats.love, '#ec4899');

    // Cards Cooldowns
    const now = Date.now();
    ['feed', 'play', 'care', 'sleep', 'love'].forEach(type => {
        const card = document.getElementById(`card-${type}`);
        const last = state.lastActions[type] || 0;
        const remaining = (COOLDOWNS[type] - (now - last)) / 1000;
        
        if (remaining > 0) {
            card.classList.add('on-cooldown');
            card.querySelector('.care-cooldown').innerText = `${Math.ceil(remaining)}s`;
        } else {
            card.classList.remove('on-cooldown');
        }
    });

    // Timeline
    renderTimeline();
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

function renderTimeline() {
    const list = document.getElementById('timelineList');
    if (state.history.length === 0) return;

    // Diff render to avoid flicker? For simplicity, re-render top 20
    const html = state.history.slice(0, 20).map(item => {
        const isMe = item.by === user.name;
        const date = new Date(item.ts);
        const time = date.getHours() + ':' + String(date.getMinutes()).padStart(2, '0');
        
        return `
            <div class="event ${isMe ? 'me' : ''}">
                <div class="avatar" style="background: ${isMe ? '#4f46e5' : '#db2777'}">
                    ${item.by.charAt(0)}
                </div>
                <div>
                    <div class="bubble">
                        ${isMe ? 'Du hast' : item.by + ' hat'} Luna ${item.text}
                    </div>
                    <span class="ts">${time}</span>
                </div>
            </div>
        `;
    }).join('');
    
    if (list.innerHTML !== html) list.innerHTML = html;
}

// --- Utils ---
function showToast(msg) {
    const t = document.getElementById('toast');
    t.innerText = msg;
    t.classList.add('visible');
    setTimeout(() => t.classList.remove('visible'), 2000);
}

// --- Tabs ---
window.switchTab = (idx) => {
    document.querySelectorAll('.tab-btn').forEach((b, i) => b.classList.toggle('active', i === idx));
    document.getElementById('tabIndicator').style.transform = `translateX(${idx * 100}%)`;
    
    document.querySelectorAll('.view').forEach((v, i) => {
        v.classList.toggle('active', i === idx);
    });
};

// --- Debug ---
window.LUNA_DEBUG = {
    reset: () => { localStorage.removeItem(dbKey); location.reload(); },
    maxAll: () => { state.stats = {hunger:100, energy:100, hygiene:100, fun:100, love:100}; render(); },
    setMood: (m) => { state.mood = m; render(); },
    skipDay: () => { state.daily.dayKey = "2000-01-01"; checkDailyLogic(); render(); }
};

// Start
init();