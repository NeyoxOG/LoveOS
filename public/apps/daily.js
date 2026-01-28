
/**
 * Daily App Logic (Cloud Enhanced)
 */

const KEYS = {
    SESSION: 'fiaos_session',
    DAILY_STATE: 'fiaos_user_', // + id + _daily_state
    DAILY_HISTORY: 'fiaos_user_', // + id + _daily_history
    DAILY_INBOX: 'fiaos_user_', // + id + _daily_inbox
};

let user = null;
let state = null;
let offer = null;
let cloud = null;

// Simple Seeded Random
const seededRandom = (seed) => {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        const char = seed.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    const x = Math.sin(hash) * 10000;
    return x - Math.floor(x);
};

function init() {
    const sessionStr = localStorage.getItem(KEYS.SESSION);
    if (!sessionStr) return;
    user = JSON.parse(sessionStr);

    if (window.parent.FIAOS && window.parent.FIAOS.cloud) {
        cloud = window.parent.FIAOS.cloud;
    }

    initDevTools();
    loadData(); // This now triggers renderUI after data is ready
}

function isAdmin() {
    return user && (user.role === 'admin' || user.role === 'developer');
}

function initDevTools() {
    const devTools = document.getElementById('devTools');
    if (isAdmin()) {
        devTools.style.display = 'block';
    } else {
        devTools.remove();
    }
}

async function loadData() {
    // 1. Get Local State (User Specific)
    const stateKey = `${KEYS.DAILY_STATE}${user.id}_daily_state`;
    const rawState = localStorage.getItem(stateKey);
    const todayISO = new Date().toISOString().split('T')[0];
    
    if (rawState) {
        state = JSON.parse(rawState);
    } else {
        state = {
            lastClaimDateISO: null,
            streak: 0,
            totalClaims: 0,
            todaySeed: `${user.id}_${todayISO}`,
            openedToday: false,
            lastOpenAt: 0
        };
        localStorage.setItem(stateKey, JSON.stringify(state));
    }

    // Refresh Seed if new day
    const expectedSeed = `${user.id}_${todayISO}`;
    if (state.todaySeed !== expectedSeed) {
        state.todaySeed = expectedSeed;
        state.openedToday = false;
        
        // Streak Logic
        if (state.lastClaimDateISO) {
            const lastDate = new Date(state.lastClaimDateISO);
            const today = new Date(todayISO);
            const diffTime = Math.abs(today.getTime() - lastDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays > 1) {
                state.streak = 0;
            }
        } else {
            state.streak = 0;
        }
        localStorage.setItem(stateKey, JSON.stringify(state));
    }

    offer = getLocalDailyOffer(state.todaySeed);
    
    // Render basic UI immediately
    renderUI();
    
    // Async check for couple bonus via Cloud
    if (cloud && user.role !== 'guest') {
        checkCoupleBonus(todayISO);
    }
}

function renderUI() {
    // 1. Today Card
    if (state.openedToday) {
        setCardState('claimed');
    } else {
        setCardState('available');
    }

    // 2. Streak
    const row = document.getElementById('streakRow');
    const fire = row.querySelector('.streak-fire');
    row.innerHTML = '';
    row.appendChild(fire);
    
    const displayStreak = state.streak % 7; 
    for (let i = 0; i < 7; i++) {
        const d = document.createElement('div');
        d.className = `streak-dot ${i < displayStreak ? 'active' : ''}`;
        row.appendChild(d);
    }
    
    if (state.streak > 0) {
        const num = document.createElement('span');
        num.style.fontSize = '12px';
        num.style.marginLeft = '4px';
        num.style.opacity = '0.7';
        num.innerText = state.streak;
        row.appendChild(num);
    }

    renderInbox();
    renderHistory();
}

function setCardState(status) {
    const title = document.getElementById('todayTitle');
    const sub = document.getElementById('todaySub');
    const icon = document.getElementById('todayIcon');
    const btn = document.getElementById('claimBtn');
    const card = document.getElementById('todayCard');

    if (status === 'claimed') {
        title.innerText = "Abgeholt ✅";
        sub.innerText = "Komm morgen wieder!";
        icon.innerText = offer.icon;
        btn.innerText = "Erledigt";
        btn.classList.add('disabled');
        card.style.boxShadow = "none";
    } else {
        title.innerText = "Tagesbelohnung";
        sub.innerText = "Tippe, um deine Überraschung zu sehen.";
        icon.innerText = "🎁";
        btn.innerText = "Heute abholen";
        btn.classList.remove('disabled');
        
        const rarity = offer.rarity;
        if (rarity === 'epic') card.style.boxShadow = "0 0 30px rgba(168, 85, 247, 0.4)";
        else if (rarity === 'rare') card.style.boxShadow = "0 0 20px rgba(59, 130, 246, 0.3)";
        else card.style.boxShadow = "0 10px 30px rgba(0,0,0,0.3)";
    }
}

