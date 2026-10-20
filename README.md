# GCBO AK 30 – Team-App

Team-App für die drei AK-30-Herrenmannschaften des Golfclub Burg Overbach (Saison 2027).
Sie bündelt Termine, Aufstellungen, Scorekarten, Formkurven, Trainingsplanung und Liga-Analysen
an einem Ort.

> **Hinweis zum Datenschutz:** Dieses Repository enthält bewusst **keine echten Spielerdaten**.
> Echte Daten (Namen, Handicaps, Runden) liegen im Ordner `data/`, der per `.gitignore`
> ausgeschlossen ist. Für ein öffentliches Repository nur die Beispieldaten verwenden.

## Funktionen

| Reiter | Inhalt |
|---|---|
| Kalender | Monatsansicht, Saison-Highlights (Spieltage, AK30 Masters, Clubmeisterschaft, Turniere), Trainingsserien, Zu-/Absagen, Aufstellung mit Veröffentlichung, Export als `.ics` |
| Wetter | 7-Tage-Vorhersage für Much mit Golf-Ampel, stündlicher Verlauf, Links zum Regenradar |
| Startzeiten | Gebuchte Startzeiten der AK-30-Spieler der nächsten 8 Tage aus PC CADDIE, inkl. Handicap-Abgleich |
| Scorekarten | Runde per Foto (Claude liest die Karte aus) oder manuell erfassen; Turnier- und Ligarunden |
| Form | Formkurve je Spieler, Schlagverluste, abgeleitete Kennzahlen (GIR, Scrambling, Sand Saves …), Turnier- und Ligaergebnisse |
| Liga-Analyse | Vergleich Liga 5 / Liga 4 (NRW-MM Herren AK 30): Was braucht es für den Aufstieg? |
| Training | Trainingsbedarf je Mannschaft, Schwerpunkte und Ablauf mit dem Trainer abstimmen (Vorschlag per Claude) |
| Beat me | Ranking eines Spielers in 18 Kennzahlen gegen alle, eine Mannschaft oder einen Mitspieler, inkl. direkter Duelle |
| Regeln | Spickzettel zu den Golfregeln und Regelfragen an Claude (mit Vorlesefunktion) |
| Kader | Mannschaften, Ligen und Spieler |

Schalter **„Ligaspiele einbeziehen“**: nimmt die NRW-Ligarunden optional in alle Statistiken auf.

## Aufbau

```
app/index.html                 Die App (eine HTML-Datei, läuft als Claude-Artifact)
preview/build_preview.py       Baut eine eigenständige Vorschau mit Daten-Schnappschuss
preview/shim.template.js.html  Ersatz für die Claude-Datenbank in der Vorschau
tools/pccaddie_turniere.js     Import: Turnierergebnisse mit Lochergebnissen aus PC CADDIE
tools/gvnrw_liga.js            Import: Ergebnisse und Scorekarten aus dem GVNRW Liga-Portal
example-data/                  Anonymisierte Beispieldaten
data/                          Echte Daten (nicht im Repository)
docs/                          Datenmodell, Datenquellen, Scorekarten-Kürzel, Firebase
firebase/                      Betrieb als eigene Web-App (Hosting, Firestore, Auth, Functions)
```

## Betrieb

Die App läuft als **Claude-Artifact** und nutzt dessen Laufzeit-Funktionen:

- `db` – gemeinsame Datenbank für Termine, Zusagen, Runden, Pläne
- `user` – Rollen (Captain = Bearbeiter, Spieler/Trainer = Mitwirkende)
- `sample` – Claude für Scorekarten-Erkennung, Trainingsvorschläge und Regelfragen
- `downloads` – Kalender-Export
- `mcp` (`host:claude_browser`) – Aktualisieren von Startzeiten und Wetter über den Browser der Claude-Desktop-App

Außerhalb von Claude gibt es zwei Wege: die Vorschau-Version (siehe unten) oder den Betrieb
auf **Firebase** als eigene Web-App mit Login – Anleitung in [`docs/firebase.md`](docs/firebase.md).

## Vorschau bauen

```bash
# mit Beispieldaten
python3 preview/build_preview.py example-data/snapshot.example.json dist/demo.html

# mit echten Daten (lokal, nicht einchecken)
python3 preview/build_preview.py data/snapshot.json dist/GCBO-AK30-Vorschau.html
```

Die erzeugte Datei im Browser öffnen (Chrome, Safari, Edge, Firefox). Dateivorschauen in
Mail, WhatsApp oder der iPhone-Dateien-App führen kein JavaScript aus.

## Datenquellen

- **PC CADDIE://online** (GC Burg Overbach): Startzeiten, Turnierergebnisse – nur mit Login
- **GVNRW Liga-Portal** (`gvnrw.liga.golf`): Liga-Tabellen und Scorekarten – öffentlich
- **Open-Meteo**: Wettervorhersage für Much
- **Golfregeln**: eigene Kurzfassung nach den Regeln von R&A/USGA (Ausgabe 2023), maßgeblich bleibt der offizielle Text

Details in [`docs/datenquellen.md`](docs/datenquellen.md).

## Rechte

Das Clubwappen in `app/index.html` gehört dem Golfclub Burg Overbach e.V. und ist nur für
die interne Nutzung gedacht. Vor einer Veröffentlichung mit dem Club abstimmen oder das Wappen entfernen.
