import { UserRewardsData, Reward, UserProfile, UserPrefs, Session, AdminConfig, UserIndex, UserIndexItem, GameStats, GlobalArcadeData, LeaderboardEntry, DailyState, DailyHistoryEntry } from '../types';
import { REWARD_CATALOG, VALENTINE_REWARDS, THEMES, APPS, DAILY_OFFERS } from '../constants';

const INITIAL_REWARDS_DATA: UserRewardsData = {
  version: 2,
  rewards: {
    "reward.welcome": { unlocked: true, unlockedAt: Date.now() },
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
    love: true
  },
  roleOverrides: {
    "fia": "user",
    "collin": "admin"
  },
  userBadges: {
    "collin": ["developer"]
  },
  maintenanceMode: false,
  lastEditedBy: "system",
  updatedAt: Date.now()
};

// --- Games Defaults ---
const INITIAL_GAME_STATS: GameStats = {
  stack: { best: 0, last: 0, plays: 0 },
  reaction: { best: 0, last: 0, plays: 0, bestCombo: 0 },
  fillbox: { best: 0, last: 0, plays: 0 },
  puzzle: { bestTimeMs: null, lastTimeMs: null, plays: 0, bestMoves: null }
};

const INITIAL_GLOBAL_ARCADE: GlobalArcadeData = {
  stack: [],
  reaction: [],
  fillbox: [],
  puzzle: []
};

// --- Rewards ---

export const getRewardCatalog = (): Reward[] => {
  return REWARD_CATALOG;
};

export const loadUserRewards = (userId: string): UserRewardsData => {
  try {
    const key = `fiaos_rewards_${userId}`;
    const stored = localStorage.getItem(key);
    if (!stored) {
      saveUserRewards(userId, INITIAL_REWARDS_DATA);
      return INITIAL_REWARDS_DATA;
    }
    const data = JSON.parse(stored) as UserRewardsData;
    if (!data.valentine) {
      data.valentine = INITIAL_REWARDS_DATA.valentine;
      data.version = 2;
      saveUserRewards(userId, data);
    }
    return data;
  } catch (error) {
    console.error("Failed to load user rewards", error);
    return INITIAL_REWARDS_DATA;
  }
};

export const saveUserRewards = (userId: string, data: UserRewardsData): void => {
  try {
    const key = `fiaos_rewards_${userId}`;
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error("Failed to save user rewards", error);
  }
};

export const unlockRewardLogic = (data: UserRewardsData, rewardId: string): { updatedData: UserRewardsData, wasUnlocked: boolean } => {
  if (data.rewards[rewardId]?.unlocked) {
    return { updatedData: data, wasUnlocked: false };
  }

  const updatedData = {
    ...data,
    rewards: {
      ...data.rewards,
      [rewardId]: {
        unlocked: true,
        unlockedAt: Date.now()
      }
    },
    meta: {
      ...data.meta,
      points: data.meta.points + 10
    }
  };

  return { updatedData, wasUnlocked: true };
};

export const setRewardsLastSeen = (userId: string, data: UserRewardsData): UserRewardsData => {
  const updatedData = {
    ...data,
    meta: {
      ...data.meta,
      lastSeenAt: Date.now()
    }
  };
  saveUserRewards(userId, updatedData);
  return updatedData;
};

// --- Games Logic ---

export const loadUserGames = (userId: string): GameStats => {
  const key = `fiaos_user_${userId}_games`;
  const stored = localStorage.getItem(key);
  if (!stored) return INITIAL_GAME_STATS;
  return { ...INITIAL_GAME_STATS, ...JSON.parse(stored) }; 
};

export const saveUserGames = (userId: string, data: GameStats) => {
  const key = `fiaos_user_${userId}_games`;
  localStorage.setItem(key, JSON.stringify(data));
};

export const loadGlobalArcade = (): GlobalArcadeData => {
  const key = 'fiaos_global_arcade';
  const stored = localStorage.getItem(key);
  if (!stored) return INITIAL_GLOBAL_ARCADE;
  return JSON.parse(stored);
};

