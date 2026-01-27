/**
 * Diary App Logic
 */

const KEYS = {
    SESSION: 'fiaos_session',
    USER_PREFIX: 'fiaos_user_',
    SHARED: 'fiaos_shared_diary',
    META_SUFFIX: '_diary_meta',
    DIARY_SUFFIX: '_diary'
};

let user = null;
let entries = [];
let currentTab = 'user';
let currentMood = '💗';
let isShared = false;
let currentSearch = '';
let editingId = null;

function init() {
    const sessionStr = localStorage.getItem(KEYS.SESSION);
    if (!sessionStr) return;
    user = JSON.parse(sessionStr);

    // Guest handling
    if (user.role === 'guest') {
        document.getElementById('scopeControl').style.display = 'none';
        document.getElementById('scopeToggleRow').style.display = 'none';
    }

    loadData();
    renderTimeline();
}

function loadData() {
    entries = [];
    
    // User Entries
    const userKey = `${KEYS.USER_PREFIX}${user.id}${KEYS.DIARY_SUFFIX}`;
    const userRaw = localStorage.getItem(userKey);
    if (userRaw) entries.push(...JSON.parse(userRaw));

    // Shared Entries
    const sharedRaw = localStorage.getItem(KEYS.SHARED);
    if (sharedRaw) entries.push(...JSON.parse(sharedRaw));

    // Sort by date desc
    entries.sort((a, b) => b.createdAt - a.createdAt);
}

