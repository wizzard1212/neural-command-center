# Neural Command Center

Lokales Trading-Dashboard mit Morgen-Briefing, News-/Social-Feeds, Trading-Journal,
Funded-Konten-Übersicht und einem live aus dem Obsidian-Vault gespeisten 3D-„Gehirn".
Basiert auf `SPEC.md` im Projektordner.

**Aktueller Baustand:** Phase 9 (Extras) – alle 9 Phasen aus SPEC.md Abschnitt 12
sind gebaut. Siehe Abschnitt „Phasenplan" unten.

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
`.env.example` nach `.env`, installiert Abhängigkeiten und öffnet das Dashboard).

Beide Serverteile binden bewusst nur an `127.0.0.1` – das Dashboard ist nie aus dem
Netzwerk erreichbar.

### Als "Desktop-App"

`start.bat` öffnet Chrome oder Edge im App-Modus (`--app=...`, eigenes Profil
unter `data/browser-profile/`) – kein Adressleiste/Tabs, sieht aus wie eine
eigene Anwendung statt ein Browser-Tab. Ist keins von beiden installiert, öffnet
sich stattdessen der Standardbrowser normal.

Für ein Icon in der Taskleiste/im Startmenü: Rechtsklick auf `start.bat` →
"Verknüpfung erstellen", die Verknüpfung an die Taskleiste anheften oder in den
Ordner `shell:startup` legen (Windows-Autostart). Ein eigenes `.exe` (Electron/
Tauri) wäre ebenfalls möglich, ist aber deutlich aufwendiger und bringt für ein
Dashboard, das sowieso nur lokal läuft, keinen echten Zusatznutzen.

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
4. **Trading-Journal** – Setup-Erfassung mit Screenshot (Strg+V/Drag&Drop), live
   berechnetem Positionsgrößen-Rechner, R:R und Risiko, Setup-Typ/Emotion-Tags,
   Regel-Check, optionaler Claude-Vision-Screenshot-Analyse, Galerie-/Tabellen-
   Ansicht mit Filtern, Kalender-Heatmap, Statistik (Winrate, Profit-Faktor,
   Erwartungswert, Drawdown, Auswertung nach Setup/Session/Instrument/Emotion) ✅
5. **News-Feed** – RSS-Sammler (9 Quellen, config/feeds.json, einzeln an/aus
   schaltbar), Duplikaterkennung mit Clustering ("X Quellen berichten"),
   KI-Bewertung im Batch (Relevanz, Assets, Richtung, Kategorie, Zusammenfassung –
   läuft automatisch sobald ein ANTHROPIC_API_KEY hinterlegt ist), 3-Spalten-
   Oberfläche mit Filtern, "Zusammenhang erklären" und "Als Content-Idee merken",
   KI-Kostenübersicht mit Monatsbudget in den Einstellungen ✅
6. **Morgen-Briefing** – Cron (Standard Mo–Fr 07:30 Europe/Berlin, in den Einstellungen
   änderbar) + Button „Briefing jetzt erstellen", paralleles Einsammeln von Kursen
   (FMP/CoinGecko), Wirtschaftskalender, COT-Daten, Konten-Puffer/Risiko, Merlins
   eigenen Risiko-Regeln und offenen To-dos aus dem Vault (jede Quelle einzeln
   fehlertolerant), Claude erstellt die 11 Abschnitte als erzwungenes JSON
   (läuft automatisch sobald ein ANTHROPIC_API_KEY hinterlegt ist, sonst werden nur
   die Rohdaten gespeichert), Speicherung in SQLite und als Vault-Notiz
   (`Vault/Dashboard/Briefings/`), Windows-Benachrichtigung + optionaler
   ntfy.sh-Push, kompakte Karte in der Zentrale mit Detail-Ansicht ✅
7. **Social-Feed** – fünf Quellen hinter einer gemeinsamen `SocialSource`-
   Schnittstelle (Reddit via OAuth, LunarCrush, CoinGecko Trending, Google
   Trends als "experimentell" markiert, YouTube Data API), jede einzeln
   fehlertolerant inkl. eines Prozess-weiten Schutzschalters gegen rohe
   Socket-Fehler aus der inoffiziellen Google-Trends-Bibliothek; Hype-Radar
   (Z-Score gegenüber 7-Tage-Schnitt) mit Sparkline, Sentiment-Barometer der
   Watchlist als Halbkreis-Gauges mit Extremwert-Warnung, Plattform-Kacheln
   mit Mini-Feed, KI-Hook-Idee-Generator + "Als Content-Idee merken" wie in
   Phase 5, Social-Trends fließen zusätzlich ins Morgen-Briefing (Phase 6) ✅
8. **Konten-Import** – MT5-Live-Anbindung bewusst nicht gebaut (Variante C
   „manuell/Import" aus Sicherheitsgründen gewählt). Tägliche Stände lassen
   sich seit Phase 3 manuell erfassen; neu: MT5-Kontoauszug (HTML- oder
   CSV-Export der Konto-Historie) auf der Kontodetailseite hochladen und in
   einem Rutsch als Tages-Stände importieren. Spalten werden über die
   Kopfzeile erkannt (Deutsch und Englisch), Ein-/Auszahlungen zählen nicht
   als Trading-P&L, bereits vorhandene Tage werden übersprungen, unbekanntes
   Format liefert eine klare Fehlermeldung statt falscher Daten ✅
9. **Extras** ✅
   - **Kalender & Kein-Trade-Fenster**: Wirtschaftskalender (FMP, 7 Tage) farbig
     nach Impact, automatisch berechnete Kein-Trade-Fenster aus High-Impact-
     Terminen + der News-Regel jedes Kontos, Countdown + Risiko-Ampel in der
     Statusleiste (vorher unverdrahtete Platzhalter aus Phase 1), ntfy-Push
     10 Minuten vorher
   - **Wochen-Review**: automatisch Sonntag 18:00, Claude fasst Zahlen, Muster,
     Regelbrüche und 3 konkrete Verbesserungen zusammen, Vault-Export + Push
   - **„Frag dein Gehirn“**: Chat auf der Zentrale, einfache Volltextsuche über
     den Vault (Titel- und Inhaltstreffer gewichtet) + Konten-/Journal-/
     Briefing-Daten als Kontext, nennt die genutzten Notizen als Quelle
   - **Prognose-Logbuch**: eigene Prognosen oder Einschätzungen direkt aus dem
     Morgen-Briefing merken, als eingetroffen/nicht eingetroffen markieren,
     Trefferquote
   - **Backups**: täglich 03:00 Uhr über better-sqlite3s Online-Backup-API
     (kein roher Dateikopiervorgang, daher nie beschädigt bei WAL-Schreib-
     zugriff), letzte 14 behalten, Status + manueller Trigger in den
     Einstellungen
   - **Command-Palette** (Strg+K): Notiz suchen, Trade anlegen, Briefing neu
     erstellen, zu jeder Leiste springen
   - **News-Kanal-Brücke**: Button „Skript für heute“ erzeugt aus Briefing +
     gemerkten Content-Ideen einen Skript-Entwurf passend zum Wochenplan-Thema
     des Kanals, Vault-Export
   - Claude Vision im Journal bereits seit Phase 4 vorhanden

## Entscheidungen (Stand: Projektstart)

- Morgen-Briefing: 07:30 Uhr, Mo–Fr, Europe/Berlin.
- Watchlist: NQ/US100, ES/US500, XAUUSD, EURUSD, DXY, US10Y, BTC, ETH.
- Konten-Anbindung: Variante C (manuell/Import) – kein Cloud-Dienst loggt sich von
  fremden Servern ins MT5-Konto ein.
