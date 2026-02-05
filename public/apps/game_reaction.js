const KEYS = { SESSION: 'fiaos_session', USER_GAMES: 'fiaos_user_', GLOBAL_ARCADE: 'fiaos_global_arcade' };

let user = null;
let score = 0;
let bestScore = 0;
let bestDiff = null;
let isPlaying = false;
let startTime = 0;
let rafId = null;
const BASE_TARGET_TIME = 180000; // 3 minutes
let currentTargetTime = BASE_TARGET_TIME;
const MIN_TARGET_TIME = 3000;

function init() {
    const sessionStr = localStorage.getItem(KEYS.SESSION);
    if (!sessionStr) return;
    user = JSON.parse(sessionStr);
    user.id = user.id || user.userId;

    document.getElementById('tapButton').addEventListener('mousedown', tap);
    document.getElementById('tapButton').addEventListener('touchstart', (e) => { e.preventDefault(); tap(); });
    document.addEventListener('keydown', (e) => { if (e.code === 'Space') tap(); });

    loadBest();
    updateTimerDisplay(0);
}

function startGame() {
    score = 0;
    startTime = Date.now();
    updateTargetFromProgress();
    renderTarget();
    isPlaying = true;

    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('endScreen').classList.remove('active');
    updateUI();
    
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(loop);
}

function tap() {
    if (!isPlaying) return;
    const elapsed = Date.now() - startTime;
    const diff = Math.abs(elapsed - currentTargetTime);
    const bounded = Math.max(0, 100000 - diff);
    score = Math.floor(bounded / 10);

    const feedback = document.getElementById('feedback');
    feedback.classList.remove('pop');
    void feedback.offsetWidth; // trigger reflow

    if (diff <= 250) {
        feedback.innerText = "PERFEKT!";
        feedback.style.color = "#fda4af";
        unlock('games.react.combo10');
    } else if (diff <= 1000) {
        feedback.innerText = "SEHR GUT";
        feedback.style.color = "#f87171";
        unlock('games.react.first');
    } else if (diff <= 5000) {
        feedback.innerText = "GUT";
        feedback.style.color = "#fbbf24";
    } else {
        feedback.innerText = "ZU FRÜH / SPÄT";
        feedback.style.color = "#fca5a5";
    }
    
    feedback.classList.add('pop');
    gameOver(diff);
}


function updateTargetFromProgress() {
    if (!user) return;
    const uKey = `${KEYS.USER_GAMES}${user.id}_games`;
    const uData = JSON.parse(localStorage.getItem(uKey) || '{}');
    const plays = uData?.reaction?.plays || 0;
    currentTargetTime = Math.max(MIN_TARGET_TIME, BASE_TARGET_TIME - (plays * 15000));
}

function renderTarget() {
    const minutes = Math.floor(currentTargetTime / 60000);
    const seconds = Math.floor((currentTargetTime % 60000) / 1000);
    const targetText = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    const targetEl = document.getElementById('targetPill');
    const subEl = document.getElementById('timerSub');
    if (targetEl) targetEl.innerText = `Zielzeit ${targetText}`;
    if (subEl) subEl.innerText = `Drücke den roten Button exakt bei ${targetText}.`;
}

function updateUI() {
    document.getElementById('best').innerText = bestDiff !== null ? `${bestDiff} ms` : '—';
}

function loop() {
    if (!isPlaying) return;
    const elapsed = Date.now() - startTime;
    updateTimerDisplay(elapsed);
    rafId = requestAnimationFrame(loop);
}

function gameOver(diff) {
    isPlaying = false;
    if (rafId) cancelAnimationFrame(rafId);
    document.getElementById('finalScore').innerText = score;
    document.getElementById('finalDiff').innerText = diff;
    document.getElementById('endScreen').classList.add('active');
    
    saveData(diff);
}

function unlock(id) {
    if (window.parent.FIAOS_EVENTS) {
        window.parent.FIAOS_EVENTS.emit('games.unlock', { id });
    }
}

function saveData(diff) {
    if (!user) return;
    const uKey = `${KEYS.USER_GAMES}${user.id}_games`;
    let uData = JSON.parse(localStorage.getItem(uKey) || '{}');
    if (!uData.reaction) uData.reaction = { best: 0, bestDiff: null, plays: 0 };
    
    uData.reaction.last = score;
    uData.reaction.plays++;
    if (score > uData.reaction.best) uData.reaction.best = score;
    if (uData.reaction.bestDiff === null || diff < uData.reaction.bestDiff) {
        uData.reaction.bestDiff = diff;
        bestDiff = diff;
        bestScore = score;
    }
    
    localStorage.setItem(uKey, JSON.stringify(uData));
    updateUI();

    // Global
    const gKey = KEYS.GLOBAL_ARCADE;
    let gData = JSON.parse(localStorage.getItem(gKey) || '{"reaction":[]}');
    gData.reaction.push({ userId: user.id, name: user.name, score, diff, date: Date.now() });
    gData.reaction.sort((a,b) => b.score - a.score);
    gData.reaction = gData.reaction.slice(0, 10);
    localStorage.setItem(gKey, JSON.stringify(gData));
}

function updateTimerDisplay(elapsed) {
    const timerEl = document.getElementById('timer');
    if (!timerEl) return;
    const totalMs = Math.max(0, elapsed);
    const minutes = Math.floor(totalMs / 60000);
    const seconds = Math.floor((totalMs % 60000) / 1000);
    const millis = Math.floor(totalMs % 1000);
    timerEl.innerText = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}

function loadBest() {
    if (!user) return;
    const uKey = `${KEYS.USER_GAMES}${user.id}_games`;
    const uData = JSON.parse(localStorage.getItem(uKey) || '{}');
    if (uData.reaction) {
        bestScore = uData.reaction.best || 0;
        bestDiff = uData.reaction.bestDiff ?? null;
    }
    updateTargetFromProgress();
    renderTarget();
    updateUI();
}

init();
