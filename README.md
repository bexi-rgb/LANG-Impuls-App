# IMPULS Reise-Concierge · Taiwan 2026

Web-App als Vorstufe zur nativen Reise-Concierge-App für die Taiwan-Expedition 2026. Wird als **Progressive Web App (PWA)** ausgeliefert, kann also direkt vom iPhone/Android-Home-Screen wie eine native App gestartet werden. Später auch mit [Capacitor](https://capacitorjs.com/) zu einer echten iOS/Android-App kompilierbar, ohne den Code neu zu schreiben.

## Schnellstart lokal

```bash
npm install
npm run dev
```

Vite startet auf `http://localhost:5173`. Die Konsole zeigt zusätzlich die IP im lokalen WLAN (z. B. `http://192.168.178.42:5173`) — diese URL kannst du direkt auf deinem Handy im gleichen WLAN öffnen und siehst Änderungen live.

## Für Preview auf dem Handy per öffentlicher URL

Für Reviews unterwegs oder um sie den Reisenden zu zeigen — Vercel oder Netlify sind beide kostenlos und in ~2 Minuten live:

### Option A: Vercel (empfohlen)

1. Bei [vercel.com](https://vercel.com) einloggen (GitHub-Account reicht)
2. Ordner als Git-Repo pushen (`git init && git add . && git commit -m 'init' && git push`)
3. Bei Vercel „New Project" → Repo auswählen → Framework wird automatisch als „Vite" erkannt → Deploy
4. Du bekommst eine URL wie `impuls-taiwan-app.vercel.app`

Jeder Push auf `main` deployed automatisch neu.

### Option B: Netlify

1. Bei [netlify.com](https://netlify.com) einloggen
2. Terminal:
   ```bash
   npm install -g netlify-cli
   npm run build
   netlify deploy --prod --dir=dist
   ```
3. URL wird ausgegeben.

## App zum Home-Screen hinzufügen (für dich und deine Reisenden)

Die App ist als PWA konfiguriert — auf dem Handy sieht sie wie eine native App aus (eigenes Icon, Fullscreen ohne Browser-Chrome, Splash Screen).

**iPhone (Safari):**
1. URL öffnen
2. Teilen-Button (Quadrat mit Pfeil) → „Zum Home-Bildschirm"
3. „Hinzufügen"

**Android (Chrome):**
1. URL öffnen
2. Drei-Punkte-Menü → „App installieren" oder „Zum Startbildschirm hinzufügen"

Beim ersten Start kann sich ein Splash Screen mit dem goldenen IMPULS-Logo aufbauen.

## Login-Daten (Preview-Modus)

- **Rebekka (Admin):** `admin` / `admin`
- **Elena Rossi:** `elena` / `taiwan`
- **Marco Valli:** `marco` / `taiwan`

## Projektstruktur

```
src/
├── main.jsx               React-Entry
├── App.jsx                State-Management, Tab-Routing
├── index.css              Tailwind + Animations + Safe-Area
├── constants.js           Brand-Tokens, Mock-Daten, Helper-Funktionen
├── shell.jsx              PhoneFrame, Header, BottomNav, Login, geteilte Modals
├── HomeTab.jsx            Startseite mit Kachel-System + Live-Flug-Karten + Hotel-Detail
├── ScheduleTab.jsx        Reiseplan mit Tages-Swipe + Termin-Editor (nur Admin)
├── DocumentsTab.jsx       Dateien mit Filter + Upload
├── ChatTab.jsx            Chat (Direkt + Gruppe) im WhatsApp-Stil
├── PhotosTab.jsx          Foto-Sharing
└── AdminTab.jsx           Reisende + Broadcasts (nur Admin)
```

## Design-Prinzip: Mobile-First mit Desktop-Preview

- Auf dem **Handy** ist die App vollflächig, feels-like-native (kein Phone-Frame-Rahmen)
- Auf dem **Desktop** wird die App in einem dekorativen Phone-Frame gerendert, damit du beim Entwickeln siehst wie sie auf dem Handy aussieht
- Umschaltung erfolgt automatisch über Media-Query `md:768px`

## Externe Datenquellen

### Wetter — Live via Open-Meteo (aktiv, kein Key nötig)

Aktuelle Bedingungen + 4-Tage-Vorhersage werden live von [Open-Meteo](https://open-meteo.com) geholt. Kein API-Key, keine Registrierung, kein Kreditkarten-Hinterlegen. Rebekka fügt via „+ Kachel hinzufügen" → Wetter neue Wetter-Kacheln für Taipeh, Frankfurt, Taroko oder Jiufen ein.

- Cache: 15 Minuten (In-Memory), Auto-Refresh alle 30 Minuten
- CORS: aktiviert, direkt aus dem Browser
- Attribution: „Open-Meteo" ist als kleiner Hinweis unter jeder Karte sichtbar
- Limit: 10.000 Requests/Tag (auch bei 100 aktiven Reisenden weit unterhalb der Grenze)

### Flug — Adapter-Struktur (aktuell Mock, live-ready)

Die `FlightCard` konsumiert einen Adapter in `src/api/flights.js`. Aktueller Default ist `mock` — die Daten kommen aus den Tile-Feldern, die Rebekka im Admin-Modus pflegt. Für Live-Daten:

1. Registrierung bei einem der folgenden Anbieter:
   - **[AviationStack](https://aviationstack.com)** — 100 Requests/Monat kostenlos, danach $50/Monat. Schnell aufgesetzt, gut für Prototypen und kleinere Reisegruppen.
   - **[AeroDataBox](https://aerodatabox.com)** — Freemium mit ~500 Requests, ab $10/Monat. Beste Preis/Leistung für kleine Concierge-Services.
   - **[FlightAware AeroAPI](https://flightaware.com/commercial/aeroapi)** — Kein Free-Tier, ab $0,004/Request. Beste Datenqualität und ADS-B-Positionen.

2. `.env.example` nach `.env.local` kopieren, `VITE_FLIGHT_API_PROVIDER=aviationstack` setzen, Key eintragen, Dev-Server neu starten.

3. Die Kachel zeigt automatisch „Live" statt „Mock" im Footer.

Für AeroDataBox oder FlightAware muss ein weiterer Adapter in `src/api/flights.js` ergänzt werden — die Struktur ist vorgegeben, es sind ~20 Zeilen Mapping-Code.

**Sicherheitshinweis:** `VITE_*`-Env-Variablen sind im Browser sichtbar. Für Produktion sollten API-Keys über ein Backend (Vercel Serverless Function, Cloudflare Worker) laufen, damit sie nicht im Frontend-Bundle landen.

## Datenspeicherung

**Persistiert im LocalStorage** deines Browsers (unter dem Namespace `impuls:v1:*`):
- Reisende, Termine, Dokumente, Chat-Nachrichten, Fotos
- Kachel-Reihenfolge auf der Startseite, Ticker-Text
- Notifications
- Aktive Sitzung (du bleibst eingeloggt nach Reload)

Änderungen sind **pro Gerät** — sie synchronisieren sich noch nicht zwischen Rebekkas Handy und dem der Reisenden.

**Reset:** Im Admin-Tab unten gibt's einen roten „Preview-Daten zurücksetzen"-Button, der alles auf die INITIAL-Werte zurücksetzt.

**Datenschutz-Hinweis:** LocalStorage ist unverschlüsselt und im Browser einsehbar. Für sensible Daten (echte Reisepass-Kopien, Kreditkarten) wollen wir vor dem realen Einsatz auf ein Backend umziehen.

**Wenn geräteübergreifende Persistenz nötig wird** (Rebekka legt Termin auf ihrem Laptop an → Elena sieht ihn auf ihrem Handy), tauschen wir den Adapter in `src/storage.js` gegen Supabase. Die Komponenten selbst sehen weiterhin `usePersistentState('key', fallback)` — der Wechsel ist eine einzige Datei.

### Warum Supabase als Next Step

- Postgres unterm Auth-Layer, kostenlos bis ~500 MB
- Realtime-Subscriptions (Chat + Termine synchronisieren sich sofort)
- Storage-Bucket für hochgeladene Dokumente & Fotos
- Row-Level-Security: Elena sieht nur ihre Dokumente, Rebekka sieht alle
- Auth kann Rebekkas Login-Passwort auf E-Mail-Magic-Link umstellen

## Nächste Ausbaustufen

- [ ] Flug-API-Adapter für AeroDataBox oder FlightAware (Skelett existiert in `src/api/flights.js`)
- [ ] Geräteübergreifende Persistenz via Supabase (siehe oben)
- [ ] Push-Notifications via Firebase Cloud Messaging
- [ ] Rebekka-Admin-Editor für Amenities/Öffnungszeiten pro Hotel
- [ ] Repeat-Traveler-Datenbank (wiederkehrende Passagiere, Sitzpräferenzen)
- [ ] Capacitor-Wrap für App-Store-Distribution

## Später: Aus dem Web eine native App machen

```bash
npm install @capacitor/core @capacitor/cli
npx cap init
npx cap add ios
npx cap add android
npm run build
npx cap sync
npx cap open ios      # → Xcode; braucht macOS + Apple-Dev-Account
npx cap open android  # → Android Studio
```

Der gleiche React-Code läuft dann als native App mit Zugriff auf Kamera, Standort, Push, Kontakte etc.

## Support

Konzept, Design und Prototyp: Rebekka + Claude.
