# Betrieb auf Firebase

Mit diesem Paket läuft die Team-App unabhängig von Claude als eigene Web-App:
Firebase Hosting für die Seite, Cloud Firestore als Datenbank, Firebase Authentication
für die Anmeldung und Cloud Functions für die Claude-Funktionen und das Wetter.

## Was sich gegenüber der Claude-Version ändert

| Funktion | Claude-Artifact | Firebase |
|---|---|---|
| Daten | Artifact-Datenbank | Cloud Firestore (gleiche Pfade) |
| Anmeldung, Rollen | Claude-Konto, Teilen-Menü | Google-Login, Rollen in `members/{email}` |
| Scorekarte per Foto, Trainingsvorschlag, Regelfragen | Claude im Artifact | Cloud Function `ask` → Claude-API (eigener API-Schlüssel, kostenpflichtig) |
| Wetter | Button in der Desktop-App | automatisch täglich 06:00 (`weatherDaily`) |
| Startzeiten aus PC CADDIE | Button in der Desktop-App | **nicht verfügbar** (bräuchte Zugangsdaten auf dem Server) |
| Turnier-/Ligaimport | über Claude | Skripte in `tools/`, Ergebnis per `seed.js` einspielen |
| Kalender-Export | Download-Dialog | normaler Datei-Download |

Die App-Datei selbst bleibt unverändert. `firebase/src/firebase-adapter.js` stellt dieselbe
Schnittstelle (`window.claude.use(...)`) auf Firebase-Basis bereit.

## Einrichtung

Voraussetzungen: Node.js 20, Python 3, Firebase CLI (`npm install -g firebase-tools`),
ein Google-Konto, für die Claude-Funktionen ein API-Schlüssel von https://console.anthropic.com.

1. **Projekt anlegen** in der Firebase-Konsole (z. B. `gcbo-ak30`) und auf den Blaze-Tarif
   umstellen. Cloud Functions und geplante Funktionen brauchen ihn; bei einem Team dieser Größe
   bleiben die Kosten in der Regel im Freikontingent, die Claude-API wird separat abgerechnet.
2. **Dienste aktivieren:** Firestore (Region `eur3` oder `europe-west3`), Authentication mit
   Anbieter **Google**, eine **Web-App** registrieren.
3. **Konfiguration:**
   ```bash
   cd firebase
   cp .firebaserc.example .firebaserc                       # Projekt-ID eintragen
   cp public/firebase-config.example.js public/firebase-config.js   # SDK-Config eintragen
   ```
4. **App bauen** (nach jeder Änderung an `app/index.html`):
   ```bash
   python3 firebase/build.py
   ```
5. **Claude-API-Schlüssel hinterlegen** und Functions installieren:
   ```bash
   cd firebase/functions && npm install && cd ..
   firebase functions:secrets:set ANTHROPIC_API_KEY
   ```
6. **Deployen:**
   ```bash
   firebase deploy --only firestore:rules,firestore:indexes,functions,hosting
   ```
7. **Daten einspielen und ersten Captain freischalten** (Service-Account-Schlüssel aus
   Projekteinstellungen → Dienstkonten):
   ```bash
   cd firebase/scripts && npm install
   export GOOGLE_APPLICATION_CREDENTIALS=/pfad/zum/service-account.json
   node seed.js ../../data/snapshot.json paul@example.com "Paul"
   ```
8. **Mitglieder freischalten:** Für jeden Spieler und den Trainer in Firestore ein Dokument
   `members/<e-mail-in-kleinbuchstaben>` mit `{role: "member", name: "…"}` anlegen
   (Captains: `role: "captain"`). Danach können sie sich mit ihrem Google-Konto anmelden.

Die App ist dann unter `https://<projekt-id>.web.app` erreichbar und lässt sich auf dem Handy
über „Zum Home-Bildschirm“ wie eine App ablegen.

## Rechte (firestore.rules)

- Lesen: nur freigeschaltete Mitglieder mit bestätigter E-Mail
- Stammdaten (`config`, `players`, `events`, `teetimes`, `liga`, `pcc`, `ligar`, `weather`): schreiben nur Captains
- Beiträge (`rounds`, `rsvp`, `plans`): alle Mitglieder
- `members`: jeder sieht seinen eigenen Eintrag, verwalten nur Captains

## Lokal testen

```bash
cd firebase && firebase emulators:start
```

## Datenschutz

Die Datenbank enthält Namen, Handicaps und Ergebnisse der Spieler. Vor dem Start mit dem
Team abstimmen. Firestore-Region in der EU wählen. Bei Nutzung der Claude-Funktionen werden
Scorekarten-Fotos und Regelfragen an die Claude-API übertragen.

## Hinweis zu Versionen

`functions/package.json` gibt Mindestversionen an. Vor dem ersten Deploy die aktuellen
Versionen installieren: `npm install firebase-functions@latest firebase-admin@latest @anthropic-ai/sdk@latest`.
Das Modell lässt sich über die Umgebungsvariable `CLAUDE_MODEL` ändern (Standard: `claude-sonnet-5-5`).
