
const TARGET_DATE = new Date("2026-05-18T00:00:00");

function playVideo() {
    document.getElementById('introScreen').classList.remove('active');
    document.getElementById('videoScreen').classList.add('active');
    
    const vid = document.getElementById('storyVideo');
    vid.play().catch(e => {
        console.error("Autoplay prevented", e);
        // If autoplay fails (rare after interaction), just show countdown
        endVideo();
    });

    vid.onended = endVideo;
}

function endVideo() {
    const vid = document.getElementById('storyVideo');
    vid.pause();
    
    document.getElementById('videoScreen').classList.remove('active');
    document.getElementById('countdownScreen').classList.add('active');
    
    startCountdown();
}

function startCountdown() {
    updateTimer();
    setInterval(updateTimer, 1000);
}

function updateTimer() {
    const now = new Date();
    const diff = TARGET_DATE - now;

    if (diff <= 0) {
        document.getElementById('d').innerText = "00";
        document.getElementById('h').innerText = "00";
        document.getElementById('m').innerText = "00";
        document.getElementById('s').innerText = "00";
        document.querySelector('.cd-title').innerText = "Der Moment ist gekommen!";
        return;
    }

    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);

    document.getElementById('d').innerText = d;
    document.getElementById('h').innerText = String(h).padStart(2, '0');
    document.getElementById('m').innerText = String(m).padStart(2, '0');
    document.getElementById('s').innerText = String(s).padStart(2, '0');
}
    