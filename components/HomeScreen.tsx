
import React, { useState, useRef, useEffect } from 'react';
import { Session, AppItem } from '../types';
import { APPS } from '../constants';
import { motion } from 'framer-motion';
import { ChevronDown, Home, Grid as GridIcon, Trophy, User as UserIcon, Play } from 'lucide-react';
import { loadLastApp, loadAdminConfig, loadDailyState, loadUserPrefs } from '../utils/data';
import ClockWidget from './ClockWidget';

interface HomeScreenProps {
  session: Session;
  onLogout: () => void;
  onAppClick: (app: AppItem) => void;
  onShowToast: (msg: string) => void;
  onOpenOverlay: (title: string, content: string) => void;
  onOpenRewards: (tab?: string) => void;
  onOpenAccountSheet: () => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ 
  session, 
  onLogout, 
  onAppClick, 
  onShowToast, 
  onOpenOverlay,
  onOpenRewards,
  onOpenAccountSheet
}) => {
  const [activeTab, setActiveTab] = useState<'home' | 'apps' | 'achievements' | 'profile'>('home');
  const [visibleApps, setVisibleApps] = useState<AppItem[]>(APPS);
  const containerRef = useRef<HTMLDivElement>(null);
  const appsRef = useRef<HTMLDivElement>(null);

  // Load App Visibility & Badges
  useEffect(() => {
    const config = loadAdminConfig();
    const dailyState = loadDailyState(session.userId);
    
    // Admin check strict:
    const isAdmin = session.role === 'admin' || session.role === 'developer';

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
    <div 
      ref={containerRef}
      className="h-full w-full relative z-10 flex flex-col overflow-y-auto overflow-x-hidden no-scrollbar scroll-smooth pb-[calc(8rem+env(safe-area-inset-bottom))]"
    >
      
      {/* --- Top Bar (Compact) --- */}
      <header className="px-6 pt-12 pb-4 flex items-start justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg font-bold text-white/80 tracking-tight">FiaOS</h1>
          
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

      {/* --- Clock Widget --- */}
      <div className="px-6 pb-8">
        <ClockWidget />
      </div>

      {/* --- Quickstart Widget --- */}
      <div className="px-6 pb-8 flex-shrink-0">
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleWidgetClick}
          className="w-full relative overflow-hidden bg-gradient-to-br from-pink-500/20 to-purple-600/20 backdrop-blur-xl border border-pink-500/20 rounded-[2rem] p-5 text-left group shadow-lg shadow-pink-900/10"
        >
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                 <Play className="w-4 h-4 text-pink-400 fill-pink-400/50" />
                 <h3 className="text-sm font-bold text-pink-100 uppercase tracking-wider">Schnellstart</h3>
              </div>
              <p className="text-xl font-bold text-white mb-1">
                Weiter machen
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/10 group-hover:bg-white/20 transition-colors">
               <ChevronDown className="w-5 h-5 text-white -rotate-90 ml-0.5" />
            </div>
          </div>
        </motion.button>
      </div>

      {/* --- App Grid --- */}
      <div className="flex-1 px-6 py-2" ref={appsRef}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10">
          {visibleApps.map((app) => {
            const isValentine = app.id === 'valentine';
            
            return (
              <div key={app.id} className="flex flex-col items-center gap-3">
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={() => onAppClick(app)}
                  className={`
                    relative w-20 h-20 rounded-[1.6rem] flex items-center justify-center text-4xl shadow-lg border-t border-white/20 overflow-visible group
                    ${isValentine 
                      ? 'bg-gradient-to-b from-gray-800 to-gray-900 border-white/10' 
                      : app.status === 'lockedHint'
                        ? 'bg-gradient-to-b from-gray-800 to-black border-white/5 shadow-indigo-500/20'
                        : 'bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-md border-white/10 hover:bg-white/15'}
                  `}
                >
                  {/* Badge */}
                  {app.badge && (
                      <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-black z-20 shadow-sm animate-bounce">
                          {app.badge}
                      </div>
                  )}

                  {/* Icon */}
                  <span className={`relative z-10 drop-shadow-md transition-transform duration-300 group-hover:scale-110 ${isValentine ? 'scale-90 grayscale-[0.3]' : ''}`}>
                    {app.icon}
                  </span>

                  {!isValentine && app.status === 'lockedHint' && (
                    <div className="absolute inset-0 rounded-[1.6rem] ring-2 ring-indigo-500/20 animate-pulse" />
                  )}
                </motion.button>
                
                <span className="text-xs font-medium text-white/90 tracking-wide text-center drop-shadow-md">
                  {app.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* --- Dock --- */}
      <div 
        className="fixed left-6 right-6 z-40"
        style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
      >
        <div className="bg-black/40 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] h-20 px-6 flex items-center justify-between shadow-2xl relative overflow-hidden">
           {/* Glass reflection */}
           <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

           <DockItem 
             icon={<Home className="w-6 h-6" />} 
             label="Home" 
             isActive={activeTab === 'home'} 
             onClick={() => handleDockClick('home')} 
           />
           <DockItem 
             icon={<GridIcon className="w-6 h-6" />} 
             label="Apps" 
             isActive={activeTab === 'apps'} 
             onClick={() => handleDockClick('apps')} 
           />
           <DockItem 
             icon={<Trophy className="w-6 h-6" />} 
             label="Erfolge" 
             isActive={activeTab === 'achievements'} 
             onClick={() => handleDockClick('achievements')} 
           />
           <DockItem 
             icon={<UserIcon className="w-6 h-6" />} 
             label="Profil" 
             isActive={activeTab === 'profile'} 
             onClick={() => handleDockClick('profile')} 
           />
        </div>
      </div>
    </div>
  );
};

const DockItem: React.FC<{ 
  icon: React.ReactNode, 
  label: string, 
  isActive: boolean, 
  onClick: () => void 
}> = ({ icon, label, isActive, onClick }) => {
  return (
    <motion.button
      whileTap={{ scale: 0.8, y: 2 }}
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 w-14 transition-colors ${isActive ? 'text-white' : 'text-white/40 hover:text-white/60'}`}
    >
      <div className="relative">
        {icon}
        {isActive && (
          <motion.div 
            layoutId="dock-dot"
            className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full shadow-[0_0_8px_white]"
          />
        )}
      </div>
    </motion.button>
  );
};

export default HomeScreen;