async function checkCoupleBonus(todayISO) {
    if (!cloud) return;
    
    const claims = await cloud.getDailyShared(todayISO);
    
    const bonusActive = claims.includes('fia') && claims.includes('collin');
    const badge = document.getElementById('coupleBonus');
    
    if (bonusActive) {
        badge.classList.add('active');
        badge.style.background = 'linear-gradient(90deg, #ec4899, #8b5cf6)';
        badge.innerText = "Couple Bonus aktiv 💗";
    } else if (claims.length > 0 && !claims.includes(user.id)) {
        badge.classList.add('active');
        badge.style.background = 'rgba(255,255,255,0.1)';
        badge.innerText = "Partner wartet auf dich... ⏳";
    } else {
        badge.classList.remove('active');
    }
}

function renderInbox() {
    const inboxKey = `${KEYS.DAILY_INBOX}${user.id}_daily_inbox`;
    const inbox = JSON.parse(localStorage.getItem(inboxKey) || '[]');
    const inboxEl = document.getElementById('inboxList');
    inboxEl.innerHTML = '';
    
    if (inbox.length === 0) {
        inboxEl.innerHTML = '<div style="text-align:center; color:#444; font-size:12px; padding:20px;">Keine Nachrichten</div>';
    } else {
        inbox.forEach(item => {
            const div = document.createElement('div');
            div.className = 'inbox-item';
            div.innerHTML = `
                <div class="inbox-icon">${item.icon}</div>
                <div class="inbox-info">
                    <div class="inbox-head">${item.title}</div>
                    <div class="inbox-body">${item.body}</div>
                </div>
            `;
            inboxEl.appendChild(div);
        });
    }
}

function renderHistory() {
    const histKey = `${KEYS.DAILY_HISTORY}${user.id}_daily_history`;
    const history = JSON.parse(localStorage.getItem(histKey) || '[]');
    const histGrid = document.getElementById('historyGrid');
    histGrid.innerHTML = '';
    
    history.slice(0, 14).forEach(h => {
        const div = document.createElement('div');
        div.className = 'history-card';
        div.innerHTML = `
            <span class="h-date">${new Date(h.dateISO).getDate()}.</span>
            <span class="h-icon">${h.icon}</span>
            <span class="h-type" style="color:${getColor(h.rarity)}">${h.rarity}</span>
        `;
        histGrid.appendChild(div);
    });
}

function getColor(rarity) {
    if (rarity === 'epic') return '#a855f7';
    if (rarity === 'rare') return '#3b82f6';
    return '#fbbf24';
}

// --- Claim Logic ---

window.doClaim = () => {
    if (state.openedToday) return;

    const card = document.getElementById('todayCard');
    const icon = document.getElementById('todayIcon');
    const btn = document.getElementById('claimBtn');

    // Start Animation
    card.classList.add('claiming');
    icon.innerText = offer.icon;
    btn.classList.add('disabled');
    btn.innerText = "Öffnen...";

    setTimeout(async () => {
        await processClaim();
        
        setTimeout(() => {
            card.classList.remove('claiming');
            fireConfetti();
            showModal(offer);
            renderUI();
        }, 600);
        
    }, 800);
};

async function processClaim() {
    const todayISO = new Date().toISOString().split('T')[0];
    
    if (state.lastClaimDateISO) {
        const lastDate = new Date(state.lastClaimDateISO);
        const today = new Date(todayISO);
        const diffTime = Math.abs(today.getTime() - lastDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) state.streak++;
        else if (diffDays > 1) state.streak = 1;
    } else {
        state.streak = 1;
    }
    
    state.openedToday = true;
    state.lastClaimDateISO = todayISO;
    state.totalClaims++;
    
    localStorage.setItem(`${KEYS.DAILY_STATE}${user.id}_daily_state`, JSON.stringify(state));

    const histKey = `${KEYS.DAILY_HISTORY}${user.id}_daily_history`;
    let history = JSON.parse(localStorage.getItem(histKey) || '[]');
    history.unshift({
        dateISO: todayISO,
        claimedAt: Date.now(),
        offerId: offer.id,
        type: offer.type,
        title: offer.title,
        icon: offer.icon,
        rarity: offer.rarity
    });
    localStorage.setItem(histKey, JSON.stringify(history));

    executePayload(offer);

    // Couple Bonus Update
    if (cloud && user.role !== 'guest') {
        await cloud.addDailyClaim(todayISO, user.id);
        const claims = await cloud.getDailyShared(todayISO);
        
        if (claims.includes('fia') && claims.includes('collin')) {
             addInboxItem({
                type: 'reward', title: 'Couple Bonus 💞', body: 'Ihr habt beide gesammelt!', icon: '💞'
             });
             if (window.parent.FIAOS) {
                 window.parent.FIAOS.bridgeUnlockReward({ rewardId: 'reward.streak3' });
             }
        }
    }
}

