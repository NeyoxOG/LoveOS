
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
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
      const timer = setTimeout(() => setShowSplash(false), 1200); 
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
          initial={{ opacity: 0, scale: 0.9, y: 50, borderRadius: "2rem" }}
          animate={{ opacity: 1, scale: 1, y: 0, borderRadius: "0rem" }}
          exit={{ opacity: 0, scale: 0.9, y: 50, borderRadius: "2rem" }}
          transition={{ type: "spring", damping: 25, stiffness: 300, mass: 0.8 }}
          className="fixed inset-0 z-[60] bg-black flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="relative pt-[calc(10px+env(safe-area-inset-top))] pb-3 px-4 flex items-center justify-between bg-black/40 backdrop-blur-xl border-b border-white/5 z-20">
            <button 
              onClick={onClose}
              className="flex items-center gap-1 text-white font-medium active:opacity-60 transition-opacity pl-2 pr-4 py-2"
            >
              <ChevronLeft className="w-6 h-6" />
              <span className="text-lg">Zurück</span>
            </button>
            
            <h2 className="text-base font-semibold text-white absolute left-1/2 -translate-x-1/2 opacity-90">
              {appName}
            </h2>
            <div className="w-10" /> 
          </div>

          <div className="flex-1 w-full h-full relative bg-[#050505]">
             {/* Iframe */}
             <iframe 
               src={appUrl} 
               className={`w-full h-full border-none transition-opacity duration-700 ${iframeLoaded && !showSplash ? 'opacity-100' : 'opacity-0'}`}
               title={appName}
               onLoad={() => setIframeLoaded(true)}
             />

             {/* Splash Screen */}
             <AnimatePresence>
               {showSplash && (
                 <motion.div 
                   initial={{ opacity: 1 }}
                   exit={{ opacity: 0 }}
                   transition={{ duration: 0.4 }}
                   className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/95 backdrop-blur-sm"
                 >
                    <motion.div 
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="w-24 h-24 squircle bg-white/10 flex items-center justify-center text-5xl mb-6 shadow-2xl border border-white/10"
                    >
                      {appIcon}
                    </motion.div>
                    
                    <motion.h1 
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.1 }}
                      className="text-2xl font-bold text-white tracking-tight"
                    >
                      {appName}
                    </motion.h1>
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
