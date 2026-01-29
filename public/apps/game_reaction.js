const KEYS = { SESSION: 'fiaos_session', USER_GAMES: 'fiaos_user_', GLOBAL_ARCADE: 'fiaos_global_arcade' };

let user = null;
let score = 0;
let combo = 0;
let maxCombo = 0;
let rotation = 0;
let speed = 2; // deg per frame
let targetAngle = 0; // The angle of the pink arc center
let isPlaying = false;
let startTime = 0;
const GAME_DURATION = 30000; // 30s

function init() {
    const sessionStr = localStorage.getItem(KEYS.SESSION);
    if (!sessionStr) return;
    user = JSON.parse(sessionStr);
    user.id = user.id || user.userId;

    document.getElementById('tapArea').addEventListener('mousedown', tap);
    document.getElementById('tapArea').addEventListener('touchstart', (e) => { e.preventDefault(); tap(); });
    document.addEventListener('keydown', (e) => { if (e.code === 'Space') tap(); });

    randomizeTarget();
}

function startGame() {
    score = 0;
    combo = 0;
    maxCombo = 0;
    rotation = 0;
    speed = 3;
    startTime = Date.now();
    isPlaying = true;

    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('endScreen').classList.remove('active');
    updateUI();
    
    requestAnimationFrame(loop);
}

function randomizeTarget() {
    // Random angle between 0 and 360
    targetAngle = Math.floor(Math.random() * 360);
    // Visual is rotated. CSS rotate starts at top (12 o'clock).
    // Our pointer starts top.
    const arcSize = 40; // degrees visual width of target
    
    const el = document.getElementById('targetRing');
    // We want the gap to be centered at targetAngle.
    // The border-top-color covers about 45deg in standard css border hack?
    // Actually using a simple conic gradient or clip path is better, but border hack:
    // With border-radius 50% and transparent borders, top border is a wedge.
    // Let's rely on visual approximation. 
    // Just rotate the div so the top part aligns with targetAngle.
    el.style.transform = `rotate(${targetAngle}deg)`;
}

function tap() {
    if (!isPlaying) return;

    // Normalize rotation 0-360
    let currentDeg = (rotation % 360 + 360) % 360; // 0 is top (start)
    // Target is targetAngle. Tolerance +/- 15 deg?
    
    // Dist
    let diff = Math.abs(currentDeg - targetAngle);
    if (diff > 180) diff = 360 - diff; // wrap around

    const feedback = document.getElementById('feedback');
    feedback.classList.remove('pop');
    void feedback.offsetWidth; // trigger reflow

    if (diff < 20) {
        // Hit
        let points = 10;
        let txt = "GOOD";
        if (diff < 8) {
            points = 20;
            txt = "PERFECT!";
            combo++;
        } else {
            combo = 0; // Missed perfect breaks combo? Or keep combo for good? Let's break on Bad.
            // Prompt says: "Perfect increases Combo". So Good implies keep or soft reset.
            // Let's say Good keeps combo, only perfect increases multiplier. 
            // Simplifying: Good resets combo for "Perfect Streak".
            combo = 0; 
        }

        if (combo > maxCombo) maxCombo = combo;
        
        score += points + (combo * 5);
        feedback.innerText = txt;
        feedback.style.color = diff < 8 ? '#ec4899' : '#a78bfa';
        
        // Speed up slightly
        speed += 0.2;
        randomizeTarget();

        // Check milestones
        if (score === 200) unlock('games.react.200'); // simple checks
        if (combo === 10) unlock('games.react.combo10');
        if (score > 0) unlock('games.react.first');

    } else {
        // Miss
        combo = 0;
        feedback.innerText = "MISS";
        feedback.style.color = "#ef4444";
        score = Math.max(0, score - 5);
    }
    
    feedback.classList.add('pop');
    updateUI();
}

function updateUI() {
    document.getElementById('score').innerText = score;
    document.getElementById('combo').innerText = combo;
}

function loop() {
    if (!isPlaying) return;
    
    const now = Date.now();
    const elapsed = now - startTime;
    if (elapsed > GAME_DURATION) {
        gameOver();
        return;
    }

    rotation += speed;
    document.getElementById('pointer').style.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;

    requestAnimationFrame(loop);
}

function gameOver() {
    isPlaying = false;
    document.getElementById('finalScore').innerText = score;
    document.getElementById('finalCombo').innerText = maxCombo;
    document.getElementById('endScreen').classList.add('active');
    
    saveData();
}

function unlock(id) {
    if (window.parent.FIAOS_EVENTS) {
        window.parent.FIAOS_EVENTS.emit('games.unlock', { id });
    }
}

function saveData() {
    if (!user) return;
    const uKey = `${KEYS.USER_GAMES}${user.id}_games`;
    let uData = JSON.parse(localStorage.getItem(uKey) || '{}');
    if (!uData.reaction) uData.reaction = { best: 0, bestCombo: 0, plays: 0 };
    
    uData.reaction.last = score;
    uData.reaction.plays++;
    if (score > uData.reaction.best) uData.reaction.best = score;
    if (maxCombo > uData.reaction.bestCombo) uData.reaction.bestCombo = maxCombo;
    
    localStorage.setItem(uKey, JSON.stringify(uData));

    // Global
    const gKey = KEYS.GLOBAL_ARCADE;
    let gData = JSON.parse(localStorage.getItem(gKey) || '{"reaction":[]}');
    gData.reaction.push({ userId: user.id, name: user.name, score, date: Date.now() });
    gData.reaction.sort((a,b) => b.score - a.score);
    gData.reaction = gData.reaction.slice(0, 10);
    localStorage.setItem(gKey, JSON.stringify(gData));
}

init();
