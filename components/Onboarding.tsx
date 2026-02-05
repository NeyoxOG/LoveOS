import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Shield, Cloud, Sparkles, Palette, Gamepad2, Gift, CheckCircle2 } from 'lucide-react';
import { THEMES } from '../constants';
import { playSound } from '../utils/sound';

interface OnboardingProps {
  onComplete: () => void;
}

const steps = ['Willkommen', 'Verstanden', 'Theme', 'Sync', 'Fertig'];
const themeIds = ['roseGlass', 'aurora', 'softRose', 'midnightLove'];

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [selectedTheme, setSelectedTheme] = useState('aurora');
  const [syncEnabled, setSyncEnabled] = useState(true);

  const currentTheme = useMemo(() => THEMES[selectedTheme] || THEMES.aurora, [selectedTheme]);

  const next = () => {
    playSound('click');
    if (step < steps.length - 1) {
      setStep(prev => prev + 1);
      return;
    }
    playSound('success');
    onComplete();
  };

  const skip = () => {
    playSound('close');
    onComplete();
  };

  const pickTheme = (themeId: string) => {
    setSelectedTheme(themeId);
    playSound('success');
  };

  return (
    <div className="fixed inset-0 z-[220] overflow-hidden text-white">
      <div
        className="absolute inset-0"
        style={{
          background: currentTheme.colors.bgGradient,
          animation: 'auroraDrift 12s ease-in-out infinite alternate'
        }}
      />
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.75\' numOctaves=\'3\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")' }} />
      <div className="absolute -top-28 left-1/2 -translate-x-1/2 w-[560px] h-[560px] rounded-full bg-fuchsia-400/20 blur-[120px]" />

      <div className="relative z-10 h-full flex flex-col justify-between p-6 pt-10 pb-8">
        <div className="flex justify-between items-center">
          <div className="px-3 py-1 rounded-full bg-white/12 border border-white/20 text-xs tracking-[0.18em] uppercase font-semibold">v0.3 Aurora</div>
          <button onClick={skip} className="text-sm text-white/70">Überspringen</button>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="flex-1 flex items-center justify-center"
          >
            <div className="w-full max-w-md rounded-[30px] border border-white/20 bg-white/12 backdrop-blur-2xl p-6 shadow-[0_25px_50px_rgba(7,8,20,0.5)]">
              {step === 0 && (
                <div className="space-y-5">
                  <Sparkles className="w-10 h-10 text-violet-200" />
                  <h1 className="text-4xl font-semibold leading-tight">Willkommen bei LoveOS</h1>
                  <p className="text-white/75 text-base">Euer gemeinsames Hub für Momente, Belohnungen und Spielspaß.</p>
                  <div className="flex gap-2 flex-wrap">
                    <span className="px-3 py-1 rounded-full text-xs bg-white/14">Belohnungen</span>
                    <span className="px-3 py-1 rounded-full text-xs bg-white/14">Arcade</span>
                    <span className="px-3 py-1 rounded-full text-xs bg-white/14">Momente</span>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  <h2 className="text-3xl font-semibold">In 10 Sekunden verstanden</h2>
                  {[
                    { icon: Gift, title: 'Daily', text: 'Hol Punkte und kleine Überraschungen.' },
                    { icon: Sparkles, title: 'Belohnungen', text: 'Schalte Themes & Specials frei.' },
                    { icon: Gamepad2, title: 'Arcade', text: 'Spielt Games und teilt Highscores.' }
                  ].map((item, idx) => (
                    <motion.div
                      key={item.title}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.12 }}
                      className="rounded-2xl p-4 bg-white/10 border border-white/15"
                    >
                      <div className="flex items-start gap-3">
                        <item.icon className="w-5 h-5 text-white/90 mt-0.5" />
                        <div>
                          <div className="font-semibold">{item.title}</div>
                          <div className="text-sm text-white/70">{item.text}</div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {step === 2 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-3xl font-semibold">Mach es zu eurem Look</h2>
                    <p className="text-white/70">Themes ändern Stimmung und Hintergrund — jederzeit.</p>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {themeIds.map(themeId => {
                      const theme = THEMES[themeId];
                      const active = selectedTheme === themeId;
                      return (
                        <button
                          key={themeId}
                          onClick={() => pickTheme(themeId)}
                          className={`min-w-[145px] p-3 rounded-2xl border text-left ${active ? 'border-white/60 bg-white/20' : 'border-white/15 bg-white/8'}`}
                        >
                          <div className="h-20 rounded-xl mb-2" style={{ background: theme.colors.bgGradient }} />
                          <div className="text-sm font-semibold flex items-center justify-between">
                            {theme.name}
                            {active && <CheckCircle2 className="w-4 h-4" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Shield className="w-7 h-7 text-emerald-200" />
                    <h2 className="text-3xl font-semibold">Sicher & synchron</h2>
                  </div>
                  <ul className="text-white/75 text-sm space-y-2">
                    <li>• Nur ihr seht eure Inhalte.</li>
                    <li>• Sync hält alles aktuell — auf allen Geräten.</li>
                    <li>• Du kannst es jederzeit deaktivieren.</li>
                  </ul>
                  <button
                    onClick={() => setSyncEnabled(prev => !prev)}
                    className={`w-full rounded-2xl p-3 border flex items-center justify-between ${syncEnabled ? 'bg-emerald-400/20 border-emerald-200/40' : 'bg-white/10 border-white/20'}`}
                  >
                    <span className="flex items-center gap-2"><Cloud className="w-4 h-4" /> Cloud Sync aktivieren</span>
                    <span className="text-sm font-semibold">{syncEnabled ? 'An' : 'Aus'}</span>
                  </button>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-4 text-center">
                  <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-400/20 border border-emerald-200/40 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-100" />
                  </div>
                  <h2 className="text-3xl font-semibold">Alles bereit</h2>
                  <p className="text-white/75">Starte jetzt — oder hol dir zuerst deinen Daily Bonus.</p>
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="space-y-5">
          <div className="flex justify-center gap-2">
            {steps.map((_, idx) => (
              <div key={idx} className={`h-2 rounded-full transition-all ${idx === step ? 'w-8 bg-white' : 'w-2 bg-white/30'}`} />
            ))}
          </div>
          <button
            onClick={next}
            className="w-full h-14 rounded-2xl bg-white text-black font-semibold text-lg flex items-center justify-center gap-2 active:scale-[0.99] transition-transform"
          >
            {step === steps.length - 1 ? 'Los geht’s' : 'Weiter'}
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <style>{`@keyframes auroraDrift { 0% { transform: scale(1) translate3d(0,0,0);} 100% { transform: scale(1.03) translate3d(-8px, 6px, 0);} }`}</style>
    </div>
  );
};

export default Onboarding;
