# Bauauftrag für Claude Code: „Neural Command Center“ – Trading-Dashboard mit autonomem Gehirn

> **So benutzt du diese Datei:** Leg sie als `SPEC.md` in einen leeren Projektordner (z. B. `C:\Users\merli\Projekte\neural-command-center\`), öffne den Ordner mit Claude Code und schreib:
> *„Lies SPEC.md vollständig. Baue das Projekt Phase für Phase. Frag mich nur bei den Punkten unter ‚Entscheidungen, die du mich fragen musst‘. Nach jeder Phase: kurz zeigen, was läuft, und auf mein OK warten.“*

---

## 0. Rolle und Arbeitsregeln für Claude Code

- Du baust für **Merlin**: Day-Trader (Fibonacci, EMAs, Smart-Money-Konzepte), Prop-Firm-Trader (The5ers + FTMO, Konten werden per Traders Connect kopiert), betreibt nebenbei Content-Projekte. Er arbeitet unter **Windows**.
- Sprache der Oberfläche: **Deutsch**. Code, Variablen und Commits: Englisch.
- Kommunikation: direkt, keine Floskeln. Wenn etwas technisch nicht geht oder riskant ist: klar sagen und Alternative nennen.
- **Designregel, nicht verhandelbar: niemals Pink oder Magenta** (keine Farbtöne zwischen ca. 300° und 345° Hue, z. B. kein `#ff2d95`, `#ff00ff`, `#e040fb`). Die Referenzbilder, an denen sich das Design orientiert, enthalten Pink: die Stimmung übernehmen, das Pink durch Cyan, Violett oder Neon-Grün ersetzen.
- Keine Zugangsdaten im Code, im Chat oder in Commits. Alles Geheime gehört in `.env` (steht in `.gitignore`), dazu eine `.env.example` mit Platzhaltern.
- Baue in **Phasen** (Abschnitt 12). Jede Phase muss für sich lauffähig sein.
- Schreibe Tests für die Rechenlogik (Risiko, R:R, Drawdown, Regelprüfung). Diese Zahlen entscheiden über echtes Geld.

### Entscheidungen, die du mich fragen musst
1. Uhrzeit des Morgen-Briefings (Vorschlag: 07:30 Uhr, Mo–Fr, Europe/Berlin)
2. Welche Instrumente auf der Watchlist stehen (Vorschlag: NQ/US100, ES/US500, XAUUSD, EURUSD, DXY, US10Y, BTC, ETH)
3. Welche API-Schlüssel ich schon habe (Abschnitt 9)
4. Ob die Konten-Anbindung lokal über das MT5-Terminal oder über MetaApi laufen soll (Abschnitt 7.4)

---

## 1. Ziel in einem Satz

Ein lokal laufendes Dashboard, das jeden Morgen automatisch ein Markt-Briefing erstellt, News und Social-Media-Trends live sammelt und bewertet, ein Trading-Journal mit Screenshot-Setups führt, alle Prop-Firm-Konten mit Regeln, Zielen und Drawdown überwacht und dabei als Herzstück ein **animiertes „autonomes Gehirn“** zeigt, das live aus dem Obsidian-Vault gespeist wird.

---

## 2. Architektur

```
┌────────────────────────── Merlins PC (Windows) ──────────────────────────┐
│                                                                           │
│  Obsidian Vault  ──(Datei-Watcher)──┐                                     │
│  C:\Users\merli\Documents\Obsidian Vault                                  │
│                                      ▼                                    │
│  MT5-Terminal ──(Python MetaTrader5)─► Backend (Node/TS, Fastify)         │
│                                      │  • Scheduler (Briefing 07:30)      │
│  Screenshots  ──(Upload/Clipboard)──►│  • Feed-Sammler (News, Social)     │
│                                      │  • Claude API (Analyse, Vision)    │
│                                      │  • SQLite (alle Daten)             │
│                                      │  • WebSocket (Live-Push)           │
│                                      ▼                                    │
│                         Frontend (React, Vite) im Browser                 │
│                         http://localhost:5173  (nur lokal!)               │
└───────────────────────────────────────────────────────────────────────────┘
        ▲ externe APIs: FMP / Twelve Data, CoinGecko, LunarCrush, Reddit,
          RSS-Feeds, Anthropic API (+ optional MetaApi)
```

### Tech-Stack (Vorgabe, Abweichung nur mit Begründung)
| Bereich | Wahl | Warum |
|---|---|---|
| Monorepo | pnpm workspaces: `apps/web`, `apps/server`, `apps/mt5-bridge`, `packages/shared` | klare Trennung, geteilte Typen |
| Frontend | React 19 + TypeScript + Vite, Tailwind CSS, Zustand (State), TanStack Query | schnell, typisiert |
| Gehirn-Visualisierung | `three.js` über `@react-three/fiber` + `@react-three/drei`, Postprocessing (Bloom) | echtes 3D mit Glow |
| Charts | `lightweight-charts` (TradingView, Open Source) für Kurse, `recharts` für Statistiken | Trading-Optik |
| Backend | Node 22 + TypeScript + Fastify + `ws` (WebSocket) | leicht, schnell |
| Datenbank | SQLite über `better-sqlite3` + Drizzle ORM, Datei `data/command-center.db` | lokal, kein Server nötig |
| Scheduler | `node-cron` mit Zeitzone Europe/Berlin | Morgen-Briefing |
| Vault-Watcher | `chokidar` + `gray-matter` (Frontmatter) + eigener Wikilink-Parser | Live-Daten aus Obsidian |
| KI | `@anthropic-ai/sdk`, Modell über `.env` konfigurierbar (`ANTHROPIC_MODEL`, Standard ein aktuelles Sonnet-Modell) mit Web-Search-Tool und Vision | Briefing, Bewertung, Screenshot-Analyse |
| MT5-Anbindung | kleiner Python-Dienst (`apps/mt5-bridge`, FastAPI + Paket `MetaTrader5`) | liest Konten lokal aus dem laufenden Terminal |
| Start | ein Befehl `pnpm dev` startet alles; zusätzlich `start.bat` zum Doppelklicken; optional Autostart beim Windows-Login | einfach |

### Sicherheit
- Server bindet **nur an `127.0.0.1`**, niemals `0.0.0.0`.
- Vault wird **nur gelesen**. Einzige Schreib-Ausnahme: der Ordner `Vault/Dashboard/` (Briefings, Wochen-Reviews, Trade-Notizen). Diesen Ordner beim ersten Start anlegen.
- MT5: nur lesen. Die Bridge darf **keine** Order-Funktionen (`order_send` usw.) enthalten; im Code kommentieren, warum.
- Screenshots liegen lokal unter `data/screenshots/` und werden nur an die Anthropic API geschickt, wenn Merlin auf „Mit KI auslesen“ klickt.

---

## 3. Layout und Navigation („Leisten“)

### Grundgerüst
- **Linke Navigationsleiste (Icon-Rail, 72 px, aufklappbar auf 240 px)** mit den Bereichen:
  1. 🧠 **Zentrale** (Startseite mit Gehirn + Briefing)
  2. 📰 **News-Feed**
  3. 📡 **Social-Feed / Trends**
  4. 📓 **Trading-Journal**
  5. 🏦 **Funded & Konten**
  6. 📅 **Kalender & Kein-Trade-Fenster**
  7. 📊 **Statistik & Wochen-Review**
  8. ⚙️ **Einstellungen**
- **Obere Statusleiste (56 px), immer sichtbar:**
  - Uhrzeit Berlin + New York
  - Sessions als kleine Leuchtpunkte: Asien / London / New York (leuchtet, wenn offen; Countdown bis zur nächsten Eröffnung)
  - Mini-Ticker der Watchlist (Kurs + Tagesänderung, grün/rot)
  - **Risiko-Ampel gesamt** (siehe 7.3)
  - Nächster High-Impact-Termin mit Countdown („CPI in 2 h 14 min“)
  - Verbindungsstatus als Punkte: Vault · MT5 · Feeds · KI
- **Rechte Seitenleiste (einklappbar, 320 px):** „Live-Strom“, ein durchlaufender Feed mit allem, was gerade passiert (neue News mit hoher Relevanz, Vault-Änderungen, Trades, Regelwarnungen). Jeder Eintrag hat die Farbe seines Bereichs.

### Raster
- Panels als „Glas-Karten“ (siehe Designsystem), 12-Spalten-Grid, 16 px Abstand.
- Auf der Zentrale lassen sich Karten per Drag & Drop umsortieren (`dnd-kit`); die Anordnung wird in SQLite gespeichert.
- Mindestbreite 1280 px (Desktop-Tool), ab 1920 px zusätzliche Spalte.

---

## 4. Zentrale (Startseite) mit dem autonomen Gehirn

### 4.1 Das Gehirn: Konzept
Ein **3D-Neuronen-Netz** in Gehirnform in der Mitte der Startseite (ca. 60 % der Höhe). Es ist kein Deko-Element, sondern eine lebende Darstellung von Merlins „zweitem Gehirn“:

- **Jede Notiz im Obsidian-Vault = ein Knoten (Neuron).** Jede `[[Wikilink]]`-Verknüpfung = eine Verbindung (Synapse).
- Knoten werden auf die Form eines Gehirns verteilt: Die Punktwolke einer stilisierten Gehirn-Silhouette (zwei Hemisphären, seitliche Ansicht oder 3/4-Ansicht) dient als „Zielform“, ein Force-Layout zieht verlinkte Notizen zueinander, bleibt aber in der Gehirnform. Zusätzlich 3.000–6.000 kleine „Staub-Partikel“ in der Silhouette für Dichte und Glow (Referenz: Partikel-Kopf im ersten Moodboard-Bild).
- **Bereiche = Gehirnregionen und Farben** (exakt aus Merlins Vault-Design `neural-brain.css` übernommen):

| Bereich (Vault-Tag/Ordner) | Farbe | Region im Gehirn |
|---|---|---|
| Trading (`01`, `Trading/`, `#trading`) | Neon-Grün `#00FF9D` | Stirnlappen vorne (größte Region, Hauptfokus) |
| Firma (`03`, `Firma/`) | Cyan `#00D4FF` | Scheitel oben |
| Modeln (`07`, `Modeln/`) | Orange `#FF7A1A` | Schläfe |
| App-/Business-Ideen (`02`, `08`, `09`, `11`) | Violett `#A855F7` | Hinterkopf |
| Clipping & Content (`10`, `Clipping/`) | Eis-Blau `#7DF9FF` (ersetzt das Pink aus dem Vault!) | Kleinhirn |
| Fundament (`04`, `05`, `06`) | Gold `#FFD166` | Hirnstamm / Kern |
| IDEEN (Startseite) | Weiß `#FFFFFF` | Zentrum, größter Knoten |
| Dashboard-Daten (Briefing, Trades) | Neon-Grün, heller | „Gedanken-Impulse“ (siehe unten) |

### 4.2 Live-Verhalten („autonom“)
- **Live aus Obsidian:** Ändert Merlin eine Notiz, leuchtet der Knoten sofort auf (Puls + kurzer Lichtring), neue Notizen „wachsen“ mit einer Einblend-Animation ins Netz, neue Links erscheinen als aufblitzende Synapse. Übertragung: chokidar → Backend parst → WebSocket-Event `vault:changed` → Frontend animiert. Ziel: unter 1 Sekunde Verzögerung.
- **Signal-Impulse:** Lichtpartikel wandern ständig entlang der Synapsen (langsam, ruhig). Bei Ereignissen schießen gezielte Impulse:
  - neue News mit Relevanz ≥ 4 → grüner/roter Impuls vom Rand in die Trading-Region
  - neuer Trade im Journal → heller Impuls in der Trading-Region
  - Regelverletzung oder Drawdown-Warnung → die betroffene Region pulsiert rot `#FF5A5A`
  - Briefing fertig → Welle über das ganze Gehirn
- **Atmung:** Das ganze Netz pulsiert sehr langsam (ca. 6 s Zyklus) und rotiert minimal. Maus bewegt die Kamera leicht (Parallaxe). Scroll-Zoom erlaubt.
- **Interaktion:**
  - Hover auf Knoten → Tooltip mit Notiztitel, Bereich, letzte Änderung, Anzahl Links
  - Klick → rechts öffnet sich ein Panel mit gerendertem Markdown der Notiz (nur lesen) + Button „In Obsidian öffnen“ (`obsidian://open?vault=Obsidian%20Vault&file=...`)
  - Filter-Chips unter dem Gehirn: Bereiche ein- und ausblenden, „nur offene To-dos“, „zuletzt geändert (7 Tage)“
- **Offene To-dos** (`- [ ]` in Notizen) werden als kleine pulsierende Satelliten um ihren Knoten dargestellt. Notizen mit `#prioritaet-hoch` oder Deadlines leuchten rot pulsierend (wie im Vault-Design).
- **Performance:** InstancedMesh für Knoten und Partikel, Ziel 60 fps bei 500 Notizen. Bei schwacher Grafik automatisch weniger Partikel. Schalter „Animation reduzieren“ in den Einstellungen.

### 4.3 Karten rund ums Gehirn
- **Morgen-Briefing** (links oder darunter, siehe Kapitel 5): kompakte Version mit Button „Ganzes Briefing“.
- **Konten-Übersicht:** Summe Equity aller Konten, Tages-P&L, Risiko-Ampel, Fortschritt Richtung Ziel 1,1 Mio $.
- **Heute wichtig:** die 3 nächsten High-Impact-Termine + Kein-Trade-Fenster.
- **Top-Trends:** die 5 stärksten Social-Media-Themen.
- **Offene To-dos aus dem Vault:** gruppiert nach Bereich, mit Klick zur Notiz.
- **Gehirn-Statistik:** Anzahl Notizen, Links, Änderungen heute, „aktivste Region diese Woche“.

---

## 5. Morgen-Briefing (automatisch)

### Ablauf
1. **Cron** (Standard Mo–Fr 07:30 Europe/Berlin, in Einstellungen änderbar; zusätzlich Button „Briefing jetzt erstellen“).
2. **Daten einsammeln** (parallel, Fehler einzelner Quellen dürfen das Briefing nicht abbrechen, sie werden im Briefing als „Quelle nicht erreichbar“ vermerkt):
   - Kurse und Vortagesänderung der Watchlist (FMP oder Twelve Data; Krypto über CoinGecko)
   - Wirtschaftskalender heute + morgen (Impact high/medium), Earnings des Tages
   - News der letzten 18 h aus allen News-Quellen (Kapitel 6), bereits mit Relevanzwert
   - Social-Trends der letzten 24 h (Kapitel 7.1)
   - COT-Daten (wöchentlich, aus FMP) für Gold, Euro, Nasdaq, Öl, Bitcoin
   - Konten-Stand aus Kapitel 8 (Abstand zu Limits)
   - Merlins eigene Regeln aus dem Vault: `Trading/Trading - Prop-Firm-Plan.md` (Abschnitt „Risiko-Regeln“) und offene Trading-To-dos
3. **Claude API** erstellt das Briefing (System-Prompt unten), mit Web-Search-Tool für aktuelle Fed/EZB/Geopolitik-Lage.
4. **Speichern:** JSON in SQLite (Tabelle `briefings`) **und** als Markdown in `Vault/Dashboard/Briefings/YYYY-MM-DD Briefing.md` (mit Frontmatter `tags: [briefing, trading]`), damit es auch im Gehirn als neuer Knoten erscheint.
5. **Benachrichtigen:** Windows-Benachrichtigung + optional Push aufs Handy über **ntfy.sh** (Topic in `.env`, kostenlos, einfach).

### Aufbau des Briefings (feste Abschnitte)
1. **Lage in 3 Sätzen** – was heute den Markt bewegt
2. **Ampel pro Instrument** der Watchlist: Bias (bullisch/neutral/bärisch), wichtige Zonen (Vortageshoch/-tief, Wochenhoch/-tief, runde Zahlen), Treiber heute. *Kein Kauf-/Verkaufssignal, nur Kontext.*
3. **Zusammenhänge** – 2–3 Ursache-Wirkungs-Ketten (z. B. „Starke US-Daten → Renditen ↑ → Dollar ↑ → Gold unter Druck“)
4. **Termine & Kein-Trade-Fenster** – mit Uhrzeit, erwarteter vs. vorheriger Wert, und wann laut Prop-Regeln nicht gehandelt werden darf
5. **Zentralbanken & Geopolitik** – Fed, EZB, Reden heute, Konflikte, Zölle, Wahlen
6. **Krypto** kurz
7. **Social-Stimmung** – was trendet, Hype-Warnungen
8. **Positionierung (COT)** – nur montags oder wenn neu
9. **Deine Konten heute** – Puffer bis Tageslimit pro Konto in $ und %, erlaubtes Risiko pro Trade nach Merlins Regel (0,5–1 % gerechnet aufs strengste Konto), Gesamtrisiko über alle kopierten Konten
10. **Fokus-Regel des Tages** – eine Regel aus Merlins eigenen Risiko-Regeln, die heute besonders relevant ist
11. **Quellen** – jede Aussage mit Link

### System-Prompt für das Briefing (in `apps/server/src/prompts/briefing.md` ablegen)
```
Du bist Merlins Markt-Analyst. Er ist Day-Trader (Fibonacci, EMAs, Smart-Money-Konzepte)
und handelt Prop-Firm-Konten bei The5ers und FTMO, die per Copier gespiegelt sind.
Schreibe auf Deutsch, direkt, ohne Floskeln. Trenne strikt: Fakten (mit Quelle) vs. Einschätzung
(als solche markiert). Erfinde keine Zahlen: Wenn eine Zahl nicht in den gelieferten Daten oder
in einer gefundenen Quelle steht, schreibe "nicht verfügbar". Keine Kauf- oder Verkaufsempfehlungen,
nur Kontext, Zonen und Risiken. Erkläre Zusammenhänge zwischen Assetklassen.
Gib das Ergebnis als JSON nach dem Schema in briefing.schema.json zurück.
```
- Ausgabe per **JSON-Schema** erzwingen (Structured Output / Tool-Call), Frontend rendert daraus die Karten.
- Kosten-Logging: Tokens und geschätzte Kosten pro Lauf in Tabelle `ai_usage` speichern und in den Einstellungen anzeigen.

---

## 6. News-Feed (Leiste 2)

### Quellen (konfigurierbar in Einstellungen, jede einzeln an/aus)
- **FMP** (Financial Modeling Prep): allgemeine News, Forex-News, Krypto-News, Wirtschaftskalender, Earnings-Kalender. Alternative: Twelve Data oder Alpha Vantage.
- **RSS-Feeds** (kostenlos, alle 2–5 Min abrufen): z. B. ForexLive, FXStreet, Investing.com, CoinDesk, Cointelegraph, Fed-Pressemitteilungen (federalreserve.gov), EZB-Pressemitteilungen (ecb.europa.eu), tagesschau Wirtschaft, Handelsblatt. Liste in `config/feeds.json`, Merlin kann Feeds hinzufügen.
- **CoinGecko**: Krypto-News und Trending Coins.

### Verarbeitung
- Duplikate erkennen (gleiche URL oder Titel-Ähnlichkeit > 85 %) und zusammenfassen („3 Quellen berichten“).
- **KI-Bewertung im Batch** (alle 5 Min neue Artikel gesammelt an Claude, günstiges Modell konfigurierbar `ANTHROPIC_MODEL_FAST`):
  - Relevanz 1–5 für Merlins Watchlist
  - betroffene Assets als Tags (z. B. `XAUUSD`, `NQ`, `BTC`)
  - erwartete Richtung pro Asset (↑ / ↓ / unklar) mit einem Satz Begründung
  - Kategorie: Zentralbank, Makrodaten, Geopolitik, Unternehmen, Krypto, Regulierung
  - deutsche Kurz-Zusammenfassung (max. 2 Sätze)
- Relevanz 5 → Eintrag im Live-Strom, Impuls im Gehirn, optional Push.

### Oberfläche
- Spalten-Layout: links Filter (Asset, Kategorie, Relevanz, Quelle, Zeitraum), Mitte Feed-Karten, rechts Detail mit Zusammenfassung, Originallink und **„Zusammenhang erklären“**-Button (Claude erklärt die Auswirkung auf Merlins Instrumente).
- Jede Karte: Uhrzeit, Quelle, Relevanz als 5 Leuchtbalken, Asset-Tags mit Richtungspfeil, Kategorie-Farbe.
- Button **„Als Content-Idee merken“** → speichert in Tabelle `content_ideas` und als Notiz in `Vault/Dashboard/Content-Ideen/` (Brücke zum News-Kanal „Maskierter König“).

---

## 7. Social-Feed / Trends (Leiste 3)

### 7.1 Quellen
- **Reddit** (offizielle API, OAuth-App, kostenlos im kleinen Rahmen): r/wallstreetbets, r/stocks, r/Forex, r/Daytrading, r/CryptoCurrency, r/Bitcoin. Gesammelt: Top/Hot-Posts, Erwähnungshäufigkeit von Tickern.
- **LunarCrush** (API-Key): Social-Volumen, Sentiment und Trend-Rang für Krypto und Aktien.
- **CoinGecko Trending**: meistgesuchte Coins.
- **Google Trends**: Suchinteresse für frei wählbare Begriffe (inoffizielle Bibliothek, kann brechen → als „experimentell“ kennzeichnen, Fehler abfangen).
- **YouTube Data API** (optional, kostenloser Key): trendende Videos in Finanz-/Trading-Kategorie, Suchbegriffe wie „Fed“, „Nasdaq“, „Bitcoin“.
- **X/Twitter:** offizielle API ist teuer → **nicht** einbauen, stattdessen im Briefing per Web-Suche abdecken. Im Code eine Schnittstelle `SocialSource` vorsehen, damit man X später nachrüsten kann.

### 7.2 Auswertung
- **Hype-Radar:** Ticker/Themen mit stärkstem Anstieg der Erwähnungen gegenüber dem 7-Tage-Schnitt (Z-Score). Darstellung als Liste + kleiner Sparkline pro Thema.
- **Sentiment-Barometer** pro Watchlist-Asset (bullisch/bärisch-Anteil), mit Warnhinweis bei Extremwerten („extreme Euphorie – historisch oft Kontraindikator“).
- **Viral-Analyse für Content:** Was geht gerade viral (Titel, Plattform, Views/Upvotes, Wachstum pro Stunde) + KI-Vorschlag: „Hook-Idee für deinen Kanal“ (deutsch und englisch). Button „Als Content-Idee merken“ wie in Kapitel 6.

### 7.3 Oberfläche
- Oben: Hype-Radar als horizontale Leuchtbalken.
- Mitte: Kacheln je Plattform (Reddit, Krypto, YouTube, Trends) mit eigenem Mini-Feed.
- Unten: Sentiment-Barometer der Watchlist als Halbkreis-Messinstrumente (Gauges, Referenz: UI-Kit-Bild 5, aber ohne Pink).

---

## 8. Funded & Konten (Leiste 5)

Merlin trägt hier seine Konten **selbst** ein und pflegt sie. Live-Daten aus MT5 ergänzen das automatisch, wenn verbunden.

### 8.1 Konto anlegen (Formular)
| Feld | Beispiel |
|---|---|
| Firma | The5ers / FTMO / andere (Freitext) |
| Programm | Summer 2-Step (10/5), High Stakes, FTMO 2-Step … |
| Kontogröße | 200.000 $ |
| Phase | Challenge Phase 1 / Phase 2 / Funded / Verloren / Pausiert |
| Plattform + Login-Nr. + Server | MT5 · 1234567 · FTMO-Server (**kein Passwort!**) |
| Kaufpreis + Datum | 249 $ · 2026-11-20 |
| Startbalance | 200.000 |
| **Profitziel Phase** in % und $ (frei editierbar) | 10 % = 20.000 $ |
| **Tagesverlust-Limit** % + Berechnungsart | 3 %, „vom höheren Wert aus Balance/Equity bei Tagesschluss“ |
| **Max-Verlust** % + Art | 10 % statisch / trailing |
| Mindest-Handelstage / profitable Tage | 4 / 3 à 0,5 % |
| Konsistenzregel | z. B. 50 % auf Funded (größter Tag ≤ 50 % des Gesamtgewinns) |
| News-Regel | z. B. 2 Min vor/nach High-Impact gesperrt |
| Wochenend-Halten erlaubt | ja/nein |
| Inaktivitätsfrist | 60 Tage |
| Profit-Split | 80 % (→ Stufen) |
| Auszahlungs-Deckel / Rhythmus | 3.000 $ / 14 Tage |
| Copy-Gruppe | „Gruppe A“ (Konten, die gespiegelt werden) |
| Notizen | Freitext |

- **Vorlagen:** Beim Anlegen „Vorlage wählen“ (The5ers Summer 200K 10/5, The5ers High Stakes 100K, FTMO 2-Step 200K). Die Werte aus Merlins Notiz `Trading/Trading - Prop-Firm-Plan.md` als Startwerte einlesen, **aber jeder Wert bleibt editierbar und wird mit dem Hinweis „bitte mit aktuellen Regeln der Firma prüfen“ angezeigt**. Regeln ändern sich.
- **Eigene Ziele:** Merlin kann zusätzlich eigene Ziele pro Konto und global anlegen (z. B. „Monatsziel 4 %“, „erste Auszahlung bis 31.12.“, „Gesamtziel 1,1 Mio $ verwaltet“), mit Fortschrittsbalken.

### 8.2 Kontokarte (Ansicht)
- Equity-Kurve (lightweight-charts), aktueller Stand, Tages-P&L, Gesamt-P&L.
- **Drei Fortschrittsringe:** Profitziel erreicht (%), Tagesverlust-Puffer, Max-Verlust-Puffer.
- **Ampel:** Grün (> 60 % Puffer), Gelb (30–60 %), Rot (< 30 %), Rot pulsierend + Push bei < 15 %.
- Regel-Checkliste live: Handelstage ✓/✗, Konsistenz aktuell X %, Inaktivität „noch 41 Tage“.
- **Auszahlungen:** Liste mit Datum, Brutto, Split, Abzüge (z. B. The5ers 3,5 %), Netto. Nächster möglicher Auszahlungstermin.
- **Kosten & Rendite:** Summe Gebühren vs. Summe Auszahlungen → Netto-ROI der Prop-Strategie.

### 8.3 Gesamtübersicht „Account-Feed“
- Tabelle/Kacheln aller Konten, sortierbar.
- **Kopier-Risiko-Rechner:** „1 % Risiko auf dem Master-Konto = X $ Verlust über alle Konten der Copy-Gruppe“. Warnung, wenn das erlaubte Tagesrisiko auf dem **strengsten** Konto (z. B. 3 % Summer) durch eine Position überschritten würde.
- Fortschritt zum Gesamtziel (verwaltetes Kapital) als großer Leuchtbalken.
- Chronologischer **Account-Feed**: Ereignisse wie „Phase 1 bestanden“, „Auszahlung 2.400 $“, „Tageslimit zu 70 % ausgeschöpft“, manuelle Einträge (Merlin kann jederzeit Text-Updates posten, z. B. „Support-Antwort von FTMO: Copier erlaubt“).
- **Steuer-Export:** CSV/XLSX aller Auszahlungen und Gebühren pro Jahr (für den Steuerberater).

### 8.4 Anbindung der Konten (Live-Daten)
**Wichtig, vorher klären:** Merlins Regeln sagen „nur eigenes Gerät, keine VPN“. Ein Cloud-Dienst wie MetaApi loggt sich von **fremden Servern/IPs** ein, auch mit Investor-Passwort. Das könnte bei Prop-Firmen auffallen. Deshalb:

- **Variante A (Standard, empfohlen): lokal über das MT5-Terminal.** Python-Dienst `apps/mt5-bridge` nutzt das offizielle Paket `MetaTrader5`, das sich mit dem auf Merlins PC laufenden, eingeloggten MT5-Terminal verbindet. Kein Passwort im Dashboard, kein fremder Server, gleiches Gerät.
  - Endpunkte (nur lesen): `GET /accounts/current` (`account_info()`), `GET /positions` (`positions_get()`), `GET /history?from=&to=` (`history_deals_get()`), `GET /health`.
  - Polling alle 5 s für offene Positionen und Equity, Historie alle 60 s.
  - Mehrere Konten: MT5 kann pro Terminal-Instanz ein Konto halten. Unterstütze mehrere Terminal-Pfade (`MT5_TERMINALS` in `.env` als Liste) oder abwechselndes Einlesen. Wenn das zu fummelig ist: nur das Master-Konto live, die kopierten Konten aus dessen Werten hochrechnen (Faktor = Kontogröße / Master-Größe) und als „geschätzt“ markieren.
- **Variante B (optional): MetaApi** (metaapi.cloud) mit Investor-Passwort (nur Lesezugriff), das Merlin selbst im MetaApi-Portal einträgt; Dashboard bekommt nur den API-Token. Nur aktivieren, wenn die Prop-Firmen das schriftlich erlauben. Hinter einem Schalter in den Einstellungen.
- **Variante C (immer verfügbar): manuell / Import.** P&L pro Tag manuell eintragen oder MT5-Kontoauszug (HTML/CSV-Export) importieren.
- cTrader: als spätere Erweiterung über die cTrader Open API vorsehen (Interface `AccountSource`).

---

## 9. Trading-Journal (Leiste 4)

### 9.1 Setup / Trade erfassen
**Schnell-Erfassung** über großen Button „+ Setup“ oder Tastenkürzel `N`:
1. **Screenshot einfügen:** per `Strg+V` aus der Zwischenablage (Windows-Snipping-Tool → direkt einfügen), Drag & Drop oder Datei-Upload. Mehrere Bilder pro Trade möglich (z. B. HTF + LTF, vorher/nachher).
2. **„Mit KI auslesen“** (optional): Claude Vision liest aus dem Chart-Screenshot Instrument, Zeiteinheit, Entry, Stop Loss, Take Profit(s) (z. B. aus TradingView-Long/Short-Position-Tool) und erkennt sichtbare Elemente (Fibonacci-Level, EMAs, Order Blocks, FVGs). **Werte nur vorausfüllen, Merlin bestätigt.** Unsichere Werte gelb markieren.
3. **Felder:**
   - Instrument, Richtung (Long/Short), Datum/Uhrzeit, Session (automatisch aus Uhrzeit)
   - Entry, **Stop Loss**, **TP1 / TP2 / TP3** (mit Anteil der Position je TP)
   - Lots/Kontrakte, Risiko in % und $ (automatisch aus SL-Abstand + Kontogröße berechnet, **Positionsgrößen-Rechner** eingebaut)
   - **R:R** automatisch, erwartetes Ergebnis je TP
   - Konto bzw. Copy-Gruppe
   - **Setup-Typ** (Mehrfachauswahl, Liste editierbar): Fibonacci-Retracement (0,618/0,705/0,786), EMA-Rücklauf, EMA-Cross, Order Block, Fair Value Gap, Break of Structure, Change of Character, Liquidity Sweep, Premium/Discount, Session-Open, News-Trade …
   - Zeiteinheiten (HTF-Bias / Entry-TF)
   - Begründung (Freitext), Emotion vor dem Trade (Skala + Tags: ruhig, FOMO, Rache, unsicher, überzeugt)
   - **Regel-Check**: Checkliste aus Merlins eigenen Regeln (aus Vault lesen, editierbar): „SL gesetzt“, „Risiko ≤ 1 % aufs strengste Konto“, „kein News-Fenster“, „HTF-Bias passt“…
   - Status: Geplant / Offen / Geschlossen / Verpasst (verpasste Setups ausdrücklich erfassen können!)
4. **Nach dem Trade:** Exit-Preis(e), Ergebnis in R und $, Screenshot „nachher“, Lektion (Freitext), „Hätte ich nach Plan gehandelt?“ ja/nein.
- **Automatischer Abgleich:** Wenn MT5 verbunden ist, werden geschlossene Deals automatisch einem Journal-Eintrag zugeordnet (Instrument + Zeitfenster ± 5 Min). Nicht zugeordnete Trades erscheinen als „Ohne Journal-Eintrag – bitte ergänzen“.
- Jeder Trade wird zusätzlich als Markdown in `Vault/Dashboard/Trades/YYYY-MM-DD Instrument Richtung.md` gespeichert (mit Bild-Link), damit er im Gehirn auftaucht.

### 9.2 Journal-Ansicht
- Galerie (Screenshot-Kacheln mit Ergebnis-Rand grün/rot) und Tabellenansicht umschaltbar.
- Filter: Zeitraum, Instrument, Setup-Typ, Session, Konto, Ergebnis, Emotion, Regel eingehalten.
- Kalender-Heatmap (Tage grün/rot nach P&L).

### 9.3 Statistik (Leiste 7)
- Winrate, Profit-Faktor, Durchschnitts-R, Erwartungswert, Max-Drawdown, längste Gewinn-/Verlustserie
- **Auswertung nach Setup-Typ, Session, Wochentag, Uhrzeit, Instrument, Emotion** → „Deine besten Setups“ / „Hier verlierst du Geld“
- Equity-Kurve in R und in $
- Regel-Disziplin: Anteil Trades mit erfülltem Regel-Check und deren Ergebnis vs. Regelbrüche
- **Wochen-Review automatisch** (Sonntag 18:00): Claude fasst die Woche zusammen (Zahlen, Muster, Regelbrüche, 3 konkrete Verbesserungen), speichert in SQLite und als `Vault/Dashboard/Reviews/YYYY-KW.md`. Push-Benachrichtigung.

---

## 10. Kalender & Kein-Trade-Fenster (Leiste 6)

- Wirtschaftskalender (Woche), farbig nach Impact, mit Prognose/Vorher/Ist.
- **Kein-Trade-Fenster** automatisch berechnet aus High-Impact-Terminen + der News-Regel jedes Kontos (z. B. 2 Min vor/nach). Darstellung als rote Balken auf einer Tages-Zeitleiste.
- Statusleiste zeigt Countdown zum nächsten Fenster; 10 Min vorher Push.
- Fed/EZB-Sitzungen, Reden, Feiertage (Börse geschlossen), Earnings großer Nasdaq-Werte.

---

## 11. Weitere Funktionen

- **Command-Palette** `Strg+K`: Notiz suchen, Trade anlegen, Briefing neu erstellen, zu Leiste springen.
- **„Frag dein Gehirn“**: Chat-Feld auf der Zentrale. Claude bekommt relevante Vault-Notizen (einfache Volltextsuche oder Embeddings in SQLite) + Dashboard-Daten als Kontext. Beispiel: „Was waren meine häufigsten Regelbrüche im November?“ oder „Was steht in meinem Prop-Firm-Plan zu Konsistenz?“
- **News-Kanal-Brücke:** Button „Skript für heute“ erzeugt aus Briefing + gemerkten Content-Ideen einen Skript-Entwurf passend zum Wochenplan des Kanals (Mo Wochenausblick, Di Geopolitik, Mi Märkte, Do Politik, Fr KI & Konzerne, Sa Zusammenhang, So Rückblick). Speichert in `Vault/Dashboard/Content-Ideen/`.
- **Prognose-Logbuch:** Einschätzungen aus Briefing oder eigene Prognosen speichern, später als eingetroffen/nicht eingetroffen markieren, Trefferquote anzeigen.
- **Backup:** täglich `command-center.db` nach `data/backups/` (letzte 14 behalten).

---

## 12. Phasenplan (in dieser Reihenfolge bauen)

| Phase | Inhalt | Fertig, wenn … |
|---|---|---|
| **1. Fundament** | Monorepo, Designsystem (Tokens, Glas-Karten, Navigation, Statusleiste), SQLite + Drizzle, `.env.example`, `pnpm dev`, `start.bat` | Leere Leisten sind navigierbar und sehen aus wie im Design-Entwurf |
| **2. Gehirn + Obsidian live** | Vault-Parser, Watcher, WebSocket, 3D-Gehirn mit Farben/Regionen, Hover/Klick, To-do-Satelliten | Notiz in Obsidian ändern → Knoten leuchtet in < 1 s |
| **3. Konten (manuell)** | Konto-Formular mit Vorlagen, Regeln, Ziele, Ampel, Account-Feed, Auszahlungen, Kopier-Risiko-Rechner, Steuer-Export | Merlin kann alle geplanten Konten anlegen und Puffer sehen |
| **4. Journal** | Setup-Erfassung mit Screenshot (Strg+V), Positionsgrößen-Rechner, R:R, Regel-Check, Galerie, Statistik | Ein Trade inkl. Bild ist in 60 Sekunden erfasst |
| **5. News-Feed** | FMP/RSS-Sammler, Duplikate, KI-Bewertung, Filter, Content-Ideen | Feed aktualisiert sich selbst, Relevanz 5 erscheint im Live-Strom |
| **6. Morgen-Briefing** | Cron, Datensammlung, Claude mit Web-Suche, JSON-Schema, Vault-Export, ntfy-Push | Briefing liegt um 07:30 im Dashboard und im Vault |
| **7. Social-Feed** | Reddit, LunarCrush, CoinGecko Trending, YouTube, Hype-Radar, Sentiment | Hype-Radar zeigt Top-Themen mit Anstieg |
| **8. MT5-Live** | Python-Bridge, Polling, Auto-Abgleich Journal ↔ Deals, Equity-Kurven live | Offene Position erscheint live auf der Kontokarte |
| **9. Extras** | Kalender + Kein-Trade-Fenster, Wochen-Review, Frag-dein-Gehirn, Prognose-Logbuch, Claude Vision im Journal, Backups | – |

---

## 13. Datenmodell (SQLite, Drizzle)

```
accounts(id, firm, program, size, phase, platform, login_no, server, purchase_price, purchase_date,
         start_balance, profit_target_pct, daily_loss_pct, daily_loss_mode, max_loss_pct, max_loss_mode,
         min_trading_days, min_profitable_days, consistency_pct, news_rule_minutes, weekend_allowed,
         inactivity_days, profit_split_pct, payout_cap, payout_interval_days, copy_group, notes,
         created_at, updated_at)
account_snapshots(id, account_id, ts, balance, equity, daily_pnl, source[mt5|metaapi|manual|estimated])
account_events(id, account_id NULL, ts, type, text, data_json)          -- Account-Feed
payouts(id, account_id, date, gross, split_pct, fees, net, note)
goals(id, account_id NULL, title, target_value, unit, deadline, current_value, created_at)
trades(id, account_id NULL, copy_group, instrument, direction, opened_at, closed_at, session,
       entry, sl, tp1, tp2, tp3, tp_split_json, size, risk_pct, risk_usd, rr_planned,
       exit_prices_json, result_r, result_usd, status, setup_types_json, timeframes_json,
       reasoning, emotion_score, emotion_tags_json, rule_checks_json, followed_plan, lesson,
       mt5_deal_ids_json, vault_path, created_at, updated_at)
trade_images(id, trade_id, path, kind[before|after|htf|ltf], ai_extract_json)
news_items(id, source, url, title, published_at, summary_de, relevance, category, assets_json,
           direction_json, cluster_id, raw_json)
social_items(id, platform, external_id, title, url, metric_value, metric_type, ts, topic, sentiment)
trend_topics(id, topic, platform, mentions_24h, mentions_avg_7d, zscore, ts)
calendar_events(id, ts, country, title, impact, forecast, previous, actual)
briefings(id, date, status, content_json, markdown, vault_path, created_at)
reviews(id, week, content_json, vault_path, created_at)
vault_notes(path, title, area, tags_json, links_json, todos_open, mtime, size)   -- Cache
content_ideas(id, source_type, source_id, idea, hook_de, hook_en, created_at)
predictions(id, created_at, text, asset, horizon, outcome[open|hit|miss], resolved_at)
ai_usage(id, ts, purpose, model, input_tokens, output_tokens, est_cost_usd)
settings(key, value_json)
layout(page, json)
```

---

## 14. API-Schlüssel und Kosten (`.env.example`)

```
# Pfade
VAULT_PATH=C:\Users\merli\Documents\Obsidian Vault
VAULT_WRITE_DIR=Dashboard
TZ=Europe/Berlin

# KI (Pflicht für Briefing, Bewertung, Vision)
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=            # z. B. aktuelles Sonnet
ANTHROPIC_MODEL_FAST=       # z. B. aktuelles Haiku für News-Bewertung
AI_MONTHLY_BUDGET_USD=30    # Dashboard warnt bei 80 %, stoppt automatische Läufe bei 100 %

# Marktdaten (eins reicht zum Start)
FMP_API_KEY=
TWELVEDATA_API_KEY=
COINGECKO_API_KEY=          # Demo-Key kostenlos

# Social
REDDIT_CLIENT_ID=
REDDIT_CLIENT_SECRET=
LUNARCRUSH_API_KEY=
YOUTUBE_API_KEY=

# Konten
MT5_ENABLED=true
MT5_TERMINALS=              # optional mehrere terminal64.exe-Pfade, durch ; getrennt
METAAPI_ENABLED=false
METAAPI_TOKEN=

# Benachrichtigungen
NTFY_TOPIC=                 # zufälliger, schwer erratbarer Name
```
- Jede Quelle ist optional: Fehlt ein Schlüssel, zeigt die Karte „Nicht verbunden – Schlüssel in Einstellungen eintragen“ statt abzustürzen.
- In den Einstellungen: Status jeder Quelle (verbunden/Fehler/letzter Abruf), Test-Button, KI-Kostenübersicht des Monats.
- Preise und kostenlose Kontingente der Anbieter vor dem Einbau aktuell prüfen und in der README notieren.

---

## 15. Designsystem

### Stimmung
Futuristisch, dunkel, „neuronales Kommandozentrum“. Referenzen (von Merlin): Partikel-Kopf aus leuchtenden Datenlinien, dunkles Glas-UI mit Neon-Kanten, schwebende 3D-Objekte, Gauges und Ringdiagramme im HUD-Stil. **Ohne Pink/Magenta** – Glow in Cyan, Neon-Grün und Violett.

### Farben (Tokens, als CSS-Variablen + Tailwind-Theme)
| Token | Wert | Verwendung |
|---|---|---|
| `--bg-0` | `#05070C` | App-Hintergrund |
| `--bg-1` | `#07090F` | Flächen |
| `--bg-2` | `#0A0D16` | Karten |
| `--bg-3` | `#0D1120` | Hover/aktiv |
| `--line` | `#1B2740` | Rahmen, Raster |
| `--text` | `#C9D6E8` | Fließtext |
| `--text-muted` | `#6B7A94` | Nebentext |
| `--text-faint` | `#45526B` | Achsen, Platzhalter |
| `--cyan` | `#00D4FF` | Primär-Akzent, Links, aktive Leiste, Firma |
| `--ice` | `#7DF9FF` | Hover, Clipping/Content |
| `--green` | `#00FF9D` | Trading, Gewinn, positiv |
| `--red` | `#FF5A5A` | Verlust, Warnung, Deadline (pulsierend) |
| `--violet` | `#A855F7` / hell `#C084FC` | Ideen, KI-Elemente, Sekundär-Glow |
| `--gold` | `#FFD166` | Fundament, Ziele, Auszahlungen |
| `--orange` | `#FF7A1A` / hell `#FFA04D` | Modeln, mittlere Warnung (Gelb-Ampel) |
| `--white` | `#FFFFFF` | Zentrum, Hervorhebung |

- Hintergrund: sehr dunkles Navy mit feinem Punktraster (`--line` mit 30 % Deckkraft) und zwei weichen radialen Glows (Cyan oben links, Violett unten rechts, je 8–12 % Deckkraft).
- **Glas-Karten:** Hintergrund `rgba(10,13,22,0.72)`, `backdrop-filter: blur(14px)`, Rahmen 1 px `rgba(0,212,255,0.14)`, Radius 16 px, oben eine 1-px-Lichtkante (Verlauf Cyan → transparent). Hover: Rahmen heller, leichter äußerer Glow.
- Glow-Effekte sparsam: nur aktive Elemente, wichtige Zahlen und das Gehirn.

### Typografie
- Überschriften: **Space Grotesk** (600), Zahlen und Kurse: **JetBrains Mono** (tabellarische Ziffern), Fließtext: **Inter**.
- Bereichstitel in Versalien mit Sperrung (`letter-spacing: 0.24em`, 11–12 px, `--text-muted`), wie im Referenzbild „OUR APPROACH“.
- Große Kennzahlen 32–48 px Mono mit Glow in Bereichsfarbe.

### Komponenten
- Fortschrittsringe und Halbkreis-Gauges mit Verlaufsstrich (Cyan → Grün bzw. Orange → Rot) und Leuchtpunkt am Ende.
- Relevanz-Balken (5 kleine Segmente).
- Asset-Tags als Pillen mit Richtungspfeil.
- Ampel-Punkte mit Puls-Animation bei Rot.
- Buttons: primär = Cyan-Verlauf mit dunklem Text; sekundär = transparenter Rand; Gefahr = Rot-Rand.
- Mikro-Animationen 150–250 ms, `prefers-reduced-motion` respektieren.

### Referenz
Der zugehörige Design-Entwurf (Claude-Design-Artefakt „Neural Command Center – Design“, https://claude.ai/artifact/2ZMH9ku8uJKyKgpKRjFsmz) zeigt Zentrale, Konten, Journal sowie News & Social. Ihn als visuelle Vorlage nutzen; bei Widerspruch gilt diese SPEC.

---

## 16. Abnahmekriterien (gesamt)

- [ ] `start.bat` startet alles, Browser öffnet die Zentrale, kein Fehler in der Konsole.
- [ ] Gehirn zeigt alle Vault-Notizen in Bereichsfarben, reagiert live auf Änderungen, läuft flüssig.
- [ ] Kein einziges Pink/Magenta im gesamten UI (per Test: Farb-Tokens prüfen).
- [ ] Briefing erscheint automatisch zur eingestellten Zeit, im Dashboard und als Vault-Notiz, mit Quellen.
- [ ] News und Social-Trends aktualisieren sich selbst, fehlende Schlüssel führen nicht zu Abstürzen.
- [ ] Trade mit Screenshot per Strg+V, SL, TP1–3 und Setup-Typ ist in unter 60 s erfasst; R:R und Risiko stimmen (Unit-Tests).
- [ ] Konten mit eigenen Zielen und Regeln anlegbar, Ampel und Kopier-Risiko korrekt (Unit-Tests für Tagesverlust-Berechnung „höherer Wert aus Balance/Equity“ und statisch vs. trailing).
- [ ] Keine Zugangsdaten im Repository, Server nur auf 127.0.0.1, MT5-Bridge ohne Order-Funktionen.
- [ ] README auf Deutsch: Installation, Schlüssel besorgen, Start, Fehlerbehebung.
