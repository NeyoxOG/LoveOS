
import { db, auth } from './firebase';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, orderBy, limit, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { UserRewardsData, AdminConfig } from '../types';
import { USERS } from '../constants';

// Placeholder Emails for Silent Auth
const AUTH_MAP: Record<string, string> = {
    'fia': 'fia@fiaos.app', 
    'collin': 'collin@fiaos.app'
};

const COUPLE_ID = 'fia-collin';

// Default Admin Config
const DEFAULT_ADMIN_CONFIG: AdminConfig = {
  appVisibility: {
    luna: true, rewards: true, settings: true, valentine: true, 
    vault: true, admin: true, messages: true, achievements: true, 
    games: true, diary: true, daily: true, love: true
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

// Helper: Deep Sanitize to remove undefined (Firestore rejects undefined)
const sanitize = (obj: any): any => {
    if (obj === undefined) return null;
    if (obj === null) return null;
    if (typeof obj !== 'object') return obj;
    
    // Handle Arrays
    if (Array.isArray(obj)) {
        return obj.map(sanitize);
    }
    
    // Handle Objects
    const newObj: any = {};
    for (const key in obj) {
        const val = obj[key];
        if (val === undefined) {
            newObj[key] = null;
        } else {
            newObj[key] = sanitize(val);
        }
    }
    return newObj;
};

// Helper to determine mode
const isGuest = () => {
    try {
        const sessionStr = localStorage.getItem('fiaos_session');
        if (!sessionStr) return true;
        const session = JSON.parse(sessionStr);
        return session.role === 'guest';
    } catch { return true; }
};

const getUid = () => {
    try {
        const sessionStr = localStorage.getItem('fiaos_session');
        if (!sessionStr) return 'guest';
        return JSON.parse(sessionStr).userId;
    } catch { return 'guest'; }
};

// --- Cloud Adapter API ---

export const cloud = {
    
    // --- Auth Wrapper ---
    async silentLogin(userId: string, password: string): Promise<boolean> {
        if (userId === 'guest') return true; 
        
        const email = AUTH_MAP[userId];
        if (!email) return false;

        try {
            await signInWithEmailAndPassword(auth, email, password);
            console.log(`[Cloud] Connected as ${userId}`);
            return true;
        } catch (e: any) {
            // Attempt Auto-Creation if user missing
            if (e.code === 'auth/invalid-credential' || e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password') {
                try {
                    console.log(`[Cloud] User ${userId} missing. Creating account...`);
                    await createUserWithEmailAndPassword(auth, email, password);
                    
                    // Init Profile
                    await setDoc(doc(db, 'users', userId), sanitize({
                        userId: userId,
                        role: userId === 'collin' ? 'admin' : 'user',
                        displayName: userId.charAt(0).toUpperCase() + userId.slice(1),
                        createdAt: serverTimestamp()
                    }));
                    
                    console.log(`[Cloud] Account created for ${userId}`);
                    return true;
                } catch (createErr: any) {
                    console.error(`[Cloud] Creation failed:`, createErr.code);
                }
            }
            console.warn(`[Cloud] Login skipped: ${e.code}`);
            return false;
        }
    },

    async restoreConnection() {
        if (auth.currentUser) return; 
        if (isGuest()) return;

        const uid = getUid();
        const userConfig = USERS.find(u => u.id === uid);
        
        if (userConfig && userConfig.password) {
            await this.silentLogin(uid, userConfig.password);
        }
    },

    // --- Admin Config ---
    async loadAdminConfig(): Promise<AdminConfig | null> {
        if (isGuest()) return null;
        try {
            const ref = doc(db, 'globals', 'system_config');
            const snap = await getDoc(ref);
            if (snap.exists()) return snap.data() as AdminConfig;
            
            await setDoc(ref, sanitize(DEFAULT_ADMIN_CONFIG));
            return DEFAULT_ADMIN_CONFIG;
        } catch (e) { return null; }
    },

    async saveAdminConfig(config: AdminConfig) {
        if (isGuest()) return;
        try {
            const ref = doc(db, 'globals', 'system_config');
            await setDoc(ref, sanitize(config), { merge: true });
        } catch (e) { console.error("Config Save Error", e); }
    },

    // --- Rewards ---
    async loadRewards(targetUid?: string): Promise<UserRewardsData | null> {
        const uid = targetUid || getUid();
        if (uid === 'guest') {
            const stored = localStorage.getItem(`fiaos_rewards_guest`);
            return stored ? JSON.parse(stored) : null;
        }
        try {
            const ref = doc(db, `users/${uid}/data/rewards`);
            const snap = await getDoc(ref);
            return snap.exists() ? snap.data() as UserRewardsData : null;
        } catch (e) { return null; }
    },

    async saveRewards(data: UserRewardsData, targetUid?: string) {
        const uid = targetUid || getUid();
        if (uid === 'guest') {
            localStorage.setItem(`fiaos_rewards_guest`, JSON.stringify(data));
            return;
        }
        try {
            const ref = doc(db, `users/${uid}/data/rewards`);
            await setDoc(ref, sanitize(data), { merge: true });
        } catch (e) {}
    },

    // --- Daily (Shared State for Couple Bonus) ---
    async getDailyShared(dateIso: string): Promise<string[]> {
        if (isGuest()) return [];
        try {
            const ref = doc(db, 'couples', COUPLE_ID, 'daily', dateIso);
            const snap = await getDoc(ref);
            if (snap.exists()) {
                return snap.data().claims || [];
            }
            return [];
        } catch (e) { return []; }
    },

    async addDailyClaim(dateIso: string, userId: string) {
        if (isGuest()) return;
        try {
            const ref = doc(db, 'couples', COUPLE_ID, 'daily', dateIso);
            const snap = await getDoc(ref);
            let claims: string[] = [];
            
            if (snap.exists()) {
                claims = snap.data().claims || [];
            }
            
            if (!claims.includes(userId)) {
                claims.push(userId);
                await setDoc(ref, { claims }, { merge: true });
            }
        } catch (e) { console.error("Daily sync failed", e); }
    },

    // --- Luna (Shared) ---
    async loadLuna() {
        if (isGuest()) return JSON.parse(localStorage.getItem('fiaos_guest_luna_state') || 'null');
        
        try {
            const ref = doc(db, 'couples', COUPLE_ID, 'apps', 'luna');
            const snap = await getDoc(ref);
            if (snap.exists()) return snap.data();
            
            const initial = {
                stats: { hunger: 50, energy: 50, hygiene: 50, fun: 50, love: 50 },
                mood: 'happy',
                lastActions: {},
                daily: { dayKey: new Date().toISOString().split('T')[0], fedToday: false, missedDays: 0 },
                streak: { count: 0 },
                history: []
            };
            await setDoc(ref, sanitize(initial));
            return initial;
        } catch (e) { return null; }
    },

    async updateLuna(patch: any) {
        if (isGuest()) {
            const cur = JSON.parse(localStorage.getItem('fiaos_guest_luna_state') || '{}');
            localStorage.setItem('fiaos_guest_luna_state', JSON.stringify({ ...cur, ...patch }));
            return;
        }
        try {
            const ref = doc(db, 'couples', COUPLE_ID, 'apps', 'luna');
            await setDoc(ref, sanitize(patch), { merge: true });
        } catch (e) {}
    },

    async addLunaHistory(item: any) {
        const current = await this.loadLuna();
        const history = current?.history || [];
        history.unshift(item);
        const trimmed = history.slice(0, 50);
        await this.updateLuna({ history: trimmed });
    },

    // --- Diary ---
    async loadDiary() {
        if (isGuest()) return JSON.parse(localStorage.getItem(`fiaos_guest_${getUid()}_diary`) || '[]');

        try {
            const q = query(collection(db, `users/${getUid()}/diary`), orderBy('createdAt', 'desc'));
            const snap = await getDocs(q);
            const userEntries = snap.docs.map(d => ({ id: d.id, ...d.data() }));

            const qShared = query(collection(db, `couples/${COUPLE_ID}/diary`), orderBy('createdAt', 'desc'));
            const snapShared = await getDocs(qShared);
            const sharedEntries = snapShared.docs.map(d => ({ id: d.id, ...d.data(), scope: 'shared' }));

            const all = [...userEntries, ...sharedEntries];
            return all.sort((a: any, b: any) => b.createdAt - a.createdAt);
        } catch (e) { return []; }
    },

    async saveDiaryEntry(entry: any) {
        if (isGuest()) {
            const list = await this.loadDiary();
            const idx = list.findIndex((e: any) => e.id === entry.id);
            if (idx >= 0) list[idx] = entry; else list.push(entry);
            localStorage.setItem(`fiaos_guest_${getUid()}_diary`, JSON.stringify(list));
            return;
        }

        try {
            const path = entry.scope === 'shared' 
                ? `couples/${COUPLE_ID}/diary`
                : `users/${getUid()}/diary`;
                
            const docRef = doc(db, path, entry.id);
            await setDoc(docRef, sanitize(entry), { merge: true });
        } catch(e) { console.error("Diary save failed", e); }
    },

    async deleteDiaryEntry(id: string, scope: 'user' | 'shared') {
        // Implement if needed
    },

    // --- Vault ---
    async loadVault() {
        if (isGuest()) return JSON.parse(localStorage.getItem(`fiaos_vault_guest_${getUid()}`) || '{"messages":[]}');
        try {
            const ref = doc(db, 'couples', COUPLE_ID, 'apps', 'vault');
            const snap = await getDoc(ref);
            if (snap.exists()) {
                const data = snap.data();
                if (!data.messages) data.messages = [];
                return data;
            }
            return { messages: [] };
        } catch(e) { 
            console.warn("Vault load error", e);
            return { messages: [] }; 
        }
    },

    async saveVault(state: any) {
        if (isGuest()) {
            localStorage.setItem(`fiaos_vault_guest_${getUid()}`, JSON.stringify(state));
            return;
        }
        try {
            const ref = doc(db, 'couples', COUPLE_ID, 'apps', 'vault');
            await setDoc(ref, sanitize(state));
        } catch(e) { console.error("Vault save failed", e); }
    },

    // --- Games ---
    async saveHighscore(gameId: string, score: number, extra: any = {}) {
        if (isGuest()) return;

        const uid = getUid();
        const ref = doc(db, 'leaderboards', gameId, 'scores', uid);
        
        try {
            const sessionName = JSON.parse(localStorage.getItem('fiaos_session') || '{}').name;
            await setDoc(ref, sanitize({
                score,
                ...extra,
                updatedAt: serverTimestamp(),
                uid,
                displayName: sessionName
            }), { merge: true });
        } catch (e) { console.warn("Score save failed", e); }
    },

    async getLeaderboard(gameId: string) {
        if (isGuest()) return [];
        try {
            const sortDir = gameId === 'puzzle' ? 'asc' : 'desc';
            const q = query(collection(db, 'leaderboards', gameId, 'scores'), orderBy('score', sortDir), limit(10));
            const snap = await getDocs(q);
            return snap.docs.map(d => d.data());
        } catch (e) { return []; }
    },

    // --- Profile ---
    async loadProfile() {
        if (isGuest()) return null;
        try {
            const ref = doc(db, 'users', getUid());
            const snap = await getDoc(ref);
            return snap.exists() ? snap.data() : null;
        } catch { return null; }
    },

    async saveProfile(data: any) {
        if (isGuest()) return;
        try {
            const ref = doc(db, 'users', getUid());
            await setDoc(ref, sanitize(data), { merge: true });
        } catch (e) { }
    }
};
