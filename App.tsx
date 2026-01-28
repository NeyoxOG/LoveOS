
import React, { useState, useEffect, useCallback } from 'react';
import { User, Session, AppItem, ToastState, OverlayState, UserRewardsData, UserProfile, UserPrefs, AdminConfig } from './types';
import { NOISE_BG, REWARD_CATALOG } from './constants';
import { loadSession, saveSession, clearSession } from './utils/session';
import { cloud } from './utils/cloud'; 
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

// Debug Interface Extension
declare global {
  interface Window {
    FIAOS_DEBUG?: {
      unlock: (rewardId: string) => void;
      unlockAll: () => void;
    };
    FIAOS_EVENTS?: {
      emit: (event: string, data?: any) => void;
    };
    FIAOS?: {
        bridgeUnlockReward: (data: { projectId?: string, rewardId: string, scope?: string }) => void;
        bridgeUnlockTheme: (data: { themeId: string }) => void;
        bridgeUnlockApp: (data: { appId: string }) => void;
        bridgeLunaBoost: (data: any) => void;
        cloud: typeof cloud; 
    };
    FIAOS_APPLY_PREFS?: (prefs: UserPrefs) => void;
    FIAOS_PROFILE_UPDATED?: (profile: UserProfile) => void;
    FIAOS_ADMIN_CONFIG_UPDATED?: (config: AdminConfig) => void;
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

  const [openedApp, setOpenedApp] = useState<{id: string, name: string} | null>(null);

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userPrefs, setUserPrefs] = useState<UserPrefs | null>(null);
  const [adminConfig, setAdminConfig] = useState<AdminConfig | null>(null);

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [customBg, setCustomBg] = useState<string | null>(null);

  const showToast = useCallback((message: string) => {
    setToast({ id: Date.now(), message });
  }, []);

  // --- AUTOMATIC ERROR DETECTION ---
  useEffect(() => {
    const handleError = (event: ErrorEvent | PromiseRejectionEvent) => {
      let msg = 'Unbekannter Fehler';
      if (event instanceof ErrorEvent) msg = event.message;
      else if (event instanceof PromiseRejectionEvent) msg = String(event.reason);

      console.group('%c[FiaOS Auto-Detect] Critical Error', 'color: red; font-weight: bold; background: #ffe4e6; padding: 4px;');
      console.error(msg);
      console.log('Session:', session);
      console.groupEnd();

      if (!msg.includes('ResizeObserver') && !msg.includes('Script error')) {
          showToast(`System Fehler: Check Console ⚠️`);
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleError);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleError);
    };
  }, [session, showToast]);

  // --- INITIALIZATION & BAN CHECK ---
  useEffect(() => {
    const initApp = async () => {
        // 1. Setup Bridge
        window.FIAOS = {
            ...(window.FIAOS || {}),
            cloud: cloud,
            bridgeUnlockReward: ({ rewardId }) => handleUnlockReward(rewardId),
            bridgeUnlockTheme: ({ themeId }) => showToast(`Neues Theme verfügbar: ${themeId} 🎨`),
            bridgeUnlockApp: ({ appId }) => showToast(`Neue App freigeschaltet: ${appId} 📲`),
            bridgeLunaBoost: (data) => showToast("Luna fühlt sich besser! 🐑💖")
        } as any;

        // 2. Load Local Config (Fast)
        let config = loadAdminConfig();
        setAdminConfig(config);

        const storedSession = loadSession();
        
        if (!storedSession) {
            setIsVerifying(false);
            return;
        }

        // 3. Local Ban Check (Instant)
        if (config.userStatus[storedSession.userId]?.banned) {
            console.warn("User banned locally.");
            clearSession();
            setSession(null);
            showToast("Account ist lokal gesperrt. ⛔");
            setIsVerifying(false);
            return;
        }

        // 4. Cloud Verification
        try {
            await cloud.restoreConnection();
            
            if (storedSession.role !== 'guest') {
                const remoteConfig = await cloud.loadAdminConfig();
                if (remoteConfig) {
                    setAdminConfig(remoteConfig);
                    // Remote Ban Check
                    if (remoteConfig.userStatus[storedSession.userId]?.banned) {
                        console.warn("User banned remotely.");
                        clearSession();
                        setSession(null);
                        showToast("Account wurde gesperrt. ⛔");
                        setIsVerifying(false);
                        return;
                    }
                }

                // Load User Data Parallel
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
                // Guest Data Load
                const initial = JSON.parse(JSON.stringify(INITIAL_REWARDS_DATA));
                setRewardsData(initial);
                
                const p = loadUserProfile(storedSession);
                setUserProfile(p);
                if (!p.onboardingCompleted) setShowOnboarding(true);
                
                const prefs = loadUserPrefs(storedSession);
                setUserPrefs(prefs);
                applyTheme(prefs);
                checkCustomWallpaper(prefs);
            }

            setSession(storedSession);

        } catch (e) {
            console.error("Init Error", e);
            // Fallback: If cloud fails, trust local session if not locally banned.
            setSession(storedSession);
        } finally {
            setIsVerifying(false);
        }
    };

    initApp();
  }, [showToast]);

  const checkCustomWallpaper = (prefs: UserPrefs) => {
      if (prefs.theme === 'custom') {
          const bg = localStorage.getItem('fiaos_wallpaper_custom');
          setCustomBg(bg);
      } else {
          setCustomBg(null);
      }
  };

  // --- PERIODIC BAN CHECK ---
  useEffect(() => {
    if (!session || session.role === 'guest') return;

    const checkStatus = async () => {
        const remoteConfig = await cloud.loadAdminConfig();
        if (remoteConfig && remoteConfig.userStatus[session.userId]?.banned) {
            handleLogout();
            showToast("Zugriff entzogen: Account gesperrt. 🔒");
        }
    };

    const interval = setInterval(checkStatus, 15000); // Check every 15s
    return () => clearInterval(interval);
  }, [session, showToast]);

  const handleUnlockReward = useCallback(async (rewardId: string) => {
    if (!rewardsData || !session) return;

    const { updatedData, wasUnlocked } = unlockRewardLogic(rewardsData, rewardId);

    if (wasUnlocked) {
      setRewardsData(updatedData);
      await cloud.saveRewards(updatedData);
      
      const rewardInfo = REWARD_CATALOG.find(r => r.id === rewardId);
      const rewardTitle = rewardInfo ? rewardInfo.title : "Unbekannter Erfolg";
      showToast(`Erfolg freigeschaltet: ${rewardTitle} ✨`);
    }
  }, [showToast, rewardsData, session]);

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
        if (session) {
            const userStatus = config.userStatus[session.userId];
            if (userStatus && userStatus.banned) {
                showToast("Session wurde vom Admin beendet 🔒");
                handleLogout();
            }
        }
    };
  }, [session, handleUnlockReward, showToast, rewardsData]);

  const handleSelectUser = (user: User) => {
    // Immediate Local Check
    if (adminConfig && adminConfig.userStatus[user.id]?.banned) {
        showToast("Dieser Account ist gesperrt ⛔");
        return;
    }
    if (user.role === 'guest') loginSuccess(user);
    else {
      setSelectedUser(user);
      setIsAuthSheetOpen(true);
    }
  };

  const attemptLogin = async (password: string): Promise<boolean> => {
    if (!selectedUser) return false;
    
    // 1. Local Pre-Check
    if (adminConfig && adminConfig.userStatus[selectedUser.id]?.banned) {
        showToast("Account ist lokal gesperrt.");
        return false;
    }

    if (password === selectedUser.password) {
      if (selectedUser.role !== 'guest') {
          const cloudAuthSuccess = await cloud.silentLogin(selectedUser.id, password);
          if (!cloudAuthSuccess) {
              showToast("Verbinde im Offline-Modus... ☁️⚠️");
          } else {
              // 2. Critical Cloud Check
              const remoteConfig = await cloud.loadAdminConfig();
              if (remoteConfig) {
                  setAdminConfig(remoteConfig);
                  if (remoteConfig.userStatus[selectedUser.id]?.banned) {
                      showToast("Zugriff verweigert: Account gesperrt. ⛔");
                      return false;
                  }
              }
          }
      }
      loginSuccess(selectedUser);
      return true;
    }
    return false;
  };

  const loginSuccess = async (user: User) => {
    // Final Safe Check (Local/Cached)
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
    
    // Load Data Post-Login
    if (user.role !== 'guest') {
        cloud.loadRewards().then(d => { if(d) setRewardsData(d); else { const i = JSON.parse(JSON.stringify(INITIAL_REWARDS_DATA)); setRewardsData(i); cloud.saveRewards(i); }});
        cloud.loadPrefs().then(p => { if(p) { setUserPrefs(p); applyTheme(p); checkCustomWallpaper(p); } });
    } else {
        // Guest loads
        const initial = JSON.parse(JSON.stringify(INITIAL_REWARDS_DATA));
        setRewardsData(initial);
        const prefs = loadUserPrefs(newSession);
        setUserPrefs(prefs);
        applyTheme(prefs);
        checkCustomWallpaper(prefs);
    }

    // Check Profile / Onboarding
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
      setShowOnboarding(false);
      if (userProfile) {
          const updated = { ...userProfile, onboardingCompleted: true };
          setUserProfile(updated);
          cloud.saveProfile(updated); // Works for Guest now too
          showToast("Viel Spaß mit FiaOS! 🚀");
          handleUnlockReward('custom_theme_unlock'); // Ensure functionality unlocked
      }
  };

  const handleLogout = () => {
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
    document.body.className = '';
  };

  const closeAuthSheet = () => { setIsAuthSheetOpen(false); setTimeout(() => setSelectedUser(null), 300); };

  const handleAppClick = (app: AppItem) => {
    if (!session) { showToast("Bitte einloggen."); return; }
    
    // Strict Admin check: explicit false blocks access. Undefined (new apps) are allowed.
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
    else if (['luna', 'vault', 'settings', 'admin', 'games', 'diary', 'daily', 'love', 'rewards_app', 'messages'].includes(app.id)) { 
        setOpenedApp({ id: app.id, name: app.name }); 
    } 
    else { showToast("Bald verfügbar ✨"); }
  };

  const handleOpenRewards = (tab = 'general') => { if (!session) return; setRewardsTab(tab); setIsRewardsOpen(true); };
  const handleCloseRewards = () => { setIsRewardsOpen(false); if (session && rewardsData) { const updated = setRewardsLastSeen(session.userId, rewardsData); setRewardsData(updated); cloud.saveRewards(updated); } };

  // --- LOADING SCREEN ---
  if (isVerifying) {
      return (
          <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-[200]">
              <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
              <div className="text-white/50 text-sm font-medium tracking-widest animate-pulse">FIAOS</div>
          </div>
      );
  }

  // Calculate Background Style
  const bgStyle = customBg 
    ? { backgroundImage: `url(${customBg})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: 'var(--bg-primary, linear-gradient(to bottom right, #0f1016, #08080a))' };

  return (
    <div className="relative h-full w-full bg-slate-950 overflow-hidden font-sans text-slate-50 selection:bg-indigo-500/30">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0f1016] via-[#161622] to-[#08080a] z-0 transition-colors duration-500" style={bgStyle} />
      {!customBg && <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none opacity-40 mix-blend-screen animate-pulse duration-[10000ms]" style={{ backgroundColor: 'var(--accent)' }} />}
      {!customBg && <div className="absolute inset-0 z-0 pointer-events-none opacity-40 mix-blend-overlay" style={{ backgroundImage: `url("${NOISE_BG}")` }} />}

      <main className="relative h-full z-10 flex flex-col overflow-hidden">
        {session ? (
          <>
            {showOnboarding && <Onboarding onComplete={handleOnboardingComplete} />}
            
            <HomeScreen 
                session={session} 
                onLogout={handleLogout}
                onAppClick={handleAppClick}
                onShowToast={showToast}
                onOpenOverlay={(t, c) => setOverlay({isOpen:true, title:t, content:c})}
                onOpenRewards={handleOpenRewards}
                onOpenAccountSheet={() => setIsAccountSheetOpen(true)}
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
        onClose={() => setOpenedApp(null)}
      />

      <AuthSheet isOpen={isAuthSheetOpen} onClose={closeAuthSheet} user={selectedUser} onLogin={attemptLogin} />
      <AccountSheet isOpen={isAccountSheetOpen} onClose={() => setIsAccountSheetOpen(false)} profile={userProfile} onLogout={handleLogout} onOpenSettings={() => setOpenedApp({ id: 'settings', name: 'Einstellungen' })} />
      <RewardsSheet isOpen={isRewardsOpen} onClose={handleCloseRewards} rewardsData={rewardsData} initialTab={rewardsTab} />
      <Overlay state={overlay} onClose={() => setOverlay(prev => ({ ...prev, isOpen: false }))} />
      <Toast message={toast.message} onClear={() => setToast({ id: 0, message: '' })} />
    </div>
  );
};

export default App;
