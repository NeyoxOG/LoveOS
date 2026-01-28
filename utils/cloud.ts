
import { db, auth, firebase } from './firebase';
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
    games: true, diary: true, daily: true, love: true, rewards_app: true, story: true, bucket: true
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

// --- Helper: Deep Sanitize ---
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
            await auth.signInWithEmailAndPassword(email, password);
            return true;
        } catch (e: any) {
            if (e.code === 'auth/invalid-credential' || e.code === 'auth/user-not-found') {
                try {
                    await auth.createUserWithEmailAndPassword(email, password);
                    await db.collection('users').doc(userId).set(sanitize({
                        userId: userId,
                        role: userId === 'collin' ? 'admin' : 'user',
                        displayName: userId.charAt(0).toUpperCase() + userId.slice(1),
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
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

    // --- Admin Inspector ---
    async adminGetData(targetUid: string, type: string): Promise<any> {
        try {
            let path = '';
            if (type === 'daily_state') path = `users/${targetUid}/data/daily_state`;
            if (!path) return null;

            const snap = await db.doc(path).get();
            return snap.exists ? snap.data() : null;
        } catch(e) { return null; }
    },

    async adminSetData(targetUid: string, type: string, data: any) {
        try {
            let path = '';
            if (type === 'daily_state') path = `users/${targetUid}/data/daily_state`;
            
            if (path) {
                // If data is null/empty, we might want to delete, but typically this is update
                await db.doc(path).set(sanitize(data), { merge: true });
                return true;
            }
            return false;
        } catch(e) { return false; }
    },

    // --- Admin Actions ---
    
    async adminResetUser(targetUid: string) {
        try {
            // Delete subcollections manually or just main docs ref
            await db.doc(`users/${targetUid}/data/rewards`).delete();
            await db.doc(`users/${targetUid}/data/prefs`).delete();
            await db.doc(`users/${targetUid}/data/daily_state`).delete();
            
            // Delete Diary Entries (Need to fetch and delete individually in Firestore)
            const diarySnap = await db.collection('users').doc(targetUid).collection('diary').get();
            const batch = db.batch();
            diarySnap.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();

            // Reset Profile
            await db.collection('users').doc(targetUid).update({ 
                onboardingCompleted: false,
                avatar: { type: 'emoji', value: targetUid.charAt(0).toUpperCase() } 
            });
            
            return true;
        } catch (e) { 
            console.error("Reset failed", e);
            return false; 
        }
    },

    async adminResetOnboarding(targetUid: string) {
        try {
            await db.collection('users').doc(targetUid).update({ onboardingCompleted: false });
            return true;
        } catch (e) { return false; }
    },

    async adminForceLogout(targetUid: string) {
        try {
            await db.collection('users').doc(targetUid).update({ forceLogoutAt: Date.now() });
            return true;
        } catch(e) { return false; }
    },

    // --- Config ---
    async loadAdminConfig(): Promise<AdminConfig | null> {
        if (isGuest()) return null;
        try {
            const ref = db.collection('globals').doc('system_config');
            const snap = await ref.get();
            if (snap.exists) return snap.data() as AdminConfig;
            await ref.set(sanitize(DEFAULT_ADMIN_CONFIG));
            return DEFAULT_ADMIN_CONFIG;
        } catch (e) { return null; }
    },

    async saveAdminConfig(config: AdminConfig) {
        if (isGuest()) return;
        try {
            const ref = db.collection('globals').doc('system_config');
            await ref.set(sanitize(config), { merge: true });
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
            const ref = db.doc(`users/${uid}/data/rewards`);
            const snap = await ref.get();
            return snap.exists ? snap.data() as UserRewardsData : null;
        } catch (e) { return null; }
    },

    async saveRewards(data: UserRewardsData, targetUid?: string) {
        const uid = targetUid || getUid();
        if (uid === 'guest') {
            localStorage.setItem(`fiaos_rewards_guest`, JSON.stringify(data));
            return;
        }
        try {
            const ref = db.doc(`users/${uid}/data/rewards`);
            await ref.set(sanitize(data), { merge: true });
        } catch (e) {}
    },

    // --- Prefs (Themes) ---
    async loadPrefs(): Promise<UserPrefs | null> {
        if (isGuest()) return null; 
        try {
            const ref = db.doc(`users/${getUid()}/data/prefs`);
            const snap = await ref.get();
            return snap.exists ? snap.data() as UserPrefs : null;
        } catch { return null; }
    },

    async savePrefs(data: UserPrefs) {
        if (isGuest()) return;
        try {
            const ref = db.doc(`users/${getUid()}/data/prefs`);
            await ref.set(sanitize(data), { merge: true });
        } catch (e) {}
    },

    // --- Daily ---
    async loadDailyState(targetUid?: string) {
        const uid = targetUid || getUid();
        if (uid === 'guest') return JSON.parse(localStorage.getItem('fiaos_guest_daily_state') || 'null');
        try {
            const ref = db.doc(`users/${uid}/data/daily_state`);
            const snap = await ref.get();
            // Critical change: if document doesn't exist, return null so client knows to init/reset
            return snap.exists ? snap.data() : null;
        } catch { return null; }
    },

    async saveDailyState(data: any, targetUid?: string) {
        const uid = targetUid || getUid();
        if (uid === 'guest') {
            localStorage.setItem('fiaos_guest_daily_state', JSON.stringify(data));
            return;
        }
        try {
            const ref = db.doc(`users/${uid}/data/daily_state`);
            await ref.set(sanitize(data), { merge: true });
        } catch (e) {}
    },

    async getDailyShared(dateIso: string): Promise<string[]> {
        if (isGuest()) return [];
        try {
            const ref = db.collection('couples').doc(COUPLE_ID).collection('daily').doc(dateIso);
            const snap = await ref.get();
            return snap.exists ? (snap.data().claims || []) : [];
        } catch { return []; }
    },

    async addDailyClaim(dateIso: string, userId: string) {
        if (isGuest()) return;
        try {
            const ref = db.collection('couples').doc(COUPLE_ID).collection('daily').doc(dateIso);
            const snap = await ref.get();
            let claims: string[] = snap.exists ? (snap.data().claims || []) : [];
            if (!claims.includes(userId)) {
                claims.push(userId);
                await ref.set({ claims }, { merge: true });
            }
        } catch {}
    },

    // --- Luna ---
    async loadLuna() {
        if (isGuest()) return JSON.parse(localStorage.getItem('fiaos_guest_luna_state') || 'null');
        try {
            const ref = db.collection('couples').doc(COUPLE_ID).collection('apps').doc('luna');
            const snap = await ref.get();
            if (snap.exists) return snap.data();
            return null; // Let app init default
        } catch { return null; }
    },

    async updateLuna(patch: any) {
        if (isGuest()) {
            const cur = JSON.parse(localStorage.getItem('fiaos_guest_luna_state') || '{}');
            localStorage.setItem('fiaos_guest_luna_state', JSON.stringify({ ...cur, ...patch }));
            return;
        }
        try {
            const ref = db.collection('couples').doc(COUPLE_ID).collection('apps').doc('luna');
            await ref.set(sanitize(patch), { merge: true });
        } catch {}
    },

    async addLunaHistory(item: any) {
        const current = await this.loadLuna() || { history: [] };
        let history = current.history || [];
        history.unshift(item);
        const trimmed = history.slice(0, 50);
        await this.updateLuna({ history: trimmed });
    },

    // --- Messages ---
    listenToMessages(callback: (msgs: any[]) => void) {
        if (isGuest()) {
            const local = JSON.parse(localStorage.getItem('fiaos_guest_messages') || '[]');
            callback(local);
            return () => {}; 
        }
        try {
            const q = db.collection('couples').doc(COUPLE_ID).collection('messages')
                        .orderBy('createdAt', 'desc')
                        .limit(50);

            return q.onSnapshot((snapshot) => {
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
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (isGuest()) {
            const local = JSON.parse(localStorage.getItem('fiaos_guest_messages') || '[]');
            local.push({ ...msg, createdAt: Date.now() });
            localStorage.setItem('fiaos_guest_messages', JSON.stringify(local));
            return;
        }

        try {
            await db.collection('couples').doc(COUPLE_ID).collection('messages').add(sanitize(msg));
        } catch(e) { console.error("Send Msg Error", e); }
    },

    // --- Vault, Diary & Bucket ---
    async loadVault() {
        if (isGuest()) return JSON.parse(localStorage.getItem('fiaos_guest_vault') || '{"messages":[]}');
        try {
            const ref = db.collection('couples').doc(COUPLE_ID).collection('apps').doc('vault');
            const snap = await ref.get();
            return snap.exists ? snap.data() : { messages: [] };
        } catch { return { messages: [] }; }
    },
    
    async saveVault(state: any) {
        if (isGuest()) {
            localStorage.setItem('fiaos_guest_vault', JSON.stringify(state));
            return;
        }
        try {
            await db.collection('couples').doc(COUPLE_ID).collection('apps').doc('vault').set(sanitize(state));
        } catch {}
    },
    
    async loadDiary() {
        if (isGuest()) return JSON.parse(localStorage.getItem('fiaos_guest_diary') || '[]');
        try {
            const q = db.collection('users').doc(getUid()).collection('diary').orderBy('createdAt', 'desc');
            const snap = await q.get();
            return snap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch { return []; }
    },
    
    async saveDiaryEntry(entry: any) {
        if (isGuest()) {
            const local = JSON.parse(localStorage.getItem('fiaos_guest_diary') || '[]');
            const idx = local.findIndex((e:any) => e.id === entry.id);
            if (idx >= 0) local[idx] = entry; else local.push(entry);
            localStorage.setItem('fiaos_guest_diary', JSON.stringify(local));
            return;
        }
        try {
            await db.collection('users').doc(getUid()).collection('diary').doc(entry.id).set(sanitize(entry), { merge: true });
        } catch {}
    },

    // Bucket List (Shared)
    async loadBucket() {
        if (isGuest()) return JSON.parse(localStorage.getItem('fiaos_guest_bucket') || '{"items":[]}');
        try {
            const ref = db.collection('couples').doc(COUPLE_ID).collection('apps').doc('bucket');
            const snap = await ref.get();
            return snap.exists ? snap.data() : { items: [] };
        } catch { return { items: [] }; }
    },

    async saveBucket(data: any) {
        if (isGuest()) {
            localStorage.setItem('fiaos_guest_bucket', JSON.stringify(data));
            return;
        }
        try {
            await db.collection('couples').doc(COUPLE_ID).collection('apps').doc('bucket').set(sanitize(data));
        } catch {}
    },

    // --- Games & Profile ---
    async saveHighscore(gameId: string, score: number, extra: any = {}) {
        if (isGuest()) return;
        try {
            const sessionName = JSON.parse(localStorage.getItem('fiaos_session') || '{}').name;
            await db.collection('leaderboards').doc(gameId).collection('scores').doc(getUid()).set(sanitize({
                score, ...extra, updatedAt: firebase.firestore.FieldValue.serverTimestamp(), uid: getUid(), displayName: sessionName
            }), { merge: true });
        } catch {}
    },
    
    async getLeaderboard(gameId: string) {
        if (isGuest()) return [];
        try {
            const q = db.collection('leaderboards').doc(gameId).collection('scores').orderBy('score', 'desc').limit(10);
            const snap = await q.get();
            return snap.docs.map(d => d.data());
        } catch { return []; }
    },
    
    async loadProfile() {
        if (isGuest()) return null;
        try {
            const snap = await db.collection('users').doc(getUid()).get();
            return snap.exists ? snap.data() : null;
        } catch { return null; }
    },
    
    async saveProfile(data: any) {
        if (isGuest()) {
            const uid = getUid(); 
            const key = uid === 'guest' ? 'fiaos_guest_guest_profile' : `fiaos_user_${uid}_profile`;
            localStorage.setItem(key, JSON.stringify(data));
            return;
        }
        try { await db.collection('users').doc(getUid()).set(sanitize(data), { merge: true }); } catch {}
    }
};
