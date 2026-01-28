
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipForward, Music } from 'lucide-react';

const MusicPlayer: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // Track Info & Source
  const track = { title: "Walzer", artist: "Provinz", duration: "0:30" };
  const audioSrc = "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/02/00/f0/0200f0e0-61fb-9ff6-9dc1-cbff5d9b83cb/mzaf_9238239730011130235.plus.aac.ep.m4a";

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => setIsPlaying(false);
    const handlePause = () => setIsPlaying(false);
    const handlePlay = () => setIsPlaying(true);

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('play', handlePlay);

    return () => {
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('pause', handlePause);
        audio.removeEventListener('play', handlePlay);
    };
  }, []);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (audioRef.current) {
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play().catch(e => console.error("Audio play failed:", e));
        }
    }
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
      <audio ref={audioRef} src={audioSrc} preload="auto" />

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
            <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shrink-0 overflow-hidden relative">
                {/* Using a gradient or visual for now, but could be album art */}
                <div className="absolute inset-0 bg-black/20 z-10" />
                <Music className="w-10 h-10 text-white relative z-20" />
                {isPlaying && (
                    <div className="absolute inset-0 flex items-center justify-center gap-1 z-0 opacity-30">
                         <motion.div animate={{ height: ['20%', '80%', '20%'] }} transition={{ repeat: Infinity, duration: 1.2 }} className="w-2 bg-white/50" />
                         <motion.div animate={{ height: ['40%', '100%', '40%'] }} transition={{ repeat: Infinity, duration: 0.9 }} className="w-2 bg-white/50" />
                         <motion.div animate={{ height: ['30%', '60%', '30%'] }} transition={{ repeat: Infinity, duration: 1.5 }} className="w-2 bg-white/50" />
                    </div>
                )}
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
