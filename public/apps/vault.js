
/**
 * Message Vault Logic (Cloud Enabled)
 */

const KEYS = { SESSION: 'fiaos_session' };
const REWARDS_LIST = [
    { id: 'reward.streak3', name: 'Streak: 3 Tage 🔥' },
    { id: 'valentine.reward.pizza', name: 'Valentine: Pizza Date 🍕' },
    { id: 'games.stack.50', name: 'Stack Profi 🧱' }
];

let user = null;
let vaultState = null;
let cloud = null;
let activeFilter = 'all';

function init() {
    const sessionStr = localStorage.getItem(KEYS.SESSION);
    if (!sessionStr) return;
    user = JSON.parse(sessionStr);

    if (window.parent.FIAOS && window.parent.FIAOS.cloud) {
        cloud = window.parent.FIAOS.cloud;
    }

    if (user.role === 'guest') updateFooter('Lokal (Gast)', 'offline');
    else updateFooter('Verbinde...', 'loading');

    loadState();
    bindEvents();
    setInterval(updateTimers, 1000);
}

function updateFooter(text, status) {
    document.getElementById('footerText').innerText = text;
    document.getElementById('footerDot').className = 'status-dot ' + status;
}

async function loadState() {
    try {
        if (cloud && user.role !== 'guest') updateFooter('Synchronisiere...', 'loading');
        
        const data = await cloud.loadVault();
        vaultState = data && data.messages ? data : { messages: [] };
        
        if (user.role !== 'guest') updateFooter('Cloud Synchronisiert', 'online');
        renderList();
    } catch (e) {
        console.error("Vault Load Error", e);
        vaultState = { messages: [] };
        updateFooter('Verbindungsfehler', 'offline');
        renderList();
    }
}

async function saveState() {
    if (!vaultState) return;
    
    if (user.role !== 'guest') updateFooter('Speichere...', 'loading');
    
    try {
        await cloud.saveVault(vaultState);
        if (user.role !== 'guest') updateFooter('Gespeichert', 'online');
    } catch(e) {
        updateFooter('Fehler beim Speichern', 'offline');
    }
}

