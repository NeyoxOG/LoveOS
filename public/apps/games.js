
/**
 * Arcade Hub Logic (Cloud Enabled)
 */

const KEYS = { SESSION: 'fiaos_session' };

let user = null;
let cloud = null;
let currentTab = 'games';

function init() {
    const sessionStr = localStorage.getItem(KEYS.SESSION);
    if (!sessionStr) return;
    user = JSON.parse(sessionStr);

    if (window.parent.FIAOS && window.parent.FIAOS.cloud) {
        cloud = window.parent.FIAOS.cloud;
    }

    renderUI();
}

async function loadLeaderboard(gameId) {
    if (!cloud) return [];
    return await cloud.getLeaderboard(gameId);
}

function renderUI() {
    // Local bests from cache for instant feedback
    const uid = user.userId;
    const key = `fiaos_user_${uid}_games`;
    const data = JSON.parse(localStorage.getItem(key) || '{}');
    
    updateBadge('stack', data.stack?.best);
    updateBadge('reaction', data.reaction?.best);
    updateBadge('blockblast', data.blockblast?.best);
    updateBadge('snake', data.snake?.best);
    updateBadge('flappy', data.flappy?.best);
    
    if (data.puzzle?.bestTimeMs) {
        document.getElementById('best-puzzle').innerText = `Best: ${(data.puzzle.bestTimeMs/1000).toFixed(1)}s`;
    }
}

function updateBadge(id, score) {
    const el = document.getElementById(`best-${id}`);
    if(el) el.innerText = `Best: ${score || 0}`;
}

window.switchTab = async (id, idx) => {
    currentTab = id;
    
    // Toggle Content Visibility
    document.getElementById('tab-games').classList.toggle('hidden', id !== 'games');
    document.getElementById('tab-stats').classList.toggle('hidden', id !== 'stats');
    
    // Move Indicator
    document.getElementById('segIndicator').style.transform = `translateX(${idx * 100}%)`;
    
    // Toggle Active State on Buttons
    const btns = document.querySelectorAll('.segment-btn');
    btns.forEach(b => b.classList.remove('active'));
    btns[idx].classList.add('active');

    if (id === 'stats') {
        loadStatsView();
    }
};

window.forceRefresh = () => {
    if (currentTab === 'stats') loadStatsView();
    else renderUI();
    
    // Feedback
    const btn = document.querySelector('.refresh-btn');
    btn.style.transform = 'rotate(360deg)';
    setTimeout(() => btn.style.transform = 'none', 500);
};

async function loadStatsView() {
    const lb = document.getElementById('lb-container');
    // Show spinner if empty
    if (!lb.innerHTML.includes('lb-section')) {
        lb.innerHTML = '<div class="loading-state"><div class="spinner"></div></div>';
    }
    
    const games = [
        { key: 'stack', title: 'Hearts Stack' },
        { key: 'reaction', title: 'Precision Timer' },
        { key: 'blockblast', title: 'BlockBlast' },
        { key: 'snake', title: 'Snake v2' },
        { key: 'flappy', title: 'Flappy Love' }
    ];

    let html = '';
    for (const g of games) {
        const scores = await loadLeaderboard(g.key);
        
        html += `<div class="lb-section"><h3>${g.title}</h3>`;
        html += `<div class="lb-list">`;
        
        if (scores.length === 0) {
            html += '<div class="lb-row" style="color:#666; justify-content:center;">Keine Scores</div>';
        } else {
            scores.forEach((s, i) => {
                let displayScore = s.score;
                if (g.key === 'puzzle' || g.key === 'reaction') {
                    if (g.key === 'puzzle') displayScore = (s.score/1000).toFixed(1) + 's';
                }
                
                // Rank formatting
                const rankClass = i === 0 ? 'top-1' : (i === 1 ? 'top-2' : (i === 2 ? 'top-3' : ''));
                const rankIcon = i === 0 ? '🥇' : (i === 1 ? '🥈' : (i === 2 ? '🥉' : (i + 1)));

                html += `
                    <div class="lb-row">
                        <div class="lb-rank ${rankClass}">${rankIcon}</div>
                        <div class="lb-user">${s.displayName || 'Unbekannt'}</div>
                        <div class="lb-val">${displayScore}</div>
                    </div>
                `;
            });
        }
        html += `</div></div>`; // Close list & section
    }
    lb.innerHTML = html;
}

window.playGame = (gameId) => { window.location.href = `game_${gameId}.html`; };

// Global Escape Listener
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') window.history.back();
});

init();
