/* Firestore mit einem Daten-Schnappschuss füllen und den ersten Captain eintragen.
 *
 *   cd firebase/scripts && npm install firebase-admin
 *   export GOOGLE_APPLICATION_CREDENTIALS=/pfad/zum/service-account.json
 *   node seed.js ../../example-data/snapshot.example.json captain@example.com "Paul"
 *
 * Format des Schnappschusses wie in preview/build_preview.py:
 *   {"docs": {"pfad/doc": {...}}, "cols": {"collection": {"id": {...}}}}
 * Vorhandene Dokumente mit gleicher ID werden überschrieben.
 */
const fs = require("fs");
const admin = require("firebase-admin");

const [, , snapshotPath, captainEmail, captainName] = process.argv;
if (!snapshotPath) {
  console.error("Aufruf: node seed.js <snapshot.json> [captain-email] [name]");
  process.exit(1);
}

admin.initializeApp();
const db = admin.firestore();

(async () => {
  const snap = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
  const writes = [];
  for (const [path, data] of Object.entries(snap.docs || {})) writes.push([path, data]);
  for (const [col, docs] of Object.entries(snap.cols || {}))
    for (const [id, data] of Object.entries(docs)) writes.push([`${col}/${id}`, data]);
  if (captainEmail) writes.push([`members/${captainEmail.toLowerCase()}`, { role: "captain", name: captainName || "" }]);

  for (let i = 0; i < writes.length; i += 400) {
    const batch = db.batch();
    writes.slice(i, i + 400).forEach(([p, d]) => batch.set(db.doc(p), d));
    await batch.commit();
  }
  console.log(`${writes.length} Dokumente geschrieben.`);
})().catch(e => { console.error(e); process.exit(1); });
