
/**
 * Arcade Hub Logic (Cloud Enabled)
 */

const KEYS = { SESSION: 'fiaos_session' };

let user = null;
let globalStats = null;
let cloud = null;

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
    // Local bests are still fine from local storage for instant feedback in cards
    // But Leaderboard tab needs cloud
}

window.switchTab = async (id, idx) => {
    document.querySelectorAll('[id^="tab-"]').forEach(el => el.classList.add('hidden'));
    document.getElementById(`tab-${id}`).classList.remove('hidden');
    document.getElementById('segIndicator').style.transform = `translateX(${idx * 100}%)`;
    
    if (id === 'stats') {
        const lb = document.getElementById('lb-container');
        lb.innerHTML = '<div style="text-align:center; padding:20px;">Lade Cloud Scores... ☁️</div>';
        
        const games = [
            { key: 'stack', title: 'Hearts Stack' },
            { key: 'reaction', title: 'Reaction Tap' },
            { key: 'fillbox', title: 'Fill-the-Box' },
            { key: 'snake', title: 'Snake' }
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
    }
};

window.playGame = (gameId) => { window.location.href = `game_${gameId}.html`; };

init();
