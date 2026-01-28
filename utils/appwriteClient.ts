
import { Client, Account, Databases, ID, Query } from 'appwrite';

const safeEnv = (import.meta as any).env || {};

// Default to global endpoint to avoid region-specific reachability issues
const ENDPOINT = safeEnv.VITE_APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1";
const PROJECT_ID = safeEnv.VITE_APPWRITE_PROJECT_ID || "697a92770024ba0b786d";

if (!PROJECT_ID) {
    console.warn("Appwrite Configuration missing! Check .env variables.");
}

export const client = new Client();

if (ENDPOINT && PROJECT_ID) {
    client
        .setEndpoint(ENDPOINT)
        .setProject(PROJECT_ID);
}

export const account = new Account(client);
export const databases = new Databases(client);

// Config Constants
export const DB_ID = 'fiaos';
export const COL_STATES = 'states';
export const COL_DIARY = 'diary';
export const COL_MESSAGES = 'messages';
export const COL_GAMES = 'games';
export const COL_VAULT = 'vault';

export { ID, Query };
