#!/usr/bin/env python3
"""Baut aus app/index.html und einem Daten-Schnappschuss eine eigenständige HTML-Datei.

Die Vorschau läuft ohne Claude in jedem Browser. Statt der Claude-Datenbank
liefert ein kleiner In-Memory-Ersatz (shim) die Daten aus dem Schnappschuss.
Änderungen in der Vorschau werden nicht gespeichert.

Aufruf:
    python3 preview/build_preview.py data/snapshot.json dist/GCBO-AK30-Vorschau.html
    python3 preview/build_preview.py example-data/snapshot.example.json dist/demo.html

Format des Schnappschusses:
    {"docs": {"pfad/zum/dokument": {...}},
     "cols": {"collection": {"dokument-id": {...}}}}
"""
import json
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

NO_JS_HINT = (
    '<div class="empty"><b>Die App startet nicht?</b><br>Diese Datei braucht JavaScript. '
    'Vorschauen in Mail, WhatsApp, der Dateien-App oder im Claude-Chat führen es nicht aus. '
    'Bitte die Datei herunterladen und in einem Browser öffnen: Chrome, Safari, Edge oder Firefox.</div>'
)

PREVIEW_CSS = (
    ".previewbar{background:var(--warn-soft);color:var(--warn);font:600 13px var(--f-body);"
    "padding-block:8px;padding-left:max(16px,env(safe-area-inset-left,0px));"
    "padding-right:max(16px,env(safe-area-inset-right,0px));text-align:center}\n"
)

HEAD = (
    '<!doctype html>\n<html lang="de"><head><meta charset="utf-8">'
    '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
    "<style>:root{box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);"
    "padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,sans-serif}"
    "img{max-width:100%}[hidden]{display:none!important}</style></head><body>\n"
)


def build(snapshot_path: Path, out_path: Path) -> None:
    app = (ROOT / "app" / "index.html").read_text(encoding="utf-8")
    shim = (ROOT / "preview" / "shim.template.js.html").read_text(encoding="utf-8")
    data = json.loads(snapshot_path.read_text(encoding="utf-8"))
    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    shim = shim.replace("__DATA__", payload)
    stand = data.get("stand") or date.today().strftime("%d.%m.%Y")
    bar = (
        f'<div class="previewbar" role="note">Vorschau zum Feedback · Datenstand {stand} · '
        "Änderungen werden nicht gespeichert. Foto-Erkennung, Regelfragen und Aktualisieren "
        "funktionieren nur in der Claude-App.</div>\n"
    )

    app = app.replace("@media (prefers-reduced-motion", PREVIEW_CSS + "@media (prefers-reduced-motion", 1)
    app = app.replace('<div class="empty">Daten werden geladen …</div>', NO_JS_HINT, 1)
    app = app.replace("<title>Overbach AK 30</title>", "<title>Overbach AK 30 · Vorschau</title>", 1)
    marker = '<header class="top">'
    if marker not in app:
        sys.exit("app/index.html: Kopfzeile nicht gefunden")
    app = app.replace(marker, shim + "\n" + bar + marker, 1)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(HEAD + app + "\n</body></html>\n", encoding="utf-8")
    print(f"geschrieben: {out_path} ({out_path.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    build(Path(sys.argv[1]), Path(sys.argv[2]))
