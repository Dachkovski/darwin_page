import { db } from "./src/db";
import { events, variants } from "./src/db/schema";
import { sql, asc } from "drizzle-orm";

async function run() {
  const allVariants = await db.select().from(variants).orderBy(asc(variants.generation));
  const eventCounts = await db
    .select({
      variantId: events.variantId,
      eventType: events.eventType,
      count: sql<number>`count(*)`,
    })
    .from(events)
    .groupBy(events.variantId, events.eventType);

  const j35 = allVariants.find(v => v.id === 'hero_j_035');
  const vEvents = eventCounts.filter(e => e.variantId === j35?.id);
  const views = vEvents.find(e => e.eventType === 'page_view')?.count || 0;
  console.log("hero_j_035 views:", views);
  console.log(vEvents);
}
run();
