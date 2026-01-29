
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, Session, AppItem, ToastState, OverlayState, UserRewardsData, UserProfile, UserPrefs, AdminConfig, Reward } from './types';
import { NOISE_BG, REWARD_CATALOG, THEMES, VALENTINE_REWARDS, USERS } from './constants';
import { loadSession, saveSession, clearSession } from './utils/session';
import { cloud } from './utils/cloud'; 
import { playSound } from './utils/sound';
import { 
  INITIAL_REWARDS_DATA,
  unlockRewardLogic, setRewardsLastSeen, 
  loadUserProfile, loadUserPrefs, applyTheme, saveLastApp, loadLastApp,
  updateUserIndex
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
        openRewards: (tab: string) => void;
        playSound: (type: string) => void;
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
  
  const [newlyUnlockedReward, setNewlyUnlockedReward] = useState<Reward | null>(null);

  const [openedApp, setOpenedApp] = useState<{id: string, name: string} | null>(null);

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userPrefs, setUserPrefs] = useState<UserPrefs | null>(null);
  
  // Admin Config State - Source of Truth
  const [adminConfig, setAdminConfig] = useState<AdminConfig | null>(null);

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [customBg, setCustomBg] = useState<string | null>(null);
  const [bypassMaintenance, setBypassMaintenance] = useState(false);

  const handleLogout = useCallback(() => {
    clearSession();
    setSession(null);
    setOpenedApp(null);
    setUserProfile(null);
    setUserPrefs(null);
    setBypassMaintenance(false);
    playSound('close');
  }, []);

  // --- Effects ---

  // 1. Global Cloud Config Listener (Priority 1)
  useEffect(() => {
    const unsubscribe = cloud.listenToAdminConfig((conf) => {
        // console.log("Received Admin Config Update:", conf);
        setAdminConfig(conf);
        localStorage.setItem('fiaos_global_admin_config', JSON.stringify(conf));
    });
    return () => unsubscribe();
  }, []);

  // 2. Init Session
  useEffect(() => {
    const existing = loadSession();
    if (existing) {
        setSession(existing);
        cloud.restoreConnection();
    }
    setIsVerifying(false);
  }, []);

  // 3. User Data & SECURITY ENFORCEMENT
  useEffect(() => {
    if (!session) {
        setRewardsData(null);
        setUserProfile(null);
        setUserPrefs(null);
        return;
    }

    // --- REAL-TIME BAN CHECK ---
    // If admin config loads and user is marked banned, kick them out immediately.
    if (adminConfig && adminConfig.userStatus) {
        const myStatus = adminConfig.userStatus[session.userId];
        if (myStatus && myStatus.banned) {
            console.warn("User is banned. Forcing logout.");
            handleLogout();
            setOverlay({
                isOpen: true,
                title: "Account Gesperrt ⛔",
                content: "Dein Zugang wurde deaktiviert. Wende dich an den Administrator."
            });
            return;
        }
    }

    const initUserData = async () => {
        // Prefs
        let prefs = loadUserPrefs(session);
        if (session.role !== 'guest') {
            const cPrefs = await cloud.loadPrefs();
            if (cPrefs) prefs = cPrefs;
        }
        setUserPrefs(prefs);
        applyTheme(prefs);
        if (prefs.theme === 'custom') {
             const bg = localStorage.getItem('fiaos_wallpaper_custom');
             setCustomBg(bg);
        } else {
             setCustomBg(null);
        }

        // Profile
        let profile = loadUserProfile(session);
        if (session.role !== 'guest') {
            const cProf = await cloud.loadProfile();
            if (cProf) profile = cProf;
        }
        setUserProfile(profile);
        updateUserIndex(session, profile);

        // Rewards
        let rewards: UserRewardsData | null = null;
        if (session.role === 'guest') {
            const stored = localStorage.getItem('fiaos_rewards_guest');
            rewards = stored ? JSON.parse(stored) : JSON.parse(JSON.stringify(INITIAL_REWARDS_DATA));
        } else {
            rewards = await cloud.loadRewards();
            if (!rewards) {
                rewards = JSON.parse(JSON.stringify(INITIAL_REWARDS_DATA));
                await cloud.saveRewards(rewards!);
            }
        }
        setRewardsData(rewards);

        // Onboarding Check
        if (profile && !profile.onboardingCompleted) {
            setShowOnboarding(true);
        }
    };

    initUserData();

  }, [session, adminConfig]); // Re-run if session OR admin config changes

  // 3b. Maintenance-triggered global logout
  useEffect(() => {
    if (!session || !adminConfig) return;
    if (adminConfig.forceLogoutAt && session.lastLoginAt < adminConfig.forceLogoutAt) {
        handleLogout();
    }
    if (adminConfig.forceLogoutAtByUser?.[session.userId] && session.lastLoginAt < adminConfig.forceLogoutAtByUser[session.userId]) {
        handleLogout();
    }
  }, [adminConfig, session]);

  // 4. Global Bridge
  useEffect(() => {
    window.FIAOS = {
        bridgeUnlockReward: ({ rewardId }) => handleUnlockReward(rewardId),
        bridgeUnlockTheme: ({ themeId }) => handleUnlockTheme(themeId),
        bridgeUnlockApp: ({ appId }) => console.log('Unlock App:', appId), 
        bridgeLunaBoost: (data) => console.log('Luna Boost:', data),
        openRewards: (tab) => {
            setRewardsTab(tab);
            setOpenedApp(null); 
            setIsRewardsOpen(true);
        },
        playSound: (type) => playSound(type as any),
        cloud: cloud
    };

    window.FIAOS_APPLY_PREFS = (newPrefs) => {
        const updated = { ...newPrefs };
        setUserPrefs(updated);
        applyTheme(updated);
        
        if (updated.theme === 'custom') {
             setCustomBg(localStorage.getItem('fiaos_wallpaper_custom'));
        } else {
             setCustomBg(null);
        }
    };

    window.FIAOS_PROFILE_UPDATED = (p) => setUserProfile(p);
    
    window.FIAOS_EVENTS = {
        emit: (event, data) => {
             if (event === 'games.unlock') handleUnlockReward(data.id);
        }
    };

    return () => {
        delete window.FIAOS;
        delete window.FIAOS_APPLY_PREFS;
        delete window.FIAOS_PROFILE_UPDATED;
        delete window.FIAOS_ADMIN_CONFIG_UPDATED;
        delete window.FIAOS_EVENTS;
    };
  }, [rewardsData, session]); 

  // --- Handlers ---

  const handleUserSelect = (u: User) => {
    // Immediate Ban Check (Pre-Login)
    if (adminConfig?.userStatus?.[u.id]?.banned) {
        setOverlay({
            isOpen: true,
            title: "Zugriff Verweigert",
            content: "Dieser Benutzer ist gesperrt. ⛔"
        });
        playSound('error');
        return;
    }

    setSelectedUser(u);
    if (u.role === 'guest') {
        handleLoginAttempt(u, '');
    } else {
        setIsAuthSheetOpen(true);
    }
  };

  const handleLoginAttempt = async (userObj: User, pass: string): Promise<boolean> => {
    if (userObj.role !== 'guest' && userObj.password && pass !== userObj.password) {
        return false;
    }
    
    await cloud.silentLogin(userObj.id, pass);

    const newSession: Session = {
        userId: userObj.id,
        name: userObj.name,
        role: userObj.role,
        lastLoginAt: Date.now()
    };
    
    saveSession(newSession);
    setSession(newSession);
    setIsAuthSheetOpen(false);
    setSelectedUser(null);
    playSound('success');

    setTimeout(() => handleUnlockReward('reward.firstLogin'), 2000);
    return true;
  };

  const handleUnlockReward = async (rewardId: string) => {
    if (!rewardsData || !session) return;
    
    const { updatedData, wasUnlocked } = unlockRewardLogic(rewardsData, rewardId);
    
    if (wasUnlocked) {
        setRewardsData(updatedData);
        if (session.role === 'guest') {
            localStorage.setItem('fiaos_rewards_guest', JSON.stringify(updatedData));
        } else {
            await cloud.saveRewards(updatedData);
        }
        
        let meta = REWARD_CATALOG.find(r => r.id === rewardId);
        if (!meta) meta = VALENTINE_REWARDS.find(r => r.id === rewardId);
        if (!meta) meta = { id: rewardId, title: 'Erfolg freigeschaltet!', icon: '🏆', description: 'Du hast einen neuen Meilenstein erreicht.' };

        setNewlyUnlockedReward(meta);
        playSound('success');
    }
  };
  
  const handleUnlockTheme = async (themeId: string) => {
     if (!userPrefs || !session) return;
     const newPrefs = { ...userPrefs, theme: themeId };
     setUserPrefs(newPrefs);
     applyTheme(newPrefs);
     if (session.role === 'guest') {
         // save local
     } else {
         await cloud.savePrefs(newPrefs);
     }
  };

  const handleOnboardingComplete = async () => {
      setShowOnboarding(false);
      if (userProfile && session?.role !== 'guest') {
          const upd = { ...userProfile, onboardingCompleted: true };
          setUserProfile(upd);
          await cloud.saveProfile(upd);
      }
      handleUnlockReward('reward.welcome');
  };

  const handleAppClick = (app: AppItem) => {
      if (adminConfig && adminConfig.appVisibility) {
          if (adminConfig.appVisibility[app.id] === false && app.id !== 'settings') {
             if (session?.role !== 'admin' && session?.role !== 'developer') {
                 setToast({ id: Date.now(), message: 'App ist deaktiviert 🔒' });
                 return;
             }
          }
      }

      saveLastApp(session!, app.id);
      
      if (app.id === 'achievements') {
          setRewardsTab('general');
          setIsRewardsOpen(true);
      } 
      else if (app.id === 'rewards.firstAppOpen') {
          handleUnlockReward('reward.firstAppOpen');
      }
      else {
          setOpenedApp({ id: app.id, name: app.name });
      }
      
      playSound('open');
  };

  // --- Rendering ---

  if (isVerifying) return <div className="bg-black w-full h-full" />;

  // --- GATEKEEPER: MAINTENANCE MODE ---
  const isAdminUser = session?.role === 'admin' || session?.role === 'developer';
  const maintenanceActive = adminConfig?.maintenanceMode;
  
  if (maintenanceActive && !isAdminUser && !bypassMaintenance) {
      return <MaintenanceScreen onBypass={() => setBypassMaintenance(true)} />;
  }

  // Theme Calculation
  const activeThemeId = userPrefs?.theme || 'roseGlass';
  const activeThemeDef = THEMES[activeThemeId] || THEMES['roseGlass'];
  
  const bgStyle = customBg 
    ? { backgroundImage: `url(${customBg})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: activeThemeDef.colors.bgGradient };

  return (
    <div 
        className="fixed inset-0 overflow-hidden font-sans text-white select-none transition-colors duration-700"
        style={bgStyle}
    >
      {!customBg && (
         <div className="absolute inset-0 bg-[image:var(--bg-gradient)] transition-[background] duration-500 z-0" />
      )}
      
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" style={{ backgroundImage: `url("${NOISE_BG}")` }} />

      <div className="relative z-10 w-full h-full flex flex-col">
        {!session ? (
            <LoginScreen onSelectUser={handleUserSelect} />
        ) : (
            <>
                <HomeScreen 
                    session={session}
                    onLogout={handleLogout}
                    onAppClick={handleAppClick}
                    onShowToast={(msg) => setToast({ id: Date.now(), message: msg })}
                    onOpenOverlay={(t, c) => setOverlay({ isOpen: true, title: t, content: c })}
                    onOpenRewards={(tab) => {
                        setRewardsTab(tab || 'general');
                        setIsRewardsOpen(true);
                    }}
                    onOpenAccountSheet={() => setIsAccountSheetOpen(true)}
                />

                <AppWindow 
                    isOpen={!!openedApp}
                    appId={openedApp?.id || null}
                    appName={openedApp?.name || ''}
                    onClose={() => { setOpenedApp(null); playSound('close'); }}
                />

                <RewardsSheet 
                    isOpen={isRewardsOpen}
                    onClose={() => setIsRewardsOpen(false)}
                    rewardsData={rewardsData}
                    initialTab={rewardsTab}
                />

                <AccountSheet 
                    isOpen={isAccountSheetOpen}
                    onClose={() => setIsAccountSheetOpen(false)}
                    profile={userProfile}
                    onLogout={handleLogout}
                    onOpenSettings={(tab) => {
                        setOpenedApp({ id: 'settings', name: 'Einstellungen' });
                    }}
                />

                <MusicPlayer />
            </>
        )}
      </div>

      <AuthSheet 
        isOpen={isAuthSheetOpen}
        onClose={() => setIsAuthSheetOpen(false)}
        user={selectedUser}
        onLogin={(pw) => handleLoginAttempt(selectedUser!, pw)}
      />

      <Toast 
        message={toast.message}
        onClear={() => setToast({ ...toast, message: '' })}
      />

      <Overlay 
        state={overlay}
        onClose={() => setOverlay({ ...overlay, isOpen: false })}
      />
      
      <RewardUnlockOverlay 
        reward={newlyUnlockedReward}
        onClose={() => setNewlyUnlockedReward(null)}
      />

      {showOnboarding && (
          <Onboarding onComplete={handleOnboardingComplete} />
      )}
    </div>
  );
};

export default App;
