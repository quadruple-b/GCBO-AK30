#!/usr/bin/env python3
"""Baut public/index.html für Firebase Hosting aus app/index.html.

    python3 firebase/build.py

Fügt vor dem App-Skript ein: Firebase compat-SDKs, public/firebase-config.js
und src/firebase-adapter.js (stellt window.claude.use auf Firebase-Basis bereit).
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FB = ROOT / "firebase"
SDK = "10.12.2"

app = (ROOT / "app" / "index.html").read_text(encoding="utf-8")
adapter = (FB / "src" / "firebase-adapter.js").read_text(encoding="utf-8")

sdk = "\n".join(
    f'<script src="https://www.gstatic.com/firebasejs/{SDK}/firebase-{m}-compat.js"></script>'
    for m in ["app", "auth", "firestore", "functions"]
)
inject = f'{sdk}\n<script src="firebase-config.js"></script>\n<script>\n{adapter}\n</script>\n'

marker = "<script>\n(() => {"
if marker not in app:
    raise SystemExit("App-Skript in app/index.html nicht gefunden")
app = app.replace(marker, inject + marker, 1)
app = app.replace('<div class="empty">Daten werden geladen …</div>', '<div class="empty">Anmeldung wird geprüft …</div>', 1)

head = ('<!doctype html>\n<html lang="de"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
        '<meta name="theme-color" content="#002670">\n'
        "<style>:root{box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);"
        "padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,sans-serif}"
        "img{max-width:100%}[hidden]{display:none!important}</style></head><body>\n")
out = FB / "public" / "index.html"
out.write_text(head + app + "\n</body></html>\n", encoding="utf-8")
print(f"geschrieben: {out.relative_to(ROOT)} ({out.stat().st_size // 1024} KB)")
