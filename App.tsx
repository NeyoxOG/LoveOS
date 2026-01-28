
import React, { useState, useEffect, useCallback } from 'react';
import { User, Session, AppItem, ToastState, OverlayState, UserRewardsData, UserProfile, UserPrefs, AdminConfig } from './types';
import { NOISE_BG, REWARD_CATALOG } from './constants';
import { loadSession, saveSession, clearSession } from './utils/session';
import { cloud } from './utils/cloud'; // Import Cloud Adapter
import { 
  INITIAL_REWARDS_DATA,
  saveUserRewards, unlockRewardLogic, setRewardsLastSeen, 
  debugUnlockValentine, debugResetValentine,
  loadUserProfile, loadUserPrefs, applyTheme, saveLastApp,
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

// Debug Interface Extension
declare global {
  interface Window {
    FIAOS_DEBUG?: {
      unlock: (rewardId: string) => void;
      unlockAll: () => void;
      unlockValentine: () => void;
      resetValentine: () => void;
    };
    FIAOS_EVENTS?: {
      emit: (event: string, data?: any) => void;
    };
    FIAOS?: {
        bridgeUnlockReward: (data: { projectId?: string, rewardId: string, scope?: string }) => void;
        bridgeUnlockTheme: (data: { themeId: string }) => void;
        bridgeUnlockApp: (data: { appId: string }) => void;
        bridgeLunaBoost: (data: any) => void;
        cloud: typeof cloud; // Expose Cloud API
    };
    FIAOS_APPLY_PREFS?: (prefs: UserPrefs) => void;
    FIAOS_PROFILE_UPDATED?: (profile: UserProfile) => void;
    FIAOS_ADMIN_CONFIG_UPDATED?: (config: AdminConfig) => void;
  }
}

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isAuthSheetOpen, setIsAuthSheetOpen] = useState(false);
  const [isAccountSheetOpen, setIsAccountSheetOpen] = useState(false);
  
  // Navigation & Feedback State
  const [toast, setToast] = useState<ToastState>({ id: 0, message: '' });
  const [overlay, setOverlay] = useState<OverlayState>({ isOpen: false, title: '', content: '' });
  
  // Rewards State
  const [isRewardsOpen, setIsRewardsOpen] = useState(false);
  const [rewardsTab, setRewardsTab] = useState('general');
  const [rewardsData, setRewardsData] = useState<UserRewardsData | null>(null);

  // App Window State
  const [openedApp, setOpenedApp] = useState<{id: string, name: string} | null>(null);

  // Profile & Prefs & Admin
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userPrefs, setUserPrefs] = useState<UserPrefs | null>(null);
  const [adminConfig, setAdminConfig] = useState<AdminConfig | null>(null);

  const showToast = useCallback((message: string) => {
    setToast({ id: Date.now(), message });
  }, []);

  // Initialize App (load session)
  useEffect(() => {
    // Expose Cloud API for iframes
    window.FIAOS = {
        ...(window.FIAOS || {}),
        cloud: cloud,
        bridgeUnlockReward: ({ rewardId }) => handleUnlockReward(rewardId),
        bridgeUnlockTheme: ({ themeId }) => showToast(`Neues Theme verfügbar: ${themeId} 🎨`),
        bridgeUnlockApp: ({ appId }) => showToast(`Neue App freigeschaltet: ${appId} 📲`),
        bridgeLunaBoost: (data) => showToast("Luna fühlt sich besser! 🐑💖")
    } as any;

    // Load Local Admin Config (Fast fallback)
    let config = loadAdminConfig();
    setAdminConfig(config);

    const storedSession = loadSession();
    if (storedSession) {
      
      // 1. Check for forced logout via localStorage flag
      const freshCheck = localStorage.getItem(`fiaos_user_${storedSession.userId}_session_flag`);
      if (freshCheck === 'forceLogout') {
          handleLogout();
          localStorage.removeItem(`fiaos_user_${storedSession.userId}_session_flag`); // Clear flag
          return;
      }
      
      // 2. Load Cloud Config (Async update)
      if (storedSession.role !== 'guest') {
          cloud.loadAdminConfig().then(remoteConfig => {
              if (remoteConfig) {
                  setAdminConfig(remoteConfig);
                  // Check Ban immediately after cloud load
                  const status = remoteConfig.userStatus[storedSession.userId];
                  if (status && status.banned) {
                      handleLogout();
                      showToast("Account via Cloud gesperrt. ⛔");
                  }
              }
          });
      }

      setSession(storedSession);
      
      // Load Rewards (Cloud Sync)
      cloud.loadRewards().then(data => {
          if (data) {
              setRewardsData(data);
          } else {
              // Init defaults
              const initial = JSON.parse(JSON.stringify(INITIAL_REWARDS_DATA));
              setRewardsData(initial);
              cloud.saveRewards(initial);
          }
      });
      
      // If cloud user, try syncing profile in background
      if (storedSession.role !== 'guest') {
          cloud.loadProfile().then(p => {
              if (p) setUserProfile(p as UserProfile);
              else {
                  const local = loadUserProfile(storedSession);
                  setUserProfile(local);
                  // Init cloud doc
                  cloud.saveProfile(local); 
              }
          });
      } else {
          const profile = loadUserProfile(storedSession);
          setUserProfile(profile);
      }

      const prefs = loadUserPrefs(storedSession);
      setUserPrefs(prefs);
      applyTheme(prefs);

      // Update Index
      if (userProfile) updateUserIndex(storedSession, userProfile);
    }
  }, [showToast]);

  // --- Rewards Logic ---

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

  // Event Bus
  useEffect(() => {
    window.FIAOS_EVENTS = {
      emit: (event: string, data?: any) => {
        console.log(`OS Event: ${event}`, data);
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
    };

    window.FIAOS_PROFILE_UPDATED = (profile: UserProfile) => {
        setUserProfile(profile);
        if (session) {
             const newSession = { ...session, name: profile.displayName };
             setSession(newSession);
             saveSession(newSession);
             updateUserIndex(newSession, profile);
             // Sync to cloud
             if (session.role !== 'guest') cloud.saveProfile(profile);
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

  // --- Auth Handlers ---

  const handleSelectUser = (user: User) => {
    // Check Ban *before* prompt (using currently loaded config)
    // Note: If config hasn't synced from cloud yet, this uses local default.
    // The "attemptLogin" will fail if cloud check reveals ban.
    if (adminConfig && adminConfig.userStatus[user.id]?.banned) {
        showToast("Dieser Account ist gesperrt ⛔");
        return;
    }

    if (user.role === 'guest') {
      loginSuccess(user);
    } else {
      setSelectedUser(user);
      setIsAuthSheetOpen(true);
    }
  };

  const attemptLogin = async (password: string): Promise<boolean> => {
    if (!selectedUser) return false;
    
    if (password === selectedUser.password) {
      // Local Auth Success, now try Cloud
      if (selectedUser.role !== 'guest') {
          const cloudAuthSuccess = await cloud.silentLogin(selectedUser.id, password);
          if (!cloudAuthSuccess) {
              // If failed, we fall back to offline mode BUT checking if it was an "Auth Failed" or "Network Error"
              // `silentLogin` handles auto-provisioning. If it returns false, it likely means offline or error.
              showToast("Verbinde im Offline-Modus... ☁️⚠️");
          } else {
              // Cloud Auth Success -> Check Cloud Ban
              const remoteConfig = await cloud.loadAdminConfig();
              if (remoteConfig && remoteConfig.userStatus[selectedUser.id]?.banned) {
                  showToast("Login verweigert: Account via Cloud gesperrt.");
                  return false;
              }
          }
      }

      loginSuccess(selectedUser);
      return true;
    }
    return false;
  };

  const loginSuccess = async (user: User) => {
    // Config re-check
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
    cloud.loadRewards().then(data => {
        if (data) {
            setRewardsData(data);
        } else {
            const initial = JSON.parse(JSON.stringify(INITIAL_REWARDS_DATA));
            setRewardsData(initial);
            cloud.saveRewards(initial);
        }
    });

    const profile = loadUserProfile(newSession);
    const prefs = loadUserPrefs(newSession);
    setUserProfile(profile);
    setUserPrefs(prefs);
    applyTheme(prefs);
    
    updateUserIndex(newSession, profile);
    closeAuthSheet();

    setTimeout(() => {
      handleUnlockReward('reward.welcome');
      handleUnlockReward('reward.firstLogin');
    }, 500);
  };

  const handleLogout = () => {
    clearSession();
    setSession(null);
    setRewardsData(null);
    setOpenedApp(null);
    setUserProfile(null);
    setUserPrefs(null);
    setIsAccountSheetOpen(false);
    
    document.documentElement.style.cssText = '';
    document.body.className = '';
  };

  const closeAuthSheet = () => {
    setIsAuthSheetOpen(false);
    setTimeout(() => setSelectedUser(null), 300);
  };

  // --- Navigation/UI Handlers ---

  const handleAppClick = (app: AppItem) => {
    if (!session) {
       showToast("Bitte einloggen.");
       return;
    }

    if (adminConfig && !adminConfig.appVisibility[app.id] && app.id !== 'settings') {
         if (session.role !== 'admin' && session.role !== 'developer') {
             showToast("Diese App ist vom Admin deaktiviert 🔒");
             return;
         }
    }
    
    saveLastApp(session, app.id);
    handleUnlockReward('reward.firstAppOpen');

    if (app.id === 'valentine') {
      setRewardsTab('valentine');
      setIsRewardsOpen(true);
    } else if (['luna', 'vault', 'settings', 'admin', 'games', 'diary', 'daily', 'love'].includes(app.id)) {
      setOpenedApp({ id: app.id, name: app.name });
    } else {
      showToast("Bald verfügbar ✨");
    }
  };

  const handleOpenRewards = (tab = 'general') => {
    if (!session) return;
    setRewardsTab(tab);
    setIsRewardsOpen(true);
  };

  const handleCloseRewards = () => {
    setIsRewardsOpen(false);
    if (session && rewardsData) {
      const updated = setRewardsLastSeen(session.userId, rewardsData);
      setRewardsData(updated);
      cloud.saveRewards(updated); // Save "seen" state to cloud
    }
  };

  return (
    <div className="relative h-full w-full bg-slate-950 overflow-hidden font-sans text-slate-50 selection:bg-indigo-500/30">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0f1016] via-[#161622] to-[#08080a] z-0 transition-colors duration-500" style={{ background: 'var(--bg-primary, linear-gradient(to bottom right, #0f1016, #08080a))' }} />
      <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none opacity-40 mix-blend-screen animate-pulse duration-[10000ms]" style={{ backgroundColor: 'var(--accent)' }} />
      <div className="absolute inset-0 z-0 pointer-events-none opacity-40 mix-blend-overlay" style={{ backgroundImage: `url("${NOISE_BG}")` }} />

      <main className="relative h-full z-10 flex flex-col overflow-y-auto no-scrollbar scroll-smooth">
        {session ? (
          <HomeScreen 
            session={session} 
            onLogout={handleLogout}
            onAppClick={handleAppClick}
            onShowToast={showToast}
            onOpenOverlay={(t, c) => setOverlay({isOpen:true, title:t, content:c})}
            onOpenRewards={handleOpenRewards}
            onOpenAccountSheet={() => setIsAccountSheetOpen(true)}
          />
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

      <AuthSheet 
        isOpen={isAuthSheetOpen} 
        onClose={closeAuthSheet} 
        user={selectedUser} 
        onLogin={attemptLogin}
      />

      <AccountSheet 
        isOpen={isAccountSheetOpen}
        onClose={() => setIsAccountSheetOpen(false)}
        profile={userProfile}
        onLogout={handleLogout}
        onOpenSettings={() => setOpenedApp({ id: 'settings', name: 'Einstellungen' })}
      />

      <RewardsSheet 
        isOpen={isRewardsOpen} 
        onClose={handleCloseRewards} 
        rewardsData={rewardsData}
        initialTab={rewardsTab}
      />

      <Overlay 
        state={overlay} 
        onClose={() => setOverlay(prev => ({ ...prev, isOpen: false }))} 
      />

      <Toast 
        message={toast.message} 
        onClear={() => setToast({ id: 0, message: '' })} 
      />
    </div>
  );
};

export default App;
