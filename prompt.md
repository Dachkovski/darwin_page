Du bist mein autonomer Senior Full-Stack-Agent.

Baue ein GitHub-vorzeigbares privates/public Projekt namens:

DarwinPage

Tagline:
A self-evolving one-page website with a Karpathy-style feedback loop.

Projektidee:
DarwinPage ist eine einzige öffentliche Webseite, die sich selbst verbessert. Die Seite generiert regelmäßig neue Inhalts- und Layoutvarianten, misst echte Nutzungsmetriken und optimiert sich gegen eine im Backend definierte Zielmetrik.

Die Kernidee ist eine Karpathy-/AutoResearch-artige Feedback-Schleife:

1. Generate
   Das System erzeugt neue Kandidatenvarianten für Inhalte, Headlines, CTA-Texte, Sektionen, Tonalität, Layout und Reihenfolge.

2. Expose
   Besucher sehen stabil eine Variante der Seite.

3. Measure
   Das System misst anonymisierte Events wie page_view, cta_click, scroll_depth, time_on_page und bounce.

4. Score
   Das Backend bewertet jede Variante anhand einer konfigurierbaren Metrik.

5. Select
   Gewinner werden automatisch oder nach Freigabe promoted.

6. Mutate
   Aus erfolgreichen Varianten werden neue Varianten abgeleitet.

7. Log
   Jede Hypothese, Variante, Metrik und Entscheidung wird nachvollziehbar dokumentiert.

Das Projekt soll am Ende als GitHub-Showcase wirken:
- sauberer Code
- klare Architektur
- gute README
- schöne Demo
- sichtbare Feedback-Schleife
- nachvollziehbare Research-Logs
- keine unnötige Komplexität

Wichtig:
Die öffentliche Seite soll wirklich nur eine einzige Hauptseite sein: `/`.
Admin, API und interne Tools dürfen existieren, sollen aber nicht Teil der öffentlichen User Experience sein.

Technologie:
Nutze bevorzugt:
- Next.js mit App Router
- TypeScript
- Tailwind CSS
- SQLite für lokalen MVP
- Prisma oder Drizzle ORM
- Server Actions oder API Routes
- einfache lokale LLM-Abstraktion, später austauschbar gegen OpenAI/Gemini/Ollama
- Vitest oder Jest für Tests

Baue keine unnötig große SaaS-App.
Baue einen fokussierten, schönen, technischen MVP.

Öffentliche Webseite:
Route: `/`

Die Seite soll dynamisch aus einer aktiven Variante gerendert werden.

Eine Variante kann enthalten:
- hero_headline
- hero_subheadline
- primary_cta_text
- secondary_cta_text
- section_order
- value_propositions
- proof_points
- tone
- visual_style
- layout_density
- footer_text

Beispiel:
Variante A:
Headline: "This website improves itself."
CTA: "See the loop"

Variante B:
Headline: "A one-page site that evolves by data."
CTA: "Explore DarwinPage"

Variante C:
Headline: "Content. Metrics. Mutation. Selection."
CTA: "Watch it evolve"

Design:
- modern
- minimalistisch
- technisch
- hochwertig
- nicht verspielt
- ideal als GitHub-/Portfolio-Demo
- responsive
- schöne kleine Visualisierung der Feedback-Schleife auf der Seite

Die Seite soll eine kleine sichtbare Komponente enthalten:

"Current Evolution State"

Darin anzeigen:
- aktive Variante
- Generation
- aktueller Score
- letzte Mutation
- Optimierungsziel

Beispiel:
Generation 7
Variant: hero_b_003
Optimizing for: CTA Click Rate + Scroll Depth
Current score: 0.73

Backend-Metriken:
Baue ein Backend, in dem die Zielmetrik konfigurierbar ist.

Standard-Score:

score =
  0.45 * cta_click_rate
+ 0.25 * scroll_depth_rate
+ 0.20 * normalized_time_on_page
- 0.10 * bounce_rate

Diese Formel soll zentral konfigurierbar sein.

