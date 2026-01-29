
/**
 * Rewards App Logic 2.0 (App Store Style)
 */

const KEYS = { SESSION: 'fiaos_session' };

const CATEGORIES = [
    { id: 'love', title: 'Love & Beziehung', color: '#ec4899' },
    { id: 'valentine', title: 'Valentinstag', color: '#f43f5e' },
    { id: 'games', title: 'Arcade', color: '#8b5cf6' },
    { id: 'diary', title: 'Tagebuch', color: '#f59e0b' },
    { id: 'daily', title: 'Daily Bonus', color: '#3b82f6' },
    { id: 'general', title: 'Allgemein', color: '#10b981' }
];

let user = null;
let cloud = null;
let rewardsData = null;
let catalog = [];

function init() {
    const sessionStr = localStorage.getItem(KEYS.SESSION);
    if (!sessionStr) return;
    user = JSON.parse(sessionStr);
    user.id = user.id || user.userId;

    if (window.parent.FIAOS && window.parent.FIAOS.cloud) {
        cloud = window.parent.FIAOS.cloud;
    }

    // Set Date in Header
    const now = new Date();
    const dateStr = now.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
    document.querySelector('.header-date').innerText = dateStr;

    // Build Catalog (Same source of truth as other apps)
    catalog = [
        { id: 'reward.welcome', title: 'Willkommen', icon: '✨', category: 'general', description: 'Der Start deiner Reise.' },
        { id: 'reward.welcomeTheme', title: 'Willkommens-Geschenk', description: 'Theme: Aurora freischalten 🌌', icon: '🎁', category: 'general', type: 'theme_unlock', payload: { themeId: 'aurora' } },
        { id: 'reward.streak3', title: '3 Tage Feuer', icon: '🔥', category: 'general', description: '3 Tage in Folge online.' },
        { id: 'reward.firstReward', title: 'Erster Erfolg', description: 'Aller Anfang ist leicht 🧩', icon: '🧩', category: 'general' },
        
        { id: 'valentine.reward.pizza', title: 'Pizza Date', icon: '🍕', category: 'valentine', description: 'Ein Abendessen geht auf mich.' },
        { id: 'valentine.reward.photo', title: 'Foto-Date', icon: '📸', category: 'valentine', description: 'Wir machen Erinnerungen.' },
        { id: 'valentine.reward.letter', title: 'Brief: Zukunft', icon: '✉️', category: 'valentine', description: 'Meine Gedanken an uns.' },
        { id: 'valentine.reward.care', title: 'Care Day', icon: '🫶', category: 'valentine', description: 'Verwöhnprogramm pur.' },
        { id: 'valentine.reward.art', title: 'Gemeinsam Malen', icon: '🎨', category: 'valentine', description: 'Kreatives Chaos zu zweit.' },
        { id: 'valentine.reward.secret', title: 'Geheime Nachricht', icon: '💌', category: 'valentine', description: 'Psst. Nur für dich.' },
        
        { id: 'daily.streak7', title: 'Wochen-Streak', icon: '🗓️', category: 'daily', description: 'Eine Woche Treue.' },
        { id: 'daily.total10', title: 'Daily Sammler', icon: '🎁', category: 'daily', description: '10 Dailys gesammelt.' },
        { id: 'daily.points100', title: 'Royal Theme', icon: '👑', category: 'daily', description: '100 Punkte erreicht.', type: 'theme_unlock', payload: { themeId: 'royal' } },
        
        { id: 'love_1_month', title: '1 Monat Wir', icon: '🌹', category: 'love', description: 'Theme: Soft Rose', type: 'theme_unlock', payload: { themeId: 'softRose' } },
        { id: 'love_3_month', title: '3 Monate Wir', icon: '🌙', category: 'love', description: 'Theme: Midnight Love', type: 'theme_unlock', payload: { themeId: 'midnightLove' } },
        { id: 'love_6_month', title: '6 Monate Wir', icon: '☁️', category: 'love', description: 'Theme: Pastel Sky', type: 'theme_unlock', payload: { themeId: 'pastelSky' } },
        { id: 'love_1_year', title: '1 Jahr', icon: '💍', category: 'love', description: 'Theme: Eternal Gold', type: 'theme_unlock', payload: { themeId: 'eternal' } },

        { id: 'games.stack.10', title: 'Stapler: Start', icon: '🧱', category: 'games', description: '10 Blöcke gestapelt.' },
        { id: 'games.stack.50', title: 'Stapler: Profi', icon: '🏗️', category: 'games', description: '50 Blöcke gestapelt.' },
        { id: 'games.react.combo10', title: 'Reflex: Combo', icon: '⚡', category: 'games', description: '10x Perfekt in Folge.' },
        
        { id: 'diary.first', title: 'Erster Eintrag', icon: '📔', category: 'diary', description: 'Liebes Tagebuch...' },
        { id: 'diary.streak3', title: '3 Tage Schreiben', icon: '✍️', category: 'diary', description: 'Dranbleiben lohnt sich.' },
    ];

    loadData();
}

