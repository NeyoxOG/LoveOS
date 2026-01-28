
/**
 * Game: Snake
 */

const KEYS = {
    SESSION: 'fiaos_session',
    USER_GAMES: 'fiaos_user_'
};

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let user = null;
let gameRunning = false;
let cloud = null;

// Game Config
const GRID_SIZE = 20;
const TILE_COUNT = 20; 
let TILE_SIZE = 0;

// State
let snake = [];
let food = { x: 15, y: 15 };
let dx = 0;
let dy = 0;
let nextDx = 0;
let nextDy = 0;
let score = 0;
let speed = 7;
let lastFrameTime = 0;
let frameInterval = 1000 / 7;

function init() {
    const sessionStr = localStorage.getItem(KEYS.SESSION);
    if (sessionStr) user = JSON.parse(sessionStr);

    if (window.parent.FIAOS && window.parent.FIAOS.cloud) {
        cloud = window.parent.FIAOS.cloud;
    }

    resize();
    window.addEventListener('resize', resize);
    
    window.addEventListener('keydown', handleKey);
    
    const area = document.getElementById('gameArea');
    let touchStartX = 0;
    let touchStartY = 0;
    
    area.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    }, {passive: false});
    
    area.addEventListener('touchend', (e) => {
        const touchEndX = e.changedTouches[0].screenX;
        const touchEndY = e.changedTouches[0].screenY;
        handleSwipe(touchStartX, touchStartY, touchEndX, touchEndY);
    }, {passive: false});

    loadStats();
}

function resize() {
    const area = document.getElementById('gameArea');
    const maxSize = Math.min(area.clientWidth, area.clientHeight) - 40;
    TILE_SIZE = Math.floor(maxSize / TILE_COUNT);
    canvas.width = TILE_SIZE * TILE_COUNT;
    canvas.height = TILE_SIZE * TILE_COUNT;
    draw(); 
}

function loadStats() {
    if (!user) return;
    const key = `${KEYS.USER_GAMES}${user.id}_games`;
    const data = JSON.parse(localStorage.getItem(key) || '{}');
    document.getElementById('bestEl').innerText = `Best: ${data.snake?.best || 0}`;
}

function startGame() {
    document.getElementById('startScreen').classList.remove('active');
    document.getElementById('endScreen').classList.remove('active');
    
    score = 0;
    speed = 7;
    frameInterval = 1000 / speed;
    
    const cx = 10;
    const cy = 10;
    snake = [
        { x: cx, y: cy },
        { x: cx, y: cy + 1 },
        { x: cx, y: cy + 2 }
    ];
    
    dx = 0; dy = -1;
    nextDx = 0; nextDy = -1;
    
    placeFood();
    updateScore();
    
    gameRunning = true;
    lastFrameTime = performance.now();
    requestAnimationFrame(gameLoop);
}

function gameLoop(timestamp) {
    if (!gameRunning) return;
    requestAnimationFrame(gameLoop);
    const elapsed = timestamp - lastFrameTime;
    if (elapsed > frameInterval) {
        lastFrameTime = timestamp - (elapsed % frameInterval);
        update();
        draw();
    }
}

function handleKey(e) {
    if (!gameRunning) return;
    if ((e.key === 'ArrowUp' || e.key === 'w') && dy === 0) { nextDx = 0; nextDy = -1; }
    if ((e.key === 'ArrowDown' || e.key === 's') && dy === 0) { nextDx = 0; nextDy = 1; }
    if ((e.key === 'ArrowLeft' || e.key === 'a') && dx === 0) { nextDx = -1; nextDy = 0; }
    if ((e.key === 'ArrowRight' || e.key === 'd') && dx === 0) { nextDx = 1; nextDy = 0; }
}

