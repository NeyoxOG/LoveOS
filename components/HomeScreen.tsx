
import React, { useState, useEffect } from 'react';
import { Session, AppItem } from '../types';
import { APPS } from '../constants';
import { motion } from 'framer-motion';
import { ChevronRight, LogOut, Grid } from 'lucide-react';
import { loadAdminConfig } from '../utils/data';
import ClockWidget from './ClockWidget';

interface HomeScreenProps {
  session: Session;
  onLogout: () => void;
  onAppClick: (app: AppItem) => void;
  onShowToast: (msg: string) => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ session, onLogout, onAppClick }) => {
  const [visibleApps, setVisibleApps] = useState<AppItem[]>(APPS);

  useEffect(() => {
    // Synchronous load first
    const config = loadAdminConfig();
    const isAdmin = session.role === 'admin' || session.role === 'developer';
    
    const filtered = APPS.filter(app => {
        if (app.id === 'admin') return isAdmin;
        if (app.id !== 'settings' && config.appVisibility[app.id] === false) return false;
        return true;
    });
    setVisibleApps(filtered);
  }, [session]);

  return (
    <div className="h-full w-full flex flex-col pt-[calc(env(safe-area-inset-top)+20px)] pb-[calc(env(safe-area-inset-bottom)+20px)] px-6 relative z-10">
      
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex flex-col">
            <h1 className="text-xl font-bold text-white/90 drop-shadow-md">
                {new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h1>
            <span className="text-xs font-medium text-white/50">Willkommen, {session.name}</span>
        </div>
        <button onClick={onLogout} className="p-2 bg-white/10 rounded-full hover:bg-white/20 backdrop-blur-md transition-colors">
            <LogOut size={18} className="text-white/80" />
        </button>
      </div>

      {/* Widgets */}
      <div className="mb-10">
        <ClockWidget />
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
        <div className="grid grid-cols-4 gap-y-8 gap-x-4">
            {visibleApps.map((app, i) => (
                <div key={app.id} className="flex flex-col items-center gap-2 group">
                    <motion.button
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: i * 0.03, type: "spring", stiffness: 300, damping: 20 }}
                        whileTap={{ scale: 0.85 }}
                        onClick={() => onAppClick(app)}
                        className={`
                            relative w-[64px] h-[64px] squircle flex items-center justify-center text-3xl shadow-lg transition-transform
                            ${app.id === 'valentine' 
                                ? 'bg-gradient-to-br from-red-600 to-pink-700 shadow-pink-500/20' 
                                : 'bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20'}
                        `}
                    >
                        <span className="filter drop-shadow-sm">{app.icon}</span>
                    </motion.button>
                    <span className="text-[11px] font-medium text-white/90 text-center tracking-tight truncate w-full drop-shadow-md">
                        {app.name}
                    </span>
                </div>
            ))}
        </div>
      </div>

      {/* Dock (Fixed Bottom) */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-auto">
        <div className="bg-white/10 backdrop-blur-2xl border border-white/10 rounded-[2rem] px-6 h-[70px] flex items-center gap-6 shadow-2xl">
            {/* Dock Items - Simplified for robustness */}
            <DockIcon icon={<Grid size={24} />} onClick={() => {}} active />
        </div>
      </div>
    </div>
  );
};

const DockIcon = ({ icon, onClick, active }: any) => (
    <motion.button 
        whileTap={{ scale: 0.8 }} 
        className={`p-3 rounded-2xl transition-colors ${active ? 'bg-white/20 text-white' : 'text-white/60'}`}
        onClick={onClick}
    >
        {icon}
    </motion.button>
);

export default HomeScreen;
    