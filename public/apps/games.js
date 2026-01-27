/**
 * Arcade Hub Logic
 */

const KEYS = {
    SESSION: 'fiaos_session',
    USER_GAMES: 'fiaos_user_', // + userId + _games
    GLOBAL_ARCADE: 'fiaos_global_arcade'
};

let user = null;
let userStats = null;
let globalStats = null;

function init() {
    const sessionStr = localStorage.getItem(KEYS.SESSION);
    if (!sessionStr) return;
    user = JSON.parse(sessionStr);

    loadData();
    renderUI();
}

function loadData() {
    // User Stats
    const uKey = `${KEYS.USER_GAMES}${user.id}_games`;
    const uRaw = localStorage.getItem(uKey);
    userStats = uRaw ? JSON.parse(uRaw) : { 
        stack: {best:0}, reaction: {best:0}, fillbox: {best:0}, puzzle: {bestTimeMs:null} 
    };

    // Global
    const gRaw = localStorage.getItem(KEYS.GLOBAL_ARCADE);
    globalStats = gRaw ? JSON.parse(gRaw) : { stack:[], reaction:[], fillbox:[], puzzle:[] };
}

function renderUI() {
    // Render Bests on Cards
    document.getElementById('best-stack').innerText = `Best: ${userStats.stack?.best || 0}`;
    document.getElementById('best-reaction').innerText = `Best: ${userStats.reaction?.best || 0}`;
    document.getElementById('best-fillbox').innerText = `Best: ${userStats.fillbox?.best || 0}`;
    
    const pTime = userStats.puzzle?.bestTimeMs;
    document.getElementById('best-puzzle').innerText = pTime ? `Best: ${(pTime/1000).toFixed(1)}s` : 'Best: --';

    // Render Leaderboard
    const lb = document.getElementById('lb-container');
    lb.innerHTML = '';

    const games = [
        { key: 'stack', title: 'Hearts Stack' },
        { key: 'reaction', title: 'Reaction Tap' },
        { key: 'fillbox', title: 'Fill-the-Box' },
        { key: 'puzzle', title: 'Slider Puzzle' }
    ];

    games.forEach(g => {
        const list = globalStats[g.key] || [];
        const section = document.createElement('div');
        section.className = 'lb-section';
        
        let itemsHtml = '';
        if (list.length === 0) {
            itemsHtml = '<div style="font-size:12px; color:#444; padding:8px;">Noch keine Highscores.</div>';
        } else {
            itemsHtml = list.map((entry, i) => {
                let scoreTxt = entry.score;
                if (g.key === 'puzzle') scoreTxt = (entry.score / 1000).toFixed(1) + 's';
                return `
                    <div class="lb-item">
                        <div style="display:flex; align-items:center;">
                            <span class="lb-rank">${i+1}</span>
                            <span>${entry.name}</span>
                        </div>
                        <span class="lb-score">${scoreTxt}</span>
                    </div>
                `;
            }).join('');
        }

        section.innerHTML = `
            <div class="lb-title">${g.title}</div>
            ${itemsHtml}
        `;
        lb.appendChild(section);
    });
}

window.switchTab = (id, idx) => {
    document.querySelectorAll('[id^="tab-"]').forEach(el => el.classList.add('hidden'));
    document.getElementById(`tab-${id}`).classList.remove('hidden');
    document.getElementById('segIndicator').style.transform = `translateX(${idx * 100}%)`;
    
    if (id === 'stats') {
        loadData(); // refresh
        renderUI();
    }
};

window.playGame = (gameId) => {
    // Open game in new window/iframe via redirect inside frame
    window.location.href = `game_${gameId}.html`;
};

init();