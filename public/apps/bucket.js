
/**
 * Bucket List App Logic
 */

const KEYS = { SESSION: 'fiaos_session' };

let user = null;
let cloud = null;
let bucketData = { items: [] };
let currentFilter = 'all';
let newCat = 'travel';

const CAT_LABELS = {
    travel: 'Reisen ✈️',
    dates: 'Dates 🍷',
    life: 'Leben 🏠',
    fun: 'Fun 🤪'
};

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
    if (cloud) {
        bucketData = await cloud.loadBucket();
    } else {
        // Fallback for Guest / Offline
        bucketData = JSON.parse(localStorage.getItem('fiaos_guest_bucket') || '{"items":[]}');
    }
    // Migration check
    if (!Array.isArray(bucketData.items)) bucketData.items = [];
    
    renderList();
    updateProgress();
}

async function saveData() {
    if (cloud) {
        await cloud.saveBucket(bucketData);
    } else {
        localStorage.setItem('fiaos_guest_bucket', JSON.stringify(bucketData));
    }
    updateProgress();
}

function renderList() {
    const list = document.getElementById('list');
    list.innerHTML = '';

    const filtered = bucketData.items.filter(item => 
        currentFilter === 'all' || item.category === currentFilter
    );

    // Sort: Not Done first, then by date
    filtered.sort((a, b) => {
        if (a.done === b.done) return b.createdAt - a.createdAt;
        return a.done ? 1 : -1;
    });

    if (filtered.length === 0) {
        list.innerHTML = '<div class="empty-state">Noch keine Ziele in dieser Kategorie.<br>Füg was Schönes hinzu! ✨</div>';
        return;
    }

    filtered.forEach(item => {
        const el = document.createElement('div');
        el.className = 'item-card';
        el.innerHTML = `
            <div class="checkbox ${item.done ? 'checked' : ''}" onclick="toggleItem('${item.id}')">
                <span class="checkbox-icon">✔</span>
            </div>
            <div class="item-info">
                <div class="item-title ${item.done ? 'done' : ''}">${item.title}</div>
                <div class="item-meta">
                    <span class="category-badge" style="color:${getCatColor(item.category)}">${CAT_LABELS[item.category] || item.category}</span>
                    ${item.done && item.doneAt ? `• Erledigt am ${new Date(item.doneAt).toLocaleDateString()}` : ''}
                </div>
            </div>
        `;
        list.appendChild(el);
    });
}

function updateProgress() {
    const total = bucketData.items.length;
    const done = bucketData.items.filter(i => i.done).length;
    
    document.getElementById('progText').innerText = `${done}/${total}`;
    const pct = total === 0 ? 0 : (done / total) * 100;
    document.getElementById('progBar').style.width = `${pct}%`;
    
    // Check first reward
    if (total >= 1) unlock('bucket.first');
    if (done >= 1) unlock('bucket.done1');
}

window.toggleItem = (id) => {
    const item = bucketData.items.find(i => i.id === id);
    if (!item) return;
    
    item.done = !item.done;
    item.doneAt = item.done ? Date.now() : null;
    
    if (item.done) playSound('success');
    else playSound('click');
    
    renderList();
    saveData();
};

window.addItem = () => {
    const title = document.getElementById('inpTitle').value.trim();
    if (!title) return;
    
    const newItem = {
        id: 'b_' + Date.now(),
        title: title,
        category: newCat,
        done: false,
        createdAt: Date.now(),
        createdBy: user.name
    };
    
    bucketData.items.unshift(newItem);
    
    document.getElementById('inpTitle').value = '';
    closeModal();
    saveData();
    renderList();
    playSound('success');
};

// --- UI ---

window.filter = (cat) => {
    currentFilter = cat;
    document.querySelectorAll('.tab-chip').forEach(el => {
        if (el.innerText.includes(CAT_LABELS[cat] || 'Alle')) el.classList.add('active');
        else el.classList.remove('active');
    });
    // Visual fix for "Alle" manual match or logic
    if (cat === 'all') {
        document.querySelectorAll('.tab-chip').forEach(el => el.classList.remove('active'));
        document.querySelector('.tab-chip:first-child').classList.add('active');
    }
    
    renderList();
    playSound('click');
};

window.selectCat = (cat) => {
    newCat = cat;
    document.querySelectorAll('.cat-opt').forEach(el => el.classList.remove('selected'));
    // Simple way to find the clicked one or re-render
    event.target.classList.add('selected');
};

window.openModal = () => {
    document.getElementById('modal').classList.add('active');
    playSound('open');
};

window.closeModal = () => {
    document.getElementById('modal').classList.remove('active');
    playSound('close');
};

function getCatColor(cat) {
    if (cat === 'travel') return '#60a5fa';
    if (cat === 'dates') return '#f472b6';
    if (cat === 'life') return '#34d399';
    return '#fbbf24';
}

function unlock(id) {
    if (window.parent.FIAOS) {
        window.parent.FIAOS.bridgeUnlockReward({ rewardId: id });
    }
}

function playSound(type) {
    if (window.parent.FIAOS) {
        window.parent.FIAOS.playSound(type);
    }
}

init();
