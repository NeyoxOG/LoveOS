
/**
 * Game: Hearts Stack
 */

const KEYS = {
    SESSION: 'fiaos_session',
    USER_GAMES: 'fiaos_user_', 
};

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let score = 0;
let user = null;
let gameRunning = false;
let blockWidth = 100;
let blockHeight = 30;
let speed = 3;
let currentBlock = { x: 0, y: 0, w: 100, dir: 1 };
let stack = []; // {x, y, w}
let cloud = null;

function init() {
    const sessionStr = localStorage.getItem(KEYS.SESSION);
    if (sessionStr) user = JSON.parse(sessionStr);

    if (window.parent.FIAOS && window.parent.FIAOS.cloud) {
        cloud = window.parent.FIAOS.cloud;
    }

    resize();
    window.addEventListener('resize', resize);
    
    // Controls
    document.getElementById('dropBtn').addEventListener('mousedown', drop);
    document.getElementById('dropBtn').addEventListener('touchstart', (e) => { e.preventDefault(); drop(); });
    document.addEventListener('keydown', (e) => { if (e.code === 'Space') drop(); });

    loadStats();
    resetGame();
    loop();
}

function resize() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
}

function loadStats() {
    if (!user) return;
    const key = `${KEYS.USER_GAMES}${user.id}_games`;
    const data = JSON.parse(localStorage.getItem(key) || '{}');
    document.getElementById('bestEl').innerText = `Best: ${data.stack?.best || 0}`;
}

function resetGame() {
    score = 0;
    stack = [];
    blockWidth = 120;
    speed = 4;
    gameRunning = true;
    
    // Base block
    stack.push({
        x: (canvas.width - blockWidth) / 2,
        y: canvas.height - 50,
        w: blockWidth,
        hue: 0
    });

    spawnNext();
    document.getElementById('scoreEl').innerText = score;
    document.getElementById('endScreen').classList.remove('active');
}

function spawnNext() {
    const prev = stack[stack.length - 1];
    currentBlock = {
        x: 0,
        y: prev.y - blockHeight,
        w: prev.w,
        dir: 1,
        hue: (score * 10) % 360
    };
    // Random start side
    if (Math.random() > 0.5) {
        currentBlock.x = -currentBlock.w;
        currentBlock.dir = 1;
    } else {
        currentBlock.x = canvas.width;
        currentBlock.dir = -1;
    }
}

function drop() {
    if (!gameRunning) return;
    
    const prev = stack[stack.length - 1];
    const curr = currentBlock;

    // Calc overlap
    const dist = curr.x - prev.x;
    const overlap = curr.w - Math.abs(dist);

    if (overlap > 0) {
        // Successful drop
        score++;
        document.getElementById('scoreEl').innerText = score;
        
        // Speed up
        speed += 0.2;

        // Cut block
        const newW = overlap;
        const newX = dist > 0 ? curr.x : prev.x;
        
        stack.push({
            x: newX,
            y: curr.y,
            w: newW,
            hue: curr.hue
        });

        // Camera move
        if (stack.length > 8) {
             stack.forEach(b => b.y += blockHeight);
        }

        checkMilestones(score);
        spawnNext();

    } else {
        gameOver();
    }
}

function update() {
    if (!gameRunning) return;
    
    currentBlock.x += speed * currentBlock.dir;
    
    if (currentBlock.x > canvas.width - currentBlock.w + 50) currentBlock.dir = -1;
    if (currentBlock.x < -50) currentBlock.dir = 1;
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Stack
    stack.forEach(b => {
        ctx.fillStyle = `hsl(${330 + (b.hue%40)}, 80%, 60%)`;
        ctx.shadowColor = `hsl(${330 + (b.hue%40)}, 80%, 40%)`;
        ctx.shadowBlur = 10;
        ctx.fillRect(b.x, b.y, b.w, blockHeight);
        
        // Heart icon center
        ctx.shadowBlur = 0;
        ctx.fillStyle = "rgba(255,255,255,0.3)";
        ctx.font = "16px Arial";
        ctx.fillText("♥", b.x + b.w/2 - 6, b.y + 20);
    });

    // Current
    if (gameRunning) {
        const b = currentBlock;
        ctx.fillStyle = `hsl(${330 + (b.hue%40)}, 100%, 70%)`;
        ctx.shadowColor = "#fff";
        ctx.shadowBlur = 15;
        ctx.fillRect(b.x, b.y, b.w, blockHeight);
    }
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

function gameOver() {
    gameRunning = false;
    document.getElementById('finalScore').innerText = score;
    document.getElementById('endScreen').classList.add('active');
    
    saveScore(score);
}

// --- Data & Rewards ---

function checkMilestones(s) {
    const unlocks = [];
    if (s === 10) unlocks.push('games.stack.10');
    if (s === 50) unlocks.push('games.stack.50');
    if (s === 100) unlocks.push('games.stack.100');

    unlocks.forEach(id => {
        if (window.parent.FIAOS_EVENTS) {
            window.parent.FIAOS_EVENTS.emit('games.unlock', { id });
        }
    });
}

function saveScore(s) {
    if (!user) return;
    
    // 1. User Local Cache
    const uKey = `${KEYS.USER_GAMES}${user.id}_games`;
    let uData = JSON.parse(localStorage.getItem(uKey) || '{}');
    if (!uData.stack) uData.stack = { best: 0, plays: 0 };
    
    uData.stack.last = s;
    uData.stack.plays++;
    if (s > uData.stack.best) uData.stack.best = s;
    localStorage.setItem(uKey, JSON.stringify(uData));

    // 2. Cloud Save
    if (cloud) {
        cloud.saveHighscore('stack', s);
    }
}

window.restartGame = resetGame;

init();
