import React, { useState, useEffect, useCallback } from 'react';
import { User, Session, AppItem, ToastState, OverlayState, UserRewardsData, UserProfile, UserPrefs, AdminConfig } from './types';
import { NOISE_BG, REWARD_CATALOG } from './constants';
import { loadSession, saveSession, clearSession } from './utils/session';
import { 
  loadUserRewards, saveUserRewards, unlockRewardLogic, setRewardsLastSeen, 
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

  // Initialize App (load session)
  useEffect(() => {
    // Load Global Config first
    const config = loadAdminConfig();
    setAdminConfig(config);

    const storedSession = loadSession();
    if (storedSession) {
      
      // Check for forced logout
      const freshCheck = localStorage.getItem(`fiaos_user_${storedSession.userId}_session_flag`);
      if (freshCheck === 'forceLogout') {
          handleLogout();
          return;
      }

      // Check Maintenance Mode
      if (config.maintenanceMode && storedSession.role !== 'admin' && storedSession.role !== 'developer') {
         // Force logout if in maintenance mode and not admin
         // Or just show maintenance screen logic handled in render
      }

      // Apply Role Overrides
      if (config.roleOverrides[storedSession.userId]) {
         storedSession.role = config.roleOverrides[storedSession.userId];
      }

      setSession(storedSession);
      const rewards = loadUserRewards(storedSession.userId);
      setRewardsData(rewards);
      
      const profile = loadUserProfile(storedSession);
      const prefs = loadUserPrefs(storedSession);
      setUserProfile(profile);
      setUserPrefs(prefs);
      applyTheme(prefs);

      // Update Index
      updateUserIndex(storedSession, profile);
    }
  }, []);

  const showToast = useCallback((message: string) => {
    setToast({ id: Date.now(), message });
  }, []);

  // --- Rewards Logic ---

  const handleUnlockReward = useCallback((rewardId: string) => {
    const currentSession = loadSession();
    const currentRewards = currentSession ? loadUserRewards(currentSession.userId) : null;
    
    if (!currentSession || !currentRewards) return;

    const { updatedData, wasUnlocked } = unlockRewardLogic(currentRewards, rewardId);

    if (wasUnlocked) {
      setRewardsData(updatedData);
      saveUserRewards(currentSession.userId, updatedData);
      
      const rewardInfo = REWARD_CATALOG.find(r => r.id === rewardId);
      const rewardTitle = rewardInfo ? rewardInfo.title : "Unbekannter Erfolg";
      showToast(`Erfolg freigeschaltet: ${rewardTitle} ✨`);
    }
  }, [showToast]);

  // Event Bus & Bridge
  useEffect(() => {
    // Legacy event bus
    window.FIAOS_EVENTS = {
      emit: (event: string, data?: any) => {
        console.log(`OS Event: ${event}`, data);
        if (event === 'luna.streak.3') handleUnlockReward('reward.streak3');
        if (event === 'luna.milestone.3') showToast("Meilenstein: 3 Tage Streak! 🔥");
        if (event === 'luna.milestone.7') showToast("Wow! 7 Tage Luna gepflegt! 🐑✨");
        if (event === 'luna.milestone.14') showToast("14 Tage! Ihr seid die Besten! 💖");
        
        if (event === 'vault.created') showToast("Nachricht im Tresor verschlossen 💌");
        
        if (event === 'games.unlock' || event === 'diary.unlock') {
            if (data?.id) handleUnlockReward(data.id);
        }
      }
    };

    // Central Bridge for Apps
    window.FIAOS = {
        bridgeUnlockReward: ({ rewardId }) => {
            console.log("Bridge: Unlock Reward", rewardId);
            handleUnlockReward(rewardId);
        },
        bridgeUnlockTheme: ({ themeId }) => {
            console.log("Bridge: Unlock Theme", themeId);
            showToast(`Neues Theme verfügbar: ${themeId} 🎨`);
            // Store unlock logic in user prefs/profile later
        },
        bridgeUnlockApp: ({ appId }) => {
            console.log("Bridge: Unlock App", appId);
            // This would update admin config or user permissions
            showToast(`Neue App freigeschaltet: ${appId} 📲`);
        },
        bridgeLunaBoost: (data) => {
            console.log("Bridge: Luna Boost", data);
            showToast("Luna fühlt sich besser! 🐑💖");
            // Would ideally communicate with Luna iframe or update storage directly
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
        }
    };

    window.FIAOS_ADMIN_CONFIG_UPDATED = (config: AdminConfig) => {
        console.log("Admin Config Updated Global", config);
        setAdminConfig(config);
        showToast("Systemkonfiguration aktualisiert 🔄");
        // Force re-check permissions if needed
        if (session) {
            if (config.roleOverrides[session.userId] && config.roleOverrides[session.userId] !== session.role) {
                // Role changed, reload session logic roughly
                const updatedSession = { ...session, role: config.roleOverrides[session.userId] };
                setSession(updatedSession);
            }
        }
    };

  }, [session, handleUnlockReward, showToast]);

  // Expose Debug API
  useEffect(() => {
    window.FIAOS_DEBUG = {
      unlock: (rewardId: string) => {
        const currentSession = loadSession();
        if (!currentSession) {
          console.warn("FIAOS_DEBUG: No user logged in.");
          return;
        }
        handleUnlockReward(rewardId);
      },
      unlockAll: () => {
         if (!loadSession()) return;
         REWARD_CATALOG.forEach(r => handleUnlockReward(r.id));
      },
      unlockValentine: () => {
        const currentSession = loadSession();
        if (!currentSession) return;
        const rewards = loadUserRewards(currentSession.userId);
        const updated = debugUnlockValentine(rewards);
        setRewardsData(updated);
        saveUserRewards(currentSession.userId, updated);
        showToast("Valentine: All Unlocked ❤️");
      },
      resetValentine: () => {
        const currentSession = loadSession();
        if (!currentSession) return;
        const rewards = loadUserRewards(currentSession.userId);
        const updated = debugResetValentine(rewards);
        setRewardsData(updated);
        saveUserRewards(currentSession.userId, updated);
        showToast("Valentine: Reset 🔄");
      }
    };
  }, [handleUnlockReward, showToast]);

  // --- Auth Handlers ---

  const handleSelectUser = (user: User) => {
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
      loginSuccess(selectedUser);
      return true;
    }
    return false;
  };

  const loginSuccess = (user: User) => {
    // Check maintenance
    const config = loadAdminConfig();
    if (config.maintenanceMode && user.role !== 'admin') {
         // Apply Override check before blocking
         const overrideRole = config.roleOverrides[user.id];
         if (overrideRole !== 'admin' && overrideRole !== 'developer') {
             showToast("Wartungsarbeiten aktiv. Login nicht möglich.");
             return;
         }
    }

    // Role might be overridden
    const finalRole = config.roleOverrides[user.id] || user.role;

    const newSession: Session = {
      userId: user.id,
      name: user.name,
      role: finalRole,
      lastLoginAt: Date.now()
    };
    setSession(newSession);
    saveSession(newSession);
    
    // Load User Data
    const rewards = loadUserRewards(user.id);
    setRewardsData(rewards);
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
    showToast("Erfolgreich abgemeldet 👋");
    clearSession();
    setSession(null);
    setRewardsData(null);
    setOpenedApp(null);
    setUserProfile(null);
    setUserPrefs(null);
    setIsAccountSheetOpen(false);
    
    // Reset Theme to default
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

    // Check visibility via Admin Config
    if (adminConfig && !adminConfig.appVisibility[app.id] && app.id !== 'settings') {
         if (session.role !== 'admin' && session.role !== 'developer') {
             showToast("Diese App ist aktuell deaktiviert 🔒");
             return;
         }
    }
    
    // Save last app
    saveLastApp(session, app.id);
    handleUnlockReward('reward.firstAppOpen');

    if (app.id === 'valentine') {
      setRewardsTab('valentine');
      setIsRewardsOpen(true);
    } else if (app.id === 'luna') {
      setOpenedApp({ id: 'luna', name: 'Luna' });
    } else if (app.id === 'vault') {
      setOpenedApp({ id: 'vault', name: 'Message Vault' });
    } else if (app.id === 'settings') {
      setOpenedApp({ id: 'settings', name: 'Einstellungen' });
    } else if (app.id === 'admin') {
      setOpenedApp({ id: 'admin', name: 'Admin Center' });
    } else if (app.id === 'games') {
      setOpenedApp({ id: 'games', name: 'Arcade' });
    } else if (app.id === 'diary') {
      setOpenedApp({ id: 'diary', name: 'Tagebuch' });
    } else if (app.id === 'daily') {
      setOpenedApp({ id: 'daily', name: 'Daily' });
    } else if (app.id === 'love') {
      setOpenedApp({ id: 'love', name: 'Love' });
    } else {
      showToast("Bald verfügbar ✨");
    }
  };

  const openOverlay = (title: string, content: string) => {
    setOverlay({ isOpen: true, title, content });
  };

  const handleOpenRewards = (tab = 'general') => {
    if (!session) {
      showToast("Bitte einloggen, um Erfolge zu sehen.");
      return;
    }
    setRewardsTab(tab);
    setIsRewardsOpen(true);
  };

  const handleCloseRewards = () => {
    setIsRewardsOpen(false);
    if (session && rewardsData) {
      const updated = setRewardsLastSeen(session.userId, rewardsData);
      setRewardsData(updated);
    }
  };

  const handleOpenSettingsFromSheet = (subTab = 'account') => {
    setOpenedApp({ id: 'settings', name: 'Einstellungen' });
  };

  // Maintenance Screen
  if (session && adminConfig?.maintenanceMode && session.role !== 'admin' && session.role !== 'developer') {
      return (
          <div className="h-full w-full bg-black text-white flex flex-col items-center justify-center p-6 text-center z-50">
              <div className="text-6xl mb-6 animate-pulse">💗</div>
              <h1 className="text-3xl font-bold mb-4">Wartungsarbeiten</h1>
              <p className="text-white/60 mb-8 max-w-xs">FiaOS wird gerade mit Liebe aktualisiert. Bitte komm später wieder.</p>
              <button onClick={handleLogout} className="px-6 py-3 bg-white/10 rounded-full font-medium hover:bg-white/20">Abmelden</button>
          </div>
      );
  }

  return (
    <div className="relative h-full w-full bg-slate-950 overflow-hidden font-sans text-slate-50 selection:bg-indigo-500/30">
      
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0f1016] via-[#161622] to-[#08080a] z-0 transition-colors duration-500" style={{ background: 'var(--bg-primary, linear-gradient(to bottom right, #0f1016, #08080a))' }} />
      <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none opacity-40 mix-blend-screen animate-pulse duration-[10000ms]" style={{ backgroundColor: 'var(--accent)' }} />
      
      <div 
        className="absolute inset-0 z-0 pointer-events-none opacity-40 mix-blend-overlay"
        style={{ backgroundImage: `url("${NOISE_BG}")` }}
      />

      {/* Main Content Area */}
      <main className="relative h-full z-10 flex flex-col overflow-y-auto no-scrollbar scroll-smooth">
        {session ? (
          <HomeScreen 
            session={session} 
            onLogout={handleLogout}
            onAppClick={handleAppClick}
            onShowToast={showToast}
            onOpenOverlay={openOverlay}
            onOpenRewards={handleOpenRewards}
            onOpenAccountSheet={() => setIsAccountSheetOpen(true)}
          />
        ) : (
          <LoginScreen onSelectUser={handleSelectUser} />
        )}
      </main>

      {/* App Window */}
      <AppWindow 
        isOpen={!!openedApp} 
        appId={openedApp?.id || null}
        appName={openedApp?.name || ''}
        onClose={() => setOpenedApp(null)}
      />

      {/* Overlays & Sheets */}
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
        onOpenSettings={handleOpenSettingsFromSheet}
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