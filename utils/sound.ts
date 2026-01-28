
// Sound Synthesizer - No external files needed
const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
const ctx = new AudioContext();

const playTone = (freq: number, type: OscillatorType, duration: number, vol = 0.1) => {
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + duration);
};

export const playSound = (type: 'click' | 'open' | 'close' | 'success' | 'error' | 'hover') => {
    switch (type) {
        case 'click':
            playTone(600, 'sine', 0.1, 0.05);
            break;
        case 'hover':
            playTone(400, 'sine', 0.05, 0.02);
            break;
        case 'open':
            // Swoosh up
            if (ctx.state === 'suspended') ctx.resume();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.frequency.setValueAtTime(200, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.3);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.3);
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
};
