# Metrics & Scoring

DarwinPage optimizes itself against a configurable fitness function. Instead of simply maximizing clicks, the system balances multiple engagement signals to prevent "clickbait" mutations.

## The Standard Score Function

The fitness of a variant is determined by a weighted composite score. The default formula is:

```text
Score = 
   (0.45 * cta_click_rate) 
 + (0.25 * scroll_depth_rate) 
 + (0.20 * normalized_time_on_page) 
 - (0.10 * bounce_rate)
```

## Central Configuration

The weights and optimization parameters are stored in the `OptimizationConfig` table. This allows the system operator to adjust the evolutionary pressure without changing the codebase.

Configurable parameters include:
- `score_weights`: JSON object containing the weight of each metric.
- `min_visitors_per_variant`: Ensures statistical relevance before evaluation.
- `min_experiment_days`: Prevents time-of-day or day-of-week anomalies from skewing results.
- `min_score_improvement`: The delta required to justify a promotion.

## Telemetry Tracking

Events are captured on the client and sent to `/api/events`. Tracked data includes:
- `page_view`
- `variant_seen`
- `cta_click`
- `scroll_depth_25`, `_50`, `_75`, `_100`
- `time_on_page`
- `bounce`
- `interaction_click` (Global heatmap tracking for "Dead Clicks" and actual interactions)

### Event Batching
To reduce server costs and database write operations (especially for Cloudflare D1), the client batches all events locally in a queue. The queue is flushed every 5 seconds or via `navigator.sendBeacon` when the user leaves the page.

All data is strictly anonymized (see Privacy policy in README).
