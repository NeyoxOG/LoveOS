
/**
 * Vault Logic 2.0
 */

const KEYS = { SESSION: 'fiaos_session' };

let user = null;
let vaultState = { messages: [] };
let cloud = null;

function init() {
    const sessionStr = localStorage.getItem(KEYS.SESSION);
    if (!sessionStr) return;
    user = JSON.parse(sessionStr);
    user.id = user.id || user.userId;

    if (window.parent.FIAOS && window.parent.FIAOS.cloud) {
        cloud = window.parent.FIAOS.cloud;
    }

    loadState();
    setInterval(updateTimers, 1000);

    // Bindings
    document.getElementById('btnAdd').onclick = openComposer;
    document.getElementById('inpLockType').onchange = (e) => {
        document.getElementById('groupTime').classList.toggle('hidden', e.target.value !== 'time');
    };
}

async function loadState() {
    if (cloud && user.role !== 'guest') {
        const data = await cloud.loadVault();
        if (data) vaultState = data;
    } else {
        const local = localStorage.getItem('fiaos_guest_vault');
        if (local) vaultState = JSON.parse(local);
    }
    
    // Safety check
    if (!Array.isArray(vaultState.messages)) vaultState.messages = [];
    
    renderGrid();
}

async function saveState() {
    if (cloud && user.role !== 'guest') {
        await cloud.saveVault(vaultState);
    } else {
        localStorage.setItem('fiaos_guest_vault', JSON.stringify(vaultState));
    }
    renderGrid();
}

function renderGrid() {
    const grid = document.getElementById('vaultGrid');
    grid.innerHTML = '';

    if (vaultState.messages.length === 0) {
        grid.innerHTML = '<div class="empty-state">Der Tresor ist leer. 📭</div>';
        return;
    }

    // Sort: Locked first, then by date
    const sorted = [...vaultState.messages].sort((a, b) => {
        const aLocked = isLocked(a);
        const bLocked = isLocked(b);
        if (aLocked !== bLocked) return aLocked ? -1 : 1;
        return b.createdAt - a.createdAt;
    });

    sorted.forEach(msg => {
        const locked = isLocked(msg);
        const opened = !!msg.openedAt;
        
        const el = document.createElement('div');
        el.className = `envelope-wrapper ${opened ? 'opened' : ''}`;
        el.onclick = () => handleEnvelopeClick(msg);

        let icon = '🔒';
        let timerHtml = '';
        
        if (opened) {
            icon = '📜';
        } else if (msg.lock.type === 'time') {
            icon = '⏳';
            timerHtml = `<div class="env-timer" data-ts="${msg.lock.unlockAt}">...</div>`;
        }

        el.innerHTML = `
            <div class="envelope">
                <div class="env-flap"></div>
                <div class="env-body">
                    <div class="env-seal">${icon}</div>
                    <div class="env-info">
                        <div class="env-title">${msg.title}</div>
                        ${timerHtml}
                    </div>
                </div>
            </div>
        `;
        grid.appendChild(el);
    });
    
    updateTimers();
}

function isLocked(msg) {
    if (msg.openedAt) return false;
    if (msg.lock.type === 'time') {
        return Date.now() < msg.lock.unlockAt;
    }
    return false; // 'none' lock is effectively unlocked but visually sealed until clicked
}

function handleEnvelopeClick(msg) {
    // If already opened, show reader
    if (msg.openedAt) {
        openReader(msg);
        return;
    }

    // Check Lock
    if (msg.lock.type === 'time') {
        if (Date.now() < msg.lock.unlockAt) {
            // Shake effect or toast?
            if(window.parent.FIAOS) window.parent.FIAOS.playSound('error');
            alert("Noch verschlossen! ⏳");
            return;
        }
    }

    // Unlock logic
    if (confirm("Siegel brechen und Nachricht lesen?")) {
        msg.openedAt = Date.now();
        if(window.parent.FIAOS) window.parent.FIAOS.playSound('success');
        saveState(); // Will re-render
        setTimeout(() => openReader(msg), 600); // Wait for open animation?
    }
}

function openReader(msg) {
    document.getElementById('readerTitle').innerText = msg.title;
    document.getElementById('readerBody').innerText = msg.body;
    document.getElementById('reader').classList.add('active');
    if(window.parent.FIAOS) window.parent.FIAOS.playSound('open');
}

window.closeReader = () => {
    document.getElementById('reader').classList.remove('active');
    if(window.parent.FIAOS) window.parent.FIAOS.playSound('close');
};

function updateTimers() {
    const now = Date.now();
    document.querySelectorAll('.env-timer').forEach(el => {
        const ts = parseInt(el.dataset.ts);
        if (!ts) return;
        const diff = ts - now;
        
        if (diff <= 0) {
            el.innerText = "BEREIT";
            el.style.color = "#4ade80";
        } else {
            const d = Math.floor(diff / (1000 * 60 * 60 * 24));
            const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            
            if (d > 0) el.innerText = `${d}T ${h}h`;
            else if (h > 0) el.innerText = `${h}h ${m}m`;
            else el.innerText = `${m}m left`;
        }
    });
}

// --- Composer ---

function openComposer() {
    document.getElementById('composer').classList.add('active');
    document.getElementById('inpTitle').value = '';
    document.getElementById('inpBody').value = '';
    document.getElementById('inpLockType').value = 'none';
    document.getElementById('groupTime').classList.add('hidden');
}

window.closeComposer = () => {
    document.getElementById('composer').classList.remove('active');
};

window.saveMessage = async () => {
    const title = document.getElementById('inpTitle').value.trim();
    const body = document.getElementById('inpBody').value.trim();
    const lockType = document.getElementById('inpLockType').value;
    
    if (!title || !body) return;

    const newMsg = {
        id: crypto.randomUUID(),
        title, body,
        createdAt: Date.now(),
        openedAt: null,
        lock: { type: lockType, unlockAt: null }
    };

    if (lockType === 'time') {
        const val = document.getElementById('inpTime').value;
        if (val) newMsg.lock.unlockAt = new Date(val).getTime();
        else newMsg.lock.type = 'none'; // Fallback
    }

    vaultState.messages.unshift(newMsg);
    await saveState();
    closeComposer();
    if(window.parent.FIAOS) window.parent.FIAOS.playSound('success');
};

init();