async function loadData() {
    if (cloud) {
        rewardsData = await cloud.loadRewards();
    } else {
        // Fix: user.userId
        rewardsData = JSON.parse(localStorage.getItem(user.role === 'guest' ? 'fiaos_rewards_guest' : `fiaos_rewards_${user.userId}`));
    }
    
    // Points (from meta or daily state)
    let points = 0;
    if (rewardsData && rewardsData.meta && rewardsData.meta.points) points = rewardsData.meta.points;
    document.getElementById('pointsVal').innerText = points;

    render();
}

function render() {
    if (!rewardsData) return;

    // 1. Process Data & Merge Status
    const processedItems = catalog.map(item => {
        let isUnlocked = false;
        let unlockedAt = null;
        let isRedeemed = false;

        // Check Unlock Source
        if (item.category === 'valentine') {
            isUnlocked = rewardsData.valentine?.unlocked?.[item.id] || false;
        } else {
            isUnlocked = rewardsData.rewards?.[item.id]?.unlocked || false;
            unlockedAt = rewardsData.rewards?.[item.id]?.unlockedAt;
        }

        // Check Redeemed Source
        if (rewardsData.redeemed && rewardsData.redeemed[item.id]) {
            isRedeemed = true;
        }

        return { ...item, isUnlocked, unlockedAt, isRedeemed };
    });

    renderHero(processedItems);
    renderCategories(processedItems);
}

function renderHero(items) {
    const heroSection = document.getElementById('heroSection');
    
    // Logic: Find first UNLOCKED but NOT REDEEMED reward (priority).
    // If none, find first LOCKED reward (motivation).
    // If all redeemed, show a generic "All Done" message.
    
    let heroItem = items.find(i => i.isUnlocked && !i.isRedeemed);
    let type = 'claim'; // claim, locked, done

    if (!heroItem) {
        heroItem = items.find(i => !i.isUnlocked);
        type = 'locked';
    }

    if (!heroItem) {
        // All done
        heroSection.innerHTML = `
            <div class="hero-card" style="background: linear-gradient(135deg, #10b981, #059669);">
                <div class="hero-bg-icon">🏆</div>
                <div class="hero-label">Meisterleistung</div>
                <div class="hero-title">Alles gesammelt!</div>
                <div class="hero-desc">Du hast alle verfügbaren Belohnungen freigeschaltet. Wahnsinn!</div>
            </div>
        `;
        return;
    }

    // Render Hero
    const bgGradient = type === 'claim' 
        ? 'linear-gradient(135deg, #f59e0b, #d97706)' // Gold for claimable
        : 'linear-gradient(135deg, #4f46e5, #9333ea)'; // Purple for locked/next goal

    const btnText = type === 'claim' ? 'Jetzt einlösen ✨' : 'Weitermachen 🔒';
    const btnAction = type === 'claim' ? `redeem('${heroItem.id}')` : '';
    const label = type === 'claim' ? 'Bereit zum Abholen' : 'Nächstes Ziel';

    heroSection.innerHTML = `
        <div class="hero-card" style="background: ${bgGradient};">
            <div class="hero-bg-icon">${heroItem.icon}</div>
            <div class="hero-label">${label}</div>
            <div class="hero-title">${heroItem.title}</div>
            <div class="hero-desc">${heroItem.description}</div>
            ${type === 'claim' ? `<button class="hero-btn" onclick="${btnAction}">${btnText}</button>` : ''}
        </div>
    `;
}

