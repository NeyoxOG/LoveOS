
import { UserRewardsData, Reward, UserProfile, UserPrefs, Session, AdminConfig, UserIndex, UserIndexItem, DailyState } from '../types';
import { REWARD_CATALOG, VALENTINE_REWARDS, THEMES, INITIAL_ADMIN_CONFIG as DEFAULT_ADMIN_CONFIG } from '../constants';

export const INITIAL_ADMIN_CONFIG = DEFAULT_ADMIN_CONFIG;

// --- INITIAL STATES (Single Source of Truth) ---

export const INITIAL_REWARDS_DATA: UserRewardsData = {
  version: 2,
  rewards: {
    "reward.welcome": { unlocked: true, unlockedAt: Date.now() },
    "reward.welcomeTheme": { unlocked: true, unlockedAt: Date.now() }, 
    "custom_theme_unlock": { unlocked: true, unlockedAt: Date.now() }, 
    "reward.firstLogin": { unlocked: false, unlockedAt: null },
    "reward.firstAppOpen": { unlocked: false, unlockedAt: null },
    "reward.firstReward": { unlocked: false, unlockedAt: null },
    "reward.streak3": { unlocked: false, unlockedAt: null },
    "reward.secretLove": { unlocked: false, unlockedAt: null },
  },
  valentine: {
    total: 6,
    unlocked: {
      "valentine.reward.pizza": true,
      "valentine.reward.photo": true,
      "valentine.reward.letter": true,
      "valentine.reward.care": true,
      "valentine.reward.art": true,
      "valentine.reward.secret": true,
    },
    completedAt: Date.now()
  },
  meta: {
    lastSeenAt: Date.now(),
    points: 10
  }
};

export const INITIAL_USER_PREFS: UserPrefs = {
    theme: 'roseGlass',
    accent: '#818cf8',
    wallpaper: 'gradient_1',
    reduceMotion: false,
    uiDensity: 'cozy',
    quickstartMode: 'lastApp',
    quickstartApp: ''
};

// --- Types Builders ---

export const createDefaultProfile = (session: Session): UserProfile => ({
    userId: session.userId,
    role: session.role,
    displayName: session.name,
    avatar: { type: 'emoji', value: session.name.charAt(0) },
    createdAt: Date.now(),
    updatedAt: Date.now()
});

export const createDefaultDailyState = (userId: string): DailyState => ({
     lastClaimDateISO: null,
     streak: 0,
     totalClaims: 0,
     points: 0,
     todaySeed: `${userId}_${new Date().toISOString().split('T')[0]}`,
     openedToday: false,
     lastOpenAt: 0
});

// --- Logic Helpers (Pure Functions) ---

export const getRewardCatalog = (): Reward[] => {
  return REWARD_CATALOG;
};

export const unlockRewardLogic = (currentRewards: UserRewardsData, rewardId: string) => {
  // Defensive Copy
  const data = JSON.parse(JSON.stringify(currentRewards || INITIAL_REWARDS_DATA)); 
  let wasUnlocked = false;

  // Initialize sections if missing (Migration safety)
  if (!data.rewards) data.rewards = {};
  if (!data.valentine) data.valentine = { total: 6, unlocked: {}, completedAt: null };

  // Logic
  if (rewardId.startsWith('valentine.')) {
     if (!data.valentine.unlocked[rewardId]) {
        data.valentine.unlocked[rewardId] = true;
        wasUnlocked = true;
     }
  } else {
     if (!data.rewards[rewardId]) {
        data.rewards[rewardId] = { unlocked: true, unlockedAt: Date.now() };
        wasUnlocked = true;
     } else if (!data.rewards[rewardId].unlocked) {
        data.rewards[rewardId].unlocked = true;
        data.rewards[rewardId].unlockedAt = Date.now();
        wasUnlocked = true;
     }
  }

  return { updatedData: data, wasUnlocked };
};

export const setRewardsLastSeen = (rewards: UserRewardsData): UserRewardsData => {
    rewards.meta.lastSeenAt = Date.now();
    return rewards;
};

// --- UI/Theme Helpers ---

export const applyTheme = (prefs: UserPrefs) => {
    const themeId = prefs?.theme || 'roseGlass';
    const theme = THEMES[themeId] || THEMES['roseGlass'];
    const root = document.documentElement;
    
    root.setAttribute('data-theme', theme.id);
    
    if (theme) {
        root.style.setProperty('--bg-gradient', theme.colors.bgGradient);
        root.style.setProperty('--card-bg', theme.colors.cardBg);
        root.style.setProperty('--text-primary', theme.colors.text);
        root.style.setProperty('--text-dim', theme.colors.textDim);
    }
};

// --- Local Cache Helpers (Only for UI state that doesn't need cloud persistence) ---

export const saveLastApp = (session: Session, appId: string) => {
    try {
        localStorage.setItem(`fiaos_last_app_${session.userId}`, appId);
    } catch(e) {}
};

export const loadLastApp = (session: Session): string | null => {
    try {
        return localStorage.getItem(`fiaos_last_app_${session.userId}`);
    } catch(e) { return null; }
};

export const loadUserPrefs = (session: Session): UserPrefs => {
  try {
    const key = session.role === 'guest' ? 'fiaos_guest_guest_prefs' : `fiaos_user_${session.userId}_prefs`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : INITIAL_USER_PREFS;
  } catch (error) {
    return INITIAL_USER_PREFS;
  }
};

export const loadUserProfile = (session: Session): UserProfile => {
  try {
    const key = session.role === 'guest' ? 'fiaos_guest_guest_profile' : `fiaos_user_${session.userId}_profile`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : createDefaultProfile(session);
  } catch (error) {
    return createDefaultProfile(session);
  }
};

export const loadDailyState = (userId: string): DailyState => {
  try {
    const key = `fiaos_user_${userId}_daily_state`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : createDefaultDailyState(userId);
  } catch (error) {
    return createDefaultDailyState(userId);
  }
};

// --- Admin Config Loader (Read-Only wrapper) ---

export const loadAdminConfig = (): AdminConfig => {
    try {
        const stored = localStorage.getItem('fiaos_global_admin_config');
        if (stored) return JSON.parse(stored);
    } catch(e) {}
    return INITIAL_ADMIN_CONFIG;
};

// --- Search Index Helper ---

export const updateUserIndex = (session: Session, profile: UserProfile) => {
    try {
        const key = 'fiaos_global_user_index';
        const raw = localStorage.getItem(key);
        let index: UserIndex = raw ? JSON.parse(raw) : { users: [] };
        
        const existingIdx = index.users.findIndex(u => u.userId === session.userId);
        const item: UserIndexItem = {
            userId: session.userId,
            displayName: profile.displayName,
            role: session.role,
            avatar: profile.avatar,
            lastSeen: Date.now()
        };
        
        if (existingIdx >= 0) {
            index.users[existingIdx] = item;
        } else {
            index.users.push(item);
        }
        
        localStorage.setItem(key, JSON.stringify(index));
    } catch(e) {}
};
