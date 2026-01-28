
import { UserRewardsData, Reward, UserProfile, UserPrefs, Session, AdminConfig, UserIndex, UserIndexItem, DailyState } from '../types';
import { REWARD_CATALOG, VALENTINE_REWARDS, THEMES } from '../constants';

export const INITIAL_REWARDS_DATA: UserRewardsData = {
  version: 2,
  rewards: {
    "reward.welcome": { unlocked: true, unlockedAt: Date.now() },
    "reward.welcomeTheme": { unlocked: true, unlockedAt: Date.now() }, // Auto-unlocked but needs claiming
    "custom_theme_unlock": { unlocked: true, unlockedAt: Date.now() }, // Unlock Custom by default or via achievement, setting to true for easier access as requested
    "reward.firstLogin": { unlocked: false, unlockedAt: null },
    "reward.firstAppOpen": { unlocked: false, unlockedAt: null },
    "reward.firstReward": { unlocked: false, unlockedAt: null },
    "reward.streak3": { unlocked: false, unlockedAt: null },
    "reward.secretLove": { unlocked: false, unlockedAt: null },
  },
  valentine: {
    total: 6,
    unlocked: {
      "valentine.reward.pizza": false,
      "valentine.reward.photo": false,
      "valentine.reward.letter": false,
      "valentine.reward.care": false,
      "valentine.reward.art": false,
      "valentine.reward.secret": false,
    },
    completedAt: null
  },
  meta: {
    lastSeenAt: Date.now(),
    points: 10
  }
};

// --- Admin Defaults ---

const INITIAL_ADMIN_CONFIG: AdminConfig = {
  appVisibility: {
    luna: true,
    rewards: true,
    settings: true,
    valentine: true,
    vault: true,
    admin: true,
    messages: true,
    achievements: true,
    games: true,
    diary: true,
    daily: true,
    love: true,
    rewards_app: true
  },
  userStatus: {
    "fia": { role: "user", banned: false },
    "collin": { role: "admin", banned: false },
    "guest": { role: "guest", banned: false }
  },
  maintenanceMode: false,
  lastEditedBy: "system",
  updatedAt: Date.now()
};

// --- Helpers ---

const userKey = (userId: string, suffix: string) => {
    const prefix = userId === 'guest' ? 'fiaos_guest_' : 'fiaos_user_';
    return `${prefix}${userId}_${suffix}`;
}

// --- Rewards ---

export const getRewardCatalog = (): Reward[] => {
  return REWARD_CATALOG;
};

// Note: saveUserRewards/loadUserRewards in this file are now legacy/guest-only helpers 
// or used for initial data structure generation. 
// The main app logic has moved to cloud.ts / App.tsx integration.

export const saveUserRewards = (userId: string, data: UserRewardsData): void => {
  try {
    localStorage.setItem(`fiaos_rewards_${userId}`, JSON.stringify(data));
  } catch (error) {
    console.error("Failed to save rewards", error);
  }
};

export const loadUserRewards = (userId: string): UserRewardsData => {
  try {
    const key = `fiaos_rewards_${userId}`;
    const stored = localStorage.getItem(key);
    if (!stored) {
      const initial = JSON.parse(JSON.stringify(INITIAL_REWARDS_DATA));
      saveUserRewards(userId, initial);
      return initial;
    }
    const data = JSON.parse(stored) as UserRewardsData;
    if (!data.valentine) {
      data.valentine = JSON.parse(JSON.stringify(INITIAL_REWARDS_DATA.valentine));
      data.version = 2;
      saveUserRewards(userId, data);
    }
    return data;
  } catch (e) {
    console.error("Failed to load rewards", e);
    return JSON.parse(JSON.stringify(INITIAL_REWARDS_DATA));
  }
};

