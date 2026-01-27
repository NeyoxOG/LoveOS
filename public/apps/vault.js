/**
 * Message Vault Logic
 */

const KEYS = {
    SESSION: 'fiaos_session',
    PAIR_VAULT: 'fiaos_vault_pair_main',
    GUEST_VAULT: 'fiaos_vault_guest_' // + id
};

const REWARDS_LIST = [
    { id: 'reward.streak3', name: 'Streak: 3 Tage 🔥' },
    { id: 'valentine.reward.pizza', name: 'Valentine: Pizza Date 🍕' },
    { id: 'valentine.reward.letter', name: 'Valentine: Brief ✉️' },
    { id: 'luna.milestone.7', name: 'Luna: 7 Tage Pflege 🐑' }
];

let user = null;
let vaultState = null;
let dbKey = '';
let activeFilter = 'all';

// --- Init ---
function init() {
    // 1. User
    const sessionStr = localStorage.getItem(KEYS.SESSION);
    if (!sessionStr) return;
    user = JSON.parse(sessionStr);

    // 2. DB Key
    dbKey = user.role === 'guest' ? KEYS.GUEST_VAULT + user.id : KEYS.PAIR_VAULT;

    // 3. Load
    loadState();

    // 4. UI Bindings
    bindEvents();
    renderList();

    // 5. Timer
    setInterval(updateTimers, 1000);
}

function loadState() {
    const raw = localStorage.getItem(dbKey);
    if (raw) {
        vaultState = JSON.parse(raw);
    } else {
        vaultState = {
            version: 1,
            createdAt: Date.now(),
            messages: []
        };
        // Seed initial message if empty
        if (user.role !== 'guest') {
            vaultState.messages.push({
                id: 'msg_welcome',
                title: 'Willkommen im Vault',
                body: 'Hier könnt ihr geheime Nachrichten füreinander hinterlassen. Manche öffnen sich erst später... 🤫',
                author: { name: 'System', avatar: '🔐' },
                createdAt: Date.now(),
                lock: { type: 'none' },
                openedAt: null,
                isPinned: true,
                style: { sealColor: '#ec4899', paper: 'classic' }
            });
            saveState();
        }
    }
}

function saveState() {
    localStorage.setItem(dbKey, JSON.stringify(vaultState));
}

// --- Rendering ---

function renderList() {
    const container = document.getElementById('msgList');
    container.innerHTML = '';

    const list = vaultState.messages.filter(m => {
        if (activeFilter === 'all') return true;
        if (activeFilter === 'locked') return !m.openedAt;
        if (activeFilter === 'opened') return !!m.openedAt;
        if (activeFilter === 'pinned') return m.isPinned;
        return true;
    }).sort((a, b) => b.createdAt - a.createdAt); // Newest first

    if (list.length === 0) {
        container.innerHTML = '<div class="empty-state">Nichts gefunden.</div>';
        return;
    }

    list.forEach(msg => {
        const el = document.createElement('div');
        const isOpened = !!msg.openedAt;
        el.className = `msg-card ${isOpened ? 'opened' : ''}`;
        el.onclick = () => handleCardClick(msg);

        // Lock Info
        let lockBadge = '';
        if (!isOpened) {
            if (msg.lock.type === 'time') {
                const diff = msg.lock.unlockAt - Date.now();
                if (diff > 0) {
                    lockBadge = `<div class="lock-badge time-lock" data-ts="${msg.lock.unlockAt}">⏳ ...</div>`;
                } else {
                    lockBadge = `<div class="lock-badge" style="color:#4ade80">🔓 Jetzt bereit</div>`;
                }
            } else if (msg.lock.type === 'reward') {
                const rName = REWARDS_LIST.find(r => r.id === msg.lock.rewardId)?.name || 'Unbekannter Erfolg';
                lockBadge = `<div class="lock-badge">🏆 ${rName}</div>`;
            }
        }

        const dateStr = new Date(msg.createdAt).toLocaleDateString();

        el.innerHTML = `
            ${!isOpened ? `
                <div class="envelope-flap"></div>
                <div class="envelope-bg">
                    <div class="seal" style="background:${msg.style?.sealColor || '#ec4899'}">
                        ${msg.lock.type === 'none' ? '💌' : '🔐'}
                    </div>
                </div>
            ` : ''}
            
            <div class="msg-content">
                <div>
                    <div class="msg-header">
                        <div class="msg-title">${msg.title}</div>
                        ${msg.isPinned ? '📌' : ''}
                    </div>
                    <div class="msg-preview">
                        ${isOpened ? msg.body.substring(0, 60) + '...' : 'Inhalt verschlossen'}
                    </div>
                </div>
                
                <div class="msg-meta">
                    <div class="author-badge">
                        <div class="author-avatar">${msg.author.avatar || msg.author.name.charAt(0)}</div>
                        <span>${msg.author.name}</span>
                    </div>
                    ${lockBadge || `<span>${dateStr}</span>`}
                </div>
            </div>
        `;
        container.appendChild(el);
    });
    
    updateTimers();
}

