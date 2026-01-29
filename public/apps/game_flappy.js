
/**
 * Game: Flappy Love
 */

const KEYS = {
    SESSION: 'fiaos_session',
    USER_GAMES: 'fiaos_user_', 
    GLOBAL_ARCADE: 'fiaos_global_arcade'
};

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let user = null;
let gameRunning = false;
let frameCount = 0;

// Config
let gravity = 0.25;
let lift = -5;
let speed = 2.5; // pipe speed
let pipeSpawnRate = 120; // frames
let gapSize = 150;

// State
let bird = { x: 50, y: 0, w: 30, h: 30, dy: 0, rot: 0 };
let pipes = []; // {x, y, w, gap, passed}
let score = 0;
let lastTime = 0;

function init() {
    const sessionStr = localStorage.getItem(KEYS.SESSION);
    if (!sessionStr) return;
    user = JSON.parse(sessionStr);
    user.id = user.id || user.userId;

    resize();
    window.addEventListener('resize', resize);
    
    // Inputs
    const area = document.getElementById('gameArea');
    
    const handleInput = (e) => {
        if (!gameRunning) return;
        // e.preventDefault();
        flap();
    };

    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space' || e.code === 'Enter' || e.code === 'ArrowUp') handleInput(e);
    });
    
    area.addEventListener('touchstart', handleInput, {passive: false});
    area.addEventListener('mousedown', handleInput);

    loadStats();
}

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Adjust gap relative to height?
    gapSize = Math.max(140, canvas.height * 0.25);
    
    if (!gameRunning) {
        bird.y = canvas.height / 2;
        draw();
    }
}

function loadStats() {
    if (!user) return;
    const key = `${KEYS.USER_GAMES}${user.id}_games`;
    const data = JSON.parse(localStorage.getItem(key) || '{}');
    document.getElementById('bestEl').innerText = `Best: ${data.flappy?.best || 0}`;
}

function startGame() {
    document.getElementById('startScreen').classList.remove('active');
    document.getElementById('endScreen').classList.remove('active');
    
    bird = { x: canvas.width * 0.2, y: canvas.height / 2, w: 34, h: 34, dy: 0, rot: 0 };
    pipes = [];
    score = 0;
    speed = 3;
    gravity = 0.25;
    frameCount = 0;
    
    updateScore();
    
    gameRunning = true;
    lastTime = performance.now();
    requestAnimationFrame(loop);
}

function loop(timestamp) {
    if (!gameRunning) return;
    
    // Delta time? Keeping it simple with requestAnimationFrame assumption for now
    update();
    draw();
    
    requestAnimationFrame(loop);
}

function flap() {
    bird.dy = lift;
    bird.rot = -25;
    
    // Particle effect hook could go here
}

function update() {
    frameCount++;

    // Bird Physics
    bird.dy += gravity;
    bird.y += bird.dy;
    
    // Rotation logic
    if (bird.dy > 0) {
        bird.rot += 2; 
        if (bird.rot > 90) bird.rot = 90;
    } else {
        bird.rot = -25;
    }

    // Floor/Ceiling Collision
    if (bird.y + bird.h/2 >= canvas.height || bird.y - bird.h/2 <= 0) {
        gameOver();
        return;
    }

    // Pipes Spawn
    // Distance based spawn or time based?
    // Spawn if last pipe is X distance away
    const lastPipe = pipes[pipes.length - 1];
    const pipeDist = 280; // Distance between pipes
    
    if (!lastPipe || (canvas.width - lastPipe.x >= pipeDist)) {
        spawnPipe();
    }

    // Pipes Update
    for (let i = pipes.length - 1; i >= 0; i--) {
        let p = pipes[i];
        p.x -= speed;
        
        // Remove if off screen
        if (p.x + p.w < 0) {
            pipes.splice(i, 1);
            continue;
        }

        // Collision
        // Bird hitbox is circle-ish, pipe is rect.
        // Simple AABB for safety first, maybe forgiving padding.
        const padding = 6; 
        
        const bx = bird.x - bird.w/2 + padding;
        const by = bird.y - bird.h/2 + padding;
        const bw = bird.w - padding*2;
        const bh = bird.h - padding*2;

        // Top Pipe
        if (
            bx < p.x + p.w &&
            bx + bw > p.x &&
            by < p.topHeight
        ) {
            gameOver();
            return;
        }
        
        // Bottom Pipe
        if (
            bx < p.x + p.w &&
            bx + bw > p.x &&
            by + bh > p.topHeight + p.gap
        ) {
            gameOver();
            return;
        }

        // Score
        if (!p.passed && bird.x > p.x + p.w) {
            p.passed = true;
            score++;
            updateScore();
            
            // Difficulty
            if (score % 5 === 0) {
                speed += 0.2;
            }
            
            checkMilestones(score);
        }
    }
}

