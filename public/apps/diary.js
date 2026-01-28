
/**
 * Diary App Logic (Cloud Enabled)
 */

const KEYS = { SESSION: 'fiaos_session' };

let user = null;
let entries = [];
let cloud = null;
let currentTab = 'user';
let currentMood = '💗';
let isShared = false;
let currentSearch = '';
let editingId = null;

function init() {
    const sessionStr = localStorage.getItem(KEYS.SESSION);
    if (!sessionStr) return;
    user = JSON.parse(sessionStr);

    if (window.parent.FIAOS && window.parent.FIAOS.cloud) {
        cloud = window.parent.FIAOS.cloud;
    }

    if (user.role === 'guest') {
        document.getElementById('scopeControl').style.display = 'none';
        document.getElementById('scopeToggleRow').style.display = 'none';
    }

    loadData();
}

async function loadData() {
    entries = await cloud.loadDiary();
    renderTimeline();
}

function renderTimeline() {
    const container = document.getElementById('timeline');
    container.innerHTML = '';

    let filtered = entries.filter(e => {
        if (currentTab === 'user' && e.scope !== 'user') return false;
        if (currentTab === 'shared' && e.scope !== 'shared') return false;
        if (currentSearch) {
            const q = currentSearch.toLowerCase();
            return (e.title && e.title.toLowerCase().includes(q)) || e.text.toLowerCase().includes(q);
        }
        return true;
    });

    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state">Noch keine Einträge. Schreib was! ✍️</div>';
        return;
    }

    filtered.forEach(entry => {
        const date = new Date(entry.createdAt);
        const dateStr = date.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: 'short' });
        
        const el = document.createElement('div');
        el.className = 'entry-card';
        el.onclick = () => openDetail(entry.id);
        
        el.innerHTML = `
            <div class="entry-mood">${entry.mood}</div>
            <div class="entry-content">
                <div class="entry-header">
                    <span class="entry-date">${dateStr}</span>
                    ${entry.pinned ? '<span class="pinned-icon">📌</span>' : ''}
                </div>
                <div class="entry-title">${entry.title || 'Ohne Titel'} 
                    ${entry.scope === 'shared' ? `<span class="author-badge">${entry.authorName || 'Unbekannt'}</span>` : ''}
                </div>
                <div class="entry-preview">${entry.text}</div>
            </div>
        `;
        container.appendChild(el);
    });
}

window.setTab = (tab, idx) => {
    if (user.role === 'guest' && tab === 'shared') {
        alert("Nur für Fia & Collin verfügbar.");
        return;
    }
    currentTab = tab;
    document.getElementById('segIndicator').style.transform = `translateX(${idx * 100}%)`;
    renderTimeline();
};

window.saveEntry = async () => {
    const title = document.getElementById('inpTitle').value.trim();
    const text = document.getElementById('inpText').value.trim();
    
    if (!text) { alert("Bitte schreibe etwas..."); return; }

    const entry = {
        id: editingId || crypto.randomUUID(),
        createdAt: editingId ? (entries.find(e=>e.id===editingId)?.createdAt || Date.now()) : Date.now(),
        updatedAt: Date.now(),
        authorUserId: user.id,
        authorName: user.name,
        scope: isShared ? 'shared' : 'user',
        title: title,
        text: text,
        mood: currentMood,
        pinned: false
    };

    await cloud.saveDiaryEntry(entry);
    loadData();
    closeEditor();
};

window.deleteCurrentEntry = async (id) => {
    if (confirm("Wirklich löschen?")) {
        const entry = entries.find(e => e.id === id);
        if (entry) {
            await cloud.deleteDiaryEntry(id, entry.scope);
            loadData();
            closeDetail();
        }
    }
};

// ... existing UI helpers ...
window.openEditor = () => { editingId = null; document.getElementById('inpTitle').value = ''; document.getElementById('inpText').value = ''; selectMood('💗'); isShared = (currentTab === 'shared'); updateSharedToggle(); document.getElementById('editorOverlay').classList.add('active'); };
window.closeEditor = () => { document.getElementById('editorOverlay').classList.remove('active'); };
window.selectMood = (m) => { currentMood = m; document.querySelectorAll('.mood-opt').forEach(el => el.classList.toggle('selected', el.innerText === m)); };
window.toggleShared = () => { if (user.role === 'guest') return; isShared = !isShared; updateSharedToggle(); };
function updateSharedToggle() { const t = document.getElementById('toggleShared'); if (isShared) t.classList.add('active'); else t.classList.remove('active'); }
let viewingId = null;
window.openDetail = (id) => { viewingId = id; const entry = entries.find(e => e.id === id); if (!entry) return; renderDetailContent(entry); document.getElementById('detailView').classList.add('active'); };
window.closeDetail = () => { document.getElementById('detailView').classList.remove('active'); };
window.editCurrentEntry = () => { const entry = entries.find(e => e.id === viewingId); if (!entry) return; editingId = entry.id; document.getElementById('inpTitle').value = entry.title; document.getElementById('inpText').value = entry.text; selectMood(entry.mood); isShared = entry.scope === 'shared'; updateSharedToggle(); document.getElementById('editorOverlay').classList.add('active'); };
function renderDetailContent(entry) {
    const dateStr = new Date(entry.createdAt).toLocaleString('de-DE');
    document.getElementById('detailContent').innerHTML = `<div style="font-size:60px; margin-bottom:20px;">${entry.mood}</div><div class="detail-date">${dateStr} • ${entry.authorName}</div><div class="detail-title">${entry.title||'Ohne Titel'}</div><div class="detail-text">${entry.text}</div><div class="detail-meta">Scope: ${entry.scope === 'shared' ? 'Wir 👫' : 'Nur ich 🔒'}</div><button class="delete-btn" onclick="deleteCurrentEntry('${entry.id}')">Löschen</button>`;
}

init();
