import { db } from "@/db";
import { variants, researchLogs, events } from "@/db/schema";
import { asc, desc } from "drizzle-orm";
import { cookies } from "next/headers";
import Link from "next/link";
import { Activity, Home } from "lucide-react";
import TimelineNode from "@/components/TimelineNode";

export const dynamic = 'force-dynamic';

export default async function MyJourneyPage() {
  const cookieStore = await cookies();
  const visitorId = cookieStore.get('visitor_id')?.value;

  if (!visitorId) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-300 font-mono p-8 flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold text-white mb-4">No Journey Found</h1>
        <p className="text-neutral-500 mb-8">You haven't interacted with the Darwin Engine yet.</p>
        <Link href="/" className="px-6 py-3 bg-white text-black rounded-full font-bold">
          Enter the Sandbox
        </Link>
      </div>
    );
  }

  const allVariants = await db.select().from(variants).orderBy(asc(variants.generation));
  const logs = await db.select().from(researchLogs).orderBy(desc(researchLogs.timestamp));
  const allEvents = await db.select().from(events);

  const visitorEvents = allEvents.filter(e => e.visitorId === visitorId).sort((a,b) => a.timestamp.getTime() - b.timestamp.getTime());
  const variantIdsSeen = Array.from(new Set(visitorEvents.map(e => e.variantId)));
  const userVariants = allVariants.filter(v => variantIdsSeen.includes(v.id)).reverse();

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-300 font-mono p-8">
      <div className="max-w-4xl mx-auto flex flex-col gap-8">
        
        <header className="flex items-center justify-between border-b border-neutral-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">My Evolution Journey</h1>
            <p className="text-neutral-500 text-sm">Your personal interaction timeline with the Darwin Engine</p>
          </div>
          <div className="flex gap-4">
            <Link href="/" className="p-2 bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors text-neutral-400 hover:text-white">
              <Home className="w-5 h-5" />
            </Link>
          </div>
        </header>

        {userVariants.length === 0 ? (
          <div className="p-12 text-center text-neutral-500 border border-dashed border-neutral-800 rounded-2xl">
            You haven't generated any events yet. Go interact with the Sandbox!
          </div>
        ) : (
          <div className="p-6 border border-neutral-700 rounded-2xl bg-neutral-900 flex flex-col gap-6 shadow-xl">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  🧑‍💻 Visitor <span className="font-mono text-emerald-400 text-sm bg-emerald-950/50 px-2 py-1 rounded">{visitorId.split('-')[0]}...</span>
                </h3>
                <div className="text-xs text-neutral-500 mt-1">{visitorEvents.length} total events tracked in your session</div>
              </div>
            </div>

            <div className="relative border-l-2 border-neutral-800 ml-3 pl-8 flex flex-col gap-10 mt-4">
              {userVariants.map((variant, index) => {
                const vEvents = visitorEvents.filter(e => e.variantId === variant.id);
                const visualAnalyses = vEvents.filter(e => e.eventType === 'visual_analysis');
                const interactionClicks = vEvents.filter(e => e.eventType === 'interaction_click');
                const log = logs.find(l => l.generation === variant.generation);

                return (
                  <TimelineNode 
                    key={variant.id}
                    title={`🎨 Design Generation ${variant.generation}`}
                    subtitle={variant.id}
                    defaultOpen={index === 0}
                  >
                    {/* AI Thoughts */}
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

                    {/* User Interactions */}
                    {interactionClicks.length > 0 && (
                      <div className="flex gap-3 items-start bg-neutral-900/50 p-4 rounded-xl border border-neutral-800 mt-2">
                        <div className="text-xl mt-0.5">🖱️</div>
                        <div className="flex flex-col gap-1.5 flex-1">
                          <span className="text-[11px] uppercase tracking-wider text-neutral-500 font-bold">Your Actions</span>
                          <ul className="space-y-1">
                            {interactionClicks.map(e => {
                              try { 
                                const meta = JSON.parse(e.metadataJson || '{}');
                                return (
                                  <li key={e.id} className="text-xs text-neutral-400 flex flex-wrap items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-700"></span>
                                    Clicked <span className="text-white px-1.5 py-0.5 bg-neutral-800 rounded">"{meta.text}"</span>
                                    {meta.formState && <span className="text-emerald-400">(Typed: {meta.formState})</span>}
                                  </li>
                                );
                              } catch(err){ return null; }
                            })}
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* Visual Insights */}
                    {visualAnalyses.length > 0 && (
                      <div className="flex gap-3 items-start bg-purple-950/20 p-4 rounded-xl border border-purple-900/30 mt-2">
                        <div className="text-xl mt-0.5">👁️</div>
                        <div className="flex flex-col gap-1.5 flex-1">
                          <span className="text-[11px] uppercase tracking-wider text-purple-500 font-bold">AI Visual Memory</span>
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
                                            <span className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider">Start</span>
                                            <img src={meta.startImagePath} alt="Start UI" className="w-48 h-auto object-cover rounded shadow-md border border-neutral-800" />
                                          </div>
                                        )}
                                        {meta.latestImagePath && (
                                          <div className="flex flex-col gap-1">
                                            <span className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider">End</span>
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
        )}
      </div>
    </div>
  );
}
