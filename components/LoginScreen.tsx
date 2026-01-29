
import React from 'react';
import { motion } from 'framer-motion';
import { User } from '../types';
import { USERS } from '../constants';
import { ChevronRight } from 'lucide-react';

interface LoginScreenProps {
  onSelectUser: (user: User) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onSelectUser }) => {
  const time = new Date();
  
  return (
    <div className="h-full w-full flex flex-col items-center justify-between py-16 px-6 relative z-10">
      
      {/* Clock Area */}
      <motion.div 
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center mt-8"
      >
        <div className="text-white/60 font-medium uppercase tracking-widest text-sm mb-2">
            {time.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
        <div className="text-8xl font-light text-white tracking-tighter leading-none filter drop-shadow-lg">
            {time.getHours()}:{time.getMinutes().toString().padStart(2, '0')}
        </div>
      </motion.div>

      {/* User Selection */}
      <div className="w-full max-w-sm flex flex-col gap-4">
        {USERS.map((user, i) => (
          <motion.button
            key={user.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + i * 0.1, type: "spring", stiffness: 300, damping: 25 }}
            whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.15)" }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelectUser(user)}
            className="group relative flex items-center p-4 rounded-[24px] bg-white/10 border border-white/10 backdrop-blur-md transition-all shadow-lg overflow-hidden"
          >
            {/* Hover Glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-inner border-2 border-white/10 mr-4 shrink-0
                ${user.role === 'guest' ? 'bg-zinc-700' : 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500'}`}>
                {user.avatar || user.name.charAt(0)}
            </div>
            
            <div className="flex-1 text-left min-w-0">
                <div className="text-lg font-semibold text-white truncate">{user.name}</div>
                <div className="text-xs text-white/50 font-medium uppercase tracking-wide">
                    {user.role === 'admin' ? 'Administrator' : user.role === 'guest' ? 'Lokal' : 'Benutzer'}
                </div>
            </div>

            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/40 group-hover:bg-white/20 group-hover:text-white transition-all">
                <ChevronRight size={16} />
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
    