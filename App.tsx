
import React, { useState, useEffect, useCallback } from 'react';
import { User, Session, AppItem, ToastState, OverlayState, UserRewardsData, UserProfile, UserPrefs, AdminConfig, Reward } from './types';
import { NOISE_BG, REWARD_CATALOG, THEMES } from './constants';
import { loadSession, saveSession, clearSession } from './utils/session';
import { cloud } from './utils/cloud'; 
import { playSound } from './utils/sound';
import { 
  INITIAL_REWARDS_DATA,
  unlockRewardLogic, setRewardsLastSeen, 
  loadUserProfile, loadUserPrefs, applyTheme, saveLastApp, loadLastApp,
  loadAdminConfig, updateUserIndex
} from './utils/data';
import LoginScreen from './components/LoginScreen';
import HomeScreen from './components/HomeScreen';
import AuthSheet from './components/AuthSheet';
import AccountSheet from './components/AccountSheet';
import Toast from './components/Toast';
import Overlay from './components/Overlay';
import RewardsSheet from './components/RewardsSheet';
import AppWindow from './components/AppWindow';
import Onboarding from './components/Onboarding';
import MaintenanceScreen from './components/MaintenanceScreen';
import MusicPlayer from './components/MusicPlayer';
import RewardUnlockOverlay from './components/RewardUnlockOverlay';

declare global {
  interface Window {
    FIAOS?: {
        bridgeUnlockReward: (data: { projectId?: string, rewardId: string, scope?: string }) => void;
        bridgeUnlockTheme: (data: { themeId: string }) => void;
        bridgeUnlockApp: (data: { appId: string }) => void;
        bridgeLunaBoost: (data: any) => void;
        playSound: (type: string) => void; // New Bridge Method
        cloud: typeof cloud; 
    };
    FIAOS_APPLY_PREFS?: (prefs: UserPrefs) => void;
    FIAOS_PROFILE_UPDATED?: (profile: UserProfile) => void;
    FIAOS_ADMIN_CONFIG_UPDATED?: (config: AdminConfig) => void;
    FIAOS_EVENTS?: { emit: (event: string, data?: any) => void; };
  }
}

