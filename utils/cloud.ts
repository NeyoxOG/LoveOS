
import { 
    client, account, databases, 
    DB_ID, COL_STATES, COL_DIARY, COL_MESSAGES, COL_GAMES, COL_VAULT,
    ID, Query 
} from './appwriteClient';
import { UserRewardsData, AdminConfig, UserPrefs, UserProfile } from '../types';
import { 
    INITIAL_ADMIN_CONFIG, 
    INITIAL_REWARDS_DATA, 
    INITIAL_USER_PREFS,
    createDefaultProfile,
    createDefaultDailyState
} from './data';

const COUPLE_ID = 'couple';

const DEFAULT_ADMIN_CONFIG: AdminConfig = {
  appVisibility: {
    luna: true, rewards: true, settings: true, valentine: true, 
    vault: true, admin: true, messages: true, achievements: true, 
    games: true, diary: true, daily: true, love: true, rewards_app: true, story: true, bucket: true
  },
  userStatus: {
    "fia": { role: "user", banned: false },
    "collin": { role: "admin", banned: false },
    "guest": { role: "guest", banned: false }
  },
  maintenanceMode: false,
  lastEditedBy: "system",
  updatedAt: Date.now(),
  forceLogoutAt: 0
};

const normalizeAdminConfig = (config?: AdminConfig | null): AdminConfig => {
    const safeConfig = config || {};
    return {
        ...DEFAULT_ADMIN_CONFIG,
        ...safeConfig,
        appVisibility: {
            ...DEFAULT_ADMIN_CONFIG.appVisibility,
            ...(safeConfig.appVisibility || {})
        },
        userStatus: {
            ...DEFAULT_ADMIN_CONFIG.userStatus,
            ...(safeConfig.userStatus || {})
        },
        maintenanceMode: safeConfig.maintenanceMode ?? DEFAULT_ADMIN_CONFIG.maintenanceMode,
        lastEditedBy: safeConfig.lastEditedBy || DEFAULT_ADMIN_CONFIG.lastEditedBy,
        updatedAt: safeConfig.updatedAt || DEFAULT_ADMIN_CONFIG.updatedAt,
        forceLogoutAt: safeConfig.forceLogoutAt ?? DEFAULT_ADMIN_CONFIG.forceLogoutAt
    };
};

// --- Helpers ---

const getUid = () => {
    try {
        const sessionStr = localStorage.getItem('fiaos_session');
        if (!sessionStr) return 'guest';
        return JSON.parse(sessionStr).userId;
    } catch { return 'guest'; }
};

const isGuest = () => getUid() === 'guest';

// --- Cloud State ---

const isNetworkError = (e: any) => {
    if (!e) return false;
    if (e.code === 0) return true; // Appwrite specific
    const msg = (e.message || '').toLowerCase();
    return msg.includes('load failed') || msg.includes('network') || msg.includes('offline') || msg.includes('fetch');
};

const _docIdCache = new Map<string, string>();

// --- State Manager (Key-Value) ---

const stateManager = {
    getKey(module: string, profileKey: string) {
        return `${module}:${profileKey}`;
    },

    async get<T>(module: string, profileKey: string, fallback: T): Promise<T> {
        // 1. Local Cache First (Always fast)
        const cacheKey = `fiaos_cache_${module}_${profileKey}`;
        const local = localStorage.getItem(cacheKey);
        
        // 2. If Guest, always local
        if (isGuest()) {
            return local ? JSON.parse(local) : fallback;
        }

        // 3. Cloud Sync (Background)
        try {
            const memKey = this.getKey(module, profileKey);
            let docId = _docIdCache.get(memKey);
            let doc;

            if (docId) {
                doc = await databases.getDocument(DB_ID, COL_STATES, docId);
            } else {
                const q = [Query.equal('module', module), Query.equal('profileKey', profileKey)];
                const res = await databases.listDocuments(DB_ID, COL_STATES, q);
                if (res.documents.length > 0) {
                    doc = res.documents[0];
                    _docIdCache.set(memKey, doc.$id);
                }
            }

            if (doc) {
                const data = JSON.parse(doc.payload);
                localStorage.setItem(cacheKey, JSON.stringify(data)); // Update cache
                return data; // Return fresh cloud data
            }
        } catch (e) {
            if (!isNetworkError(e) && (e as any).code !== 404) console.warn(`Cloud fetch error ${module}:`, e);
        }

        // 4. Return Local Cache (stale-while-revalidate strategy) or Fallback
        return local ? JSON.parse(local) : fallback;
    },

    async set(module: string, profileKey: string, data: any) {
        const payload = JSON.stringify(data);
        const cacheKey = `fiaos_cache_${module}_${profileKey}`;
        
        // 1. Optimistic Update (Local)
        localStorage.setItem(cacheKey, payload);
        if (isGuest()) return;

        // 2. Cloud Update
        try {
            const memKey = this.getKey(module, profileKey);
            const updatedAt = new Date().toISOString();
            let docId = _docIdCache.get(memKey);

            if (docId) {
                await databases.updateDocument(DB_ID, COL_STATES, docId, { payload, updatedAt });
            } else {
                const q = [Query.equal('module', module), Query.equal('profileKey', profileKey)];
                const res = await databases.listDocuments(DB_ID, COL_STATES, q);
                
                if (res.documents.length > 0) {
                    docId = res.documents[0].$id;
                    _docIdCache.set(memKey, docId);
                    await databases.updateDocument(DB_ID, COL_STATES, docId, { payload, updatedAt });
                } else {
                    const newDoc = await databases.createDocument(DB_ID, COL_STATES, ID.unique(), {
                        module, profileKey, payload, updatedAt
                    });
                    _docIdCache.set(memKey, newDoc.$id);
                }
            }
        } catch (e) {
            if (!isNetworkError(e)) console.error(`Cloud save error ${module}:`, e);
        }
    }
};

