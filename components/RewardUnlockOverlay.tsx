
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Reward } from '../types';
import { X, Sparkles, Share2 } from 'lucide-react';
import { playRewardSound } from '../utils/sound';

interface RewardUnlockOverlayProps {
  reward: Reward | null;
  onClose: () => void;
}

const RewardUnlockOverlay: React.FC<RewardUnlockOverlayProps> = ({ reward, onClose }) => {
  
  useEffect(() => {
    if (reward) {
        // Determine rarity based on ID patterns or default
        let rarity: 'common' | 'rare' | 'epic' = 'common';
        if (reward.id.includes('100') || reward.id.includes('epic') || reward.id.includes('year') || reward.type === 'theme_unlock') rarity = 'epic';
        else if (reward.id.includes('50') || reward.id.includes('streak')) rarity = 'rare';
        
        playRewardSound(rarity);
    }
  }, [reward]);

  if (!reward) return null;

  const isTheme = reward.type === 'theme_unlock';

  return (
    <AnimatePresence>
      {reward && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-6"
        >
          {/* Backdrop with Blur and Flash */}
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-xl"
            onClick={onClose}
          />
          
          {/* Rotating Light Rays (Background) */}
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
            className="absolute inset-0 z-0 opacity-20 pointer-events-none"
            style={{ 
                background: `conic-gradient(from 0deg, transparent 0%, ${isTheme ? '#ec4899' : '#fbbf24'} 15%, transparent 30%, transparent 100%)`,
                scale: 1.5
            }}
          />

          {/* Card Container */}
          <motion.div
            initial={{ scale: 0.5, y: 100, opacity: 0 }}
            animate={{ 
                scale: [0.5, 1.1, 1], 
                y: 0, 
                opacity: 1,
                rotate: [0, -5, 5, 0] 
            }}
            exit={{ scale: 0.8, opacity: 0, y: 50 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="relative z-10 w-full max-w-sm bg-[#1c1c1e] border border-white/10 rounded-[2.5rem] p-8 text-center shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden"
          >
            {/* Gloss Effect */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
            
            {/* Icon Container with Burst */}
            <div className="relative mb-6 flex justify-center items-center">
                <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.5, 1] }}
                    transition={{ delay: 0.2 }}
                    className={`w-32 h-32 rounded-full flex items-center justify-center text-6xl shadow-2xl relative z-10
                        ${isTheme ? 'bg-gradient-to-br from-pink-500 to-purple-600' : 'bg-gradient-to-br from-yellow-400 to-orange-500'}
                    `}
                >
                    {reward.icon}
                </motion.div>
                
                {/* Particle Burst behind icon */}
                <motion.div 
                    initial={{ scale: 0, opacity: 1 }}
                    animate={{ scale: 2, opacity: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className={`absolute w-32 h-32 rounded-full ${isTheme ? 'bg-pink-500' : 'bg-yellow-400'}`}
                />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
            >
                <div className="text-sm font-bold uppercase tracking-widest text-white/40 mb-2">
                    {isTheme ? 'Neues Design' : 'Erfolg freigeschaltet'}
                </div>
                <h2 className="text-3xl font-black text-white mb-3 leading-tight">
                    {reward.title}
                </h2>
                <p className="text-white/70 text-lg leading-relaxed mb-8">
                    {reward.description}
                </p>

                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onClose}
                    className={`w-full py-4 rounded-2xl font-bold text-lg shadow-lg
                        ${isTheme ? 'bg-white text-black' : 'bg-gradient-to-r from-yellow-400 to-orange-500 text-black'}
                    `}
                >
                    Fantastisch! ✨
                </motion.button>
            </motion.div>

            {/* Confetti (Simple CSS implementation or more particles) */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full">
                 {/* Logic for confetti could be here, simplified for now */}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default RewardUnlockOverlay;