Später soll ich im Backend ändern können:
- Gewichtung von CTA-Klicks
- Gewichtung von Scrolltiefe
- Gewichtung von Verweildauer
- Gewichtung von Bounce Rate
- Mindestanzahl Besucher pro Variante
- Mindestlaufzeit eines Experiments
- Schwelle für Gewinnerentscheidung

Tracking:
Implementiere ein anonymes Event Tracking.

Tracke:
- page_view
- variant_seen
- cta_click
- scroll_depth_25
- scroll_depth_50
- scroll_depth_75
- scroll_depth_100
- time_on_page
- bounce
- outbound_click

Speichere:
- id
- timestamp
- anonymous_session_id
- anonymous_visitor_id
- event_type
- variant_id
- generation_id
- experiment_id
- page
- metadata JSON

Privacy-Regeln:
- keine IP speichern
- keine E-Mail speichern
- keine personenbezogenen Daten
- keine Fingerprints
- Session-ID nur anonym
- klare README-Erklärung
- keine Dark Patterns

Experiment-Engine:
Baue eine Experiment-Engine.

Sie soll:
- aktive Varianten laden
- Besuchern stabil eine Variante zuweisen
- Events Varianten zuordnen
- Metriken pro Variante berechnen
- Gewinner bestimmen
- neue Generationen unterstützen

Datenmodelle:
Erstelle ungefähr diese Tabellen/Models:

Variant:
- id
- generation
- parent_variant_id
- status: draft | active | winner | archived
- content_json
- hypothesis
- mutation_reason
- created_at
- activated_at
- archived_at

Event:
- id
- timestamp
- visitor_id
- session_id
- variant_id
- event_type
- metadata_json

MetricSnapshot:
- id
- variant_id
- calculated_at
- visitors
- page_views
- cta_clicks
- cta_click_rate
- avg_time_on_page
- scroll_depth_rate
- bounce_rate
- score

OptimizationConfig:
- id
- active_metric_name
- score_weights_json
- min_visitors_per_variant
- min_experiment_days
- min_score_improvement
- auto_promote_enabled

ResearchLog:
- id
- timestamp
- generation
- action
- observation
- hypothesis
- mutation
- result
- decision
- metrics_json

Karpathy-Style Feedback Loop:
Implementiere den Loop als klares Modul.

Datei-Struktur-Vorschlag:

src/
  app/
    page.tsx
    api/
      events/
      metrics/
      evolve/
      admin/
  components/
    LandingPageRenderer.tsx
    EvolutionState.tsx
    FeedbackLoopDiagram.tsx
  lib/
    tracking.ts
    experiments.ts
    scoring.ts
    evolution.ts
    variantGenerator.ts
    selection.ts
    researchLog.ts
  db/
    schema.ts
    seed.ts

scripts/
  analyze.ts
  evolve.ts
  promoteWinner.ts
  seedVariants.ts

docs/
  ARCHITECTURE.md
  FEEDBACK_LOOP.md
  METRICS.md
  ROADMAP.md

Wichtige CLI-Befehle:

npm run dev
Startet die App lokal.

npm run db:seed
Erstellt initiale Varianten.

npm run analyze
Berechnet Metriken und Scores.

npm run evolve
Erzeugt aus aktuellen Ergebnissen eine neue Kandidatenvariante.

npm run promote-winner
Promoted den Gewinner, wenn Mindestdaten erfüllt sind.

npm run research-cycle
Führt einen vollständigen lokalen Zyklus aus:
- Metriken lesen
- Beobachtung ableiten
- Hypothese formulieren
- neue Variante erzeugen
- Tests ausführen
- ResearchLog schreiben
- keine produktive Änderung ohne Regeln

Wichtig:
Der MVP darf den neuen Content zuerst regelbasiert erzeugen.
Baue aber die Architektur so, dass später ein LLM angeschlossen werden kann.

Variant Generator:
Implementiere zunächst einen einfachen Generator, der neue Varianten aus Gewinnern mutiert.

