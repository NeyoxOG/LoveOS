
# Appwrite Setup für FiaOS

Da FiaOS client-seitig läuft, müssen die Datenbanken und Collections manuell im Appwrite Dashboard angelegt werden.

## 1. Projekt erstellen
*   Erstelle ein neues Projekt: **FiaOS**
*   Notiere die **Project ID**.

## 2. Datenbank
*   Erstelle eine Datenbank mit der ID: `fiaos`

## 3. Collections (Struktur)

Wir nutzen eine vereinfachte Struktur, um JSON-Objekte zu speichern.

### Collection A: `states`
*   **ID:** `states`
*   **Attribute:**
    *   `profileKey` (String, 50, Required) -> z.B. "fia", "collin", "couple", "system"
    *   `module` (String, 50, Required) -> z.B. "luna", "rewards", "settings", "daily", "admin_config"
    *   `payload` (String, 1000000, Required) -> Das JSON Datenobjekt als String
    *   `updatedAt` (String, 50, Required) -> ISO Timestamp
*   **Permissions:**
    *   Role `Any`: Read, Create, Update (Für MVP. Später auf `Users` einschränken).

### Collection B: `diary`
*   **ID:** `diary`
*   **Attribute:**
    *   `userId` (String, 50, Required)
    *   `title` (String, 255, Required)
    *   `text` (String, 5000, Required)
    *   `mood` (String, 10, Required)
    *   `createdAt` (Integer, Required) -> Timestamp
    *   `payload` (String, 10000, Optional) -> Extra Daten
*   **Permissions:**
    *   Role `Any`: Read, Create, Update.

### Collection C: `messages`
*   **ID:** `messages`
*   **Attribute:**
    *   `senderId` (String, 50, Required)
    *   `text` (String, 1000, Required)
    *   `createdAt` (Integer, Required)
*   **Permissions:**
    *   Role `Any`: Read, Create.

### Collection D: `games` (Highscores)
*   **ID:** `games`
*   **Attribute:**
    *   `gameId` (String, 50, Required)
    *   `userId` (String, 50, Required)
    *   `score` (Integer, Required)
    *   `displayName` (String, 50, Required)
    *   `updatedAt` (Integer, Required)
*   **Indexes:**
    *   Key: `score_desc`, Type: Key, Attribute: `score`, Order: Desc
*   **Permissions:**
    *   Role `Any`: Read, Create, Update.

### Collection E: `vault`
*   **ID:** `vault`
*   **Attribute:**
    *   `title` (String, 255, Required)
    *   `body` (String, 5000, Required)
    *   `lockType` (String, 20, Required)
    *   `unlockAt` (Integer, Optional)
    *   `openedAt` (Integer, Optional)
    *   `createdAt` (Integer, Required)
*   **Permissions:**
    *   Role `Any`: Read, Create, Update.

## 4. Umgebungsvariablen (Cloudflare Pages / .env)
Setze diese Variablen in deinem Build-System oder `.env.local`:

```
VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=[DEINE_PROJECT_ID]
```
