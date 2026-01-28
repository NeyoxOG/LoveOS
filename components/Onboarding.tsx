
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Home, Grid, Share2, Coffee, Heart } from 'lucide-react';
import { playSound } from '../utils/sound';

interface OnboardingProps {
  onComplete: () => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState(0); // 0: Logo, 1: Welcome, 2: Cards, 3: Finish
  const [cardIndex, setCardIndex] = useState(0);

  // Phase 1: Logo & Phase 2: Welcome Auto-Advance
  useEffect(() => {
    if (phase === 0) {
      const timer = setTimeout(() => setPhase(1), 2500);
      return () => clearTimeout(timer);
    }
    if (phase === 1) {
      const timer = setTimeout(() => setPhase(2), 3500);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  const nextCard = () => {
    playSound('click');
    if (cardIndex < 3) {
      setCardIndex(prev => prev + 1);
    } else {
      setPhase(3);
    }
  };

  const finish = () => {
    playSound('success');
    onComplete();
  };

  const cards = [
    {
      icon: <Home className="w-12 h-12 text-indigo-400" />,
      title: "Home",
      text: "Hier beginnt jeder Tag."
    },
    {
      icon: <Grid className="w-12 h-12 text-pink-400" />,
      title: "Apps",
      text: "Alles hat seinen Platz."
    },
    {
      icon: <Share2 className="w-12 h-12 text-blue-400" />,
      title: "Verbindung",
      text: "Manches wird geteilt. Manches bleibt bei dir."
    },
    {
      icon: <Coffee className="w-12 h-12 text-emerald-400" />,
      title: "Ruhe",
      text: "Nichts drängt. Du bestimmst das Tempo."
    }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex flex-col bg-black font-sans text-white select-none overflow-hidden"
    >
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/10 via-black to-black z-0 pointer-events-none" />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-150 pointer-events-none z-0"></div>

      <AnimatePresence mode='wait'>
        
        {/* PHASE 1: LOGO INTRO */}
        {phase === 0 && (
            <motion.div 
                key="logo"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className="flex-1 flex flex-col items-center justify-center z-10"
            >
                <motion.div 
                    animate={{ boxShadow: ["0 0 0px rgba(255,255,255,0)", "0 0 30px rgba(255,255,255,0.2)", "0 0 0px rgba(255,255,255,0)"] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center mb-6"
                >
                    <Heart className="w-8 h-8 text-black fill-black" />
                </motion.div>
                <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-white/50">
                    FiaOS
                </h1>
            </motion.div>
        )}

        {/* PHASE 2: WELCOME TEXT */}
        {phase === 1 && (
            <motion.div 
                key="welcome"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 1 }}
                className="flex-1 flex flex-col items-center justify-center z-10 p-8 text-center"
            >
                <motion.h2 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-4xl font-light mb-4"
                >
                    Willkommen.
                </motion.h2>
                <motion.p 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 1.5 }}
                    className="text-xl text-white/60 font-light"
                >
                    Das hier ist euer Raum.
                </motion.p>
            </motion.div>
        )}

        {/* PHASE 3: CARDS */}
        {phase === 2 && (
            <motion.div 
                key="cards"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col z-10 pt-20 pb-12 px-6"
            >
                <div className="flex-1 flex items-center justify-center">
                    <AnimatePresence mode='wait'>
                        <motion.div
                            key={cardIndex}
                            initial={{ opacity: 0, x: 50, scale: 0.95 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: -50, scale: 0.95 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="w-full max-w-sm bg-[#1c1c1e] border border-white/10 rounded-[2.5rem] p-8 min-h-[400px] flex flex-col items-center justify-center text-center shadow-2xl relative overflow-hidden"
                        >
                            {/* Card Background Glow */}
                            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
                            
                            <div className="mb-8 p-6 bg-white/5 rounded-full relative z-10">
                                {cards[cardIndex].icon}
                            </div>
                            
                            <h3 className="text-3xl font-bold mb-4">{cards[cardIndex].title}</h3>
                            <p className="text-lg text-white/60 leading-relaxed font-light">
                                {cards[cardIndex].text}
                            </p>

                            {/* Pagination Dots inside card or below? Below looks cleaner for iOS style */}
                        </motion.div>
                    </AnimatePresence>
                </div>

                <div className="mt-8 flex flex-col items-center gap-8">
                    {/* Dots */}
                    <div className="flex gap-2">
                        {cards.map((_, i) => (
                            <div 
                                key={i} 
                                className={`w-2 h-2 rounded-full transition-all duration-300 ${i === cardIndex ? 'bg-white w-6' : 'bg-white/20'}`}
                            />
                        ))}
                    </div>

                    <button 
                        onClick={nextCard}
                        className="w-full max-w-xs bg-white text-black font-bold py-4 rounded-full text-lg flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                    >
                        {cardIndex === cards.length - 1 ? 'Starten' : 'Weiter'} 
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </motion.div>
        )}

        {/* PHASE 4: FINISH */}
        {phase === 3 && (
            <motion.div 
                key="finish"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col items-center justify-center z-10 p-8 text-center"
            >
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="mb-12"
                >
                    <h2 className="text-5xl font-bold mb-6">Bereit?</h2>
                    <p className="text-xl text-white/50">
                        FiaOS ist eingerichtet.
                    </p>
                </motion.div>

                <motion.button 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    onClick={finish}
                    className="w-full max-w-xs bg-indigo-500 text-white font-bold py-5 rounded-full text-xl shadow-lg shadow-indigo-500/30 active:scale-95 transition-transform"
                >
                    Ankommen
                </motion.button>
            </motion.div>
        )}

      </AnimatePresence>
    </motion.div>
  );
};

export default Onboarding;