function executePayload(offer) {
    const bridge = window.parent.FIAOS;
    if (!bridge) return;

    if (offer.type === 'reward' && offer.payload.rewardId) {
        bridge.bridgeUnlockReward({ rewardId: offer.payload.rewardId });
    }
    if (offer.type === 'theme' && offer.payload.themeId) {
        bridge.bridgeUnlockTheme({ themeId: offer.payload.themeId });
    }
    if (offer.type === 'app_unlock' && offer.payload.appId) {
        bridge.bridgeUnlockApp({ appId: offer.payload.appId });
    }
    
    if (state.totalClaims === 1) bridge.bridgeUnlockReward({ rewardId: 'daily.first' });
    if (state.totalClaims === 10) bridge.bridgeUnlockReward({ rewardId: 'daily.total10' });
    if (state.streak === 3) bridge.bridgeUnlockReward({ rewardId: 'daily.streak3' });
    if (state.streak === 7) bridge.bridgeUnlockReward({ rewardId: 'daily.streak7' });
}

function addInboxItem(item) {
    const key = `${KEYS.DAILY_INBOX}${user.id}_daily_inbox`;
    let inbox = JSON.parse(localStorage.getItem(key) || '[]');
    inbox.unshift({
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        ...item
    });
    localStorage.setItem(key, JSON.stringify(inbox));
}

// --- UI Animations ---

window.showModal = (offer) => {
    document.getElementById('mIcon').innerText = offer.icon;
    document.getElementById('mTitle').innerText = offer.title;
    document.getElementById('mText').innerText = offer.payload?.text || offer.payload || offer.subtitle;
    
    if (offer.type === 'text') document.getElementById('mText').innerText = offer.payload;
    if (offer.type === 'quest') document.getElementById('mText').innerText = "Quest: " + offer.payload;

    document.getElementById('claimModal').classList.add('active');
};

window.closeModal = () => {
    document.getElementById('claimModal').classList.remove('active');
};

function fireConfetti() {
    const container = document.getElementById('confettiContainer');
    container.innerHTML = '';
    const colors = ['#fbbf24', '#ec4899', '#fff', '#60a5fa'];
    
    for (let i = 0; i < 40; i++) {
        const c = document.createElement('div');
        c.className = 'confetti';
        c.style.left = Math.random() * 100 + 'vw';
        c.style.background = colors[Math.floor(Math.random() * colors.length)];
        c.style.animationDuration = (2 + Math.random() * 2) + 's';
        container.appendChild(c);
    }
    
    setTimeout(() => { container.innerHTML = ''; }, 4000);
}

// --- Local Offer Pool ---
function getLocalDailyOffer(seed) {
    const rand = seededRandom(seed);
    const offers = [
        { id: 't1', type: 'text', rarity: 'common', title: 'Erinnerung', subtitle: 'Nur für dich', icon: '💌', payload: 'Ich bin stolz auf dich. Jeden Tag.' },
        { id: 't2', type: 'text', rarity: 'common', title: 'Moment der Ruhe', subtitle: 'Atme durch', icon: '🌬️', payload: 'Nimm dir 10 Sekunden. Augen zu. Denk an uns.' },
        { id: 'q1', type: 'quest', rarity: 'common', title: 'Emoji Quest', subtitle: 'Mini-Aufgabe', icon: '😎', payload: 'Schick mir ein Emoji, das deinen aktuellen Mood beschreibt.' },
        { id: 'q2', type: 'quest', rarity: 'common', title: 'Herz-Suche', subtitle: 'Mini-Aufgabe', icon: '💗', payload: 'Finde etwas Herzförmiges und mach ein Foto.' },
        { id: 'r1', type: 'reward', rarity: 'rare', title: 'Bonus Punkte', subtitle: 'Belohnung', icon: '🏆', payload: { rewardId: 'reward.streak3' } },
        { id: 'e1', type: 'theme', rarity: 'epic', title: 'Theme: Soft Pink', subtitle: 'Design Unlock', icon: '🎨', payload: { themeId: 'roseGlass' } }
    ];
    let rarity = 'common';
    if (rand > 0.95) rarity = 'epic';
    else if (rand > 0.70) rarity = 'rare';
    
    const pool = offers.filter(o => o.rarity === rarity);
    if (pool.length === 0) return offers[0];
    const index = Math.floor(seededRandom(seed + "_idx") * pool.length);
    return pool[index];
}

// --- Dev Actions (Secure) ---
window.devReset = () => { 
    if (!isAdmin()) return alert("Access Denied");
    localStorage.removeItem(`${KEYS.DAILY_STATE}${user.id}_daily_state`); 
    location.reload(); 
};

window.devStreakReset = () => { 
    if (!isAdmin()) return alert("Access Denied");
    const k = `${KEYS.DAILY_STATE}${user.id}_daily_state`; 
    const s = JSON.parse(localStorage.getItem(k)); 
    s.streak = 0; 
    localStorage.setItem(k, JSON.stringify(s)); 
    location.reload(); 
};

window.devReroll = () => { 
    if (!isAdmin()) return alert("Access Denied");
    const k = `${KEYS.DAILY_STATE}${user.id}_daily_state`; 
    const s = JSON.parse(localStorage.getItem(k)); 
    s.todaySeed = Math.random().toString(); 
    s.openedToday = false; 
    localStorage.setItem(k, JSON.stringify(s)); 
    location.reload(); 
};

init();