// --- Public API ---

export const cloud = {
    async login(email: string, password: string): Promise<boolean> {
        try {
            try { await account.deleteSession('current'); } catch {}
            await account.createEmailPasswordSession(email, password);
            _docIdCache.clear();
            return true;
        } catch (e) {
            // Return false silently for UI to handle "Invalid Pass" etc.
            // Network errors treated as "Offline Mode" -> False (Local login handles it)
            return false;
        }
    },

    async silentLogin(userId: string, password?: string) {
        if (userId === 'guest') return;
        try {
            await account.get();
        } catch {
            if (password) {
                try { await this.login(`${userId}@fiaos.app`, password); } catch {}
            }
        }
    },

    // --- Admin / Config ---
    
    async loadAdminConfig(): Promise<AdminConfig | null> {
        const cacheKey = 'fiaos_global_admin_config';
        // Always try to return cache first if offline, or fall back to it
        let config: AdminConfig | null = null;

        if (!isGuest()) {
            config = await docHelper.getState('admin_config', 'system');
        }

        if (config) {
            const normalized = normalizeAdminConfig(config);
            localStorage.setItem(cacheKey, JSON.stringify(normalized));
            return normalized;
        }

        // Fallback
        const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
        return normalizeAdminConfig(cached || DEFAULT_ADMIN_CONFIG);
    },

    async saveAdminConfig(config: AdminConfig) {
        const normalized = normalizeAdminConfig(config);
        localStorage.setItem('fiaos_global_admin_config', JSON.stringify(normalized));
        await docHelper.setState('admin_config', 'system', normalized);
    },

    listenToAdminConfig(callback: (config: AdminConfig) => void) {
        // Initial Local Load
        const local = localStorage.getItem('fiaos_global_admin_config');
        const localConfig = local ? JSON.parse(local) : DEFAULT_ADMIN_CONFIG;
        callback(normalizeAdminConfig(localConfig));

        if (isGuest()) return () => {};

        // Fetch Fresh
        this.loadAdminConfig().then(cfg => {
            if (cfg) callback(normalizeAdminConfig(cfg));
        });

        try {
            const unsub = client.subscribe(`databases.${DB_ID}.collections.${COL_STATES}.documents`, response => {
                if (response.events.includes('databases.*.collections.*.documents.*.update') || 
                    response.events.includes('databases.*.collections.*.documents.*.create')) {
                    
                    const payload = (response.payload as any);
                    if (payload.module === 'admin_config' && payload.profileKey === 'system') {
                        const data = normalizeAdminConfig(JSON.parse(payload.payload));
                        callback(data);
                        localStorage.setItem('fiaos_global_admin_config', JSON.stringify(data));
                    }
                }
            });
            return unsub;
        } catch (e) {
            return () => {};
        }
    },

    // --- Typed Accessors ---

    async loadAdminConfig(): Promise<AdminConfig> {
        return stateManager.get('admin_config', 'system', INITIAL_ADMIN_CONFIG);
    },
    async saveAdminConfig(c: AdminConfig) { await stateManager.set('admin_config', 'system', c); },

    async loadRewards(targetUid?: string): Promise<UserRewardsData> {
        return stateManager.get('rewards', targetUid || getUid(), INITIAL_REWARDS_DATA);
    },
    async saveRewards(d: UserRewardsData, targetUid?: string) { 
        await stateManager.set('rewards', targetUid || getUid(), d); 
    },

    async loadPrefs(): Promise<UserPrefs> {
        return stateManager.get('prefs', getUid(), INITIAL_USER_PREFS);
    },
    async savePrefs(d: UserPrefs) { await stateManager.set('prefs', getUid(), d); },

    async loadProfile(): Promise<UserProfile> {
        const uid = getUid();
        const fallback = createDefaultProfile({ userId: uid, name: 'User', role: 'user', lastLoginAt: 0 });
        return stateManager.get('profile', uid, fallback);
    },
    async saveProfile(d: UserProfile) { await stateManager.set('profile', getUid(), d); },

    async loadLuna() {
        return stateManager.get('luna', COUPLE_ID, { stats: { hunger: 50, love: 50, energy: 80 }, isSleeping: false });
    },
    async updateLuna(d: any) { 
        const current = await this.loadLuna();
        await stateManager.set('luna', COUPLE_ID, { ...current, ...d }); 
    },

    async loadDailyState(targetUid?: string) {
        const uid = targetUid || getUid();
        return stateManager.get('daily', uid, createDefaultDailyState(uid));
    },
    async saveDailyState(d: any, targetUid?: string) { 
        await stateManager.set('daily', targetUid || getUid(), d); 
    },

    async getDailyShared(date: string): Promise<string[]> {
        const d: any = await stateManager.get('daily_shared', date, { claims: [] });
        return d.claims;
    },
    async addDailyClaim(date: string, uid: string) {
        if (isGuest()) return;
        const d: any = await stateManager.get('daily_shared', date, { claims: [] });
        if (!d.claims.includes(uid)) {
            d.claims.push(uid);
            await stateManager.set('daily_shared', date, d);
        }
    },

    async loadBucket() { return stateManager.get('bucket', COUPLE_ID, { items: [] }); },
    async saveBucket(d: any) { await stateManager.set('bucket', COUPLE_ID, d); },

    // --- Collections ---

    async loadDiary() {
        if (isGuest()) return JSON.parse(localStorage.getItem('fiaos_guest_diary') || '[]');
        try {
            const res = await databases.listDocuments(DB_ID, COL_DIARY, [Query.orderDesc('createdAt'), Query.limit(100)]);
            return res.documents.map(d => ({
                id: d.$id, userId: d.userId, title: d.title, text: d.text, mood: d.mood, createdAt: d.createdAt,
                ...JSON.parse(d.payload || '{}')
            }));
        } catch { return []; }
    },
    async saveDiaryEntry(entry: any) {
        if (isGuest()) {
            const items = await this.loadDiary();
            const idx = items.findIndex((e:any) => e.id === entry.id);
            if (idx >= 0) items[idx] = entry; else items.unshift(entry);
            localStorage.setItem('fiaos_guest_diary', JSON.stringify(items));
            return;
        }
        try {
            const payload = JSON.stringify({ authorName: entry.authorName, scope: entry.scope });
            try {
                await databases.updateDocument(DB_ID, COL_DIARY, entry.id, { title: entry.title, text: entry.text, mood: entry.mood, payload });
            } catch {
                await databases.createDocument(DB_ID, COL_DIARY, entry.id, { userId: getUid(), title: entry.title, text: entry.text, mood: entry.mood, createdAt: entry.createdAt, payload });
            }
        } catch {}
    },

    // --- Admin ---
    
    async adminForceLogout(targetUid: string) {
        const config = await this.loadAdminConfig();
        if (config.userStatus[targetUid]) {
            config.userStatus[targetUid].forceLogoutAt = Date.now();
            await this.saveAdminConfig(config);
        }
    },
    async adminResetUser(targetUid: string) {
        await stateManager.set('rewards', targetUid, null);
        await stateManager.set('prefs', targetUid, null);
        await stateManager.set('daily', targetUid, null);
    },
    async adminGetData(targetUid: string, type: string) {
        return stateManager.get(type === 'daily_state' ? 'daily' : type, targetUid, null);
    },
    async adminSetData(targetUid: string, type: string, data: any) {
        await stateManager.set(type === 'daily_state' ? 'daily' : type, targetUid, data);
    },

    async getLeaderboard(gameId: string) {
        if (isGuest()) return [];
        try {
            const res = await databases.listDocuments(DB_ID, COL_GAMES, [
                Query.equal('gameId', gameId),
                Query.orderDesc('score'),
                Query.limit(10)
            ]);
            return res.documents.map(d => ({
                userId: d.userId,
                name: d.displayName,
                score: d.score,
                date: d.updatedAt
            }));
        } catch { return []; }
    },

    listenToLeaderboards(gameIds: string[], callback: (gameId: string) => void) {
        if (isGuest()) return () => {};
        try {
            const unsub = client.subscribe(`databases.${DB_ID}.collections.${COL_GAMES}.documents`, res => {
                if (res.events.some(e => e.includes('databases.*.collections.*.documents.*.'))) {
                    const payload = res.payload as any;
                    if (payload?.gameId && gameIds.includes(payload.gameId)) {
                        callback(payload.gameId);
                    }
                }
            });
            return unsub;
        } catch {
            return () => {};
        }
    },
    
    listenToMessages(cb: (m:any[])=>void) { cb([]); return ()=>{}; }, // Simplified stub
    async sendMessage(t: string) {},
    async loadVault() { return { messages: [] }; },
    async saveVault(s: any) {},
    async saveHighscore(g: string, s: number) {},
    async getLeaderboard(g: string) { return []; }
};
    