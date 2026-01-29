
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, Check, Sparkles, Palette, Star } from 'lucide-react';
import { UserRewardsData, Reward } from '../types';
import { REWARD_CATALOG, VALENTINE_REWARDS, THEMES } from '../constants';

interface RewardsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  rewardsData: UserRewardsData | null;
  initialTab?: string;
}

type TabType = 'general' | 'love' | 'valentine';

const RewardsSheet: React.FC<RewardsSheetProps> = ({ isOpen, onClose, rewardsData, initialTab = 'general' }) => {
  const [activeTab, setActiveTab] = useState<TabType>('general');

  useEffect(() => {
    if (isOpen) {
        setActiveTab((initialTab === 'valentine' || initialTab === 'love') ? initialTab as TabType : 'general');
    }
  }, [isOpen, initialTab]);

  if (!rewardsData) return null;

  const getFilteredRewards = () => {
    let list: Reward[] = [];
    if (activeTab === 'valentine') list = VALENTINE_REWARDS;
    else if (activeTab === 'love') list = REWARD_CATALOG.filter(r => r.category === 'love');
    else list = REWARD_CATALOG.filter(r => r.category !== 'love' && r.category !== 'valentine');
    return list;
  };

  const filteredRewards = getFilteredRewards();
  const unlockedCount = filteredRewards.filter(r => {
      if (activeTab === 'valentine') return rewardsData.valentine.unlocked[r.id];
      return rewardsData.rewards[r.id]?.unlocked;
  }).length;
  const progress = (unlockedCount / filteredRewards.length) * 100;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md z-[80]"
          />

          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="absolute inset-x-0 bottom-0 top-16 z-[90] bg-[#0f0f14] rounded-t-[2.8rem] overflow-hidden flex flex-col shadow-2xl border-t border-white/10"
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-5 bg-gradient-to-b from-[#1c1c22] via-[#121214] to-[#0f0f14]">
               <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-white/10 rounded-full" />
               
               <div className="flex items-center justify-between mb-5 mt-2">
                 <div>
                   <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                     Belohnungen <span className="text-yellow-400 text-lg">🏆</span>
                   </h2>
                   <p className="text-xs text-white/50">Sammle neue Themes, Stories und Erinnerungen.</p>
                 </div>
                 <button onClick={onClose} className="p-2 bg-white/5 rounded-full hover:bg-white/10">
                   <X className="w-5 h-5 text-white" />
                 </button>
               </div>

               {/* Custom Tabs */}
               <div className="flex p-1 bg-black/40 rounded-xl mb-5 relative overflow-hidden">
                  {['general', 'love', 'valentine'].map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab as TabType)}
                        className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wide rounded-lg transition-all relative z-10 
                            ${activeTab === tab ? 'text-white shadow-lg' : 'text-white/40 hover:text-white/60'}`}
                      >
                        {tab === 'general' ? 'Allgemein' : tab === 'love' ? 'Love' : 'Valentine'}
                        {activeTab === tab && (
                            <motion.div layoutId="activeTab" className="absolute inset-0 bg-white/10 rounded-lg -z-10" />
                        )}
                      </button>
                  ))}
               </div>

               {/* Progress Bar */}
               <div className="flex items-center gap-3 text-xs font-bold text-white/40 mb-2">
                   <span>Fortschritt</span>
                   <span className="text-white">{Math.round(progress)}%</span>
               </div>
               <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
                   <motion.div 
                     initial={{ width: 0 }} 
                     animate={{ width: `${progress}%` }} 
                     transition={{ duration: 1, ease: "easeOut" }}
                     className={`h-full ${activeTab === 'valentine' ? 'bg-pink-500' : activeTab === 'love' ? 'bg-rose-500' : 'bg-yellow-500'}`} 
                   />
               </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0f0f14]">
              {activeTab !== 'valentine' && (
                <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-white/40">Themes</p>
                      <h3 className="text-base font-semibold text-white">Freischaltungen</h3>
                    </div>
                    <Palette className="w-5 h-5 text-white/50" />
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {Object.values(THEMES).map((theme) => {
                      if (!theme.unlockRewardId) return null;
                      const isUnlocked = rewardsData.rewards?.[theme.unlockRewardId]?.unlocked || rewardsData.valentine?.unlocked?.[theme.unlockRewardId];
                      return (
                        <div
                          key={theme.id}
                          className={`flex-shrink-0 w-28 rounded-2xl border ${isUnlocked ? 'border-white/20' : 'border-white/5 opacity-60'}`}
                        >
                          <div
                            className="h-20 rounded-2xl"
                            style={{ background: theme.colors.bgGradient }}
                          />
                          <div className="px-2 py-2">
                            <p className="text-xs font-semibold text-white truncate">{theme.name}</p>
                            <p className="text-[10px] text-white/40">{isUnlocked ? 'Freigeschaltet' : 'Gesperrt'}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {filteredRewards.map((reward, i) => {
                  let isUnlocked = false;
                  if (activeTab === 'valentine') isUnlocked = rewardsData.valentine.unlocked[reward.id] ?? false;
                  else isUnlocked = rewardsData.rewards[reward.id]?.unlocked ?? false;

                  const isEpic = reward.id.includes('100') || reward.id.includes('year') || reward.type === 'theme_unlock';
                  
                  return (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      key={reward.id}
                      className={`
                        relative p-4 rounded-2xl border flex items-center gap-4 group overflow-hidden
                        ${isUnlocked 
                            ? isEpic 
                                ? 'bg-gradient-to-br from-purple-900/30 to-indigo-900/30 border-purple-500/30' 
                                : 'bg-white/5 border-white/10' 
                            : 'bg-black/20 border-white/5 opacity-60 grayscale'}
                      `}
                    >
                      {/* Shine effect for epic */}
                      {isUnlocked && isEpic && (
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12 translate-x-[-100%] animate-[shine_3s_infinite]" />
                      )}

                      <div className={`
                        w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-inner shrink-0 relative
                        ${isUnlocked 
                            ? isEpic ? 'bg-purple-500 text-white shadow-purple-900/50' : 'bg-white/10 text-white' 
                            : 'bg-black/40 text-white/20'}
                      `}>
                        {isUnlocked ? reward.icon : <Lock className="w-5 h-5" />}
                        {isUnlocked && <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-0.5 border-2 border-[#1c1c1e]"><Check className="w-2 h-2 text-black" /></div>}
                      </div>

                      <div className="flex-1 min-w-0">
                          <h3 className={`font-bold truncate ${isUnlocked ? 'text-white' : 'text-white/50'}`}>
                              {reward.title}
                          </h3>
                          <p className="text-xs text-white/40 truncate mt-0.5">
                              {isUnlocked ? reward.description : "Verschlossen"}
                          </p>
                      </div>
                      
                      {isEpic && isUnlocked && <Star className="w-4 h-4 text-purple-400 fill-current" />}
                    </motion.div>
                  );
              })}
              <div className="h-10" />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default RewardsSheet;
