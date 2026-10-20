// PC CADDIE://online – Turnierergebnisse mit Lochergebnissen auslesen
//
// Ausführen in der Browser-Konsole (oder per Claude-Browser), während man auf
// https://www.pccaddie.net/clubs/0494450/app.php?cat=ts_resultlist eingeloggt ist.
// Ergebnis: window.PCC_EXPORT – eine Liste von Runden für die Spieler in KADER.
//
// Hinweise
// - Namen sind nur nach dem Login sichtbar und nur von Mitgliedern, die die
//   Namensanzeige freigegeben haben.
// - Nur Einzel-Wettspiele werden übernommen (keine Scramble/Vierer).
// - Die Lochergebnisse liefert PC CADDIE über einen JSON-Endpunkt je Ergebnisliste:
//   app.php?cat=ts_resultlist&sub=resultlist&id=<Turnier>&format=json&result=<data-result>
// - Bitte sparsam nutzen und mit dem Club abstimmen (Datenschutz, Nutzungsbedingungen).

const CLUB = "0494450";            // GC Burg Overbach
const YEAR_FROM = "2026-01-01";
const KADER = [/* "Vorname Nachname", ... */];

const norm = n => String(n).toLowerCase().replace(/dr\.?/g, " ")
  .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
  .replace(/[^a-z\s-]/g, " ").split(/[\s-]+/).filter(Boolean).sort().join(" ");
const KN = new Map(KADER.map(n => [norm(n), n]));
const base = `/clubs/${CLUB}/app.php?cat=ts_resultlist`;
const html = async u => new DOMParser().parseFromString(await fetch(u, { credentials: "include" }).then(r => r.text()), "text/html");

async function run() {
  const list = await html(base);
  const ids = [...new Set([...list.querySelectorAll('a[href*="sub=resultlist"]')]
    .map(a => new URL(a.getAttribute("href"), location.href).searchParams.get("id")))];
  const out = [];
  for (const id of ids) {
    const d = await html(`${base}&sub=resultlist&id=${id}`);
    const txt = d.body.textContent.replace(/\s+/g, " ");
    const dm = txt.match(/Datum\s+\S+\s+(\d{2})\.(\d{2})\.(\d{4})/);
    const date = dm ? `${dm[3]}-${dm[2]}-${dm[1]}` : null;
    if (!date || date < YEAR_FROM) continue;
    const form = (txt.match(/Spielform\s+(.+?)\s+Runde/) || [])[1] || "";
    if (!/^Einzel/i.test(form)) continue;
    const title = ((txt.match(/Turnierergebnisse\s+(.+?)\s+Datum/i) || [])[1] || "Turnier").trim();
    const players = {};
    d.querySelectorAll("tr[data-player-group]").forEach(tr => {
      const td = [...tr.querySelectorAll("td")].map(x => x.textContent.replace(/\s+/g, " ").trim());
      const g = tr.dataset.playerGroup;
      if (!players[g]) players[g] = {
        name: (td[2] || "").replace(/\(.*?\)/, "").trim(),
        hcpi: parseFloat(((td[2] || "").match(/\(([\d.+-]+)\)/) || [])[1]),
        phcp: +td[4], brutto: +td[5], netto: +td[6], gbe: +td[7] || null, result: tr.dataset.result
      };
    });
    const holes = {};
    for (const rid of new Set(Object.values(players).map(p => p.result))) {
      const j = await fetch(`${base}&sub=resultlist&id=${id}&format=json&result=${rid}`, { credentials: "include" }).then(r => r.json());
      Object.values(j.data || {}).forEach(rd => Object.entries(rd).forEach(([g, arr]) => {
        if (arr[0] && arr[0].sDataScoreCsv) holes[g] = arr[0].sDataScoreCsv.split(",").map(Number);
      }));
    }
    for (const [g, p] of Object.entries(players)) {
      const [last, first] = p.name.split(",").map(s => s.trim());
      const k = KN.get(norm(`${first} ${last}`));
      if (k && holes[g]) out.push({ kader: k, date, tid: id, title, ...p, scores: holes[g] });
    }
  }
  window.PCC_EXPORT = out;
  return `${out.length} Runden exportiert`;
}
run().then(console.log);
