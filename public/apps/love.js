
/**
 * Love App Logic
 */

const KEYS = {
    SESSION: 'fiaos_session',
    LOVE_STATE: 'fiaos_user_', // + id + _love
};

// Fixed Start Date: 18.05.2025
const START_DATE_STR = "2025-05-18T00:00:00";
const START_DATE = new Date(START_DATE_STR);

let user = null;
let loveState = null;
let currentStats = null;

function init() {
    const sessionStr = localStorage.getItem(KEYS.SESSION);
    if (!sessionStr) return;
    user = JSON.parse(sessionStr);

    loadData();
    updateLive();
    setInterval(updateLive, 1000);
    
    // Check milestones only once on open
    setTimeout(checkMilestones, 500);
}

function loadData() {
    if (user.role === 'guest') {
        loveState = {
            startDate: START_DATE_STR,
            lastSeenMonthIndex: 0,
            lastSeenYear: 0
        };
        return;
    }

    const key = `${KEYS.LOVE_STATE}${user.id}_love`;
    const raw = localStorage.getItem(key);
    
    if (raw) {
        loveState = JSON.parse(raw);
    } else {
        loveState = {
            startDate: START_DATE_STR,
            lastSeenMonthIndex: 0,
            lastSeenYear: 0,
            lastMilestoneShownAt: 0
        };
        saveData();
    }
}

function saveData() {
    if (user.role === 'guest') return;
    localStorage.setItem(`${KEYS.LOVE_STATE}${user.id}_love`, JSON.stringify(loveState));
}

function updateLive() {
    const now = new Date();
    
    // 1. Calculate Stats
    // If we are before start date, show 0
    if (now < START_DATE) {
        renderStats(0, 0, 0, 0);
        renderCountdown(now, START_DATE); // Count towards start
        return;
    }

    const diff = now - START_DATE;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const weeks = Math.floor(days / 7);
    
    // Years & Months
    let years = now.getFullYear() - START_DATE.getFullYear();
    let mDiff = now.getMonth() - START_DATE.getMonth();
    const dDiff = now.getDate() - START_DATE.getDate();
    
    // Adjust years if current date is before anniversary in current year
    // Start is Month 4 (May, 0-indexed) Day 18
    if (mDiff < 0 || (mDiff === 0 && dDiff < 0)) {
        years--;
    }
    years = Math.max(0, years);

    // Total Months Passed
    // Formula: (YearDiff * 12) + MonthDiff. 
    // If dDiff < 0, it means we haven't reached the day in the current month yet, so subtract 1.
    let totalMonths = (now.getFullYear() - START_DATE.getFullYear()) * 12 + (now.getMonth() - START_DATE.getMonth());
    if (dDiff < 0) {
        totalMonths--;
    }
    totalMonths = Math.max(0, totalMonths);

    currentStats = { days, weeks, totalMonths, years };
    renderStats(days, weeks, totalMonths, years);

    // 2. Countdown to Next Monthly Anniversary (18th)
    const nextAni = getNextAnniversary(now);
    renderCountdown(now, nextAni);
}

function getNextAnniversary(now) {
    // Target Day: 18
    let target = new Date(now.getFullYear(), now.getMonth(), 18);
    
    // If today is past the 18th (or is the 18th but time passed? No, just date check usually)
    // Let's match based on date strictly.
    if (now.getDate() >= 18) {
        // Move to next month
        target.setMonth(target.getMonth() + 1);
    }
    
    return target;
}

function renderStats(d, w, m, y) {
    document.getElementById('countDays').innerText = d;
    document.getElementById('statWeeks').innerText = w;
    document.getElementById('statMonths').innerText = m;
    
    const yCard = document.getElementById('cardYears');
    const sGrid = document.querySelector('.stats-grid');
    
    if (y > 0) {
        yCard.classList.remove('hidden');
        document.getElementById('statYears').innerText = y;
        sGrid.style.gridTemplateColumns = "repeat(3, 1fr)";
    } else {
        yCard.classList.add('hidden');
        sGrid.style.gridTemplateColumns = "repeat(2, 1fr)";
    }

    // Badges Update
    const cont = document.getElementById('badgesContainer');
    let html = '<div class="badge active">Start 🚀</div>';
    if (m >= 1) html += `<div class="badge active">1 Monat</div>`;
    if (m >= 6) html += `<div class="badge active">6 Monate</div>`;
    if (y >= 1) html += `<div class="badge active">1 Jahr 💍</div>`;
    if (m >= 100) html += `<div class="badge active">Ewigkeit</div>`;
    
    if (cont.innerHTML !== html) cont.innerHTML = html;
}

function renderCountdown(now, target) {
    let diff = target - now;
    if (diff < 0) diff = 0;

    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);

    document.getElementById('cdD').innerText = String(d).padStart(2, '0');
    document.getElementById('cdH').innerText = String(h).padStart(2, '0');
    document.getElementById('cdM').innerText = String(m).padStart(2, '0');
    document.getElementById('cdS').innerText = String(s).padStart(2, '0');
}

// --- Milestones ---

function checkMilestones() {
    if (!currentStats || user.role === 'guest') return;

    const m = currentStats.totalMonths;
    const y = currentStats.years;

    // Trigger Unlocks (Idempotent call via Bridge)
    // 1 Month -> Soft Rose
    if (m >= 1) unlock('love_1_month');
    // 3 Months -> Midnight Love
    if (m >= 3) unlock('love_3_month');
    // 6 Months -> Pastel Sky
    if (m >= 6) unlock('love_6_month');
    // 1 Year -> Eternal
    if (y >= 1) unlock('love_1_year');

    // Show Notification only if new threshold crossed locally
    if (m > loveState.lastSeenMonthIndex) {
        showMilestone('Monats-Jubiläum', `Wir sind jetzt ${m} Monate zusammen! 💞`, () => {
            loveState.lastSeenMonthIndex = m;
            saveData();
        });
        return; 
    }

    if (y > loveState.lastSeenYear) {
        showMilestone('Jahres-Jubiläum', `Ein ganzes Jahr mehr! ${y} Jahre Unendlichkeit. 💍`, () => {
            loveState.lastSeenYear = y;
            saveData();
        });
    }
}

function unlock(rewardId) {
    if (window.parent.FIAOS) {
        window.parent.FIAOS.bridgeUnlockReward({ rewardId });
    }
}

function showMilestone(title, text, onCloseCallback) {
    document.getElementById('mTitle').innerText = title;
    document.getElementById('mText').innerText = text;
    document.getElementById('milestoneModal').classList.add('active');
    
    window.closeModal = () => {
        document.getElementById('milestoneModal').classList.remove('active');
        if (onCloseCallback) onCloseCallback();
    };
}

window.closeModal = () => {
    document.getElementById('milestoneModal').classList.remove('active');
};

init();