function handleSwipe(sx, sy, ex, ey) {
    if (!gameRunning) return;
    const dxSwipe = ex - sx;
    const dySwipe = ey - sy;
    if (Math.abs(dxSwipe) > Math.abs(dySwipe)) {
        if (Math.abs(dxSwipe) > 30) {
            if (dxSwipe > 0 && dx === 0) { nextDx = 1; nextDy = 0; }
            if (dxSwipe < 0 && dx === 0) { nextDx = -1; nextDy = 0; }
        }
    } else {
        if (Math.abs(dySwipe) > 30) {
            if (dySwipe > 0 && dy === 0) { nextDx = 0; nextDy = 1; }
            if (dySwipe < 0 && dy === 0) { nextDx = 0; nextDy = -1; }
        }
    }
}

function placeFood() {
    let valid = false;
    while (!valid) {
        food.x = Math.floor(Math.random() * TILE_COUNT);
        food.y = Math.floor(Math.random() * TILE_COUNT);
        valid = !snake.some(s => s.x === food.x && s.y === food.y);
    }
}

function update() {
    dx = nextDx;
    dy = nextDy;
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };
    
    if (head.x < 0 || head.x >= TILE_COUNT || head.y < 0 || head.y >= TILE_COUNT) {
        gameOver(); return;
    }
    if (snake.some(s => s.x === head.x && s.y === head.y)) {
        gameOver(); return;
    }
    
    snake.unshift(head);
    
    if (head.x === food.x && head.y === food.y) {
        score++;
        updateScore();
        placeFood();
        if (score % 5 === 0) {
            speed += 0.5;
            frameInterval = 1000 / speed;
        }
        checkMilestones(score);
    } else {
        snake.pop();
    }
}

function draw() {
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    snake.forEach((seg, i) => {
        if (i === 0) {
            ctx.fillStyle = '#4ade80';
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#4ade80';
        } else {
            const alpha = 1 - (i / (snake.length + 5));
            ctx.fillStyle = `rgba(34, 197, 94, ${Math.max(0.3, alpha)})`;
            ctx.shadowBlur = 0;
        }
        const x = seg.x * TILE_SIZE;
        const y = seg.y * TILE_SIZE;
        const s = TILE_SIZE - 2;
        ctx.beginPath();
        ctx.roundRect(x + 1, y + 1, s, s, i===0 ? 6 : 4);
        ctx.fill();
        
        if (i === 0) {
            ctx.fillStyle = '#000';
            const eyeSize = s / 5;
            ctx.beginPath();
            ctx.arc(x + s/3, y + s/3, eyeSize, 0, Math.PI*2);
            ctx.arc(x + s*2/3, y + s/3, eyeSize, 0, Math.PI*2);
            ctx.fill();
        }
    });
    
    const fx = food.x * TILE_SIZE + TILE_SIZE/2;
    const fy = food.y * TILE_SIZE + TILE_SIZE/2 + (Math.sin(Date.now()/200)*2);
    const fs = TILE_SIZE / 2;
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ef4444';
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(fx, fy, fs, 0, Math.PI*2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.arc(fx - 4, fy - 4, fs/3, 0, Math.PI*2);
    ctx.fill();
}

function updateScore() {
    document.getElementById('scoreEl').innerText = score;
}

function gameOver() {
    gameRunning = false;
    document.getElementById('finalScore').innerText = score;
    document.getElementById('endScreen').classList.add('active');
    saveData(score);
}

function checkMilestones(s) {
    const unlocks = [];
    if (s === 10) unlocks.push('snake_score_10');
    if (s === 25) unlocks.push('snake_score_25');
    if (s === 50) unlocks.push('snake_score_50');
    unlocks.forEach(id => {
        if (window.parent.FIAOS_EVENTS) window.parent.FIAOS_EVENTS.emit('games.unlock', { id });
    });
}

function saveData(s) {
    if (!user) return;
    const uKey = `${KEYS.USER_GAMES}${user.id}_games`;
    let uData = JSON.parse(localStorage.getItem(uKey) || '{}');
    if (!uData.snake) uData.snake = { best: 0, plays: 0 };
    
    uData.snake.last = s;
    uData.snake.plays++;
    if (s > uData.snake.best) uData.snake.best = s;
    localStorage.setItem(uKey, JSON.stringify(uData));

    if (cloud) {
        cloud.saveHighscore('snake', s);
    }
}

init();
