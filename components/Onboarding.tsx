
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Check, Heart, Power, Sparkles, ShieldCheck, Zap } from 'lucide-react';
import { playSound } from '../utils/sound';

interface OnboardingProps {
  onComplete: () => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [bootProgress, setBootProgress] = useState(0);

  // Auto-advance step 0 (Boot)
  useEffect(() => {
    if (step === 0) {
      const interval = setInterval(() => {
        setBootProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setTimeout(() => setStep(1), 500);
            return 100;
          }
          return prev + 2; // Speed of boot
        });
      }, 20);
      return () => clearInterval(interval);
    }
  }, [step]);

  const nextStep = () => {
    playSound('click');
    setStep(prev => prev + 1);
  };

  const finish = () => {
    playSound('success');
    onComplete();
  };

  const variants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex flex-col bg-black font-sans text-white select-none overflow-hidden"
    >
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-900/20 to-black z-0 pointer-events-none" />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-150 pointer-events-none z-0"></div>

      <AnimatePresence mode='wait'>
        
        {/* STEP 0: BOOT SEQUENCE */}
        {step === 0 && (
            <motion.div 
                key="boot"
                className="flex-1 flex flex-col items-center justify-center p-8 z-10"
                exit={{ opacity: 0, scale: 1.1 }}
            >
                <div className="w-16 h-16 mb-8 relative">
                    <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                        className="absolute inset-0 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Power className="w-6 h-6 text-white" />
                    </div>
                </div>
                <h1 className="text-2xl font-bold tracking-tight mb-2">FiaOS v0.2</h1>
                <p className="text-white/40 text-xs font-mono mb-8 uppercase tracking-widest">Initialisiere Herz-Protokolle...</p>
                
                {/* Progress Bar */}
                <div className="w-64 h-1 bg-white/10 rounded-full overflow-hidden">
                    <motion.div 
                        style={{ width: `${bootProgress}%` }}
                        className="h-full bg-white shadow-[0_0_10px_white]"
                    />
                </div>
            </motion.div>
        )}

        {/* STEP 1: WELCOME & CONNECT */}
        {step === 1 && (
            <motion.div 
                key="welcome"
                variants={variants}
                initial="initial" animate="animate" exit="exit"
                className="flex-1 flex flex-col p-8 pt-20 z-10"
            >
                <div className="flex-1">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                        <Heart className="w-6 h-6 text-black fill-black" />
                    </div>
                    <h1 className="text-4xl font-bold mb-4 leading-tight">Hallo.<br/>Willkommen zuhause.</h1>
                    <p className="text-lg text-white/60 leading-relaxed">
                        FiaOS ist dein persönlicher Raum. Hier sind unsere Erinnerungen, Ziele und kleinen Momente sicher verwahrt.
                    </p>
                </div>

                <button onClick={nextStep} className="w-full bg-white text-black font-bold py-4 rounded-full text-lg flex items-center justify-center gap-2 active:scale-95 transition-transform">
                    Weiter <ChevronRight className="w-5 h-5" />
                </button>
            </motion.div>
        )}

        {/* STEP 2: MODULES CHECK */}
        {step === 2 && (
            <motion.div 
                key="modules"
                variants={variants}
                initial="initial" animate="animate" exit="exit"
                className="flex-1 flex flex-col p-8 pt-20 z-10"
            >
                <h2 className="text-3xl font-bold mb-8">System Status</h2>
                
                <div className="space-y-4 mb-8">
                    <FeatureRow icon={<ShieldCheck className="w-5 h-5 text-green-400" />} title="Verbindung" desc="Sicher & Verschlüsselt" delay={0.1} />
                    <FeatureRow icon={<Zap className="w-5 h-5 text-yellow-400" />} title="Synchronisation" desc="Cloud Aktiv" delay={0.3} />
                    <FeatureRow icon={<Sparkles className="w-5 h-5 text-pink-400" />} title="Love Engine" desc="100% Kapazität" delay={0.5} />
                </div>

                <div className="flex-1" />

                <button onClick={finish} className="w-full bg-indigo-600 text-white font-bold py-4 rounded-full text-lg shadow-lg shadow-indigo-900/50 active:scale-95 transition-transform">
                    System Starten
                </button>
            </motion.div>
        )}

      </AnimatePresence>
    </motion.div>
  );
};

const FeatureRow = ({ icon, title, desc, delay }: { icon: any, title: string, desc: string, delay: number }) => (
    <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay }}
        className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5"
    >
        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
            {icon}
        </div>
        <div>
            <div className="font-bold text-white">{title}</div>
            <div className="text-xs text-white/50">{desc}</div>
        </div>
        <div className="ml-auto">
            <Check className="w-5 h-5 text-white/30" />
        </div>
    </motion.div>
);

export default Onboarding;