function spawnPipe() {
    // Determine gap Y position
    const minH = 50;
    const maxH = canvas.height - minH - gapSize;
    const topHeight = Math.floor(Math.random() * (maxH - minH + 1)) + minH;
    
    pipes.push({
        x: canvas.width,
        topHeight: topHeight,
        gap: gapSize,
        w: 60,
        passed: false
    });
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Pipes
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'; // Glassy
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    
    pipes.forEach(p => {
        // Top Pipe
        drawRoundedRect(ctx, p.x, 0, p.w, p.topHeight, 0, 0, 10, 10);
        // Bottom Pipe
        drawRoundedRect(ctx, p.x, p.topHeight + p.gap, p.w, canvas.height - (p.topHeight + p.gap), 10, 10, 0, 0);
    });

    // Bird
    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.rotate(bird.rot * Math.PI / 180);
    
    // Draw Bird Body (Circle/Heart)
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ec4899';
    ctx.fillStyle = '#ec4899';
    
    // Simple Circle Bird for now, maybe add beak/eye
    ctx.beginPath();
    ctx.arc(0, 0, bird.w/2, 0, Math.PI*2);
    ctx.fill();
    
    // Wing
    ctx.fillStyle = '#fbcfe8';
    ctx.beginPath();
    ctx.ellipse(-5, 5, 8, 5, 0, 0, Math.PI*2);
    ctx.fill();
    
    // Eye
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(6, -6, 6, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(8, -6, 2, 0, Math.PI*2);
    ctx.fill();

    ctx.restore();
    
    // Ground strip (visual only)
    // ctx.fillStyle = 'rgba(255,255,255,0.1)';
    // ctx.fillRect(0, canvas.height - 10, canvas.width, 10);
}

function drawRoundedRect(ctx, x, y, w, h, tl, tr, br, bl) {
    ctx.beginPath();
    ctx.moveTo(x + tl, y);
    ctx.lineTo(x + w - tr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + tr);
    ctx.lineTo(x + w, y + h - br);
    ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
    ctx.lineTo(x + bl, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - bl);
    ctx.lineTo(x, y + tl);
    ctx.quadraticCurveTo(x, y, x + tl, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
}

function updateScore() {
    document.getElementById('scoreEl').innerText = score;
}

function gameOver() {
    gameRunning = false;
    document.getElementById('finalScore').innerText = score;
    document.getElementById('endScreen').classList.add('active');
    
    // Freeze frame briefly? already handled by stopping loop
    saveData(score);
}

// --- Data & Rewards ---

function checkMilestones(s) {
    const unlocks = [];
    if (s === 5) unlocks.push('flappy_score_5');
    if (s === 15) unlocks.push('flappy_score_15');
    if (s === 30) unlocks.push('flappy_score_30');

    unlocks.forEach(id => {
        if (window.parent.FIAOS_EVENTS) {
            window.parent.FIAOS_EVENTS.emit('games.unlock', { id });
        }
    });
}

function saveData(s) {
    if (!user) return;
    
    // 1. User Local
    const uKey = `${KEYS.USER_GAMES}${user.id}_games`;
    let uData = JSON.parse(localStorage.getItem(uKey) || '{}');
    if (!uData.flappy) uData.flappy = { best: 0, plays: 0 };
    
    uData.flappy.last = s;
    uData.flappy.plays++;
    if (s > uData.flappy.best) uData.flappy.best = s;
    
    localStorage.setItem(uKey, JSON.stringify(uData));

    // 2. Global Leaderboard
    const gKey = KEYS.GLOBAL_ARCADE;
    let gData = JSON.parse(localStorage.getItem(gKey) || '{"flappy":[]}');
    
    if (!gData.flappy) gData.flappy = [];

    gData.flappy.push({
        userId: user.id,
        name: user.name,
        score: s,
        date: Date.now()
    });
    
    // Sort Desc
    gData.flappy.sort((a,b) => b.score - a.score);
    gData.flappy = gData.flappy.slice(0, 10);
    
    localStorage.setItem(gKey, JSON.stringify(gData));
}

init();
