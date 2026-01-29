
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CloudOff, Lock } from 'lucide-react';
import { loadSession } from '../utils/session'; // Helper to check session

interface MaintenanceScreenProps {
  onBypass: () => void;
}

const MaintenanceScreen: React.FC<MaintenanceScreenProps> = ({ onBypass }) => {
  const [error, setError] = useState(false);

  const checkBypass = () => {
    // Check if current session has admin privileges
    const session = loadSession();
    if (session && (session.role === 'admin' || session.role === 'developer')) {
        onBypass();
    } else {
        setError(true);
        setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black text-white z-[9999] flex flex-col items-center justify-center overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 z-0 opacity-40">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 10, repeat: Infinity }}
          className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] bg-gradient-to-br from-indigo-900 via-purple-900 to-black blur-[100px]"
        />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-150"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 flex flex-col items-center p-8 text-center max-w-md w-full"
      >
        <motion.div 
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="mb-8"
        >
          <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center backdrop-blur-md border border-white/10 shadow-[0_0_40px_rgba(236,72,153,0.3)]">
             <CloudOff className="w-10 h-10 text-pink-400" />
          </div>
        </motion.div>

        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-200 to-indigo-200 mb-4 tracking-tight">
          System Schläft
        </h1>
        
        <p className="text-white/60 mb-8 leading-relaxed">
          FiaOS befindet sich im Wartungsmodus. <br/>
          Wir verbessern das System für dich. <br/>
          Bitte komm später wieder. 💤
        </p>

        <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-8" />

        {/* Action */}
        <button 
            onClick={checkBypass}
            className="flex items-center gap-2 text-xs text-white/40 hover:text-white transition-colors"
        >
            <Lock className="w-3 h-3" />
            {error ? "Kein Admin-Zugriff" : "Admin Zugang prüfen"}
        </button>

        <div className="absolute bottom-8 text-[10px] text-white/20 font-mono tracking-widest uppercase">
          FiaOS v0.2 • Maintenance Active
        </div>
      </motion.div>
    </div>
  );
};

export default MaintenanceScreen;
