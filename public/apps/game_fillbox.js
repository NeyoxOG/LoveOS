const KEYS = { SESSION: 'fiaos_session', USER_GAMES: 'fiaos_user_', GLOBAL_ARCADE: 'fiaos_global_arcade' };

let user = null;
let score = 0;
let time = 60;
let grid = Array(6).fill().map(() => Array(6).fill(0));
let interval = null;
let mistakes = 0;

// Shapes def: array of [r, c] relative
const SHAPES = [
    { type: 'O', color: '#8b5cf6', cells: [[0,0], [0,1], [1,0], [1,1]] },
    { type: 'I', color: '#06b6d4', cells: [[0,0], [0,1], [0,2]] },
    { type: 'L', color: '#f59e0b', cells: [[0,0], [1,0], [2,0], [2,1]] },
    { type: 'Dot', color: '#ec4899', cells: [[0,0]] }
];

function init() {
    const sessionStr = localStorage.getItem(KEYS.SESSION);
    if (sessionStr) user = JSON.parse(sessionStr);

    // Gen grid DOM
    const el = document.getElementById('grid');
    el.innerHTML = '';
    for (let i=0; i<36; i++) {
        const d = document.createElement('div');
        d.className = 'cell';
        d.dataset.idx = i;
        el.appendChild(d);
    }
}

function startGame() {
    score = 0;
    time = 60;
    mistakes = 0;
    grid = Array(6).fill().map(() => Array(6).fill(0));
    
    // Clear Visual Grid
    document.querySelectorAll('.cell').forEach(c => c.className = 'cell');
    
    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('endScreen').classList.remove('active');
    
    spawnItems();
    
    clearInterval(interval);
    interval = setInterval(() => {
        time--;
        document.getElementById('timer').innerText = time;
        if (time <= 0) gameOver();
    }, 1000);
    
    document.getElementById('score').innerText = 0;
}

function spawnItems() {
    const dock = document.getElementById('dock');
    dock.innerHTML = '';
    
    // Spawn 3 random items
    for(let i=0; i<3; i++) {
        const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
        const el = document.createElement('div');
        el.className = `item shape-${shape.type}`;
        el.style.backgroundColor = shape.color;
        el.innerText = shape.type === 'Dot' ? '●' : '';
        
        // Touch logic
        el.addEventListener('touchstart', handleDragStart, {passive: false});
        el.addEventListener('mousedown', handleDragStart);
        
        // Store shape data on element
        el.shapeData = shape;
        dock.appendChild(el);
    }
}

let dragEl = null;
let cloneEl = null;

function handleDragStart(e) {
    e.preventDefault();
    const touch = e.touches ? e.touches[0] : e;
    const target = e.target;
    
    dragEl = target;
    dragEl.style.opacity = '0'; // Hide original
    
    // Create clone
    cloneEl = target.cloneNode(true);
    cloneEl.className = target.className + ' draggable';
    cloneEl.style.width = target.offsetWidth + 'px';
    cloneEl.style.height = target.offsetHeight + 'px';
    document.body.appendChild(cloneEl);
    
    moveClone(touch.clientX, touch.clientY);
    
    document.addEventListener('touchmove', handleDragMove, {passive: false});
    document.addEventListener('touchend', handleDragEnd);
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
}

function handleDragMove(e) {
    e.preventDefault();
    const touch = e.touches ? e.touches[0] : e;
    moveClone(touch.clientX, touch.clientY);
}

function moveClone(x, y) {
    if (cloneEl) {
        cloneEl.style.left = (x - 25) + 'px'; // Center roughly
        cloneEl.style.top = (y - 25) + 'px';
    }
}

function handleDragEnd(e) {
    const touch = e.changedTouches ? e.changedTouches[0] : e;
    
    // Check drop target
    // We need to find which cell is under (touch.clientX, touch.clientY)
    // document.elementFromPoint might pick the clone, so hide it briefly
    cloneEl.style.display = 'none';
    let elem = document.elementFromPoint(touch.clientX, touch.clientY);
    cloneEl.style.display = 'block';
    
    if (elem && elem.classList.contains('cell')) {
        const idx = parseInt(elem.dataset.idx);
        const r = Math.floor(idx / 6);
        const c = idx % 6;
        
        if (canPlace(dragEl.shapeData, r, c)) {
            place(dragEl.shapeData, r, c);
            dragEl.remove(); // Remove from dock
            
            // Refill dock if empty
            if (document.getElementById('dock').children.length === 0) {
                spawnItems();
            }
        } else {
            // Invalid placement
            dragEl.style.opacity = '1';
        }
    } else {
        dragEl.style.opacity = '1';
    }
    
    // Cleanup
    cloneEl.remove();
    cloneEl = null;
    dragEl = null;
    
    document.removeEventListener('touchmove', handleDragMove);
    document.removeEventListener('touchend', handleDragEnd);
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
}

function canPlace(shape, r, c) {
    for (let [dr, dc] of shape.cells) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nr >= 6 || nc < 0 || nc >= 6) return false;
        if (grid[nr][nc] !== 0) return false;
    }
    return true;
}

function place(shape, r, c) {
    for (let [dr, dc] of shape.cells) {
        grid[r+dr][c+dc] = 1;
        // Update visual
        const idx = (r+dr)*6 + (c+dc);
        const cell = document.querySelector(`.cell[data-idx="${idx}"]`);
        cell.classList.add('filled');
        cell.style.background = shape.color;
    }
    
    score += (shape.cells.length * 10);
    document.getElementById('score').innerText = score;
    
    checkRewards();
    checkClearLines(); // Optional feature
}

function checkClearLines() {
    // Simple logic: if full grid? Or just points.
    // For now just accumulation.
    // If grid full -> game over or reset? 
    // Let's assume FillBox is just "fit as much as possible until stuck or time out"
    // To make it playable longer, let's clear full rows like Tetris.
    
    // Check rows
    for (let r=0; r<6; r++) {
        if (grid[r].every(v => v === 1)) {
            // Clear row
            grid[r].fill(0);
            score += 50;
            // Visual clear
            for (let c=0; c<6; c++) {
                const cell = document.querySelector(`.cell[data-idx="${r*6+c}"]`);
                cell.classList.remove('filled');
                cell.style.background = '';
            }
        }
    }
    document.getElementById('score').innerText = score;
}

function checkRewards() {
    if (score > 0) unlock('games.fill.first');
    if (score >= 300) unlock('games.fill.300');
}

function gameOver() {
    clearInterval(interval);
    document.getElementById('finalScore').innerText = score;
    document.getElementById('endScreen').classList.add('active');
    
    if (mistakes === 0 && score > 50) unlock('games.fill.perfect');
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
    if (!uData.fillbox) uData.fillbox = { best: 0, plays: 0 };
    
    uData.fillbox.last = score;
    uData.fillbox.plays++;
    if (score > uData.fillbox.best) uData.fillbox.best = score;
    localStorage.setItem(uKey, JSON.stringify(uData));

    const gKey = KEYS.GLOBAL_ARCADE;
    let gData = JSON.parse(localStorage.getItem(gKey) || '{"fillbox":[]}');
    gData.fillbox.push({ userId: user.id, name: user.name, score, date: Date.now() });
    gData.fillbox.sort((a,b) => b.score - a.score);
    gData.fillbox = gData.fillbox.slice(0, 10);
    localStorage.setItem(gKey, JSON.stringify(gData));
}

init();