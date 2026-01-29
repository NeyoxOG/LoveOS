
import { 
    client, account, databases, 
    DB_ID, COL_STATES, COL_DIARY, COL_MESSAGES, COL_GAMES, COL_VAULT,
    ID, Query 
} from './appwriteClient';
import { UserRewardsData, AdminConfig, UserPrefs } from '../types';
import { INITIAL_ADMIN_CONFIG } from '../constants';

// --- Types & Constants ---

const COUPLE_ID = 'couple';

// --- Helpers ---

const getUid = () => {
    try {
        const sessionStr = localStorage.getItem('fiaos_session');
        if (!sessionStr) return 'guest';
        return JSON.parse(sessionStr).userId;
    } catch { return 'guest'; }
};

const isGuest = () => {
    return getUid() === 'guest';
};

const getCacheKey = (type: string, uid: string) => {
    return uid === 'guest' ? `fiaos_guest_${type}` : `fiaos_${type}_${uid}`;
};

// --- Cloud State Management ---

let cloudStatus: 'online' | 'offline' | 'syncing' = 'offline';
let statusListeners: ((s: string) => void)[] = [];

const setStatus = (s: 'online' | 'offline' | 'syncing') => {
    cloudStatus = s;
    statusListeners.forEach(cb => cb(s));
};

const isNetworkError = (e: any) => {
    const msg = e?.message || '';
    return msg === 'Load failed' || msg === 'Network request failed' || msg.includes('offline');
};

// Helper to wrap DB calls with JSON stringify/parse for payload field
const docHelper = {
    async get(collectionId: string, docId: string) {
        if (isGuest()) return null;
        try {
            const doc = await databases.getDocument(DB_ID, collectionId, docId);
            setStatus('online');
            return doc;
        } catch (e) {
            if (!isNetworkError(e)) console.error(`[Cloud] Get Error ${collectionId}:`, e);
            setStatus('offline');
            return null;
        }
    },
    
    // Specifically for the 'states' collection which uses module + profileKey logic
    async getState(module: string, profileKey: string) {
        if (isGuest()) return null;
        try {
            const q = [
                Query.equal('module', module),
                Query.equal('profileKey', profileKey)
            ];
            const res = await databases.listDocuments(DB_ID, COL_STATES, q);
            if (res.documents.length > 0) {
                const doc = res.documents[0];
                setStatus('online');
                return JSON.parse(doc.payload);
            }
            return null;
        } catch (e) {
            if (!isNetworkError(e)) console.warn(`[Cloud] GetState Error ${module}:`, e);
            setStatus('offline');
            return null;
        }
    },

    async setState(module: string, profileKey: string, data: any) {
        if (isGuest()) return;
        setStatus('syncing');
        try {
            const payload = JSON.stringify(data);
            const updatedAt = new Date().toISOString();

            // Check if exists (Optimized: we could cache ID to avoid read-before-write, but safety first)
            const q = [
                Query.equal('module', module),
                Query.equal('profileKey', profileKey)
            ];
            const res = await databases.listDocuments(DB_ID, COL_STATES, q);

            if (res.documents.length > 0) {
                // Update
                await databases.updateDocument(DB_ID, COL_STATES, res.documents[0].$id, {
                    payload,
                    updatedAt
                });
            } else {
                // Create
                await databases.createDocument(DB_ID, COL_STATES, ID.unique(), {
                    module,
                    profileKey,
                    payload,
                    updatedAt
                });
            }
            setStatus('online');
        } catch (e) {
            if (!isNetworkError(e)) console.warn(`[Cloud] SetState Error ${module}:`, e);
            setStatus('offline');
        }
    }
};

// --- Cloud Adapter API ---

