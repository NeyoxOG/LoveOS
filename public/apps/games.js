
/**
 * Arcade Hub Logic (Cloud Enabled)
 */

const KEYS = { SESSION: 'fiaos_session' };

let user = null;
let globalStats = null;
let cloud = null;
let leaderboardUnsub = null;

function init() {
    const sessionStr = localStorage.getItem(KEYS.SESSION);
    if (!sessionStr) return;
    user = JSON.parse(sessionStr);
    user.id = user.id || user.userId;

    if (window.parent.FIAOS && window.parent.FIAOS.cloud) {
        cloud = window.parent.FIAOS.cloud;
    }

    renderUI();
    updateStatus();
}

async function loadLeaderboard(gameId) {
    if (!cloud) return [];
    return await cloud.getLeaderboard(gameId);
}

function renderUI() {
    // Local bests from cache for instant feedback
    const key = `fiaos_user_${user.id}_games`;
    const data = JSON.parse(localStorage.getItem(key) || '{}');
    
    updateBadge('stack', data.stack?.best);
    updateBadge('reaction', data.reaction?.best);
    updateBadge('blockblast', data.blockblast?.best);
    updateBadge('snake', data.snake?.best);
    updateBadge('flappy', data.flappy?.best);
    updateBadge('fillfridge', data.fillfridge?.best);
    updateBadge('word', data.word?.best);
    
    if (data.puzzle?.bestTimeMs) {
        document.getElementById('best-puzzle').innerText = `Best: ${(data.puzzle.bestTimeMs/1000).toFixed(1)}s`;
    }
}

function updateBadge(id, score) {
    const el = document.getElementById(`best-${id}`);
    if(el) el.innerText = score ? `Best: ${score}` : 'Best: —';
}

function updateStatus() {
    const pill = document.getElementById('cloudStatus');
    const text = document.getElementById('cloudStatusText');
    if (!pill || !text) return;
    if (cloud) {
        pill.classList.add('online');
        text.innerText = 'Cloud';
    } else {
        pill.classList.remove('online');
        text.innerText = 'Offline';
    }
}

async function loadLeaderboards() {
    const lb = document.getElementById('lb-container');
    if (!lb) return;
    if (!cloud) {
        lb.innerHTML = '<div style="text-align:center; padding:20px; color:#666;">Keine Cloud-Verbindung.</div>';
        return;
    }

    lb.innerHTML = '<div style="text-align:center; padding:20px;">Lade Cloud Scores... ☁️</div>';
    const games = [
        { key: 'stack', title: 'Hearts Stack' },
        { key: 'reaction', title: 'Reaction Tap' },
        { key: 'blockblast', title: 'BlockBlast' },
        { key: 'snake', title: 'Snake' },
        { key: 'flappy', title: 'Flappy Love' },
        { key: 'fillfridge', title: 'Fill The Fridge' },
        { key: 'word', title: 'Wörterspiel' }
    ];

    let html = '';
    for (const g of games) {
        const scores = await loadLeaderboard(g.key);
        html += `<div class="lb-section"><div class="lb-title">${g.title}</div>`;
        if (scores.length === 0) {
            html += '<div style="font-size:12px; color:#666;">Keine Scores</div>';
        } else {
            scores.forEach((s, i) => {
                html += `
                    <div class="lb-item">
                        <div style="display:flex; align-items:center;">
                            <span class="lb-rank">${i+1}</span>
                            <span>${s.displayName || 'Unbekannt'}</span>
                        </div>
                        <span class="lb-score">${s.score}</span>
                    </div>
                `;
            });
        }
        html += `</div>`;
    }
    lb.innerHTML = html;

    const updatedEl = document.getElementById('lbUpdated');
    if (updatedEl) updatedEl.innerText = `Zuletzt aktualisiert: ${new Date().toLocaleTimeString()}`;
}

function subscribeLeaderboards() {
    if (!cloud || leaderboardUnsub) return;
    leaderboardUnsub = cloud.listenToLeaderboards(['stack', 'reaction', 'blockblast', 'snake', 'flappy', 'fillfridge', 'word'], () => {
        loadLeaderboards();
    });
}

function unsubscribeLeaderboards() {
    if (leaderboardUnsub) {
        leaderboardUnsub();
        leaderboardUnsub = null;
    }
}

window.switchTab = async (id, idx) => {
    document.querySelectorAll('[id^="tab-"]').forEach(el => el.classList.add('hidden'));
    document.getElementById(`tab-${id}`).classList.remove('hidden');
    document.getElementById('segIndicator').style.transform = `translateX(${idx * 100}%)`;
    
    if (id === 'stats') {
        subscribeLeaderboards();
        await loadLeaderboards();
    } else {
        unsubscribeLeaderboards();
    }
};

window.playGame = (gameId) => { window.location.href = `game_${gameId}.html`; };
window.refreshLeaderboard = () => loadLeaderboards();

init();
