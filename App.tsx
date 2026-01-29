
import React, { useState, useEffect } from 'react';
import { User, Session, AppItem, ToastState, OverlayState, UserRewardsData, UserProfile, UserPrefs, AdminConfig } from './types';
import { NOISE_BG, THEMES, USERS, INITIAL_ADMIN_CONFIG } from './constants';
import { loadSession, saveSession, clearSession } from './utils/session';
import { cloud } from './utils/cloud';
import { playSound } from './utils/sound';
import { 
  INITIAL_REWARDS_DATA, unlockRewardLogic, loadUserPrefs, applyTheme, saveLastApp
} from './utils/data';

import LoginScreen from './components/LoginScreen';
import HomeScreen from './components/HomeScreen';
import AuthSheet from './components/AuthSheet';
import Toast from './components/Toast';
import AppWindow from './components/AppWindow';

declare global {
  interface Window {
    FIAOS?: any;
    FIAOS_APPLY_PREFS?: any;
    FIAOS_EVENTS?: any;
  }
}

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [toast, setToast] = useState<ToastState>({ id: 0, message: '' });
  const [openedApp, setOpenedApp] = useState<{id: string, name: string} | null>(null);
  
  // Minimal Data State for Root
  const [userPrefs, setUserPrefs] = useState<UserPrefs | null>(null);
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

  // 1. Initial Load
  useEffect(() => {
    const existing = loadSession();
    if (existing) {
        setSession(existing);
        // Load prefs immediately to prevent flash
        const prefs = loadUserPrefs(existing);
        setUserPrefs(prefs);
        applyTheme(prefs);
        if (prefs.theme === 'custom') setCustomBg(localStorage.getItem('fiaos_wallpaper_custom'));
        
        // Sync Cloud Quietly
        if (existing.role !== 'guest') {
            cloud.restoreConnection();
            cloud.loadPrefs().then(p => { if(p) { setUserPrefs(p); applyTheme(p); } });
        }
    }
  }, []);

  // 3b. Maintenance-triggered global logout
  useEffect(() => {
    if (!session || !adminConfig) return;
    if (adminConfig.forceLogoutAt && session.lastLoginAt < adminConfig.forceLogoutAt) {
        handleLogout();
    }
  }, [adminConfig, session]);

  // 4. Global Bridge
  useEffect(() => {
    window.FIAOS = {
        openRewards: () => setOpenedApp({ id: 'rewards_app', name: 'Belohnungen' }),
        playSound: (t:any) => playSound(t),
        cloud
    };
    window.FIAOS_APPLY_PREFS = (p: UserPrefs) => {
        setUserPrefs(p);
        applyTheme(p);
        if (p.theme === 'custom') setCustomBg(localStorage.getItem('fiaos_wallpaper_custom'));
        else setCustomBg(null);
    };
    return () => { delete window.FIAOS; delete window.FIAOS_APPLY_PREFS; };
  }, []);

  // 3. Handlers
  const handleLogin = async (pass: string) => {
    if (!selectedUser) return false;
    
    // Local Check First
    if (selectedUser.role !== 'guest') {
        const u = USERS.find(x => x.id === selectedUser.id);
        if (u && u.password && pass !== u.password) return false;
    }

    const sess: Session = {
        userId: selectedUser.id, name: selectedUser.name, role: selectedUser.role, lastLoginAt: Date.now()
    };
    
    saveSession(sess);
    setSession(sess);
    setIsAuthOpen(false);
    setSelectedUser(null);
    
    // Theme Init for User
    const prefs = loadUserPrefs(sess);
    setUserPrefs(prefs);
    applyTheme(prefs);
    
    // Cloud Sync Fire-and-forget
    cloud.silentLogin(sess.userId, pass).catch(()=>{});
    
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

  // 4. Styles
  const themeDef = THEMES[userPrefs?.theme || 'roseGlass'] || THEMES['roseGlass'];
  const bgStyle = customBg 
    ? { backgroundImage: `url(${customBg})`, backgroundSize: 'cover' }
    : { background: themeDef.colors.bgGradient };

  return (
    <div className="fixed inset-0 overflow-hidden text-white font-sans transition-all duration-700" style={bgStyle}>
        {!customBg && <div className="absolute inset-0 transition-colors duration-700 bg-[image:var(--bg-gradient)]" />}
        <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-overlay" style={{ backgroundImage: `url("${NOISE_BG}")` }} />

        {!session ? (
            <LoginScreen onSelectUser={(u) => { setSelectedUser(u); if(u.role==='guest') handleLogin('guest'); else setIsAuthOpen(true); }} />
        ) : (
            <HomeScreen 
                session={session} 
                onLogout={handleLogout}
                onAppClick={(app) => { saveLastApp(session, app.id); setOpenedApp({ id: app.id, name: app.name }); }}
                onShowToast={(m) => setToast({id: Date.now(), message: m})}
            />
        )}

        {/* Modals */}
        <AuthSheet 
            isOpen={isAuthOpen} 
            onClose={() => setIsAuthOpen(false)} 
            user={selectedUser} 
            onLogin={handleLogin} 
        />
        
        <AppWindow 
            isOpen={!!openedApp} 
            appId={openedApp?.id || null} 
            appName={openedApp?.name || ''} 
            onClose={() => setOpenedApp(null)} 
        />

        <Toast message={toast.message} onClear={() => setToast({ ...toast, message: '' })} />
    </div>
  );
};

export default App;
    