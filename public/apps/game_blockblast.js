
/**
 * Game: BlockBlast
 * Logic: 10x10 Grid, Drag & Drop Polyominoes
 */

const KEYS = { SESSION: 'fiaos_session', USER_GAMES: 'fiaos_user_' };

// Config
const ROWS = 10;
const COLS = 10;

// Colors for blocks
const COLORS = [
    'linear-gradient(135deg, #ef4444, #b91c1c)', // Red
    'linear-gradient(135deg, #f59e0b, #d97706)', // Amber
    'linear-gradient(135deg, #10b981, #047857)', // Emerald
    'linear-gradient(135deg, #3b82f6, #1d4ed8)', // Blue
    'linear-gradient(135deg, #8b5cf6, #6d28d9)', // Violet
    'linear-gradient(135deg, #ec4899, #be185d)'  // Pink
];

// Shape Definitions (matrix)
const SHAPES = [
    [[1]], // Dot
    [[1,1]], // 2-Line
    [[1],[1]], // 2-Line V
    [[1,1,1]], // 3-Line
    [[1],[1],[1]], // 3-Line V
    [[1,1],[1,1]], // 2x2 Box
    [[1,0],[1,0],[1,1]], // L
    [[0,1],[0,1],[1,1]], // J
    [[1,1,1],[0,1,0]], // T
    [[1,1,0],[0,1,1]], // Z
    [[0,1,1],[1,1,0]], // S
    [[1,1,1],[1,0,0]], // L-Big
    [[1,1,1,1]], // 4-Line
    [[1],[1],[1],[1]] // 4-Line V
];

let state = {
    grid: [], // 10x10 array of null or color string
    tray: [null, null, null], // 3 slots
    score: 0,
    best: 0,
    isGameOver: false
};

let user = null;
let cloud = null;
let dragInfo = null; // { piece, startX, startY, slotIdx, element, clone }

function init() {
    const sessionStr = localStorage.getItem(KEYS.SESSION);
    if (!sessionStr) return;
    user = JSON.parse(sessionStr);
    user.id = user.id || user.userId;

    if (window.parent.FIAOS && window.parent.FIAOS.cloud) {
        cloud = window.parent.FIAOS.cloud;
    }

    initGrid();
    loadStats();
    startRound();

    // Global Input Listeners
    document.addEventListener('touchmove', handleDragMove, {passive: false});
    document.addEventListener('touchend', handleDragEnd);
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
    
    // Escape
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') window.history.back();
    });
}

function initGrid() {
    const gridEl = document.getElementById('grid');
    gridEl.innerHTML = '';
    state.grid = Array(ROWS).fill(null).map(() => Array(COLS).fill(null));

    for(let r=0; r<ROWS; r++) {
        for(let c=0; c<COLS; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.r = r;
            cell.dataset.c = c;
            gridEl.appendChild(cell);
        }
    }
}

function loadStats() {
    if (!user) return;
    // Fix: user.userId
    const key = `${KEYS.USER_GAMES}${user.userId}_games`;
    const data = JSON.parse(localStorage.getItem(key) || '{}');
    state.best = data.blockblast?.best || 0;
    document.getElementById('best').innerText = state.best;
}

function startRound() {
    state.score = 0;
    state.grid = Array(ROWS).fill(null).map(() => Array(COLS).fill(null));
    state.isGameOver = false;
    updateUI();
    renderGrid();
    fillTray();
    document.getElementById('gameOverScreen').classList.remove('active');
}

function fillTray() {
    state.tray = [];
    for(let i=0; i<3; i++) {
        const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
        const color = COLORS[Math.floor(Math.random() * COLORS.length)];
        state.tray.push({ shape, color });
    }
    renderTray();
    checkGameOver();
}

function renderTray() {
    [0, 1, 2].forEach(i => {
        const slot = document.getElementById(`slot-${i}`);
        slot.innerHTML = '';
        const pieceData = state.tray[i];
        
        if (pieceData) {
            const el = createPieceElement(pieceData.shape, pieceData.color);
            el.dataset.slotIdx = i;
            
            // Mouse/Touch Start
            el.addEventListener('mousedown', handleDragStart);
            el.addEventListener('touchstart', handleDragStart, {passive: false});
            
            slot.appendChild(el);
        }
    });
}

function createPieceElement(shape, color) {
    const rows = shape.length;
    const cols = shape[0].length;
    
    const container = document.createElement('div');
    container.className = 'piece';
    container.style.gridTemplateRows = `repeat(${rows}, 20px)`;
    container.style.gridTemplateColumns = `repeat(${cols}, 20px)`;
    
    for(let r=0; r<rows; r++) {
        for(let c=0; c<cols; c++) {
            const block = document.createElement('div');
            if (shape[r][c]) {
                block.className = 'block';
                block.style.background = color;
            }
            container.appendChild(block);
        }
    }
    return container;
}

