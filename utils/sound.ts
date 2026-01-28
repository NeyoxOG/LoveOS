
// Sound Synthesizer - Safe Lazy Init
let ctx: AudioContext | null = null;

const initAudio = () => {
    if (ctx) return ctx;
    try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
            ctx = new AudioContextClass();
        }
    } catch (e) {
        console.warn("AudioContext blocked or not supported", e);
    }
    return ctx;
};

const playTone = (freq: number, type: OscillatorType, duration: number, vol = 0.1) => {
    const audioCtx = initAudio();
    if (!audioCtx) return;

    // Resume if suspended (browser policy)
    if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
    }

    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        
        gain.gain.setValueAtTime(vol, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
        // Ignore sound errors to prevent app crash
    }
};

export const playSound = (type: 'click' | 'open' | 'close' | 'success' | 'error' | 'hover') => {
    try {
        switch (type) {
            case 'click':
                playTone(600, 'sine', 0.1, 0.05);
                break;
            case 'hover':
                playTone(400, 'sine', 0.05, 0.02);
                break;
            case 'open':
                // Swoosh up
                const ac1 = initAudio();
                if (ac1) {
                    const osc = ac1.createOscillator();
                    const gain = ac1.createGain();
                    osc.frequency.setValueAtTime(200, ac1.currentTime);
                    osc.frequency.exponentialRampToValueAtTime(600, ac1.currentTime + 0.3);
                    gain.gain.setValueAtTime(0.1, ac1.currentTime);
                    gain.gain.linearRampToValueAtTime(0, ac1.currentTime + 0.3);
                    osc.connect(gain);
                    gain.connect(ac1.destination);
                    osc.start();
                    osc.stop(ac1.currentTime + 0.3);
                }
                break;
            case 'close':
                playTone(300, 'sine', 0.15, 0.05);
                break;
            case 'success':
                // High chiming
                setTimeout(() => playTone(800, 'sine', 0.4, 0.1), 0);
                setTimeout(() => playTone(1200, 'sine', 0.6, 0.1), 100);
                break;
            case 'error':
                playTone(150, 'sawtooth', 0.3, 0.1);
                break;
        }
    } catch(e) {
        // Fail silently
    }
};
