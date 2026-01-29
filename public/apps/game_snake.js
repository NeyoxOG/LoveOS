
/**
 * Game: Snake v2 (Enemy Upgrade)
 */

const KEYS = {
    SESSION: 'fiaos_session',
    USER_GAMES: 'fiaos_user_'
};

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let user = null;
let cloud = null;

// Config
const GRID_SIZE = 20; // 20x20 grid
let TILE = 0;

// State
let snake = [];
let enemy = [];
let food = { x: 0, y: 0 };
let dir = { x: 0, y: -1 };
let nextDir = { x: 0, y: -1 };
let score = 0;
let best = 0;
let isPlaying = false;
let controlsVisible = false;

// Timing
let lastTime = 0;
let moveTimer = 0;
let moveInterval = 150; 
let enemyMoveTimer = 0;
let enemyMoveInterval = 250;
let enemyActive = false;
let enemyStartTime = 0;

function init() {
    const sessionStr = localStorage.getItem(KEYS.SESSION);
    if (sessionStr) user = JSON.parse(sessionStr);

    if (window.parent.FIAOS && window.parent.FIAOS.cloud) {
        cloud = window.parent.FIAOS.cloud;
    }

    resize();
    window.addEventListener('resize', resize);
    
    // Inputs
    window.addEventListener('keydown', handleKey);
    setupTouchControls();
    setupDPad();

    loadStats();
    
    // Initial Render
    draw();
}

function resize() {
    const wrapper = document.getElementById('gameArea');
    const size = Math.min(wrapper.clientWidth, wrapper.clientHeight);
    
    // Ensure multiples of GRID_SIZE
    TILE = Math.floor(size / GRID_SIZE);
    canvas.width = TILE * GRID_SIZE;
    canvas.height = TILE * GRID_SIZE;
    
    if (!isPlaying) draw();
}

function loadStats() {
    if (!user) return;
    // Fix: user.userId
    const key = `${KEYS.USER_GAMES}${user.userId}_games`;
    const data = JSON.parse(localStorage.getItem(key) || '{}');
    best = data.snake?.best || 0;
    document.getElementById('bestScoreDisplay').innerText = best;
}

function startGame() {
    document.getElementById('startScreen').classList.remove('active');
    document.getElementById('endScreen').classList.remove('active');
    
    score = 0;
    updateScoreUI();
    
    // Reset Player
    snake = [
        { x: 10, y: 15 },
        { x: 10, y: 16 },
        { x: 10, y: 17 }
    ];
    dir = { x: 0, y: -1 };
    nextDir = { x: 0, y: -1 };
    moveInterval = 150;

    // Reset Enemy
    enemy = [];
    enemyActive = false;

    placeFood();
    
    isPlaying = true;
    lastTime = performance.now();
    moveTimer = 0;
    enemyMoveTimer = 0;
    
    requestAnimationFrame(loop);
}

function loop(timestamp) {
    if (!isPlaying) return;
    
    const dt = timestamp - lastTime;
    lastTime = timestamp;
    
    moveTimer += dt;
    if (enemyActive) enemyMoveTimer += dt;
    
    // Player Tick
    if (moveTimer >= moveInterval) {
        moveTimer -= moveInterval;
        updatePlayer();
    }
    
    // Enemy Tick
    if (enemyActive && enemyMoveTimer >= enemyMoveInterval) {
        enemyMoveTimer -= enemyMoveInterval;
        updateEnemy();
    }
    
    draw();
    requestAnimationFrame(loop);
}

function updatePlayer() {
    dir = nextDir; 
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
    
    // Collision Checks
    if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
        gameOver(); return;
    }
    if (snake.some(s => s.x === head.x && s.y === head.y)) {
        gameOver(); return;
    }
    if (enemyActive && enemy.some(e => e.x === head.x && e.y === head.y)) {
        gameOver(); return;
    }

    snake.unshift(head);
    
    if (head.x === food.x && head.y === food.y) {
        score++;
        updateScoreUI();
        placeFood();
        if (score % 5 === 0) moveInterval = Math.max(80, moveInterval - 10);
        if (score === 10 && !enemyActive) spawnEnemy();
        checkMilestones(score);
    } else {
        snake.pop();
    }
}

