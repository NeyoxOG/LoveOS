
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

const playTone = (freq: number, type: OscillatorType, duration: number, vol = 0.1, delay = 0) => {
    const audioCtx = initAudio();
    if (!audioCtx) return;

    // Resume if suspended (browser policy)
    if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
    }

    try {
        const t = audioCtx.currentTime + delay;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.type = type;
        osc.frequency.setValueAtTime(freq, t);
        
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(vol, t + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.start(t);
        osc.stop(t + duration);
    } catch (e) {
        // Ignore sound errors
    }
};

export const playRewardSound = (rarity: 'common' | 'rare' | 'epic') => {
    switch (rarity) {
        case 'common':
            playTone(523.25, 'sine', 0.5, 0.1, 0); // C5
            playTone(659.25, 'sine', 0.5, 0.1, 0.1); // E5
            break;
        case 'rare':
            playTone(523.25, 'triangle', 0.4, 0.1, 0); // C5
            playTone(659.25, 'triangle', 0.4, 0.1, 0.1); // E5
            playTone(783.99, 'triangle', 0.6, 0.1, 0.2); // G5
            playTone(1046.50, 'sine', 0.8, 0.1, 0.3); // C6
            break;
        case 'epic':
            // Arpeggio
            [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98, 2093.00].forEach((freq, i) => {
                playTone(freq, 'square', 0.6, 0.05, i * 0.08);
            });
            // Bass impact
            playTone(130.81, 'sawtooth', 1.0, 0.2, 0); 
            break;
    }
};

export const playSound = (type: 'click' | 'open' | 'close' | 'success' | 'error' | 'hover' | 'tap') => {
    try {
        switch (type) {
            case 'click':
                playTone(600, 'sine', 0.1, 0.05);
                break;
            case 'tap':
                playTone(800, 'triangle', 0.05, 0.03);
                break;
            case 'hover':
                playTone(400, 'sine', 0.05, 0.02);
                break;
            case 'open':
                playTone(400, 'sine', 0.3, 0.1, 0);
                playTone(600, 'sine', 0.3, 0.1, 0.1);
                break;
            case 'close':
                playTone(300, 'sine', 0.15, 0.05);
                break;
            case 'success':
                playRewardSound('common');
                break;
            case 'error':
                playTone(150, 'sawtooth', 0.3, 0.1);
                playTone(140, 'sawtooth', 0.3, 0.1, 0.1);
                break;
        }
    } catch(e) {}
};
