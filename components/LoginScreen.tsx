import React from 'react';
import { motion } from 'framer-motion';
import { User } from '../types';
import { ShieldCheck } from 'lucide-react';
import { USERS } from '../constants';

interface LoginScreenProps {
  onSelectUser: (user: User) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onSelectUser }) => {
  return (
    <div className="h-full flex flex-col items-center justify-center relative z-10 px-6">
      
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-center mb-16 space-y-2"
      >
        <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-indigo-200 to-white tracking-tight">
          FiaOS
        </h1>
        <p className="text-white/40 text-lg font-light tracking-wide uppercase text-xs">
          Bitte Profil wählen
        </p>
      </motion.div>

      {/* Grid of Users */}
      <div className="grid grid-cols-1 gap-6 w-full max-w-sm">
        {USERS.map((user, index) => (
          <motion.button
            key={user.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 + index * 0.1 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => onSelectUser(user)}
            className="group relative flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-3xl backdrop-blur-md transition-all duration-300"
          >
            {/* Avatar */}
            <div className={`
              w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-inner
              ${user.role === 'guest' ? 'bg-zinc-700' : 'bg-gradient-to-br from-indigo-500 to-purple-600'}
            `}>
              {user.avatar || user.name.charAt(0)}
            </div>

            {/* Info */}
            <div className="flex-1 text-left">
              <h3 className="text-xl font-medium text-white group-hover:text-white transition-colors">
                {user.name}
              </h3>
              <p className="text-xs text-white/40 uppercase tracking-wider font-medium">
                {user.role === 'admin' ? 'Administrator' : user.role === 'guest' ? 'Besucher' : 'Benutzer'}
              </p>
            </div>

            {/* Admin Badge */}
            {user.role === 'admin' && (
              <div className="absolute top-4 right-4">
                <ShieldCheck className="w-4 h-4 text-indigo-400/80" />
              </div>
            )}
            
            {/* Arrow Hint */}
            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-1.5 h-1.5 border-t-2 border-r-2 border-white/40 rotate-45 mr-0.5" />
            </div>
          </motion.button>
        ))}
      </div>

      {/* Footer / Version */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="absolute bottom-8 text-white/10 text-xs tracking-widest"
      >
        v0.2
      </motion.div>
    </div>
  );
};

export default LoginScreen;