Beispiele für Mutationen:
- Headline kürzer machen
- CTA direkter machen
- Value Proposition technischer formulieren
- Reihenfolge der Sektionen ändern
- Social Proof stärker hervorheben
- Tonalität von "technical" zu "curious" ändern
- Hero stärker auf das Feedback-Loop-Konzept fokussieren

Jede Mutation braucht:
- parent_variant_id
- mutation_reason
- hypothesis
- expected_effect

Beispiel:
Observation:
Variante B hat hohe Scrolltiefe, aber niedrige CTA-Klickrate.

Hypothesis:
Besucher verstehen die Idee, aber der CTA ist nicht konkret genug.

Mutation:
Ändere CTA von "Explore" zu "See the feedback loop".

Expected effect:
Höhere CTA-Klickrate bei ähnlicher Scrolltiefe.

Selection Rules:
Ein Gewinner darf nur gewählt werden, wenn:
- jede aktive Variante mindestens 100 Besucher hat
- das Experiment mindestens 3 Tage lief
- der Score mindestens 10 Prozent besser ist als der Vergleich
- keine Metrik stark negativ ausreißt
- Trackingdaten valide sind

Wenn nicht genug Daten vorhanden sind:
Status = inconclusive

Admin-Bereich:
Baue einen einfachen internen Admin-Bereich unter `/admin`.

Für MVP reicht ein simples lokales Admin-Dashboard ohne komplexe Auth.
Aber strukturiere es so, dass später Auth ergänzt werden kann.

Dashboard anzeigen:
- aktive Varianten
- Generationen
- Metriken pro Variante
- Score
- Gewinnerstatus
- ResearchLog
- aktuelle OptimizationConfig
- Button: Analyze
- Button: Evolve
- Button: Promote Winner

Wichtig:
Die öffentliche Experience bleibt eine einzige Seite.
Admin ist nur intern.

GitHub Showcase:
Das Projekt soll so gebaut werden, dass es auf GitHub beeindruckend aussieht.

Erstelle:
- professionelle README.md
- Architekturdiagramm als Mermaid
- Feedback-Loop-Diagramm
- Beispiel-Screenshots als Platzhalter
- klare Roadmap
- technische Erklärung der Metrik
- Datenschutzabschnitt
- "Why this project exists"
- "Inspired by Karpathy-style AutoResearch loops"

README-Struktur:
1. DarwinPage
2. What it is
3. Why it matters
4. Feedback loop
5. Architecture
6. Metrics
7. Local setup
8. How variants work
9. How evolution works
10. Privacy
11. Roadmap
12. Demo ideas

README soll erklären:
DarwinPage is not just an A/B testing demo. It is a minimal self-optimizing content system. It generates variants, measures behavior, scores outcomes and evolves the page over generations.

Tests:
Schreibe Tests für:
- stabile Variantenzuweisung
- Score-Berechnung
- Gewinnerentscheidung
- Mindestdaten-Regeln
- Event-Validierung
- Mutationserzeugung
- ResearchLog-Erstellung

Akzeptanzkriterien für MVP:
- `npm run dev` startet die App
- `/` zeigt eine schöne dynamische One-Page-Website
- Besucher bekommen stabile Varianten
- Events werden gespeichert
- `/admin` zeigt Metriken
- `npm run analyze` berechnet Scores
- `npm run evolve` erzeugt neue Varianten
- `npm run promote-winner` promoted nur bei erfüllten Regeln
- README ist GitHub-tauglich
- Feedback-Loop ist im Code und in der UI sichtbar
- Projekt ist sauber strukturiert

Nicht bauen im MVP:
- kein Login-System außer einfacher Vorbereitung
- kein Stripe
- kein Newsletter-Backend
- kein komplexes CMS
- kein Multi-Page-Marketing-System
- kein invasives Tracking
- kein automatisches Deployment auf Production
- keine Dark Patterns

Arbeitsweise:
Arbeite iterativ.
Erstelle zuerst eine minimal lauffähige Version.
Halte den Scope klein.
Baue saubere Module.
Dokumentiere Architekturentscheidungen.
Nach jedem wichtigen Schritt aktualisiere README und docs.
Bevor du große Änderungen machst, prüfe Tests.