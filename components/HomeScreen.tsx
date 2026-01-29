
import React, { useState, useEffect } from 'react';
import { Session, AppItem } from '../types';
import { APPS } from '../constants';
import { motion } from 'framer-motion';
import { ChevronDown, Home, Grid as GridIcon, Trophy, User as UserIcon, Play, Sparkles, Palette, ArrowUpRight } from 'lucide-react';
import { loadLastApp, loadAdminConfig, loadDailyState, loadUserPrefs } from '../utils/data';
import ClockWidget from './ClockWidget';

interface HomeScreenProps {
  session: Session;
  onLogout: () => void;
  onAppClick: (app: AppItem) => void;
  onShowToast: (msg: string) => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ session, onLogout, onAppClick }) => {
  const [visibleApps, setVisibleApps] = useState<AppItem[]>(APPS);
  const [activeThemeName, setActiveThemeName] = useState('Rose Glass');
  const containerRef = useRef<HTMLDivElement>(null);
  const appsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Synchronous load first
    const config = loadAdminConfig();
    const dailyState = loadDailyState(session.userId);
    const prefs = loadUserPrefs(session);
    
    // Admin check strict:
    const isAdmin = session.role === 'admin' || session.role === 'developer';
    const themeName = prefs.theme ? prefs.theme.replace(/([A-Z])/g, ' $1').trim() : 'Rose Glass';

    const filtered = APPS.map(app => {
        // Daily Badge
        if (app.id === 'daily') {
            return { ...app, badge: dailyState.openedToday ? undefined : '1' };
        }
        return app;
    }).filter(app => {
        // 1. Hide Admin app if not admin
        if (app.id === 'admin') {
            return isAdmin;
        }
        // 2. Hide apps based on Admin Config (Settings is always visible)
        if (app.id !== 'settings' && config.appVisibility[app.id] === false) {
             return false;
        }
        return true;
    });
    setVisibleApps(filtered);
    setActiveThemeName(themeName);

  }, [session.role, session.userId]); // Re-run if role/user changes

  const handleDockClick = (tab: 'home' | 'apps' | 'achievements' | 'profile') => {
    setActiveTab(tab);
    
    if (tab === 'home') {
      containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (tab === 'apps') {
      appsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (tab === 'achievements') {
      onOpenRewards();
      setTimeout(() => setActiveTab('home'), 800);
    } else if (tab === 'profile') {
      onOpenAccountSheet();
      setTimeout(() => setActiveTab('home'), 500);
    }
  };

  const handleWidgetClick = () => {
    // Quickstart Logic Reworked
    const prefs = loadUserPrefs(session);
    let appIdToOpen = 'luna'; // Default fallback

    if (prefs.quickstartMode === 'fixed' && prefs.quickstartApp) {
        appIdToOpen = prefs.quickstartApp;
    } else {
        const last = loadLastApp(session);
        if (last) appIdToOpen = last;
    }

    // Verify visibility
    const appToOpen = visibleApps.find(a => a.id === appIdToOpen);
    
    if (appToOpen) {
        onShowToast(`Starte ${appToOpen.name}... 🚀`);
        setTimeout(() => onAppClick(appToOpen), 300);
    } else {
        // Fallback to Luna if preferred app is hidden
        const luna = visibleApps.find(a => a.id === 'luna');
        if (luna) {
             onShowToast(`Starte ${luna.name}... 🚀`);
             setTimeout(() => onAppClick(luna), 300);
        } else {
             onShowToast("Keine App verfügbar.");
        }
    }
  };

  return (
    <div className="h-full w-full flex flex-col pt-[calc(env(safe-area-inset-top)+20px)] pb-[calc(env(safe-area-inset-bottom)+20px)] px-6 relative z-10">
      
      {/* --- Top Bar (Compact) --- */}
      <header className="px-6 pt-12 pb-6 flex items-start justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight">FiaOS Hub</h1>
          <p className="text-xs text-white/50 tracking-[0.3em] uppercase">Gemeinsame Momente</p>
          
          {(session.role === 'admin' || session.role === 'developer') && (
             <div className="inline-flex items-center px-1.5 py-0.5 rounded bg-indigo-500/20 border border-indigo-500/30 text-[10px] text-indigo-300 font-bold uppercase tracking-wider">
               {session.role}
             </div>
          )}
        </div>

        {/* Account Chip */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onOpenAccountSheet}
          className="flex items-center gap-2 pl-1 pr-3 py-1 bg-white/10 hover:bg-white/15 border border-white/10 rounded-full backdrop-blur-md transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-sm font-bold shadow-inner">
            {session.name.charAt(0)}
          </div>
          <ChevronDown className="w-3 h-3 text-white/50" />
        </motion.button>
      </header>

      {/* --- Hub Intro --- */}
      <div className="px-6 pb-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[2.2rem] border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent p-6 shadow-[0_20px_45px_rgba(12,8,25,0.6)]"
        >
          <div className="absolute -top-16 -right-10 w-44 h-44 bg-fuchsia-500/20 blur-[90px]" />
          <div className="absolute -bottom-16 -left-10 w-44 h-44 bg-indigo-500/20 blur-[90px]" />
          <div className="relative z-10 space-y-3">
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/60">
              <Sparkles className="w-4 h-4 text-pink-300" />
              Hub Einführung
            </div>
            <h2 className="text-2xl font-semibold text-white">
              Willkommen zurück, {session.name}.
            </h2>
            <p className="text-sm text-white/60 leading-relaxed">
              Gestalte euer System mit Belohnungen, neuen Themes und schnellen Zugängen. Alles ist live synchronisiert.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => onOpenRewards('general')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-sm font-semibold text-white hover:bg-white/20 transition"
              >
                <Sparkles className="w-4 h-4" />
                Belohnungen öffnen
              </button>
              <button
                onClick={() => onAppClick({ id: 'settings', name: 'Einstellungen', icon: '⚙️', status: 'available' })}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/30 border border-white/10 text-sm font-semibold text-white/80 hover:text-white hover:bg-black/40 transition"
              >
                <Palette className="w-4 h-4" />
                Themes & Settings
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* --- Quickstart Widget --- */}
      <div className="px-6 pb-6 flex-shrink-0">
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleWidgetClick}
          className="w-full relative overflow-hidden bg-gradient-to-br from-pink-500/20 via-purple-600/20 to-indigo-600/20 backdrop-blur-xl border border-white/15 rounded-[2rem] p-5 text-left group shadow-lg shadow-pink-900/10"
        >
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                 <Play className="w-4 h-4 text-pink-300 fill-pink-300/50" />
                 <h3 className="text-xs font-bold text-pink-100 uppercase tracking-[0.3em]">Schnellstart</h3>
              </div>
              <p className="text-xl font-bold text-white mb-1">
                Weitermachen
              </p>
              <p className="text-xs text-white/50">Zuletzt genutzt • Theme: {activeThemeName}</p>
            </div>
            <div className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center border border-white/10 group-hover:bg-white/20 transition-colors">
               <ArrowUpRight className="w-5 h-5 text-white" />
            </div>
          </div>
        </motion.button>
      </div>

      {/* --- Utility Cards --- */}
      <div className="px-6 pb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => onOpenRewards('general')}
          className="text-left rounded-[1.6rem] border border-white/10 bg-white/5 p-5 shadow-[0_18px_40px_rgba(0,0,0,0.35)] hover:bg-white/10 transition"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/50">Belohnung</p>
              <h3 className="text-lg font-semibold text-white">Erfolge & Specials</h3>
              <p className="text-xs text-white/50 mt-1">Sammle neue Themes & Überraschungen.</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-pink-500/20 text-pink-200 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => onAppClick({ id: 'settings', name: 'Einstellungen', icon: '⚙️', status: 'available' })}
          className="text-left rounded-[1.6rem] border border-white/10 bg-white/5 p-5 shadow-[0_18px_40px_rgba(0,0,0,0.35)] hover:bg-white/10 transition"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/50">Theme</p>
              <h3 className="text-lg font-semibold text-white">Design anpassen</h3>
              <p className="text-xs text-white/50 mt-1">Wähle neue Looks & Hintergründe.</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-indigo-500/20 text-indigo-200 flex items-center justify-center">
              <Palette className="w-5 h-5" />
            </div>
          </div>
        </motion.button>
      </div>

      {/* --- Clock Widget --- */}
      <div className="px-6 pb-6">
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
    