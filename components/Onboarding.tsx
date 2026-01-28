
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Check, Heart, Power, Sparkles, Fingerprint } from 'lucide-react';
import { playSound } from '../utils/sound';

interface OnboardingProps {
  onComplete: () => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [interactState, setInteractState] = useState(0); // For sub-steps within slides

  // Step 0: Welcome - Tap to start
  const handleStart = () => {
    playSound('success');
    setStep(1);
    setInteractState(0);
  };

  // Step 1: Connect - Tap 2 dots
  const handleConnect = (dotId: number) => {
    if (dotId === 1 && interactState === 0) {
        setInteractState(1);
        playSound('tap');
    }
    if (dotId === 2 && interactState === 1) {
        setInteractState(2);
        playSound('success');
        setTimeout(() => {
            setStep(2);
            setInteractState(0);
        }, 1000);
    }
  };

  // Step 2: Activate Features - Tap 3 icons
  const handleFeatureTap = (id: number) => {
      // Bitmask or simple counter. Let's use simple counter visual
      if (interactState < 3) {
          setInteractState(prev => prev + 1);
          playSound('tap');
          if (interactState + 1 === 3) {
              playSound('success');
              setTimeout(() => {
                  setStep(3);
                  setInteractState(0);
              }, 1000);
          }
      }
  };

  // Step 3: Launch - Hold button
  const [holdProgress, setHoldProgress] = useState(0);
  const startHold = () => {
      const interval = setInterval(() => {
          setHoldProgress(p => {
              if (p >= 100) {
                  clearInterval(interval);
                  onComplete();
                  playSound('success');
                  return 100;
              }
              return p + 2; // Speed
          });
      }, 16);
      // @ts-ignore
      window.holdInterval = interval;
  };
  const stopHold = () => {
      // @ts-ignore
      clearInterval(window.holdInterval);
      setHoldProgress(0);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex flex-col overflow-hidden bg-black font-sans text-white select-none"
    >
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-150 pointer-events-none"></div>

      <AnimatePresence mode='wait'>
        
        {/* SLIDE 1: WELCOME */}
        {step === 0 && (
            <motion.div 
                key="step0"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
                className="flex-1 flex flex-col items-center justify-center p-8 text-center relative"
            >
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-black to-black opacity-50 -z-10" />
                
                <motion.div 
                    animate={{ rotate: [0, 5, -5, 0] }} 
                    transition={{ repeat: Infinity, duration: 6 }}
                    className="mb-8 relative"
                >
                    <div className="absolute inset-0 bg-indigo-500 blur-3xl opacity-30 animate-pulse" />
                    <Sparkles className="w-20 h-20 text-indigo-300 relative z-10" />
                </motion.div>

                <h1 className="text-5xl font-black mb-4 tracking-tighter">FiaOS</h1>
                <p className="text-white/60 mb-12 max-w-xs">Dein persönliches Love-System.<br/>Bereit für den Start?</p>

                <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={handleStart}
                    className="w-20 h-20 rounded-full bg-white text-black flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.3)] animate-pulse"
                >
                    <Power className="w-8 h-8" />
                </motion.button>
                <div className="mt-4 text-xs text-white/30 uppercase tracking-widest">Tippen zum Starten</div>
            </motion.div>
        )}

        {/* SLIDE 2: CONNECTION */}
        {step === 1 && (
            <motion.div 
                key="step1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, x: -50 }}
                className="flex-1 flex flex-col items-center justify-center p-8 text-center relative"
            >
                <div className="absolute inset-0 bg-gradient-to-br from-pink-900 via-black to-black opacity-50 -z-10" />
                
                <h2 className="text-3xl font-bold mb-2">Verbindung</h2>
                <p className="text-white/50 mb-12 text-sm">Synchronisiere unsere Herzen.</p>

                <div className="relative h-40 w-full flex items-center justify-center">
                    {/* Line */}
                    <div className="absolute h-1 bg-white/10 w-40 rounded-full" />
                    <motion.div 
                        className="absolute h-1 bg-pink-500 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: interactState === 2 ? 160 : interactState === 1 ? 80 : 0 }}
                        style={{ left: '50%', translateX: '-50%' }}
                    />

                    {/* Dot 1 */}
                    <motion.button
                        onClick={() => handleConnect(1)}
                        className={`absolute left-[calc(50%-80px-20px)] w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-500
                            ${interactState >= 1 ? 'bg-pink-500 border-pink-500 shadow-[0_0_20px_#ec4899]' : 'bg-black border-white/30'}
                        `}
                    >
                        <Heart className={`w-4 h-4 ${interactState >= 1 ? 'fill-white text-white' : 'text-white/30'}`} />
                    </motion.button>

                    {/* Dot 2 */}
                    <motion.button
                        onClick={() => handleConnect(2)}
                        disabled={interactState < 1}
                        className={`absolute right-[calc(50%-80px-20px)] w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-500
                            ${interactState >= 2 ? 'bg-pink-500 border-pink-500 shadow-[0_0_20px_#ec4899]' : 'bg-black border-white/30'}
                            ${interactState === 1 ? 'animate-bounce' : ''}
                        `}
                    >
                        <Heart className={`w-4 h-4 ${interactState >= 2 ? 'fill-white text-white' : 'text-white/30'}`} />
                    </motion.button>
                </div>
                
                <div className="mt-8 text-xs text-white/30 uppercase tracking-widest">
                    {interactState === 0 ? "Tippe das linke Herz" : interactState === 1 ? "Verbinde mit dem rechten" : "Verbunden!"}
                </div>
            </motion.div>
        )}

        {/* SLIDE 3: FEATURES */}
        {step === 2 && (
            <motion.div 
                key="step2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, x: -50 }}
                className="flex-1 flex flex-col items-center justify-center p-8 text-center relative"
            >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-black to-black opacity-50 -z-10" />
                
                <h2 className="text-3xl font-bold mb-2">Module</h2>
                <p className="text-white/50 mb-12 text-sm">Aktiviere deine Apps.</p>

                <div className="flex gap-6">
                    {[0, 1, 2].map((i) => (
                        <motion.button
                            key={i}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleFeatureTap(i)}
                            className={`w-20 h-24 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all duration-300
                                ${interactState > i 
                                    ? 'bg-blue-500/20 border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.3)]' 
                                    : 'bg-white/5 border-white/10 opacity-50'}
                            `}
                        >
                            <div className="text-2xl">{['🐑', '📔', '💌'][i]}</div>
                            <div className={`w-2 h-2 rounded-full ${interactState > i ? 'bg-blue-400' : 'bg-white/20'}`} />
                        </motion.button>
                    ))}
                </div>

                <div className="mt-12 text-xs text-white/30 uppercase tracking-widest">
                    {3 - interactState} Module aktivieren
                </div>
            </motion.div>
        )}

