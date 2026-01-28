
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, CloudOff, AlertTriangle } from 'lucide-react';

interface MaintenanceScreenProps {
  onBypass: () => void;
}

const MaintenanceScreen: React.FC<MaintenanceScreenProps> = ({ onBypass }) => {
  const [password, setPassword] = useState('');
  const [shake, setShake] = useState(false);

  const checkBypass = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'AmbradisPW826*') {
      onBypass();
    } else {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setPassword('');
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

        {/* Bypass Form */}
        <motion.form 
          onSubmit={checkBypass}
          animate={shake ? { x: [-5, 5, -5, 5, 0] } : {}}
          className="w-full flex flex-col gap-3"
        >
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input 
              type="password" 
              placeholder="Admin Bypass"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-white/20 focus:outline-none focus:border-pink-500/50 transition-colors"
            />
          </div>
          {password.length > 0 && (
            <button type="submit" className="text-xs text-white/40 hover:text-white transition-colors">
              Entsperren →
            </button>
          )}
        </motion.form>

        <div className="absolute bottom-8 text-[10px] text-white/20 font-mono tracking-widest uppercase">
          FiaOS v0.2 • Maintenance Active
        </div>
      </motion.div>
    </div>
  );
};

export default MaintenanceScreen;
