
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
    // Fix: Access user.userId instead of user.id
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
    document.querySelectorAll('[id^="tab-"]').forEach(el => el.classList.add('hidden'));
    document.getElementById(`tab-${id}`).classList.remove('hidden');
    document.getElementById('segIndicator').style.transform = `translateX(${idx * 100}%)`;
    
    if (id === 'stats') {
        loadStatsView();
    }
};

window.forceRefresh = () => {
    if (currentTab === 'stats') loadStatsView();
    else renderUI();
};

async function loadStatsView() {
    const lb = document.getElementById('lb-container');
    lb.innerHTML = '<div style="text-align:center; padding:20px;">Lade Cloud Scores... ☁️</div>';
    
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
        html += `<div class="lb-section"><div class="lb-title">${g.title}</div>`;
        if (scores.length === 0) {
            html += '<div style="font-size:12px; color:#666; margin-bottom:20px;">Keine Scores</div>';
        } else {
            scores.forEach((s, i) => {
                let displayScore = s.score;
                if (g.key === 'puzzle' || g.key === 'reaction') {
                    // Time based display if needed, but reaction is points now based on accuracy
                    if (g.key === 'puzzle') displayScore = (s.score/1000).toFixed(1) + 's';
                }
                html += `
                    <div class="lb-item">
                        <div style="display:flex; align-items:center;">
                            <span class="lb-rank">${i+1}</span>
                            <span>${s.displayName || 'Unbekannt'}</span>
                        </div>
                        <span class="lb-score">${displayScore}</span>
                    </div>
                `;
            });
            html += '</div>';
        }
    }
    lb.innerHTML = html;
}

window.playGame = (gameId) => { window.location.href = `game_${gameId}.html`; };

// Global Escape Listener
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') window.history.back();
});

init();
