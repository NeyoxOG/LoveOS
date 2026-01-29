
# 🛠️ FiaOS - Backend & Database Setup

FiaOS benötigt eine **Appwrite**-Instanz als Backend für Authentifizierung, Datenbank (Zustände, Highscores, Tagebuch) und Echtzeit-Events.

Folge dieser Anleitung, um das System betriebsbereit zu machen.

---

## 1. Appwrite Projekt erstellen

1.  Gehe zu deiner Appwrite Konsole (Cloud oder Self-Hosted).
2.  Erstelle ein neues Projekt (z.B. **"FiaOS"**).
3.  Kopiere die **Project ID** aus den Einstellungen.

---

## 2. API Key für das Setup-Script

Das Setup-Script benötigt Administrator-Rechte, um die Datenbank-Struktur automatisch anzulegen.

1.  Navigiere im Appwrite Dashboard zu **Overview > API Keys**.
2.  Erstelle einen Key namens **"FiaOS Admin Setup"**.
3.  Wähle folgende Scopes:
    *   `databases.read`, `databases.write`
    *   `collections.read`, `collections.write`
    *   `documents.read`, `documents.write`
    *   `attributes.read`, `attributes.write`
    *   `indexes.read`, `indexes.write`
4.  Kopiere das **API Secret**.

---

## 3. Umgebungsvariablen (.env)

Erstelle eine Datei namens `.env` im Hauptverzeichnis des Projekts und füge deine Daten ein:

```env
# Client & Script Config
VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=deine_project_id_hier

# Nur für das Setup-Script (wird nicht im Frontend gebuildet)
VITE_APPWRITE_API_KEY=dein_api_key_secret_hier
```

---

## 4. Automatische Datenbank-Installation

Führe das Setup-Script aus. Es erstellt die Datenbank `fiaos`, alle notwendigen Collections (Tabellen), Attribute und Indizes.

```bash
npm run db:setup
```

✅ **Erwarteter Output:**
> "🚀 Checking Appwrite Schema..."
> "Database created."
> "Collection states created..."
> "✅ Appwrite Setup & Seeding Complete!"

---

## 5. 🔐 Benutzerkonten erstellen (WICHTIG)

Da Passwörter aus dem Quellcode entfernt wurden, musst du die Benutzer manuell in Appwrite anlegen. Das Frontend erwartet spezifische E-Mail-Adressen, um die Benutzer (Fia, Collin) zuzuordnen.

Gehe im Appwrite Dashboard zu **Authentication > Users** und erstelle folgende Accounts:

### Benutzer 1: Fia
*   **Name:** Fia
*   **Email:** `fia@fiaos.app`
*   **Passwort:** (Wähle ein sicheres Passwort)
*   **User ID:** (Automatisch generiert lassen oder `fia` setzen, falls möglich)

### Benutzer 2: Collin (Admin)
*   **Name:** Collin
*   **Email:** `collin@fiaos.app`
*   **Passwort:** (Wähle ein sicheres Passwort)

> **Hinweis:** Der "Gast"-Benutzer benötigt keinen Account, da er lokal läuft.

---

## 6. Frontend Starten

Nachdem die Datenbank steht und die User angelegt sind, starte die App:

```bash
npm run dev
```

Logge dich im Login-Screen mit den eben erstellten Passwörtern ein.

---

## ⚠️ Sicherheitshinweis für Produktion

Das Setup-Script konfiguriert die Datenbank-Rechte aktuell auf `role:any` (Jeder kann lesen/schreiben), um die Entwicklung zu erleichtern.

Für einen echten Einsatz im Web solltest du im Appwrite Dashboard unter **Databases > fiaos > [Collection] > Settings > Permissions**:
1.  `role:any` entfernen.
2.  `role:users` (eingeloggte Benutzer) oder spezifische User-IDs hinzufügen.

 Viel Spaß mit FiaOS! 💞