        {/* SLIDE 4: LAUNCH */}
        {step === 3 && (
            <motion.div 
                key="step3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 1.5 }}
                className="flex-1 flex flex-col items-center justify-center p-8 text-center relative"
            >
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-900 via-black to-black opacity-50 -z-10" />
                
                <h2 className="text-4xl font-black mb-8 tracking-tighter">Bereit.</h2>
                
                <div className="relative">
                    {/* Ring Background */}
                    <svg width="120" height="120" className="rotate-[-90deg]">
                        <circle cx="60" cy="60" r="54" stroke="rgba(255,255,255,0.1)" strokeWidth="4" fill="none" />
                        <motion.circle 
                            cx="60" cy="60" r="54" 
                            stroke="#10b981" strokeWidth="4" fill="none"
                            strokeDasharray="339.292"
                            strokeDashoffset={339.292 - (339.292 * holdProgress) / 100}
                            strokeLinecap="round"
                        />
                    </svg>
                    
                    {/* Fingerprint Button */}
                    <button
                        onMouseDown={startHold}
                        onMouseUp={stopHold}
                        onTouchStart={startHold}
                        onTouchEnd={stopHold}
                        className="absolute inset-2 rounded-full bg-white/10 flex items-center justify-center active:bg-white/20 transition-colors"
                    >
                        <Fingerprint className={`w-10 h-10 ${holdProgress > 0 ? 'text-emerald-400' : 'text-white/50'}`} />
                    </button>
                </div>

                <div className="mt-8 text-xs text-white/30 uppercase tracking-widest font-bold">
                    Halten zum Öffnen
                </div>
            </motion.div>
        )}

      </AnimatePresence>
    </motion.div>
  );
};

export default Onboarding;
