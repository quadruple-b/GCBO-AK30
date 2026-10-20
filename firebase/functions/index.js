/* GCBO AK 30 – Cloud Functions
 *
 * ask          Callable: leitet Anfragen der App an die Claude-API weiter
 *              (Scorekarten-Foto auslesen, Trainingsplan vorschlagen, Regelfragen).
 *              Der API-Schlüssel liegt als Secret ANTHROPIC_API_KEY auf dem Server.
 * weatherDaily Zeitgesteuert (täglich 06:00 Europe/Berlin): Vorhersage für Much
 *              von Open-Meteo holen und in weather/much speichern.
 */
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineSecret } = require("firebase-functions/params");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");
const Anthropic = require("@anthropic-ai/sdk");

admin.initializeApp();
setGlobalOptions({ region: "europe-west3", maxInstances: 5 });

const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");
const MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-5-5";

async function requireMember(auth) {
  if (!auth || !auth.token || !auth.token.email) throw new HttpsError("unauthenticated", "Bitte anmelden.");
  const snap = await admin.firestore().doc(`members/${auth.token.email.toLowerCase()}`).get();
  if (!snap.exists) throw new HttpsError("permission-denied", "Nicht freigeschaltet.");
  return snap.data();
}

exports.ask = onCall({ secrets: [ANTHROPIC_API_KEY], timeoutSeconds: 120, memory: "512MiB" }, async (req) => {
  await requireMember(req.auth);
  const { messages, images } = req.data || {};
  if (!Array.isArray(messages) || !messages.length) throw new HttpsError("invalid-argument", "messages fehlt");
  if (JSON.stringify(messages).length > 256 * 1024) throw new HttpsError("invalid-argument", "Anfrage zu groß");

  // Bilder (Base64) an die letzte Nutzernachricht hängen
  const msgs = messages.map(m => ({ role: m.role, content: m.content }));
  const last = msgs[msgs.length - 1];
  if (Array.isArray(images) && images.length) {
    last.content = [
      ...images.slice(0, 1).map(img => ({ type: "image", source: { type: "base64", media_type: img.media_type, data: img.data } })),
      { type: "text", text: String(last.content) },
    ];
  }

  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });
  try {
    const res = await client.messages.create({ model: MODEL, max_tokens: 2000, messages: msgs });
    const text = res.content.filter(b => b.type === "text").map(b => b.text).join("\n");
    return { text, truncated: res.stop_reason === "max_tokens" };
  } catch (e) {
    if (e.status === 429) throw new HttpsError("resource-exhausted", "Zu viele Anfragen");
    throw new HttpsError("internal", "Claude-API nicht erreichbar");
  }
});

const WX_URL = "https://api.open-meteo.com/v1/forecast?latitude=50.9028&longitude=7.4036"
  + "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,sunrise,sunset"
  + "&hourly=temperature_2m,precipitation,precipitation_probability,wind_speed_10m,wind_gusts_10m,weather_code"
  + "&timezone=Europe%2FBerlin&forecast_days=7&wind_speed_unit=kmh";

exports.weatherDaily = onSchedule({ schedule: "0 6 * * *", timeZone: "Europe/Berlin" }, async () => {
  const j = await (await fetch(WX_URL)).json();
  const d = j.daily, h = j.hourly;
  const daily = d.time.map((t, i) => ({
    date: t, code: d.weather_code[i], tmax: d.temperature_2m_max[i], tmin: d.temperature_2m_min[i],
    prec: d.precipitation_sum[i], pp: d.precipitation_probability_max[i], wind: d.wind_speed_10m_max[i],
    gust: d.wind_gusts_10m_max[i], rise: String(d.sunrise[i]).slice(11), set: String(d.sunset[i]).slice(11),
  }));
  const hourly = h.time.map((t, i) => ({
    t, temp: Math.round(h.temperature_2m[i]), prec: h.precipitation[i], pp: h.precipitation_probability[i],
    wind: Math.round(h.wind_speed_10m[i]), gust: Math.round(h.wind_gusts_10m[i]), code: h.weather_code[i],
  })).filter(x => { const hh = +x.t.slice(11, 13); return hh >= 7 && hh <= 20; });
  await admin.firestore().doc("weather/much").set({
    place: "Much", lat: 50.9028, lon: 7.4036, source: "Open-Meteo (DWD ICON und weitere Modelle)",
    updatedAt: Date.now(), daily, hourly,
  });
});