// --- Interaction Logic ---

function handleDragStart(e) {
    if (state.isGameOver) return;
    e.preventDefault();
    
    const target = e.currentTarget;
    const slotIdx = parseInt(target.dataset.slotIdx);
    const pieceData = state.tray[slotIdx];
    
    const touch = e.touches ? e.touches[0] : e;
    
    // Calculate Cell Size dynamically based on current grid width
    const gridEl = document.getElementById('grid');
    const cellRect = gridEl.children[0].getBoundingClientRect();
    const draggedCellSize = cellRect.width; 

    // Create floating clone
    const clone = target.cloneNode(true);
    clone.classList.add('dragging');
    
    const gridRect = document.getElementById('grid').getBoundingClientRect();
    const cellSize = Math.min(gridRect.width / COLS, gridRect.height / ROWS);

    // Size adjustment for drag (match grid cell size)
    const rows = pieceData.shape.length;
    const cols = pieceData.shape[0].length;
    clone.style.gridTemplateRows = `repeat(${rows}, ${cellSize}px)`;
    clone.style.gridTemplateColumns = `repeat(${cols}, ${cellSize}px)`;
    Array.from(clone.children).forEach(b => {
        if (b.classList.contains('block')) {
            b.style.width = `${cellSize}px`;
            b.style.height = `${cellSize}px`;
        }
    });

    document.body.appendChild(clone);
    target.style.opacity = '0';

    dragInfo = {
        piece: pieceData,
        slotIdx: slotIdx,
        element: target,
        clone: clone,
        width: cols * cellSize,
        height: rows * cellSize,
        offsetX: 0,
        offsetY: -50 
    };

    updateDragPosition(touch.clientX, touch.clientY);
}

function handleDragMove(e) {
    if (!dragInfo) return;
    e.preventDefault();
    const touch = e.touches ? e.touches[0] : e;
    updateDragPosition(touch.clientX, touch.clientY);
    
    const gridRect = document.getElementById('grid').getBoundingClientRect();
    const cellW = gridRect.width / COLS;
    const cellH = gridRect.height / ROWS;
    
    const ptrX = touch.clientX;
    const ptrY = touch.clientY + dragInfo.offsetY;
    
    // Map center of piece to grid
    const c = Math.round((ptrX - gridRect.left - (dragInfo.width/2)) / cellW);
    const r = Math.round((ptrY - gridRect.top - (dragInfo.height/2)) / cellH);
    
    clearPreview();
    
    if (isValidPlacement(dragInfo.piece.shape, r, c)) {
        showPreview(dragInfo.piece.shape, r, c);
        dragInfo.validPos = { r, c };
    } else {
        dragInfo.validPos = null;
    }
}

function handleDragEnd(e) {
    if (!dragInfo) return;
    
    const { validPos, piece, slotIdx, element, clone } = dragInfo;
    
    if (validPos) {
        placePiece(piece, validPos.r, validPos.c);
        state.tray[slotIdx] = null;
        clone.remove();
        element.remove();
        
        if (state.tray.every(p => p === null)) {
            fillTray();
        } else {
            checkGameOver();
        }
    } else {
        clone.remove();
        element.style.opacity = '1';
    }
    
    clearPreview();
    dragInfo = null;
}

function updateDragPosition(x, y) {
    if (dragInfo && dragInfo.clone) {
        dragInfo.clone.style.left = (x - dragInfo.width/2) + 'px';
        dragInfo.clone.style.top = (y + dragInfo.offsetY - dragInfo.height/2) + 'px';
    }
}

// --- Game Logic ---

function isValidPlacement(shape, r, c) {
    const rows = shape.length;
    const cols = shape[0].length;
    for(let i=0; i<rows; i++) {
        for(let j=0; j<cols; j++) {
            if (shape[i][j]) {
                const gridR = r + i;
                const gridC = c + j;
                if (gridR < 0 || gridR >= ROWS || gridC < 0 || gridC >= COLS) return false;
                if (state.grid[gridR][gridC] !== null) return false;
            }
        }
    }
    return true;
}

function showPreview(shape, r, c) {
    const rows = shape.length;
    const cols = shape[0].length;
    for(let i=0; i<rows; i++) {
        for(let j=0; j<cols; j++) {
            if (shape[i][j]) {
                const cell = document.querySelector(`.cell[data-r="${r+i}"][data-c="${c+j}"]`);
                if(cell) cell.classList.add('preview');
            }
        }
    }
}

