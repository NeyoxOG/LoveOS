
/**
 * FiaOS Appwrite Setup Script
 * 
 * Usage:
 * 1. Ensure you have Node.js 18+
 * 2. Set environment variables (in .env or export them)
 *    - VITE_APPWRITE_ENDPOINT (default: https://cloud.appwrite.io/v1)
 *    - VITE_APPWRITE_PROJECT_ID
 *    - VITE_APPWRITE_API_KEY (Required! Create this in Appwrite Console -> Project -> API Keys)
 * 3. Run: node scripts/setupAppwrite.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// --- Configuration ---

const DB_ID = 'fiaos';

const COLLECTIONS = [
    {
        id: 'states',
        name: 'App States',
        permissions: [
            'read("any")',
            'create("any")',
            'update("any")',
            'delete("any")'
        ],
        attributes: [
            { key: 'profileKey', type: 'string', size: 50, required: true },
            { key: 'module', type: 'string', size: 50, required: true },
            { key: 'payload', type: 'string', size: 1000000, required: true }, // Large JSON string
            { key: 'updatedAt', type: 'string', size: 50, required: true }
        ]
    },
    {
        id: 'diary',
        name: 'Diary Entries',
        permissions: [
            'read("any")',
            'create("any")',
            'update("any")',
            'delete("any")'
        ],
        attributes: [
            { key: 'userId', type: 'string', size: 50, required: true },
            { key: 'title', type: 'string', size: 255, required: true },
            { key: 'text', type: 'string', size: 5000, required: true },
            { key: 'mood', type: 'string', size: 10, required: true },
            { key: 'createdAt', type: 'integer', required: true },
            { key: 'payload', type: 'string', size: 10000, required: false }
        ]
    },
    {
        id: 'messages',
        name: 'Chat Messages',
        permissions: [
            'read("any")',
            'create("any")'
        ],
        attributes: [
            { key: 'senderId', type: 'string', size: 50, required: true },
            { key: 'text', type: 'string', size: 1000, required: true },
            { key: 'createdAt', type: 'integer', required: true }
        ]
    },
    {
        id: 'games',
        name: 'Highscores',
        permissions: [
            'read("any")',
            'create("any")',
            'update("any")'
        ],
        attributes: [
            { key: 'gameId', type: 'string', size: 50, required: true },
            { key: 'userId', type: 'string', size: 50, required: true },
            { key: 'score', type: 'integer', required: true },
            { key: 'displayName', type: 'string', size: 50, required: true },
            { key: 'updatedAt', type: 'integer', required: true }
        ],
        indexes: [
            { key: 'score_desc', type: 'key', attributes: ['score'], order: 'DESC' }
        ]
    },
    {
        id: 'vault',
        name: 'Vault Messages',
        permissions: [
            'read("any")',
            'create("any")',
            'update("any")'
        ],
        attributes: [
            { key: 'title', type: 'string', size: 255, required: true },
            { key: 'body', type: 'string', size: 5000, required: true },
            { key: 'lockType', type: 'string', size: 20, required: true },
            { key: 'unlockAt', type: 'integer', required: false },
            { key: 'openedAt', type: 'integer', required: false },
            { key: 'createdAt', type: 'integer', required: true }
        ]
    }
];

const DEFAULT_ADMIN_CONFIG = {
    appVisibility: {
        love: true,
        story: true,
        daily: true,
        bucket: true,
        rewards_app: true,
        messages: true,
        valentine: true,
        luna: true,
        vault: true,
        diary: true,
        games: true,
        achievements: true,
        settings: true,
        admin: true
    },
    userStatus: {
        fia: { role: 'user', banned: false },
        collin: { role: 'admin', banned: false },
        guest: { role: 'guest', banned: false }
    },
    maintenanceMode: false,
    lastEditedBy: 'system',
    updatedAt: Date.now(),
    forceLogoutAt: 0
};

const DEFAULT_APP_CATALOG = [
    { id: 'love', name: 'Love', icon: '💞', status: 'available' },
    { id: 'story', name: 'Story of Love', icon: '🎞️', status: 'available' },
    { id: 'daily', name: 'Daily', icon: '✨', status: 'available' },
    { id: 'bucket', name: 'Ziele', icon: '📍', status: 'available' },
    { id: 'rewards_app', name: 'Belohnungen', icon: '🎁', status: 'available' },
    { id: 'messages', name: 'Nachrichten', icon: '💬', status: 'available' },
    { id: 'valentine', name: 'Valentinstag', icon: '💘', status: 'available' },
    { id: 'luna', name: 'Luna', icon: '🐑', status: 'available' },
    { id: 'vault', name: 'Message Vault', icon: '💌', status: 'available' },
    { id: 'diary', name: 'Tagebuch', icon: '📔', status: 'available' },
    { id: 'games', name: 'Arcade', icon: '🕹️', status: 'available' },
    { id: 'achievements', name: 'Erfolge', icon: '🏆', status: 'available' },
    { id: 'settings', name: 'Einstellungen', icon: '⚙️', status: 'available' },
    { id: 'admin', name: 'Admin Center', icon: '🛠️', status: 'available' }
];

const STATE_SEEDS = [
    {
        module: 'admin_config',
        profileKey: 'system',
        payload: DEFAULT_ADMIN_CONFIG
    },
    {
        module: 'app_catalog',
        profileKey: 'system',
        payload: { apps: DEFAULT_APP_CATALOG }
    }
];

// --- Env Loader ---

const loadEnv = () => {
    try {
        const __dirname = path.dirname(fileURLToPath(import.meta.url));
        const envPath = path.resolve(__dirname, '../.env');
        if (fs.existsSync(envPath)) {
            const content = fs.readFileSync(envPath, 'utf8');
            content.split('\n').forEach(line => {
                const [key, val] = line.split('=');
                if (key && val) process.env[key.trim()] = val.trim();
            });
        }
    } catch (e) {
        console.warn("Could not read .env file, relying on process.env");
    }
};

loadEnv();

const ENDPOINT = process.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const PROJECT_ID = process.env.VITE_APPWRITE_PROJECT_ID;
const API_KEY = process.env.VITE_APPWRITE_API_KEY;

if (!PROJECT_ID || !API_KEY) {
    console.warn("⚠️  Setup Skipped: Missing VITE_APPWRITE_PROJECT_ID or VITE_APPWRITE_API_KEY.");
    console.warn("   (This is normal in production or if you haven't set up the .env file yet)");
    process.exit(0);
}

// --- API Helper ---

const api = async (method, path, body = null) => {
    const headers = {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': PROJECT_ID,
        'X-Appwrite-Key': API_KEY
    };

    const options = {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
    };

    const res = await fetch(`${ENDPOINT}${path}`, options);
    const json = await res.json();

    if (!res.ok) {
        if (res.status === 409) return { error: 'conflict', ...json };
        throw new Error(`API Error [${res.status}] ${path}: ${JSON.stringify(json)}`);
    }
    return json;
};

const upsertState = async (module, profileKey, payload) => {
    const docId = `state_${module}_${profileKey}`.replace(/[^a-zA-Z0-9_]/g, '_');
    const data = {
        module,
        profileKey,
        payload: JSON.stringify(payload),
        updatedAt: new Date().toISOString()
    };

    const res = await api('POST', `/databases/${DB_ID}/collections/states/documents`, {
        documentId: docId,
        ...data
    });

    if (res.error === 'conflict') {
        await api('PATCH', `/databases/${DB_ID}/collections/states/documents/${docId}`, data);
        return { action: 'updated', docId };
    }

    return { action: 'created', docId };
};

// --- Execution ---

const setup = async () => {
    console.log(`🚀 Checking Appwrite Schema...`);

    // 1. Create Database
    const dbRes = await api('POST', '/databases', {
        databaseId: DB_ID,
        name: 'FiaOS Database'
    });
    if (dbRes.error !== 'conflict') console.log(`   -> Database created.`);

    // 2. Process Collections
    for (const col of COLLECTIONS) {
        // Create Collection
        const colRes = await api('POST', `/databases/${DB_ID}/collections`, {
            collectionId: col.id,
            name: col.name,
            permissions: col.permissions,
            documentSecurity: false
        });
        
        if (colRes.error !== 'conflict') console.log(`   -> Collection ${col.name} created.`);

        // Create Attributes
        for (const attr of col.attributes) {
            let path = '';
            let body = { key: attr.key, required: attr.required };

            if (attr.type === 'string') {
                path = 'string';
                body.size = attr.size;
            } else if (attr.type === 'integer') {
                path = 'integer';
            } else if (attr.type === 'boolean') {
                path = 'boolean';
            }

            const attrRes = await api('POST', `/databases/${DB_ID}/collections/${col.id}/attributes/${path}`, body);
            
            if (attrRes.error !== 'conflict') {
                console.log(`      - Attribute ${attr.key}: Created`);
                await new Promise(r => setTimeout(r, 500));
            }
        }

        // Create Indexes
        if (col.indexes) {
            await new Promise(r => setTimeout(r, 2000));
            for (const idx of col.indexes) {
                const idxRes = await api('POST', `/databases/${DB_ID}/collections/${col.id}/indexes`, {
                    key: idx.key,
                    type: idx.type,
                    attributes: idx.attributes,
                    orders: idx.order ? [idx.order] : undefined
                });

                if (idxRes.error !== 'conflict') {
                    console.log(`      - Index ${idx.key}: Created`);
                }
            }
        }
    }

    // 3. Seed initial states (admin config + app catalog)
    for (const seed of STATE_SEEDS) {
        const result = await upsertState(seed.module, seed.profileKey, seed.payload);
        console.log(`   -> State ${seed.module}:${seed.profileKey} ${result.action}.`);
    }

    console.log(`✅ Appwrite Schema Synced`);
};

setup().catch(err => {
    console.warn("\n⚠️ Setup Warning (Non-critical):");
    console.warn(err.message);
});
