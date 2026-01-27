const KEYS = { SESSION: 'fiaos_session', USER_GAMES: 'fiaos_user_', GLOBAL_ARCADE: 'fiaos_global_arcade' };

let user = null;
let board = [1,2,3,4,5,6,7,8,0]; // 0 is empty
let startTime = 0;
let timerInterval = null;
let isPlaying = false;

function init() {
    const sessionStr = localStorage.getItem(KEYS.SESSION);
    if (sessionStr) user = JSON.parse(sessionStr);

    render();
}

function render() {
    const container = document.getElementById('board');
    container.innerHTML = '';
    
    // Grid 3x3. Gap ~5px. Tile 90px.
    // offsets: 5, 105, 205
    const positions = [5, 105, 205];

    board.forEach((val, idx) => {
        if (val === 0) return; // Empty tile

        const r = Math.floor(idx / 3);
        const c = idx % 3;
        
        const el = document.createElement('div');
        el.className = 'tile';
        el.style.transform = `translate(${positions[c]}px, ${positions[r]}px)`;
        el.innerText = val;
        
        // Correct position highlight (optional)
        if (val === idx + 1) el.classList.add('correct');
        
        el.onclick = () => move(idx);
        container.appendChild(el);
    });
}

function move(idx) {
    if (!isPlaying) return;

    const r = Math.floor(idx / 3);
    const c = idx % 3;
    
    const emptyIdx = board.indexOf(0);
    const er = Math.floor(emptyIdx / 3);
    const ec = emptyIdx % 3;
    
    // Check adjacency
    const dist = Math.abs(r - er) + Math.abs(c - ec);
    if (dist === 1) {
        // Swap
        [board[idx], board[emptyIdx]] = [board[emptyIdx], board[idx]];
        render();
        checkWin();
    }
}

function checkWin() {
    const winState = [1,2,3,4,5,6,7,8,0];
    const isWin = board.every((v, i) => v === winState[i]);
    
    if (isWin) {
        gameOver();
    }
}

function shuffle() {
    document.getElementById('winScreen').classList.remove('active');
    
    // Valid shuffle logic: perform random valid moves
    let currEmpty = 8;
    board = [1,2,3,4,5,6,7,8,0];
    
    for (let i = 0; i < 100; i++) {
        const er = Math.floor(currEmpty / 3);
        const ec = currEmpty % 3;
        const neighbors = [];
        
        if (er > 0) neighbors.push(currEmpty - 3);
        if (er < 2) neighbors.push(currEmpty + 3);
        if (ec > 0) neighbors.push(currEmpty - 1);
        if (ec < 2) neighbors.push(currEmpty + 1);
        
        const next = neighbors[Math.floor(Math.random() * neighbors.length)];
        [board[currEmpty], board[next]] = [board[next], board[currEmpty]];
        currEmpty = next;
    }
    
    isPlaying = true;
    startTime = Date.now();
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        const t = (Date.now() - startTime) / 1000;
        document.getElementById('time').innerText = t.toFixed(1);
    }, 100);
    
    render();
}

function gameOver() {
    isPlaying = false;
    clearInterval(timerInterval);
    const time = (Date.now() - startTime);
    
    document.getElementById('finalTime').innerText = (time/1000).toFixed(1);
    document.getElementById('winScreen').classList.add('active');
    
    unlock('games.puzzle.solve');
    if (time < 60000) unlock('games.puzzle.sub60');
    if (time < 40000) unlock('games.puzzle.sub40');
    
    saveData(time);
}

function unlock(id) {
    if (window.parent.FIAOS_EVENTS) {
        window.parent.FIAOS_EVENTS.emit('games.unlock', { id });
    }
}

function saveData(timeMs) {
    if (!user) return;
    const uKey = `${KEYS.USER_GAMES}${user.id}_games`;
    let uData = JSON.parse(localStorage.getItem(uKey) || '{}');
    if (!uData.puzzle) uData.puzzle = { bestTimeMs: null, plays: 0 };
    
    uData.puzzle.plays++;
    if (uData.puzzle.bestTimeMs === null || timeMs < uData.puzzle.bestTimeMs) {
        uData.puzzle.bestTimeMs = timeMs;
    }
    
    localStorage.setItem(uKey, JSON.stringify(uData));

    // Global (Ascending sort for time)
    const gKey = KEYS.GLOBAL_ARCADE;
    let gData = JSON.parse(localStorage.getItem(gKey) || '{"puzzle":[]}');
    gData.puzzle.push({ userId: user.id, name: user.name, score: timeMs, date: Date.now() });
    gData.puzzle.sort((a,b) => a.score - b.score);
    gData.puzzle = gData.puzzle.slice(0, 10);
    localStorage.setItem(gKey, JSON.stringify(gData));
}

init();