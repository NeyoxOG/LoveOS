
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User } from '../types';
import { Lock, ArrowRight, X } from 'lucide-react';
import { cloud } from '../utils/cloud'; // Import cloud

interface AuthSheetProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onLogin: (password: string) => Promise<boolean>;
}

const AuthSheet: React.FC<AuthSheetProps> = ({ user, isOpen, onClose, onLogin }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError(false);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!password) return;

    setIsSubmitting(true);
    setError(false);

    try {
        let success = false;
        
        if (user?.role === 'guest') {
            // Guest uses existing simple logic
            success = await onLogin(password);
        } else if (user) {
            // Real Users use Cloud Auth
            // Assumed email format for internal users: user.id + @fiaos.app
            const email = `${user.id}@fiaos.app`; 
            success = await cloud.login(email, password);
            if (success) {
                // If cloud login worked, we trigger the app's login handler to set session state
                await onLogin(password); 
            }
        }

        setIsSubmitting(false);
        if (!success) {
            setError(true);
            setTimeout(() => setError(false), 500);
        }
    } catch (err) {
        setIsSubmitting(false);
        setError(true);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && user && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm z-40"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="absolute bottom-0 left-0 right-0 z-50 bg-[#1c1c1e]/90 backdrop-blur-xl border-t border-white/10 rounded-t-[2.5rem] p-8 pb-12 shadow-2xl"
          >
            <div className="flex flex-col items-center">
              {/* Handle bar */}
              <div className="w-12 h-1.5 bg-white/20 rounded-full mb-8" />

              {/* User Avatar & Name */}
              <div className="flex flex-col items-center mb-8">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-3xl shadow-lg mb-4 ring-4 ring-white/10">
                   {user.avatar || user.name.charAt(0)}
                </div>
                <h2 className="text-2xl font-semibold text-white tracking-wide">
                  Hallo, {user.name}
                </h2>
              </div>

              {/* Password Input */}
              <motion.form 
                onSubmit={handleSubmit}
                animate={error ? { x: [-10, 10, -10, 10, 0] } : {}}
                transition={{ type: "spring", stiffness: 500, damping: 15 }}
                className="w-full max-w-sm space-y-4"
              >
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 w-5 h-5 group-focus-within:text-indigo-400 transition-colors" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Passwort"
                    className={`w-full bg-black/20 border ${error ? 'border-red-500/50' : 'border-white/10'} rounded-2xl py-4 pl-12 pr-4 text-white placeholder-white/30 focus:outline-none focus:border-indigo-500/50 focus:bg-black/40 transition-all text-lg`}
                    autoFocus
                  />
                </div>

                {error && (
                  <motion.p 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-400 text-sm text-center font-medium"
                  >
                    Falsches Passwort
                  </motion.p>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-medium hover:bg-white/10 active:scale-95 transition-all"
                  >
                    Zurück
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-4 rounded-2xl bg-indigo-600 text-white font-medium hover:bg-indigo-500 active:scale-95 transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <>
                            Anmelden <ArrowRight className="w-4 h-4" />
                        </>
                    )}
                  </button>
                </div>
              </motion.form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AuthSheet;
