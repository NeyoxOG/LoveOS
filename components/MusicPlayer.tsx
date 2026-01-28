
import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipForward, Music } from 'lucide-react';

const MusicPlayer: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Simulated track list
  const track = { title: "Our Love Song", artist: "Fia & Collin", duration: "3:45" };

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPlaying(!isPlaying);
  };

  return (
    <motion.div
      layout
      onClick={() => setIsExpanded(!isExpanded)}
      initial={{ width: 48, height: 48 }}
      animate={{ 
        width: isExpanded ? 300 : 48, 
        height: isExpanded ? 120 : 48,
        borderRadius: isExpanded ? 24 : 24
      }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className={`fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-black/60 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden cursor-pointer ${isExpanded ? 'p-4' : 'p-0'}`}
    >
      <AnimatePresence mode='wait'>
        {!isExpanded ? (
          <motion.div 
            key="collapsed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-full flex items-center justify-center"
          >
             <div className="relative w-full h-full flex items-center justify-center">
                {isPlaying ? (
                    <div className="flex gap-1 items-end h-3 mb-1">
                        <motion.div animate={{ height: [4, 12, 4] }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-1 bg-green-400 rounded-full" />
                        <motion.div animate={{ height: [4, 16, 4] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.1 }} className="w-1 bg-green-400 rounded-full" />
                        <motion.div animate={{ height: [4, 10, 4] }} transition={{ repeat: Infinity, duration: 0.9, delay: 0.2 }} className="w-1 bg-green-400 rounded-full" />
                    </div>
                ) : (
                    <Music className="w-5 h-5 text-white/50" />
                )}
             </div>
          </motion.div>
        ) : (
          <motion.div 
            key="expanded"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-4 h-full"
          >
            {/* Album Art */}
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shrink-0">
                <Music className="w-10 h-10 text-white" />
            </div>

            {/* Controls */}
            <div className="flex-1 min-w-0">
                <h3 className="text-white font-bold truncate">{track.title}</h3>
                <p className="text-white/50 text-xs truncate">{track.artist}</p>
                
                <div className="mt-3 flex items-center gap-4">
                    <button className="text-white/70 hover:text-white transition-colors">
                        <SkipForward className="w-5 h-5 rotate-180" />
                    </button>
                    <button onClick={togglePlay} className="w-8 h-8 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 transition-transform">
                        {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                    </button>
                    <button className="text-white/70 hover:text-white transition-colors">
                        <SkipForward className="w-5 h-5" />
                    </button>
                </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default MusicPlayer;
