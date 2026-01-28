
export type UserRole = 'admin' | 'developer' | 'user' | 'guest' | 'banned';
export type UserBadge = 'vip' | 'developer';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  password?: string | null;
  avatar?: string | null;
}

export interface Session {
  userId: string;
  name: string;
  role: UserRole;
  lastLoginAt: number;
  forceLogout?: boolean;
}

export type AppStatus = 'lockedHint' | 'comingSoon' | 'available' | 'maintenance' | 'hidden';

export interface AppItem {
  id: string;
  name: string;
  icon: string;
  status: AppStatus;
  badge?: number | string; // Added badge support
}

export interface ToastState {
  id: number;
  message: string;
}

export interface OverlayState {
  isOpen: boolean;
  title: string;
  content: string;
}

// --- Rewards System Types ---

export type RewardType = 'reward' | 'theme_unlock' | 'cosmetic_unlock';
export type RewardCategory = 'general' | 'love' | 'games' | 'diary' | 'valentine';

export interface Reward {
  id: string;
  title: string;
  description: string;
  icon: string;
  type?: RewardType;
  category?: RewardCategory;
  payload?: any;
}

export interface RewardProgress {
  unlocked: boolean;
  unlockedAt: number | null;
}

export interface ValentineProgress {
  total: number;
  unlocked: Record<string, boolean>;
  completedAt: number | null;
}

export interface UserRewardsData {
  version: number;
  rewards: Record<string, RewardProgress>;
  valentine: ValentineProgress;
  redeemed?: Record<string, number>; // New: Track redemption timestamps by Reward ID
  meta: {
    lastSeenAt: number;
    points: number;
  };
}

// --- Profile & Preferences ---

export interface UserProfile {
  userId: string;
  role: UserRole;
  displayName: string;
  avatar: { type: 'emoji' | 'image', value: string };
  createdAt: number;
  updatedAt: number;
  onboardingCompleted?: boolean; // New Flag
}

export interface UserPrefs {
  theme: string;
  accent: string;
  wallpaper: string;
  reduceMotion: boolean;
  uiDensity: 'cozy' | 'compact';
  quickstartMode: 'lastApp' | 'fixed';
  quickstartApp: string;
}

export interface ThemeDef {
  id: string;
  name: string;
  unlockRewardId?: string; // If set, requires this reward
  colors: {
    bgGradient: string;
    cardBg: string;
    text: string;
    textDim: string;
  };
}

// --- Admin System ---

export interface UserStatusConfig {
    role: UserRole;
    banned: boolean;
}

export interface AdminConfig {
  appVisibility: Record<string, boolean>; // true = visible, false = hidden
  userStatus: Record<string, UserStatusConfig>; // userId -> { role, banned }
  maintenanceMode: boolean;
  lastEditedBy: string;
  updatedAt: number;
  // Deprecated but kept for type safety during migration if needed
  roleOverrides?: Record<string, UserRole>; 
  userBadges?: Record<string, UserBadge[]>;
}

export interface UserIndexItem {
  userId: string;
  displayName: string;
  role: UserRole;
  avatar: { type: 'emoji' | 'image', value: string };
  lastSeen: number;
}

export interface UserIndex {
  users: UserIndexItem[];
}

// --- Games System ---

export interface GameStats {
  stack: { best: number, last: number, plays: number };
  reaction: { best: number, last: number, plays: number, bestCombo: number };
  blockblast: { best: number, last: number, plays: number }; // Replaced fillbox
  puzzle: { bestTimeMs: number | null, lastTimeMs: number | null, plays: number, bestMoves: number | null };
  snake: { best: number, last: number, plays: number };
  flappy: { best: number, last: number, plays: number };
}

export interface LeaderboardEntry {
  userId: string;
  name: string;
  score: number; // or timeMs for puzzle
  extra?: number; // e.g. moves for puzzle
  date: number;
}

export interface GlobalArcadeData {
  stack: LeaderboardEntry[];
  reaction: LeaderboardEntry[];
  blockblast: LeaderboardEntry[]; // Replaced fillbox
  puzzle: LeaderboardEntry[];
  snake: LeaderboardEntry[];
  flappy: LeaderboardEntry[];
}

// --- Diary System ---

export interface DiaryEntry {
  id: string;
  createdAt: number;
  updatedAt: number;
  authorUserId: string;
  authorName: string;
  scope: 'user' | 'shared';
  title: string;
  text: string;
  mood: string;
  tags: string[];
  pinned: boolean;
  locked: boolean;
}

export interface DiaryMeta {
  lastOpenAt: number;
  streakDays: number;
  lastEntryDateISO: string;
  totalEntries: number;
}

// --- Daily System ---

export type OfferType = 'reward' | 'text' | 'quest' | 'theme' | 'app_unlock';
export type OfferRarity = 'common' | 'rare' | 'epic';

export interface DailyOffer {
  id: string;
  type: OfferType;
  title: string;
  subtitle: string;
  icon: string;
  rarity: OfferRarity;
  payload?: any;
}

export interface DailyState {
  lastClaimDateISO: string | null;
  streak: number;
  totalClaims: number;
  todaySeed: string;
  openedToday: boolean;
  lastOpenAt: number;
}

export interface DailyHistoryEntry {
  dateISO: string;
  claimedAt: number;
  offerId: string;
  type: OfferType;
  title: string;
  icon: string;
  rarity: OfferRarity;
  result?: any;
}

export interface DailyInboxItem {
  id: string;
  createdAt: number;
  type: 'note' | 'reward' | 'quest' | 'unlock';
  title: string;
  body: string;
  icon: string;
  lockedByRewardId: string | null;
  claimed: boolean;
  claimedAt: number | null;
}