function renderList() {
    const container = document.getElementById('msgList');
    container.innerHTML = '';

    if (!vaultState || !vaultState.messages) {
        container.innerHTML = '<div class="empty-state">Ladefehler...</div>';
        return;
    }

    const list = vaultState.messages.filter(m => {
        if (activeFilter === 'all') return true;
        if (activeFilter === 'locked') return !m.openedAt;
        if (activeFilter === 'opened') return !!m.openedAt;
        if (activeFilter === 'pinned') return m.isPinned;
        return true;
    }).sort((a, b) => b.createdAt - a.createdAt);

    if (list.length === 0) {
        container.innerHTML = '<div class="empty-state">Der Tresor ist leer. 📭</div>';
        return;
    }

    list.forEach(msg => {
        const el = document.createElement('div');
        const isOpened = !!msg.openedAt;
        el.className = `msg-card ${isOpened ? 'opened' : ''}`;
        el.onclick = () => handleCardClick(msg);

        let statusText = 'Verschlossen';
        let lockIcon = '🔐';
        let extraBadge = '';

        if (!isOpened) {
            if (msg.lock && msg.lock.type === 'time') {
                const diff = msg.lock.unlockAt - Date.now();
                if (diff > 0) {
                    statusText = 'Zeit-Schloss';
                    lockIcon = '⏳';
                    extraBadge = `<span class="time-lock" data-ts="${msg.lock.unlockAt}">...</span>`;
                } else {
                    statusText = 'Bereit';
                    lockIcon = '🔓';
                }
            } else if (msg.lock && msg.lock.type === 'reward') {
                statusText = 'Belohnung';
                lockIcon = '🏆';
            }
        } else {
            statusText = 'Gelesen';
            lockIcon = '📜';
        }

        const authorName = msg.author?.name || 'Unbekannt';
        const sealColor = msg.style?.sealColor || '#ec4899';

        el.innerHTML = `
            <div class="envelope-layer">
                <div class="seal" style="background:${sealColor}">${lockIcon}</div>
            </div>
            <div class="envelope-flap-top"></div>
            
            <div class="card-content">
                <div>
                    <div class="msg-title">${msg.title || 'Nachricht'}</div>
                    <div class="msg-preview">${isOpened ? (msg.body || '').substring(0, 80) + '...' : 'Inhalt ist sicher verwahrt.'}</div>
                </div>
                <div class="msg-footer">
                    <div class="author-info">
                        <div class="author-avatar">${authorName.charAt(0)}</div>
                        <span>${authorName}</span>
                    </div>
                    <div style="display:flex; align-items:center; gap:6px;">
                        ${extraBadge}
                        <div class="status-badge">${statusText}</div>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(el);
    });
    updateTimers();
}

function handleCardClick(msg) {
    if (msg.openedAt) { openReader(msg); return; }
    
    if (msg.lock && msg.lock.type === 'time') {
        if (Date.now() < msg.lock.unlockAt) { 
            alert("Diese Nachricht ist noch durch ein Zeitschloss gesichert! ⏳"); 
            return; 
        }
    } else if (msg.lock && msg.lock.type === 'reward') {
        // Simple bridge check would be better, but local storage fallback for now
        const rKey = user.role === 'guest' ? 'fiaos_rewards_guest' : `fiaos_rewards_${user.id}`; // Note: rewards are usually user bound, but we check current user
        // Actually for vault, unlocking depends on the viewer.
        let unlocked = false;
        try {
            // Try to get rewards via parent frame bridge if possible, otherwise crude local check
            // In a real scenario, we'd use cloud.loadRewards()
            // Let's optimistic check via cloud for correct behavior
            // But sync might be slow for click handler.
            // Simplified:
            const rData = JSON.parse(localStorage.getItem(rKey) || '{}');
            unlocked = rData.rewards?.[msg.lock.rewardId]?.unlocked || rData.valentine?.unlocked?.[msg.lock.rewardId];
        } catch(e){}
        
        if (!unlocked) { 
            alert("Du benötigst einen bestimmten Erfolg, um das zu öffnen! 🏆"); 
            return; 
        }
    }

    if (confirm("Siegel brechen und Nachricht öffnen?")) {
        msg.openedAt = Date.now();
        saveState();
        renderList();
        setTimeout(() => openReader(msg), 400);
    }
}

function saveMessage() {
    const title = document.getElementById('inpTitle').value.trim();
    const body = document.getElementById('inpBody').value.trim();
    const lockType = document.getElementById('inpLockType').value;
    
    if (!title || !body) return;

    const newMsg = {
        id: 'msg_' + Date.now(),
        title, body,
        author: { 
            id: user.id, 
            name: user.name, 
            avatar: { type: 'emoji', value: user.name.charAt(0) } 
        },
        createdAt: Date.now(),
        lock: { type: lockType, unlockAt: null, rewardId: null },
        openedAt: null,
        isPinned: false,
        style: { sealColor: '#ec4899', paper: 'classic' }
    };

    if (lockType === 'time') {
        const val = document.getElementById('inpTime').value;
        if (val) {
            newMsg.lock.unlockAt = new Date(val).getTime();
        } else {
            newMsg.lock.type = 'none';
        }
    } else if (lockType === 'reward') {
        newMsg.lock.rewardId = document.getElementById('inpRewardId').value;
    }

    if (!vaultState.messages) vaultState.messages = [];
    vaultState.messages.push(newMsg);
    saveState();
    
    document.getElementById('composer').classList.remove('active');
    renderList();
}

function openReader(msg) {
    document.getElementById('readerTitle').innerText = msg.title;
    document.getElementById('readerBody').innerText = msg.body;
    document.getElementById('readerDate').innerText = new Date(msg.createdAt).toLocaleString();
    document.getElementById('reader').classList.add('active');
}

function bindEvents() {
    document.getElementById('btnAdd').onclick = () => {
        document.getElementById('composer').classList.add('active');
        document.getElementById('inpTitle').value = '';
        document.getElementById('inpBody').value = '';
        
        const sel = document.getElementById('inpRewardId');
        sel.innerHTML = REWARDS_LIST.map(r => `<option value="${r.id}">${r.name}</option>`).join('');
    };
    document.getElementById('composerCancel').onclick = () => document.getElementById('composer').classList.remove('active');
    document.getElementById('composerSave').onclick = saveMessage;
    document.getElementById('readerClose').onclick = () => document.getElementById('reader').classList.remove('active');
    document.getElementById('inpLockType').onchange = (e) => {
        document.getElementById('groupTime').classList.toggle('hidden', e.target.value !== 'time');
        document.getElementById('groupReward').classList.toggle('hidden', e.target.value !== 'reward');
    };
}

window.filterList = (type, idx) => { activeFilter = type; document.getElementById('segIndicator').style.transform = `translateX(${idx * 100}%)`; renderList(); };

function updateTimers() {
    document.querySelectorAll('.time-lock').forEach(el => {
        const ts = parseInt(el.getAttribute('data-ts'));
        if (!ts) return;
        const diff = ts - Date.now();
        if (diff <= 0) { 
            el.innerText = "Jetzt!"; 
            el.style.color = "#4ade80"; 
        } else {
            const d = Math.floor(diff / (1000*60*60*24));
            const h = Math.floor((diff % (1000*60*60*24)) / (1000*60*60));
            const m = Math.floor((diff % (1000*60*60)) / (1000*60));
            el.innerText = `${d}d ${h}h ${m}m`;
        }
    });
}

init();
