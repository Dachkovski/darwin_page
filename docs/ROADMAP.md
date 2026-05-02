# Roadmap

## Phase 1: The Core Loop (MVP)
- [x] Initialize Next.js app with App Router and Tailwind CSS
- [x] Set up SQLite with Drizzle ORM
- [x] Implement robust anonymous telemetry tracking
- [x] Build the `/` dynamic rendering system
- [x] Implement `scripts/analyze.ts` for scoring
- [x] Create simple local `/admin` dashboard
- [x] Ensure GitHub-ready documentation

## Phase 2: LLM Integration & Edge Deployment
- [x] Replace rule-based mutations with LLM-powered candidate generation
- [x] Allow the LLM to read the `ResearchLog` for context
- [x] Implement structured JSON output parsing for the LLM mutations
- [x] Cloudflare D1 Database Adapter for production scale
- [x] API-driven evolution loop for Cron Triggers (`/api/cron`)
- [x] Global Interaction tracking (Heatmaps & Dead Clicks)

## Phase 3: Advanced Optimization
- [ ] Multi-armed bandit traffic routing (instead of uniform A/B)
- [ ] Automated deployments for winners (static export optimization)
- [ ] Enhanced UI visualizations for the active Feedback Loop