function updateEnemy() {
    if (enemy.length === 0) return;
    const head = enemy[0];
    
    let dx = food.x - head.x;
    let dy = food.y - head.y;
    
    let moves = [];
    if (Math.abs(dx) > Math.abs(dy)) {
        moves.push(dx > 0 ? {x:1, y:0} : {x:-1, y:0});
        moves.push(dy > 0 ? {x:0, y:1} : {x:0, y:-1});
    } else {
        moves.push(dy > 0 ? {x:0, y:1} : {x:0, y:-1});
        moves.push(dx > 0 ? {x:1, y:0} : {x:-1, y:0});
    }
    
    // Fallback
    const allDirs = [{x:0,y:-1}, {x:0,y:1}, {x:-1,y:0}, {x:1,y:0}];
    for(let d of allDirs) {
        if (!moves.some(m => m.x === d.x && m.y === d.y)) moves.push(d);
    }
    
    let bestMove = null;
    for (let m of moves) {
        const nx = head.x + m.x;
        const ny = head.y + m.y;
        if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) continue;
        if (enemy.some(e => e.x === nx && e.y === ny)) continue;
        bestMove = m;
        break;
    }
    
    if (bestMove) {
        const newHead = { x: head.x + bestMove.x, y: head.y + bestMove.y };
        if (snake.some(s => s.x === newHead.x && s.y === newHead.y)) {
            gameOver(); return;
        }
        enemy.unshift(newHead);
        if (enemy.length > 5) enemy.pop();
    }
}

function spawnEnemy() {
    enemyActive = true;
    enemyStartTime = Date.now();
    let ex, ey;
    do {
        ex = Math.floor(Math.random() * GRID_SIZE);
        ey = Math.floor(Math.random() * GRID_SIZE);
    } while (snake.some(s => Math.abs(s.x - ex) < 5 && Math.abs(s.y - ey) < 5));
    enemy = [{x: ex, y: ey}];
}

