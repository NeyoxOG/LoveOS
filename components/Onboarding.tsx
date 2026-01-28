
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Check, Heart, BookOpen, Lock, Sparkles } from 'lucide-react';

interface OnboardingProps {
  onComplete: () => void;
}

const SLIDES = [
  {
    id: 1,
    title: "Willkommen",
    subtitle: "bei FiaOS v0.2",
    description: "Ein Betriebssystem, gebaut für die Liebe. Ein digitaler Raum nur für uns.",
    icon: <Sparkles className="w-16 h-16 text-yellow-300 drop-shadow-[0_0_15px_rgba(253,224,71,0.5)]" />,
    gradient: "from-indigo-900 to-slate-900"
  },
  {
    id: 2,
    title: "LoveOS",
    subtitle: "Verbindung spüren",
    description: "Cloud-Synchronisiert. Was wir hier tun, erleben wir gemeinsam. Egal wo wir sind.",
    icon: <Heart className="w-16 h-16 text-pink-500 drop-shadow-[0_0_15px_rgba(236,72,153,0.5)] animate-pulse" />,
    gradient: "from-pink-900 to-rose-950"
  },
  {
    id: 3,
    title: "Features",
    subtitle: "Alles an einem Ort",
    description: "Luna pflegen, Tagebuch schreiben und Erinnerungen im Tresor sichern.",
    icon: (
      <div className="flex gap-4">
        <div className="bg-white/10 p-3 rounded-2xl border border-white/10"><span className="text-3xl">🐑</span></div>
        <div className="bg-white/10 p-3 rounded-2xl border border-white/10"><BookOpen className="w-8 h-8 text-amber-300" /></div>
        <div className="bg-white/10 p-3 rounded-2xl border border-white/10"><Lock className="w-8 h-8 text-emerald-300" /></div>
      </div>
    ),
    gradient: "from-slate-900 to-indigo-950"
  },
  {
    id: 4,
    title: "Bereit?",
    subtitle: "Deine Reise beginnt",
    description: "Sammle Erfolge, entdecke Secrets und gestalte dein FiaOS.",
    icon: <div className="text-6xl">🚀</div>,
    gradient: "from-blue-900 to-cyan-950"
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
      className="fixed inset-0 z-[100] flex flex-col overflow-hidden bg-black font-sans text-white"
    >
      {/* Dynamic Background */}
      <motion.div
        key={current.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className={`absolute inset-0 bg-gradient-to-br ${current.gradient} opacity-60 transition-colors duration-1000`}
      />
      
      {/* Noise Texture */}
      <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='1'/%3E%3C/svg%3E")` }} />

      {/* Content Area */}
      <div className="relative flex-1 flex flex-col items-center justify-center p-8 text-center z-10">
        <AnimatePresence mode='wait'>
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="flex flex-col items-center max-w-sm"
          >
            {/* Icon */}
            <div className="mb-12 relative">
                <div className="absolute inset-0 bg-white/20 blur-[60px] rounded-full" />
                <div className="relative z-10">{current.icon}</div>
            </div>

            {/* Texts */}
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-white to-white/60 mb-2 tracking-tight">
              {current.title}
            </h1>
            <h2 className="text-lg text-indigo-200 font-medium tracking-wide uppercase text-xs mb-6">
              {current.subtitle}
            </h2>
            <p className="text-lg text-white/70 leading-relaxed font-light">
              {current.description}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Navigation */}
      <div className="relative z-20 px-8 pb-12 pt-4 flex flex-col items-center gap-8">
        
        {/* Indicators */}
        <div className="flex gap-3">
          {SLIDES.map((slide, idx) => (
            <div 
              key={slide.id}
              className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentSlide ? 'w-8 bg-white' : 'w-2 bg-white/20'}`} 
            />
          ))}
        </div>

        {/* Action Button */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={nextSlide}
          className="w-full max-w-xs h-14 bg-white text-black rounded-full font-bold text-lg flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_40px_rgba(255,255,255,0.3)] transition-shadow"
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
