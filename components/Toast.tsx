import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ToastProps {
  message: string | null;
  onClear: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, onClear }) => {
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        onClear();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [message, onClear]);

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          className="fixed bottom-28 left-0 right-0 z-[100] flex justify-center pointer-events-none"
        >
          <div className="bg-white/10 backdrop-blur-xl border border-white/10 shadow-2xl text-white px-6 py-3 rounded-full flex items-center gap-2">
            <span className="text-sm font-medium tracking-wide">{message}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Toast;