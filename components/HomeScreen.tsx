
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
    const isAdmin = session.role === 'admin' || session.role === 'developer';

    const filtered = APPS.map(app => {
        if (app.id === 'daily') {
            return { ...app, badge: dailyState.openedToday ? undefined : '1' };
        }
        return app;
    }).filter(app => {
        if (app.id === 'admin') return isAdmin;
        if (app.id !== 'settings' && config.appVisibility[app.id] === false) return false;
        return true;
    });
    setVisibleApps(filtered);
  }, [session.role, session.userId]);

  const handleDockClick = (tab: 'home' | 'apps' | 'achievements' | 'profile') => {
    setActiveTab(tab);
    if (tab === 'home') containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    else if (tab === 'apps') appsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    else if (tab === 'achievements') { onOpenRewards(); setTimeout(() => setActiveTab('home'), 800); }
    else if (tab === 'profile') { onOpenAccountSheet(); setTimeout(() => setActiveTab('home'), 500); }
  };

  const handleWidgetClick = () => {
    const prefs = loadUserPrefs(session);
    let appIdToOpen = 'luna'; 
    if (prefs.quickstartMode === 'fixed' && prefs.quickstartApp) appIdToOpen = prefs.quickstartApp;
    else { const last = loadLastApp(session); if (last) appIdToOpen = last; }

    const appToOpen = visibleApps.find(a => a.id === appIdToOpen) || visibleApps.find(a => a.id === 'luna');
    if (appToOpen) {
        onShowToast(`Starte ${appToOpen.name}... 🚀`);
        setTimeout(() => onAppClick(appToOpen), 300);
    }
  };

  return (
    <div 
      ref={containerRef}
      className="h-full w-full relative z-10 flex flex-col overflow-y-auto overflow-x-hidden no-scrollbar scroll-smooth pb-[calc(7rem+env(safe-area-inset-bottom))]"
    >
      
      {/* --- Header --- */}
      <header className="px-6 pt-14 pb-4 flex items-start justify-between flex-shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-white/90 tracking-tight drop-shadow-md">
            {new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
          </h1>
          {(session.role === 'admin' || session.role === 'developer') && (
             <div className="inline-flex items-center px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-[10px] text-indigo-300 font-bold uppercase tracking-wider backdrop-blur-md">
               {session.role}
             </div>
          )}
        </div>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onOpenAccountSheet}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 backdrop-blur-md flex items-center justify-center overflow-hidden"
        >
           {/* Simple avatar placeholder */}
           <div className="text-sm font-bold">{session.name.charAt(0)}</div>
        </motion.button>
      </header>

      {/* --- Clock Widget --- */}
      <div className="px-6 pb-8">
        <ClockWidget />
      </div>

      {/* --- Quickstart Widget --- */}
      <div className="px-6 pb-8 flex-shrink-0">
        <motion.button
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleWidgetClick}
          className="w-full relative overflow-hidden bg-white/10 backdrop-blur-xl border border-white/20 rounded-[2rem] p-5 text-left group shadow-2xl"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-pink-500/20 to-indigo-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                 <Play className="w-3 h-3 text-pink-300 fill-pink-300" />
                 <h3 className="text-xs font-bold text-pink-200 uppercase tracking-wider">Weiter</h3>
              </div>
              <p className="text-lg font-bold text-white">Schnellstart</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/10 group-hover:bg-white/20 transition-colors">
               <ChevronDown className="w-5 h-5 text-white -rotate-90 ml-0.5" />
            </div>
          </div>
        </motion.button>
      </div>

      {/* --- App Grid --- */}
      <div className="flex-1 px-6 py-2" ref={appsRef}>
        <div className="grid grid-cols-4 gap-y-8 gap-x-4">
          {visibleApps.map((app, i) => {
            const isValentine = app.id === 'valentine';
            const isLocked = !isValentine && app.status === 'lockedHint';
            
            return (
              <div key={app.id} className="flex flex-col items-center gap-2">
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileTap={{ scale: 0.85 }}
                  onClick={() => onAppClick(app)}
                  className={`
                    relative w-[68px] h-[68px] squircle flex items-center justify-center text-3xl shadow-lg
                    ${isValentine 
                      ? 'bg-gradient-to-br from-red-900 to-black border border-red-500/30' 
                      : isLocked
                        ? 'bg-gray-800/50 grayscale border border-white/5'
                        : 'bg-white/10 backdrop-blur-2xl border border-white/20 hover:bg-white/20'}
                  `}
                >
                  {/* Badge */}
                  {app.badge && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm z-20 border border-black/20">
                          {app.badge}
                      </div>
                  )}

                  {/* Icon */}
                  <span className={`relative z-10 drop-shadow-sm filter ${isValentine ? 'scale-90 opacity-80' : ''}`}>
                    {app.icon}
                  </span>
                </motion.button>
                
                <span className="text-[11px] font-medium text-white/90 tracking-tight text-center drop-shadow-md truncate w-full">
                  {app.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* --- Floating Dock --- */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-auto">
        <div className="bg-white/10 backdrop-blur-3xl border border-white/20 rounded-[2.5rem] h-[72px] px-6 flex items-center gap-6 shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
           <DockItem icon={<Home className="w-6 h-6" />} isActive={activeTab === 'home'} onClick={() => handleDockClick('home')} />
           <div className="w-px h-8 bg-white/10" />
           <DockItem icon={<GridIcon className="w-6 h-6" />} isActive={activeTab === 'apps'} onClick={() => handleDockClick('apps')} />
           <DockItem icon={<Trophy className="w-6 h-6" />} isActive={activeTab === 'achievements'} onClick={() => handleDockClick('achievements')} />
           <DockItem icon={<UserIcon className="w-6 h-6" />} isActive={activeTab === 'profile'} onClick={() => handleDockClick('profile')} />
        </div>
      </div>
    </div>
  );
};

const DockItem: React.FC<{ 
  icon: React.ReactNode, 
  isActive: boolean, 
  onClick: () => void 
}> = ({ icon, isActive, onClick }) => {
  return (
    <motion.button
      whileTap={{ scale: 0.8, y: -5 }}
      onClick={onClick}
      className={`relative w-10 h-10 flex items-center justify-center rounded-2xl transition-all duration-300 ${isActive ? 'bg-white text-black shadow-lg' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
    >
      {icon}
    </motion.button>
  );
};

export default HomeScreen;
