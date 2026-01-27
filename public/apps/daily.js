/**
 * Daily App Logic
 */

const KEYS = {
    SESSION: 'fiaos_session',
    DAILY_STATE: 'fiaos_user_', // + id + _daily_state
    DAILY_HISTORY: 'fiaos_user_', // + id + _daily_history
    DAILY_INBOX: 'fiaos_user_', // + id + _daily_inbox
};

let user = null;
let state = null;
let offer = null; // Today's pending offer

// Simple Seeded Random (matches utils/data.ts implementation logic via parent bridge conceptually, but implemented here for display logic)
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

// --- Mock Data Access (Since we are in iframe, we read directly from LS) ---
// Note: In a real "bridge" scenario we might ask parent for this, but direct LS read is fine for same-origin.

function init() {
    const sessionStr = localStorage.getItem(KEYS.SESSION);
    if (!sessionStr) return;
    user = JSON.parse(sessionStr);

    if (user.role === 'admin') {
        document.getElementById('devTools').style.display = 'block';
    }

    loadData();
    renderUI();
}

function loadData() {
    // 1. Get State
    const stateKey = `${KEYS.DAILY_STATE}${user.id}_daily_state`;
    const rawState = localStorage.getItem(stateKey);
    
    // We rely on the parent app (App.tsx / data.ts) having initialized the seed on load?
    // Or we handle initialization here if missing.
    // Let's implement robust load here too.
    
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

    // Refresh Seed if new day (Safety, though parent does it too)
    const expectedSeed = `${user.id}_${todayISO}`;
    if (state.todaySeed !== expectedSeed) {
        state.todaySeed = expectedSeed;
        state.openedToday = false;
        localStorage.setItem(stateKey, JSON.stringify(state));
    }

    // 2. Determine Offer
    // We need the offers list. We can fetch it from parent if exposed, or duplicate small logic.
    // Ideally duplicate logic for independence in iframe.
    // We'll define a subset or fetch via a hack if parent exposes constants.
    // For simplicity, let's look at `DAILY_OFFERS` in constants.ts. 
    // Since we can't import TS easily in vanilla JS here without build step, we will assume 
    // the parent has put the offer in state? No, state only stores seed.
    // We need to generate it.
    
    // Let's rely on a window.parent.FIAOS call if possible, or just reimplement `getDailyOffer` here with a local pool.
    // To be safe and self-contained, I'll include the pool here.
    offer = getLocalDailyOffer(state.todaySeed);
}

function renderUI() {
    // 1. Today Card
    if (state.openedToday) {
        document.getElementById('todayTitle').innerText = "Schon abgeholt";
        document.getElementById('todaySub').innerText = "Komm morgen wieder!";
        document.getElementById('todayIcon').innerText = "✅";
        document.getElementById('claimBtn').innerText = "Erledigt";
        document.getElementById('claimBtn').classList.add('disabled');
    } else {
        // Show teaser based on rarity? Or mystery?
        // Let's show mystery box
        document.getElementById('todayTitle').innerText = "Tagesbelohnung";
        document.getElementById('todaySub').innerText = "Tippe, um deine Überraschung zu sehen.";
        document.getElementById('todayIcon').innerText = "🎁";
        document.getElementById('claimBtn').innerText = "Heute abholen";
        document.getElementById('claimBtn').classList.remove('disabled');
        
        // Rarity hint glow?
        const rarity = offer.rarity;
        const card = document.querySelector('.today-card');
        if (rarity === 'epic') card.style.boxShadow = "0 0 30px rgba(168, 85, 247, 0.4)";
        else if (rarity === 'rare') card.style.boxShadow = "0 0 20px rgba(59, 130, 246, 0.3)";
        else card.style.boxShadow = "0 10px 30px rgba(0,0,0,0.3)";
    }

    // 2. Streak
    const row = document.getElementById('streakRow');
    row.innerHTML = '';
    // Show 7 dots
    for (let i = 0; i < 7; i++) {
        const d = document.createElement('div');
        d.className = `streak-dot ${i < (state.streak % 7) ? 'active' : ''}`;
        row.appendChild(d);
    }

    // 3. Inbox
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

    // 4. History
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

    // Use Bridge to verify/process claim logic (optional, but good practice)
    // Here we duplicate 'utils/data.ts' claim logic because we can't import it easily.
    // We update state locally.
    
    const todayISO = new Date().toISOString().split('T')[0];
    
    // Update State
    // Streak logic
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

    // History
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

    // Execute Payloads via Bridge
    executePayload(offer);

    // Couple Bonus Check (Local write)
    if (user.role !== 'guest') {
        const sharedKey = `fiaos_shared_daily_couple_${todayISO}`;
        let claims = JSON.parse(localStorage.getItem(sharedKey) || '[]');
        if (!claims.includes(user.id)) {
            claims.push(user.id);
            localStorage.setItem(sharedKey, JSON.stringify(claims));
        }
        
        // If bonus triggered? The data.ts logic handles the inbox drop when *loading* usually, 
        // but here we are acting. Let's do it here to be instant.
        if (claims.includes('fia') && claims.includes('collin')) {
             // Drop for current user immediately
             addInboxItem({
                type: 'reward', title: 'Couple Bonus 💞', body: 'Ihr habt beide gesammelt!', icon: '💞'
             });
        }
    }

    // UI Feedback
    fireConfetti();
    showModal(offer);
    renderUI();
};

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
    
    // Check Daily Rewards (Streak based)
    // Simple check
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
    
    for (let i = 0; i < 30; i++) {
        const c = document.createElement('div');
        c.className = 'confetti';
        c.style.left = Math.random() * 100 + 'vw';
        c.style.background = colors[Math.floor(Math.random() * colors.length)];
        c.style.animationDuration = (2 + Math.random() * 2) + 's';
        container.appendChild(c);
    }
    
    setTimeout(() => { container.innerHTML = ''; }, 4000);
}

// --- Local Offer Pool (Copy of constants) ---
function getLocalDailyOffer(seed) {
    const rand = seededRandom(seed);
    
    // Pool Data (Simplified Copy)
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
    // If pool empty (e.g. mock data missing epic), fallback
    if (pool.length === 0) return offers[0];
    
    const index = Math.floor(seededRandom(seed + "_idx") * pool.length);
    return pool[index];
}

// --- Dev ---
window.devReset = () => {
    localStorage.removeItem(`${KEYS.DAILY_STATE}${user.id}_daily_state`);
    location.reload();
};

window.devReroll = () => {
    const k = `${KEYS.DAILY_STATE}${user.id}_daily_state`;
    const s = JSON.parse(localStorage.getItem(k));
    s.todaySeed = Math.random().toString();
    s.openedToday = false;
    localStorage.setItem(k, JSON.stringify(s));
    location.reload();
};

init();