
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, Check, Sparkles, Heart, Clock, Palette } from 'lucide-react';
import { UserRewardsData, Reward } from '../types';
import { REWARD_CATALOG, VALENTINE_REWARDS, THEMES } from '../constants';

interface RewardsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  rewardsData: UserRewardsData | null;
  initialTab?: string;
}

type FilterType = 'all' | 'unlocked' | 'locked' | 'new';
type TabType = 'general' | 'love' | 'valentine';

const RewardsSheet: React.FC<RewardsSheetProps> = ({ isOpen, onClose, rewardsData, initialTab = 'general' }) => {
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [countdown, setCountdown] = useState("");

  useEffect(() => {
    if (isOpen) {
        if (initialTab === 'valentine' || initialTab === 'love') {
            setActiveTab(initialTab as TabType);
        } else {
            setActiveTab('general');
        }
    }
  }, [isOpen, initialTab]);

  // Countdown Logic
  useEffect(() => {
    if (activeTab !== 'valentine' || !isOpen) return;

    const timer = setInterval(() => {
      const now = new Date();
      let year = now.getFullYear();
      const valDate = new Date(year, 1, 14); // Feb 14

      if (now.getMonth() === 1 && now.getDate() === 14) {
        setCountdown("Heute ist Valentinstag 💘");
        return;
      }

      if (now > valDate) {
        year++;
        valDate.setFullYear(year);
      }

      const diff = valDate.getTime() - now.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setCountdown(`Noch ${days} Tage ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(timer);
  }, [activeTab, isOpen]);

  if (!rewardsData) return null;

  const getFilteredRewards = () => {
    let list: Reward[] = [];
    
    if (activeTab === 'valentine') {
        list = VALENTINE_REWARDS;
    } else if (activeTab === 'love') {
        list = REWARD_CATALOG.filter(r => r.category === 'love');
    } else {
        list = REWARD_CATALOG.filter(r => r.category !== 'love' && r.category !== 'valentine');
    }

    return list.filter(reward => {
      let isUnlocked = false;
      let unlockedAt: number | null = null;
      
      if (activeTab === 'valentine') {
        isUnlocked = rewardsData.valentine.unlocked[reward.id] ?? false;
        unlockedAt = rewardsData.valentine.completedAt;
      } else {
        const progress = rewardsData.rewards[reward.id];
        isUnlocked = progress?.unlocked ?? false;
        unlockedAt = progress?.unlockedAt ?? null;
      }

      if (activeTab === 'valentine') return true; 

      const isNew = isUnlocked && unlockedAt && unlockedAt > rewardsData.meta.lastSeenAt;

      switch (activeFilter) {
        case 'unlocked': return isUnlocked;
        case 'locked': return !isUnlocked;
        case 'new': return isNew;
        default: return true;
      }
    });
  };

  const filteredRewards = getFilteredRewards();
  const valentineTotal = 6;
  const valentineUnlockedCount = Object.values(rewardsData.valentine.unlocked).filter(Boolean).length;
  const isValentineComplete = valentineUnlockedCount === valentineTotal;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md z-[80]"
          />

          {/* Sheet Container */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="absolute inset-x-0 bottom-0 top-12 z-[90] bg-[#1c1c1e] rounded-t-[2.5rem] overflow-hidden flex flex-col shadow-2xl border-t border-white/10"
          >
            {/* Header */}
            <div className="relative px-6 pt-6 pb-2 border-b border-white/5 bg-white/5 backdrop-blur-md z-10">
               {/* Handle */}
               <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 bg-white/20 rounded-full" />
               
               <div className="flex items-center justify-between mt-2 mb-4">
                 <div>
                   <h2 className="text-2xl font-bold text-white tracking-tight">Erfolge</h2>
                   <p className="text-xs text-indigo-300 font-medium tracking-wide">Meilensteine & Erinnerungen ✨</p>
                 </div>
                 <button 
                   onClick={onClose}
                   className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                 >
                   <X className="w-5 h-5 text-white" />
                 </button>
               </div>

               {/* Tabs */}
               <div className="flex bg-black/20 p-1 rounded-xl mb-4 gap-1">
                  <button 
                    onClick={() => setActiveTab('general')}
                    className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${activeTab === 'general' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40'}`}
                  >
                    Allgemein
                  </button>
                  <button 
                    onClick={() => setActiveTab('love')}
                    className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1 ${activeTab === 'love' ? 'bg-rose-500/20 text-rose-200 shadow-sm' : 'text-white/40'}`}
                  >
                    Love 💞
                  </button>
                  <button 
                    onClick={() => setActiveTab('valentine')}
                    className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1 ${activeTab === 'valentine' ? 'bg-pink-500/20 text-pink-200 shadow-sm' : 'text-white/40'}`}
                  >
                    Valentine 💘
                  </button>
               </div>

               {/* Filters (Not for Valentine) */}
               {activeTab !== 'valentine' && (
                 <div className="flex gap-2 overflow-x-auto no-scrollbar pb-3">
                   <FilterChip label="Alle" active={activeFilter === 'all'} onClick={() => setActiveFilter('all')} />
                   <FilterChip label="Freigeschaltet" active={activeFilter === 'unlocked'} onClick={() => setActiveFilter('unlocked')} icon={<Check className="w-3 h-3" />} />
                   <FilterChip label="Gesperrt" active={activeFilter === 'locked'} onClick={() => setActiveFilter('locked')} icon={<Lock className="w-3 h-3" />} />
                   <FilterChip label="Neu" active={activeFilter === 'new'} onClick={() => setActiveFilter('new')} icon={<Sparkles className="w-3 h-3" />} />
                 </div>
               )}
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
              
              {/* Valentine Specific Header */}
              {activeTab === 'valentine' && (
                <div className="space-y-4 mb-6">
                  <div className="flex items-center justify-between text-sm font-medium text-pink-200/80">
                    <span>Fortschritt</span>
                    <span className={isValentineComplete ? 'text-pink-400 font-bold animate-pulse' : ''}>
                      {isValentineComplete ? 'Abgeschlossen ✨' : `${valentineUnlockedCount} / ${valentineTotal}`}
                    </span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(valentineUnlockedCount / valentineTotal) * 100}%` }}
                      className="h-full bg-gradient-to-r from-pink-500 to-purple-500 relative"
                    >
                      {isValentineComplete && <div className="absolute inset-0 bg-white/20 animate-shimmer-fast" />}
                    </motion.div>
                  </div>
                  <div className="bg-gradient-to-br from-pink-900/40 to-black border border-pink-500/20 rounded-2xl p-5 text-center shadow-lg relative overflow-hidden">
                    <div className="relative z-10">
                      <div className="flex items-center justify-center gap-2 text-pink-300 mb-2">
                        <Clock className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-widest">Countdown</span>
                      </div>
                      <div className="text-2xl font-mono font-bold text-white tracking-wider">
                        {countdown || "Berechne..."}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Reward List */}
              {filteredRewards.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-white/30 space-y-2">
                  <div className="text-4xl">📭</div>
                  <p className="text-sm font-medium">Keine Erfolge gefunden</p>
                </div>
              ) : (
                filteredRewards.map((reward) => {
                  let isUnlocked = false;
                  if (activeTab === 'valentine') {
                     isUnlocked = rewardsData.valentine.unlocked[reward.id] ?? false;
                  } else {
                     isUnlocked = rewardsData.rewards[reward.id]?.unlocked ?? false;
                  }
                  
                  const isTheme = reward.type === 'theme_unlock';
                  const themeDef = isTheme && reward.payload?.themeId ? THEMES[reward.payload.themeId] : null;
                  
                  return (
                    <motion.div
                      layout
                      key={reward.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`
                        relative flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 overflow-hidden
                        ${isUnlocked 
                          ? activeTab === 'valentine'
                            ? 'bg-gradient-to-br from-pink-950/80 to-purple-950/80 border-pink-500/40' // Enhanced visibility for Valentine unlocked
                            : activeTab === 'love'
                                ? 'bg-gradient-to-br from-rose-950/80 to-pink-950/80 border-rose-500/40'
                                : 'bg-gradient-to-br from-indigo-950/80 to-purple-950/80 border-indigo-500/40' 
                          : 'bg-white/5 border-white/5 grayscale opacity-60'}
                      `}
                    >
                      {/* Theme Preview Background for Unlocked Themes */}
                      {isUnlocked && isTheme && themeDef && (
                         <div 
                           className="absolute inset-0 opacity-20 pointer-events-none"
                           style={{ background: themeDef.colors.bgGradient }}
                         />
                      )}

                      {/* Icon */}
                      <div className={`
                        w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-inner shrink-0 relative z-10
                        ${isUnlocked 
                          ? activeTab === 'valentine'
                            ? 'bg-gradient-to-tr from-pink-500 to-purple-600 shadow-[0_0_15px_rgba(236,72,153,0.3)]' 
                            : activeTab === 'love'
                                ? 'bg-gradient-to-tr from-rose-500 to-pink-600'
                                : 'bg-gradient-to-tr from-indigo-500 to-purple-600'
                          : 'bg-white/10'}
                      `}>
                        {isUnlocked ? reward.icon : <Lock className="w-5 h-5 text-white/40" />}
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0 relative z-10">
                        <h3 className={`font-semibold truncate flex items-center gap-2 ${isUnlocked ? 'text-white' : 'text-white/60'}`}>
                          {reward.title}
                          {isTheme && isUnlocked && <Palette className="w-3 h-3 text-white/50" />}
                        </h3>
                        <p className="text-xs text-white/40 leading-relaxed truncate">
                          {activeTab === 'valentine' && isUnlocked ? "Eingelöst ✔" : reward.description}
                        </p>
                      </div>

                      {/* Status Icon */}
                      <div className="text-white/20 shrink-0 relative z-10">
                        {isUnlocked && <Check className={`w-5 h-5 ${activeTab === 'valentine' ? 'text-pink-400' : 'text-green-400'}`} />}
                      </div>

                    </motion.div>
                  );
                })
              )}
              {/* Padding for bottom safety area */}
              <div className="h-20" />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

const FilterChip: React.FC<{ label: string, active: boolean, onClick: () => void, icon?: React.ReactNode }> = ({ label, active, onClick, icon }) => (
  <button
    onClick={onClick}
    className={`
      flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap
      ${active 
        ? 'bg-white text-black shadow-lg shadow-white/10' 
        : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'}
    `}
  >
    {icon}
    {label}
  </button>
);

export default RewardsSheet;