function placeFood() {
    let valid = false;
    while (!valid) {
        food.x = Math.floor(Math.random() * GRID_SIZE);
        food.y = Math.floor(Math.random() * GRID_SIZE);
        valid = !snake.some(s => s.x === food.x && s.y === food.y) && 
                !enemy.some(e => e.x === food.x && e.y === food.y);
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawHeart(food.x, food.y);
    
    snake.forEach((seg, i) => {
        const x = seg.x * TILE;
        const y = seg.y * TILE;
        const s = TILE - 2;
        ctx.fillStyle = i === 0 ? '#4ade80' : `rgba(74, 222, 128, ${1 - i/(snake.length+5)})`;
        ctx.beginPath(); ctx.roundRect(x + 1, y + 1, s, s, i===0 ? 6 : 4); ctx.fill();
        if (i === 0) {
            ctx.fillStyle = '#064e3b';
            ctx.beginPath(); ctx.arc(x + s/3, y + s/3, 2, 0, Math.PI*2); ctx.arc(x + s*2/3, y + s/3, 2, 0, Math.PI*2); ctx.fill();
        }
    });
    
    if (enemyActive) {
        enemy.forEach((seg, i) => {
            const x = seg.x * TILE; const y = seg.y * TILE; const s = TILE - 2;
            ctx.fillStyle = i === 0 ? '#c084fc' : `rgba(192, 132, 252, ${1 - i/10})`;
            ctx.beginPath(); ctx.roundRect(x + 1, y + 1, s, s, 4); ctx.fill();
        });
    }
}

function drawHeart(gx, gy) {
    const x = gx * TILE + TILE/2;
    const y = gy * TILE + TILE/2;
    const size = TILE/2;
    ctx.fillStyle = '#ef4444';
    const pulse = 1 + Math.sin(Date.now() / 200) * 0.1;
    ctx.save(); ctx.translate(x, y); ctx.scale(pulse, pulse);
    ctx.beginPath();
    const topCurveHeight = size * 0.3;
    ctx.moveTo(0, topCurveHeight);
    ctx.bezierCurveTo(0, 0, -size, 0, -size, topCurveHeight);
    ctx.bezierCurveTo(-size, (size + topCurveHeight) / 2, 0, (size + topCurveHeight), 0, size);
    ctx.bezierCurveTo(0, (size + topCurveHeight), size, (size + topCurveHeight) / 2, size, topCurveHeight);
    ctx.bezierCurveTo(size, 0, 0, 0, 0, topCurveHeight);
    ctx.fill();
    ctx.restore();
}

function handleKey(e) {
    if (e.key === 'Escape') { window.history.back(); return; }
    if (!isPlaying) return;
    
    const key = e.key;
    if ((key === 'ArrowUp' || key === 'w') && dir.y !== 1) nextDir = { x: 0, y: -1 };
    if ((key === 'ArrowDown' || key === 's') && dir.y !== -1) nextDir = { x: 0, y: 1 };
    if ((key === 'ArrowLeft' || key === 'a') && dir.x !== 1) nextDir = { x: -1, y: 0 };
    if ((key === 'ArrowRight' || key === 'd') && dir.x !== -1) nextDir = { x: 1, y: 0 };
}

function setupTouchControls() {
    const area = document.getElementById('gameArea');
    let sx = 0, sy = 0;
    area.addEventListener('touchstart', (e) => { sx = e.changedTouches[0].screenX; sy = e.changedTouches[0].screenY; }, {passive: false});
    area.addEventListener('touchend', (e) => {
        const ex = e.changedTouches[0].screenX; const ey = e.changedTouches[0].screenY;
        const dx = ex - sx; const dy = ey - sy;
        if (Math.abs(dx) < 15 && Math.abs(dy) < 15) return;
        if (Math.abs(dx) > Math.abs(dy)) {
            if (dx > 0 && dir.x !== -1) nextDir = { x: 1, y: 0 };
            if (dx < 0 && dir.x !== 1) nextDir = { x: -1, y: 0 };
        } else {
            if (dy > 0 && dir.y !== -1) nextDir = { x: 0, y: 1 };
            if (dy < 0 && dir.y !== 1) nextDir = { x: 0, y: -1 };
        }
    }, {passive: false});
}

function setupDPad() {
    const btns = document.querySelectorAll('.dpad-btn');
    btns.forEach(btn => {
        const trigger = (e) => { e.preventDefault(); const k = btn.dataset.key; handleKey({ key: k }); };
        btn.addEventListener('touchstart', trigger); btn.addEventListener('mousedown', trigger);
    });
}

window.toggleControls = () => {
    controlsVisible = !controlsVisible;
    const dpad = document.getElementById('dpadControls');
    const btn = document.getElementById('btnToggleControls');
    if (controlsVisible) { dpad.classList.add('visible'); btn.classList.add('active'); }
    else { dpad.classList.remove('visible'); btn.classList.remove('active'); }
};

function gameOver() {
    isPlaying = false;
    if (enemyActive && Date.now() - enemyStartTime > 30000) unlock('snake.survival');
    document.getElementById('finalScore').innerText = score;
    document.getElementById('endScreen').classList.add('active');
    saveScore();
}

function updateScoreUI() {
    document.getElementById('scoreEl').innerText = score;
}

function checkMilestones(s) {
    if (s === 10) unlock('snake_score_10');
    if (s === 25) unlock('snake_score_25');
    if (s === 50) unlock('snake_score_50');
}

function unlock(id) {
    if (window.parent.FIAOS_EVENTS) window.parent.FIAOS_EVENTS.emit('games.unlock', { id });
}

function saveScore() {
    if (score > best) best = score;
    document.getElementById('bestScoreDisplay').innerText = best;
    if (!user) return;
    
    // Fix: user.userId
    const uKey = `${KEYS.USER_GAMES}${user.userId}_games`;
    let uData = JSON.parse(localStorage.getItem(uKey) || '{}');
    if (!uData.snake) uData.snake = { best: 0, plays: 0 };
    
    uData.snake.last = score;
    uData.snake.plays++;
    if (score > uData.snake.best) uData.snake.best = score;
    
    localStorage.setItem(uKey, JSON.stringify(uData));
    if (cloud) cloud.saveHighscore('snake', score);
}

init();