const App: React.FC = () => {
  const [isVerifying, setIsVerifying] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isAuthSheetOpen, setIsAuthSheetOpen] = useState(false);
  const [isAccountSheetOpen, setIsAccountSheetOpen] = useState(false);
  
  const [toast, setToast] = useState<ToastState>({ id: 0, message: '' });
  const [overlay, setOverlay] = useState<OverlayState>({ isOpen: false, title: '', content: '' });
  
  const [isRewardsOpen, setIsRewardsOpen] = useState(false);
  const [rewardsTab, setRewardsTab] = useState('general');
  const [rewardsData, setRewardsData] = useState<UserRewardsData | null>(null);
  
  // New State for Reward Overlay
  const [newlyUnlockedReward, setNewlyUnlockedReward] = useState<Reward | null>(null);

  const [openedApp, setOpenedApp] = useState<{id: string, name: string} | null>(null);

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userPrefs, setUserPrefs] = useState<UserPrefs | null>(null);
  const [adminConfig, setAdminConfig] = useState<AdminConfig | null>(null);

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [customBg, setCustomBg] = useState<string | null>(null);
  
  const [maintenanceBypass, setMaintenanceBypass] = useState(false);

  const showToast = useCallback((message: string) => {
    setToast({ id: Date.now(), message });
  }, []);

  const handleUnlockReward = useCallback(async (rewardId: string) => {
    if (!rewardsData || !session) return;

    const { updatedData, wasUnlocked } = unlockRewardLogic(rewardsData, rewardId);

    if (wasUnlocked) {
      setRewardsData(updatedData);
      await cloud.saveRewards(updatedData);
      
      const rewardInfo = REWARD_CATALOG.find(r => r.id === rewardId) || { id: rewardId, title: "Geheimer Erfolg", icon: "🏆", description: "Du hast etwas Neues entdeckt!" };
      
      // Trigger the fancy overlay instead of just toast
      setNewlyUnlockedReward(rewardInfo);
    }
  }, [showToast, rewardsData, session]);

  const checkCustomWallpaper = useCallback((prefs: UserPrefs) => {
      if (prefs.theme === 'custom') {
          const bg = localStorage.getItem('fiaos_wallpaper_custom');
          setCustomBg(bg);
      } else {
          setCustomBg(null);
      }
  }, []);

  const handleLogout = useCallback(() => {
    playSound('close');
    clearSession();
    setSession(null);
    setRewardsData(null);
    setOpenedApp(null);
    setUserProfile(null);
    setUserPrefs(null);
    setShowOnboarding(false);
    setIsAccountSheetOpen(false);
    setCustomBg(null);
    document.documentElement.style.cssText = ''; 
    document.documentElement.removeAttribute('data-theme');
  }, []);

  // --- INITIALIZATION ---
  useEffect(() => {
    const initApp = async () => {
        // 1. Setup Bridge
        window.FIAOS = {
            ...(window.FIAOS || {}),
            cloud: cloud,
            bridgeUnlockReward: ({ rewardId }) => handleUnlockReward(rewardId),
            bridgeUnlockTheme: ({ themeId }) => showToast(`Neues Theme verfügbar: ${themeId} 🎨`),
            bridgeUnlockApp: ({ appId }) => showToast(`Neue App freigeschaltet: ${appId} 📲`),
            bridgeLunaBoost: (data) => showToast("Luna fühlt sich besser! 🐑💖"),
            playSound: (type: any) => playSound(type)
        } as any;

        // 2. Load Local Config
        let config = loadAdminConfig();
        setAdminConfig(config);

        const storedSession = loadSession();
        
        // 3. Cloud Verification
        if (!storedSession) {
            try {
                const remoteConfig = await cloud.loadAdminConfig();
                if (remoteConfig) setAdminConfig(remoteConfig);
            } catch(e) {}
            setIsVerifying(false);
            return;
        }

        // 4. Banned / Maint Checks happens in periodic effect or render logic
        
        try {
            await cloud.restoreConnection();
            
            if (storedSession.role !== 'guest') {
                const remoteConfig = await cloud.loadAdminConfig();
                if (remoteConfig) setAdminConfig(remoteConfig);

                const [rewards, profile, prefs] = await Promise.all([
                    cloud.loadRewards(),
                    cloud.loadProfile(),
                    cloud.loadPrefs()
                ]);

                if (rewards) setRewardsData(rewards);
                else {
                    const initial = JSON.parse(JSON.stringify(INITIAL_REWARDS_DATA));
                    setRewardsData(initial);
                    cloud.saveRewards(initial);
                }

                if (profile) {
                    setUserProfile(profile as UserProfile);
                    if (!profile.onboardingCompleted) setShowOnboarding(true);
                } else {
                    const local = loadUserProfile(storedSession);
                    setUserProfile(local);
                    cloud.saveProfile(local);
                    setShowOnboarding(true);
                }

                if (prefs) {
                    setUserPrefs(prefs);
                    applyTheme(prefs);
                    checkCustomWallpaper(prefs);
                } else {
                    const local = loadUserPrefs(storedSession);
                    setUserPrefs(local);
                    applyTheme(local);
                    checkCustomWallpaper(local);
                    cloud.savePrefs(local);
                }
            } else {
                // Guest
                const initial = JSON.parse(JSON.stringify(INITIAL_REWARDS_DATA));
                setRewardsData(initial);
                const p = loadUserProfile(storedSession);
                setUserProfile(p);
                const prefs = loadUserPrefs(storedSession);
                setUserPrefs(prefs);
                applyTheme(prefs);
                checkCustomWallpaper(prefs);
            }

            setSession(storedSession);

        } catch (e) {
            console.error("Init Error", e);
            setSession(storedSession);
        } finally {
            setIsVerifying(false);
        }
    };

    initApp();
  }, [showToast, handleUnlockReward, checkCustomWallpaper]); 

  // --- PERIODIC CHECKS (Ban & Maintenance) ---
  useEffect(() => {
    const checkStatus = async () => {
        const remoteConfig = await cloud.loadAdminConfig();
        if (remoteConfig) {
            setAdminConfig(remoteConfig);
            
            if (session) {
                // Check Ban
                if (remoteConfig.userStatus[session.userId]?.banned) {
                    handleLogout();
                    showToast("Zugriff entzogen: Account gesperrt. 🔒");
                    return;
                }
            }
        }
    };

    const interval = setInterval(checkStatus, 3000); 
    return () => clearInterval(interval);
  }, [session, showToast, adminConfig, maintenanceBypass, handleLogout]);

  // --- FORCE LOGOUT ON MAINTENANCE ---
  useEffect(() => {
    if (adminConfig?.maintenanceMode && session && !maintenanceBypass) {
        const isPrivileged = session.role === 'admin' || session.role === 'developer';
        if (!isPrivileged) {
            handleLogout();
            showToast("Wartungsmodus aktiviert: Du wurdest ausgeloggt.");
        }
    }
  }, [adminConfig?.maintenanceMode, session, maintenanceBypass, handleLogout, showToast]);

  // Event Bus Setup
  useEffect(() => {
    window.FIAOS_EVENTS = {
      emit: (event: string, data?: any) => {
        if (event === 'luna.streak.3') handleUnlockReward('reward.streak3');
        if (event === 'luna.milestone.3') showToast("Meilenstein: 3 Tage Streak! 🔥");
        if (event === 'games.unlock' || event === 'diary.unlock') {
            if (data?.id) handleUnlockReward(data.id);
        }
      }
    };

    window.FIAOS_APPLY_PREFS = (prefs: UserPrefs) => {
        setUserPrefs(prefs);
        applyTheme(prefs);
        checkCustomWallpaper(prefs);
        if (session && session.role !== 'guest') {
            cloud.savePrefs(prefs);
        }
    };

    window.FIAOS_PROFILE_UPDATED = (profile: UserProfile) => {
        setUserProfile(profile);
        if (session) {
             const newSession = { ...session, name: profile.displayName };
             setSession(newSession);
             saveSession(newSession);
             updateUserIndex(newSession, profile);
             if (session.role !== 'guest') {
                 cloud.saveProfile(profile);
             }
        }
    };

    window.FIAOS_ADMIN_CONFIG_UPDATED = (config: AdminConfig) => {
        setAdminConfig(config);
    };
  }, [session, handleUnlockReward, showToast, rewardsData, checkCustomWallpaper]);

  const handleSelectUser = (user: User) => {
    if (adminConfig?.maintenanceMode && user.role !== 'admin' && user.role !== 'developer' && !maintenanceBypass) {
        playSound('error');
        // Do nothing visual, the maintenance screen will be rendered instead
        return;
    }
    
    playSound('click');
    if (user.role === 'guest') loginSuccess(user);
    else {
      setSelectedUser(user);
      setIsAuthSheetOpen(true);
    }
  };

  const attemptLogin = async (password: string): Promise<boolean> => {
    if (!selectedUser) return false;
    
    if (adminConfig?.maintenanceMode && selectedUser.role !== 'admin' && selectedUser.role !== 'developer' && !maintenanceBypass) {
        showToast("Wartungsmodus aktiv.");
        return false;
    }

    if (password === selectedUser.password) {
      if (selectedUser.role !== 'guest') {
          const cloudAuthSuccess = await cloud.silentLogin(selectedUser.id, password);
          if (!cloudAuthSuccess) {
              showToast("Verbinde im Offline-Modus... ☁️⚠️");
          }
      }
      playSound('success');
      loginSuccess(selectedUser);
      return true;
    }
    playSound('error');
    return false;
  };

  const loginSuccess = async (user: User) => {
    const config = adminConfig || loadAdminConfig();
    const userStatus = config.userStatus[user.id] || { role: user.role, banned: false };

    if (userStatus.banned) {
        showToast("Login verweigert: Account gesperrt.");
        closeAuthSheet();
        return;
    }

    const newSession: Session = {
      userId: user.id,
      name: user.name,
      role: userStatus.role,
      lastLoginAt: Date.now()
    };
    setSession(newSession);
    saveSession(newSession);
    
    // Load Data
    if (user.role !== 'guest') {
        cloud.loadRewards().then(d => { if(d) setRewardsData(d); else { const i = JSON.parse(JSON.stringify(INITIAL_REWARDS_DATA)); setRewardsData(i); cloud.saveRewards(i); }});
        cloud.loadPrefs().then(p => { if(p) { setUserPrefs(p); applyTheme(p); checkCustomWallpaper(p); } });
    } else {
        const initial = JSON.parse(JSON.stringify(INITIAL_REWARDS_DATA));
        setRewardsData(initial);
        const prefs = loadUserPrefs(newSession);
        setUserPrefs(prefs);
        applyTheme(prefs);
        checkCustomWallpaper(prefs);
    }

    let profile: UserProfile | null = null;
    if (user.role === 'guest') {
        profile = loadUserProfile(newSession);
    } else {
        profile = await cloud.loadProfile() as UserProfile;
        if (!profile) {
            profile = loadUserProfile(newSession);
            cloud.saveProfile(profile);
        }
    }
    
    setUserProfile(profile);
    if (!profile.onboardingCompleted) {
        setShowOnboarding(true);
    }
    
    updateUserIndex(newSession, profile);
    closeAuthSheet();

    setTimeout(() => {
      handleUnlockReward('reward.welcome');
      handleUnlockReward('reward.firstLogin');
    }, 500);
  };

  const handleOnboardingComplete = () => {
      playSound('success');
      setShowOnboarding(false);
      if (userProfile) {
          const updated = { ...userProfile, onboardingCompleted: true };
          setUserProfile(updated);
          cloud.saveProfile(updated); 
          showToast("Viel Spaß mit FiaOS! 🚀");
          handleUnlockReward('custom_theme_unlock'); 
      }
  };

  const closeAuthSheet = () => { setIsAuthSheetOpen(false); setTimeout(() => setSelectedUser(null), 300); };

  const handleAppClick = (app: AppItem) => {
    playSound('open');
    if (!session) { showToast("Bitte einloggen."); return; }
    
    if (adminConfig && adminConfig.appVisibility[app.id] === false && app.id !== 'settings') {
         if (session.role !== 'admin' && session.role !== 'developer') {
             showToast("Diese App ist vom Admin deaktiviert 🔒");
             return;
         }
    }
    
    saveLastApp(session, app.id);
    handleUnlockReward('reward.firstAppOpen');
    
    if (app.id === 'valentine') { setRewardsTab('valentine'); setIsRewardsOpen(true); }
    else if (app.id === 'achievements') { setIsRewardsOpen(true); } 
    else if (['luna', 'vault', 'settings', 'admin', 'games', 'diary', 'daily', 'love', 'rewards_app', 'messages', 'story', 'bucket'].includes(app.id)) { 
        setOpenedApp({ id: app.id, name: app.name }); 
    } 
    else { showToast("Bald verfügbar ✨"); }
  };

  const handleOpenRewards = (tab = 'general') => { if (!session) return; playSound('open'); setRewardsTab(tab); setIsRewardsOpen(true); };
  const handleCloseRewards = () => { playSound('close'); setIsRewardsOpen(false); if (session && rewardsData) { const updated = setRewardsLastSeen(session.userId, rewardsData); setRewardsData(updated); cloud.saveRewards(updated); } };

  // --- RENDER ---
  
  // 1. Maintenance Check
  const isMaintenance = adminConfig?.maintenanceMode;
  const isAdmin = session?.role === 'admin' || session?.role === 'developer';
  
  // Force maintenance screen if active and not admin (even if logged in)
  if (isMaintenance && !isAdmin && !maintenanceBypass) {
      return <MaintenanceScreen onBypass={() => setMaintenanceBypass(true)} />;
  }

  // 2. Loading
  if (isVerifying) {
      return (
          <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-[200]">
              <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
              <div className="text-white/50 text-sm font-medium tracking-widest animate-pulse">FIAOS</div>
          </div>
      );
  }

  // 3. Theme & Main App
  const activeThemeId = userPrefs?.theme || 'roseGlass';
  const activeThemeDef = THEMES[activeThemeId] || THEMES['roseGlass'];
  
  const bgStyle = customBg 
    ? { backgroundImage: `url(${customBg})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: activeThemeDef.colors.bgGradient };

  return (
    <div className="relative h-full w-full bg-slate-950 overflow-hidden font-sans text-slate-50 selection:bg-indigo-500/30">
      <div className="absolute inset-0 z-0 transition-colors duration-500" style={bgStyle} />
      {!customBg && <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none opacity-40 mix-blend-screen animate-pulse duration-[10000ms]" style={{ backgroundColor: 'var(--accent)' }} />}
      {!customBg && <div className="absolute inset-0 z-0 pointer-events-none opacity-40 mix-blend-overlay" style={{ backgroundImage: `url("${NOISE_BG}")` }} />}

      <main className="relative h-full z-10 flex flex-col overflow-hidden">
        {session ? (
          <>
            {showOnboarding && <Onboarding onComplete={handleOnboardingComplete} />}
            
            {/* Global Music Player Widget */}
            <MusicPlayer />

            <HomeScreen 
                session={session} 
                onLogout={handleLogout}
                onAppClick={handleAppClick}
                onShowToast={showToast}
                onOpenOverlay={(t, c) => setOverlay({isOpen:true, title:t, content:c})}
                onOpenRewards={handleOpenRewards}
                onOpenAccountSheet={() => { playSound('open'); setIsAccountSheetOpen(true); }}
            />
          </>
        ) : (
          <LoginScreen onSelectUser={handleSelectUser} />
        )}
      </main>

      <AppWindow 
        isOpen={!!openedApp} 
        appId={openedApp?.id || null}
        appName={openedApp?.name || ''}
        onClose={() => { playSound('close'); setOpenedApp(null); }}
      />

      <AuthSheet isOpen={isAuthSheetOpen} onClose={closeAuthSheet} user={selectedUser} onLogin={attemptLogin} />
      <AccountSheet isOpen={isAccountSheetOpen} onClose={() => { playSound('close'); setIsAccountSheetOpen(false); }} profile={userProfile} onLogout={handleLogout} onOpenSettings={(sub) => setOpenedApp({ id: 'settings', name: 'Einstellungen' })} />
      <RewardsSheet isOpen={isRewardsOpen} onClose={handleCloseRewards} rewardsData={rewardsData} initialTab={rewardsTab} />
      <RewardUnlockOverlay reward={newlyUnlockedReward} onClose={() => setNewlyUnlockedReward(null)} />
      <Overlay state={overlay} onClose={() => setOverlay(prev => ({ ...prev, isOpen: false }))} />
      <Toast message={toast.message} onClear={() => setToast({ id: 0, message: '' })} />
    </div>
  );
};

export default App;
