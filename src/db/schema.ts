import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const variants = sqliteTable('variants', {
  id: text('id').primaryKey(),
  visitorId: text('visitor_id'),
  generation: integer('generation').notNull(),
  parentVariantId: text('parent_variant_id'),
  status: text('status').notNull().default('draft'), // draft, active, winner, archived, inconclusive
  isEvolving: integer('is_evolving', { mode: 'boolean' }).default(false),
  contentJson: text('content_json').notNull(),
  hypothesis: text('hypothesis'),
  generationPrompt: text('generation_prompt'),
  mutationReason: text('mutation_reason'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  activatedAt: integer('activated_at', { mode: 'timestamp' }),
  archivedAt: integer('archived_at', { mode: 'timestamp' })
});

export const events = sqliteTable('events', {
  id: text('id').primaryKey(),
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  visitorId: text('visitor_id').notNull(),
  sessionId: text('session_id').notNull(),
  variantId: text('variant_id').notNull(),
  eventType: text('event_type').notNull(), // page_view, cta_click, scroll_depth_X, time_on_page, bounce
  metadataJson: text('metadata_json')
});

export const metricSnapshots = sqliteTable('metric_snapshots', {
  id: text('id').primaryKey(),
  variantId: text('variant_id').notNull(),
  calculatedAt: integer('calculated_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  visitors: integer('visitors').notNull().default(0),
  pageViews: integer('page_views').notNull().default(0),
  ctaClicks: integer('cta_clicks').notNull().default(0),
  ctaClickRate: real('cta_click_rate').notNull().default(0),
  avgTimeOnPage: real('avg_time_on_page').notNull().default(0),
  scrollDepthRate: real('scroll_depth_rate').notNull().default(0),
  bounceRate: real('bounce_rate').notNull().default(0),
  score: real('score').notNull().default(0)
});

export const optimizationConfigs = sqliteTable('optimization_configs', {
  id: text('id').primaryKey(),
  activeMetricName: text('active_metric_name').notNull().default('default_score'),
  scoreWeightsJson: text('score_weights_json').notNull(),
  minVisitorsPerVariant: integer('min_visitors_per_variant').notNull().default(100),
  minExperimentDays: integer('min_experiment_days').notNull().default(3),
  minScoreImprovement: real('min_score_improvement').notNull().default(0.10),
  autoPromoteEnabled: integer('auto_promote_enabled', { mode: 'boolean' }).notNull().default(false),
  personalEvolutionEnabled: integer('personal_evolution_enabled', { mode: 'boolean' }).notNull().default(true),
  maxFreeGenerations: integer('max_free_generations').notNull().default(3),
  llmSystemPrompt: text('llm_system_prompt').notNull().default('You are an autonomous UX Researcher. Optimize for maximum user engagement, interactivity, and time spent on page.'),
  optimizationGoal: text('optimization_goal').notNull().default('Maximize the time users spend interacting with the application. Build engaging, sticky content or interactive tools that keep them hooked.')
});

export const researchLogs = sqliteTable('research_logs', {
  id: text('id').primaryKey(),
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  generation: integer('generation').notNull(),
  action: text('action').notNull(),
  observation: text('observation'),
  hypothesis: text('hypothesis'),
  mutation: text('mutation'),
  result: text('result'),
  decision: text('decision'),
  metricsJson: text('metrics_json')
});
