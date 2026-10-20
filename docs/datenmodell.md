# Datenmodell

Die App speichert alles in der Artifact-Datenbank (`db`). Dokumente sind JSON-Objekte.
Schreibrechte: `config`, `players`, `events`, `teetimes`, `liga`, `pcc`, `ligar`, `weather`
nur für Bearbeiter (Captain). `rounds`, `rsvp`, `plans` für alle Mitwirkenden.

| Pfad | Inhalt |
|---|---|
| `config/teams` | `{teams:[{id:"m1", name:"AK 30 I", liga:""}, …]}` |
| `players/<id>` | `{name, hcp, teamId, hcpAt?}` – id z. B. `p-max-muster` |
| `events/<id>` | `{type, teamId, title, date, time, place, note, lineup:[playerId], lineupPublished}` – type: `spieltag`, `masters`, `clubmeisterschaft`, `turnier`, `training`, `sonstiges` |
| `rsvp/<eventId>__<playerId>` | `{eventId, playerId, status: yes / maybe / no, at}` |
| `rounds/<id>` | Eigene Scorekarten: `{playerId, date, course, kind, holes:[{par, s, p, b, pen, c, fw}], createdAt}` |
| `plans/<eventId>` | Trainingsplan: `{focus:[…], coachNote, text, updatedAt}` |
| `pcc/<playerId>` | Turnierrunden aus PC CADDIE: `{rounds:[{id, date, tournament, tid, holes:[{par, s, pu?}], stbfBrutto, stbfNetto, gbe, hcpi, source:"pccaddie", detail:false}]}` |
| `ligar/<playerId>` | Ligarunden: `{rounds:[{id, date, tournament, course, holes:[{par, s}], brutto, plusCR, streich, source:"liga", detail:false}]}` |
| `liga/analyse2026` | Aggregierte Liga-Auswertung (Segmente L4, L4up, L4stay, L4down, L5, L5up, L5rest, GCBO) |
| `teetimes/current` | `{updatedAt, dates:[…], entries:[{date, time, tee, players:[{id, holes}], others}]}` |
| `weather/much` | `{updatedAt, source, daily:[…], hourly:[…]}` |

## Runden-Felder

- `s` Schläge, `par` Par des Lochs
- `p` Putts, `b` Bunkerschläge, `pen` Strafschläge, `c` Chips/Pitches, `fw` Abschlag Fairway verfehlt
- `detail:false` – Runde ohne Kürzel (Turnier/Liga); Putts, Bunker usw. werden dann nicht gewertet
- `pu:true` – im Stableford gestrichenes Loch, gewertet als Par + 2 + Vorgabeschläge

## Lokale Einstellungen (Browser)

`ak30-me` (wer bin ich), `ak30-team` (Filter), `ak30-tab` (letzter Reiter), `ak30-liga` (Ligaspiele einbeziehen).
