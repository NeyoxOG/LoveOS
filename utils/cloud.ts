
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

const isGuest = () => getUid() === 'guest';

// --- Cloud State Management ---

let cloudStatus: 'online' | 'offline' | 'syncing' = 'offline';
let statusListeners: ((s: string) => void)[] = [];

const setStatus = (s: 'online' | 'offline' | 'syncing') => {
    if (cloudStatus !== s) {
        cloudStatus = s;
        statusListeners.forEach(cb => cb(s));
    }
};

const isNetworkError = (e: any) => {
    // Appwrite SDK often returns objects with code 0 for network issues
    if (e?.code === 0) return true;
    const msg = e?.message || '';
    // Common fetch/network error messages
    return (
        msg === 'Load failed' || 
        msg === 'Network request failed' || 
        msg.includes('offline') || 
        msg.includes('Failed to fetch') ||
        msg.includes('NetworkError') ||
        e instanceof TypeError // Fetch failures often return TypeError
    );
};

// --- Document ID Cache (Optimization) ---
// Maps "module:profileKey" -> "documentId" to avoid repetitive listDocuments queries
const _docIdCache = new Map<string, string>();

// --- Helper: State Manager (The Core Logic) ---
// Handles the "Key-Value" store pattern used for Prefs, Rewards, etc.

const stateManager = {
    getKey(module: string, profileKey: string) {
        return `${module}:${profileKey}`;
    },

    async get<T>(module: string, profileKey: string, fallback: T): Promise<T> {
        // 1. Guest / Offline Mode: Use LocalStorage
        if (isGuest()) {
            const local = localStorage.getItem(`fiaos_guest_${module}_${profileKey}`);
            return local ? JSON.parse(local) : fallback;
        }

        // 2. Cloud Mode
        try {
            const cacheKey = this.getKey(module, profileKey);
            let docId = _docIdCache.get(cacheKey);
            let doc;

            if (docId) {
                // Fast path: We know the ID
                doc = await databases.getDocument(DB_ID, COL_STATES, docId);
            } else {
                // Slow path: Search for it
                const q = [
                    Query.equal('module', module),
                    Query.equal('profileKey', profileKey)
                ];
                const res = await databases.listDocuments(DB_ID, COL_STATES, q);
                if (res.documents.length > 0) {
                    doc = res.documents[0];
                    _docIdCache.set(cacheKey, doc.$id);
                }
            }

            if (doc) {
                setStatus('online');
                // Cache locally for offline fallback later
                const data = JSON.parse(doc.payload);
                localStorage.setItem(`fiaos_cache_${module}_${profileKey}`, JSON.stringify(data));
                return data;
            }
        } catch (e) {
            // Suppress network errors to avoid console noise
            if (!isNetworkError(e)) {
                // 404 is normal for first time load
                if (e.code !== 404) console.warn(`[Cloud] GetState Error ${module}:`, e.message);
            }
            setStatus('offline');
            
            // Try offline cache for logged-in user
            const cached = localStorage.getItem(`fiaos_cache_${module}_${profileKey}`);
            if (cached) return JSON.parse(cached);
        }

        return fallback;
    },

    async set(module: string, profileKey: string, data: any) {
        // 1. Guest / Offline Mode
        if (isGuest()) {
            localStorage.setItem(`fiaos_guest_${module}_${profileKey}`, JSON.stringify(data));
            return;
        }

        setStatus('syncing');
        try {
            const payload = JSON.stringify(data);
            const updatedAt = new Date().toISOString();
            const cacheKey = this.getKey(module, profileKey);
            
            // Update Local Cache immediately
            localStorage.setItem(`fiaos_cache_${module}_${profileKey}`, payload);

            let docId = _docIdCache.get(cacheKey);

            if (docId) {
                // Fast Update
                await databases.updateDocument(DB_ID, COL_STATES, docId, { payload, updatedAt });
            } else {
                // Check existance if ID not cached (Race condition safety)
                const q = [
                    Query.equal('module', module),
                    Query.equal('profileKey', profileKey)
                ];
                const res = await databases.listDocuments(DB_ID, COL_STATES, q);

                if (res.documents.length > 0) {
                    docId = res.documents[0].$id;
                    _docIdCache.set(cacheKey, docId);
                    await databases.updateDocument(DB_ID, COL_STATES, docId, { payload, updatedAt });
                } else {
                    // Create New
                    const newDoc = await databases.createDocument(DB_ID, COL_STATES, ID.unique(), {
                        module,
                        profileKey,
                        payload,
                        updatedAt
                    });
                    _docIdCache.set(cacheKey, newDoc.$id);
                }
            }
            setStatus('online');
        } catch (e) {
            if (!isNetworkError(e)) console.error(`[Cloud] SetState Error ${module}:`, e);
            setStatus('offline');
        }
    }
};