function renderTimeline() {
    const container = document.getElementById('timeline');
    container.innerHTML = '';

    // Filter
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
                    ${entry.scope === 'shared' ? `<span class="author-badge">${entry.authorName}</span>` : ''}
                </div>
                <div class="entry-preview">${entry.text}</div>
            </div>
        `;
        container.appendChild(el);
    });
}

// --- Tabs ---
window.setTab = (tab, idx) => {
    if (user.role === 'guest' && tab === 'shared') {
        alert("Nur für Fia & Collin verfügbar.");
        return;
    }
    currentTab = tab;
    document.getElementById('segIndicator').style.transform = `translateX(${idx * 100}%)`;
    renderTimeline();
};

window.filterEntries = (val) => {
    currentSearch = val;
    renderTimeline();
};

// --- Editor ---
window.openEditor = () => {
    editingId = null;
    document.getElementById('inpTitle').value = '';
    document.getElementById('inpText').value = '';
    selectMood('💗');
    
    // Default scope based on tab
    isShared = (currentTab === 'shared');
    updateSharedToggle();
    
    document.getElementById('editorOverlay').classList.add('active');
};

window.closeEditor = () => {
    document.getElementById('editorOverlay').classList.remove('active');
};

window.selectMood = (m) => {
    currentMood = m;
    document.querySelectorAll('.mood-opt').forEach(el => {
        el.classList.toggle('selected', el.innerText === m);
    });
};

window.toggleShared = () => {
    if (user.role === 'guest') return;
    isShared = !isShared;
    updateSharedToggle();
};

function updateSharedToggle() {
    const t = document.getElementById('toggleShared');
    if (isShared) t.classList.add('active');
    else t.classList.remove('active');
}

window.saveEntry = () => {
    const title = document.getElementById('inpTitle').value.trim();
    const text = document.getElementById('inpText').value.trim();
    
    if (!text) {
        alert("Bitte schreibe etwas...");
        return;
    }

    if (editingId) {
        // Update existing
        const entry = entries.find(e => e.id === editingId);
        if (entry) {
            // Remove old version from storage first to handle scope change
            deleteFromStorage(entry);
            
            entry.title = title;
            entry.text = text;
            entry.mood = currentMood;
            entry.scope = isShared ? 'shared' : 'user';
            entry.updatedAt = Date.now();
            
            saveToStorage(entry);
        }
    } else {
        // Create new
        const newEntry = {
            id: crypto.randomUUID(),
            createdAt: Date.now(),
            updatedAt: Date.now(),
            authorUserId: user.id,
            authorName: user.name,
            scope: isShared ? 'shared' : 'user',
            title: title,
            text: text,
            mood: currentMood,
            tags: [],
            pinned: false,
            locked: false
        };
        saveToStorage(newEntry);
        checkRewards(newEntry);
    }

    loadData();
    renderTimeline();
    closeEditor();
    
    // If we were editing from detail view, update detail
    if (document.getElementById('detailView').classList.contains('active')) {
        const updated = entries.find(e => e.id === editingId); // re-find from reloaded data
        if (updated) renderDetailContent(updated);
        else closeDetail(); // might have moved scope and disappeared from view?
    }
};

function saveToStorage(entry) {
    const key = entry.scope === 'shared' ? KEYS.SHARED : `${KEYS.USER_PREFIX}${user.id}${KEYS.DIARY_SUFFIX}`;
    let list = JSON.parse(localStorage.getItem(key) || '[]');
    
    // Check if updating
    const existingIdx = list.findIndex(e => e.id === entry.id);
    if (existingIdx >= 0) {
        list[existingIdx] = entry;
    } else {
        list.push(entry);
    }
    
    localStorage.setItem(key, JSON.stringify(list));
    
    // Update Meta for User
    if (entry.authorUserId === user.id) {
        updateMeta();
    }
}

function deleteFromStorage(entry) {
    const key = entry.scope === 'shared' ? KEYS.SHARED : `${KEYS.USER_PREFIX}${entry.authorUserId}${KEYS.DIARY_SUFFIX}`;
    let list = JSON.parse(localStorage.getItem(key) || '[]');
    list = list.filter(e => e.id !== entry.id);
    localStorage.setItem(key, JSON.stringify(list));
}

function updateMeta() {
    const key = `${KEYS.USER_PREFIX}${user.id}${KEYS.META_SUFFIX}`;
    let meta = JSON.parse(localStorage.getItem(key) || '{"totalEntries":0, "streakDays":0, "lastEntryDateISO":""}');
    
    const today = new Date().toISOString().split('T')[0];
    
    meta.totalEntries++;
    
    if (meta.lastEntryDateISO !== today) {
        // Check streak
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        if (meta.lastEntryDateISO === yesterday) {
            meta.streakDays++;
        } else {
            meta.streakDays = 1; // Reset or start
        }
        meta.lastEntryDateISO = today;
    }
    
    localStorage.setItem(key, JSON.stringify(meta));
    return meta;
}

// --- Detail View ---
window.openDetail = (id) => {
    const entry = entries.find(e => e.id === id);
    if (!entry) return;
    renderDetailContent(entry);
    document.getElementById('detailView').classList.add('active');
};

function renderDetailContent(entry) {
    const dateStr = new Date(entry.createdAt).toLocaleString('de-DE');
    const container = document.getElementById('detailContent');
    
    // Background gradient based on mood (simple hash)
    const moodColor = {
        '💗': '#ec4899', '🌙': '#6366f1', '😊': '#eab308', '😴': '#94a3b8',
        '🥺': '#a855f7', '🔥': '#f97316', '✨': '#14b8a6', '☁️': '#64748b'
    }[entry.mood] || '#555';

    container.innerHTML = `
        <div style="font-size:60px; margin-bottom:20px; filter:drop-shadow(0 0 20px ${moodColor}80)">${entry.mood}</div>
        <div class="detail-date">${dateStr} • ${entry.authorName}</div>
        <div class="detail-title" style="color:${moodColor}">${entry.title || 'Ohne Titel'}</div>
        <div class="detail-text">${entry.text}</div>
        
        <div class="detail-meta">
            Scope: ${entry.scope === 'shared' ? 'Wir 👫' : 'Nur ich 🔒'}
        </div>

        <button class="delete-btn" onclick="deleteCurrentEntry('${entry.id}')">Eintrag löschen</button>
    `;
}

window.closeDetail = () => {
    document.getElementById('detailView').classList.remove('active');
};

window.editCurrentEntry = () => {
    const id = entries.find(e => document.getElementById('detailContent').innerHTML.includes(e.text))?.id; 
    // Hacky find, better store ID in DOM? 
    // Let's use a closure variable or data attr if needed, but 'editingId' global handles logic.
    // Actually, openDetail is called with ID. Let's store that ID temporarily on the view element or global.
    // Re-finding via 'entries' and global var from openDetail?
    // Let's attach ID to the detail container dataset.
    // Wait, simpler: 'openDetail' sets a global 'viewingId'
};

// Better implementation for edit/delete from detail
let viewingId = null;
window.openDetail = (id) => {
    viewingId = id;
    const entry = entries.find(e => e.id === id);
    if (!entry) return;
    renderDetailContent(entry);
    document.getElementById('detailView').classList.add('active');
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
    
    document.getElementById('editorOverlay').classList.add('active');
    // Note: Detail view remains open in background, will update on save.
};

window.deleteCurrentEntry = (id) => {
    if (confirm("Wirklich löschen?")) {
        const entry = entries.find(e => e.id === id);
        if (entry) {
            deleteFromStorage(entry);
            loadData();
            renderTimeline();
            closeDetail();
        }
    }
};

// --- Rewards ---
function checkRewards(newEntry) {
    const metaKey = `${KEYS.USER_PREFIX}${user.id}${KEYS.META_SUFFIX}`;
    const meta = JSON.parse(localStorage.getItem(metaKey));
    
    const unlock = (id) => {
        if (window.parent.FIAOS_EVENTS) {
            window.parent.FIAOS_EVENTS.emit('diary.unlock', { id });
        }
    };

    if (meta.totalEntries === 1) unlock('diary.first');
    if (meta.totalEntries === 10) unlock('diary.10');
    if (meta.totalEntries === 30) unlock('diary.30');
    if (meta.streakDays === 3) unlock('diary.streak3');
    
    if (newEntry.scope === 'shared') {
        // Check if first shared
        const sharedKey = KEYS.SHARED;
        const shared = JSON.parse(localStorage.getItem(sharedKey) || '[]');
        if (shared.filter(e => e.authorUserId === user.id).length === 1) {
            unlock('diary.shared');
        }
    }
}

init();