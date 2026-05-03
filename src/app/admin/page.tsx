export const runtime = 'edge';
import { db } from "@/db";
import { variants, researchLogs, events, optimizationConfigs } from "@/db/schema";
import { desc, sql, asc } from "drizzle-orm";
import AdminActions from "@/components/AdminActions";
import AdminConfigPanel from "@/components/AdminConfigPanel";
import AnalyticsDashboard, { ChartDataPoint } from "@/components/AnalyticsDashboard";
import { headers } from "next/headers";
import Link from "next/link";
import { Lock, Unlock } from "lucide-react";

import TimelineNode from "@/components/TimelineNode";

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const currentVisitorId = cookieStore.get('visitor_id')?.value;
  
  const adminToken = cookieStore.get('admin_token')?.value;
  const authPassword = process.env.ADMIN_PASSWORD;
  
  let isAdmin = false;
  if (authPassword && adminToken === authPassword) {
    isAdmin = true;
  }

  let allVariants = await db.select().from(variants).orderBy(asc(variants.generation));
  const configs = await db.select().from(optimizationConfigs).limit(1);
  const initialConfig = configs.length > 0 ? configs[0] : null;
  
  let allEvents = await db.select().from(events);
  let logs = await db.select().from(researchLogs).orderBy(desc(researchLogs.timestamp));

  // If not an admin, restrict the data to ONLY this user's session
  if (!isAdmin) {
    if (currentVisitorId) {
      allEvents = allEvents.filter(e => e.visitorId === currentVisitorId);
      const userVariantIds = Array.from(new Set(allEvents.map(e => e.variantId)));
      allVariants = allVariants.filter(v => userVariantIds.includes(v.id) || v.id === 'hero_a_001');
      const userVariantGenerations = Array.from(new Set(allVariants.map(v => v.generation)));
      logs = logs.filter(l => userVariantGenerations.includes(l.generation));
    } else {
      // If they have no cookie and aren't an admin, they see nothing!
      allEvents = [];
      allVariants = allVariants.filter(v => v.id === 'hero_a_001');
      logs = [];
    }
  }

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
            <Link href="/" className="px-4 py-2 bg-neutral-900 border border-neutral-700 text-neutral-400 hover:text-white rounded-lg transition-colors text-sm flex items-center gap-2">
              Sandbox
            </Link>
            <Link href="/insights" className="px-4 py-2 bg-neutral-900 border border-neutral-700 text-neutral-400 hover:text-white rounded-lg transition-colors text-sm flex items-center gap-2">
              Public Pulse
            </Link>
            <a href="https://github.com/Dachkovski/darwin_page" target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-neutral-900 border border-neutral-700 text-neutral-400 hover:text-white rounded-lg transition-colors text-sm flex items-center gap-2">
              GitHub Repo
            </a>
            {!isAdmin ? (
              <a href="/admin/login" className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-sm rounded-lg flex items-center gap-2 transition-colors" title="Admin Login">
                <Lock className="w-4 h-4" />
              </a>
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
              const userVariants = allVariants.filter(v => variantIdsSeen.includes(v.id)).reverse(); // Newest at the top

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

                  <div className="relative border-l-2 border-neutral-800 ml-3 pl-8 flex flex-col gap-10 mt-4">
                    {userVariants.map((variant, index) => {
                      const vEvents = visitorEvents.filter(e => e.variantId === variant.id);
                      const visualAnalyses = vEvents.filter(e => e.eventType === 'visual_analysis');
                      const interactionClicks = vEvents.filter(e => e.eventType === 'interaction_click');
                      
                      // Find the research log for this generation
                      const log = logs.find(l => l.generation === variant.generation);

                      return (
                        <TimelineNode 
                          key={variant.id}
                          title={`🎨 Design Generation ${variant.generation}`}
                          subtitle={variant.id}
                          defaultOpen={index === 0} // Open latest (which is now at the top) by default
                        >
                          {/* AI Thoughts (Why was this built?) */}
                          <div className="flex gap-3 items-start bg-neutral-900/50 p-4 rounded-xl border border-neutral-800">
                            <div className="text-xl mt-0.5">🧠</div>
                            <div className="flex flex-col gap-1.5 flex-1">
                              <span className="text-[11px] uppercase tracking-wider text-neutral-500 font-bold">AI Rationale & Plan</span>
                              {log ? (
                                <>
                                  <div className="text-xs text-neutral-400"><span className="text-neutral-500">Observed:</span> {log.observation}</div>
                                  <div className="text-sm text-blue-300 italic">"{log.hypothesis}"</div>
                                </>
                              ) : (
                                <div className="text-sm text-blue-300 italic">"{variant.hypothesis || 'Initial Baseline Design'}"</div>
                              )}
                            </div>
                          </div>

                          {/* User Interactions (What did the user do?) */}
                          {interactionClicks.length > 0 && (
                            <div className="flex gap-3 items-start bg-neutral-900/50 p-4 rounded-xl border border-neutral-800 mt-2">
                              <div className="text-xl mt-0.5">🖱️</div>
                              <div className="flex flex-col gap-1.5 flex-1">
                                <span className="text-[11px] uppercase tracking-wider text-neutral-500 font-bold">User Actions</span>
                                <ul className="space-y-1">
                                  {interactionClicks.map(e => {
                                    try { 
                                      const meta = JSON.parse(e.metadataJson || '{}');
                                      return (
                                        <li key={e.id} className="text-xs text-neutral-400 flex flex-wrap items-center gap-1.5">
                                          <span className="w-1.5 h-1.5 rounded-full bg-neutral-700"></span>
                                          Clicked <span className="text-white px-1.5 py-0.5 bg-neutral-800 rounded">"{meta.text}"</span>
                                          {meta.formState && <span className="text-emerald-400">(Typed: {meta.formState})</span>}
                                          {meta.sceneState && <span className="text-sky-400">[{meta.sceneState}]</span>}
                                        </li>
                                      );
                                    } catch(err){ return null; }
                                  })}
                                </ul>
                              </div>
                            </div>
                          )}

                          {/* Visual Insights (How did it look?) */}
                          {visualAnalyses.length > 0 && (
                            <div className="flex gap-3 items-start bg-purple-950/20 p-4 rounded-xl border border-purple-900/30 mt-2">
                              <div className="text-xl mt-0.5">👁️</div>
                              <div className="flex flex-col gap-1.5 flex-1">
                                <span className="text-[11px] uppercase tracking-wider text-purple-500 font-bold">Multimodal Screen Context</span>
                                <ul className="space-y-1">
                                  {visualAnalyses.map(e => {
                                    try { 
                                      const meta = JSON.parse(e.metadataJson || '{}');
                                      return (
                                        <li key={e.id} className="flex flex-col gap-3">
                                          <span className="text-sm text-purple-200 italic leading-snug">"{meta.insight}"</span>
                                          {(meta.startImagePath || meta.latestImagePath) && (
                                            <div className="flex flex-wrap gap-2 mt-1 bg-black/30 p-2 rounded-lg border border-purple-900/30">
                                              {meta.startImagePath && (
                                                <div className="flex flex-col gap-1">
                                                  <span className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider">Session Start</span>
                                                  <img src={meta.startImagePath} alt="Start UI" className="w-48 h-auto object-cover rounded shadow-md border border-neutral-800" />
                                                </div>
                                              )}
                                              {meta.latestImagePath && (
                                                <div className="flex flex-col gap-1">
                                                  <span className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider">Session End</span>
                                                  <img src={meta.latestImagePath} alt="End UI" className="w-48 h-auto object-cover rounded shadow-md border border-neutral-800" />
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </li>
                                      );
                                    } catch(err){ return null; }
                                  })}
                                </ul>
                              </div>
                            </div>
                          )}
                        </TimelineNode>
                      );
                    })}
                  </div>
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
                  <span className="text-neutral-500">Event Threshold:</span>
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