export const updateGlobalLeaderboard = (game: keyof GlobalArcadeData, entry: LeaderboardEntry) => {
  const arcade = loadGlobalArcade();
  const list = arcade[game] || [];
  list.push(entry);
  if (game === 'puzzle') {
     list.sort((a, b) => a.score - b.score);
  } else {
     list.sort((a, b) => b.score - a.score);
  }
  arcade[game] = list.slice(0, 10);
  localStorage.setItem('fiaos_global_arcade', JSON.stringify(arcade));
};

// --- Daily Logic ---

const seededRandom = (seed: string) => {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        const char = seed.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    const x = Math.sin(hash) * 10000;
    return x - Math.floor(x);
};

export const loadDailyState = (userId: string): DailyState => {
    const key = `fiaos_user_${userId}_daily_state`;
    const stored = localStorage.getItem(key);
    const todayISO = new Date().toISOString().split('T')[0];
    
    let state: DailyState;
    if (stored) {
        state = JSON.parse(stored);
    } else {
        state = {
            lastClaimDateISO: null,
            streak: 0,
            totalClaims: 0,
            todaySeed: "",
            openedToday: false,
            lastOpenAt: 0
        };
    }

    const expectedSeed = `${userId}_${todayISO}`;
    if (state.todaySeed !== expectedSeed) {
        state.todaySeed = expectedSeed;
        state.openedToday = false;
        saveDailyState(userId, state);
    }
    
    return state;
};

export const saveDailyState = (userId: string, state: DailyState) => {
    const key = `fiaos_user_${userId}_daily_state`;
    localStorage.setItem(key, JSON.stringify(state));
};

export const getDailyOffer = (seed: string) => {
    const rand = seededRandom(seed);
    let rarity = 'common';
    if (rand > 0.95) rarity = 'epic';
    else if (rand > 0.70) rarity = 'rare';
    
    const pool = DAILY_OFFERS.filter(o => o.rarity === rarity);
    const index = Math.floor(seededRandom(seed + "_idx") * pool.length);
    return pool[index] || pool[0];
};

export const claimDaily = (userId: string) => {
    const state = loadDailyState(userId);
    if (state.openedToday) return null;

    const todayISO = new Date().toISOString().split('T')[0];
    const offer = getDailyOffer(state.todaySeed);

    if (state.lastClaimDateISO) {
        const lastDate = new Date(state.lastClaimDateISO);
        const today = new Date(todayISO);
        const diffTime = Math.abs(today.getTime() - lastDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            state.streak++;
        } else if (diffDays > 1) {
            state.streak = 1;
        }
    } else {
        state.streak = 1;
    }

    state.openedToday = true;
    state.lastClaimDateISO = todayISO;
    state.totalClaims++;
    state.lastOpenAt = Date.now();
    
    saveDailyState(userId, state);

    const historyKey = `fiaos_user_${userId}_daily_history`;
    let history: DailyHistoryEntry[] = JSON.parse(localStorage.getItem(historyKey) || '[]');
    history.unshift({
        dateISO: todayISO,
        claimedAt: Date.now(),
        offerId: offer.id,
        type: offer.type,
        title: offer.title,
        icon: offer.icon,
        rarity: offer.rarity
    });
    if (history.length > 20) history.pop();
    localStorage.setItem(historyKey, JSON.stringify(history));

    checkCoupleBonus(userId, todayISO);

    return offer;
};

const checkCoupleBonus = (userId: string, dateISO: string) => {
    if (userId !== 'fia' && userId !== 'collin') return;
    
    const sharedKey = `fiaos_shared_daily_couple_${dateISO}`;
    let claims: string[] = JSON.parse(localStorage.getItem(sharedKey) || '[]');
    
    if (!claims.includes(userId)) {
        claims.push(userId);
        localStorage.setItem(sharedKey, JSON.stringify(claims));
    }

    if (claims.includes('fia') && claims.includes('collin')) {
        ['fia', 'collin'].forEach(uid => {
            addInboxItem(uid, {
                type: 'reward',
                title: 'Couple Bonus 💞',
                body: 'Ihr habt beide euer Daily abgeholt! Hier ist ein kleines Extra.',
                icon: '💞',
                lockedByRewardId: null
            });
        });
    }
};

