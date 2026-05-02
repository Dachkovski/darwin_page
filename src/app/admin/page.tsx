import { db } from "@/db";
import { variants, researchLogs, events, optimizationConfigs } from "@/db/schema";
import { desc, sql, asc } from "drizzle-orm";
import AdminActions from "@/components/AdminActions";
import AdminConfigPanel from "@/components/AdminConfigPanel";
import AnalyticsDashboard, { ChartDataPoint } from "@/components/AnalyticsDashboard";
import { headers } from "next/headers";
import Link from "next/link";
import { Lock, Unlock } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  // Check Basic Auth status from headers
  const headersList = await headers();
  const authHeader = headersList.get('authorization');
  const authPassword = process.env.ADMIN_PASSWORD;
  
  let isAdmin = false;
  if (authPassword && authHeader) {
    try {
      const authValue = authHeader.split(' ')[1];
      const pwd = atob(authValue).split(':')[1];
      if (pwd === authPassword) isAdmin = true;
    } catch(e) {}
  }
  if (!authPassword) isAdmin = true; // Open access if no password configured

  const allVariants = await db.select().from(variants).orderBy(asc(variants.generation));
  const logs = await db.select().from(researchLogs).orderBy(desc(researchLogs.timestamp));
  const configs = await db.select().from(optimizationConfigs).limit(1);
  const initialConfig = configs.length > 0 ? configs[0] : null;
  
  const allEvents = await db.select().from(events);

  console.log("Admin Panel Variants Count:", allVariants.length);
  console.log("Admin Panel Events Count:", allEvents.length);

  const config = configs[0];

  // Process data for the Analytics Dashboard
  const chartData: ChartDataPoint[] = allVariants.map(variant => {
    const vEvents = allEvents.filter(e => e.variantId === variant.id);
    const views = vEvents.filter(e => e.eventType === 'page_view').length;
    const ctaClicks = vEvents.filter(e => e.eventType === 'cta_click').length;
    const interactions = vEvents.filter(e => e.eventType === 'interaction_click').length;
    const bounces = vEvents.filter(e => e.eventType === 'bounce').length;
    
    // Calculate Time On Page
    const timeEvents = vEvents.filter(e => e.eventType === 'time_on_page');
    let totalSeconds = 0;
    timeEvents.forEach(e => {
      try {
        const meta = JSON.parse(e.metadataJson || '{}');
        if (meta.seconds) totalSeconds += meta.seconds;
      } catch (err) {}
    });
    const avgTimeOnPage = timeEvents.length > 0 ? Math.min((totalSeconds || 0) / timeEvents.length, 300) : 0;
    const normalizedTimeOnPage = (avgTimeOnPage || 0) / 300;

    const ctaClickRate = views > 0 ? (ctaClicks / views) * 100 : 0;
    const bounceRate = views > 0 ? (bounces / views) * 100 : 0;
    const interactionRate = views > 0 ? (interactions / views) * 100 : 0;

    // A simplified proxy score for the chart (normally this comes from metricSnapshots)
    // Here we recalculate it to show real-time live data
    let score = 0;
    if (config?.scoreWeightsJson) {
      try {
        const w = JSON.parse(config.scoreWeightsJson);
        score = ((ctaClickRate/100) * (w.cta_click_rate || 0)) + ((bounceRate/100) * (w.bounce_rate || 0)) + (normalizedTimeOnPage * (w.time_on_page || 0));
      } catch (e) {}
    }
    
    // Ensure all values are strictly numbers, fallback to 0 to prevent JSON serialization turning NaN into null
    score = Number.isNaN(score) ? 0 : score;

    return {
      generation: variant.generation,
      variantId: variant.id,
      visitors: views,
      ctaClicks,
      ctaClickRate,
      bounceRate,
      interactionRate,
      score: score * 100 // Scale up for better readability on chart
    };
  });

  // For the list view, we want descending order
  const listVariants = [...allVariants].reverse().slice(0, 50);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-300 font-mono p-8">
      <div className="max-w-6xl mx-auto flex flex-col gap-8">
        
        <header className="flex items-center justify-between border-b border-neutral-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Darwin Engine</h1>
            <p className="text-neutral-500 text-sm">Internal Evolutionary Dashboard</p>
          </div>
          <div className="flex items-center gap-4">
            {!isAdmin ? (
              <Link href="/admin/login" className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-sm rounded-lg flex items-center gap-2 transition-colors">
                <Lock className="w-4 h-4" />
                Login to Edit
              </Link>
            ) : (
              <div className="flex items-center gap-4">
                <div className="px-4 py-2 bg-emerald-900/30 text-emerald-400 text-sm rounded-lg flex items-center gap-2 border border-emerald-900/50">
                  <Unlock className="w-4 h-4" />
                  Admin
                </div>
                <AdminActions />
              </div>
            )}
          </div>
        </header>

        {isAdmin ? (
          <AdminConfigPanel initialConfig={initialConfig} />
        ) : (
          <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4 text-center text-sm text-neutral-400">
            Control panels are hidden. Login to configure optimization goals and trigger manual mutations.
          </div>
        )}

        {/* Analytics Dashboard */}
        <AnalyticsDashboard data={chartData} />

        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Main Column: User Journeys */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <h2 className="text-xl font-semibold text-white">Live User Journeys</h2>
            
            {Array.from(new Set([...allEvents].sort((a,b) => b.timestamp.getTime() - a.timestamp.getTime()).map(e => e.visitorId))).filter(Boolean).slice(0, 10).map(visitorId => {
              const visitorEvents = allEvents.filter(e => e.visitorId === visitorId).sort((a,b) => a.timestamp.getTime() - b.timestamp.getTime());
              
              // Get variants this user saw
              const variantIdsSeen = Array.from(new Set(visitorEvents.map(e => e.variantId)));
              const userVariants = allVariants.filter(v => variantIdsSeen.includes(v.id));

              return (
                <div key={visitorId} className="p-6 border border-neutral-700 rounded-2xl bg-neutral-900 flex flex-col gap-6 shadow-xl">
                  <div className="flex justify-between items-center border-b border-neutral-800 pb-4">
                    <div>
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        🧑‍💻 Visitor <span className="font-mono text-emerald-400 text-sm bg-emerald-950/50 px-2 py-1 rounded">{visitorId.split('-')[0]}...</span>
                      </h3>
                      <div className="text-xs text-neutral-500 mt-1">{visitorEvents.length} total events tracked</div>
                    </div>
                  </div>

                  {userVariants.map(variant => {
                    const vEvents = visitorEvents.filter(e => e.variantId === variant.id);
                    const visualAnalyses = vEvents.filter(e => e.eventType === 'visual_analysis');
                    const interactionClicks = vEvents.filter(e => e.eventType === 'interaction_click');
                    
                    // Find the research log for this generation
                    const log = logs.find(l => l.generation === variant.generation);

                    return (
                      <div key={variant.id} className="p-4 border border-neutral-800 rounded-xl bg-black/40 flex flex-col gap-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="text-sm font-bold text-white mb-1">Variant {variant.id}</div>
                            <div className="text-xs text-neutral-500">Generation {variant.generation}</div>
                          </div>
                        </div>

                        {/* AI Thoughts (Research Log + Hypothesis) */}
                        <div className="flex flex-col gap-2 p-3 bg-blue-950/10 rounded border border-blue-900/30 text-xs">
                          <span className="text-blue-400 font-semibold block mb-1">🧠 LLM Thoughts & Hypothesis:</span>
                          {log ? (
                            <>
                              <div className="text-neutral-400"><span className="text-neutral-500">Observation:</span> {log.observation}</div>
                              <div className="text-neutral-300 italic">"{log.hypothesis}"</div>
                            </>
                          ) : (
                            <span className="text-neutral-300 italic">"{variant.hypothesis || 'No specific hypothesis recorded.'}"</span>
                          )}
                        </div>

                        {/* Visual Insights */}
                        {visualAnalyses.length > 0 && (
                          <div className="p-3 bg-purple-950/20 rounded border border-purple-900/40 text-xs">
                            <span className="text-purple-400 font-semibold block mb-2">👁️ Multimodal Visual Insight:</span>
                            <ul className="list-disc pl-4 space-y-1">
                              {visualAnalyses.map(e => {
                                try { return <li key={e.id} className="text-neutral-300 italic">"{JSON.parse(e.metadataJson || '{}').insight}"</li> } catch(err){ return null; }
                              })}
                            </ul>
                          </div>
                        )}

                        {/* User Interactions */}
                        {interactionClicks.length > 0 && (
                          <div className="p-3 bg-neutral-900/80 rounded border border-neutral-800 text-xs">
                            <span className="text-neutral-500 font-semibold block mb-2">User Actions on this variant:</span>
                            <ul className="list-disc pl-4 space-y-1">
                              {interactionClicks.map(e => {
                                try { 
                                  const meta = JSON.parse(e.metadataJson || '{}');
                                  return (
                                    <li key={e.id} className="text-neutral-400">
                                      Clicked <span className="text-neutral-300">"{meta.text}"</span>
                                      {meta.formState && <span className="text-emerald-400 ml-1">(Input: {meta.formState})</span>}
                                      {meta.sceneState && <span className="text-blue-400 ml-1">[Scene: {meta.sceneState}]</span>}
                                    </li>
                                  );
                                } catch(err){ return null; }
                              })}
                            </ul>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-8">
            
            {/* Optimization Config */}
            <div className="flex flex-col gap-4">
              <h2 className="text-xl font-semibold text-white">Fitness Function</h2>
              <div className="p-5 border border-neutral-800 rounded-xl bg-neutral-900/50 text-xs flex flex-col gap-3">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Active Metric:</span>
                  <span className="text-white">{config?.activeMetricName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Min Visitors:</span>
                  <span className="text-white">{config?.minVisitorsPerVariant}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Min Days:</span>
                  <span className="text-white">{config?.minExperimentDays}</span>
                </div>
                <div className="mt-2 pt-2 border-t border-neutral-800">
                  <span className="text-neutral-500 block mb-2">Weights:</span>
                  <pre className="text-[10px] text-emerald-400 bg-black p-2 rounded">
                    {config?.scoreWeightsJson ? JSON.stringify(JSON.parse(config.scoreWeightsJson), null, 2) : '{}'}
                  </pre>
                </div>
              </div>
            </div>

            {/* Research Log */}
            <div className="flex flex-col gap-4">
              <h2 className="text-xl font-semibold text-white">Research Log</h2>
              <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-2">
                {logs.slice(0, 50).map((log) => (
                  <div key={log.id} className="p-4 border border-neutral-800 rounded-xl bg-neutral-900/50 text-xs">
                    <div className="flex justify-between text-neutral-500 mb-2 border-b border-neutral-800 pb-2">
                      <span>Gen {log.generation}</span>
                      <span>{new Date(log.timestamp).toLocaleDateString()}</span>
                    </div>
                    <div className="mb-1"><span className="text-blue-400 font-semibold">{log.action}</span></div>
                    <div className="text-neutral-400 mb-1">{log.observation}</div>
                    <div className="text-neutral-300 italic mb-2">"{log.hypothesis}"</div>
                    <div className="text-emerald-400 bg-emerald-950/30 p-2 rounded border border-emerald-900/50">
                      ➜ {log.decision}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
