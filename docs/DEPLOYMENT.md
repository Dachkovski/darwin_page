# DarwinPage Deployment Guide

Dieses Dokument beschreibt, wie DarwinPage kostengünstig, performant und sicher auf **Cloudflare Pages** und **Cloudflare D1** deployed wird.

## Warum Cloudflare (Pages + D1)?
Für eine autonome, sich selbst optimierende Webseite, die tausende Tracking-Events generiert, ist traditionelles Server-Hosting oft teuer und skaliert schlecht. 
Cloudflare bietet hier unschlagbare Vorteile:
- **Kosten**: Cloudflare D1 bietet 5 Millionen kostenlose Leseoperationen und 100.000 kostenlose Schreiboperationen pro Tag im Free-Tier.
- **Edge Performance**: Die App läuft direkt an der Edge (nahe am Nutzer).
- **Integrierte Cronjobs**: Der Evolution-Loop kann kostenlos über Cloudflare Cron Triggers gesteuert werden.
- **Isolierte Datenbank**: Keine SQLite-Konflikte (Locking-Issues), da D1 für Serverless-Umgebungen optimiert ist.

---

## 1. Voraussetzungen

- Ein [Cloudflare Account](https://dash.cloudflare.com)
- Lokale `npm` und `git` Installation
- Ein GitHub-Repository für den Code

Installiere das Wrangler CLI (bereits im Projekt als devDependency, aber global hilfreich):
```bash
npm i -g wrangler
```

## 2. Cloudflare D1 Datenbank erstellen

Erstelle die Produktionsdatenbank direkt über das Terminal:
```bash
npx wrangler d1 create darwin-production
```
Cloudflare gibt dir daraufhin eine Ausgabe mit einer `database_id`. Kopiere diese.

## 3. wrangler.toml konfigurieren

Erstelle (falls nicht vorhanden) eine Datei namens `wrangler.toml` im Hauptverzeichnis:
```toml
name = "darwin-page"
compatibility_date = "2026-05-02"

[[d1_databases]]
binding = "D1_DB" # WICHTIG: Diesen Namen erwartet unser Adapter
database_name = "darwin-production"
database_id = "DEINE_KOPIERTE_DATABASE_ID_HIER"
```

## 4. Migrationen (Schema Setup) auf D1 anwenden

Wir nutzen Drizzle, um das Schema zu deployen.
1. Erstelle die Migration lokal: `npx drizzle-kit generate`
2. Wende die Migration auf deine produktive D1 Datenbank an:
```bash
npx wrangler d1 execute darwin-production --local --file=./drizzle/0000_...sql # Für lokalen Test
npx wrangler d1 execute darwin-production --remote --file=./drizzle/0000_...sql # Für Production
```

## 5. Environment Variables setzen

Setze die sensiblen Umgebungsvariablen direkt in Cloudflare (unter *Workers & Pages > DarwinPage > Settings > Environment Variables*):
- `OPENAI_API_KEY`: Dein LLM Key für den Analyse/Evolve-Loop.
- `ADMIN_PASSWORD`: Das Passwort für den `/admin` Bereich (Basic Auth).

## 6. Projekt Deployen

Dank `@opennextjs/cloudflare` (oder nativ über das Cloudflare Dashboard via GitHub Integration) kannst du das Projekt sofort deployen.

**Manueller Deploy:**
```bash
npx @cloudflare/next-on-pages
npx wrangler pages deploy .vercel/output/static
```

**Automatischer Deploy (Empfohlen):**
1. Verbinde dein GitHub-Repo im Cloudflare Dashboard.
2. Wähle als Framework Preset `Next.js`.
3. Setze den Build Command auf `npx @cloudflare/next-on-pages`.
4. Speichere und warte auf den Build.

## 7. Autonomous Loop (Cron Triggers)

Damit DarwinPage vollkommen autonom mutiert (ohne dass du den Admin-Button klicken musst), richtest du einen Cron Trigger ein.

Gehe in Cloudflare in dein Pages-Projekt unter **Triggers -> Cron Triggers** und füge einen Cronjob hinzu (z. B. jeden Tag um 03:00 Uhr `0 3 * * *`). 
Dies ruft automatisch deinen API-Endpunkt `/api/cron` auf, welcher den `analyze` und `evolve` Prozess anstößt, wenn die Thresholds überschritten sind.

---

## 8. Lokale Entwicklung

Lokal nutzen wir eine SQLite Datei (`darwin.db`), um die Cloudflare-Latenz und Kosten beim Entwickeln zu sparen.

1. `.env` aus `.env.example` kopieren.
2. `npm run db:push` (Pusht Schema in lokale SQLite).
3. `npm run db:seed` (Füllt initiale Daten).
4. `npm run dev` (Startet den Next.js Server).

Das Adapter-Pattern in `src/lib/db/index.ts` merkt automatisch, ob es lokal läuft oder auf Cloudflare, und schaltet den Datenbank-Driver entsprechend nahtlos um.

---

## Kostenlimitierung & Batching (Architektur-Notizen)

**Event Batching & Keepalive Telemetry:**
Wir haben den `Tracker.tsx` so umgeschrieben, dass Tracking-Events nicht mehr sofort gesendet werden (was Tausende kleine Requests erzeugt), sondern in einer **Queue (Queueing)** gesammelt und nur alle 5 Sekunden abgesetzt werden.
Beim Verlassen der Seite (Exit Event) wird der Request mit `keepalive: true` abgesetzt. Die an OpenAI gesendeten Screenshots werden hierbei on-the-fly auf 30% skaliert und komprimiert, um das strenge 64KB `keepalive`-Limit von modernen Browsern zu unterbieten und eine Zustellung zu garantieren, selbst wenn der Tab geschlossen wird.
*Vorteil:* Reduziert die D1 Write-Operations massiv und sorgt für 100% verlässliche Exit-Events!

**Edge Background Execution (`after`):**
Da Serverless Edge-Umgebungen wie Cloudflare den Prozess sofort töten, wenn der Client die Verbindung trennt, nutzen wir das native `after()` Feature von Next.js.
Dadurch kann die komplexe LLM-Auswertung (Evolution Cycle & Visual Analysis) sicher im Hintergrund auf der Edge zu Ende laufen, während der User längst einen anderen Tab geöffnet hat.

**Cost Control Toggles (Admin Panel):**
Die Plattform verfügt über zwei komplett unabhängige Schutzschalter im `/admin` Bereich, um API-Kosten (OpenAI Tokens) hart zu deckeln:
1. **Mutation für Admin**: Erlaubt es dir als eingeloggtem Admin, die Seite unlimitiert iterieren zu lassen (nutzt den Server-Key). Wenn deaktiviert, verbrauchst du beim eigenen Surfen exakt 0 API-Tokens.
2. **Mutation für Besucher**: Gewährt jedem öffentlichen Besucher exakt 3 kostenfreie Evolutions-Zyklen. Danach stoppt das System hart (inklusive Vision API). Erst wenn der User seinen eigenen OpenAI-Key per BYOK-Modal einträgt, läuft die Evolution für ihn weiter.

**Wann auf Paid wechseln?**
Der Free-Tier reicht locker für Seiten bis zu ~20.000 Besuchern pro Monat (abhängig von der Klick-Freudigkeit). Wenn du das Projekt skalierst und über 100.000 Writes pro Tag kommst, kostet der Cloudflare Workers Paid Plan 5$/Monat und bietet 50 Millionen Writes! Ein absoluter No-Brainer für diese Architektur.
