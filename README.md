# Neural Command Center

Lokales Trading-Dashboard mit Morgen-Briefing, News-/Social-Feeds, Trading-Journal,
Funded-Konten-Übersicht und einem live aus dem Obsidian-Vault gespeisten 3D-„Gehirn".
Basiert auf `SPEC.md` im Projektordner.

**Aktueller Baustand:** Phase 3 (Konten, manuell) – siehe Abschnitt „Phasenplan" unten.

## Installation

1. [Node.js 22+](https://nodejs.org/) installieren.
2. pnpm installieren: `npm install -g pnpm`
3. Im Projektordner: `pnpm install`

## Schlüssel besorgen (optional, jede Quelle einzeln)

Jede fehlende Quelle zeigt im Dashboard „Nicht verbunden" statt abzustürzen. Du kannst
also sofort starten und Schlüssel nach und nach ergänzen.

| Variable | Wofür | Kostenlos? |
|---|---|---|
| `ANTHROPIC_API_KEY` | Morgen-Briefing, News-Bewertung, Screenshot-Analyse | Nein, Pay-as-you-go (siehe `AI_MONTHLY_BUDGET_USD`) |
| `FMP_API_KEY` oder `TWELVEDATA_API_KEY` | Kurse, Wirtschaftskalender | Kostenlose Stufe vorhanden |
| `COINGECKO_API_KEY` | Krypto-Kurse/News | Demo-Key kostenlos |
| `REDDIT_CLIENT_ID` / `_SECRET` | Social-Feed | Kostenlos (eigene Reddit-App anlegen) |
| `LUNARCRUSH_API_KEY` | Social-Sentiment | Kostenlose Stufe vorhanden |
| `YOUTUBE_API_KEY` | Trend-Videos | Kostenlos über Google Cloud Console |
| `NTFY_TOPIC` | Push-Benachrichtigungen | Kostenlos, [ntfy.sh](https://ntfy.sh) |

Preise und Kontingente ändern sich – vor dem produktiven Einsatz beim jeweiligen Anbieter
aktuell prüfen.

Trage die Werte in eine `.env`-Datei im Projektordner ein (Vorlage: `.env.example`).
Diese Datei wird nie committed (`.gitignore`).

## Start

```bash
pnpm dev
```

Öffnet Server (`http://127.0.0.1:4000`) und Oberfläche (`http://127.0.0.1:5173`).
Unter Windows reicht ein Doppelklick auf `start.bat` (kopiert beim ersten Mal
`.env.example` nach `.env`, installiert Abhängigkeiten und öffnet den Browser).

Beide Serverteile binden bewusst nur an `127.0.0.1` – das Dashboard ist nie aus dem
Netzwerk erreichbar.

## Datenbank

SQLite-Datei unter `data/command-center.db`. Migrationen werden bei jedem
Serverstart automatisch angewendet (kein manueller Schritt nötig). Nur nach
einer Schema-Änderung im Code wird eine neue Migration gebraucht:

```bash
pnpm db:generate   # Migration aus dem Schema erzeugen (einmalig, als Entwickler)
pnpm db:migrate    # Migration manuell anwenden (optional, passiert sonst automatisch)
```

## Fehlerbehebung

- **„pnpm wurde nicht gefunden"**: `npm install -g pnpm` ausführen, Terminal neu öffnen.
- **Port 4000 oder 5173 belegt**: anderen Prozess beenden oder `PORT` in `.env` ändern
  (Vite-Port in `apps/web/vite.config.ts`).
- **Quelle zeigt „Fehler" in den Einstellungen**: Schlüssel in `.env` prüfen, Server
  neu starten (`.env` wird nur beim Start gelesen).
- **Obsidian-Vault wird nicht gefunden**: `VAULT_PATH` in `.env` auf den echten Pfad
  deines Vaults setzen (Windows-Pfad mit Backslashes ist ok).

## Phasenplan

Gebaut wird in den 9 Phasen aus `SPEC.md` Abschnitt 12. Jede Phase ist für sich
lauffähig:

1. **Fundament** – Monorepo, Designsystem, Navigation, SQLite ✅
2. **Gehirn + Obsidian live** – Vault-Parser, Live-Watcher (WebSocket, < 1s Latenz),
   3D-Gehirn mit Regionen/Farben, Hover/Klick-Panel, To-do-Satelliten, Filter ✅
3. **Konten (manuell)** – Konto-Formular mit Vorlagen (The5ers, FTMO), Ampel &
   Fortschrittsringe, Regel-Checkliste, Kopier-Risiko-Rechner, Auszahlungen mit
   Netto-ROI, Account-Feed, eigene Ziele, Steuer-Export (CSV) ✅
4. Trading-Journal
5. News-Feed
6. Morgen-Briefing
7. Social-Feed
8. Konten-Import (CSV/HTML-Export – MT5-Live-Anbindung bewusst nicht gebaut, da
   Variante C „manuell/Import" gewählt wurde)
9. Extras (Kalender, Wochen-Review, „Frag dein Gehirn", Backups)

## Entscheidungen (Stand: Projektstart)

- Morgen-Briefing: 07:30 Uhr, Mo–Fr, Europe/Berlin.
- Watchlist: NQ/US100, ES/US500, XAUUSD, EURUSD, DXY, US10Y, BTC, ETH.
- Konten-Anbindung: Variante C (manuell/Import) – kein Cloud-Dienst loggt sich von
  fremden Servern ins MT5-Konto ein.