export const unlockRewardLogic = (currentRewards: UserRewardsData, rewardId: string) => {
  const data = JSON.parse(JSON.stringify(currentRewards)); // Deep clone
  let wasUnlocked = false;

  // Check if it's a valentine reward
  if (rewardId.startsWith('valentine.')) {
     if (!data.valentine.unlocked[rewardId]) {
        data.valentine.unlocked[rewardId] = true;
        wasUnlocked = true;
     }
  } else {
     // Regular reward
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

export const setRewardsLastSeen = (userId: string, data: UserRewardsData): UserRewardsData => {
    // This helper now just returns modified data; saving is handled by caller (App.tsx -> Cloud)
    const updated = { ...data, meta: { ...data.meta, lastSeenAt: Date.now() } };
    return updated;
};

export const debugUnlockValentine = (currentRewards: UserRewardsData): UserRewardsData => {
    const data = JSON.parse(JSON.stringify(currentRewards));
    VALENTINE_REWARDS.forEach(r => {
        data.valentine.unlocked[r.id] = true;
    });
    return data;
};

export const debugResetValentine = (currentRewards: UserRewardsData): UserRewardsData => {
    const data = JSON.parse(JSON.stringify(currentRewards));
    data.valentine.unlocked = {};
    return data;
};

// --- Profile & Prefs ---

export const loadUserProfile = (session: Session): UserProfile => {
    const key = userKey(session.userId, 'profile');
    try {
        const stored = localStorage.getItem(key);
        if (stored) return JSON.parse(stored);
    } catch(e) {}

    // Default
    return {
        userId: session.userId,
        role: session.role,
        displayName: session.name,
        avatar: { type: 'emoji', value: session.name.charAt(0) },
        createdAt: Date.now(),
        updatedAt: Date.now()
    };
};

export const loadUserPrefs = (session: Session): UserPrefs => {
    const key = userKey(session.userId, 'prefs');
    try {
        const stored = localStorage.getItem(key);
        if (stored) return JSON.parse(stored);
    } catch(e) {}

    return {
        theme: 'roseGlass',
        accent: '#818cf8',
        wallpaper: 'gradient_1',
        reduceMotion: false,
        uiDensity: 'cozy',
        quickstartMode: 'lastApp',
        quickstartApp: ''
    };
};

export const applyTheme = (prefs: UserPrefs) => {
    const theme = THEMES[prefs.theme] || THEMES['roseGlass'];
    const root = document.documentElement;
    
    // Set theme ID attribute for CSS selectors
    root.setAttribute('data-theme', theme.id);
    
    if (theme) {
        root.style.setProperty('--bg-gradient', theme.colors.bgGradient);
        root.style.setProperty('--card-bg', theme.colors.cardBg);
        root.style.setProperty('--text-primary', theme.colors.text);
        root.style.setProperty('--text-dim', theme.colors.textDim);
    }
};

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

// --- Admin ---

export const loadAdminConfig = (): AdminConfig => {
    try {
        const stored = localStorage.getItem('fiaos_global_admin_config');
        if (stored) {
            const config = JSON.parse(stored);
            if (!config.userStatus) {
                config.userStatus = INITIAL_ADMIN_CONFIG.userStatus;
                if (config.roleOverrides) {
                    for (const [uid, role] of Object.entries(config.roleOverrides)) {
                        if (!config.userStatus[uid]) config.userStatus[uid] = { role: 'user', banned: false };
                        config.userStatus[uid].role = role as any;
                    }
                }
            }
            return config;
        }
    } catch(e) {}
    return INITIAL_ADMIN_CONFIG;
};

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

// --- Daily ---

export const loadDailyState = (userId: string): DailyState => {
     try {
        const key = `${userKey(userId, 'daily_state')}`;
        const stored = localStorage.getItem(key);
        if (stored) return JSON.parse(stored);
     } catch(e) {}
     
     const todayISO = new Date().toISOString().split('T')[0];
     return {
         lastClaimDateISO: null,
         streak: 0,
         totalClaims: 0,
         todaySeed: `${userId}_${todayISO}`,
         openedToday: false,
         lastOpenAt: 0
     };
};
