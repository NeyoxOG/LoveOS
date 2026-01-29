
# Appwrite Setup für FiaOS

FiaOS benötigt eine Appwrite-Instanz, um Daten (Zustände, Nachrichten, Spiele, etc.) zu speichern. Um die Einrichtung zu vereinfachen, steht ein automatisiertes Setup-Script bereit.

## 1. Voraussetzungen

1.  **Node.js 18+** installiert.
2.  Ein aktiver **Appwrite Server** (z.B. Appwrite Cloud oder Self-Hosted).
3.  Ein neues Projekt im Appwrite Dashboard (z.B. "FiaOS").

## 2. API Key erstellen

1.  Gehe im Appwrite Dashboard zu deinem Projekt.
2.  Navigiere zu **Overview > API Keys**.
3.  Erstelle einen neuen Key mit dem Namen "FiaOS Admin".
4.  Wähle folgende Scopes (mindestens):
    *   `databases.read`, `databases.write`
    *   `collections.read`, `collections.write`
    *   `documents.read`, `documents.write`
    *   `indexes.read`, `indexes.write`
    *   `attributes.read`, `attributes.write`
5.  Kopiere das **API Secret**.

## 3. Konfiguration

Erstelle oder bearbeite die `.env` Datei im Root-Verzeichnis des Projekts:

```env
VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=[DEINE_PROJECT_ID]
VITE_APPWRITE_API_KEY=[DEIN_API_KEY_VON_OBEN]
```

## 4. Setup ausführen

Führe folgenden Befehl aus, um die Datenbank, Collections, Attribute und Indizes automatisch anzulegen und initiale Daten zu seeden:

```bash
npm run db:setup
```

Das Script führt folgende Schritte aus:
1.  Erstellt die Datenbank `fiaos`.
2.  Erstellt Collections: `states`, `diary`, `messages`, `games`, `vault`.
3.  Konfiguriert Attribute und Indizes.
4.  Erstellt initiale Daten (Admin Config, Luna Stats).

## 5. Berechtigungen (Permissions)

Das Setup-Script konfiguriert die Collections standardmäßig mit `role:any` für CRUD-Operationen, um den MVP-Betrieb ohne komplexe serverseitige Logik zu ermöglichen.

Für eine erhöhte Sicherheit in Produktion wird empfohlen, die Permissions im Appwrite Dashboard einzuschränken (z.B. nur `users` oder spezifische Teams).

## Manuelle Kontrolle

Falls das Script fehlschlägt, kannst du die Struktur manuell prüfen:
*   Datenbank ID: `fiaos`
*   Collections müssen exakt wie in `scripts/setupAppwrite.js` definiert sein.