function renderCategories(items) {
    const container = document.getElementById('categoriesArea');
    container.innerHTML = '';

    CATEGORIES.forEach(cat => {
        const catItems = items.filter(i => i.category === cat.id);
        if (catItems.length === 0) return;

        // Progress
        const unlockedCount = catItems.filter(i => i.isUnlocked).length;
        const totalCount = catItems.length;
        const pct = Math.round((unlockedCount / totalCount) * 100);

        const section = document.createElement('div');
        section.className = 'section';
        section.innerHTML = `
            <div class="section-header">
                <div class="section-title">${cat.title}</div>
                <div class="section-more">${unlockedCount}/${totalCount}</div>
            </div>
            <div class="progress-container">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${pct}%; background: ${cat.color}"></div>
                </div>
            </div>
            <div class="h-scroll">
                ${catItems.map(item => createCardHtml(item)).join('')}
            </div>
        `;
        container.appendChild(section);
    });
}

function createCardHtml(item) {
    const statusClass = item.isRedeemed ? 'redeemed' : (item.isUnlocked ? 'unlocked' : 'locked');
    const icon = item.isUnlocked ? item.icon : '🔒';
    const opacity = item.isUnlocked ? '1' : '0.5';
    
    // Status Badge Icon
    let badgeContent = '';
    if (item.isRedeemed) badgeContent = '✔';
    else if (item.isUnlocked) badgeContent = '!';
    else badgeContent = '🔒';

    const clickAction = item.isUnlocked && !item.isRedeemed ? `onclick="redeem('${item.id}')"` : '';

    return `
        <div class="reward-card ${statusClass}" ${clickAction}>
            <div class="status-badge ${statusClass}">${badgeContent}</div>
            <div class="card-icon-box" style="opacity:${opacity}">
                ${icon}
            </div>
            <div class="card-content">
                <h3>${item.title}</h3>
                <p>${item.description}</p>
            </div>
        </div>
    `;
}

window.redeem = async (id) => {
    const item = catalog.find(i => i.id === id);
    if (!item) return;

    if (!confirm(`"${item.title}" jetzt einlösen?`)) return;

    // Confetti
    fireConfetti();
    if (window.parent.FIAOS) window.parent.FIAOS.playSound('success');

    // Update Data
    if (!rewardsData.redeemed) rewardsData.redeemed = {};
    rewardsData.redeemed[id] = Date.now();

    // Save
    if (cloud) {
        await cloud.saveRewards(rewardsData);
    } else {
        // Fix: user.userId
        localStorage.setItem(user.role === 'guest' ? 'fiaos_rewards_guest' : `fiaos_rewards_${user.userId}`, JSON.stringify(rewardsData));
    }

    // Handle Theme Unlock Payload
    if (item.type === 'theme_unlock' && item.payload?.themeId) {
        const newThemeId = item.payload.themeId;
        if (window.parent.FIAOS) {
            const prefs = await cloud.loadPrefs();
            if (prefs) {
                prefs.theme = newThemeId;
                await cloud.savePrefs(prefs);
                if (window.parent.FIAOS_APPLY_PREFS) {
                    window.parent.FIAOS_APPLY_PREFS(prefs);
                }
                alert(`Theme "${newThemeId}" aktiviert! 🌌`);
            }
        }
    }

    // Re-render
    setTimeout(render, 500);
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
