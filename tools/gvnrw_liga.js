// GVNRW Liga-Portal – Ergebnisse und Scorekarten der NRW-Mannschaftsmeisterschaft auslesen
//
// Ausführen in der Browser-Konsole auf https://gvnrw.liga.golf/ (CORS erlaubt nur diese Seite).
// Datenquelle: öffentliche GraphQL-Schnittstelle https://gvnrw-backend.liga.golf/
//
// Ablauf
// 1. findLeagues(year)               -> Ligen und Gruppen (z. B. "NRW-MM Herren AK 30 - 2026")
// 2. findLeagueResult(leagueId, ...) -> Tabelle je Gruppe inkl. Auf-/Abstieg (goes_up_down: 1 = auf, 2 = ab)
// 3. findTeamResult(teamId)          -> je Spieltag alle Spieler mit Par und Schlägen je Loch
//
// Teamwertung: pro Spieltag zählen die 5 besten von 6 Ergebnissen (Schläge über Course Rating).

const API = "https://gvnrw-backend.liga.golf/";
const gq = (query, variables) => fetch(API, {
  method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ query, variables })
}).then(r => r.json());

const Q_LEAGUES = `query findLeagues($year: String!, $useVisibilty: Boolean) {
  findLeagues(input: { year: $year, useVisibilty: $useVisibilty }) {
    leagues { leagueId name subLeagues { sort leagueId name } } } }`;

const Q_RESULT = `query findLeagueResult($leagueId: String!, $subLeagues: [SubLeagueInput]!, $useVisibilty: Boolean) {
  findLeagueResult(input: { leagueId: $leagueId, subLeagues: $subLeagues, useVisibilty: $useVisibilty }) {
    result { name spieltage { name date isverified }
      teams { teamId goes_up_down data { value } } } } }`;

const Q_TEAM = `query findTeamResult($teamId: Int!) {
  findTeamResult(input: { teamId: $teamId }) {
    spieltage { name date clubname tee
      players { name familyname hcp erg_brutto plusCR pars scores } } } }`;

async function run(year = "2026", ligen = /^Liga [45]\./) {
  const L = (await gq(Q_LEAGUES, { year, useVisibilty: true })).data.findLeagues.leagues
    .find(l => /Herren AK 30/i.test(l.name));
  const teams = [];
  for (const s of L.subLeagues.filter(s => ligen.test(s.name))) {
    const res = (await gq(Q_RESULT, { leagueId: s.leagueId, subLeagues: [s], useVisibilty: true }))
      .data.findLeagueResult.result[0];
    const cols = res.spieltage.map(x => x.name);
    for (const t of res.teams) {
      const v = t.data.map(d => d.value);
      teams.push({ group: s.name, teamId: t.teamId, rank: +v[0], club: v[1].trim(), updown: t.goes_up_down,
        avgOverCR: v[cols.indexOf("Ø über CR")] });
    }
  }
  const rounds = [];
  for (const t of teams) {
    const r = (await gq(Q_TEAM, { teamId: t.teamId })).data.findTeamResult;
    for (const sd of r.spieltage) for (const p of sd.players) {
      if (!p.scores || p.scores.length < 21) continue;   // 9 + Out + 9 + In + Gesamt
      rounds.push({ ...t, matchday: sd.name, date: sd.date, course: sd.clubname.trim(), tee: sd.tee,
        name: `${p.name} ${p.familyname}`.trim(), hcp: p.hcp, brutto: p.erg_brutto, plusCR: p.plusCR,
        pars: [...p.pars.slice(0, 9), ...p.pars.slice(10, 19)],
        scores: [...p.scores.slice(0, 9), ...p.scores.slice(10, 19)] });
    }
  }
  window.LIGA_EXPORT = { year, teams, rounds };
  return `${teams.length} Teams, ${rounds.length} Runden`;
}
run().then(console.log);
