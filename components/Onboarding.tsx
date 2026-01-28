
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Check, Heart, BookOpen, Lock, Sparkles, Star } from 'lucide-react';

interface OnboardingProps {
  onComplete: () => void;
}

const SLIDES = [
  {
    id: 1,
    title: "Willkommen",
    subtitle: "bei FiaOS v0.2",
    description: "Ein Betriebssystem, gebaut für die Liebe. Ein digitaler Raum nur für uns.",
    icon: <Sparkles className="w-16 h-16 text-yellow-300 drop-shadow-[0_0_20px_rgba(253,224,71,0.6)]" />,
    gradient: "from-indigo-900 via-purple-900 to-slate-900",
    particleColor: "bg-indigo-400"
  },
  {
    id: 2,
    title: "LoveOS",
    subtitle: "Verbindung spüren",
    description: "Cloud-Synchronisiert. Was wir hier tun, erleben wir gemeinsam. Egal wo wir sind.",
    icon: <Heart className="w-16 h-16 text-pink-500 drop-shadow-[0_0_25px_rgba(236,72,153,0.6)] animate-[pulse_2s_infinite]" />,
    gradient: "from-pink-900 via-rose-900 to-rose-950",
    particleColor: "bg-pink-400"
  },
  {
    id: 3,
    title: "Features",
    subtitle: "Alles an einem Ort",
    description: "Luna pflegen, Tagebuch schreiben und Erinnerungen im Tresor sichern.",
    icon: (
      <div className="flex gap-4">
        <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 2 }} className="bg-white/10 p-3 rounded-2xl border border-white/10"><span className="text-3xl">🐑</span></motion.div>
        <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 2, delay: 0.3 }} className="bg-white/10 p-3 rounded-2xl border border-white/10"><BookOpen className="w-8 h-8 text-amber-300" /></motion.div>
        <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 2, delay: 0.6 }} className="bg-white/10 p-3 rounded-2xl border border-white/10"><Lock className="w-8 h-8 text-emerald-300" /></motion.div>
      </div>
    ),
    gradient: "from-slate-900 via-blue-900 to-indigo-950",
    particleColor: "bg-blue-400"
  },
  {
    id: 4,
    title: "Bereit?",
    subtitle: "Deine Reise beginnt",
    description: "Sammle Erfolge, entdecke Secrets und gestalte dein FiaOS.",
    icon: <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 3 }} className="text-6xl drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]">🚀</motion.div>,
    gradient: "from-blue-900 via-cyan-900 to-cyan-950",
    particleColor: "bg-cyan-400"
  }
];

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const nextSlide = () => {
    if (currentSlide < SLIDES.length - 1) {
      setCurrentSlide(curr => curr + 1);
    } else {
      onComplete();
    }
  };

  const current = SLIDES[currentSlide];

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex flex-col overflow-hidden bg-black font-sans text-white"
    >
      {/* Dynamic Background */}
      <motion.div
        key={current.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5 }}
        className={`absolute inset-0 bg-gradient-to-br ${current.gradient} opacity-80`}
      />
      
      {/* Animated Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
         {[...Array(8)].map((_, i) => (
             <motion.div
                key={i}
                initial={{ y: "110vh", x: Math.random() * 100 + "vw", opacity: 0 }}
                animate={{ y: "-10vh", opacity: [0, 0.5, 0] }}
                transition={{ duration: 5 + Math.random() * 5, repeat: Infinity, delay: Math.random() * 5 }}
                className={`absolute w-1 h-1 rounded-full ${current.particleColor}`}
             />
         ))}
      </div>

      {/* Noise Texture */}
      <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='1'/%3E%3C/svg%3E")` }} />

      {/* Content Area */}
      <div className="relative flex-1 flex flex-col items-center justify-center p-8 text-center z-10">
        <AnimatePresence mode='wait'>
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.9 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex flex-col items-center max-w-sm"
          >
            {/* Icon Glow */}
            <div className="mb-12 relative">
                <div className="absolute inset-0 bg-white/10 blur-[50px] rounded-full scale-150 animate-pulse" />
                <div className="relative z-10">{current.icon}</div>
            </div>

            {/* Texts */}
            <h1 className="text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60 mb-3 tracking-tight drop-shadow-sm">
              {current.title}
            </h1>
            <h2 className="text-sm text-indigo-200 font-bold tracking-[0.2em] uppercase mb-8 border-b border-white/20 pb-2">
              {current.subtitle}
            </h2>
            <p className="text-lg text-white/80 leading-relaxed font-normal">
              {current.description}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Navigation */}
      <div className="relative z-20 px-8 pb-16 pt-4 flex flex-col items-center gap-8">
        
        {/* Indicators */}
        <div className="flex gap-3">
          {SLIDES.map((slide, idx) => (
            <motion.div 
              key={slide.id}
              animate={{ 
                  width: idx === currentSlide ? 32 : 8,
                  backgroundColor: idx === currentSlide ? "#ffffff" : "rgba(255,255,255,0.2)" 
              }}
              className="h-1.5 rounded-full" 
            />
          ))}
        </div>

        {/* Action Button */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.05 }}
          onClick={nextSlide}
          className="w-full max-w-xs h-14 bg-white text-black rounded-full font-bold text-lg flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_50px_rgba(255,255,255,0.4)] transition-shadow"
        >
          {currentSlide === SLIDES.length - 1 ? (
            <>Loslegen <Check className="w-5 h-5" /></>
          ) : (
            <>Weiter <ChevronRight className="w-5 h-5" /></>
          )}
        </motion.button>
      </div>
    </motion.div>
  );
};

export default Onboarding;
