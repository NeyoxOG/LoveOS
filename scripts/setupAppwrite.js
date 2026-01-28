
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
    console.error("❌ Missing VITE_APPWRITE_PROJECT_ID or VITE_APPWRITE_API_KEY.");
    console.error("   Please set them in .env or your environment.");
    process.exit(1);
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
        // Ignore "already exists" errors (409)
        if (res.status === 409) return { error: 'conflict', ...json };
        throw new Error(`API Error [${res.status}] ${path}: ${JSON.stringify(json)}`);
    }
    return json;
};

// --- Execution ---

const setup = async () => {
    console.log(`🚀 Starting Appwrite Setup for project: ${PROJECT_ID}`);

    // 1. Create Database
    console.log(`\n📦 Checking Database: ${DB_ID}`);
    const dbRes = await api('POST', '/databases', {
        databaseId: DB_ID,
        name: 'FiaOS Database'
    });
    if (dbRes.error === 'conflict') console.log(`   -> Database already exists.`);
    else console.log(`   -> Database created.`);

    // 2. Process Collections
    for (const col of COLLECTIONS) {
        console.log(`\n📂 Processing Collection: ${col.id} (${col.name})`);
        
        // Create Collection
        const colRes = await api('POST', `/databases/${DB_ID}/collections`, {
            collectionId: col.id,
            name: col.name,
            permissions: col.permissions,
            documentSecurity: false
        });
        
        if (colRes.error === 'conflict') console.log(`   -> Collection exists.`);
        else console.log(`   -> Collection created.`);

        // Create Attributes
        console.log(`   -> Syncing Attributes...`);
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
            
            if (attrRes.error === 'conflict') {
                // console.log(`      - ${attr.key}: Exists`);
            } else {
                console.log(`      - ${attr.key}: Created`);
                // Wait a bit to ensure attribute is ready before indexing (Appwrite async nature)
                await new Promise(r => setTimeout(r, 500));
            }
        }

        // Create Indexes
        if (col.indexes) {
            console.log(`   -> Syncing Indexes...`);
            // Wait for attributes to be "available"
            console.log(`      (Waiting 3s for attributes to settle...)`);
            await new Promise(r => setTimeout(r, 3000));

            for (const idx of col.indexes) {
                const idxRes = await api('POST', `/databases/${DB_ID}/collections/${col.id}/indexes`, {
                    key: idx.key,
                    type: idx.type,
                    attributes: idx.attributes,
                    orders: idx.order ? [idx.order] : undefined
                });

                if (idxRes.error === 'conflict') {
                    // console.log(`      - Index ${idx.key}: Exists`);
                } else {
                    console.log(`      - Index ${idx.key}: Created`);
                }
            }
        }
    }

    console.log(`\n✅ Setup Complete!`);
};

setup().catch(err => {
    console.error("\n❌ Setup Failed:");
    console.error(err);
});
