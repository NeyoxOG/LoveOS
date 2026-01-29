
import React from 'react';
import { motion } from 'framer-motion';
import { User } from '../types';
import { ShieldCheck, ChevronRight, User as UserIcon } from 'lucide-react';
import { USERS } from '../constants';

interface LoginScreenProps {
  onSelectUser: (user: User) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onSelectUser }) => {
  const time = new Date();
  
  return (
    <div className="h-full flex flex-col items-center relative z-10 px-6 pt-20 pb-10">
      
      {/* Lock Screen Clock */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="flex flex-col items-center mb-16 space-y-1"
      >
        <div className="text-xl font-medium text-white/80 tracking-wide uppercase">
            {time.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
        <div className="text-8xl font-thin tracking-tighter text-white drop-shadow-xl">
            {time.getHours()}:{time.getMinutes().toString().padStart(2, '0')}
        </div>
      </motion.div>

      {/* User List - Styled like Notifications */}
      <div className="w-full max-w-sm flex-1 flex flex-col justify-end gap-3 pb-12">
        <motion.p 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 0.5 }} 
            transition={{ delay: 0.5 }}
            className="text-xs uppercase tracking-widest text-center mb-2"
        >
            Benutzer wählen
        </motion.p>

        {USERS.map((user, index) => (
          <motion.button
            key={user.id}
            initial={{ opacity: 0, x: -20, filter: 'blur(10px)' }}
            animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
            transition={{ delay: 0.2 + index * 0.1, type: "spring", stiffness: 200, damping: 20 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelectUser(user)}
            className="relative group w-full p-4 bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/10 rounded-[1.5rem] flex items-center gap-4 transition-all shadow-lg"
          >
            {/* Avatar */}
            <div className={`
              w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-inner ring-2 ring-white/10
              ${user.role === 'guest' ? 'bg-zinc-700' : 'bg-gradient-to-br from-indigo-500 to-purple-600'}
            `}>
              {user.avatar ? user.avatar : (user.role === 'admin' ? '🛡️' : <UserIcon className="w-6 h-6 text-white/80" />)}
            </div>

            {/* Info */}
            <div className="flex-1 text-left">
              <h3 className="text-lg font-semibold text-white tracking-tight">
                {user.name}
              </h3>
              <p className="text-xs text-white/50 font-medium">
                {user.role === 'admin' ? 'System Administrator' : user.role === 'guest' ? 'Lokaler Gast' : 'Benutzer'}
              </p>
            </div>

            {/* Chevron */}
            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/20 transition-colors">
               <ChevronRight className="w-4 h-4 text-white/60" />
            </div>
          </motion.button>
        ))}
      </div>

      {/* Footer Hint */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
        className="absolute bottom-4 left-0 right-0 flex justify-center"
      >
        <div className="w-1/3 h-1 bg-white/20 rounded-full" />
      </motion.div>
    </div>
  );
};

export default LoginScreen;
