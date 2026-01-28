
import { db, auth } from './firebase';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { UserRewardsData, AdminConfig } from '../types';

// Placeholder Emails for Silent Auth
const AUTH_MAP: Record<string, string> = {
    'fia': 'fia@fiaos.app', 
    'collin': 'collin@fiaos.app'
};

const COUPLE_ID = 'fia-collin';

// Default Admin Config (Fallback)
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
    
    // --- Auth Wrapper (Auto-Provisioning) ---
    async silentLogin(userId: string, password: string): Promise<boolean> {
        if (userId === 'guest') return true; // Local only
        
        const email = AUTH_MAP[userId];
        if (!email) return false;

        try {
            await signInWithEmailAndPassword(auth, email, password);
            return true;
        } catch (e: any) {
            // Fix: Auto-Create user if not found (First Run / Database Reset)
            if (e.code === 'auth/invalid-credential' || e.code === 'auth/user-not-found') {
                try {
                    console.log(`[Cloud] Creating new account for ${userId}...`);
                    const cred = await createUserWithEmailAndPassword(auth, email, password);
                    
                    // Init User Profile on creation
                    await setDoc(doc(db, 'users', userId), {
                        userId: userId,
                        role: userId === 'collin' ? 'admin' : 'user',
                        displayName: userId.charAt(0).toUpperCase() + userId.slice(1),
                        createdAt: serverTimestamp()
                    });
                    return true;
                } catch (createErr: any) {
                    console.warn(`[Cloud] Auto-creation failed:`, createErr.code);
                }
            }
            
            // Offline fallback
            const ignoredCodes = ['auth/network-request-failed', 'auth/internal-error'];
            if (ignoredCodes.includes(e.code)) {
                console.warn(`[Cloud] Login skipped (Offline/Network): ${e.code}`);
                return false; 
            }
            
            console.error("Cloud Auth Failed:", e);
            return false;
        }
    },

    // --- Admin Config (Global) ---
    async loadAdminConfig(): Promise<AdminConfig | null> {
        if (isGuest()) return null;
        try {
            const ref = doc(db, 'globals', 'system_config');
            const snap = await getDoc(ref);
            if (snap.exists()) return snap.data() as AdminConfig;
            
            // First run initialization
            await setDoc(ref, DEFAULT_ADMIN_CONFIG);
            return DEFAULT_ADMIN_CONFIG;
        } catch (e) {
            console.error("Failed to load Cloud Admin Config", e);
            return null;
        }
    },

    async saveAdminConfig(config: AdminConfig) {
        if (isGuest()) return;
        try {
            const ref = doc(db, 'globals', 'system_config');
            await setDoc(ref, config, { merge: true });
        } catch (e) {
            console.error("Failed to save Cloud Admin Config", e);
        }
    },

    // --- Rewards / Achievements ---
    async loadRewards(targetUid?: string): Promise<UserRewardsData | null> {
        const uid = targetUid || getUid();
        
        if (uid === 'guest') {
            try {
                const stored = localStorage.getItem(`fiaos_rewards_guest`);
                return stored ? JSON.parse(stored) : null;
            } catch { return null; }
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
            await setDoc(ref, data, { merge: true });
        } catch (e) {}
    },

    // --- Luna (Shared Couple State) ---
    async loadLuna() {
        if (isGuest()) {
            const raw = localStorage.getItem('fiaos_guest_luna_state');
            return raw ? JSON.parse(raw) : null;
        }
        
        try {
            const ref = doc(db, 'couples', COUPLE_ID, 'apps', 'luna');
            const snap = await getDoc(ref);
            if (snap.exists()) return snap.data();
            
            // Init Shared Luna
            const initial = {
                stats: { hunger: 50, energy: 50, hygiene: 50, fun: 50, love: 50 },
                mood: 'happy',
                lastActions: {},
                daily: { dayKey: new Date().toISOString().split('T')[0], fedToday: false, missedDays: 0 },
                streak: { count: 0 },
                history: []
            };
            await setDoc(ref, initial);
            return initial;
        } catch (e) { return null; }
    },

    async updateLuna(patch: any) {
        if (isGuest()) {
            const current = await this.loadLuna() || {};
            const updated = { ...current, ...patch };
            localStorage.setItem('fiaos_guest_luna_state', JSON.stringify(updated));
            return;
        }
        
        try {
            const ref = doc(db, 'couples', COUPLE_ID, 'apps', 'luna');
            await updateDoc(ref, patch); // Using updateDoc to verify existence
        } catch (e: any) {
            // If doc missing, full set
            if (e.code === 'not-found') {
                 const current = await this.loadLuna(); // Will create default
                 // Retry update not needed as loadLuna created it, next tick will sync
            }
        }
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
        if (isGuest()) {
            const k = `fiaos_guest_${getUid()}_diary`;
            return JSON.parse(localStorage.getItem(k) || '[]');
        }

        try {
            // Load user private + couple shared
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
            if (idx >= 0) list[idx] = entry;
            else list.push(entry);
            localStorage.setItem(`fiaos_guest_${getUid()}_diary`, JSON.stringify(list));
            return;
        }

        try {
            const path = entry.scope === 'shared' 
                ? `couples/${COUPLE_ID}/diary`
                : `users/${getUid()}/diary`;
                
            const docRef = doc(db, path, entry.id);
            await setDoc(docRef, entry, { merge: true });
        } catch(e) {}
    },

    async deleteDiaryEntry(id: string, scope: 'user' | 'shared') {
        // Implement delete if needed (omitted for brevity in v0.2)
        console.warn("Delete op: ", id, scope);
    },

    // --- Vault ---
    async loadVault() {
        if (isGuest()) {
            const k = `fiaos_vault_guest_${getUid()}`;
            return JSON.parse(localStorage.getItem(k) || '{"messages":[]}');
        }
        try {
            const ref = doc(db, 'couples', COUPLE_ID, 'apps', 'vault');
            const snap = await getDoc(ref);
            if (snap.exists()) return snap.data();
        } catch(e) {}
        return { messages: [] };
    },

    async saveVault(state: any) {
        if (isGuest()) {
            localStorage.setItem(`fiaos_vault_guest_${getUid()}`, JSON.stringify(state));
            return;
        }
        try {
            const ref = doc(db, 'couples', COUPLE_ID, 'apps', 'vault');
            await setDoc(ref, state);
        } catch(e) {}
    },

    // --- Games / Leaderboard ---
    async saveHighscore(gameId: string, score: number, extra: any = {}) {
        if (isGuest()) return;

        const uid = getUid();
        const ref = doc(db, 'leaderboards', gameId, 'scores', uid);
        
        try {
            const sessionName = JSON.parse(localStorage.getItem('fiaos_session') || '{}').name;
            await setDoc(ref, {
                score,
                ...extra,
                updatedAt: serverTimestamp(),
                uid,
                displayName: sessionName
            }, { merge: true });
        } catch (e) { }
    },

    async getLeaderboard(gameId: string) {
        if (isGuest()) return [];

        try {
            const q = query(collection(db, 'leaderboards', gameId, 'scores'), orderBy('score', 'desc'), limit(10));
            const snap = await getDocs(q);
            return snap.docs.map(d => d.data());
        } catch (e) { return []; }
    },

    // --- Profile & Settings ---
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
            await setDoc(ref, data, { merge: true });
        } catch (e) { }
    }
};
