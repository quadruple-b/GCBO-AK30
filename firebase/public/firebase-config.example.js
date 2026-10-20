// Kopieren nach public/firebase-config.js und mit den Werten aus der Firebase-Konsole füllen:
// Projekteinstellungen -> Allgemein -> Meine Apps -> Web-App -> SDK-Konfiguration (Config)
window.FIREBASE_CONFIG = {
  apiKey: "…",
  authDomain: "gcbo-ak30.firebaseapp.com",
  projectId: "gcbo-ak30",
  storageBucket: "gcbo-ak30.appspot.com",
  messagingSenderId: "…",
  appId: "…"
};
// Region der Cloud Functions (muss zu functions/index.js passen)
window.FIREBASE_REGION = "europe-west3";
