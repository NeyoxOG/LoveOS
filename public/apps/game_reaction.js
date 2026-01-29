
/**
 * Game: Precision Timer
 * Goal: Stop exactly at 3.000s
 */

const KEYS = { SESSION: 'fiaos_session', USER_GAMES: 'fiaos_user_', GLOBAL_ARCADE: 'fiaos_global_arcade' };
const TARGET_TIME = 3000; // ms

let user = null;
let cloud = null;
let startTime = 0;
let timerInterval = null;
let isRunning = false;
let score = 0;

function init() {
    const sessionStr = localStorage.getItem(KEYS.SESSION);
    if (sessionStr) user = JSON.parse(sessionStr);

    if (window.parent.FIAOS && window.parent.FIAOS.cloud) {
        cloud = window.parent.FIAOS.cloud;
    }

    // Escape Key
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') window.history.back();
        if (e.code === 'Space') handleAction();
    });
}

function handleAction(e) {
    if (e) e.preventDefault();
    
    const btn = document.getElementById('actionBtn');
    
    if (!isRunning) {
        // Start
        isRunning = true;
        startTime = Date.now();
        btn.innerText = "STOP";
        btn.classList.add('stop');
        document.getElementById('result').classList.remove('show');
        
        timerInterval = setInterval(() => {
            const now = Date.now();
            const elapsed = now - startTime;
            document.getElementById('timer').innerText = (elapsed / 1000).toFixed(3);
        }, 10); // Update frequently
        
    } else {
        // Stop
        clearInterval(timerInterval);
        isRunning = false;
        btn.innerText = "Retry";
        btn.classList.remove('stop');
        
        const now = Date.now();
        const elapsed = now - startTime;
        document.getElementById('timer').innerText = (elapsed / 1000).toFixed(3);
        
        calculateScore(elapsed);
    }
}

function calculateScore(elapsed) {
    const diff = Math.abs(elapsed - TARGET_TIME);
    let points = 0;
    
    // Scoring Logic
    if (diff === 0) points = 10000; // Perfect
    else if (diff <= 10) points = 5000;
    else if (diff <= 50) points = 1000;
    else if (diff <= 100) points = 500;
    else if (diff <= 500) points = 100;
    else points = 10;

    score = points;
    
    const diffText = diff === 0 ? "PERFECT!" : `${(diff/1000).toFixed(3)}s off`;
    document.getElementById('diff').innerText = diffText;
    document.getElementById('score').innerText = `Score: ${points}`;
    document.getElementById('result').classList.add('show');
    
    if (diff <= 10) {
        if (window.parent.FIAOS) window.parent.FIAOS.playSound('success');
    }

    saveScore(points);
}

function saveScore(s) {
    if (!user) return;
    
    // Local
    // Fix: use user.userId
    const uKey = `${KEYS.USER_GAMES}${user.userId}_games`;
    let uData = JSON.parse(localStorage.getItem(uKey) || '{}');
    if (!uData.reaction) uData.reaction = { best: 0, plays: 0 };
    
    uData.reaction.last = s;
    uData.reaction.plays++;
    if (s > uData.reaction.best) uData.reaction.best = s;
    localStorage.setItem(uKey, JSON.stringify(uData));

    // Cloud
    if (cloud) {
        cloud.saveHighscore('reaction', s);
    }
}

init();
