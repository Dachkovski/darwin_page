import { db } from '../src/db/index';
import { optimizationConfigs, variants } from '../src/db/schema';
import { eq } from 'drizzle-orm';

async function promoteWinner() {
  console.log('🏆 Starting Promotion Phase...');

  const activeVariants = await db.select().from(variants).where(eq(variants.status, 'active'));
  
  if (activeVariants.length === 0) {
    console.log('No active variant to promote.');
    process.exit(0);
  }

  const variant = activeVariants[0];

  // In a real scenario, we check minVisitors, minDays, and minScoreImprovement
  // For the MVP local loop, we can just optionally mark the active as winner 
  // before evolution, but evolution actually takes the active one anyway.
  
  console.log(`   Evaluating Variant: ${variant.id}`);
  console.log('   (Skipping statistical significance checks for MVP. Proceeding to evolution.)');

  console.log('\n✅ Promotion phase complete.');
  process.exit(0);
}

promoteWinner().catch((err) => {
  console.error('❌ Promotion failed:', err);
  process.exit(1);
});
