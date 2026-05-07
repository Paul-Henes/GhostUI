# Ghost-UI Extension

Chrome-Erweiterung für Barrierefreiheit (Kontrast, Schriftgröße, Dyslexie-Schrift, Fokus-Modus) und optional Voice Agent („Talk to Any Website“).

## Bauen & testen

**Option A – in Cursor/VS Code (empfohlen):**  
`Cmd+Shift+B` (Build) oder **Terminal → Aufgabe ausführen** → **"Extension: Build & Open Folder"**.  
Das läuft im integrierten Terminal (dort ist `pnpm` im PATH). Danach öffnet sich der Build-Ordner.

**Option B – im Terminal:**
```bash
cd extension
./build-for-chrome.sh
```
(`pnpm install` + `pnpm run build`, gibt den Pfad aus und öffnet den Ordner im Finder.)

**Option C – manuell:**
```bash
# Im Projektroot (Monorepo)
pnpm install
pnpm run build:extension

# Oder nur im extension-Ordner
cd extension
pnpm install
pnpm run build
```

**Development:** `pnpm run dev` – baut bei Änderungen neu.

**Extension in Chrome laden:**

1. Chrome öffnen → `chrome://extensions`
2. „Entwicklermodus“ aktivieren
3. „Entpackte Erweiterung laden“ → Ordner `extension/build/chrome-mv3-dev` (bei `dev`) oder `extension/build/chrome-mv3-prod` (bei `build`) wählen

## Funktionen

- **Popup (Klick auf Icon):** Hoher Kontrast, Schriftgröße, Dyslexie-Schrift, Fokus-Modus. Einstellungen werden sofort auf der aktuellen Seite angewendet (über den Content-Script `ghost-ui`).
- **Einstellungen (Rechtsklick auf Icon → Optionen):** Standard-Barrierefreiheit + Voice Agent ein/aus + ausgeschlossene Domains.
- **Voice Agent:** Wenn aktiviert, erscheint auf passenden Seiten ein Mikrofon-Button (unten rechts). Öffnen/Schließen mit **Alt+V**. Benötigt Backend mit `/api/voice-agent/init` (ElevenLabs-Integration).

## Umgebungsvariablen (optional)

Siehe `.env.example`. Für den Voice Agent: `PLASMO_PUBLIC_API_URL` auf die Backend-URL setzen.
