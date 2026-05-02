CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`timestamp` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`visitor_id` text NOT NULL,
	`session_id` text NOT NULL,
	`variant_id` text NOT NULL,
	`event_type` text NOT NULL,
	`metadata_json` text
);
--> statement-breakpoint
CREATE TABLE `metric_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`variant_id` text NOT NULL,
	`calculated_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`visitors` integer DEFAULT 0 NOT NULL,
	`page_views` integer DEFAULT 0 NOT NULL,
	`cta_clicks` integer DEFAULT 0 NOT NULL,
	`cta_click_rate` real DEFAULT 0 NOT NULL,
	`avg_time_on_page` real DEFAULT 0 NOT NULL,
	`scroll_depth_rate` real DEFAULT 0 NOT NULL,
	`bounce_rate` real DEFAULT 0 NOT NULL,
	`score` real DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `optimization_configs` (
	`id` text PRIMARY KEY NOT NULL,
	`active_metric_name` text DEFAULT 'default_score' NOT NULL,
	`score_weights_json` text NOT NULL,
	`min_visitors_per_variant` integer DEFAULT 100 NOT NULL,
	`min_experiment_days` integer DEFAULT 3 NOT NULL,
	`min_score_improvement` real DEFAULT 0.1 NOT NULL,
	`auto_promote_enabled` integer DEFAULT false NOT NULL,
	`llm_system_prompt` text DEFAULT 'You are an autonomous UX Researcher. Optimize for maximum user engagement, interactivity, and time spent on page.' NOT NULL,
	`optimization_goal` text DEFAULT 'Maximize the time users spend interacting with the application (Verweildauer). Build engaging, sticky content or interactive tools that keep them hooked.' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `research_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`timestamp` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`generation` integer NOT NULL,
	`action` text NOT NULL,
	`observation` text,
	`hypothesis` text,
	`mutation` text,
	`result` text,
	`decision` text,
	`metrics_json` text
);
--> statement-breakpoint
CREATE TABLE `variants` (
	`id` text PRIMARY KEY NOT NULL,
	`visitor_id` text,
	`generation` integer NOT NULL,
	`parent_variant_id` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`content_json` text NOT NULL,
	`hypothesis` text,
	`generation_prompt` text,
	`mutation_reason` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`activated_at` integer,
	`archived_at` integer
);
