
import { db, auth } from './firebase';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { UserRewardsData } from '../types';

// Placeholder Emails for Silent Auth
const AUTH_MAP: Record<string, string> = {
    'fia': 'fia@fiaos.app', 
    'collin': 'collin@fiaos.app'
};

const COUPLE_ID = 'fia-collin';

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
        if (userId === 'guest') return true; // Local only
        
        const email = AUTH_MAP[userId];
        if (!email) return false;

        try {
            await signInWithEmailAndPassword(auth, email, password);
            return true;
        } catch (e: any) {
            // Gracefully handle auth errors for smoother offline/dev experience
            // This prevents "Cloud Auth Failed" spam when credentials don't match or users don't exist in FB yet.
            const ignoredCodes = ['auth/invalid-credential', 'auth/user-not-found', 'auth/invalid-email', 'auth/internal-error'];
            if (ignoredCodes.includes(e.code)) {
                console.warn(`[Cloud] Silent login skipped: ${e.code}. Running in offline mode.`);
                return false;
            }
            console.error("Cloud Auth Failed:", e);
            return false;
        }
    },

    // --- Rewards / Achievements ---
    async loadRewards(targetUid?: string): Promise<UserRewardsData | null> {
        const uid = targetUid || getUid();
        
        // Guest / Local Mode
        if (uid === 'guest') {
            try {
                const stored = localStorage.getItem(`fiaos_rewards_guest`);
                return stored ? JSON.parse(stored) : null;
            } catch { return null; }
        }

        // Cloud Mode
        try {
            const ref = doc(db, `users/${uid}/data/rewards`);
            const snap = await getDoc(ref);
            return snap.exists() ? snap.data() as UserRewardsData : null;
        } catch (e) {
            // console.warn("Rewards Load Error (Offline?)", e);
            return null;
        }
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
        } catch (e) {
            // Silent fail for offline
        }
    },

    // --- Luna (Shared State) ---
    async loadLuna() {
        if (isGuest()) {
            const raw = localStorage.getItem('fiaos_guest_luna_state');
            return raw ? JSON.parse(raw) : null;
        }
        
        try {
            const ref = doc(db, 'couples', COUPLE_ID, 'apps', 'luna');
            const snap = await getDoc(ref);
            if (snap.exists()) return snap.data();
            
            // Init if missing
            const initial = {
                stats: { hunger: 50, energy: 50, hygiene: 50, fun: 50, love: 50 },
                mood: 'happy',
                lastActions: {},
                daily: { dayKey: new Date().toISOString().split('T')[0], fedToday: false, missedDays: 0 },
                streak: { count: 0 },
                history: []
            };
            // Try to create it, but catch if permission denied or offline
            try { await setDoc(ref, initial); } catch(e) {}
            return initial;
        } catch (e) {
            return null;
        }
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
            await updateDoc(ref, patch);
        } catch (e) {}
    },

    async addLunaHistory(item: any) {
        const current = await this.loadLuna();
        const history = current?.history || [];
        history.unshift(item);
        // Keep last 50
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
            const q = query(collection(db, `users/${getUid()}/diary`), orderBy('createdAt', 'desc'));
            const snap = await getDocs(q);
            const userEntries = snap.docs.map(d => ({ id: d.id, ...d.data() }));

            const qShared = query(collection(db, `couples/${COUPLE_ID}/diary`), orderBy('createdAt', 'desc'));
            const snapShared = await getDocs(qShared);
            const sharedEntries = snapShared.docs.map(d => ({ id: d.id, ...d.data(), scope: 'shared' }));

            // Merge and sort
            const all = [...userEntries, ...sharedEntries];
            return all.sort((a: any, b: any) => b.createdAt - a.createdAt);
        } catch (e) {
            return [];
        }
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
        if (isGuest()) {
            let list = await this.loadDiary();
            list = list.filter((e: any) => e.id !== id);
            localStorage.setItem(`fiaos_guest_${getUid()}_diary`, JSON.stringify(list));
            return;
        }
        console.warn("Delete not implemented in v0.3 adapter");
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
            await setDoc(ref, {
                score,
                ...extra,
                updatedAt: serverTimestamp(),
                uid,
                displayName: JSON.parse(localStorage.getItem('fiaos_session') || '{}').name
            }, { merge: true });
        } catch (e) { }
    },

    async getLeaderboard(gameId: string) {
        if (isGuest()) return [];

        try {
            const q = query(collection(db, 'leaderboards', gameId, 'scores'), orderBy('score', 'desc'), limit(10));
            const snap = await getDocs(q);
            return snap.docs.map(d => d.data());
        } catch (e) {
            return [];
        }
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
