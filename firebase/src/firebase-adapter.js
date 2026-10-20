/* GCBO AK 30 – Firebase-Adapter
 *
 * Die App wurde als Claude-Artifact gebaut und erwartet window.claude.use(name).
 * Dieser Adapter stellt dieselbe Schnittstelle auf Firebase-Basis bereit:
 *   db        -> Cloud Firestore (compat SDK, API nahezu identisch)
 *   user      -> Firebase Authentication + Rollen aus members/{email}
 *   sample    -> Cloud Function "ask" (ruft die Claude-API serverseitig auf)
 *   downloads -> normaler Datei-Download im Browser
 *   mcp       -> nicht verfügbar (Startzeiten-Update nur in der Claude-App)
 *
 * Voraussetzung: firebase-config.js setzt window.FIREBASE_CONFIG,
 * die compat-SDKs (app, auth, firestore, functions) sind vor diesem Skript geladen.
 */
(function () {
  "use strict";
  firebase.initializeApp(window.FIREBASE_CONFIG);
  const auth = firebase.auth();
  const fs = firebase.firestore();
  const fns = firebase.app().functions(window.FIREBASE_REGION || "europe-west3");

  let member = null;            // {role: "captain" | "member", name?}
  let resolveReady;
  const ready = new Promise(r => (resolveReady = r));

  /* ---------- Anmeldung ---------- */
  function gate(msg) {
    let el = document.getElementById("fb-gate");
    if (!el) {
      el = document.createElement("div");
      el.id = "fb-gate";
      el.style.cssText = "position:fixed;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;background:rgba(0,20,60,.55);padding:16px";
      document.body.append(el);
    }
    el.innerHTML = `<div style="background:#fff;color:#151c29;border-radius:14px;padding:24px;max-width:380px;width:100%;font:15px system-ui,sans-serif;display:flex;flex-direction:column;gap:12px">
      <b style="font-size:18px;color:#003399">GCBO · AK 30</b><span>${msg}</span>
      <button id="fb-login" style="padding:10px 14px;border-radius:8px;border:0;background:#003399;color:#fff;font-weight:600;cursor:pointer">Mit Google anmelden</button>
      <button id="fb-logout" style="padding:8px 14px;border-radius:8px;border:1px solid #cfd6e2;background:#fff;cursor:pointer">Anderes Konto</button></div>`;
    el.querySelector("#fb-login").onclick = () => auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()).catch(e => alert(e.message));
    el.querySelector("#fb-logout").onclick = () => auth.signOut();
  }
  function ungate() { const el = document.getElementById("fb-gate"); if (el) el.remove(); }

  auth.onAuthStateChanged(async u => {
    if (!u) { member = null; gate("Bitte melde dich an, um die Team-App zu nutzen."); return; }
    try {
      const snap = await fs.doc(`members/${u.email.toLowerCase()}`).get();
      if (!snap.exists) { gate(`${u.email} ist noch nicht freigeschaltet. Bitte den Captain, dich als Mitglied einzutragen.`); return; }
      member = snap.data();
      ungate();
      resolveReady(true);
    } catch (e) { gate("Anmeldung fehlgeschlagen: " + e.message); }
  });

  /* ---------- db ---------- */
  const mapErr = e => {
    const code = e && e.code === "permission-denied" ? "invalid_argument"
      : e && e.code === "not-found" ? "invalid_argument"
      : e && e.code === "resource-exhausted" ? "resource_exhausted" : "unavailable";
    return { code, message: e && e.message };
  };
  const wrapDoc = ref => ({
    id: ref.id, path: ref.path,
    get: () => ref.get(),
    set: d => ref.set(d).catch(e => { throw mapErr(e); }),
    update: d => ref.update(d).catch(e => { throw mapErr(e); }),
    delete: () => ref.delete().catch(e => { throw mapErr(e); }),
    onSnapshot: (next, err) => ref.onSnapshot(next, e => err && err(mapErr(e))),
    collection: p => wrapCol(ref.collection(p)),
  });
  const wrapQuery = q => ({
    where: (...a) => wrapQuery(q.where(...a)),
    orderBy: (...a) => wrapQuery(q.orderBy(...a)),
    limit: n => wrapQuery(q.limit(n)),
    get: () => q.get(),
    onSnapshot: (next, err) => q.onSnapshot(next, e => err && err(mapErr(e))),
  });
  const wrapCol = ref => Object.assign(wrapQuery(ref), {
    path: ref.path,
    doc: id => wrapDoc(id ? ref.doc(id) : ref.doc()),
    add: d => ref.add(d).then(wrapDoc).catch(e => { throw mapErr(e); }),
  });
  const db = { doc: p => wrapDoc(fs.doc(p)), collection: p => wrapCol(fs.collection(p)) };

  /* ---------- user ---------- */
  const isCaptain = () => !!member && member.role === "captain";
  const user = {
    isOwner: async () => isCaptain(),
    canEdit: async () => isCaptain(),
    can: async cap => cap === "data.write" ? !!member : null,
    id: async () => (auth.currentUser ? auth.currentUser.uid : null),
    me: async () => ({ id: auth.currentUser && auth.currentUser.uid, name: (member && member.name) || (auth.currentUser && auth.currentUser.displayName) || "", email: auth.currentUser && auth.currentUser.email }),
    name: async () => (member && member.name) || "",
  };

  /* ---------- sample (Claude über Cloud Function) ---------- */
  const askFn = fns.httpsCallable("ask", { timeout: 120000 });
  const blobToB64 = b => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res({ media_type: b.type || "image/jpeg", data: String(r.result).split(",")[1] });
    r.onerror = rej; r.readAsDataURL(b);
  });
  async function sample(input, opts = {}) {
    const messages = typeof input === "string" ? [{ role: "user", content: input }] : input;
    const imgs = opts.images ? await Promise.all([...opts.images].map(blobToB64)) : [];
    try {
      const r = await askFn({ messages, images: imgs });
      const text = r.data.text || "";
      if (opts.onText) opts.onText({ text, delta: text });
      return { text, truncated: !!r.data.truncated };
    } catch (e) {
      throw { code: e.code === "functions/resource-exhausted" ? "rate_limited" : e.code === "functions/permission-denied" ? "not_granted" : "unavailable", message: e.message };
    }
  }
  sample.json = async (input, opts) => {
    const { text } = await sample(input, opts);
    const t = text.trim();
    const m = t.match(/```(?:json)?\s*([\s\S]*?)```/);
    const body = m ? m[1] : t.slice(Math.min(...["{", "["].map(c => (t.indexOf(c) + 1 || 1e9) - 1)), Math.max(t.lastIndexOf("}"), t.lastIndexOf("]")) + 1);
    try { return JSON.parse(body); } catch (e) { throw { code: "invalid_json", text }; }
  };
  sample.limits = async () => ({ maxPromptBytes: 262144, images: { maxCount: 1, maxInputBytes: 15 * 1024 * 1024, mediaTypes: ["image/jpeg", "image/png", "image/webp", "image/heic"] } });

  /* ---------- downloads ---------- */
  const downloads = {
    save: async ({ filename, data }) => {
      const blob = data instanceof Blob ? data : new Blob([data], { type: "text/calendar" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = filename; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      return { saved: true };
    },
  };

  const caps = { db, user, sample, downloads };
  window.claude = {
    use: async name => {
      if (!(name in caps)) return null;
      await ready;
      return caps[name];
    },
  };
})();
