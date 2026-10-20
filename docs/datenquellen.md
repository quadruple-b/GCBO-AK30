# Datenquellen und Aktualisierung

## PC CADDIE://online (Club 0494450)

- **Startzeiten:** `app.php?cat=tt_timetable_course&date=DAY|YYYY-MM-DD&alias=ALIAS|A001` (Tee 1) bzw. `ALIAS|1810` (Tee 10).
  Namen und Handicaps nur nach Login und nur bei freigegebener Namensanzeige.
  In der App: Button „Aktualisieren“ im Reiter Startzeiten (nur Captain, nur Claude-Desktop-App).
- **Turnierergebnisse:** Ergebnisliste `cat=ts_resultlist&sub=resultlist&id=<Turnier>`,
  Lochergebnisse per JSON `…&format=json&result=<data-result>` (Feld `sDataScoreCsv`).
  Skript: `tools/pccaddie_turniere.js`. Aktualisierung derzeit über Claude („Turnierergebnisse aktualisieren“).

Bitte sparsam nutzen und mit dem Club abstimmen: Es werden Daten anderer Mitglieder mit einem persönlichen Zugang gelesen.

## GVNRW Liga-Portal

- Öffentliche GraphQL-API `https://gvnrw-backend.liga.golf/` (Abfrage nur von `gvnrw.liga.golf` aus, CORS).
- Saison 2026: Liga-ID 3741 (NRW-MM Herren AK 30), Gruppen Liga 4.A–4.H und 5.A–5.M.
- Skript: `tools/gvnrw_liga.js`.

## Open-Meteo

```
https://api.open-meteo.com/v1/forecast?latitude=50.9028&longitude=7.4036
  &daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,
         precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,sunrise,sunset
  &hourly=temperature_2m,precipitation,precipitation_probability,wind_speed_10m,wind_gusts_10m,weather_code
  &timezone=Europe/Berlin&forecast_days=7&wind_speed_unit=kmh
```

Regenradar: nur als Link (Ventusky, wetteronline), da sich fremde Seiten im Artifact nicht einbetten lassen.

## Scorekarten-Kürzel

Neben das Lochergebnis schreiben, z. B. `5 · P3 B1`:

| Kürzel | Bedeutung |
|---|---|
| P | Putts (immer notieren) |
| B | Bunkerschläge |
| S | Strafschläge |
| C | Chips/Pitches bis 50 m |
| A | Abschlag hat das Fairway verfehlt |
