
import { db, auth } from './firebase';
import { doc, getDoc, setDoc, updateDoc, collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Session, User, UserRewardsData } from '../types';

// Placeholder Emails for Silent Auth
const AUTH_MAP: Record<string, string> = {
    'fia': 'fia@fiaos.app', // TODO: Replace with real emails in Firebase Console
    'collin': 'collin@fiaos.app'
};

const COUPLE_ID = 'fia-collin';

// Helper to determine mode
const isGuest = () => {
    const sessionStr = localStorage.getItem('fiaos_session');
    if (!sessionStr) return true;
    const session = JSON.parse(sessionStr);
    return session.role === 'guest';
};

const getUid = () => {
    const sessionStr = localStorage.getItem('fiaos_session');
    if (!sessionStr) return 'guest';
    return JSON.parse(sessionStr).userId;
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
        } catch (e) {
            console.error("Cloud Auth Failed:", e);
            return false;
        }
    },

    // --- Rewards / Achievements ---
    async loadRewards(targetUid?: string): Promise<UserRewardsData | null> {
        const uid = targetUid || getUid();
        
        // Check if guest (either by targetUid 'guest' or current session if no target provided)
        if (uid === 'guest') {
            const stored = localStorage.getItem(`fiaos_rewards_guest`);
            return stored ? JSON.parse(stored) : null;
        }

        try {
            const ref = doc(db, `users/${uid}/data/rewards`);
            const snap = await getDoc(ref);
            return snap.exists() ? snap.data() as UserRewardsData : null;
        } catch (e) {
            console.error("Rewards Load Error", e);
            return null;
        }
    },

    async saveRewards(data: UserRewardsData, targetUid?: string) {
        const uid = targetUid || getUid();
        
        if (uid === 'guest') {
            localStorage.setItem(`fiaos_rewards_guest`, JSON.stringify(data));
            return;
        }
        
        const ref = doc(db, `users/${uid}/data/rewards`);
        await setDoc(ref, data, { merge: true });
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
            await setDoc(ref, initial);
            return initial;
        } catch (e) {
            console.error("Luna Load Error", e);
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
        
        const ref = doc(db, 'couples', COUPLE_ID, 'apps', 'luna');
        await updateDoc(ref, patch);
    },

    async addLunaHistory(item: any) {
        const current = await this.loadLuna();
        let history = current.history || [];
        history.unshift(item);
        if (history.length > 50) history = history.slice(0, 50);
        await this.updateLuna({ history });
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

            return [...userEntries, ...sharedEntries].sort((a: any, b: any) => b.createdAt - a.createdAt);
        } catch (e) {
            console.error("Diary Load Error", e);
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

        const path = entry.scope === 'shared' 
            ? `couples/${COUPLE_ID}/diary`
            : `users/${getUid()}/diary`;
            
        const docRef = doc(db, path, entry.id);
        await setDoc(docRef, entry, { merge: true });
    },

    async deleteDiaryEntry(id: string, scope: 'user' | 'shared') {
        if (isGuest()) {
            let list = await this.loadDiary();
            list = list.filter((e: any) => e.id !== id);
            localStorage.setItem(`fiaos_guest_${getUid()}_diary`, JSON.stringify(list));
            return;
        }
        console.warn("Delete not fully implemented in v0.3 adapter");
    },

    // --- Vault ---
    async loadVault() {
        if (isGuest()) {
            const k = `fiaos_vault_guest_${getUid()}`;
            return JSON.parse(localStorage.getItem(k) || '{"messages":[]}');
        }
        const ref = doc(db, 'couples', COUPLE_ID, 'apps', 'vault');
        const snap = await getDoc(ref);
        if (snap.exists()) return snap.data();
        return { messages: [] };
    },

    async saveVault(state: any) {
        if (isGuest()) {
            localStorage.setItem(`fiaos_vault_guest_${getUid()}`, JSON.stringify(state));
            return;
        }
        const ref = doc(db, 'couples', COUPLE_ID, 'apps', 'vault');
        await setDoc(ref, state);
    },

    // --- Games / Leaderboard ---
    async saveHighscore(gameId: string, score: number, extra: any = {}) {
        if (isGuest()) return;

        const uid = getUid();
        const ref = doc(db, 'leaderboards', gameId, 'scores', uid);
        
        await setDoc(ref, {
            score,
            ...extra,
            updatedAt: serverTimestamp(),
            uid,
            displayName: JSON.parse(localStorage.getItem('fiaos_session') || '{}').name
        }, { merge: true });
    },

    async getLeaderboard(gameId: string) {
        if (isGuest()) return [];

        const q = query(collection(db, 'leaderboards', gameId, 'scores'), orderBy('score', 'desc'), limit(10));
        const snap = await getDocs(q);
        return snap.docs.map(d => d.data());
    },

    // --- Profile & Settings ---
    async loadProfile() {
        if (isGuest()) return null;
        const ref = doc(db, 'users', getUid());
        const snap = await getDoc(ref);
        return snap.exists() ? snap.data() : null;
    },

    async saveProfile(data: any) {
        if (isGuest()) return;
        const ref = doc(db, 'users', getUid());
        await setDoc(ref, data, { merge: true });
    }
};
