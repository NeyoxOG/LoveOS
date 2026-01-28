
/**
 * Rewards App Logic
 */

const KEYS = { SESSION: 'fiaos_session' };

// Manual definitions for rewards that might not be in catalog or for nice grouping
// In a real app, this would come from a unified catalog.
const CATEGORY_NAMES = {
    general: 'Allgemein',
    love: 'Love & Beziehung',
    games: 'Arcade',
    diary: 'Tagebuch',
    valentine: 'Valentinstag',
    daily: 'Daily Bonus'
};

let user = null;
let cloud = null;
let rewardsData = null;
let currentFilter = 'active'; // 'active' | 'redeemed'
let catalog = [];

function init() {
    const sessionStr = localStorage.getItem(KEYS.SESSION);
    if (!sessionStr) return;
    user = JSON.parse(sessionStr);

    if (window.parent.FIAOS && window.parent.FIAOS.cloud) {
        cloud = window.parent.FIAOS.cloud;
    }

    // Full Catalog Mock (Synced with constants.ts)
    catalog = [
        { id: 'reward.welcome', title: 'Willkommen', icon: '✨', category: 'general' },
        { id: 'reward.welcomeTheme', title: 'Willkommens-Geschenk', description: 'Theme: Aurora freischalten 🌌', icon: '🎁', category: 'general', type: 'theme_unlock', payload: { themeId: 'aurora' } },
        { id: 'reward.streak3', title: '3 Tage Feuer', icon: '🔥', category: 'general' },
        { id: 'valentine.reward.pizza', title: 'Pizza Date', icon: '🍕', category: 'valentine' },
        { id: 'valentine.reward.photo', title: 'Foto-Date', icon: '📸', category: 'valentine' },
        { id: 'valentine.reward.letter', title: 'Brief: Zukunft', icon: '✉️', category: 'valentine' },
        { id: 'valentine.reward.care', title: 'Care Day', icon: '🫶', category: 'valentine' },
        { id: 'valentine.reward.art', title: 'Gemeinsam Malen', icon: '🎨', category: 'valentine' },
        { id: 'valentine.reward.secret', title: 'Geheime Nachricht', icon: '💌', category: 'valentine' },
        { id: 'daily.streak7', title: 'Wochen-Streak', icon: '🗓️', category: 'daily' },
        { id: 'daily.total10', title: 'Daily Sammler', icon: '🎁', category: 'daily' },
        { id: 'love_1_month', title: '1 Monat Wir', icon: '🌹', category: 'love', type: 'theme_unlock', payload: { themeId: 'softRose' } },
        { id: 'love_1_year', title: '1 Jahr', icon: '💍', category: 'love', type: 'theme_unlock', payload: { themeId: 'eternal' } },
    ];

    loadData();
}

async function loadData() {
    if (cloud) {
        rewardsData = await cloud.loadRewards();
    }
    render();
}

