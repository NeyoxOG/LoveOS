
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft } from 'lucide-react';
import { APPS } from '../constants';

interface AppWindowProps {
  isOpen: boolean;
  appId: string | null;
  appName: string;
  onClose: () => void;
}

const AppWindow: React.FC<AppWindowProps> = ({ isOpen, appId, appName, onClose }) => {
  const [showSplash, setShowSplash] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowSplash(true);
      setIframeLoaded(false);
      // Splash duration
      const timer = setTimeout(() => setShowSplash(false), 1500); 
      return () => clearTimeout(timer);
    }
  }, [isOpen, appId]);

  if (!appId) return null;

  const appUrl = `/apps/${appId}.html`;
  const appItem = APPS.find(a => a.id === appId);
  const appIcon = appItem?.icon || '📱';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed inset-0 z-[60] bg-black flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="relative px-4 py-4 flex items-center justify-between bg-black/50 backdrop-blur-md border-b border-white/10 z-10 flex-shrink-0">
            <button 
              onClick={onClose}
              className="flex items-center gap-1 text-indigo-400 font-medium active:opacity-70 transition-opacity"
            >
              <ChevronLeft className="w-6 h-6" />
              <span className="text-lg">Zurück</span>
            </button>
            
            <h2 className="text-lg font-bold text-white absolute left-1/2 -translate-x-1/2">
              {appName}
            </h2>

            <div className="w-10" /> 
          </div>

          <div className="flex-1 w-full h-full relative bg-[#1c1c1e]">
             {/* Iframe */}
             <iframe 
               src={appUrl} 
               className={`w-full h-full border-none transition-opacity duration-500 ${iframeLoaded && !showSplash ? 'opacity-100' : 'opacity-0'}`}
               title={appName}
               onLoad={() => setIframeLoaded(true)}
             />

             {/* Splash Screen */}
             <AnimatePresence>
               {showSplash && (
                 <motion.div 
                   initial={{ opacity: 1 }}
                   exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
                   transition={{ duration: 0.5 }}
                   className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/90 backdrop-blur-xl"
                 >
                    <motion.div 
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 200 }}
                      className="text-8xl mb-6 filter drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]"
                    >
                      {appIcon}
                    </motion.div>
                    
                    <motion.h1 
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="text-3xl font-bold text-white tracking-tight"
                    >
                      {appName}
                    </motion.h1>
                    
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: 60 }}
                      transition={{ delay: 0.3, duration: 0.5 }}
                      className="h-1 bg-gradient-to-r from-indigo-500 to-pink-500 rounded-full mt-4"
                    />
                 </motion.div>
               )}
             </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AppWindow;
