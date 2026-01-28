
/**
 * Valentine Countdown Logic
 */

// Target Date: Next Feb 14th
function getNextValentine() {
    const now = new Date();
    let year = now.getFullYear();
    // Month is 0-indexed (1 = Feb)
    const valentine = new Date(year, 1, 14, 0, 0, 0); 
    
    // If passed, go to next year
    if (now > valentine) {
        valentine.setFullYear(year + 1);
    }
    return valentine;
}

const TARGET = getNextValentine();
let interval = null;

function init() {
    // Generate particles
    const container = document.getElementById('particles');
    for(let i=0; i<20; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        p.innerText = Math.random() > 0.5 ? '💗' : '✨';
        p.style.left = Math.random() * 100 + 'vw';
        p.style.fontSize = (10 + Math.random() * 20) + 'px';
        p.style.animationDuration = (5 + Math.random() * 10) + 's';
        p.style.animationDelay = (Math.random() * 5) + 's';
        container.appendChild(p);
    }

    updateTimer();
    interval = setInterval(updateTimer, 1000);
}

function updateTimer() {
    const now = new Date();
    const diff = TARGET - now;

    // Check if it's currently Valentine's Day (Feb 14)
    // Simply check month and date
    const isToday = now.getMonth() === 1 && now.getDate() === 14;

    if (isToday || diff <= 0) {
        unlockView();
        return;
    }

    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);

    document.getElementById('d').innerText = d;
    document.getElementById('h').innerText = String(h).padStart(2, '0');
    document.getElementById('m').innerText = String(m).padStart(2, '0');
    document.getElementById('s').innerText = String(s).padStart(2, '0');
}

function unlockView() {
    if (interval) clearInterval(interval);
    
    document.getElementById('headline').innerText = "Happy Valentine! 💖";
    document.getElementById('subtext').innerText = "Ich liebe dich unendlich.";
    
    // Hide Timer
    document.getElementById('timerGrid').style.display = 'none';
    
    // Enable Button
    const btn = document.getElementById('openBtn');
    btn.disabled = false;
    btn.innerText = "Geschenke öffnen 🎁";
    btn.style.animation = "float 2s infinite";
}

window.openRewards = () => {
    if (window.parent.FIAOS) {
        window.parent.FIAOS.openRewards('valentine');
    } else {
        alert("Fehler: Bridge nicht gefunden.");
    }
};

init();
