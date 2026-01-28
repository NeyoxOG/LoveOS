
/**
 * Diary Logic 2.0
 */

const KEYS = { SESSION: 'fiaos_session' };

// Mood Value Map for Chart
const MOOD_VALUES = {
    '💗': 100, '✨': 90, '😊': 80, '🌙': 70,
    '😐': 50, '😔': 30, '😡': 10
};

let user = null;
let cloud = null;
let entries = [];
let currentMood = '💗';
let viewMode = 'list'; // 'list' | 'calendar'

function init() {
    const sessionStr = localStorage.getItem(KEYS.SESSION);
    if (!sessionStr) return;
    user = JSON.parse(sessionStr);

    if (window.parent.FIAOS && window.parent.FIAOS.cloud) {
        cloud = window.parent.FIAOS.cloud;
    }

    loadData();
}

async function loadData() {
    if (cloud && user.role !== 'guest') {
        entries = await cloud.loadDiary();
    } else {
        entries = JSON.parse(localStorage.getItem('fiaos_guest_diary') || '[]');
    }
    
    // Sort descending
    entries.sort((a,b) => b.createdAt - a.createdAt);
    
    renderChart();
    renderList();
    renderCalendar();
}

// --- Views ---

function setView(mode) {
    viewMode = mode;
    document.getElementById('btnList').classList.toggle('active', mode === 'list');
    document.getElementById('btnCal').classList.toggle('active', mode === 'calendar');
    
    document.getElementById('listView').style.display = mode === 'list' ? 'flex' : 'none';
    document.getElementById('calendarView').style.display = mode === 'calendar' ? 'grid' : 'none';
}

// --- Renderers ---

function renderChart() {
    const container = document.getElementById('chartBars');
    container.innerHTML = '';
    
    // Last 7 entries (reverse for chronological left-to-right)
    const recent = entries.slice(0, 7).reverse();
    
    // Fill if less than 7
    while (recent.length < 7) recent.unshift(null);

    recent.forEach(entry => {
        const val = entry ? (MOOD_VALUES[entry.mood] || 50) : 0;
        const col = document.createElement('div');
        col.className = 'chart-col';
        
        const dayLabel = entry ? new Date(entry.createdAt).toLocaleDateString('de-DE', {weekday:'short'}).slice(0,2) : '-';
        
        col.innerHTML = `
            <div class="bar-bg">
                <div class="bar-fill" style="height: ${val}%"></div>
            </div>
            <div class="col-label">${dayLabel}</div>
        `;
        container.appendChild(col);
    });
}

function renderList() {
    const list = document.getElementById('listView');
    list.innerHTML = '';
    
    if (entries.length === 0) {
        list.innerHTML = '<div style="text-align:center; color:#666; margin-top:40px;">Dein Journal ist leer.</div>';
        return;
    }

    entries.forEach(entry => {
        const date = new Date(entry.createdAt);
        const dateStr = date.toLocaleDateString('de-DE', { day: 'numeric', month: 'long' });
        
        const el = document.createElement('div');
        el.className = 'entry-card';
        el.onclick = () => openEditor(entry); // Edit mode
        
        el.innerHTML = `
            <div class="entry-mood-box">${entry.mood}</div>
            <div class="entry-info">
                <div class="entry-date">${dateStr}</div>
                <div class="entry-title">${entry.title || 'Ohne Titel'}</div>
                <div class="entry-snippet">${entry.text}</div>
            </div>
        `;
        list.appendChild(el);
    });
}

function renderCalendar() {
    const cal = document.getElementById('calendarView');
    cal.innerHTML = '';
    
    // Simple current month view logic
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    for(let d=1; d<=daysInMonth; d++) {
        // Check if entry exists on this day
        // Simplified check: iterate entries
        const hasEntry = entries.some(e => {
            const ed = new Date(e.createdAt);
            return ed.getDate() === d && ed.getMonth() === month && ed.getFullYear() === year;
        });
        
        const el = document.createElement('div');
        el.className = `cal-day ${hasEntry ? 'has-entry' : ''}`;
        el.innerHTML = `
            ${d}
            ${hasEntry ? '<div class="cal-dot"></div>' : ''}
        `;
        cal.appendChild(el);
    }
}

// --- Editor ---

let editingId = null;

window.openEditor = (existingEntry = null) => {
    editingId = existingEntry ? existingEntry.id : null;
    
    document.getElementById('inpTitle').value = existingEntry ? existingEntry.title : '';
    document.getElementById('inpBody').value = existingEntry ? existingEntry.text : '';
    setMood(existingEntry ? existingEntry.mood : '💗');
    
    document.getElementById('editor').classList.add('active');
};

window.closeEditor = () => {
    document.getElementById('editor').classList.remove('active');
};

window.setMood = (m) => {
    currentMood = m;
    document.querySelectorAll('.mood-opt').forEach(el => {
        el.classList.toggle('selected', el.innerText === m);
    });
};

window.saveEntry = async () => {
    const title = document.getElementById('inpTitle').value.trim();
    const text = document.getElementById('inpBody').value.trim();
    
    if (!text) return;

    const entry = {
        id: editingId || crypto.randomUUID(),
        title, text, mood: currentMood,
        createdAt: editingId ? (entries.find(e=>e.id===editingId).createdAt) : Date.now(),
        updatedAt: Date.now(),
        authorUserId: user.id,
        authorName: user.name,
        scope: 'user' // Default to private for Journal 2.0 simplification
    };

    // Optimistic Update
    if (editingId) {
        const idx = entries.findIndex(e => e.id === editingId);
        if (idx !== -1) entries[idx] = entry;
    } else {
        entries.unshift(entry);
    }
    
    closeEditor();
    renderList();
    renderChart();
    renderCalendar();
    
    if (cloud && user.role !== 'guest') {
        await cloud.saveDiaryEntry(entry);
    } else {
        localStorage.setItem('fiaos_guest_diary', JSON.stringify(entries));
    }
    
    if(window.parent.FIAOS) window.parent.FIAOS.playSound('success');
};

window.setView = setView;

init();
