import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { OverlayState } from '../types';

interface OverlayProps {
  state: OverlayState;
  onClose: () => void;
}

const Overlay: React.FC<OverlayProps> = ({ state, onClose }) => {
  return (
    <AnimatePresence>
      {state.isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-lg z-[60]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-0 flex items-center justify-center z-[70] p-6 pointer-events-none"
          >
            <div className="bg-[#1c1c1e]/80 backdrop-blur-2xl border border-white/10 p-8 rounded-[2rem] shadow-2xl max-w-sm w-full relative pointer-events-auto">
              <button 
                onClick={onClose}
                className="absolute top-4 right-4 p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-white/60" />
              </button>
              
              <div className="text-center space-y-4 pt-4">
                <h2 className="text-2xl font-bold text-white">{state.title}</h2>
                <p className="text-white/60 leading-relaxed">
                  {state.content}
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default Overlay;