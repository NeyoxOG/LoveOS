import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserProfile, UserPrefs } from '../types';
import { Settings, LogOut, Palette, X, Shield, User } from 'lucide-react';

interface AccountSheetProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile | null;
  onLogout: () => void;
  onOpenSettings: (subTab?: string) => void;
}

const AccountSheet: React.FC<AccountSheetProps> = ({ isOpen, onClose, profile, onLogout, onOpenSettings }) => {
  if (!profile) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm z-[80]"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%", scale: 0.95 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: "100%", scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="absolute top-16 left-4 right-4 bottom-auto z-[90] bg-[#1c1c1e]/90 backdrop-blur-xl border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden max-w-sm mx-auto"
          >
            <div className="p-6 relative">
                {/* Close Button */}
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 bg-white/5 rounded-full hover:bg-white/10"
                >
                    <X className="w-4 h-4 text-white/60" />
                </button>

                {/* Profile Header */}
                <div className="flex flex-col items-center mb-8 mt-2">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-4xl shadow-xl ring-4 ring-white/10 mb-4">
                        {profile.avatar.type === 'emoji' ? profile.avatar.value : '👤'}
                    </div>
                    <h2 className="text-2xl font-bold text-white">{profile.displayName}</h2>
                    <div className="flex items-center gap-1 mt-1">
                        {profile.role === 'admin' ? (
                            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                                <Shield className="w-3 h-3" /> Administrator
                            </span>
                        ) : (
                            <span className="text-xs font-bold text-white/40 uppercase tracking-wider flex items-center gap-1">
                                <User className="w-3 h-3" /> {profile.role}
                            </span>
                        )}
                    </div>
                </div>

                {/* Action List */}
                <div className="space-y-3">
                    <button 
                        onClick={() => { onClose(); onOpenSettings('account'); }}
                        className="w-full bg-white/5 hover:bg-white/10 active:scale-98 transition-all p-4 rounded-xl flex items-center gap-4 text-left border border-white/5"
                    >
                        <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                            <Settings className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                            <div className="text-sm font-semibold text-white">Account Einstellungen</div>
                            <div className="text-xs text-white/40">Name, Avatar & Daten</div>
                        </div>
                    </button>

                    <button 
                        onClick={() => { onClose(); onOpenSettings('theme'); }}
                        className="w-full bg-white/5 hover:bg-white/10 active:scale-98 transition-all p-4 rounded-xl flex items-center gap-4 text-left border border-white/5"
                    >
                        <div className="p-2 bg-pink-500/20 rounded-lg text-pink-400">
                            <Palette className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                            <div className="text-sm font-semibold text-white">Design anpassen</div>
                            <div className="text-xs text-white/40">Theme, Wallpaper & Accent</div>
                        </div>
                    </button>

                    <div className="h-px bg-white/10 my-2" />

                    <button 
                        onClick={() => { onClose(); onLogout(); }}
                        className="w-full bg-red-500/10 hover:bg-red-500/20 active:scale-98 transition-all p-4 rounded-xl flex items-center gap-4 text-left border border-red-500/20"
                    >
                        <div className="p-2 bg-red-500/20 rounded-lg text-red-400">
                            <LogOut className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                            <div className="text-sm font-semibold text-red-400">Abmelden</div>
                        </div>
                    </button>
                </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AccountSheet;