export const addInboxItem = (userId: string, item: Partial<any>) => {
    const key = `fiaos_user_${userId}_daily_inbox`;
    let inbox = JSON.parse(localStorage.getItem(key) || '[]');
    const isDupe = inbox.some((i: any) => i.title === item.title && (Date.now() - i.createdAt < 86400000));
    if (isDupe) return;

    inbox.unshift({
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        claimed: false,
        claimedAt: null,
        ...item
    });
    localStorage.setItem(key, JSON.stringify(inbox));
};

// --- Profile & Preferences ---

export const getUserKey = (session: Session, type: 'profile' | 'prefs' | 'lastApp') => {
  const prefix = session.role === 'guest' ? 'fiaos_guest' : 'fiaos_user';
  return `${prefix}_${session.userId}_${type}`;
};

export const loadUserProfile = (session: Session): UserProfile => {
  const key = getUserKey(session, 'profile');
  const stored = localStorage.getItem(key);
  if (stored) return JSON.parse(stored);
  
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
  const key = getUserKey(session, 'prefs');
  const stored = localStorage.getItem(key);
  if (stored) return JSON.parse(stored);

  return {
    theme: 'roseGlass',
    accent: '#818cf8',
    wallpaper: 'gradient_1',
    reduceMotion: false,
    uiDensity: 'cozy'
  };
};

export const saveLastApp = (session: Session, appId: string) => {
  const key = getUserKey(session, 'lastApp');
  localStorage.setItem(key, appId);
};

export const loadLastApp = (session: Session): string => {
  const key = getUserKey(session, 'lastApp');
  return localStorage.getItem(key) || 'luna';
};

// --- Admin & Global Data ---

export const loadAdminConfig = (): AdminConfig => {
    const raw = localStorage.getItem('fiaos_global_admin_config');
    if (!raw) {
        saveAdminConfig(INITIAL_ADMIN_CONFIG);
        return INITIAL_ADMIN_CONFIG;
    }
    const stored = JSON.parse(raw);
    // Merge to ensure new keys in INITIAL_ADMIN_CONFIG (like 'love') appear in existing localStorage
    return {
        ...INITIAL_ADMIN_CONFIG,
        ...stored,
        appVisibility: {
            ...INITIAL_ADMIN_CONFIG.appVisibility,
            ...stored.appVisibility
        }
    };
};

export const saveAdminConfig = (config: AdminConfig) => {
    localStorage.setItem('fiaos_global_admin_config', JSON.stringify(config));
};

export const updateUserIndex = (session: Session, profile: UserProfile) => {
    const raw = localStorage.getItem('fiaos_global_user_index');
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
    
    localStorage.setItem('fiaos_global_user_index', JSON.stringify(index));
};

// --- Theme Application ---

export const applyTheme = (prefs: UserPrefs) => {
  const root = document.documentElement;
  root.style.setProperty('--accent', prefs.accent);
  
  if (prefs.theme === 'cloud' || prefs.theme === 'matcha') {
      root.style.setProperty('--text-primary', '#1e293b');
      root.classList.add('light-mode');
  } else {
      root.style.setProperty('--text-primary', '#fff');
      root.classList.remove('light-mode');
  }

  document.body.className = `theme-${prefs.theme} wallpaper-${prefs.wallpaper} ${prefs.reduceMotion ? 'motion-reduce' : ''}`;
};

// --- Debug Helpers ---

export const debugUnlockValentine = (data: UserRewardsData): UserRewardsData => {
  const updated = { ...data };
  updated.valentine = {
    total: 6,
    unlocked: {},
    completedAt: Date.now()
  };
  VALENTINE_REWARDS.forEach(r => {
    updated.valentine.unlocked[r.id] = true;
  });
  return updated;
};

export const debugResetValentine = (data: UserRewardsData): UserRewardsData => {
  return {
    ...data,
    valentine: {
      total: 6,
      unlocked: {},
      completedAt: null
    }
  };
};