// --- Public Cloud API ---

export const cloud = {
    
    getMode() { return isGuest() ? 'local' : 'cloud'; },

    onStatusChange(cb: (s: string) => void) {
        statusListeners.push(cb);
        cb(cloudStatus);
        return () => { statusListeners = statusListeners.filter(l => l !== cb); };
    },

    // --- Auth ---
    
    async login(email: string, password: string): Promise<boolean> {
        try {
            try { await account.deleteSession('current'); } catch {}
            await account.createEmailPasswordSession(email, password);
            setStatus('online');
            // Clear caches on login to ensure fresh data
            _docIdCache.clear();
            return true;
        } catch (e) {
            // Completely silent failure for hybrid mode
            // We don't want to alert the user if they are just logging in locally
            // and the backend happens to be down or unconfigured.
            setStatus('offline');
            return false;
        }
    },

    async silentLogin(userId: string, password?: string): Promise<void> {
        if (userId === 'guest') return;
        try {
            await account.get();
            setStatus('online');
        } catch {
            if (password) {
                const email = `${userId}@fiaos.app`;
                try { await this.login(email, password); } catch {}
            }
        }
    },

    async restoreConnection() {
        if (isGuest()) return;
        try {
            await account.get();
            setStatus('online');
        } catch {
            setStatus('offline');
        }
    },

    async logout() {
        try {
            await account.deleteSession('current');
            _docIdCache.clear();
            setStatus('offline');
        } catch(e) { /* Ignore logout errors */ }
    },

    // --- Admin Config ---
    
    async loadAdminConfig(): Promise<AdminConfig> {
        return await stateManager.get<AdminConfig>('admin_config', 'system', INITIAL_ADMIN_CONFIG);
    },

    async saveAdminConfig(config: AdminConfig) {
        await stateManager.set('admin_config', 'system', config);
    },

    listenToAdminConfig(callback: (config: AdminConfig) => void) {
        // Initial load
        this.loadAdminConfig().then(callback);

        if (isGuest()) return () => {};

        try {
            const unsub = client.subscribe(`databases.${DB_ID}.collections.${COL_STATES}.documents`, response => {
                const payload = (response.payload as any);
                if (payload.module === 'admin_config' && payload.profileKey === 'system') {
                    try {
                        const data = JSON.parse(payload.payload);
                        callback(data);
                    } catch {}
                }
            });
            return unsub;
        } catch { return () => {}; }
    },

    async adminForceLogout(targetUid: string) {
        const config = await this.loadAdminConfig();
        if (config.userStatus[targetUid]) {
            config.userStatus[targetUid].forceLogoutAt = Date.now();
            config.updatedAt = Date.now();
            await this.saveAdminConfig(config);
            return true;
        }
        return false;
    },

    async adminResetUser(targetUid: string) {
        try {
            // Nullifying resets them to default on next load due to fallback logic
            await stateManager.set('rewards', targetUid, null);
            await stateManager.set('prefs', targetUid, null);
            await stateManager.set('daily', targetUid, null);
            return true;
        } catch { return false; }
    },

    async adminGetData(targetUid: string, type: string) {
        let module = type;
        if (type === 'daily_state') module = 'daily';
        return await stateManager.get(module, targetUid, null);
    },

    async adminSetData(targetUid: string, type: string, data: any) {
        let module = type;
        if (type === 'daily_state') module = 'daily';
        await stateManager.set(module, targetUid, data);
    },

    // --- Rewards (Crucial: Merge Logic) ---
    
    async loadRewards(targetUid?: string): Promise<UserRewardsData> {
        const uid = targetUid || getUid();
        return await stateManager.get<UserRewardsData>('rewards', uid, INITIAL_REWARDS_DATA);
    },

    async saveRewards(newData: UserRewardsData, targetUid?: string) {
        const uid = targetUid || getUid();
        await stateManager.set('rewards', uid, newData);
    },

    // --- User Prefs & Profile ---

    async loadPrefs(): Promise<UserPrefs> {
        const uid = getUid();
        return await stateManager.get<UserPrefs>('prefs', uid, INITIAL_USER_PREFS);
    },

    async savePrefs(data: UserPrefs) {
        await stateManager.set('prefs', getUid(), data);
    },

    async loadProfile(): Promise<UserProfile> {
        const uid = getUid();
        // We need a session object to create default profile
        const sessionStr = localStorage.getItem('fiaos_session');
        const session = sessionStr ? JSON.parse(sessionStr) : { userId: uid, name: 'User', role: 'user' };
        
        return await stateManager.get<UserProfile>('profile', uid, createDefaultProfile(session));
    },
    
    async saveProfile(data: UserProfile) {
        await stateManager.set('profile', getUid(), data);
    },

    // --- Luna ---

    async loadLuna() {
        return await stateManager.get('luna', COUPLE_ID, { stats: { hunger: 50, love: 50, energy: 80 }, isSleeping: false });
    },

    async updateLuna(patch: any) {
        const current = await this.loadLuna();
        const updated = { ...current, ...patch };
        await stateManager.set('luna', COUPLE_ID, updated);
    },

    // --- Daily ---

    async loadDailyState(targetUid?: string) {
        const uid = targetUid || getUid();
        return await stateManager.get('daily', uid, createDefaultDailyState(uid));
    },

    async saveDailyState(data: any, targetUid?: string) {
        const uid = targetUid || getUid();
        await stateManager.set('daily', uid, data);
    },

    async getDailyShared(dateIso: string): Promise<string[]> {
        const data: any = await stateManager.get('daily_shared', dateIso, { claims: [] });
        return data.claims;
    },

    async addDailyClaim(dateIso: string, userId: string) {
        if (isGuest()) return;
        const data: any = await stateManager.get('daily_shared', dateIso, { claims: [] });
        if (!data.claims.includes(userId)) {
            data.claims.push(userId);
            await stateManager.set('daily_shared', dateIso, data);
        }
    },

    // --- Bucket List ---
    
    async loadBucket() {
        return await stateManager.get('bucket', COUPLE_ID, { items: [] });
    },

    async saveBucket(data: any) {
        await stateManager.set('bucket', COUPLE_ID, data);
    },

    // --- Diary (Collection based) ---

    async loadDiary() {
        if (isGuest()) return JSON.parse(localStorage.getItem('fiaos_guest_diary') || '[]');

        try {
            const res = await databases.listDocuments(DB_ID, COL_DIARY, [
                Query.orderDesc('createdAt'),
                Query.limit(100)
            ]);
            const items = res.documents.map(d => ({
                id: d.$id,
                userId: d.userId,
                title: d.title,
                text: d.text,
                mood: d.mood,
                createdAt: d.createdAt,
                ...JSON.parse(d.payload || '{}')
            }));
            setStatus('online');
            return items;
        } catch (e) {
            if (!isNetworkError(e)) console.error("Diary Load Error", e);
            setStatus('offline');
            return [];
        }
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
            const payload = JSON.stringify({
                authorName: entry.authorName,
                scope: entry.scope
            });

            // Optimistically we try update, if fails (404), create
            // But strict check is safer for data integrity
            try {
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
        if (isGuest()) {
            const local = JSON.parse(localStorage.getItem('fiaos_guest_messages') || '[]');
            callback(local);
            return () => {};
        }

        const fetch = () => {
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
                callback(msgs);
            }).catch(() => {});
        };

        fetch(); // Initial

        try {
            const unsub = client.subscribe(`databases.${DB_ID}.collections.${COL_MESSAGES}.documents`, res => {
                if (res.events.includes('databases.*.collections.*.documents.*.create')) {
                    fetch();
                }
            });
            return unsub;
        } catch { return () => {}; }
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
        } catch(e) { 
            if (!isNetworkError(e)) console.error("Send Error", e); 
        }
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

    // --- Games Highscores ---

    async saveHighscore(gameId: string, score: number) {
        if (isGuest()) return;
        const uid = getUid();
        const session = JSON.parse(localStorage.getItem('fiaos_session') || '{}');
        
        try {
            // Find existing score
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
        } catch (e) { 
            if (!isNetworkError(e)) console.error("Score Save Error", e); 
        }
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
    }
};
