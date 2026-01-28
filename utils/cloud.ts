
import { db, auth } from './firebase';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, orderBy, limit, serverTimestamp, addDoc, onSnapshot } from 'firebase/firestore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { UserRewardsData, AdminConfig, UserPrefs } from '../types';
import { USERS } from '../constants';

const AUTH_MAP: Record<string, string> = {
    'fia': 'fia@fiaos.app', 
    'collin': 'collin@fiaos.app'
};

const COUPLE_ID = 'fia-collin';

const DEFAULT_ADMIN_CONFIG: AdminConfig = {
  appVisibility: {
    luna: true, rewards: true, settings: true, valentine: true, 
    vault: true, admin: true, messages: true, achievements: true, 
    games: true, diary: true, daily: true, love: true, rewards_app: true
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

// --- Helper: Deep Sanitize (Fixes "Invalid Argument" crashes) ---
const sanitize = (obj: any): any => {
    if (obj === undefined) return null;
    if (obj === null) return null;
    if (typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(sanitize);
    
    const newObj: any = {};
    for (const key in obj) {
        const val = obj[key];
        newObj[key] = (val === undefined) ? null : sanitize(val);
    }
    return newObj;
};

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
    
    // --- Auth ---
    async silentLogin(userId: string, password: string): Promise<boolean> {
        if (userId === 'guest') return true; 
        const email = AUTH_MAP[userId];
        if (!email) return false;

        try {
            await signInWithEmailAndPassword(auth, email, password);
            console.log(`[Cloud] Connected as ${userId}`);
            return true;
        } catch (e: any) {
            if (e.code === 'auth/invalid-credential' || e.code === 'auth/user-not-found') {
                try {
                    await createUserWithEmailAndPassword(auth, email, password);
                    await setDoc(doc(db, 'users', userId), sanitize({
                        userId: userId,
                        role: userId === 'collin' ? 'admin' : 'user',
                        displayName: userId.charAt(0).toUpperCase() + userId.slice(1),
                        createdAt: serverTimestamp()
                    }));
                    return true;
                } catch (createErr: any) {
                    console.error(`[Cloud] Auto-create failed:`, createErr.code);
                }
            }
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

    // --- Admin Inspector (Raw JSON Access) ---
    async adminGetData(targetUid: string, type: 'profile' | 'rewards' | 'prefs' | 'luna' | 'adminConfig'): Promise<any> {
        try {
            let path = '';
            if (type === 'profile') path = `users/${targetUid}`;
            else if (type === 'rewards') path = `users/${targetUid}/data/rewards`;
            else if (type === 'prefs') path = `users/${targetUid}/data/prefs`;
            else if (type === 'luna') path = `couples/${COUPLE_ID}/apps/luna`;
            else if (type === 'adminConfig') path = `globals/system_config`;

            const snap = await getDoc(doc(db, path));
            return snap.exists() ? snap.data() : null;
        } catch(e) {
            console.error("[Admin] Fetch Failed", e);
            return { error: "Fetch failed", details: e };
        }
    },

    async adminSetData(targetUid: string, type: string, data: any) {
        try {
            let path = '';
            if (type === 'profile') path = `users/${targetUid}`;
            else if (type === 'rewards') path = `users/${targetUid}/data/rewards`;
            else if (type === 'prefs') path = `users/${targetUid}/data/prefs`;
            else if (type === 'luna') path = `couples/${COUPLE_ID}/apps/luna`;
            else if (type === 'adminConfig') path = `globals/system_config`;

            await setDoc(doc(db, path), sanitize(data), { merge: true });
            return true;
        } catch(e) {
            console.error("[Admin] Save Failed", e);
            return false;
        }
    },

    // --- Config ---
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
        } catch (e) {}
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

    // --- Prefs (Themes) ---
    async loadPrefs(): Promise<UserPrefs | null> {
        if (isGuest()) return null; // Guests use local storage only via data.ts
        try {
            const ref = doc(db, `users/${getUid()}/data/prefs`);
            const snap = await getDoc(ref);
            return snap.exists() ? snap.data() as UserPrefs : null;
        } catch { return null; }
    },

    async savePrefs(data: UserPrefs) {
        if (isGuest()) return;
        try {
            const ref = doc(db, `users/${getUid()}/data/prefs`);
            await setDoc(ref, sanitize(data), { merge: true });
        } catch (e) {}
    },

    // --- Daily ---
    async getDailyShared(dateIso: string): Promise<string[]> {
        if (isGuest()) return [];
        try {
            const ref = doc(db, 'couples', COUPLE_ID, 'daily', dateIso);
            const snap = await getDoc(ref);
            return snap.exists() ? (snap.data().claims || []) : [];
        } catch { return []; }
    },

    async addDailyClaim(dateIso: string, userId: string) {
        if (isGuest()) return;
        try {
            const ref = doc(db, 'couples', COUPLE_ID, 'daily', dateIso);
            const snap = await getDoc(ref);
            let claims: string[] = snap.exists() ? (snap.data().claims || []) : [];
            if (!claims.includes(userId)) {
                claims.push(userId);
                await setDoc(ref, { claims }, { merge: true });
            }
        } catch {}
    },

    // --- Luna ---
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
        } catch { return null; }
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
        } catch {}
    },

    async addLunaHistory(item: any) {
        const current = await this.loadLuna();
        let history = current?.history || [];
        if (!Array.isArray(history)) history = []; // Safety
        
        history.unshift(item);
        const trimmed = history.slice(0, 50);
        await this.updateLuna({ history: trimmed });
    },

    // --- Messages ---
    listenToMessages(callback: (msgs: any[]) => void) {
        if (isGuest()) {
            const local = JSON.parse(localStorage.getItem('fiaos_guest_messages') || '[]');
            callback(local);
            return () => {}; // No-op unsubscribe
        }
        try {
            const q = query(collection(db, 'couples', COUPLE_ID, 'messages'), orderBy('createdAt', 'desc'), limit(50));
            return onSnapshot(q, (snapshot) => {
                const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                callback(msgs.reverse());
            });
        } catch (e) { console.error("Msg Listen Error", e); return () => {}; }
    },

    async sendMessage(text: string) {
        const msg = {
            text,
            senderId: getUid(),
            senderName: JSON.parse(localStorage.getItem('fiaos_session') || '{}').name || 'Unknown',
            createdAt: serverTimestamp() // Firestore
        };

        if (isGuest()) {
            const local = JSON.parse(localStorage.getItem('fiaos_guest_messages') || '[]');
            local.push({ ...msg, createdAt: Date.now() });
            localStorage.setItem('fiaos_guest_messages', JSON.stringify(local));
            // Trigger storage event manually or just callback update if within same context? 
            // In guest mode, real-time isn't critical.
            return;
        }

        try {
            await addDoc(collection(db, 'couples', COUPLE_ID, 'messages'), sanitize(msg));
        } catch(e) { console.error("Send Msg Error", e); }
    },

    // --- Vault, Diary, Games, Profile (Standard) ---
    async loadVault() {
        if (isGuest()) return { messages: [] };
        try {
            const ref = doc(db, 'couples', COUPLE_ID, 'apps', 'vault');
            const snap = await getDoc(ref);
            return snap.exists() ? snap.data() : { messages: [] };
        } catch { return { messages: [] }; }
    },
    async saveVault(state: any) {
        if (isGuest()) return;
        try {
            await setDoc(doc(db, 'couples', COUPLE_ID, 'apps', 'vault'), sanitize(state));
        } catch {}
    },
    async loadDiary() {
        if (isGuest()) return [];
        try {
            const q = query(collection(db, `users/${getUid()}/diary`), orderBy('createdAt', 'desc'));
            const snap = await getDocs(q);
            return snap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch { return []; }
    },
    async saveDiaryEntry(entry: any) {
        if (isGuest()) return;
        try {
            await setDoc(doc(db, `users/${getUid()}/diary`, entry.id), sanitize(entry), { merge: true });
        } catch {}
    },
    async saveHighscore(gameId: string, score: number, extra: any = {}) {
        if (isGuest()) return;
        try {
            const sessionName = JSON.parse(localStorage.getItem('fiaos_session') || '{}').name;
            await setDoc(doc(db, 'leaderboards', gameId, 'scores', getUid()), sanitize({
                score, ...extra, updatedAt: serverTimestamp(), uid: getUid(), displayName: sessionName
            }), { merge: true });
        } catch {}
    },
    async getLeaderboard(gameId: string) {
        if (isGuest()) return [];
        try {
            const q = query(collection(db, 'leaderboards', gameId, 'scores'), orderBy('score', 'desc'), limit(10));
            const snap = await getDocs(q);
            return snap.docs.map(d => d.data());
        } catch { return []; }
    },
    async loadProfile() {
        if (isGuest()) return null;
        try {
            const snap = await getDoc(doc(db, 'users', getUid()));
            return snap.exists() ? snap.data() : null;
        } catch { return null; }
    },
    async saveProfile(data: any) {
        if (isGuest()) {
            // Local Storage for Guest Profile
            const uid = getUid(); // Should be 'guest'
            const key = uid === 'guest' ? 'fiaos_guest_guest_profile' : `fiaos_user_${uid}_profile`;
            localStorage.setItem(key, JSON.stringify(data));
            return;
        }
        try { await setDoc(doc(db, 'users', getUid()), sanitize(data), { merge: true }); } catch {}
    }
};
