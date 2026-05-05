PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_optimization_configs` (
	`id` text PRIMARY KEY NOT NULL,
	`active_metric_name` text DEFAULT 'default_score' NOT NULL,
	`score_weights_json` text NOT NULL,
	`min_visitors_per_variant` integer DEFAULT 100 NOT NULL,
	`min_experiment_days` integer DEFAULT 3 NOT NULL,
	`min_score_improvement` real DEFAULT 0.1 NOT NULL,
	`auto_promote_enabled` integer DEFAULT false NOT NULL,
	`personal_evolution_enabled` integer DEFAULT true NOT NULL,
	`max_free_generations` integer DEFAULT 3 NOT NULL,
	`llm_system_prompt` text DEFAULT 'You are an autonomous UX Researcher. Optimize for maximum user engagement, interactivity, and time spent on page.' NOT NULL,
	`optimization_goal` text DEFAULT 'Maximize the time users spend interacting with the application. Build engaging, sticky content or interactive tools that keep them hooked.' NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_optimization_configs`("id", "active_metric_name", "score_weights_json", "min_visitors_per_variant", "min_experiment_days", "min_score_improvement", "auto_promote_enabled", "personal_evolution_enabled", "max_free_generations", "llm_system_prompt", "optimization_goal") SELECT "id", "active_metric_name", "score_weights_json", "min_visitors_per_variant", "min_experiment_days", "min_score_improvement", "auto_promote_enabled", "personal_evolution_enabled", "max_free_generations", "llm_system_prompt", "optimization_goal" FROM `optimization_configs`;--> statement-breakpoint
DROP TABLE `optimization_configs`;--> statement-breakpoint
ALTER TABLE `__new_optimization_configs` RENAME TO `optimization_configs`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
ALTER TABLE `variants` ADD `is_evolving` integer DEFAULT false;