function updateTimers() {
    document.querySelectorAll('.time-lock').forEach(el => {
        const target = parseInt(el.getAttribute('data-ts'));
        const diff = target - Date.now();
        if (diff <= 0) {
            el.innerText = "🔓 Jetzt bereit";
            el.style.color = "#4ade80";
        } else {
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            el.innerText = `⏳ ${h}h ${m}m ${s}s`;
        }
    });
}

// --- Logic ---

function handleCardClick(msg) {
    if (msg.openedAt) {
        openReader(msg);
        return;
    }

    // Check Lock
    if (msg.lock.type === 'time') {
        if (Date.now() < msg.lock.unlockAt) {
            // Shake anim?
            alert("Noch verschlossen! Geduld ist eine Tugend. ⏳");
            return;
        }
    } 
    else if (msg.lock.type === 'reward') {
        // Check local rewards
        const rKey = `fiaos_rewards_${user.id}`;
        const rData = JSON.parse(localStorage.getItem(rKey) || '{}');
        
        // Check normal rewards OR valentine rewards
        const isUnlocked = rData.rewards?.[msg.lock.rewardId]?.unlocked || 
                           rData.valentine?.unlocked?.[msg.lock.rewardId];
                           
        if (!isUnlocked) {
            alert("Du benötigst erst den Erfolg: " + msg.lock.rewardId);
            return;
        }
    }

    // Unlock!
    msg.openedAt = Date.now();
    saveState();
    
    // Emit Hook
    if (window.parent.FIAOS_EVENTS) {
        window.parent.FIAOS_EVENTS.emit("vault.opened", { id: msg.id });
    }

    renderList(); // Update UI to flat card
    setTimeout(() => openReader(msg), 300); // Auto open reader
}

function openReader(msg) {
    const reader = document.getElementById('reader');
    const title = document.getElementById('readerTitle');
    const body = document.getElementById('readerBody');
    const date = document.getElementById('readerDate');
    const sheet = document.getElementById('paperSheet');

    title.innerText = msg.title;
    body.innerText = msg.body;
    date.innerText = `Geschrieben von ${msg.author.name} am ${new Date(msg.createdAt).toLocaleString()}`;
    
    // Theme
    sheet.style.background = msg.style?.paper === 'pink' ? '#fff0f5' : '#fff7f0';
    if (msg.style?.paper === 'night') {
        sheet.style.background = '#2c2c2e';
        sheet.style.color = '#e5e5e5';
    } else {
        sheet.style.color = '#333';
    }

    reader.classList.add('active');
}

// --- Composer ---

function openComposer() {
    document.getElementById('composer').classList.add('active');
    
    // Populate Rewards
    const sel = document.getElementById('inpRewardId');
    sel.innerHTML = REWARDS_LIST.map(r => `<option value="${r.id}">${r.name}</option>`).join('');
}

function saveMessage() {
    const title = document.getElementById('inpTitle').value.trim();
    const body = document.getElementById('inpBody').value.trim();
    const lockType = document.getElementById('inpLockType').value;
    
    if (!title || !body) {
        alert("Bitte Titel und Text eingeben.");
        return;
    }

    const newMsg = {
        id: 'msg_' + Date.now(),
        title,
        body,
        author: {
            id: user.id,
            name: user.name,
            avatar: user.avatar
        },
        createdAt: Date.now(),
        lock: { type: lockType },
        openedAt: null,
        isPinned: false,
        style: { sealColor: '#ec4899', paper: 'classic' }
    };

    if (lockType === 'time') {
        const ts = new Date(document.getElementById('inpTime').value).getTime();
        if (!ts || ts < Date.now()) {
            alert("Bitte ein Datum in der Zukunft wählen.");
            return;
        }
        newMsg.lock.unlockAt = ts;
    } else if (lockType === 'reward') {
        newMsg.lock.rewardId = document.getElementById('inpRewardId').value;
    }

    vaultState.messages.push(newMsg);
    saveState();
    
    // Reset & Close
    document.getElementById('inpTitle').value = '';
    document.getElementById('inpBody').value = '';
    document.getElementById('composer').classList.remove('active');
    
    if (window.parent.FIAOS_EVENTS) {
        window.parent.FIAOS_EVENTS.emit("vault.created", { id: newMsg.id });
    }

    renderList();
}

// --- Utils ---

function bindEvents() {
    document.getElementById('btnAdd').onclick = openComposer;
    document.getElementById('composerCancel').onclick = () => document.getElementById('composer').classList.remove('active');
    document.getElementById('composerSave').onclick = saveMessage;
    
    document.getElementById('readerClose').onclick = () => document.getElementById('reader').classList.remove('active');
    
    document.getElementById('inpLockType').onchange = (e) => {
        document.getElementById('groupTime').classList.toggle('hidden', e.target.value !== 'time');
        document.getElementById('groupReward').classList.toggle('hidden', e.target.value !== 'reward');
    };
    
    // Init hidden fields
    document.getElementById('groupTime').classList.add('hidden');
    document.getElementById('groupReward').classList.add('hidden');
}

window.filterList = (type, idx) => {
    activeFilter = type;
    document.getElementById('segIndicator').style.transform = `translateX(${idx * 100}%)`;
    renderList();
};

// Start
init();