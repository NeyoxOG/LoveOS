import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft } from 'lucide-react';

interface AppWindowProps {
  isOpen: boolean;
  appId: string | null;
  appName: string;
  onClose: () => void;
}

const AppWindow: React.FC<AppWindowProps> = ({ isOpen, appId, appName, onClose }) => {
  if (!appId) return null;

  const appUrl = `/apps/${appId}.html`;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed inset-0 z-[60] bg-black flex flex-col"
        >
          {/* Header */}
          <div className="relative px-4 py-4 flex items-center justify-between bg-black/50 backdrop-blur-md border-b border-white/10 z-10">
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

            <div className="w-10" /> {/* Spacer for balance */}
          </div>

          {/* Iframe Container */}
          <div className="flex-1 w-full h-full relative bg-[#1c1c1e]">
             <iframe 
               src={appUrl} 
               className="w-full h-full border-none"
               title={appName}
             />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AppWindow;