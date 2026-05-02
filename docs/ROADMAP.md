# Roadmap

## Phase 1: The Core Loop (MVP)
- [ ] Initialize Next.js app with App Router and Tailwind CSS
- [ ] Set up SQLite with Drizzle/Prisma ORM
- [ ] Implement robust anonymous telemetry tracking
- [ ] Build the `/` dynamic rendering system
- [ ] Implement `scripts/analyze.ts` for scoring
- [ ] Implement rule-based mutation generator
- [ ] Create simple local `/admin` dashboard
- [ ] Ensure GitHub-ready documentation

## Phase 2: LLM Integration
- [ ] Replace rule-based mutations with LLM-powered candidate generation
- [ ] Allow the LLM to read the `ResearchLog` for context
- [ ] Implement structured JSON output parsing for the LLM mutations

## Phase 3: Advanced Optimization
- [ ] Multi-armed bandit traffic routing (instead of uniform A/B)
- [ ] Automated deployments for winners (static export optimization)
- [ ] Enhanced UI visualizations for the active Feedback Loop
