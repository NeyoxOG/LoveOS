
/**
 * Diary App Logic (Cloud Enhanced)
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
let isSyncing = false;

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
        updateSyncUI('Lokal (Gast)', 'offline');
    } else {
        updateSyncUI('Verbinde...', 'loading');
    }

    loadData();
}

function updateSyncUI(text, status) {
    const dot = document.getElementById('syncDot');
    const txt = document.getElementById('syncText');
    
    txt.innerText = text;
    dot.className = 'sync-dot ' + status;
}

async function loadData() {
    try {
        if (cloud && user.role !== 'guest') {
            isSyncing = true;
            updateSyncUI('Synchronisiere...', 'loading');
            entries = await cloud.loadDiary();
            updateSyncUI('Cloud Sync', 'online');
        } else {
            entries = await cloud.loadDiary(); 
            if (user.role !== 'guest') updateSyncUI('Offline Mode', 'offline');
        }
    } catch(e) {
        console.error("Load failed", e);
        updateSyncUI('Fehler', 'offline');
        entries = [];
    } finally {
        isSyncing = false;
        renderTimeline();
    }
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
        container.innerHTML = '<div class="empty-state">Noch keine Einträge.<br>Tippe auf + um zu schreiben. ✍️</div>';
        return;
    }

    filtered.forEach((entry, index) => {
        const date = new Date(entry.createdAt);
        const day = date.getDate();
        const month = date.toLocaleDateString('de-DE', { month: 'short' });
        
        const el = document.createElement('div');
        el.className = 'entry-card';
        el.style.animationDelay = `${index * 0.05}s`;
        el.onclick = () => openDetail(entry.id);
        
        el.innerHTML = `
            <div class="entry-mood-container">
                <div class="entry-mood">${entry.mood}</div>
                <div class="entry-day">${day}</div>
                <div class="entry-month">${month}</div>
            </div>
            <div class="entry-content">
                <div class="entry-header">
                    <div class="entry-title">${entry.title || 'Gedanke'}</div>
                    ${entry.pinned ? '<span class="pinned-icon">📌</span>' : ''}
                </div>
                <div class="entry-preview">${entry.text}</div>
                ${entry.scope === 'shared' ? `
                    <div class="entry-meta">
                        <span class="author-badge">Von ${entry.authorName || 'Unbekannt'}</span>
                    </div>` : ''
                }
            </div>
        `;
        container.appendChild(el);
    });
}

window.filterEntries = (val) => {
    currentSearch = val;
    renderTimeline();
};

window.setTab = (tab, idx) => {
    if (user.role === 'guest' && tab === 'shared') {
        alert("Nur für Fia & Collin verfügbar.");
        return;
    }
    playSound('click');
    currentTab = tab;
    document.getElementById('segIndicator').style.transform = `translateX(${idx * 100}%)`;
    renderTimeline();
};

window.saveEntry = async () => {
    const title = document.getElementById('inpTitle').value.trim();
    const text = document.getElementById('inpText').value.trim();
    
    if (!text) { alert("Bitte schreibe etwas..."); return; }

    updateSyncUI('Speichere...', 'loading');

    // Create or Update
    let entry = entries.find(e => e.id === editingId);
    if (!entry) {
        entry = {
            id: crypto.randomUUID(),
            createdAt: Date.now(),
            updatedAt: Date.now(),
            authorUserId: user.id,
            authorName: user.name,
            scope: isShared ? 'shared' : 'user',
            title: title,
            text: text,
            mood: currentMood,
            pinned: false
        };
    } else {
        entry.title = title;
        entry.text = text;
        entry.mood = currentMood;
        entry.scope = isShared ? 'shared' : 'user';
        entry.updatedAt = Date.now();
    }

    try {
        await cloud.saveDiaryEntry(entry);
        
        // Update local list manually
        const existIdx = entries.findIndex(e => e.id === entry.id);
        if (existIdx >= 0) entries[existIdx] = entry; else entries.unshift(entry);
        entries.sort((a,b) => b.createdAt - a.createdAt);
        
        playSound('success');
        closeEditor();
        updateSyncUI('Gespeichert', 'online');
        renderTimeline();
    } catch(e) {
        alert("Speichern fehlgeschlagen: Offline?");
        updateSyncUI('Offline', 'offline');
    }
};

window.deleteCurrentEntry = async (id) => {
    if (confirm("Wirklich löschen?")) {
        // Mock Delete via save with removed flag or just alert
        alert("Löschen Funktion noch nicht im Cloud-Adapter aktiv.");
        closeDetail();
    }
};

// UI Helpers
window.openEditor = () => { 
    editingId = null; 
    document.getElementById('inpTitle').value = ''; 
    document.getElementById('inpText').value = ''; 
    selectMood('💗'); 
    isShared = (currentTab === 'shared'); 
    updateSharedToggle(); 
    document.getElementById('editorOverlay').classList.add('active'); 
    playSound('open');
};

window.closeEditor = () => { 
    document.getElementById('editorOverlay').classList.remove('active'); 
    playSound('close');
};

window.selectMood = (m) => { 
    currentMood = m; 
    document.querySelectorAll('.mood-opt').forEach(el => {
        if (el.innerText === m) el.classList.add('selected');
        else el.classList.remove('selected');
    });
};

window.toggleShared = () => { 
    if (user.role === 'guest') return; 
    isShared = !isShared; 
    updateSharedToggle(); 
    playSound('click');
};

function updateSharedToggle() { 
    const t = document.getElementById('toggleShared'); 
    if (isShared) t.classList.add('active'); else t.classList.remove('active'); 
}

let viewingId = null;
window.openDetail = (id) => { 
    viewingId = id; 
    const entry = entries.find(e => e.id === id); 
    if (!entry) return; 
    renderDetailContent(entry); 
    document.getElementById('detailView').classList.add('active'); 
    playSound('open');
};

window.closeDetail = () => { 
    document.getElementById('detailView').classList.remove('active'); 
    playSound('close');
};

window.editCurrentEntry = () => { 
    const entry = entries.find(e => e.id === viewingId); 
    if (!entry) return; 
    editingId = entry.id; 
    document.getElementById('inpTitle').value = entry.title; 
    document.getElementById('inpText').value = entry.text; 
    selectMood(entry.mood); 
    isShared = entry.scope === 'shared'; 
    updateSharedToggle(); 
    document.getElementById('detailView').classList.remove('active');
    document.getElementById('editorOverlay').classList.add('active'); 
};

function renderDetailContent(entry) {
    const dateStr = new Date(entry.createdAt).toLocaleString('de-DE', { weekday:'long', year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit' });
    document.getElementById('detailContent').innerHTML = `
        <div class="detail-mood-large">${entry.mood}</div>
        <div class="detail-date">${dateStr}</div>
        <div class="detail-title">${entry.title || 'Ohne Titel'}</div>
        <div class="detail-text">${entry.text}</div>
        <div class="detail-meta">
            <span>${entry.scope === 'shared' ? '👫 Wir' : '🔒 Nur ich'}</span>
            <span>•</span>
            <span>Verfasst von ${entry.authorName}</span>
        </div>
        <button class="delete-btn" onclick="deleteCurrentEntry('${entry.id}')">Eintrag löschen</button>
    `;
}

function playSound(type) {
    if (window.parent.FIAOS && window.parent.FIAOS.playSound) {
        window.parent.FIAOS.playSound(type);
    }
}

init();