function clearPreview() {
    document.querySelectorAll('.preview').forEach(el => el.classList.remove('preview'));
}

function placePiece(piece, r, c) {
    const rows = piece.shape.length;
    const cols = piece.shape[0].length;
    let placedCount = 0;

    for(let i=0; i<rows; i++) {
        for(let j=0; j<cols; j++) {
            if (piece.shape[i][j]) {
                state.grid[r+i][c+j] = piece.color;
                placedCount++;
            }
        }
    }
    state.score += placedCount * 10;
    renderGrid();
    setTimeout(checkLines, 50);
}

function checkLines() {
    let rowsToClear = [];
    let colsToClear = [];
    
    for(let r=0; r<ROWS; r++) {
        if (state.grid[r].every(cell => cell !== null)) rowsToClear.push(r);
    }
    for(let c=0; c<COLS; c++) {
        let full = true;
        for(let r=0; r<ROWS; r++) {
            if (state.grid[r][c] === null) { full = false; break; }
        }
        if (full) colsToClear.push(c);
    }
    
    const totalLines = rowsToClear.length + colsToClear.length;
    
    if (totalLines > 0) {
        let multiplier = totalLines;
        if (totalLines > 2) showCombo(totalLines);
        
        state.score += totalLines * 100 * multiplier;
        
        rowsToClear.forEach(r => clearRow(r));
        colsToClear.forEach(c => clearCol(c));
        
        if (navigator.vibrate) navigator.vibrate(10 * totalLines);
        
        setTimeout(() => {
            rowsToClear.forEach(r => { for(let c=0; c<COLS; c++) state.grid[r][c] = null; });
            colsToClear.forEach(c => { for(let r=0; r<ROWS; r++) state.grid[r][c] = null; });
            renderGrid();
            checkAchievements();
        }, 300);
    }
    
    updateUI();
}

function clearRow(r) {
    for(let c=0; c<COLS; c++) {
        const cell = document.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
        if(cell) cell.classList.add('flash');
    }
}

function clearCol(c) {
    for(let r=0; r<ROWS; r++) {
        const cell = document.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
        if(cell) cell.classList.add('flash');
    }
}

function renderGrid() {
    for(let r=0; r<ROWS; r++) {
        for(let c=0; c<COLS; c++) {
            const cell = document.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
            cell.className = 'cell';
            if (state.grid[r][c]) {
                cell.classList.add('filled');
                cell.style.background = state.grid[r][c];
            } else {
                cell.style.background = '';
            }
        }
    }
}

function checkGameOver() {
    const pieces = state.tray.filter(p => p !== null);
    if (pieces.length === 0) return;
    
    let canMove = false;
    for (let p of pieces) {
        for(let r=0; r<ROWS; r++) {
            for(let c=0; c<COLS; c++) {
                if (isValidPlacement(p.shape, r, c)) { canMove = true; break; }
            }
            if(canMove) break;
        }
        if(canMove) break;
    }
    
    if (!canMove) {
        state.isGameOver = true;
        document.getElementById('finalScore').innerText = state.score;
        document.getElementById('gameOverScreen').classList.add('active');
        saveScore();
    }
}

function updateUI() {
    document.getElementById('score').innerText = state.score;
}

function showCombo(count) {
    const el = document.getElementById('comboPopup');
    el.innerText = `Combo x${count}!`;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 1000);
    if (count >= 3) unlock('games.block.combo');
}

function checkAchievements() {
    if (state.score >= 500) unlock('games.block.starter');
    if (state.score >= 1500) unlock('games.block.master');
}

function unlock(id) {
    if (window.parent.FIAOS_EVENTS) window.parent.FIAOS_EVENTS.emit('games.unlock', { id });
}

function saveScore() {
    if (state.score > state.best) state.best = state.score;
    document.getElementById('best').innerText = state.best;

    if (!user) return;
    
    // Fix: user.userId
    const uKey = `${KEYS.USER_GAMES}${user.userId}_games`;
    let uData = JSON.parse(localStorage.getItem(uKey) || '{}');
    if (!uData.blockblast) uData.blockblast = { best: 0, plays: 0 };
    
    uData.blockblast.last = state.score;
    uData.blockblast.plays++;
    if (state.score > uData.blockblast.best) uData.blockblast.best = state.score;
    
    localStorage.setItem(uKey, JSON.stringify(uData));
    if (cloud) cloud.saveHighscore('blockblast', state.score);
}

window.restartGame = startRound;

init();