function render() {
    const list = document.getElementById('list');
    list.innerHTML = '';

    if (!rewardsData) {
        list.innerHTML = '<div class="empty-state">Keine Daten gefunden.</div>';
        return;
    }

    // Merge unlocked items
    const items = [];

    // 1. Standard Rewards
    for (const [id, prog] of Object.entries(rewardsData.rewards)) {
        if (prog.unlocked) {
            items.push({ id, unlockedAt: prog.unlockedAt, ...getMeta(id) });
        }
    }

    // 2. Valentine Rewards
    if (rewardsData.valentine && rewardsData.valentine.unlocked) {
        for (const [id, unlocked] of Object.entries(rewardsData.valentine.unlocked)) {
            if (unlocked) {
                items.push({ id, unlockedAt: rewardsData.valentine.completedAt || 0, ...getMeta(id) });
            }
        }
    }

    // Filter by Tab
    const filtered = items.filter(item => {
        const isRedeemed = rewardsData.redeemed && rewardsData.redeemed[item.id];
        return currentFilter === 'active' ? !isRedeemed : isRedeemed;
    });

    if (filtered.length === 0) {
        list.innerHTML = '<div class="empty-state">Hier ist nichts. ✨</div>';
        return;
    }

    // Group by Category
    const grouped = {};
    filtered.forEach(item => {
        const cat = item.category || 'general';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(item);
    });

    // Render Groups
    for (const [cat, groupItems] of Object.entries(grouped)) {
        const header = document.createElement('div');
        header.className = 'category-header';
        header.innerText = CATEGORY_NAMES[cat] || cat.toUpperCase();
        list.appendChild(header);

        groupItems.forEach(item => {
            const el = document.createElement('div');
            el.className = 'reward-card';
            
            const isRedeemed = currentFilter === 'redeemed';
            let actionHtml = '';
            
            if (isRedeemed) {
                const ts = rewardsData.redeemed[item.id];
                const dateStr = new Date(ts).toLocaleDateString();
                actionHtml = `<div class="redeemed-badge"><span>✔</span> ${dateStr}</div>`;
            } else {
                actionHtml = `<button class="redeem-btn" onclick="redeem('${item.id}')">Einlösen</button>`;
            }

            el.innerHTML = `
                <div class="card-icon">${item.icon}</div>
                <div class="card-info">
                    <div class="card-title">${item.title}</div>
                    <div class="card-desc">${item.description || item.title}</div>
                    <div class="card-meta">${item.category.toUpperCase()}</div>
                </div>
                ${actionHtml}
            `;
            list.appendChild(el);
        });
    }
}

function getMeta(id) {
    const found = catalog.find(c => c.id === id);
    if (found) return found;
    // Fallback for unknown IDs (e.g. dynamic games rewards)
    return { title: id, icon: '🏆', category: 'general', description: 'Freigeschaltet' };
}

window.redeem = async (id) => {
    const item = getMeta(id);
    const msg = item.type === 'theme_unlock' 
        ? "Möchtest du dieses Theme jetzt aktivieren?" 
        : "Möchtest du diese Belohnung jetzt einlösen?";

    if (!confirm(msg)) return;

    // Confetti
    fireConfetti();

    // Update Local Data
    if (!rewardsData.redeemed) rewardsData.redeemed = {};
    rewardsData.redeemed[id] = Date.now();

    // Save
    if (cloud) {
        await cloud.saveRewards(rewardsData);
    }

    // Theme Unlock Logic
    if (item.type === 'theme_unlock' && item.payload?.themeId) {
        const newThemeId = item.payload.themeId;
        // Apply instantly
        if (window.parent.FIAOS) {
            // Load current prefs first to keep other settings
            const prefs = await cloud.loadPrefs();
            if (prefs) {
                prefs.theme = newThemeId;
                await cloud.savePrefs(prefs);
                // Broadcast to update UI globally
                if (window.parent.FIAOS_APPLY_PREFS) {
                    window.parent.FIAOS_APPLY_PREFS(prefs);
                }
                alert(`Theme "${newThemeId}" aktiviert! 🌌`);
            }
        }
    }

    // UI Update
    setTimeout(render, 500);
};

window.filterList = (filter, idx) => {
    currentFilter = filter;
    document.getElementById('segIndicator').style.transform = `translateX(${idx * 100}%)`;
    render();
};

function fireConfetti() {
    const container = document.getElementById('confetti');
    container.innerHTML = '';
    const colors = ['#f59e0b', '#ec4899', '#3b82f6'];
    
    for (let i = 0; i < 30; i++) {
        const c = document.createElement('div');
        c.className = 'confetti';
        c.style.left = Math.random() * 100 + 'vw';
        c.style.background = colors[Math.floor(Math.random() * colors.length)];
        c.style.animationDuration = (2 + Math.random()) + 's';
        container.appendChild(c);
    }
    setTimeout(() => container.innerHTML = '', 3000);
}

init();
