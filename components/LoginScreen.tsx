
import React from 'react';
import { motion } from 'framer-motion';
import { User } from '../types';
import { ShieldCheck, Sparkles } from 'lucide-react';
import { USERS } from '../constants';
import { ChevronRight } from 'lucide-react';

interface LoginScreenProps {
  onSelectUser: (user: User) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onSelectUser }) => {
  const time = new Date();
  
  return (
    <div className="h-full flex flex-col items-center justify-center relative z-10 px-6">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[460px] h-[460px] bg-fuchsia-500/20 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-1/3 w-[420px] h-[420px] bg-indigo-500/10 blur-[130px] rounded-full pointer-events-none" />

      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-center mb-10 space-y-3"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs uppercase tracking-[0.3em] text-white/60">
          <Sparkles className="w-3 h-3 text-pink-300" />
          LoveOS
        </div>
        <h1 className="text-5xl font-black bg-clip-text text-transparent bg-gradient-to-br from-white via-purple-200 to-fuchsia-300 tracking-tight">
          FiaOS
        </h1>
        <p className="text-white/50 text-sm font-light tracking-[0.3em] uppercase">
          Wähle dein Profil
        </p>
      </motion.div>

      {/* Grid of Users */}
      <div className="grid grid-cols-1 gap-5 w-full max-w-sm">
        {USERS.map((user, index) => (
          <motion.button
            key={user.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + i * 0.1, type: "spring", stiffness: 300, damping: 25 }}
            whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.15)" }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelectUser(user)}
            className="group relative flex items-center gap-4 p-4 bg-gradient-to-br from-white/10 via-white/5 to-transparent hover:from-white/20 hover:via-white/10 border border-white/10 rounded-[2rem] backdrop-blur-md transition-all duration-300 shadow-[0_12px_35px_rgba(0,0,0,0.35)]"
          >
            {/* Avatar */}
            <div className={`
              w-14 h-14 rounded-[1.25rem] flex items-center justify-center text-2xl shadow-inner border border-white/10
              ${user.role === 'guest' ? 'bg-zinc-800' : 'bg-gradient-to-br from-indigo-500 via-purple-500 to-fuchsia-500'}
            `}>
              {user.avatar || user.name.charAt(0)}
            </div>

            {/* Info */}
            <div className="flex-1 text-left">
              <h3 className="text-xl font-semibold text-white group-hover:text-white transition-colors">
                {user.name}
              </h3>
              <p className="text-xs text-white/40 uppercase tracking-wider font-medium">
                {user.role === 'admin' ? 'Administrator' : user.role === 'guest' ? 'Besucher' : 'Benutzer'}
              </p>
            </div>
            
            {/* Arrow Hint */}
            <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-1.5 h-1.5 border-t-2 border-r-2 border-white/40 rotate-45 mr-0.5" />
            </div>
          </motion.button>
        ))}
      </div>

      {/* Footer / Legal / Version */}
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 0.3 }} 
        transition={{ delay: 1 }}
        className="text-[10px] uppercase tracking-widest text-center"
      >
        FiaOS v0.3 • Secure Environment
      </motion.div>

    </div>
  );
};

export default LoginScreen;
