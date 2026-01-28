
/**
 * Message Vault Logic (Cloud Enabled)
 */

const KEYS = { SESSION: 'fiaos_session' };
const REWARDS_LIST = [
    { id: 'reward.streak3', name: 'Streak: 3 Tage 🔥' },
    { id: 'valentine.reward.pizza', name: 'Valentine: Pizza Date 🍕' }
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

    loadState();
    bindEvents();
    setInterval(updateTimers, 1000);
}

async function loadState() {
    const data = await cloud.loadVault();
    vaultState = data || { messages: [] };
    renderList();
}

async function saveState() {
    await cloud.saveVault(vaultState);
}

function renderList() {
    const container = document.getElementById('msgList');
    container.innerHTML = '';

    const list = (vaultState.messages || []).filter(m => {
        if (activeFilter === 'all') return true;
        if (activeFilter === 'locked') return !m.openedAt;
        if (activeFilter === 'opened') return !!m.openedAt;
        if (activeFilter === 'pinned') return m.isPinned;
        return true;
    }).sort((a, b) => b.createdAt - a.createdAt);

    if (list.length === 0) {
        container.innerHTML = '<div class="empty-state">Nichts gefunden.</div>';
        return;
    }

    list.forEach(msg => {
        const el = document.createElement('div');
        const isOpened = !!msg.openedAt;
        el.className = `msg-card ${isOpened ? 'opened' : ''}`;
        el.onclick = () => handleCardClick(msg);

        let lockBadge = '';
        if (!isOpened) {
            if (msg.lock.type === 'time') {
                const diff = msg.lock.unlockAt - Date.now();
                if (diff > 0) lockBadge = `<div class="lock-badge time-lock" data-ts="${msg.lock.unlockAt}">⏳ ...</div>`;
                else lockBadge = `<div class="lock-badge" style="color:#4ade80">🔓 Jetzt bereit</div>`;
            } else if (msg.lock.type === 'reward') {
                lockBadge = `<div class="lock-badge">🏆 Reward Lock</div>`;
            }
        }

        el.innerHTML = `
            ${!isOpened ? `<div class="envelope-flap"></div><div class="envelope-bg"><div class="seal" style="background:${msg.style?.sealColor || '#ec4899'}">${msg.lock.type === 'none' ? '💌' : '🔐'}</div></div>` : ''}
            <div class="msg-content">
                <div><div class="msg-header"><div class="msg-title">${msg.title}</div>${msg.isPinned ? '📌' : ''}</div><div class="msg-preview">${isOpened ? msg.body.substring(0, 60) + '...' : 'Inhalt verschlossen'}</div></div>
                <div class="msg-meta"><div class="author-badge"><div class="author-avatar">${msg.author.avatar || msg.author.name.charAt(0)}</div><span>${msg.author.name}</span></div>${lockBadge || `<span>${new Date(msg.createdAt).toLocaleDateString()}</span>`}</div>
            </div>
        `;
        container.appendChild(el);
    });
    updateTimers();
}

function handleCardClick(msg) {
    if (msg.openedAt) { openReader(msg); return; }
    
    if (msg.lock.type === 'time') {
        if (Date.now() < msg.lock.unlockAt) { alert("Noch verschlossen! Geduld. ⏳"); return; }
    } else if (msg.lock.type === 'reward') {
        // Simple check against local for now, strictly should check cloud rewards
        const rKey = `fiaos_rewards_${user.id}`;
        const rData = JSON.parse(localStorage.getItem(rKey) || '{}');
        if (!rData.rewards?.[msg.lock.rewardId]?.unlocked) { alert("Erfolg fehlt noch!"); return; }
    }

    msg.openedAt = Date.now();
    saveState();
    renderList();
    setTimeout(() => openReader(msg), 300);
}

function saveMessage() {
    const title = document.getElementById('inpTitle').value.trim();
    const body = document.getElementById('inpBody').value.trim();
    const lockType = document.getElementById('inpLockType').value;
    
    if (!title || !body) return;

    const newMsg = {
        id: 'msg_' + Date.now(),
        title, body,
        author: { id: user.id, name: user.name, avatar: user.avatar },
        createdAt: Date.now(),
        lock: { type: lockType },
        openedAt: null,
        isPinned: false,
        style: { sealColor: '#ec4899', paper: 'classic' }
    };

    if (lockType === 'time') {
        const ts = new Date(document.getElementById('inpTime').value).getTime();
        newMsg.lock.unlockAt = ts;
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
        const diff = parseInt(el.getAttribute('data-ts')) - Date.now();
        if (diff <= 0) { el.innerText = "🔓 Jetzt bereit"; el.style.color = "#4ade80"; }
    });
}

init();