export const cloud = {
    
    getMode() {
        return isGuest() ? 'local' : 'cloud';
    },

    onStatusChange(cb: (s: string) => void) {
        statusListeners.push(cb);
        cb(cloudStatus);
        return () => {
            statusListeners = statusListeners.filter(l => l !== cb);
        };
    },

    // --- Auth Strategy ---
    
    // Login with Email/Password (Real Auth)
    async login(email: string, password: string): Promise<boolean> {
        try {
            // Delete potential anonymous session first
            try { await account.deleteSession('current'); } catch {}
            
            await account.createEmailPasswordSession(email, password);
            setStatus('online');
            return true;
        } catch (e) {
            console.error("[Cloud] Login failed", e);
            setStatus('offline');
            return false;
        }
    },

    // Added to support App.tsx usage
    async silentLogin(userId: string, password?: string): Promise<void> {
        if (userId === 'guest') return;
        try {
            await account.get();
            setStatus('online');
        } catch {
            if (password) {
                const email = `${userId}@fiaos.app`;
                try {
                    await this.login(email, password);
                } catch {}
            }
        }
    },

    async restoreConnection() {
        if (isGuest()) return;
        try {
            await account.get();
            setStatus('online');
        } catch {
            // Do not fallback to anonymous session for registered users
            setStatus('offline');
        }
    },

    async logout() {
        try {
            await account.deleteSession('current');
            setStatus('offline');
        } catch(e) { console.warn("Logout error", e); }
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
            localStorage.setItem(cacheKey, JSON.stringify(config));
            return config;
        }

        // Fallback
        return JSON.parse(localStorage.getItem(cacheKey) || JSON.stringify(INITIAL_ADMIN_CONFIG));
    },

    async saveAdminConfig(config: AdminConfig) {
        localStorage.setItem('fiaos_global_admin_config', JSON.stringify(config));
        await docHelper.setState('admin_config', 'system', config);
    },

    listenToAdminConfig(callback: (config: AdminConfig) => void) {
        // Initial Local Load
        const local = localStorage.getItem('fiaos_global_admin_config');
        callback(local ? JSON.parse(local) : INITIAL_ADMIN_CONFIG);

        if (isGuest()) return () => {};

        // Fetch Fresh
        this.loadAdminConfig().then(cfg => {
            if (cfg) callback(cfg);
        });

        try {
            const unsub = client.subscribe(`databases.${DB_ID}.collections.${COL_STATES}.documents`, response => {
                if (response.events.includes('databases.*.collections.*.documents.*.update') || 
                    response.events.includes('databases.*.collections.*.documents.*.create')) {
                    
                    const payload = (response.payload as any);
                    if (payload.module === 'admin_config' && payload.profileKey === 'system') {
                        const data = JSON.parse(payload.payload);
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

    async adminForceLogout(targetUid: string) {
        const config = await this.loadAdminConfig() || INITIAL_ADMIN_CONFIG;
        
        if (!config.userStatus[targetUid]) {
            console.warn(`User ${targetUid} not found in config`);
            return false;
        }

        config.userStatus[targetUid].forceLogoutAt = Date.now();
        config.updatedAt = Date.now();
        
        await this.saveAdminConfig(config);
        return true;
    },

    async adminResetUser(targetUid: string) {
        try {
            await docHelper.setState('rewards', targetUid, null);
            await docHelper.setState('prefs', targetUid, null);
            await docHelper.setState('daily', targetUid, null);
            return true;
        } catch { return false; }
    },

    async adminGetData(targetUid: string, type: string) {
        let module = type;
        if (type === 'daily_state') module = 'daily';
        return await docHelper.getState(module, targetUid);
    },

    async adminSetData(targetUid: string, type: string, data: any) {
        let module = type;
        if (type === 'daily_state') module = 'daily';
        await docHelper.setState(module, targetUid, data);
    },

    // --- Rewards (Offline First) ---
    
    async loadRewards(targetUid?: string): Promise<UserRewardsData | null> {
        const uid = targetUid || getUid();
        const cacheKey = uid === 'guest' ? 'fiaos_rewards_guest' : `fiaos_rewards_${uid}`; 
        
        let data = null;
        if (!isGuest()) {
            data = await docHelper.getState('rewards', uid);
        }

        if (data) {
            localStorage.setItem(cacheKey, JSON.stringify(data));
            return data;
        }

        return JSON.parse(localStorage.getItem(cacheKey) || 'null');
    },

    async saveRewards(data: UserRewardsData, targetUid?: string) {
        const uid = targetUid || getUid();
        const cacheKey = uid === 'guest' ? 'fiaos_rewards_guest' : `fiaos_rewards_${uid}`;
        
        localStorage.setItem(cacheKey, JSON.stringify(data));
        await docHelper.setState('rewards', uid, data);
    },

    // --- Prefs (Offline First) ---

    async loadPrefs(): Promise<UserPrefs | null> {
        const uid = getUid();
        const legacyKey = `fiaos_user_${uid}_prefs`;

        let data = null;
        if (!isGuest()) {
            data = await docHelper.getState('prefs', uid);
        }

        if (data) {
            localStorage.setItem(legacyKey, JSON.stringify(data));
            return data;
        }
        return JSON.parse(localStorage.getItem(legacyKey) || 'null');
    },

    async savePrefs(data: UserPrefs) {
        const uid = getUid();
        const legacyKey = `fiaos_user_${uid}_prefs`;
        localStorage.setItem(legacyKey, JSON.stringify(data));
        await docHelper.setState('prefs', uid, data);
    },

    // --- Luna ---

    async loadLuna() {
        if (isGuest()) return JSON.parse(localStorage.getItem('fiaos_guest_luna_state') || 'null');
        return await docHelper.getState('luna', COUPLE_ID);
    },

    async updateLuna(patch: any) {
        if (isGuest()) {
            const cur = JSON.parse(localStorage.getItem('fiaos_guest_luna_state') || '{}');
            localStorage.setItem('fiaos_guest_luna_state', JSON.stringify({ ...cur, ...patch }));
            return;
        }
        const current = await this.loadLuna() || {};
        const updated = { ...current, ...patch };
        await docHelper.setState('luna', COUPLE_ID, updated);
    },

    // --- Diary ---

    async loadDiary() {
        const localKey = isGuest() ? 'fiaos_guest_diary' : 'fiaos_cached_diary';
        let items = [];

        if (!isGuest()) {
            try {
                const res = await databases.listDocuments(DB_ID, COL_DIARY, [
                    Query.orderDesc('createdAt'),
                    Query.limit(100)
                ]);
                items = res.documents.map(d => ({
                    id: d.$id,
                    userId: d.userId,
                    title: d.title,
                    text: d.text,
                    mood: d.mood,
                    createdAt: d.createdAt,
                    ...JSON.parse(d.payload || '{}')
                }));
                // Update Cache
                localStorage.setItem(localKey, JSON.stringify(items));
                setStatus('online');
                return items;
            } catch (e) {
                if (!isNetworkError(e)) console.error("Diary Load Error", e);
                setStatus('offline');
            }
        }

        return JSON.parse(localStorage.getItem(localKey) || '[]');
    },

    async saveDiaryEntry(entry: any) {
        const localKey = isGuest() ? 'fiaos_guest_diary' : 'fiaos_cached_diary';
        
        const local = JSON.parse(localStorage.getItem(localKey) || '[]');
        const idx = local.findIndex((e:any) => e.id === entry.id);
        if (idx >= 0) local[idx] = entry; else local.unshift(entry);
        localStorage.setItem(localKey, JSON.stringify(local));

        if (isGuest()) return;

        try {
            const payload = JSON.stringify({
                authorName: entry.authorName,
                scope: entry.scope
            });

            try {
                await databases.getDocument(DB_ID, COL_DIARY, entry.id);
                await databases.updateDocument(DB_ID, COL_DIARY, entry.id, {
                    title: entry.title,
                    text: entry.text,
                    mood: entry.mood,
                    payload
                });
            } catch {
                await databases.createDocument(DB_ID, COL_DIARY, entry.id, {
                    userId: getUid(),
                    title: entry.title,
                    text: entry.text,
                    mood: entry.mood,
                    createdAt: entry.createdAt,
                    payload
                });
            }
            setStatus('online');
        } catch (e) {
            if (!isNetworkError(e)) console.error("Diary Save Error", e);
            setStatus('offline');
        }
    },

    // --- Messages ---

    listenToMessages(callback: (msgs: any[]) => void) {
        const localKey = isGuest() ? 'fiaos_guest_messages' : 'fiaos_cached_messages';
        
        const cached = localStorage.getItem(localKey);
        if (cached) callback(JSON.parse(cached));

        if (isGuest()) return () => {};

        databases.listDocuments(DB_ID, COL_MESSAGES, [
            Query.orderDesc('createdAt'),
            Query.limit(50)
        ]).then(res => {
            const msgs = res.documents.map(d => ({
                id: d.$id,
                text: d.text,
                senderId: d.senderId,
                createdAt: d.createdAt
            })).reverse();
            localStorage.setItem(localKey, JSON.stringify(msgs));
            callback(msgs);
        }).catch(() => {});

        try {
            const unsub = client.subscribe(`databases.${DB_ID}.collections.${COL_MESSAGES}.documents`, res => {
                if (res.events.includes('databases.*.collections.*.documents.*.create')) {
                    databases.listDocuments(DB_ID, COL_MESSAGES, [
                        Query.orderDesc('createdAt'),
                        Query.limit(50)
                    ]).then(r => {
                        const msgs = r.documents.map(d => ({
                            id: d.$id,
                            text: d.text,
                            senderId: d.senderId,
                            createdAt: d.createdAt
                        })).reverse();
                        localStorage.setItem(localKey, JSON.stringify(msgs));
                        callback(msgs);
                    });
                }
            });
            return unsub;
        } catch (e) {
            return () => {};
        }
    },

    async sendMessage(text: string) {
        if (isGuest()) {
            const local = JSON.parse(localStorage.getItem('fiaos_guest_messages') || '[]');
            local.push({ text, senderId: 'guest', createdAt: Date.now() });
            localStorage.setItem('fiaos_guest_messages', JSON.stringify(local));
            return;
        }

        try {
            await databases.createDocument(DB_ID, COL_MESSAGES, ID.unique(), {
                senderId: getUid(),
                text,
                createdAt: Date.now()
            });
        } catch(e) { console.error("Send Error", e); }
    },

    // --- Vault ---

    async loadVault() {
        if (isGuest()) return JSON.parse(localStorage.getItem('fiaos_guest_vault') || '{"messages":[]}');
        try {
            const res = await databases.listDocuments(DB_ID, COL_VAULT, [Query.limit(100)]);
            const messages = res.documents.map(d => ({
                id: d.$id,
                title: d.title,
                body: d.body,
                lock: { type: d.lockType, unlockAt: d.unlockAt },
                openedAt: d.openedAt,
                createdAt: d.createdAt
            }));
            return { messages };
        } catch { return { messages: [] }; }
    },

    async saveVault(state: any) {
        if (isGuest()) {
            localStorage.setItem('fiaos_guest_vault', JSON.stringify(state));
            return;
        }
        if (!state.messages) return;
        for (const msg of state.messages) {
            try {
                await databases.updateDocument(DB_ID, COL_VAULT, msg.id, {
                    title: msg.title,
                    body: msg.body,
                    lockType: msg.lock.type,
                    unlockAt: msg.lock.unlockAt || 0,
                    openedAt: msg.openedAt || 0
                });
            } catch {
                try {
                    await databases.createDocument(DB_ID, COL_VAULT, msg.id, {
                        title: msg.title,
                        body: msg.body,
                        lockType: msg.lock.type,
                        unlockAt: msg.lock.unlockAt || 0,
                        openedAt: msg.openedAt || 0,
                        createdAt: msg.createdAt || Date.now()
                    });
                } catch (e) {}
            }
        }
    },

    // --- Bucket / Goals ---
    
    async loadBucket() {
        if (isGuest()) return JSON.parse(localStorage.getItem('fiaos_guest_bucket') || '{"items":[]}');
        return await docHelper.getState('bucket', COUPLE_ID);
    },

    async saveBucket(data: any) {
        if (isGuest()) {
            localStorage.setItem('fiaos_guest_bucket', JSON.stringify(data));
            return;
        }
        await docHelper.setState('bucket', COUPLE_ID, data);
    },

    // --- Daily (Offline First) ---

    async loadDailyState(targetUid?: string) {
        const uid = targetUid || getUid();
        const legacyKey = `fiaos_user_${uid}_daily_state`;

        let data = null;
        if (!isGuest()) {
            data = await docHelper.getState('daily', uid);
        }

        if (data) {
            localStorage.setItem(legacyKey, JSON.stringify(data));
            return data;
        }
        return JSON.parse(localStorage.getItem(legacyKey) || 'null');
    },

    async saveDailyState(data: any, targetUid?: string) {
        const uid = targetUid || getUid();
        const legacyKey = `fiaos_user_${uid}_daily_state`;
        
        localStorage.setItem(legacyKey, JSON.stringify(data));
        await docHelper.setState('daily', uid, data);
    },

    async getDailyShared(dateIso: string): Promise<string[]> {
        if (isGuest()) return [];
        const data: any = await docHelper.getState('daily_shared', dateIso);
        return data ? data.claims : [];
    },

    async addDailyClaim(dateIso: string, userId: string) {
        if (isGuest()) return;
        const data: any = await docHelper.getState('daily_shared', dateIso) || { claims: [] };
        if (!data.claims.includes(userId)) {
            data.claims.push(userId);
            await docHelper.setState('daily_shared', dateIso, data);
        }
    },

    // --- Games ---

    async saveHighscore(gameId: string, score: number) {
        if (isGuest()) return;
        const uid = getUid();
        const session = JSON.parse(localStorage.getItem('fiaos_session') || '{}');
        
        try {
            const q = [
                Query.equal('gameId', gameId),
                Query.equal('userId', uid)
            ];
            const res = await databases.listDocuments(DB_ID, COL_GAMES, q);
            
            if (res.documents.length > 0) {
                const doc = res.documents[0];
                if (doc.score < score) {
                    await databases.updateDocument(DB_ID, COL_GAMES, doc.$id, {
                        score,
                        updatedAt: Date.now()
                    });
                }
            } else {
                await databases.createDocument(DB_ID, COL_GAMES, ID.unique(), {
                    gameId,
                    userId: uid,
                    score,
                    displayName: session.name || 'User',
                    updatedAt: Date.now()
                });
            }
        } catch (e) { console.error("Score Save Error", e); }
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
    
    // --- Profile ---
    async loadProfile() {
        const uid = getUid();
        const legacyKey = `fiaos_user_${uid}_profile`;
        
        let data = null;
        if (!isGuest()) {
            data = await docHelper.getState('profile', uid);
        }
        
        if (data) {
            localStorage.setItem(legacyKey, JSON.stringify(data));
            return data;
        }
        return JSON.parse(localStorage.getItem(legacyKey) || 'null');
    },
    
    async saveProfile(data: any) {
        const uid = getUid();
        const legacyKey = `fiaos_user_${uid}_profile`;
        
        localStorage.setItem(legacyKey, JSON.stringify(data));
        await docHelper.setState('profile', uid, data);
    }
};
