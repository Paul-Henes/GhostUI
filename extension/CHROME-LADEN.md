# Extension in Chrome laden (entpackt testen)

1. **Terminal öffnen** (Cursor-Terminal oder iTerm/Terminal.app).

2. **Build ausführen:**
   ```bash
   cd /Users/paulhenes/Desktop/ghostui/extension
   ./build-for-chrome.sh
   ```
   Falls Node.js fehlt: `brew install node` und danach das Skript erneut ausführen.

3. **Chrome:** `chrome://extensions` öffnen → **Entwicklermodus** (oben rechts) aktivieren → **„Entpackte Erweiterung laden“** → Ordner wählen:
   ```
   /Users/paulhenes/Desktop/ghostui/extension/build/chrome-mv3-prod
   ```
   (Der Ordner öffnet sich nach dem Build automatisch im Finder.)

4. **Testen:** Icon der Extension anklicken → Barrierefreiheits-Optionen umschalten → beliebige Webseite öffnen, Einstellungen wirken sofort.
